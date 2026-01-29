/**
 * Playwright Test Fixtures
 * Extended fixtures with Page Objects for NovaSight E2E testing
 */

import { test as base, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { QueryPage } from './pages/QueryPage'
import { ConnectionsPage } from './pages/ConnectionsPage'

// Custom fixture types
type Fixtures = {
  loginPage: LoginPage
  dashboardPage: DashboardPage
  dataSourcesPage: DataSourcesPage
  queryPage: QueryPage
  connectionsPage: ConnectionsPage
}

// Extend base test with custom fixtures
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },

  dataSourcesPage: async ({ page }, use) => {
    await use(new DataSourcesPage(page))
  },

  queryPage: async ({ page }, use) => {
    await use(new QueryPage(page))
  },

  connectionsPage: async ({ page }, use) => {
    await use(new ConnectionsPage(page))
  },
})

export { expect }
