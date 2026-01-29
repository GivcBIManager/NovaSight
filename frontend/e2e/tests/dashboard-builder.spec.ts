/**
 * Dashboard Builder E2E Tests
 * Tests for dashboard creation, widget management, and layout editing
 */

import { test, expect } from '../fixtures'

test.describe('Dashboard Builder', () => {
  test.describe('Dashboard Management', () => {
    test('should display dashboards list', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      
      // Page should load with title
      await expect(dashboardPage.page.getByRole('heading', { name: /dashboards/i })).toBeVisible()
    })

    test('should create a new dashboard', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('E2E Test Dashboard', 'Created by E2E test')

      // Should navigate to new dashboard
      await expect(page).toHaveURL(/\/dashboards\/[\w-]+/)
      
      // Dashboard title should be visible
      await dashboardPage.expectTitle('E2E Test Dashboard')
    })

    test('should show empty state for new dashboard', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Empty Dashboard')

      // Should show no widgets message
      await dashboardPage.expectNoWidgets()
    })

    test('should delete a dashboard', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      
      // Create a dashboard to delete
      await dashboardPage.createDashboard('Dashboard To Delete')
      
      // Go back to list
      await dashboardPage.goto()
      
      // Find and delete
      const dashboardCard = page.locator('[data-testid="dashboard-card"]:has-text("Dashboard To Delete")')
      await dashboardCard.getByRole('button', { name: /delete|remove/i }).click()
      
      // Confirm
      await page.getByRole('button', { name: /confirm|yes/i }).click()
      
      // Should be removed
      await expect(dashboardCard).not.toBeVisible()
    })
  })

  test.describe('Widget Management', () => {
    test('should add a metric card widget', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Widget Test Dashboard')
      
      // Enable edit mode
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Metric Card', 'Total Sales')
      
      // Widget should be visible
      const widget = dashboardPage.getWidget('Total Sales')
      await expect(widget).toBeVisible()
    })

    test('should add multiple widget types', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Multi Widget Dashboard')
      await dashboardPage.enableEditMode()

      // Add different widget types
      await dashboardPage.addWidget('Metric Card', 'Revenue')
      await dashboardPage.addWidget('Bar Chart', 'Sales by Region')
      await dashboardPage.addWidget('Line Chart', 'Revenue Trend')

      // All widgets should be visible
      await expect(dashboardPage.getWidget('Revenue')).toBeVisible()
      await expect(dashboardPage.getWidget('Sales by Region')).toBeVisible()
      await expect(dashboardPage.getWidget('Revenue Trend')).toBeVisible()
    })

    test('should delete a widget', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Delete Widget Test')
      await dashboardPage.enableEditMode()
      
      // Add widget first
      await dashboardPage.addWidget('Metric Card', 'Widget To Delete')
      await expect(dashboardPage.getWidget('Widget To Delete')).toBeVisible()
      
      // Delete it
      await dashboardPage.deleteWidget('Widget To Delete')
      
      // Should be gone
      await expect(dashboardPage.getWidget('Widget To Delete')).not.toBeVisible()
    })

    test('should save widget changes', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Save Test Dashboard')
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Metric Card', 'Saved Widget')
      
      // Save
      await dashboardPage.saveDashboard()
      
      // Reload page
      await page.reload()
      
      // Widget should still be there
      await expect(dashboardPage.getWidget('Saved Widget')).toBeVisible()
    })
  })

  test.describe('Layout Editing', () => {
    test('should enter and exit edit mode', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Edit Mode Test')
      
      // Enter edit mode
      await dashboardPage.enableEditMode()
      await expect(dashboardPage.saveButton).toBeVisible()
      
      // Add a widget so we have something to work with
      await dashboardPage.addWidget('Metric Card', 'Test Widget')
      
      // Exit edit mode (save or cancel)
      await dashboardPage.saveDashboard()
      await expect(dashboardPage.editButton).toBeVisible()
    })

    test('should drag and drop widgets', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Drag Test Dashboard')
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Metric Card', 'Draggable Widget')
      
      // Get initial position
      const widget = dashboardPage.getWidget('Draggable Widget')
      const initialBounds = await widget.boundingBox()
      
      // Drag widget
      await dashboardPage.dragWidget('Draggable Widget', 400, 300)
      
      // Position should have changed
      const newBounds = await widget.boundingBox()
      expect(newBounds?.x).not.toBe(initialBounds?.x)
    })

    test('should resize widgets', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Resize Test Dashboard')
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Bar Chart', 'Resizable Widget')
      
      // Get initial size
      const widget = dashboardPage.getWidget('Resizable Widget')
      const initialBounds = await widget.boundingBox()
      
      // Resize widget
      await dashboardPage.resizeWidget('Resizable Widget', 100, 50)
      
      // Size should have changed
      const newBounds = await widget.boundingBox()
      expect(newBounds?.width).toBeGreaterThan(initialBounds?.width || 0)
    })

    test('should persist layout changes after save', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Persist Layout Test')
      await dashboardPage.enableEditMode()
      
      // Add and position widgets
      await dashboardPage.addWidget('Metric Card', 'Widget A')
      await dashboardPage.addWidget('Metric Card', 'Widget B')
      
      // Move Widget B
      await dashboardPage.dragWidget('Widget B', 500, 200)
      
      // Save
      await dashboardPage.saveDashboard()
      
      // Get Widget B position
      const widgetB = dashboardPage.getWidget('Widget B')
      const savedPosition = await widgetB.boundingBox()
      
      // Reload
      await page.reload()
      
      // Position should be the same
      const reloadedPosition = await widgetB.boundingBox()
      expect(reloadedPosition?.x).toBeCloseTo(savedPosition?.x || 0, -1)
      expect(reloadedPosition?.y).toBeCloseTo(savedPosition?.y || 0, -1)
    })
  })

  test.describe('Widget Configuration', () => {
    test('should open widget config panel', async ({ dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Config Panel Test')
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Metric Card', 'Configurable Widget')
      
      // Click on widget to select
      const widget = dashboardPage.getWidget('Configurable Widget')
      await widget.click()
      
      // Config panel should appear
      await expect(dashboardPage.page.locator('[data-testid="widget-config"], .config-panel')).toBeVisible()
    })

    test('should update widget configuration', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Update Config Test')
      await dashboardPage.enableEditMode()
      
      // Add widget
      await dashboardPage.addWidget('Metric Card', 'Config Widget')
      
      // Open config
      const widget = dashboardPage.getWidget('Config Widget')
      await widget.click()
      
      // Update title in config
      const titleInput = page.getByLabel(/title|name/i)
      if (await titleInput.isVisible()) {
        await titleInput.clear()
        await titleInput.fill('Updated Title')
        await page.getByRole('button', { name: /apply|save/i }).click()
      }
      
      // Widget should reflect changes
      await expect(widget.getByText('Updated Title')).toBeVisible()
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should adapt layout on smaller screens', async ({ dashboardPage, page }) => {
      await dashboardPage.goto()
      await dashboardPage.createDashboard('Responsive Test')
      await dashboardPage.enableEditMode()
      
      // Add widgets
      await dashboardPage.addWidget('Metric Card', 'Widget 1')
      await dashboardPage.addWidget('Metric Card', 'Widget 2')
      
      // Save and exit edit mode
      await dashboardPage.saveDashboard()
      
      // Resize viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Widgets should still be visible
      await expect(dashboardPage.getWidget('Widget 1')).toBeVisible()
      await expect(dashboardPage.getWidget('Widget 2')).toBeVisible()
    })
  })
})
