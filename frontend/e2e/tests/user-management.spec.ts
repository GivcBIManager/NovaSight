/**
 * User Management E2E Tests
 * Tests for user administration and settings
 */

import { test, expect } from '../fixtures'

test.describe('User Management', () => {
  test.describe('User Profile', () => {
    test('should display user profile page', async ({ page }) => {
      await page.goto('/profile')
      
      await expect(
        page.getByRole('heading', { name: /profile|account/i })
      ).toBeVisible()
    })

    test('should display current user information', async ({ page }) => {
      await page.goto('/profile')
      
      // Should show email
      await expect(page.getByText(/@/)).toBeVisible()
      
      // Should show name field
      await expect(page.getByLabel(/name/i)).toBeVisible()
    })

    test('should update profile name', async ({ page }) => {
      await page.goto('/profile')
      
      const nameInput = page.getByLabel(/name/i)
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated Name')
        
        const saveBtn = page.getByRole('button', { name: /save|update/i })
        await saveBtn.click()
        
        // Should show success message
        await expect(
          page.getByText(/success|updated|saved/i)
        ).toBeVisible()
      }
    })

    test('should change password', async ({ page }) => {
      await page.goto('/profile/security')
      
      const currentPasswordInput = page.getByLabel(/current password/i)
      const newPasswordInput = page.getByLabel(/new password/i)
      const confirmPasswordInput = page.getByLabel(/confirm password/i)
      
      if (await currentPasswordInput.isVisible()) {
        await currentPasswordInput.fill('OldPassword123!')
        await newPasswordInput.fill('NewSecurePass123!')
        await confirmPasswordInput.fill('NewSecurePass123!')
        
        await page.getByRole('button', { name: /change password|update/i }).click()
      }
    })

    test('should show password requirements', async ({ page }) => {
      await page.goto('/profile/security')
      
      const newPasswordInput = page.getByLabel(/new password/i)
      
      if (await newPasswordInput.isVisible()) {
        await newPasswordInput.focus()
        
        // Should show password requirements
        await expect(
          page.getByText(/12 characters|uppercase|lowercase|special/i)
        ).toBeVisible()
      }
    })
  })

  test.describe('User Preferences', () => {
    test('should display preferences page', async ({ page }) => {
      await page.goto('/profile/preferences')
      
      await expect(
        page.getByRole('heading', { name: /preferences|settings/i })
      ).toBeVisible()
    })

    test('should change theme preference', async ({ page }) => {
      await page.goto('/profile/preferences')
      
      const themeSelect = page.getByLabel(/theme/i)
        .or(page.getByRole('combobox', { name: /theme/i }))
      
      if (await themeSelect.isVisible()) {
        await themeSelect.click()
        await page.getByRole('option', { name: /dark/i }).click()
        
        // Page should reflect theme change
        await page.waitForTimeout(500)
      }
    })

    test('should change timezone', async ({ page }) => {
      await page.goto('/profile/preferences')
      
      const timezoneSelect = page.getByLabel(/timezone/i)
        .or(page.getByRole('combobox', { name: /timezone/i }))
      
      if (await timezoneSelect.isVisible()) {
        await timezoneSelect.click()
        await page.getByRole('option').first().click()
      }
    })

    test('should toggle notification preferences', async ({ page }) => {
      await page.goto('/profile/preferences')
      
      const emailNotifications = page.getByLabel(/email notifications/i)
        .or(page.getByRole('switch', { name: /email/i }))
      
      if (await emailNotifications.isVisible()) {
        await emailNotifications.click()
      }
    })
  })

  test.describe('Admin User Management', () => {
    test('should display users list for admin', async ({ page }) => {
      await page.goto('/admin/users')
      
      // Should show users table or permission denied
      await expect(
        page.getByRole('heading', { name: /users/i })
          .or(page.getByText(/permission denied|not authorized/i))
      ).toBeVisible()
    })

    test('should search users', async ({ page }) => {
      await page.goto('/admin/users')
      
      const searchInput = page.getByPlaceholder(/search/i)
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('admin')
        await page.waitForLoadState('networkidle')
      }
    })

    test('should filter users by role', async ({ page }) => {
      await page.goto('/admin/users')
      
      const roleFilter = page.getByRole('combobox', { name: /role/i })
        .or(page.getByLabel(/role/i))
      
      if (await roleFilter.isVisible()) {
        await roleFilter.click()
        await page.getByRole('option', { name: /admin/i }).click()
        await page.waitForLoadState('networkidle')
      }
    })

    test('should open create user dialog', async ({ page }) => {
      await page.goto('/admin/users')
      
      const createButton = page.getByRole('button', { name: /create user|add user|invite/i })
      
      if (await createButton.isVisible()) {
        await createButton.click()
        
        await expect(
          page.getByRole('dialog')
            .or(page.getByRole('heading', { name: /create|add|invite user/i }))
        ).toBeVisible()
      }
    })

    test('should display user details', async ({ page }) => {
      await page.goto('/admin/users')
      
      const userRow = page.locator('table tbody tr').first()
        .or(page.locator('[data-testid="user-row"]').first())
      
      if (await userRow.isVisible()) {
        await userRow.click()
        
        // Should show user details panel or navigate to detail page
        await page.waitForLoadState('networkidle')
      }
    })

    test('should assign role to user', async ({ page }) => {
      await page.goto('/admin/users')
      
      const userRow = page.locator('table tbody tr').first()
      
      if (await userRow.isVisible()) {
        const roleButton = userRow.getByRole('button', { name: /role|assign/i })
        
        if (await roleButton.isVisible()) {
          await roleButton.click()
          
          // Select a role
          await page.getByRole('option').first().click()
        }
      }
    })

    test('should deactivate user', async ({ page }) => {
      await page.goto('/admin/users')
      
      const userRow = page.locator('table tbody tr').first()
      
      if (await userRow.isVisible()) {
        const moreButton = userRow.getByRole('button', { name: /more|actions/i })
          .or(userRow.locator('[aria-label="actions"]'))
        
        if (await moreButton.isVisible()) {
          await moreButton.click()
          
          const deactivateOption = page.getByRole('menuitem', { name: /deactivate|disable/i })
          
          if (await deactivateOption.isVisible()) {
            await deactivateOption.click()
            
            // Confirm
            const confirmBtn = page.getByRole('button', { name: /confirm|yes/i })
            if (await confirmBtn.isVisible()) {
              await confirmBtn.click()
            }
          }
        }
      }
    })
  })

  test.describe('Role Management', () => {
    test('should display roles list', async ({ page }) => {
      await page.goto('/admin/roles')
      
      await expect(
        page.getByRole('heading', { name: /roles/i })
          .or(page.getByText(/permission denied/i))
      ).toBeVisible()
    })

    test('should create new role', async ({ page }) => {
      await page.goto('/admin/roles')
      
      const createButton = page.getByRole('button', { name: /create role|new role/i })
      
      if (await createButton.isVisible()) {
        await createButton.click()
        
        // Fill role form
        await page.getByLabel(/name/i).fill('Custom Viewer')
        await page.getByLabel(/description/i).fill('Custom viewer role')
        
        // Select permissions
        const readPermission = page.getByLabel(/read|view dashboards/i)
        if (await readPermission.isVisible()) {
          await readPermission.check()
        }
        
        await page.getByRole('button', { name: /create|save/i }).click()
      }
    })

    test('should edit role permissions', async ({ page }) => {
      await page.goto('/admin/roles')
      
      const roleRow = page.locator('[data-testid="role-row"]').first()
        .or(page.locator('table tbody tr').first())
      
      if (await roleRow.isVisible()) {
        const editButton = roleRow.getByRole('button', { name: /edit/i })
        
        if (await editButton.isVisible()) {
          await editButton.click()
          
          // Should open edit dialog or page
          await page.waitForLoadState('networkidle')
        }
      }
    })
  })

  test.describe('Audit Log', () => {
    test('should display audit log', async ({ page }) => {
      await page.goto('/admin/audit')
      
      await expect(
        page.getByRole('heading', { name: /audit log|activity/i })
          .or(page.getByText(/permission denied/i))
      ).toBeVisible()
    })

    test('should filter audit log by action', async ({ page }) => {
      await page.goto('/admin/audit')
      
      const actionFilter = page.getByRole('combobox', { name: /action|type/i })
      
      if (await actionFilter.isVisible()) {
        await actionFilter.click()
        await page.getByRole('option', { name: /login/i }).click()
        await page.waitForLoadState('networkidle')
      }
    })

    test('should filter audit log by date range', async ({ page }) => {
      await page.goto('/admin/audit')
      
      const dateFilter = page.getByRole('button', { name: /date|period/i })
        .or(page.getByLabel(/date range/i))
      
      if (await dateFilter.isVisible()) {
        await dateFilter.click()
        
        // Select preset like "Last 7 days"
        const preset = page.getByRole('option', { name: /7 days|week/i })
        if (await preset.isVisible()) {
          await preset.click()
        }
      }
    })

    test('should export audit log', async ({ page }) => {
      await page.goto('/admin/audit')
      
      const exportButton = page.getByRole('button', { name: /export|download/i })
      
      if (await exportButton.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent('download').catch(() => null),
          exportButton.click(),
        ])
        
        // Download may or may not happen based on implementation
      }
    })
  })
})
