/**
 * Data Sources Page Object
 * Page object for data source management pages
 */

import { Page, Locator, expect } from '@playwright/test'

export class DataSourcesPage {
  readonly page: Page
  readonly addDataSourceButton: Locator
  readonly dataSourceList: Locator
  readonly searchInput: Locator
  readonly filterDropdown: Locator

  constructor(page: Page) {
    this.page = page
    this.addDataSourceButton = page.getByRole('button', { name: /add|new|create.*data source/i })
    this.dataSourceList = page.locator('[data-testid="datasource-list"], .datasource-list')
    this.searchInput = page.getByPlaceholder(/search/i)
    this.filterDropdown = page.getByRole('combobox', { name: /filter|type/i })
  }

  /**
   * Navigate to data sources page
   */
  async goto() {
    await this.page.goto('/datasources')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to specific data source
   */
  async gotoDataSource(id: string) {
    await this.page.goto(`/datasources/${id}`)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Create a new data source
   */
  async createDataSource(
    type: string,
    name: string,
    connectionDetails: Record<string, string>
  ) {
    await this.addDataSourceButton.click()
    
    // Select type
    await this.page.getByRole('button', { name: new RegExp(type, 'i') }).click()
    
    // Fill name
    await this.page.getByLabel(/name/i).fill(name)
    
    // Fill connection details
    for (const [field, value] of Object.entries(connectionDetails)) {
      const input = this.page.getByLabel(new RegExp(field, 'i'))
      if (await input.isVisible()) {
        await input.fill(value)
      }
    }
    
    // Submit
    await this.page.getByRole('button', { name: /create|save|add/i }).click()
    
    // Wait for creation
    await this.page.waitForResponse(resp => 
      resp.url().includes('/datasources') && resp.status() < 400
    )
  }

  /**
   * Test connection for a data source
   */
  async testConnection(): Promise<boolean> {
    const testButton = this.page.getByRole('button', { name: /test connection/i })
    await testButton.click()
    
    // Wait for test result
    const success = this.page.getByText(/connection successful|success/i)
    const failure = this.page.getByText(/connection failed|error|failed/i)
    
    await expect(success.or(failure)).toBeVisible({ timeout: 30000 })
    
    return await success.isVisible()
  }

  /**
   * Search for data sources
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Filter data sources by type
   */
  async filterByType(type: string) {
    await this.filterDropdown.click()
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get data source card by name
   */
  getDataSourceCard(name: string): Locator {
    return this.page.locator(`[data-testid="datasource-card"]:has-text("${name}")`)
  }

  /**
   * Delete a data source
   */
  async deleteDataSource(name: string) {
    const card = this.getDataSourceCard(name)
    await card.getByRole('button', { name: /delete|remove/i }).click()
    
    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click()
    
    await expect(card).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * Edit a data source
   */
  async editDataSource(name: string) {
    const card = this.getDataSourceCard(name)
    await card.click()
    
    // Wait for detail page or edit dialog
    await expect(this.page.getByRole('heading', { name })).toBeVisible()
  }

  /**
   * Get count of visible data sources
   */
  async getDataSourceCount(): Promise<number> {
    return await this.page.locator('[data-testid="datasource-card"]').count()
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState() {
    await expect(this.page.getByText(/no data sources|get started/i)).toBeVisible()
  }
}
