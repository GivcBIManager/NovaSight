/**
 * DashboardPage - Main dashboard view with metrics, charts, and activity feed
 * 
 * Uses the NovaSight design system with glass morphism, animations, and
 * AI-inspired aesthetics.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Database,
  GitBranch,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { GridBackground } from '@/components/backgrounds/GridBackground';
import { fadeVariants, staggerContainerVariants } from '@/lib/motion-variants';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      label: 'Data Connections',
      value: 8,
      trendPercent: 25,
      icon: Database,
      iconColor: 'indigo' as const,
      sparklineData: [4, 5, 6, 5, 7, 6, 8],
    },
    {
      label: 'Active DAGs',
      value: 12,
      trendPercent: 10,
      icon: GitBranch,
      iconColor: 'green' as const,
      sparklineData: [10, 11, 10, 12, 11, 12, 12],
    },
    {
      label: 'Jobs Today',
      value: 47,
      trendPercent: 15,
      icon: Activity,
      iconColor: 'purple' as const,
      sparklineData: [30, 35, 42, 38, 45, 43, 47],
    },
    {
      label: 'Alerts',
      value: 2,
      trendPercent: -50,
      icon: AlertTriangle,
      iconColor: 'pink' as const,
      sparklineData: [5, 4, 3, 4, 2, 3, 2],
    },
  ];

  const recentRuns = [
    {
      dagId: 'sales_ingestion_daily',
      status: 'success',
      duration: '12m 34s',
      completedAt: '10 minutes ago',
    },
    {
      dagId: 'customer_sync',
      status: 'running',
      duration: '5m 22s',
      completedAt: 'In progress',
    },
    {
      dagId: 'inventory_refresh',
      status: 'success',
      duration: '8m 12s',
      completedAt: '1 hour ago',
    },
    {
      dagId: 'analytics_rollup',
      status: 'failed',
      duration: '3m 45s',
      completedAt: '2 hours ago',
    },
    {
      dagId: 'dbt_daily_transform',
      status: 'success',
      duration: '25m 18s',
      completedAt: '3 hours ago',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-neon-green" />;
      case 'running':
        return <Clock className="h-4 w-4 text-accent-indigo animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-neon-green/30 bg-neon-green/5';
      case 'running':
        return 'border-accent-indigo/30 bg-accent-indigo/5';
      case 'failed':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-border';
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <GridBackground showOrbs gridOpacity={0.02} />

      {/* Content */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative space-y-6 p-6"
      >
        {/* Welcome Header */}
        <motion.div variants={fadeVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}. Here's what's happening with your data platform.
            </p>
          </div>

          {/* AI Assistant Quick Access */}
          <Button variant="ai" className="hidden sm:flex">
            <Sparkles className="mr-2 h-4 w-4" />
            Ask AI
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeVariants}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <MetricCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                trendPercent={stat.trendPercent}
                icon={stat.icon}
                iconColor={stat.iconColor}
                sparklineData={stat.sparklineData}
                animated
              />
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Runs - 2 columns */}
          <motion.div variants={fadeVariants} className="lg:col-span-2">
            <DashboardWidget
              title="Recent DAG Runs"
              subtitle="Last 24 hours"
              icon={<Activity className="h-4 w-4" />}
              onRefresh={() => console.log('Refresh runs')}
            >
              <div className="space-y-3">
                {recentRuns.map((run, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3',
                      'transition-colors hover:bg-bg-tertiary/50',
                      getStatusClass(run.status)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <p className="font-medium">{run.dagId}</p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {run.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{run.completedAt}</p>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                        View Details <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </DashboardWidget>
          </motion.div>

          {/* Quick Actions - 1 column */}
          <motion.div variants={fadeVariants} className="space-y-6">
            {/* Quick Actions Card */}
            <GlassCard variant="elevated">
              <GlassCardHeader>
                <GlassCardTitle className="text-base">Quick Actions</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-2">
                <Button variant="gradient-outline" className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  New Connection
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Create Pipeline
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Build Dashboard
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </GlassCardContent>
            </GlassCard>

            {/* System Health Card */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-base">System Health</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  {[
                    { name: 'API Server', status: 'healthy', latency: '24ms' },
                    { name: 'Database', status: 'healthy', latency: '12ms' },
                    { name: 'Airflow', status: 'healthy', latency: '45ms' },
                    { name: 'Spark Cluster', status: 'warning', latency: '120ms' },
                  ].map((service) => (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            service.status === 'healthy' ? 'bg-neon-green' : 'bg-orange-500'
                          )}
                        />
                        <span className="text-sm">{service.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{service.latency}</span>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
