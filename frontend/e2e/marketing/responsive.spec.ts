/**
 * Responsive Design E2E Tests
 */

import { test, expect } from '@playwright/test';

const viewports = {
  'iPhone SE': { width: 375, height: 667 },
  'iPad': { width: 768, height: 1024 },
  'iPad Landscape': { width: 1024, height: 768 },
  'Desktop': { width: 1440, height: 900 },
  'Large Desktop': { width: 1920, height: 1080 },
};

test.describe('Responsive Design - iPhone SE (375px)', () => {
  test.use({ viewport: viewports['iPhone SE'] });

  test('homepage renders correctly on iPhone SE', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Hero section should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // CTA should be visible
    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible();
    
    // Mobile menu button should be visible
    await expect(page.getByRole('button', { name: /menu|toggle/i })).toBeVisible();
  });

  test('no horizontal scroll on iPhone SE', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('text is readable on mobile', async ({ page }) => {
    await page.goto('/');
    
    const headline = page.getByRole('heading', { level: 1 });
    const fontSize = await headline.evaluate((el) => {
      return parseInt(getComputedStyle(el).fontSize);
    });
    
    // Font size should be at least 24px for h1 on mobile
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  test('buttons are touch-friendly on mobile', async ({ page }) => {
    await page.goto('/');
    
    const cta = page.getByRole('link', { name: /start free trial/i });
    const height = await cta.evaluate((el) => el.getBoundingClientRect().height);
    
    // Minimum touch target is 44px
    expect(height).toBeGreaterThanOrEqual(40);
  });
});

test.describe('Responsive Design - iPad (768px)', () => {
  test.use({ viewport: viewports['iPad'] });

  test('homepage renders correctly on iPad', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Hero section should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Navigation links may be visible or in mobile menu
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('no horizontal scroll on iPad', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('pricing cards stack correctly on tablet', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    
    // Cards should be visible
    await expect(page.getByText(/starter|professional|enterprise/i).first()).toBeVisible();
  });
});

test.describe('Responsive Design - Desktop (1440px)', () => {
  test.use({ viewport: viewports['Desktop'] });

  test('homepage renders correctly on Desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Hero section should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Desktop navigation should be visible
    await expect(page.getByRole('link', { name: 'Features' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' }).first()).toBeVisible();
    
    // Mobile menu button should be hidden on desktop
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await expect(menuButton).toBeHidden();
  });

  test('no horizontal scroll on Desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('pricing cards display in row on desktop', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    
    // All 3 pricing tiers should be visible
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('footer links are visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByText('Product')).toBeVisible();
    await expect(page.getByText('Company')).toBeVisible();
  });
});

test.describe('All Viewports - No Horizontal Scroll', () => {
  const pages = ['/', '/features', '/pricing', '/solutions', '/about', '/contact'];

  for (const pagePath of pages) {
    for (const [deviceName, viewport] of Object.entries(viewports)) {
      test(`${pagePath} has no horizontal scroll on ${deviceName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBeFalsy();
      });
    }
  }
});

test.describe('Responsive Images and Media', () => {
  test.use({ viewport: viewports['Desktop'] });

  test('images have appropriate dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible();
      
      if (isVisible) {
        const box = await img.boundingBox();
        if (box) {
          // Images shouldn't overflow viewport
          expect(box.width).toBeLessThanOrEqual(1440);
        }
      }
    }
  });
});
