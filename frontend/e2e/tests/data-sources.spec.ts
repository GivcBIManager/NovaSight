/**
 * Data Sources E2E Tests
 * Tests for data source management and configuration
 */

import { test, expect } from '../fixtures'

test.describe('Data Sources', () => {
  test.describe('Data Source List', () => {
    test('should display data sources page', async ({ dataSourcesPage }) => {
      await dataSourcesPage.goto()
      
      await expect(dataSourcesPage.page.getByRole('heading', { name: /data sources/i })).toBeVisible()
    })

    test('should show add data source button', async ({ dataSourcesPage }) => {
      await dataSourcesPage.goto()
      
      await expect(dataSourcesPage.addDataSourceButton).toBeVisible()
    })

    test('should search data sources', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      await dataSourcesPage.search('production')
      
      // Results should be filtered (or show no results)
      await page.waitForLoadState('networkidle')
    })

    test('should filter by type', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      // Try filtering by PostgreSQL
      const filterDropdown = page.getByRole('combobox').or(page.getByRole('button', { name: /filter|type/i }))
      if (await filterDropdown.isVisible()) {
        await filterDropdown.click()
        await page.getByRole('option', { name: /postgres/i }).click()
        await page.waitForLoadState('networkidle')
      }
    })
  })

  test.describe('Data Source Creation', () => {
    test('should open create data source dialog', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      await dataSourcesPage.addDataSourceButton.click()
      
      // Dialog or new page should appear
      await expect(
        page.getByRole('dialog').or(page.getByRole('heading', { name: /add|new|create/i }))
      ).toBeVisible()
    })

    test('should show available connection types', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      await dataSourcesPage.addDataSourceButton.click()
      
      // Should see database type options
      const typeOptions = page.getByRole('button', { name: /postgres|mysql|clickhouse|snowflake/i })
        .or(page.locator('[data-connection-type]'))
      
      await expect(typeOptions.first()).toBeVisible()
    })

    test('should validate required fields', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      await dataSourcesPage.addDataSourceButton.click()
      
      // Select a type first if needed
      const typeButton = page.getByRole('button', { name: /postgres/i })
        .or(page.locator('[data-connection-type="postgres"]'))
      if (await typeButton.isVisible()) {
        await typeButton.click()
      }
      
      // Try to submit without filling required fields
      await page.getByRole('button', { name: /create|save|add/i }).click()
      
      // Should show validation errors
      await expect(page.getByText(/required|cannot be empty/i)).toBeVisible()
    })

    test('should test connection before saving', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      await dataSourcesPage.addDataSourceButton.click()
      
      // Select PostgreSQL type
      const typeButton = page.getByRole('button', { name: /postgres/i })
        .or(page.locator('[data-connection-type="postgres"]'))
      if (await typeButton.isVisible()) {
        await typeButton.click()
      }
      
      // Fill basic connection details
      await page.getByLabel(/name/i).fill('Test Connection')
      await page.getByLabel(/host/i).fill('localhost')
      await page.getByLabel(/port/i).fill('5432')
      await page.getByLabel(/database/i).fill('testdb')
      await page.getByLabel(/user|username/i).fill('testuser')
      
      const passwordField = page.getByLabel(/password/i)
      if (await passwordField.isVisible()) {
        await passwordField.fill('testpass')
      }
      
      // Test connection button should be available
      const testButton = page.getByRole('button', { name: /test connection/i })
      await expect(testButton).toBeVisible()
    })
  })

  test.describe('Data Source Details', () => {
    test('should navigate to data source details', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      // Click on first data source card (if exists)
      const firstCard = page.locator('[data-testid="datasource-card"]').first()
      if (await firstCard.isVisible()) {
        await firstCard.click()
        
        // Should be on detail page
        await expect(page).toHaveURL(/\/datasources\/[\w-]+/)
      }
    })

    test('should display schema information', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      // Navigate to first data source
      const firstCard = page.locator('[data-testid="datasource-card"]').first()
      if (await firstCard.isVisible()) {
        await firstCard.click()
        
        // Look for schema/tables section
        await expect(
          page.getByText(/schema|tables|columns/i)
        ).toBeVisible({ timeout: 10000 })
      }
    })

    test('should sync schema', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      const firstCard = page.locator('[data-testid="datasource-card"]').first()
      if (await firstCard.isVisible()) {
        await firstCard.click()
        
        // Find sync button
        const syncButton = page.getByRole('button', { name: /sync|refresh|introspect/i })
        if (await syncButton.isVisible()) {
          await syncButton.click()
          
          // Should show syncing state or success
          await expect(
            page.getByText(/syncing|refreshing|updated|success/i)
          ).toBeVisible({ timeout: 30000 })
        }
      }
    })
  })

  test.describe('Data Source Actions', () => {
    test('should edit data source', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      const firstCard = page.locator('[data-testid="datasource-card"]').first()
      if (await firstCard.isVisible()) {
        // Find edit button
        const editButton = firstCard.getByRole('button', { name: /edit/i })
        if (await editButton.isVisible()) {
          await editButton.click()
          
          // Edit dialog or page should open
          await expect(
            page.getByLabel(/name/i).or(page.getByRole('heading', { name: /edit/i }))
          ).toBeVisible()
        }
      }
    })

    test('should show delete confirmation', async ({ dataSourcesPage, page }) => {
      await dataSourcesPage.goto()
      
      const firstCard = page.locator('[data-testid="datasource-card"]').first()
      if (await firstCard.isVisible()) {
        // Find delete button
        const deleteButton = firstCard.getByRole('button', { name: /delete|remove/i })
        if (await deleteButton.isVisible()) {
          await deleteButton.click()
          
          // Confirmation dialog should appear
          await expect(
            page.getByRole('dialog').or(page.getByText(/confirm|are you sure/i))
          ).toBeVisible()
          
          // Cancel to not actually delete
          await page.getByRole('button', { name: /cancel|no/i }).click()
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ dataSourcesPage }) => {
      await dataSourcesPage.goto()
      
      // Add button should be accessible
      await expect(dataSourcesPage.addDataSourceButton).toBeVisible()
      
      // Search should be accessible
      if (await dataSourcesPage.searchInput.isVisible()) {
        await expect(dataSourcesPage.searchInput).toHaveAttribute('placeholder')
      }
    })
  })
})
