/**
 * Platform Admin Dashboard Page
 * 
 * Main dashboard for platform administrators to manage all tenants
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TenantsTable } from '../components/TenantsTable'
import { PlatformStats, TenantPlanBreakdown } from '../components/PlatformStats'
import { 
  Building2, 
  Activity, 
  AlertTriangle,
  TrendingUp 
} from 'lucide-react'
import api from '@/lib/api'

interface RecentActivity {
  id: string
  type: 'tenant_created' | 'user_created' | 'tenant_suspended' | 'quota_exceeded'
  description: string
  timestamp: string
}

export function PlatformAdminDashboard() {
  const { data: recentActivity } = useQuery<RecentActivity[]>({
    queryKey: ['platform-recent-activity'],
    queryFn: async () => {
      const response = await api.get<RecentActivity[]>('/admin/activity')
      return response.data
    },
  })

  const { data: alerts } = useQuery<{ count: number; items: any[] }>({
    queryKey: ['platform-alerts'],
    queryFn: async () => {
      const response = await api.get<{ count: number; items: any[] }>('/admin/alerts')
      return response.data
    },
  })

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Administration</h1>
          <p className="text-muted-foreground">
            Manage tenants, monitor usage, and configure platform settings.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <PlatformStats />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenants Section - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenants
              </CardTitle>
              <CardDescription>
                Manage all tenant organizations on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantsTable />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Plan Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TenantPlanBreakdown />
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alerts
                {alerts?.count ? (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                    {alerts.count}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts?.items?.length ? (
                <div className="space-y-3">
                  {alerts.items.slice(0, 5).map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded bg-muted/50"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No alerts at this time
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity?.length ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
