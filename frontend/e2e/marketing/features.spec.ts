/**
 * Features Page E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays feature sections', async ({ page }) => {
    // Should have multiple feature sections
    const sections = page.locator('section');
    const sectionCount = await sections.count();
    
    expect(sectionCount).toBeGreaterThan(1);
  });

  test('all feature sections render', async ({ page }) => {
    // Scroll through page to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Check for various feature keywords
    const hasAnalytics = await page.getByText(/analytics|insights/i).count() > 0;
    const hasData = await page.getByText(/data|database|warehouse/i).count() > 0;
    
    expect(hasAnalytics || hasData).toBeTruthy();
  });

  test('renders feature icons or illustrations', async ({ page }) => {
    // Features should have visual elements
    const svgIcons = page.locator('svg');
    const iconCount = await svgIcons.count();
    
    expect(iconCount).toBeGreaterThan(3);
  });

  test('feature descriptions are visible', async ({ page }) => {
    // Each feature should have descriptive text
    const paragraphs = page.locator('section p');
    const paragraphCount = await paragraphs.count();
    
    expect(paragraphCount).toBeGreaterThan(2);
  });

  test('CTA button is present', async ({ page }) => {
    // Page should have at least one CTA
    const cta = page.getByRole('link', { name: /get started|try|start/i });
    await expect(cta.first()).toBeVisible();
  });

  test('navigation to features from homepage works', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: 'Features' }).first().click();
    
    await expect(page).toHaveURL('/features');
  });

  test('page has proper title', async ({ page }) => {
    await expect(page).toHaveTitle(/features|novasight/i);
  });
});

test.describe('Features Page - Scrollspy', () => {
  test('scrollspy navigation is present if available', async ({ page }) => {
    await page.goto('/features');
    
    // Check for scrollspy or side navigation
    const sideNav = page.locator('[class*="scrollspy"], [class*="sidenav"], nav[class*="sticky"]');
    const hasSideNav = await sideNav.count() > 0;
    
    // This is optional - not all pages have scrollspy
    if (hasSideNav) {
      await expect(sideNav.first()).toBeVisible();
    }
  });

  test('scrollspy highlights active section on scroll', async ({ page }) => {
    await page.goto('/features');
    
    // Check for any scrollspy navigation
    const sideNav = page.locator('[class*="scrollspy"], nav[class*="sticky"]');
    const hasSideNav = await sideNav.count() > 0;
    
    if (hasSideNav) {
      // Scroll to different sections
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);
      
      // Check for active state (class with 'active' or special styling)
      const activeLink = sideNav.locator('[class*="active"], [aria-current="true"]');
      if (await activeLink.count() > 0) {
        await expect(activeLink.first()).toBeVisible();
      }
    }
  });

  test('clicking scrollspy link scrolls to section', async ({ page }) => {
    await page.goto('/features');
    
    // Check for anchor links
    const anchorLinks = page.locator('a[href^="#"]');
    const hasAnchorLinks = await anchorLinks.count() > 0;
    
    if (hasAnchorLinks) {
      const firstAnchor = anchorLinks.first();
      const href = await firstAnchor.getAttribute('href');
      
      if (href) {
        await firstAnchor.click();
        await page.waitForTimeout(500);
        
        // Check if target section is visible
        const targetId = href.substring(1);
        const targetSection = page.locator(`#${targetId}`);
        
        if (await targetSection.count() > 0) {
          await expect(targetSection).toBeVisible();
        }
      }
    }
  });
});

test.describe('Features Page - Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('features render correctly on mobile', async ({ page }) => {
    await page.goto('/features');
    
    // Heading should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Features should be readable
    const paragraphs = page.locator('section p');
    const firstParagraph = paragraphs.first();
    await expect(firstParagraph).toBeVisible();
  });

  test('no horizontal scroll on features page', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Features Page - Content', () => {
  test('displays data connection features', async ({ page }) => {
    await page.goto('/features');
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Should mention data connections or integrations
    const hasConnections = await page.getByText(/connect|integration|database/i).count() > 0;
    expect(hasConnections).toBeTruthy();
  });

  test('displays analytics features', async ({ page }) => {
    await page.goto('/features');
    await page.evaluate(() => window.scrollTo(0, 800));
    
    const hasAnalytics = await page.getByText(/analytics|dashboard|visualization/i).count() > 0;
    expect(hasAnalytics).toBeTruthy();
  });

  test('displays AI features', async ({ page }) => {
    await page.goto('/features');
    await page.evaluate(() => window.scrollTo(0, 1200));
    
    const hasAI = await page.getByText(/ai|artificial intelligence|machine learning|query generation/i).count() > 0;
    expect(hasAI).toBeTruthy();
  });

  test('displays security features', async ({ page }) => {
    await page.goto('/features');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    const hasSecurity = await page.getByText(/security|secure|encryption|compliance/i).count() > 0;
    expect(hasSecurity).toBeTruthy();
  });
});
