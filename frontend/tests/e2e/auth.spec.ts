import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('should show login form when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should redirect to auth page
    await expect(page).toHaveURL(/.*auth/)

    // Should show login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
  })

  test('should toggle between login and register forms', async ({ page }) => {
    await page.goto('/')

    // Initially on login form
    await expect(page.locator('h1:has-text("Welcome to Zekka")')).toBeVisible()

    // Click sign up link
    await page.click('button:has-text("Sign up")')

    // Should show register form
    await expect(page.locator('h1:has-text("Create Account")')).toBeVisible()
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible()

    // Click sign in link
    await page.click('button:has-text("Sign in")')

    // Should show login form again
    await expect(page.locator('h1:has-text("Welcome to Zekka")')).toBeVisible()
  })

  test('should show password visibility toggle', async ({ page }) => {
    await page.goto('/')

    const passwordInput = page.locator('input[type="password"]')

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click visibility toggle
    await page.locator('button[title*="password"]').first().click()

    // Password should now be visible
    const visibleInput = page.locator('input[type="text"]').first()
    await expect(visibleInput).toBeVisible()
  })

  test('should validate password strength on register form', async ({ page }) => {
    await page.goto('/')

    // Go to register
    await page.click('button:has-text("Sign up")')

    // Start entering a weak password
    const passwordInput = page.locator('input[placeholder="••••••••"]').first()
    await passwordInput.fill('weak')

    // Should show validation errors
    await expect(page.locator('text=At least 8 characters')).toBeVisible()
  })

  test('should disable submit button when password requirements not met', async ({ page }) => {
    await page.goto('/')

    // Go to register
    await page.click('button:has-text("Sign up")')

    // Fill form with invalid password
    await page.locator('input[placeholder="John Doe"]').fill('John Doe')
    await page.locator('input[placeholder*="you@example"]').fill('john@example.com')
    await page.locator('input[placeholder="••••••••"]').first().fill('weak')

    // Submit button should be disabled
    const submitButton = page.locator('button:has-text("Create Account")')
    await expect(submitButton).toBeDisabled()
  })
})
