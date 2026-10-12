/**
 * PlaywrightBrowser tests — navigate/read/links/click + lazy-require error.
 * A fake playwright module is injected (no real Chromium launched).
 */
const { PlaywrightBrowser } = require('../../../src/orchestrator/browser/playwright-browser');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

function fakePlaywright(page) {
  const browser = { newPage: jest.fn().mockResolvedValue(page), close: jest.fn().mockResolvedValue() };
  return {
    module: { chromium: { launch: jest.fn().mockResolvedValue(browser) } },
    browser
  };
}

function fakePage(overrides = {}) {
  return {
    goto: jest.fn().mockResolvedValue(),
    click: jest.fn().mockResolvedValue(),
    waitForLoadState: jest.fn().mockResolvedValue(),
    evaluate: jest.fn().mockResolvedValue(''),
    url: jest.fn().mockReturnValue('https://example.com/'),
    close: jest.fn().mockResolvedValue(),
    ...overrides
  };
}

describe('PlaywrightBrowser', () => {
  it('navigates and reads visible text', async () => {
    const page = fakePage({ evaluate: jest.fn().mockResolvedValue('Hello World') });
    const { module } = fakePlaywright(page);
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });

    const res = await b.run({ action: 'read', url: 'https://example.com' });

    expect(page.goto).toHaveBeenCalledWith('https://example.com',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }));
    expect(res).toEqual({ url: 'https://example.com/', text: 'Hello World' });
    expect(page.close).toHaveBeenCalled();
  });

  it('extracts links via page.evaluate', async () => {
    const links = [{ href: 'https://x/a', text: 'A' }];
    const page = fakePage({ evaluate: jest.fn().mockResolvedValue(links) });
    const { module } = fakePlaywright(page);
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });

    const res = await b.run({ action: 'links', url: 'https://example.com' });
    expect(res.links).toEqual(links);
  });

  it('clicks a selector and returns resulting page text', async () => {
    const page = fakePage({ evaluate: jest.fn().mockResolvedValue('After click') });
    const { module } = fakePlaywright(page);
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });

    const res = await b.run({ action: 'click', url: 'https://example.com', selector: '#btn' });
    expect(page.click).toHaveBeenCalledWith('#btn', expect.any(Object));
    expect(res).toMatchObject({ clicked: '#btn', text: 'After click' });
  });

  it('requires a selector for click', async () => {
    const page = fakePage();
    const { module } = fakePlaywright(page);
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });
    await expect(b.run({ action: 'click', url: 'https://example.com' }))
      .rejects.toThrow(/selector is required/);
    expect(page.close).toHaveBeenCalled(); // page still cleaned up
  });

  it('rejects an unsupported action', async () => {
    const { module } = fakePlaywright(fakePage());
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });
    await expect(b.run({ action: 'scroll', url: 'https://example.com' }))
      .rejects.toThrow(/unsupported browser action/);
  });

  it('reuses a single browser instance across calls', async () => {
    const page = fakePage();
    const { module, browser } = fakePlaywright(page);
    const b = new PlaywrightBrowser({ playwright: module, logger: silentLogger });
    await b.run({ action: 'read', url: 'https://a.com' });
    await b.run({ action: 'read', url: 'https://b.com' });
    expect(module.chromium.launch).toHaveBeenCalledTimes(1);
    expect(browser.newPage).toHaveBeenCalledTimes(2);
  });

  it('surfaces a clear error when the playwright module cannot be loaded', async () => {
    // Simulate an environment where `require('playwright')` fails. (We stub the
    // loader rather than relying on playwright's absence, which is environment-
    // dependent and would otherwise hit the real network.)
    const b = new PlaywrightBrowser({ logger: silentLogger });
    b._module = () => {
      throw new Error(
        'playwright is not installed; run `npm i playwright && npx playwright '
        + 'install chromium` to enable the headless browser backend'
      );
    };
    await expect(b.run({ action: 'read', url: 'https://example.com' }))
      .rejects.toThrow(/playwright is not installed/);
  });
});
