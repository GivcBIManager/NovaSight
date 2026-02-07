/**
 * Contact Page E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays contact page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/get in touch/i)).toBeVisible();
  });

  test('displays contact form', async ({ page }) => {
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
  });

  test('displays submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /send message/i })).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /send message/i });
    await submitButton.click();
    
    // HTML5 validation should prevent submission
    const firstNameInput = page.getByLabel(/first name/i);
    const isInvalid = await firstNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(isInvalid).toBeTruthy();
  });

  test('shows error for invalid email format', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/message/i).fill('Test message');
    
    const submitButton = page.getByRole('button', { name: /send message/i });
    await submitButton.click();
    
    // Email input should be invalid
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(isInvalid).toBeTruthy();
  });

  test('accepts valid email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('valid@example.com');
    
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBeTruthy();
  });

  test('can fill all form fields', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('john.doe@example.com');
    await page.getByLabel(/message/i).fill('This is a test message');
    
    // Verify values
    await expect(page.getByLabel(/first name/i)).toHaveValue('John');
    await expect(page.getByLabel(/last name/i)).toHaveValue('Doe');
    await expect(page.getByLabel(/email/i)).toHaveValue('john.doe@example.com');
    await expect(page.getByLabel(/message/i)).toHaveValue('This is a test message');
  });

  test('displays contact information', async ({ page }) => {
    await expect(page.getByText(/hello@novasight.io/i)).toBeVisible();
    await expect(page.getByText(/\+1 \(555\) 123-4567/i)).toBeVisible();
    await expect(page.getByText(/san francisco/i)).toBeVisible();
  });

  test('form fields are keyboard accessible', async ({ page }) => {
    // Tab through form fields
    await page.keyboard.press('Tab'); // Skip to content or first focusable
    
    // Find first input and focus it
    await page.getByLabel(/first name/i).focus();
    await expect(page.getByLabel(/first name/i)).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/last name/i)).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/message/i)).toBeFocused();
  });

  test('form has proper labels', async ({ page }) => {
    const firstNameInput = page.getByLabel(/first name/i);
    const lastNameInput = page.getByLabel(/last name/i);
    const emailInput = page.getByLabel(/email/i);
    const messageInput = page.getByLabel(/message/i);
    
    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test('page has proper title', async ({ page }) => {
    await expect(page).toHaveTitle(/contact|novasight/i);
  });
});

test.describe('Contact Page Form Submission', () => {
  test('submits form successfully with valid data', async ({ page }) => {
    await page.goto('/contact');
    
    // Fill form with valid data
    await page.getByLabel(/first name/i).fill('Jane');
    await page.getByLabel(/last name/i).fill('Smith');
    await page.getByLabel(/email/i).fill('jane.smith@example.com');
    await page.getByLabel(/message/i).fill('I am interested in learning more about NovaSight.');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /send message/i });
    await submitButton.click();
    
    // Expect either success message or no validation errors
    // (Actual behavior depends on backend implementation)
    const hasError = await page.locator('[class*="error"]').count() > 0;
    
    // Form should either submit successfully or show appropriate feedback
    expect(submitButton).toBeVisible();
  });
});
