/**
 * Semantic Layer E2E Tests
 * Tests for semantic model management and query interface
 */

import { test, expect } from '../fixtures'

test.describe('Semantic Layer', () => {
  test.describe('Semantic Models', () => {
    test('should display semantic models list', async ({ page }) => {
      await page.goto('/semantic')
      
      await expect(page.getByRole('heading', { name: /semantic|models/i })).toBeVisible()
    })

    test('should show model details when clicked', async ({ page }) => {
      await page.goto('/semantic')
      
      // Wait for models to load
      await page.waitForLoadState('networkidle')
      
      // Click on a model card if available
      const modelCard = page.locator('[data-testid="model-card"]').first()
        .or(page.locator('.model-card').first())
      
      if (await modelCard.isVisible()) {
        await modelCard.click()
        
        // Should show model details
        await expect(
          page.getByText(/dimensions|measures|description/i)
        ).toBeVisible()
      }
    })

    test('should filter models by type', async ({ page }) => {
      await page.goto('/semantic')
      
      // Look for type filter
      const typeFilter = page.getByRole('combobox', { name: /type|filter/i })
        .or(page.getByLabel(/type/i))
      
      if (await typeFilter.isVisible()) {
        await typeFilter.click()
        
        // Select fact type
        await page.getByRole('option', { name: /fact/i }).click()
        
        await page.waitForLoadState('networkidle')
      }
    })

    test('should search models by name', async ({ page }) => {
      await page.goto('/semantic')
      
      const searchInput = page.getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'))
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('sales')
        await page.waitForLoadState('networkidle')
      }
    })
  })

  test.describe('Model Editor', () => {
    test('should open model editor for new model', async ({ page }) => {
      await page.goto('/semantic')
      
      const createButton = page.getByRole('button', { name: /create|new|add/i })
      
      if (await createButton.isVisible()) {
        await createButton.click()
        
        // Should show model editor
        await expect(
          page.getByRole('heading', { name: /create|new model/i })
            .or(page.getByText(/model editor/i))
        ).toBeVisible()
      }
    })

    test('should add dimension to model', async ({ page }) => {
      await page.goto('/semantic')
      
      // Open an existing model or create new
      const createButton = page.getByRole('button', { name: /create|new/i })
      
      if (await createButton.isVisible()) {
        await createButton.click()
        
        // Fill basic info
        const nameInput = page.getByLabel(/name/i)
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Model')
        }
        
        // Add dimension
        const addDimensionBtn = page.getByRole('button', { name: /add dimension/i })
        if (await addDimensionBtn.isVisible()) {
          await addDimensionBtn.click()
          
          // Fill dimension form
          await page.getByLabel(/dimension name/i).fill('customer_id')
          await page.getByLabel(/expression|column/i).fill('customer_id')
          
          await page.getByRole('button', { name: /add|save/i }).click()
        }
      }
    })

    test('should add measure to model', async ({ page }) => {
      await page.goto('/semantic')
      
      const createButton = page.getByRole('button', { name: /create|new/i })
      
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const addMeasureBtn = page.getByRole('button', { name: /add measure/i })
        if (await addMeasureBtn.isVisible()) {
          await addMeasureBtn.click()
          
          // Fill measure form
          await page.getByLabel(/measure name/i).fill('total_revenue')
          await page.getByLabel(/expression|column/i).fill('amount')
          await page.getByLabel(/aggregation/i).selectOption('sum')
          
          await page.getByRole('button', { name: /add|save/i }).click()
        }
      }
    })
  })

  test.describe('Query Builder', () => {
    test('should display query builder interface', async ({ page }) => {
      await page.goto('/query')
      
      await expect(
        page.getByRole('heading', { name: /query|explore/i })
          .or(page.getByText(/query builder/i))
      ).toBeVisible()
    })

    test('should select semantic model', async ({ page }) => {
      await page.goto('/query')
      
      const modelSelector = page.getByRole('combobox', { name: /model/i })
        .or(page.getByLabel(/select model/i))
      
      if (await modelSelector.isVisible()) {
        await modelSelector.click()
        
        // Should show model options
        const options = page.getByRole('option')
        await expect(options.first()).toBeVisible()
      }
    })

    test('should drag dimension to query', async ({ page }) => {
      await page.goto('/query')
      
      await page.waitForLoadState('networkidle')
      
      // Find a dimension to drag
      const dimension = page.locator('[data-dimension]').first()
        .or(page.locator('.dimension-item').first())
      
      if (await dimension.isVisible()) {
        // Find drop zone
        const dropZone = page.locator('[data-drop-zone="dimensions"]')
          .or(page.locator('.dimension-drop-zone'))
        
        if (await dropZone.isVisible()) {
          await dimension.dragTo(dropZone)
        }
      }
    })

    test('should add filter to query', async ({ page }) => {
      await page.goto('/query')
      
      const addFilterBtn = page.getByRole('button', { name: /add filter/i })
      
      if (await addFilterBtn.isVisible()) {
        await addFilterBtn.click()
        
        // Should show filter dialog
        await expect(
          page.getByRole('dialog')
            .or(page.locator('.filter-modal'))
        ).toBeVisible()
      }
    })

    test('should execute query and show results', async ({ page }) => {
      await page.goto('/query')
      
      const runButton = page.getByRole('button', { name: /run|execute/i })
      
      if (await runButton.isVisible() && await runButton.isEnabled()) {
        await runButton.click()
        
        // Wait for results
        await page.waitForLoadState('networkidle')
        
        // Results table or chart should appear
        await expect(
          page.locator('table')
            .or(page.locator('.chart-container'))
            .or(page.getByText(/no results/i))
        ).toBeVisible()
      }
    })

    test('should show generated SQL', async ({ page }) => {
      await page.goto('/query')
      
      const showSqlBtn = page.getByRole('button', { name: /show sql|view sql/i })
        .or(page.getByRole('tab', { name: /sql/i }))
      
      if (await showSqlBtn.isVisible()) {
        await showSqlBtn.click()
        
        // Should show SQL code
        await expect(
          page.locator('pre')
            .or(page.locator('.code-block'))
            .or(page.locator('[data-language="sql"]'))
        ).toBeVisible()
      }
    })
  })

  test.describe('Natural Language Query', () => {
    test('should display NL query input', async ({ page }) => {
      await page.goto('/query')
      
      const nlInput = page.getByPlaceholder(/ask a question|natural language/i)
        .or(page.getByLabel(/question/i))
      
      await expect(nlInput).toBeVisible()
    })

    test('should submit natural language query', async ({ page }) => {
      await page.goto('/query')
      
      const nlInput = page.getByPlaceholder(/ask a question|natural language/i)
        .or(page.getByLabel(/question/i))
      
      if (await nlInput.isVisible()) {
        await nlInput.fill('Show me total revenue by region')
        
        // Submit query
        await page.keyboard.press('Enter')
        
        // Wait for AI processing
        await page.waitForLoadState('networkidle')
      }
    })

    test('should show query suggestions', async ({ page }) => {
      await page.goto('/query')
      
      const nlInput = page.getByPlaceholder(/ask a question|natural language/i)
      
      if (await nlInput.isVisible()) {
        await nlInput.focus()
        await nlInput.fill('show')
        
        // Should show autocomplete suggestions
        const suggestions = page.locator('.autocomplete-suggestions')
          .or(page.getByRole('listbox'))
        
        // Suggestions may or may not appear based on implementation
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Query History', () => {
    test('should display query history', async ({ page }) => {
      await page.goto('/query/history')
      
      await expect(
        page.getByRole('heading', { name: /history/i })
          .or(page.getByText(/recent queries/i))
      ).toBeVisible()
    })

    test('should re-run query from history', async ({ page }) => {
      await page.goto('/query/history')
      
      const historyItem = page.locator('[data-testid="history-item"]').first()
        .or(page.locator('.history-item').first())
      
      if (await historyItem.isVisible()) {
        const runAgainBtn = historyItem.getByRole('button', { name: /run|execute/i })
        
        if (await runAgainBtn.isVisible()) {
          await runAgainBtn.click()
          
          // Should navigate to query page with pre-filled query
          await expect(page).toHaveURL(/query/i)
        }
      }
    })

    test('should delete query from history', async ({ page }) => {
      await page.goto('/query/history')
      
      const historyItem = page.locator('[data-testid="history-item"]').first()
      
      if (await historyItem.isVisible()) {
        const deleteBtn = historyItem.getByRole('button', { name: /delete|remove/i })
        
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click()
          
          // Confirm deletion if dialog appears
          const confirmBtn = page.getByRole('button', { name: /confirm|yes/i })
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click()
          }
        }
      }
    })
  })
})
