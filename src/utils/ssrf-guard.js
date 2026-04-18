'use strict';

/**
 * SSRF Guard — validate that a URL does not resolve to a private/loopback
 * IP range before it is used in outbound requests.
 *
 * Blocked ranges:
 *  - 127.0.0.0/8   (loopback)
 *  - 10.0.0.0/8    (RFC 1918 private)
 *  - 172.16.0.0/12 (RFC 1918 private)
 *  - 192.168.0.0/16 (RFC 1918 private)
 *  - 169.254.0.0/16 (link-local / AWS metadata)
 *  - ::1            (IPv6 loopback)
 *  - fc00::/7       (IPv6 unique-local)
 *
 * Usage:
 *   const { validateExternalUrl } = require('./ssrf-guard');
 *   validateExternalUrl(process.env.OLLAMA_HOST, 'OLLAMA_HOST');
 */

const { URL } = require('url');
const dns = require('dns');

// Allowed external hostnames (exact match) — bypass the block-list for
// well-known public API endpoints that are explicitly configured.
const ALLOWED_DOMAINS = new Set([
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.github.com',
]);

/**
 * Returns true if the dotted-decimal IPv4 address falls in a blocked range.
 * @param {string} ip
 * @returns {boolean}
 */
function isBlockedIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;
  return (
    a === 127 ||                          // 127.0.0.0/8  loopback
    a === 10 ||                           // 10.0.0.0/8   private
    (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12 private
    (a === 192 && b === 168) ||           // 192.168.0.0/16 private
    (a === 169 && b === 254)              // 169.254.0.0/16 link-local / metadata
  );
}

/**
 * Synchronously validate that `rawUrl` is not pointing at a private/loopback
 * address. Throws an Error if the URL is blocked.
 *
 * NOTE: This only validates the hostname as written in the URL (no DNS
 * resolution). For production deployments where an attacker might control DNS,
 * pair this with async `validateExternalUrlAsync` before each request.
 *
 * @param {string} rawUrl
 * @param {string} [label] - Human-readable name for error messages
 * @throws {Error}
 */
function validateExternalUrl(rawUrl, label = 'URL') {
  if (!rawUrl) return; // missing URL handled elsewhere (env validation)

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} is not a valid URL: "${rawUrl}"`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // IPv6 loopback / unique-local
  if (hostname === '::1' || hostname === '[::1]') {
    throw new Error(`${label} resolves to a blocked IPv6 loopback address: "${rawUrl}"`);
  }
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) {
    throw new Error(`${label} resolves to a blocked IPv6 unique-local address: "${rawUrl}"`);
  }

  // Allow known external API domains without further checks
  if (ALLOWED_DOMAINS.has(hostname)) return;

  // IPv4 block-list
  if (isBlockedIPv4(hostname)) {
    throw new Error(
      `${label} points to a blocked private/loopback address "${hostname}". ` +
      'Set the URL to a public endpoint or explicitly allowlist it.'
    );
  }
}

/**
 * Async variant that also resolves the hostname via DNS and re-checks the
 * resolved IPs. Use this before every outbound request in security-sensitive
 * contexts (e.g. user-supplied webhook URLs).
 *
 * @param {string} rawUrl
 * @param {string} [label]
 * @returns {Promise<void>}
 */
async function validateExternalUrlAsync(rawUrl, label = 'URL') {
  validateExternalUrl(rawUrl, label); // fast sync check first

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return; // already caught above
  }

  const hostname = parsed.hostname;
  // Skip DNS lookup for IP literals
  if (isBlockedIPv4(hostname)) return; // already blocked by sync check

  try {
    const addresses = await dns.promises.resolve4(hostname);
    for (const ip of addresses) {
      if (isBlockedIPv4(ip)) {
        throw new Error(
          `${label} hostname "${hostname}" resolves to blocked private IP "${ip}".`
        );
      }
    }
  } catch (err) {
    if (err.message.includes('blocked private IP')) throw err;
    // DNS failures are non-blocking for SSRF guard (network may not be available at boot)
  }
}

module.exports = { validateExternalUrl, validateExternalUrlAsync, isBlockedIPv4 };
