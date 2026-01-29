/**
 * Global Teardown
 * Cleanup after all tests complete
 */

import { FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth', 'user.json')

async function globalTeardown(_config: FullConfig) {
  // Clean up auth file
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile)
  }

  console.log('✅ Global teardown complete: Auth state cleaned up')
}

export default globalTeardown
