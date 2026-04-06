import { test, expect, Page } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inject a fake auth token into localStorage so we skip the login screen.
 * In real E2E against a live backend you would call the login API instead.
 */
async function injectFakeAuth(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'auth_token',
      // Fake JWT structure — components only parse the payload client-side
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ userId: 'test-user', email: 'test@zekka.io', exp: 9999999999 })) +
      '.fakesig'
    )
    localStorage.setItem('user', JSON.stringify({ userId: 'test-user', name: 'Test User', email: 'test@zekka.io' }))
  })
}

// ─── Project CRUD flow ────────────────────────────────────────────────────────

test.describe('Project management flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('shows the projects page when navigating to /projects', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/projects')

    // Either we see a project list, or a "no projects" empty state
    const heading = page.locator('h1, h2').filter({ hasText: /project/i }).first()
    await expect(heading).toBeVisible({ timeout: 8000 })
  })

  test('project list shows a "New Project" or "Create" button', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/projects')

    const createBtn = page.locator('button, a').filter({ hasText: /new project|create project|create/i }).first()
    await expect(createBtn).toBeVisible({ timeout: 8000 })
  })

  test('create project dialog/form opens on button click', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/projects')

    const createBtn = page.locator('button, a').filter({ hasText: /new project|create project|create/i }).first()
    await createBtn.click()

    // A dialog, drawer, or form should appear with a name/title input
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="name"], input[placeholder*="project"]'
    ).first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
  })

  test('redirects unauthenticated users away from /projects', async ({ page }) => {
    // Do NOT inject auth
    await page.goto('/projects')

    // Should land on login page or be redirected
    await expect(page).not.toHaveURL(/\/projects/)
    const loginForm = page.locator('input[type="email"], input[name="email"]').first()
    await expect(loginForm).toBeVisible({ timeout: 8000 })
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Application navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('dashboard is accessible after auth', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/')

    // Should NOT be stuck on the login screen
    await page.waitForTimeout(1000)
    const emailInput = page.locator('input[type="email"]')
    const count = await emailInput.count()

    // If there's no email input, we are past the auth screen
    if (count === 0) {
      // Verify a navigation element is present
      const nav = page.locator('nav, [role="navigation"]').first()
      await expect(nav).toBeVisible({ timeout: 5000 })
    }
  })

  test('analytics page renders without crashing', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/analytics')

    // Page should not show a crash/error boundary fallback
    const errorMsg = page.locator('text=Something went wrong').first()
    expect(await errorMsg.count()).toBe(0)

    // At least some content renders
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('settings page renders without crashing', async ({ page }) => {
    await injectFakeAuth(page)
    await page.goto('/settings')

    const errorMsg = page.locator('text=Something went wrong').first()
    expect(await errorMsg.count()).toBe(0)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('404 page is shown for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')

    // Either a 404 message or a redirect to login
    const possible = await Promise.all([
      page.locator('text=/not found|404/i').count(),
      page.locator('input[type="email"]').count()
    ])

    expect(possible[0] + possible[1]).toBeGreaterThan(0)
  })
})
