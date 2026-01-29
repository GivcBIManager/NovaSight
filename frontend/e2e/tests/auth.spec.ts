/**
 * Authentication E2E Tests
 * Tests for login, logout, and authentication flows
 */

import { test, expect } from '../fixtures'

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login form', async ({ loginPage }) => {
      await loginPage.goto()
      await loginPage.expectLoginFormVisible()
    })

    test('should login with valid credentials and redirect to dashboard', async ({ 
      loginPage, 
      page 
    }) => {
      await loginPage.goto()
      await loginPage.login('admin@novasight.dev', 'admin123')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/)
      
      // Welcome message or dashboard content should be visible
      await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ loginPage }) => {
      await loginPage.goto()
      await loginPage.login('admin@novasight.dev', 'wrongpassword')

      await loginPage.expectError(/invalid|incorrect|wrong/i)
    })

    test('should show error for non-existent user', async ({ loginPage }) => {
      await loginPage.goto()
      await loginPage.login('nonexistent@novasight.dev', 'password123')

      await loginPage.expectError(/invalid|not found|incorrect/i)
    })

    test('should show validation error for invalid email format', async ({ loginPage }) => {
      await loginPage.goto()
      await loginPage.login('invalid-email', 'password123')

      await expect(loginPage.page.getByText(/valid email/i)).toBeVisible()
    })

    test('should show validation error for empty password', async ({ loginPage, page }) => {
      await loginPage.goto()
      await loginPage.emailInput.fill('test@example.com')
      await loginPage.loginButton.click()

      await expect(page.getByText(/password.*required/i)).toBeVisible()
    })

    test('should preserve email on failed login', async ({ loginPage }) => {
      const email = 'test@example.com'
      await loginPage.goto()
      await loginPage.login(email, 'wrongpassword')

      await loginPage.expectError(/invalid/i)
      await expect(loginPage.emailInput).toHaveValue(email)
    })
  })

  test.describe('Logout Flow', () => {
    test('should logout and redirect to login', async ({ page }) => {
      // Start on dashboard (uses authenticated state from fixture)
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/.*dashboard/)

      // Find and click user menu
      const userMenu = page.getByRole('button', { name: /user|menu|profile|avatar/i })
        .or(page.locator('[data-testid="user-menu"]'))
      await userMenu.click()

      // Click logout
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click()

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/)
    })

    test('should clear session data on logout', async ({ page, loginPage }) => {
      // Login first
      await loginPage.goto()
      await loginPage.loginAndWaitForDashboard('admin@novasight.dev', 'admin123')

      // Logout
      const userMenu = page.getByRole('button', { name: /user|menu|profile|avatar/i })
        .or(page.locator('[data-testid="user-menu"]'))
      await userMenu.click()
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click()

      await expect(page).toHaveURL(/.*login/)

      // Try accessing protected route
      await page.goto('/dashboard')

      // Should redirect back to login
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe('Session Management', () => {
    test('should redirect to login when accessing protected route without auth', async ({ 
      page 
    }) => {
      // Clear any existing auth
      await page.context().clearCookies()

      // Try to access protected route
      await page.goto('/dashboards')

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/)
    })

    test('should redirect to original destination after login', async ({ 
      page, 
      loginPage 
    }) => {
      // Clear auth
      await page.context().clearCookies()

      // Try to access specific protected route
      await page.goto('/datasources')

      // Should be on login page
      await expect(page).toHaveURL(/.*login/)

      // Login
      await loginPage.login('admin@novasight.dev', 'admin123')

      // Should redirect to originally requested page
      await expect(page).toHaveURL(/.*datasources/)
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should navigate to forgot password page', async ({ loginPage, page }) => {
      await loginPage.goto()
      await loginPage.goToForgotPassword()

      await expect(page).toHaveURL(/.*forgot-password/)
      await expect(page.getByRole('heading', { name: /forgot|reset/i })).toBeVisible()
    })

    test('should show success message after requesting password reset', async ({ 
      page, 
      loginPage 
    }) => {
      await loginPage.goto()
      await loginPage.goToForgotPassword()

      // Fill email
      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByRole('button', { name: /reset|send|submit/i }).click()

      // Should show success/confirmation message
      await expect(page.getByText(/sent|check.*email|success/i)).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ loginPage }) => {
      await loginPage.goto()

      // Email input should be properly labeled
      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.emailInput).toHaveAttribute('type', 'email')

      // Password input should be properly labeled
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password')
    })

    test('should support keyboard navigation', async ({ loginPage, page }) => {
      await loginPage.goto()

      // Tab through form
      await loginPage.emailInput.focus()
      await expect(loginPage.emailInput).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(loginPage.passwordInput).toBeFocused()

      // Should be able to submit with Enter
      await loginPage.emailInput.fill('admin@novasight.dev')
      await loginPage.passwordInput.fill('admin123')
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(/.*dashboard/)
    })
  })
})
