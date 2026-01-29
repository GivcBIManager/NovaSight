/**
 * Platform Stats Component
 * 
 * Displays key platform metrics for administrators
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  Users, 
  HardDrive, 
  Activity
} from 'lucide-react'
import api from '@/lib/api'
import type { PlatformStatsData } from '../types'

interface StatCardProps {
  title: string
  value: string | number | undefined
  icon: React.ReactNode
  description?: string
  loading?: boolean
}

function StatCard({ title, value, icon, description, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold">{value ?? '—'}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlatformStats() {
  const { data: stats, isLoading } = useQuery<PlatformStatsData>({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const response = await api.get<PlatformStatsData>('/admin/stats')
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Tenants"
        value={stats?.tenants_count}
        icon={<Building2 className="h-6 w-6" />}
        description={stats ? `${stats.recent_signups} new this week` : undefined}
        loading={isLoading}
      />
      <StatCard
        title="Active Users"
        value={stats?.active_users}
        icon={<Users className="h-6 w-6" />}
        loading={isLoading}
      />
      <StatCard
        title="Total Storage"
        value={stats ? `${stats.total_storage_gb.toFixed(1)} GB` : undefined}
        icon={<HardDrive className="h-6 w-6" />}
        loading={isLoading}
      />
      <StatCard
        title="Queries Today"
        value={stats?.queries_today?.toLocaleString()}
        icon={<Activity className="h-6 w-6" />}
        loading={isLoading}
      />
    </div>
  )
}

export function TenantPlanBreakdown() {
  const { data: stats, isLoading } = useQuery<PlatformStatsData>({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const response = await api.get<PlatformStatsData>('/admin/stats')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  const plans = [
    { name: 'Starter', count: stats?.tenants_by_plan.starter ?? 0, color: 'bg-blue-500' },
    { name: 'Professional', count: stats?.tenants_by_plan.professional ?? 0, color: 'bg-purple-500' },
    { name: 'Enterprise', count: stats?.tenants_by_plan.enterprise ?? 0, color: 'bg-amber-500' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {plans.map(plan => (
        <Card key={plan.name}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${plan.color}`} />
              <span className="text-sm font-medium">{plan.name}</span>
            </div>
            <p className="text-2xl font-bold mt-2">{plan.count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
