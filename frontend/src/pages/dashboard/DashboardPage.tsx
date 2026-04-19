/**
 * DashboardPage — primary landing view for authenticated users.
 *
 * UX hierarchy applied here:
 * 1. `PageHeader` establishes a single focal point (h1) with the "Ask AI"
 *    entry as a single *decorative* action — the AI quick-entry is the
 *    marketing / brand moment for this page.
 * 2. The Quick Actions card now has ONE primary CTA ("New Connection") — it
 *    is the foundational first step for a new user. Secondary actions use
 *    `outline`; the user's eye follows the reading path from title → metrics
 *    → primary action (left-to-right, top-to-bottom).
 * 3. Status colors (success / warning / danger) are used ONLY for state
 *    indicators, never for decoration. Run rows use one visual channel for
 *    status (icon + muted neutral bg) instead of three (border + bg-tint +
 *    icon) — reduces color redundancy and cognitive load.
 * 4. Section spacing uses `space-y-8` between major bands and `space-y-6`
 *    inside them — establishing a deliberate rhythm (Gestalt proximity).
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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

import { useAuth } from '@/contexts/AuthContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common';
import { GridBackground } from '@/components/backgrounds/GridBackground';
import { fadeVariants, staggerContainerVariants } from '@/lib/motion-variants';
import { cn } from '@/lib/utils';

type RunStatus = 'success' | 'running' | 'failed';

interface RunSummary {
  readonly dagId: string;
  readonly status: RunStatus;
  readonly duration: string;
  readonly completedAt: string;
}

const STATS = [
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
] as const;

const RECENT_RUNS: readonly RunSummary[] = [
  { dagId: 'sales_ingestion_daily', status: 'success', duration: '12m 34s', completedAt: '10 minutes ago' },
  { dagId: 'customer_sync', status: 'running', duration: '5m 22s', completedAt: 'In progress' },
  { dagId: 'inventory_refresh', status: 'success', duration: '8m 12s', completedAt: '1 hour ago' },
  { dagId: 'analytics_rollup', status: 'failed', duration: '3m 45s', completedAt: '2 hours ago' },
  { dagId: 'dbt_daily_transform', status: 'success', duration: '25m 18s', completedAt: '3 hours ago' },
];

const SERVICES = [
  { name: 'API Server', status: 'healthy', latency: '24ms' },
  { name: 'Database', status: 'healthy', latency: '12ms' },
  { name: 'Dagster', status: 'healthy', latency: '45ms' },
  { name: 'Spark Cluster', status: 'warning', latency: '120ms' },
] as const;

function RunStatusIcon({ status }: { status: RunStatus }): React.ReactElement | null {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" aria-label="Succeeded" />;
    case 'running':
      return <Clock className="h-4 w-4 animate-pulse text-info" aria-label="Running" />;
    case 'failed':
      return <AlertTriangle className="h-4 w-4 text-danger" aria-label="Failed" />;
    default:
      return null;
  }
}

export function DashboardPage(): React.ReactElement {
  const { user } = useAuth();

  return (
    <div className="relative min-h-full">
      <GridBackground showOrbs gridOpacity={0.02} />

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative space-y-8"
      >
        {/* Primary focal point: page title + a single decorative AI entry. */}
        <motion.div variants={fadeVariants}>
          <PageHeader
            title="Dashboard"
            description={
              user?.name
                ? `Welcome back, ${user.name}. Here's what's happening with your data platform.`
                : "Here's what's happening with your data platform."
            }
            actions={
              <Button variant="ai" asChild className="hidden sm:inline-flex">
                <Link to="/app/query">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ask AI
                </Link>
              </Button>
            }
          />
        </motion.div>

        {/* Metrics band — equal visual weight by design (comparison, not CTA). */}
        <motion.div variants={fadeVariants}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <MetricCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                trendPercent={stat.trendPercent}
                icon={stat.icon}
                iconColor={stat.iconColor}
                sparklineData={[...stat.sparklineData]}
                animated
              />
            ))}
          </div>
        </motion.div>

        {/* Content band. */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent runs: status conveyed by ONE visual channel (icon + label).
              Row backgrounds are neutral so the eye scans the list quickly
              without color noise. */}
          <motion.div variants={fadeVariants} className="lg:col-span-2">
            <DashboardWidget
              title="Recent DAG Runs"
              subtitle="Last 24 hours"
              icon={<Activity className="h-4 w-4" />}
              onRefresh={() => {
                // Refresh is a side-effect handled by the widget's own query.
              }}
            >
              <ul className="space-y-2">
                {RECENT_RUNS.map((run, index) => (
                  <motion.li
                    key={run.dagId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-border bg-card/40 p-3',
                      'transition-colors hover:bg-bg-tertiary/60',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RunStatusIcon status={run.status} />
                      <div>
                        <p className="font-medium text-foreground">{run.dagId}</p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {run.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{run.completedAt}</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        asChild
                      >
                        <Link to="/app/dags">
                          View Details <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </DashboardWidget>
          </motion.div>

          {/* Quick actions sidebar: ONE primary CTA wins the column. */}
          <motion.div variants={fadeVariants} className="space-y-6">
            <GlassCard variant="elevated">
              <GlassCardHeader>
                <GlassCardTitle className="text-base">Quick Actions</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-2">
                {/* Primary CTA — the recommended first step. */}
                <Button asChild className="w-full justify-start">
                  <Link to="/app/data-sources/new">
                    <Database className="mr-2 h-4 w-4" />
                    New Connection
                  </Link>
                </Button>
                {/* Secondary actions — neutral weight. */}
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/app/dags/new">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Create Pipeline
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/app/dashboards">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Build Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/app/query">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Run Analysis
                  </Link>
                </Button>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-base">System Health</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <ul className="space-y-3">
                  {SERVICES.map((service) => (
                    <li
                      key={service.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            'h-2 w-2 rounded-full',
                            service.status === 'healthy' ? 'bg-success' : 'bg-warning',
                          )}
                        />
                        <span className="text-sm text-foreground">{service.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {service.latency}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
