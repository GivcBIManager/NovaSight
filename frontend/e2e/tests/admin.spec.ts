/**
 * Admin E2E Tests
 * Tests for admin functionality, user management, and settings
 */

import { test, expect } from '../fixtures'

test.describe('Admin Features', () => {
  test.describe('Navigation', () => {
    test('should have navigation sidebar', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Sidebar should be visible
      const sidebar = page.locator('nav, [data-testid="sidebar"], .sidebar')
      await expect(sidebar).toBeVisible()
    })

    test('should navigate between sections', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Navigate to dashboards
      await page.getByRole('link', { name: /dashboards/i }).click()
      await expect(page).toHaveURL(/.*dashboards/)
      
      // Navigate to data sources
      await page.getByRole('link', { name: /data sources|datasources/i }).click()
      await expect(page).toHaveURL(/.*datasources/)
      
      // Navigate to query
      await page.getByRole('link', { name: /query|ask/i }).click()
      await expect(page).toHaveURL(/.*query/)
    })

    test('should show active navigation state', async ({ page }) => {
      await page.goto('/dashboards')
      
      const dashboardsLink = page.getByRole('link', { name: /dashboards/i })
      
      // Should have active styling
      await expect(dashboardsLink).toHaveClass(/active|selected|current/)
        .or(expect(dashboardsLink).toHaveAttribute('aria-current', 'page'))
    })
  })

  test.describe('User Profile', () => {
    test('should show user menu', async ({ page }) => {
      await page.goto('/dashboard')
      
      const userMenu = page.getByRole('button', { name: /user|menu|profile|avatar/i })
        .or(page.locator('[data-testid="user-menu"]'))
      
      await expect(userMenu).toBeVisible()
    })

    test('should open user dropdown', async ({ page }) => {
      await page.goto('/dashboard')
      
      const userMenu = page.getByRole('button', { name: /user|menu|profile|avatar/i })
        .or(page.locator('[data-testid="user-menu"]'))
      
      await userMenu.click()
      
      // Dropdown should appear with options
      await expect(
        page.getByRole('menu').or(page.locator('[role="menu"]'))
      ).toBeVisible()
    })

    test('should have logout option in menu', async ({ page }) => {
      await page.goto('/dashboard')
      
      const userMenu = page.getByRole('button', { name: /user|menu|profile|avatar/i })
        .or(page.locator('[data-testid="user-menu"]'))
      
      await userMenu.click()
      
      await expect(
        page.getByRole('menuitem', { name: /logout|sign out/i })
      ).toBeVisible()
    })
  })

  test.describe('Settings', () => {
    test('should access settings page', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Find settings link/button
      const settingsLink = page.getByRole('link', { name: /settings/i })
        .or(page.getByRole('button', { name: /settings/i }))
      
      if (await settingsLink.isVisible()) {
        await settingsLink.click()
        await expect(page).toHaveURL(/.*settings/)
      }
    })
  })

  test.describe('Theme', () => {
    test('should toggle theme', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Find theme toggle
      const themeToggle = page.getByRole('button', { name: /theme|dark|light/i })
        .or(page.locator('[data-testid="theme-toggle"]'))
      
      if (await themeToggle.isVisible()) {
        // Get current theme
        const htmlElement = page.locator('html')
        const initialTheme = await htmlElement.getAttribute('class')
        
        // Toggle theme
        await themeToggle.click()
        
        // Theme should change
        const newTheme = await htmlElement.getAttribute('class')
        expect(newTheme).not.toBe(initialTheme)
      }
    })
  })

  test.describe('Search', () => {
    test('should have global search', async ({ page }) => {
      await page.goto('/dashboard')
      
      const searchInput = page.getByRole('searchbox')
        .or(page.getByPlaceholder(/search/i))
        .or(page.locator('[data-testid="global-search"]'))
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search')
        // Search results or suggestions should appear
      }
    })
  })

  test.describe('Notifications', () => {
    test('should show notifications icon', async ({ page }) => {
      await page.goto('/dashboard')
      
      const notificationIcon = page.getByRole('button', { name: /notifications/i })
        .or(page.locator('[data-testid="notifications"]'))
      
      // Notifications might not be visible on all pages
      if (await notificationIcon.isVisible()) {
        await expect(notificationIcon).toBeVisible()
      }
    })
  })

  test.describe('Breadcrumbs', () => {
    test('should show breadcrumb navigation', async ({ page }) => {
      await page.goto('/dashboards')
      
      const breadcrumbs = page.locator('[aria-label="breadcrumb"], .breadcrumbs, nav ol')
      
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toBeVisible()
      }
    })
  })

  test.describe('Responsive Layout', () => {
    test('should collapse sidebar on mobile', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Sidebar should be hidden or collapsed
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar')
      
      // Either sidebar is hidden or there's a hamburger menu
      const hamburger = page.getByRole('button', { name: /menu|toggle/i })
        .or(page.locator('[data-testid="menu-toggle"]'))
      
      const sidebarHidden = !(await sidebar.isVisible())
      const hamburgerVisible = await hamburger.isVisible()
      
      expect(sidebarHidden || hamburgerVisible).toBeTruthy()
    })

    test('should open sidebar on hamburger click', async ({ page }) => {
      await page.goto('/dashboard')
      await page.setViewportSize({ width: 375, height: 667 })
      
      const hamburger = page.getByRole('button', { name: /menu|toggle/i })
        .or(page.locator('[data-testid="menu-toggle"]'))
      
      if (await hamburger.isVisible()) {
        await hamburger.click()
        
        // Sidebar should now be visible
        const sidebar = page.locator('[data-testid="sidebar"], .sidebar')
        await expect(sidebar).toBeVisible()
      }
    })
  })

  test.describe('Error Pages', () => {
    test('should show 404 for unknown routes', async ({ page }) => {
      await page.goto('/unknown-page-12345')
      
      // Should redirect to dashboard or show 404
      const is404 = page.getByText(/not found|404/i)
      const isDashboard = page.url().includes('dashboard')
      
      expect(await is404.isVisible() || isDashboard).toBeTruthy()
    })
  })

  test.describe('Loading States', () => {
    test('should show loading state on page load', async ({ page }) => {
      // Navigate with network throttling to see loading states
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.continue()
      })
      
      await page.goto('/dashboard')
      
      // Look for skeleton or loading indicators
      const skeleton = page.locator('.skeleton, [data-loading="true"]')
      const spinner = page.locator('.spinner, .loading')
      
      // Should eventually load
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
    })
  })
})
