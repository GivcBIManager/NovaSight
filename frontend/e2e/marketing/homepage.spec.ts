/**
 * Marketing Homepage E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Marketing Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads and displays hero section', async ({ page }) => {
    // Hero heading should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Primary CTA should be visible
    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible();
  });

  test('displays hero headline text', async ({ page }) => {
    const headline = page.getByRole('heading', { level: 1 });
    await expect(headline).toContainText(/transform/i);
  });

  test('displays secondary CTA', async ({ page }) => {
    await expect(page.getByRole('link', { name: /watch demo|see how it works/i })).toBeVisible();
  });

  test('navbar is visible', async ({ page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText('NovaSight')).toBeVisible();
  });

  test('navbar becomes frosted on scroll', async ({ page }) => {
    // Initial state - no frosted effect
    const header = page.locator('header').first();
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300); // Wait for scroll handler
    
    // Check for backdrop-blur class or style
    const hasBlur = await header.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.backdropFilter.includes('blur') || 
             el.className.includes('backdrop-blur') ||
             el.className.includes('bg-');
    });
    
    expect(hasBlur).toBeTruthy();
  });

  test('CTA navigates to registration', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: /start free trial/i });
    await ctaButton.click();
    
    await expect(page).toHaveURL(/\/register/);
  });

  test('page has skip to content link', async ({ page }) => {
    const skipLink = page.getByText(/skip to content/i);
    await expect(skipLink).toBeAttached();
  });

  test('logo links to home', async ({ page }) => {
    const logo = page.getByRole('link', { name: /novasight/i }).first();
    await expect(logo).toHaveAttribute('href', '/');
  });

  test('page loads all main sections', async ({ page }) => {
    // Scroll to bottom to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Check for various sections
    await expect(page.getByText(/how it works/i).first()).toBeVisible();
  });

  test('footer is visible after scrolling', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('page title is set correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/novasight/i);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
