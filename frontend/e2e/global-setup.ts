/**
 * Global Setup
 * Runs once before all tests to prepare authentication state
 */

import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth', 'user.json')

async function globalSetup(config: FullConfig) {
  // Ensure auth directory exists
  const authDir = path.dirname(authFile)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const { baseURL } = config.projects[0].use
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`)
    
    // Login with test credentials
    await page.getByLabel('Email').fill('admin@novasight.dev')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard', { timeout: 30000 })

    // Store authentication state
    await context.storageState({ path: authFile })

    console.log('✅ Global setup complete: Authentication state saved')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    
    // Create empty auth file to prevent test failures
    fs.writeFileSync(authFile, JSON.stringify({
      cookies: [],
      origins: []
    }))
    
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
