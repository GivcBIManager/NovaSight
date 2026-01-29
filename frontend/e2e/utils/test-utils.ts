/**
 * E2E Test Utilities
 * Common utility functions for E2E tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page, 
  urlPattern: string | RegExp, 
  options?: { timeout?: number; status?: number }
) {
  return page.waitForResponse(
    resp => {
      const matches = typeof urlPattern === 'string' 
        ? resp.url().includes(urlPattern)
        : urlPattern.test(resp.url())
      const statusOk = options?.status 
        ? resp.status() === options.status 
        : resp.ok()
      return matches && statusOk
    },
    { timeout: options?.timeout || 30000 }
  )
}

/**
 * Mock API endpoint
 */
export async function mockApi(
  page: Page,
  urlPattern: string | RegExp,
  response: unknown,
  options?: { status?: number; delay?: number }
) {
  await page.route(urlPattern, async route => {
    if (options?.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }
    await route.fulfill({
      status: options?.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  })
}

/**
 * Wait for element to be stable (not moving/resizing)
 */
export async function waitForElementStable(
  page: Page, 
  selector: string, 
  timeout = 5000
) {
  const element = page.locator(selector)
  let previousBox = await element.boundingBox()
  
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(100)
    const currentBox = await element.boundingBox()
    
    if (
      previousBox &&
      currentBox &&
      previousBox.x === currentBox.x &&
      previousBox.y === currentBox.y &&
      previousBox.width === currentBox.width &&
      previousBox.height === currentBox.height
    ) {
      return true
    }
    previousBox = currentBox
  }
  
  throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`)
}

/**
 * Clear all test data (for cleanup)
 */
export async function clearTestData(page: Page, apiBase: string) {
  // This would be customized based on your API
  try {
    await page.request.delete(`${apiBase}/api/v1/test/cleanup`)
  } catch (e) {
    console.log('Test cleanup endpoint not available')
  }
}

/**
 * Login helper for tests that need fresh authentication
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/.*dashboard/)
}

/**
 * Assert toast/notification message
 */
export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page.locator('[role="alert"], .toast, [data-testid="toast"]')
  await expect(toast).toContainText(message)
}

/**
 * Dismiss all toasts/notifications
 */
export async function dismissToasts(page: Page) {
  const toasts = page.locator('[role="alert"] button, .toast-close')
  const count = await toasts.count()
  
  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click()
  }
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  })
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

/**
 * Wait for animations to complete
 */
export async function waitForAnimations(page: Page) {
  await page.waitForFunction(() => {
    return document.getAnimations().every(animation => animation.playState !== 'running')
  })
}
