/**
 * Login Page Object
 * Page object for authentication pages
 */

import { Page, Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator
  readonly forgotPasswordLink: Locator
  readonly registerLink: Locator
  readonly rememberMeCheckbox: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.loginButton = page.getByRole('button', { name: /sign in/i })
    this.errorMessage = page.locator('.text-destructive, [role="alert"]')
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i })
    this.registerLink = page.getByRole('link', { name: /sign up|register/i })
    this.rememberMeCheckbox = page.getByLabel(/remember me/i)
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login')
    await expect(this.loginButton).toBeVisible()
  }

  /**
   * Perform login with given credentials
   */
  async login(email: string, password: string, options?: { rememberMe?: boolean }) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    
    if (options?.rememberMe) {
      await this.rememberMeCheckbox.check()
    }
    
    await this.loginButton.click()
  }

  /**
   * Login and wait for dashboard redirect
   */
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password)
    await this.page.waitForURL('**/dashboard', { timeout: 15000 })
  }

  /**
   * Assert error message is displayed
   */
  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toBeVisible()
    await expect(this.errorMessage).toContainText(message)
  }

  /**
   * Assert login form is displayed
   */
  async expectLoginFormVisible() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.loginButton).toBeVisible()
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click()
    await this.page.waitForURL('**/forgot-password')
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click()
    await this.page.waitForURL('**/register')
  }
}
