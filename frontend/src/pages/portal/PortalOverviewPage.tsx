/**
 * Portal Overview Page
 * 
 * Dashboard with statistics for super admin portal management.
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { portalAdminService, type PortalStats } from '@/services/portalAdminService'
import { Building2, Users, Activity, Server, ArrowRight, Loader2 } from 'lucide-react'
import { getRoleClasses } from '@/lib/colors'

export const PortalOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await portalAdminService.getStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal Overview</h1>
        <p className="text-muted-foreground">
          Platform-wide statistics and quick access to management tools.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tenants.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.tenants.active ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.users.active ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.tenants.total
                ? Math.round((stats.tenants.active / stats.tenants.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tenant activity rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Configured services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Users by Tenant */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users by Tenant</CardTitle>
                <CardDescription>User distribution across organizations</CardDescription>
              </div>
              <Link
                to="/app/portal/tenants"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.users_by_tenant && stats.users_by_tenant.length > 0 ? (
              <div className="space-y-3">
                {stats.users_by_tenant.map((item) => (
                  <div key={item.slug} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.count}</span>
                      <span className="text-xs text-muted-foreground">users</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tenant data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users by Role</CardTitle>
                <CardDescription>Role distribution across platform</CardDescription>
              </div>
              <Link
                to="/app/portal/users"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.users_by_role && stats.users_by_role.length > 0 ? (
              <div className="space-y-3">
                {stats.users_by_role.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RoleBadge role={item.name} />
                      <div>
                        <p className="text-sm font-medium">{item.display_name}</p>
                        <p className="text-xs text-muted-foreground">{item.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.count}</span>
                      <span className="text-xs text-muted-foreground">users</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No role data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common portal management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              to="/app/portal/tenants"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Manage Tenants</p>
                <p className="text-xs text-muted-foreground">Create, edit, suspend organizations</p>
              </div>
            </Link>
            <Link
              to="/app/portal/users"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Manage Users</p>
                <p className="text-xs text-muted-foreground">View and manage all platform users</p>
              </div>
            </Link>
            <Link
              to="/app/portal/infrastructure"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <Server className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Infrastructure</p>
                <p className="text-xs text-muted-foreground">Configure server connections</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Role badge component
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${getRoleClasses(role)}`}>
      {role.charAt(0).toUpperCase()}
    </div>
  )
}
