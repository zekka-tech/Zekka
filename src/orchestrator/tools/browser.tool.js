/**
 * browser tool - navigate the web and read page content.
 *
 * Two execution modes:
 *   - Real headless browser (preferred): if `ctx.browser.run` is injected, the
 *     full action set (navigate / click / read) is delegated to it. That hook
 *     is the integration point for Playwright / a computer-use driver.
 *   - Fetch-based read-only default: without a headless driver, the tool fetches
 *     the URL (SSRF-guarded, reusing web_fetch's host checks) and returns either
 *     extracted visible text ("read") or the outbound links ("links").
 *     Interactive actions like "click" require a real browser and are refused.
 *
 * @module orchestrator/tools/browser.tool
 */

const { assertPublicUrl } = require('./web-fetch.tool');

const OUTPUT_CAP = 40 * 1024;
const DEFAULT_TIMEOUT_MS = 20 * 1000;

/** Very small HTML → text/links extractor (no external deps). */
function stripToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = re.exec(html);
  while (match !== null && links.length < 200) {
    const href = match[1];
    const text = stripToText(match[2]).slice(0, 120);
    try {
      links.push({ href: new URL(href, baseUrl).toString(), text });
    } catch {
      /* skip malformed hrefs */
    }
    match = re.exec(html);
  }
  return links;
}

const browserTool = {
  name: 'browser',
  description:
    'Browse the web. args: { action: "read"|"links"|"click", url?: string, '
    + 'selector?: string }. "read" returns visible text, "links" returns outbound '
    + 'links; "click" requires a real headless browser backend.',
  schema: {
    action: { type: 'string', required: true },
    url: { type: 'string', required: false },
    selector: { type: 'string', required: false }
  },

  async run(args, ctx = {}) {
    const action = String(args.action || 'read').toLowerCase();

    // --- Preferred path: a real headless browser backend ---
    if (ctx.browser && typeof ctx.browser.run === 'function') {
      try {
        const result = await ctx.browser.run({
          action,
          url: args.url,
          selector: args.selector,
          timeoutMs: ctx.browserTimeoutMs || DEFAULT_TIMEOUT_MS
        });
        return { ok: true, output: { headless: true, ...result } };
      } catch (err) {
        return { ok: false, error: `browser action failed: ${err.message}` };
      }
    }

    // --- Fetch-based read-only fallback ---
    if (action === 'click') {
      return {
        ok: false,
        error: 'the "click" action requires a headless browser backend (ctx.browser.run)'
      };
    }
    if (action !== 'read' && action !== 'links') {
      return { ok: false, error: `unsupported action "${args.action}"` };
    }

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

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      ctx.browserTimeoutMs || DEFAULT_TIMEOUT_MS
    );
    try {
      const res = await fetchImpl(url.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'ZekkaAgent/1.0 (+browser-tool)' }
      });
      const html = await res.text();

      if (action === 'links') {
        return {
          ok: true,
          output: { headless: false, url: url.toString(), links: extractLinks(html, url.toString()) }
        };
      }
      const text = stripToText(html);
      const truncated = text.length > OUTPUT_CAP;
      return {
        ok: true,
        output: {
          headless: false,
          url: url.toString(),
          status: res.status,
          truncated,
          text: truncated ? text.slice(0, OUTPUT_CAP) : text
        }
      };
    } catch (err) {
      return { ok: false, error: `navigate failed: ${err.message}` };
    } finally {
      clearTimeout(timer);
    }
  }
};

module.exports = { browserTool, stripToText, extractLinks };
