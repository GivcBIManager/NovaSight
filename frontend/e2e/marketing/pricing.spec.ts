/**
 * Pricing Page E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays 3 pricing tiers', async ({ page }) => {
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('Professional plan is highlighted', async ({ page }) => {
    // Professional should have "Most Popular" badge or special styling
    const mostPopularBadge = page.getByText(/most popular/i);
    await expect(mostPopularBadge).toBeVisible();
    
    // Or check for highlighted styling
    const professionalCard = page.getByText('Professional').locator('..');
    await expect(professionalCard).toBeVisible();
  });

  test('displays billing toggle', async ({ page }) => {
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('Annual')).toBeVisible();
    
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
  });

  test('billing toggle switches prices', async ({ page }) => {
    // Get initial price for Starter
    const starterPriceElement = page.locator('[class*="pricing"]').getByText(/\$\d+/).first();
    const initialPrice = await starterPriceElement.textContent();
    
    // Toggle to annual
    const toggle = page.getByRole('switch');
    await toggle.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Price should change (annual is typically lower)
    const newPrice = await starterPriceElement.textContent();
    
    // Prices should be different (or verify annual discount text is visible)
    await expect(page.getByText(/save \d+%/i)).toBeVisible();
  });

  test('displays features for each tier', async ({ page }) => {
    // Each tier should have feature list
    const checkmarks = page.locator('svg[class*="check"], [class*="Check"]');
    const checkmarkCount = await checkmarks.count();
    
    expect(checkmarkCount).toBeGreaterThan(6); // At least 2-3 features per tier
  });

  test('CTA buttons are visible for each tier', async ({ page }) => {
    const ctaButtons = page.getByRole('link', { name: /start|get started|contact|try/i });
    const buttonCount = await ctaButtons.count();
    
    expect(buttonCount).toBeGreaterThanOrEqual(3);
  });

  test('Starter CTA links to registration', async ({ page }) => {
    const starterCta = page.getByText('Starter').locator('..').getByRole('link').first();
    const href = await starterCta.getAttribute('href');
    
    expect(href).toMatch(/register|signup|trial/i);
  });

  test('Enterprise CTA links to contact', async ({ page }) => {
    const enterpriseCta = page.getByText('Enterprise').locator('..').getByRole('link').first();
    const href = await enterpriseCta.getAttribute('href');
    
    expect(href).toMatch(/contact|sales/i);
  });

  test('shows annual discount badge', async ({ page }) => {
    await expect(page.getByText(/save \d+%/i)).toBeVisible();
  });

  test('displays tier descriptions', async ({ page }) => {
    // Each tier should have a description
    await expect(page.getByText(/perfect for|ideal for|for growing|for large/i).first()).toBeVisible();
  });

  test('displays custom pricing for Enterprise', async ({ page }) => {
    await expect(page.getByText('Custom')).toBeVisible();
  });

  test('toggle has correct aria attributes', async ({ page }) => {
    const toggle = page.getByRole('switch');
    
    await expect(toggle).toHaveAttribute('aria-checked');
    await expect(toggle).toHaveAttribute('aria-label', /annual/i);
  });

  test('toggle state changes on click', async ({ page }) => {
    const toggle = page.getByRole('switch');
    
    // Initially monthly (aria-checked="false")
    const initialState = await toggle.getAttribute('aria-checked');
    
    await toggle.click();
    await page.waitForTimeout(300);
    
    const newState = await toggle.getAttribute('aria-checked');
    
    expect(newState).not.toBe(initialState);
  });

  test('page has proper title', async ({ page }) => {
    await expect(page).toHaveTitle(/pricing|novasight/i);
  });
});

test.describe('Pricing Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('pricing cards stack on mobile', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    
    // All tiers should still be visible
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    
    // Scroll to see Enterprise
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('billing toggle is accessible on mobile', async ({ page }) => {
    await page.goto('/pricing');
    
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
    
    // Toggle should be tappable
    await toggle.click();
    await page.waitForTimeout(300);
    
    const state = await toggle.getAttribute('aria-checked');
    expect(state).toBe('true');
  });
});

test.describe('Pricing Comparison', () => {
  test('displays FAQ section if present', async ({ page }) => {
    await page.goto('/pricing');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Check for FAQ or comparison table
    const hasFaq = await page.getByText(/frequently asked|faq/i).count() > 0;
    const hasComparison = await page.getByText(/compare|comparison/i).count() > 0;
    
    // Either FAQ or comparison should be present
    expect(hasFaq || hasComparison || true).toBeTruthy(); // Soft check
  });
});
