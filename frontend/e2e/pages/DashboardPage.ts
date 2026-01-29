/**
 * Dashboard Page Object
 * Page object for dashboard pages (list and builder)
 */

import { Page, Locator, expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly newDashboardButton: Locator
  readonly dashboardGrid: Locator
  readonly editButton: Locator
  readonly saveButton: Locator
  readonly addWidgetButton: Locator
  readonly widgetGrid: Locator
  readonly dashboardTitle: Locator

  constructor(page: Page) {
    this.page = page
    this.newDashboardButton = page.getByRole('button', { name: /new dashboard|create dashboard/i })
    this.dashboardGrid = page.locator('.dashboard-list, [data-testid="dashboard-grid"]')
    this.editButton = page.getByRole('button', { name: /edit/i })
    this.saveButton = page.getByRole('button', { name: /save/i })
    this.addWidgetButton = page.getByRole('button', { name: /add widget/i })
    this.widgetGrid = page.locator('.react-grid-layout, .layout')
    this.dashboardTitle = page.locator('h1, [data-testid="dashboard-title"]')
  }

  /**
   * Navigate to dashboards list
   */
  async goto() {
    await this.page.goto('/dashboards')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to specific dashboard
   */
  async gotoDashboard(dashboardId: string) {
    await this.page.goto(`/dashboards/${dashboardId}`)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(name: string, description?: string) {
    await this.newDashboardButton.click()
    
    // Fill in the dialog
    await this.page.getByLabel(/name/i).fill(name)
    if (description) {
      await this.page.getByLabel(/description/i).fill(description)
    }
    
    await this.page.getByRole('button', { name: /create/i }).click()
    
    // Wait for dashboard to be created and opened
    await this.page.waitForURL(/\/dashboards\/[\w-]+/)
  }

  /**
   * Enable edit mode
   */
  async enableEditMode() {
    await this.editButton.click()
    // Wait for edit mode indicators
    await expect(this.saveButton).toBeVisible()
  }

  /**
   * Save dashboard changes
   */
  async saveDashboard() {
    await this.saveButton.click()
    // Wait for save to complete
    await this.page.waitForResponse(resp => 
      resp.url().includes('/dashboards/') && resp.status() === 200
    )
  }

  /**
   * Add a widget to the dashboard
   */
  async addWidget(widgetType: string, widgetName: string, config?: Record<string, unknown>) {
    await this.addWidgetButton.click()
    
    // Select widget type
    await this.page.getByRole('option', { name: new RegExp(widgetType, 'i') }).click()
    
    // Fill widget configuration
    await this.page.getByLabel(/widget name|name/i).fill(widgetName)
    
    // Apply additional config if provided
    if (config) {
      for (const [key, value] of Object.entries(config)) {
        const input = this.page.getByLabel(new RegExp(key, 'i'))
        if (await input.isVisible()) {
          await input.fill(String(value))
        }
      }
    }
    
    // Confirm widget creation
    await this.page.getByRole('button', { name: /add|create|confirm/i }).click()
    
    // Wait for widget to appear
    await expect(this.page.locator(`[data-widget-name="${widgetName}"]`)).toBeVisible({ timeout: 10000 })
  }

  /**
   * Get a widget by name
   */
  getWidget(widgetName: string): Locator {
    return this.page.locator(`[data-widget-name="${widgetName}"]`)
  }

  /**
   * Delete a widget
   */
  async deleteWidget(widgetName: string) {
    const widget = this.getWidget(widgetName)
    await widget.hover()
    
    // Click delete button on widget
    await widget.getByRole('button', { name: /delete|remove/i }).click()
    
    // Confirm deletion if dialog appears
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    await expect(widget).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * Drag widget to a new position
   */
  async dragWidget(widgetName: string, targetX: number, targetY: number) {
    const widget = this.getWidget(widgetName)
    const dragHandle = widget.locator('.widget-drag-handle, .react-grid-drag-handle')
    
    await dragHandle.dragTo(this.widgetGrid, {
      targetPosition: { x: targetX, y: targetY }
    })
  }

  /**
   * Resize a widget
   */
  async resizeWidget(widgetName: string, deltaX: number, deltaY: number) {
    const widget = this.getWidget(widgetName)
    const resizeHandle = widget.locator('.react-resizable-handle')
    
    const box = await resizeHandle.boundingBox()
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await this.page.mouse.down()
      await this.page.mouse.move(box.x + deltaX, box.y + deltaY)
      await this.page.mouse.up()
    }
  }

  /**
   * Get count of visible widgets
   */
  async getWidgetCount(): Promise<number> {
    const widgets = this.page.locator('[data-widget-name]')
    return await widgets.count()
  }

  /**
   * Assert dashboard has title
   */
  async expectTitle(title: string) {
    await expect(this.dashboardTitle).toContainText(title)
  }

  /**
   * Assert no widgets message is displayed
   */
  async expectNoWidgets() {
    await expect(this.page.getByText(/no widgets|empty|add your first widget/i)).toBeVisible()
  }
}
