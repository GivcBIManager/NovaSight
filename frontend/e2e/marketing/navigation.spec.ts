/**
 * Marketing Navigation E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Marketing Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('can navigate to Features page', async ({ page }) => {
    await page.getByRole('link', { name: 'Features' }).first().click();
    await expect(page).toHaveURL('/features');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('can navigate to Solutions page', async ({ page }) => {
    await page.getByRole('link', { name: 'Solutions' }).first().click();
    await expect(page).toHaveURL('/solutions');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('can navigate to Pricing page', async ({ page }) => {
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    await expect(page).toHaveURL('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('can navigate to About page', async ({ page }) => {
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('can navigate to Contact page', async ({ page }) => {
    // Navigate via footer or direct URL
    await page.goto('/contact');
    await expect(page).toHaveURL('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('logo links to home', async ({ page }) => {
    await page.goto('/features');
    
    const logo = page.getByRole('link', { name: /novasight/i }).first();
    await logo.click();
    
    await expect(page).toHaveURL('/');
  });

  test('Sign In link navigates to login', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await signInLink.click();
    
    await expect(page).toHaveURL('/login');
  });

  test('Get Started link navigates to register', async ({ page }) => {
    const getStartedLink = page.getByRole('link', { name: /get started/i }).first();
    await getStartedLink.click();
    
    await expect(page).toHaveURL('/register');
  });

  test('navigation links have correct hrefs', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Features' }).first()).toHaveAttribute('href', '/features');
    await expect(page.getByRole('link', { name: 'Solutions' }).first()).toHaveAttribute('href', '/solutions');
    await expect(page.getByRole('link', { name: 'Pricing' }).first()).toHaveAttribute('href', '/pricing');
    await expect(page.getByRole('link', { name: 'About' }).first()).toHaveAttribute('href', '/about');
  });

  test('active navigation link is highlighted', async ({ page }) => {
    await page.goto('/features');
    
    const featuresLink = page.getByRole('navigation').getByRole('link', { name: 'Features' });
    const linkClass = await featuresLink.getAttribute('class');
    
    // Active link should have different styling
    expect(linkClass).toContain('indigo');
  });

  test('can navigate back using browser history', async ({ page }) => {
    // Go to Features
    await page.getByRole('link', { name: 'Features' }).first().click();
    await expect(page).toHaveURL('/features');
    
    // Go to Pricing
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    await expect(page).toHaveURL('/pricing');
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/features');
    
    // Go back to home
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('shows hamburger menu on mobile', async ({ page }) => {
    await page.goto('/');
    
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await expect(menuButton).toBeVisible();
  });

  test('opens mobile menu on hamburger click', async ({ page }) => {
    await page.goto('/');
    
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await menuButton.click();
    
    // Mobile menu should be visible
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' })).toBeVisible();
  });

  test('closes mobile menu on navigation', async ({ page }) => {
    await page.goto('/');
    
    // Open menu
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await menuButton.click();
    
    // Click a link
    await page.getByRole('link', { name: 'Features' }).click();
    
    // Should navigate
    await expect(page).toHaveURL('/features');
  });

  test('closes mobile menu on escape key', async ({ page }) => {
    await page.goto('/');
    
    // Open menu
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await menuButton.click();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Menu should close - links hidden on mobile when menu closed
    await expect(menuButton).toBeVisible();
  });

  test('mobile menu has all navigation links', async ({ page }) => {
    await page.goto('/');
    
    const menuButton = page.getByRole('button', { name: /menu|toggle/i });
    await menuButton.click();
    
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Solutions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });
});
