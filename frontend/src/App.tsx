import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { MarketingLayout } from '@/components/marketing/layout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import {
  HomePage,
  FeaturesPage,
  SolutionsPage,
  PricingPage,
  AboutPage,
  ContactPage,
} from '@/pages/marketing'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DagsListPage } from '@/pages/orchestration/DagsListPage'
import { DagBuilderPage } from '@/pages/orchestration/DagBuilderPage'
import { DagMonitorPage } from '@/pages/orchestration/DagMonitorPage'
import { ConnectionsPage } from '@/pages/connections/ConnectionsPage'
import { DataSourcesPage, DataSourceDetailPage } from '@/features/datasources'
import { 
  PySparkAppsListPage, 
  PySparkAppBuilderPage, 
  PySparkAppDetailPage 
} from '@/pages/pyspark'
import { SemanticModelsPage, ModelDetailPage } from '@/features/semantic'
import { DashboardsListPage, DashboardBuilderPage } from '@/features/dashboards'
import { QueryPage } from '@/features/query'
import { DocumentationPage } from '@/pages/documentation'
import { InfrastructureConfigPage } from '@/pages/admin'
import { SettingsPage } from '@/pages/settings'
import {
  PortalLayout,
  PortalOverviewPage,
  TenantManagementPage,
  UserManagementPage,
} from '@/pages/portal'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="novasight-theme">
      <AuthProvider>
        <Routes>
          {/* Marketing routes - Public */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          {/* Public routes - Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Data Sources */}
            <Route path="datasources" element={<DataSourcesPage />} />
            <Route path="datasources/:id" element={<DataSourceDetailPage />} />
            
            {/* Data Connections */}
            <Route path="connections" element={<ConnectionsPage />} />
            
            {/* Orchestration - DAGs */}
            <Route path="dags" element={<DagsListPage />} />
            <Route path="dags/new" element={<DagBuilderPage />} />
            <Route path="dags/:dagId/edit" element={<DagBuilderPage />} />
            <Route path="dags/:dagId/monitor" element={<DagMonitorPage />} />
            
            {/* PySpark Apps */}
            <Route path="pyspark" element={<PySparkAppsListPage />} />
            <Route path="pyspark/new" element={<PySparkAppBuilderPage />} />
            <Route path="pyspark/:id" element={<PySparkAppDetailPage />} />
            <Route path="pyspark/:id/edit" element={<PySparkAppBuilderPage />} />
            
            {/* Semantic Layer */}
            <Route path="semantic" element={<SemanticModelsPage />} />
            <Route path="semantic/models/:modelId" element={<ModelDetailPage />} />
            
            {/* Analytics Dashboards */}
            <Route path="dashboards" element={<DashboardsListPage />} />
            <Route path="dashboards/:dashboardId" element={<DashboardBuilderPage />} />
            
            {/* AI Query Interface */}
            <Route path="query" element={<QueryPage />} />
            
            {/* Admin Pages (legacy route) */}
            <Route path="admin/infrastructure" element={<InfrastructureConfigPage />} />
            
            {/* Portal Management (Super Admin) */}
            <Route path="portal" element={<PortalLayout />}>
              <Route index element={<PortalOverviewPage />} />
              <Route path="tenants" element={<TenantManagementPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="infrastructure" element={<InfrastructureConfigPage />} />
            </Route>
            
            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
            
            {/* Documentation */}
            <Route path="docs" element={<DocumentationPage />} />
          </Route>

          {/* Legacy routes - redirect to new /app prefix */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
