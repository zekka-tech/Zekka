/**
 * PlaywrightBrowser - a real headless-browser backend for the `browser` tool.
 *
 * Satisfies the contract the tool expects:
 *   browser.run({ action: 'read'|'links'|'click', url?, selector?, timeoutMs? })
 *     => Promise<{ url, text? , links?, clicked? }>
 *
 * Unlike the tool's fetch-based fallback, this drives a real Chromium instance,
 * so it handles JS-rendered pages and interactive actions (`click`). A single
 * browser is launched lazily and reused across calls; each call uses a fresh
 * page which is always closed.
 *
 * `playwright` is an OPTIONAL runtime dependency (heavy — ships browser
 * binaries), so it is lazily `require`d and can be injected for tests. It is
 * intentionally NOT in package.json dependencies; enable this backend only
 * where you've installed it (`npm i playwright && npx playwright install chromium`).
 *
 * @module orchestrator/browser/playwright-browser
 */

/* global document */ // `document` refs below run in the browser via page.evaluate()

const OUTPUT_CAP = 40 * 1024;
const DEFAULT_TIMEOUT_MS = 20 * 1000;
const MAX_LINKS = 200;

class PlaywrightBrowser {
  /**
   * @param {Object} [options]
   * @param {Object} [options.playwright] injected playwright module (tests)
   * @param {Object} [options.launchOptions] passed to chromium.launch()
   * @param {number} [options.navTimeoutMs]
   * @param {Object} [options.logger]
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this._pw = options.playwright || null;
    this._browser = null;
    this.launchOptions = options.launchOptions || { headless: true };
    this.navTimeoutMs = options.navTimeoutMs || DEFAULT_TIMEOUT_MS;
  }

  _module() {
    if (this._pw) return this._pw;
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      this._pw = require('playwright');
    } catch {
      throw new Error(
        'playwright is not installed; run `npm i playwright && npx playwright '
        + 'install chromium` to enable the headless browser backend'
      );
    }
    return this._pw;
  }

  async _browserInstance() {
    if (this._browser) return this._browser;
    const pw = this._module();
    this._browser = await pw.chromium.launch(this.launchOptions);
    return this._browser;
  }

  async run({
    action, url, selector, timeoutMs
  } = {}) {
    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : this.navTimeoutMs;

    const browser = await this._browserInstance();
    const page = await browser.newPage();
    try {
      if (url) {
        await page.goto(url, { timeout, waitUntil: 'domcontentloaded' });
      }

      switch (action) {
      case 'read': {
        const text = await page.evaluate(
          () => (document.body ? document.body.innerText : '')
        );
        return { url: page.url(), text: String(text).slice(0, OUTPUT_CAP) };
      }
      case 'links': {
        const links = await page.evaluate((cap) => Array.from(
          document.querySelectorAll('a[href]')
        ).slice(0, cap).map((a) => ({
          href: a.href,
          text: (a.textContent || '').trim().slice(0, 120)
        })), MAX_LINKS);
        return { url: page.url(), links };
      }
      case 'click': {
        if (!selector) throw new Error('selector is required for the click action');
        await page.click(selector, { timeout });
        await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
        const text = await page.evaluate(
          () => (document.body ? document.body.innerText : '')
        );
        return {
          url: page.url(),
          clicked: selector,
          text: String(text).slice(0, OUTPUT_CAP)
        };
      }
      default:
        throw new Error(`unsupported browser action: ${action}`);
      }
    } finally {
      await page.close().catch(() => {});
    }
  }

  /** Close the shared browser (call on shutdown). */
  async close() {
    if (this._browser) {
      await this._browser.close().catch(() => {});
      this._browser = null;
    }
  }
}

module.exports = { PlaywrightBrowser };
