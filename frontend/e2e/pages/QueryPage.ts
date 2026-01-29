/**
 * Query Page Object
 * Page object for natural language query interface
 */

import { Page, Locator, expect } from '@playwright/test'

export class QueryPage {
  readonly page: Page
  readonly queryInput: Locator
  readonly askButton: Locator
  readonly historyButton: Locator
  readonly resultsSection: Locator
  readonly chartContainer: Locator
  readonly tableTab: Locator
  readonly chartTab: Locator
  readonly sqlTab: Locator
  readonly exportButton: Locator
  readonly saveToDashboardButton: Locator
  readonly suggestionsSection: Locator

  constructor(page: Page) {
    this.page = page
    this.queryInput = page.getByRole('textbox').or(page.locator('textarea'))
    this.askButton = page.getByRole('button', { name: /ask|submit|send/i })
    this.historyButton = page.getByRole('button', { name: /history/i })
    this.resultsSection = page.locator('[data-testid="query-results"], .query-results')
    this.chartContainer = page.locator('.recharts-wrapper, .chart-container, [data-testid="chart"]')
    this.tableTab = page.getByRole('tab', { name: /table/i })
    this.chartTab = page.getByRole('tab', { name: /chart|visualization/i })
    this.sqlTab = page.getByRole('tab', { name: /sql|query/i })
    this.exportButton = page.getByRole('button', { name: /export|download/i })
    this.saveToDashboardButton = page.getByRole('button', { name: /save to dashboard|add to dashboard/i })
    this.suggestionsSection = page.locator('[data-testid="query-suggestions"], .suggestions')
  }

  /**
   * Navigate to query page
   */
  async goto() {
    await this.page.goto('/query')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Submit a natural language query
   */
  async submitQuery(query: string, options?: { waitForResults?: boolean }) {
    await this.queryInput.fill(query)
    await this.askButton.click()
    
    if (options?.waitForResults !== false) {
      // Wait for results or error
      await this.waitForQueryComplete()
    }
  }

  /**
   * Submit query with keyboard shortcut
   */
  async submitQueryWithKeyboard(query: string) {
    await this.queryInput.fill(query)
    
    // Use Cmd+Enter or Ctrl+Enter
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await this.queryInput.press(`${modifier}+Enter`)
    
    await this.waitForQueryComplete()
  }

  /**
   * Wait for query to complete
   */
  async waitForQueryComplete(timeout = 60000) {
    const loadingIndicator = this.page.locator('.loading, [data-loading="true"]')
    const results = this.page.getByText(/results|rows|data/i)
    const error = this.page.locator('[data-testid="query-error"], .error')
    
    await expect(loadingIndicator).not.toBeVisible({ timeout })
    await expect(results.or(error)).toBeVisible({ timeout })
  }

  /**
   * Check if query returned results
   */
  async hasResults(): Promise<boolean> {
    const results = this.page.getByText(/results/i)
    return await results.isVisible()
  }

  /**
   * Get error message if query failed
   */
  async getErrorMessage(): Promise<string | null> {
    const error = this.page.locator('[data-testid="query-error"], .error')
    if (await error.isVisible()) {
      return await error.textContent()
    }
    return null
  }

  /**
   * Switch to table view
   */
  async switchToTable() {
    await this.tableTab.click()
    await expect(this.page.getByRole('table')).toBeVisible()
  }

  /**
   * Switch to chart view
   */
  async switchToChart() {
    await this.chartTab.click()
    await expect(this.chartContainer).toBeVisible()
  }

  /**
   * Switch to SQL view
   */
  async switchToSql() {
    await this.sqlTab.click()
    await expect(this.page.locator('code, pre, .sql-code')).toBeVisible()
  }

  /**
   * Get generated SQL
   */
  async getGeneratedSql(): Promise<string> {
    await this.switchToSql()
    const sqlCode = this.page.locator('code, pre, .sql-code')
    return await sqlCode.textContent() || ''
  }

  /**
   * Export results
   */
  async exportResults(format: 'csv' | 'excel' | 'json' = 'csv') {
    await this.exportButton.click()
    
    // Select format if dropdown appears
    const formatOption = this.page.getByRole('menuitem', { name: new RegExp(format, 'i') })
    if (await formatOption.isVisible()) {
      await formatOption.click()
    }
    
    // Wait for download
    const download = await this.page.waitForEvent('download', { timeout: 15000 })
    return download
  }

  /**
   * Save result to dashboard
   */
  async saveToDashboard(dashboardName: string, widgetName: string) {
    await this.saveToDashboardButton.click()
    
    // Select dashboard
    await this.page.getByLabel(/dashboard/i).click()
    await this.page.getByRole('option', { name: dashboardName }).click()
    
    // Enter widget name
    await this.page.getByLabel(/widget name|name/i).fill(widgetName)
    
    // Confirm
    await this.page.getByRole('button', { name: /save|add/i }).click()
    
    // Wait for success message
    await expect(this.page.getByText(/saved|added|success/i)).toBeVisible()
  }

  /**
   * Click on a query suggestion
   */
  async clickSuggestion(suggestionText: string) {
    const suggestion = this.page.getByRole('button', { name: suggestionText })
      .or(this.page.getByText(suggestionText))
    
    await suggestion.click()
    await this.waitForQueryComplete()
  }

  /**
   * Open query history
   */
  async openHistory() {
    await this.historyButton.click()
    await expect(this.page.locator('[data-testid="query-history"], .history-panel')).toBeVisible()
  }

  /**
   * Select a query from history
   */
  async selectFromHistory(queryText: string) {
    await this.openHistory()
    await this.page.getByText(queryText).click()
    
    // Query input should be populated
    await expect(this.queryInput).toHaveValue(new RegExp(queryText))
  }

  /**
   * Get row count from results
   */
  async getRowCount(): Promise<number> {
    const rowCountText = this.page.getByText(/\d+ rows?/i)
    const text = await rowCountText.textContent() || ''
    const match = text.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Retry failed query
   */
  async retryQuery() {
    const retryButton = this.page.getByRole('button', { name: /retry|try again/i })
    await retryButton.click()
    await this.waitForQueryComplete()
  }
}
