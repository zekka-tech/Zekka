/**
 * web_fetch tool - fetch a public HTTP(S) URL and return its text body.
 *
 * Model-supplied URLs are untrusted, so this tool:
 *   - allows only http/https
 *   - blocks obvious SSRF targets (localhost, private/link-local/meta-data IPs)
 *   - caps the response size and time
 *
 * The fetch implementation is injected via `ctx.fetchImpl` for testability and
 * defaults to the global `fetch`.
 *
 * @module orchestrator/tools/web-fetch.tool
 */

const OUTPUT_CAP = 40 * 1024; // keep observations context-window friendly
const DEFAULT_TIMEOUT_MS = 15 * 1000;

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local (incl. cloud metadata 169.254.169.254)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^\[?::1\]?$/, // IPv6 loopback
  /^\[?fc00:/i, // IPv6 unique-local
  /^\[?fe80:/i // IPv6 link-local
];

function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported protocol: ${url.protocol}`);
  }
  const host = url.hostname;
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    throw new Error(`blocked host (private/loopback): ${host}`);
  }
  return url;
}

const webFetchTool = {
  name: 'web_fetch',
  description:
    'Fetch a public http(s) URL and return its text body. args: { url: string, '
    + 'maxBytes?: number }. Private/loopback hosts are blocked. Response is truncated.',
  schema: {
    url: { type: 'string', required: true },
    maxBytes: { type: 'number', required: false }
  },

  async run(args, ctx = {}) {
    const fetchImpl = ctx.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (typeof fetchImpl !== 'function') {
      return { ok: false, error: 'no fetch implementation available' };
    }

    let url;
    try {
      url = assertPublicUrl(args.url);
    } catch (err) {
      return { ok: false, error: err.message };
    }

    const cap = Number.isFinite(args.maxBytes) && args.maxBytes > 0
      ? Math.min(Math.floor(args.maxBytes), OUTPUT_CAP)
      : OUTPUT_CAP;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      ctx.fetchTimeoutMs || DEFAULT_TIMEOUT_MS
    );

    try {
      const res = await fetchImpl(url.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'ZekkaAgent/1.0' }
      });
      const text = await res.text();
      const truncated = text.length > cap;
      return {
        ok: true,
        output: {
          url: url.toString(),
          status: res.status,
          contentType: res.headers?.get?.('content-type') || null,
          truncated,
          body: truncated ? text.slice(0, cap) : text
        }
      };
    } catch (err) {
      return { ok: false, error: `fetch failed: ${err.message}` };
    } finally {
      clearTimeout(timer);
    }
  }
};

module.exports = { webFetchTool, assertPublicUrl };
