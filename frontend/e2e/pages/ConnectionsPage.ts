/**
 * Connections Page Object
 * Page object for database connections management
 */

import { Page, Locator, expect } from '@playwright/test'

export class ConnectionsPage {
  readonly page: Page
  readonly addConnectionButton: Locator
  readonly connectionsList: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.addConnectionButton = page.getByRole('button', { name: /add|new|create.*connection/i })
    this.connectionsList = page.locator('[data-testid="connections-list"], .connections-list')
    this.searchInput = page.getByPlaceholder(/search/i)
  }

  /**
   * Navigate to connections page
   */
  async goto() {
    await this.page.goto('/connections')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Create a new connection
   */
  async createConnection(
    type: string,
    name: string,
    config: Record<string, string>
  ) {
    await this.addConnectionButton.click()
    
    // Select connection type
    const typeSelector = this.page.getByRole('button', { name: type })
      .or(this.page.locator(`[data-connection-type="${type.toLowerCase()}"]`))
    await typeSelector.click()
    
    // Fill name
    await this.page.getByLabel(/name|connection name/i).fill(name)
    
    // Fill configuration fields
    for (const [field, value] of Object.entries(config)) {
      const input = this.page.getByLabel(new RegExp(field, 'i'))
      if (await input.isVisible()) {
        if (field.toLowerCase().includes('password')) {
          // Handle password fields
          await input.fill(value)
        } else {
          await input.fill(value)
        }
      }
    }
    
    // Submit form
    await this.page.getByRole('button', { name: /save|create|connect/i }).click()
    
    // Wait for success
    await expect(this.page.getByText(/created|success/i)).toBeVisible({ timeout: 10000 })
  }

  /**
   * Test a connection
   */
  async testConnection(name: string): Promise<boolean> {
    const connectionCard = this.getConnectionCard(name)
    const testButton = connectionCard.getByRole('button', { name: /test/i })
    await testButton.click()
    
    const success = connectionCard.getByText(/success|connected/i)
    const failure = connectionCard.getByText(/failed|error/i)
    
    await expect(success.or(failure)).toBeVisible({ timeout: 30000 })
    
    return await success.isVisible()
  }

  /**
   * Get connection card by name
   */
  getConnectionCard(name: string): Locator {
    return this.page.locator(`[data-testid="connection-card"]:has-text("${name}")`)
      .or(this.page.locator(`.connection-card:has-text("${name}")`))
  }

  /**
   * Delete a connection
   */
  async deleteConnection(name: string) {
    const card = this.getConnectionCard(name)
    
    // Open actions menu if exists
    const menuButton = card.getByRole('button', { name: /actions|more|menu/i })
    if (await menuButton.isVisible()) {
      await menuButton.click()
    }
    
    await this.page.getByRole('button', { name: /delete|remove/i }).click()
    
    // Confirm
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i })
    await confirmButton.click()
    
    await expect(card).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * Edit a connection
   */
  async editConnection(name: string, updates: Record<string, string>) {
    const card = this.getConnectionCard(name)
    await card.getByRole('button', { name: /edit/i }).click()
    
    // Apply updates
    for (const [field, value] of Object.entries(updates)) {
      const input = this.page.getByLabel(new RegExp(field, 'i'))
      if (await input.isVisible()) {
        await input.clear()
        await input.fill(value)
      }
    }
    
    // Save
    await this.page.getByRole('button', { name: /save|update/i }).click()
    
    await expect(this.page.getByText(/updated|saved/i)).toBeVisible()
  }

  /**
   * Search connections
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  /**
   * Get count of visible connections
   */
  async getConnectionCount(): Promise<number> {
    return await this.page.locator('[data-testid="connection-card"], .connection-card').count()
  }

  /**
   * Assert connection status
   */
  async expectConnectionStatus(name: string, status: 'active' | 'inactive' | 'error') {
    const card = this.getConnectionCard(name)
    const statusBadge = card.locator('[data-status], .status-badge')
    await expect(statusBadge).toHaveAttribute('data-status', status)
      .or(expect(statusBadge).toContainText(new RegExp(status, 'i')))
  }
}
