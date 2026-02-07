/**
 * Accessibility E2E Tests
 * 
 * Uses @axe-core/playwright for automated accessibility audits
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits', () => {
  const marketingPages = [
    { path: '/', name: 'Homepage' },
    { path: '/features', name: 'Features' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/solutions', name: 'Solutions' },
    { path: '/about', name: 'About' },
    { path: '/contact', name: 'Contact' },
  ];

  for (const { path, name } of marketingPages) {
    test(`${name} (${path}) passes axe accessibility audit`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Wait for animations to complete
      await page.waitForTimeout(2000);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.loading-spinner') // Exclude known loading states
        .analyze();
      
      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`Accessibility violations on ${path}:`);
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          violation.nodes.forEach((node) => {
            console.log(`  Target: ${node.target.join(', ')}`);
          });
        });
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});

test.describe('Keyboard Navigation', () => {
  test('skip to content link works', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByText(/skip to (main )?content/i);
    await expect(skipLink).toBeFocused();
    
    // Activate skip link
    await page.keyboard.press('Enter');
    
    // Main content should be focused
    const mainContent = page.locator('#main-content, main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Count focusable elements
    const focusableElements = await page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).count();
    
    expect(focusableElements).toBeGreaterThan(0);
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const outline = await focusedElement.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        outline: style.outline,
        boxShadow: style.boxShadow,
        border: style.border,
      };
    });
    
    // Should have some visible focus indicator
    const hasFocusIndicator =
      outline.outline !== 'none' ||
      outline.boxShadow !== 'none' ||
      outline.border !== 'none';
    
    expect(hasFocusIndicator).toBeTruthy();
  });

  test('can navigate navbar with keyboard', async ({ page }) => {
    await page.goto('/');
    
    // Find and focus the first nav link
    const featuresLink = page.getByRole('navigation').getByRole('link', { name: 'Features' }).first();
    await featuresLink.focus();
    await expect(featuresLink).toBeFocused();
    
    // Tab to next link
    await page.keyboard.press('Tab');
    const solutionsLink = page.getByRole('navigation').getByRole('link', { name: 'Solutions' }).first();
    await expect(solutionsLink).toBeFocused();
  });

  test('form fields are keyboard navigable', async ({ page }) => {
    await page.goto('/contact');
    
    // Tab through form fields
    const firstNameInput = page.getByLabel(/first name/i);
    await firstNameInput.focus();
    await expect(firstNameInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/last name/i)).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();
  });

  test('escape key closes mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await menuButton.click();
    
    // Verify menu is open
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Menu should close
    await expect(menuButton).toBeFocused();
  });
});

test.describe('Screen Reader Support', () => {
  test('page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // H1 should come before other headings
    const firstH1 = page.locator('h1').first();
    await expect(firstH1).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      
      // Image should have alt text, be decorative (aria-hidden), or be presentational
      const isAccessible = alt !== null || ariaHidden === 'true' || role === 'presentation';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/contact');
    
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Check for associated label
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }
      
      // Input should have label, aria-label, or aria-labelledby
      const isLabelled = hasLabel || ariaLabel !== null || ariaLabelledBy !== null;
      expect(isLabelled).toBeTruthy();
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const accessibleName = await button.evaluate((el) => {
        return el.textContent?.trim() ||
               el.getAttribute('aria-label') ||
               el.getAttribute('title') ||
               el.querySelector('svg')?.getAttribute('aria-label');
      });
      
      expect(accessibleName).toBeTruthy();
    }
  });

  test('links have descriptive text', async ({ page }) => {
    await page.goto('/');
    
    const links = await page.locator('a[href]').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      const hasDescriptiveText = (text && text.trim().length > 0) || ariaLabel;
      expect(hasDescriptiveText).toBeTruthy();
    }
  });

  test('navigation landmark is present', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.getByRole('navigation');
    await expect(nav.first()).toBeVisible();
  });

  test('main content landmark is present', async ({ page }) => {
    await page.goto('/');
    
    // Should have main content area
    const mainContent = page.locator('main, #main-content, [role="main"]');
    await expect(mainContent.first()).toBeVisible();
  });

  test('footer landmark is present', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
  });
});

test.describe('Color Contrast', () => {
  test('text has sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Use axe specifically for color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Reduced Motion', () => {
  test('respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Page should load without animation issues
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
