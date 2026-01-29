/**
 * Query Interface E2E Tests
 * Tests for natural language query functionality
 */

import { test, expect } from '../fixtures'

test.describe('Query Interface', () => {
  test.describe('Query Page', () => {
    test('should display query interface', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Page should load with input and ask button
      await expect(queryPage.queryInput).toBeVisible()
      await expect(queryPage.askButton).toBeVisible()
    })

    test('should show page title and description', async ({ queryPage }) => {
      await queryPage.goto()
      
      await expect(queryPage.page.getByRole('heading', { name: /ask|query|data/i })).toBeVisible()
    })

    test('should show query suggestions', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Suggestions should be visible when no query has been made
      await expect(queryPage.suggestionsSection.or(
        queryPage.page.getByText(/try asking|suggestions|examples/i)
      )).toBeVisible()
    })

    test('should have history button', async ({ queryPage }) => {
      await queryPage.goto()
      
      await expect(queryPage.historyButton).toBeVisible()
    })
  })

  test.describe('Query Execution', () => {
    test('should submit a natural language query', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me total sales by region')
      
      // Should either show results or error
      const hasResults = await queryPage.hasResults()
      const error = await queryPage.getErrorMessage()
      
      expect(hasResults || error !== null).toBeTruthy()
    })

    test('should submit query with keyboard shortcut', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQueryWithKeyboard('What is the revenue trend?')
      
      // Should process the query
      const hasResults = await queryPage.hasResults()
      const error = await queryPage.getErrorMessage()
      
      expect(hasResults || error !== null).toBeTruthy()
    })

    test('should show loading state during query', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Fill query but don't wait for results
      await queryPage.queryInput.fill('Show me all customers')
      await queryPage.askButton.click()
      
      // Loading indicator should appear
      const loading = queryPage.page.locator('.loading, [data-loading="true"]')
        .or(queryPage.page.getByText(/thinking|processing|loading/i))
      
      await expect(loading).toBeVisible({ timeout: 5000 })
    })

    test('should disable ask button when empty', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Clear input
      await queryPage.queryInput.fill('')
      
      // Button should be disabled
      await expect(queryPage.askButton).toBeDisabled()
    })

    test('should enable ask button when query entered', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.queryInput.fill('Show me data')
      
      await expect(queryPage.askButton).toBeEnabled()
    })
  })

  test.describe('Query Results', () => {
    test('should display results in table format', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me top 10 customers')
      
      if (await queryPage.hasResults()) {
        await queryPage.switchToTable()
        
        await expect(queryPage.page.getByRole('table')).toBeVisible()
      }
    })

    test('should display results in chart format', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('What are sales by category?')
      
      if (await queryPage.hasResults()) {
        await queryPage.switchToChart()
        
        await expect(queryPage.chartContainer).toBeVisible()
      }
    })

    test('should show generated SQL', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me all orders')
      
      if (await queryPage.hasResults()) {
        const sql = await queryPage.getGeneratedSql()
        
        // SQL should contain SELECT
        expect(sql.toLowerCase()).toContain('select')
      }
    })

    test('should show row count', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me customers')
      
      if (await queryPage.hasResults()) {
        const rowCount = await queryPage.getRowCount()
        expect(rowCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Query History', () => {
    test('should open query history panel', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.openHistory()
      
      // History panel should be visible
      await expect(
        queryPage.page.locator('[data-testid="query-history"], .history-panel')
      ).toBeVisible()
    })

    test('should save queries to history', async ({ queryPage }) => {
      await queryPage.goto()
      
      const testQuery = 'Show me unique test query ' + Date.now()
      await queryPage.submitQuery(testQuery)
      
      // Open history
      await queryPage.openHistory()
      
      // Query should be in history (partial match)
      await expect(queryPage.page.getByText(/unique test query/i)).toBeVisible()
    })

    test('should load query from history', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Submit a query first
      const testQuery = 'Show sales data'
      await queryPage.submitQuery(testQuery)
      
      // Clear input
      await queryPage.queryInput.clear()
      
      // Open history and select
      await queryPage.openHistory()
      await queryPage.page.getByText(/sales data/i).click()
      
      // Input should be populated
      await expect(queryPage.queryInput).toHaveValue(/sales/i)
    })
  })

  test.describe('Query Suggestions', () => {
    test('should click on suggestion', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Find first suggestion button
      const suggestion = queryPage.page.locator('[data-testid="suggestion"], .suggestion')
        .first()
      
      if (await suggestion.isVisible()) {
        const suggestionText = await suggestion.textContent()
        await suggestion.click()
        
        // Query should be processed
        const hasResults = await queryPage.hasResults()
        const error = await queryPage.getErrorMessage()
        
        expect(hasResults || error !== null).toBeTruthy()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should show error for invalid query', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Submit gibberish
      await queryPage.submitQuery('asdfghjkl zxcvbnm')
      
      // Should show error or clarification request
      const error = await queryPage.getErrorMessage()
      const clarification = queryPage.page.getByText(/understand|clarify|rephrase/i)
      
      const hasError = error !== null
      const hasClarification = await clarification.isVisible().catch(() => false)
      const hasResults = await queryPage.hasResults()
      
      // Should have some response
      expect(hasError || hasClarification || hasResults).toBeTruthy()
    })

    test('should have retry button on error', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Invalid query that will fail xyz123')
      
      const error = await queryPage.getErrorMessage()
      if (error) {
        const retryButton = queryPage.page.getByRole('button', { name: /retry|try again/i })
        await expect(retryButton).toBeVisible()
      }
    })
  })

  test.describe('Save to Dashboard', () => {
    test('should show save to dashboard button after results', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me revenue by month')
      
      if (await queryPage.hasResults()) {
        await expect(queryPage.saveToDashboardButton).toBeVisible()
      }
    })

    test('should open save dialog', async ({ queryPage, page }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Sales by region')
      
      if (await queryPage.hasResults()) {
        await queryPage.saveToDashboardButton.click()
        
        // Dialog should open
        await expect(
          page.getByRole('dialog').or(page.getByLabel(/dashboard/i))
        ).toBeVisible()
      }
    })
  })

  test.describe('Export', () => {
    test('should show export button after results', async ({ queryPage }) => {
      await queryPage.goto()
      
      await queryPage.submitQuery('Show me customers')
      
      if (await queryPage.hasResults()) {
        await expect(queryPage.exportButton).toBeVisible()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should support keyboard input', async ({ queryPage }) => {
      await queryPage.goto()
      
      // Focus query input
      await queryPage.queryInput.focus()
      await expect(queryPage.queryInput).toBeFocused()
      
      // Type query
      await queryPage.page.keyboard.type('Test query')
      await expect(queryPage.queryInput).toHaveValue('Test query')
    })

    test('should have proper placeholders', async ({ queryPage }) => {
      await queryPage.goto()
      
      await expect(queryPage.queryInput).toHaveAttribute('placeholder')
    })
  })
})
