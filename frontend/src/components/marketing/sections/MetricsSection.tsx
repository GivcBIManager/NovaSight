/**
 * MetricsSection Component
 * 
 * Grid of metric cards with animated count-up numbers.
 * Triggers animation when cards come into view.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Database, Shield, Users } from 'lucide-react';
import { CountUp } from '@/components/marketing/effects';
import { IconBadge, SectionHeader } from '@/components/marketing/shared';
import { GlassCard } from '@/components/ui/glass-card';

export interface MetricsSectionProps {
  /** Additional CSS classes */
  className?: string;
}

const metrics = [
  {
    value: 1,
    prefix: '<',
    suffix: 's',
    label: 'Query Latency',
    description: 'Average response time for complex queries',
    icon: Zap,
    color: 'cyan' as const,
  },
  {
    value: 20,
    suffix: '+',
    label: 'Data Connectors',
    description: 'Pre-built integrations ready to use',
    icon: Database,
    color: 'indigo' as const,
  },
  {
    value: 99.9,
    suffix: '%',
    label: 'Uptime SLA',
    description: 'Enterprise-grade reliability guaranteed',
    icon: Shield,
    color: 'green' as const,
    decimals: 1,
  },
  {
    value: 100,
    suffix: '+',
    label: 'Tenants Served',
    description: 'Organizations trusting our platform',
    icon: Users,
    color: 'purple' as const,
  },
];

const colorMap: Record<string, { border: string; text: string }> = {
  cyan: {
    border: 'border-t-neon-cyan',
    text: 'text-neon-cyan',
  },
  indigo: {
    border: 'border-t-accent-indigo',
    text: 'text-accent-indigo',
  },
  green: {
    border: 'border-t-neon-green',
    text: 'text-neon-green',
  },
  purple: {
    border: 'border-t-accent-purple',
    text: 'text-accent-purple',
  },
};

function MetricCard({
  metric,
  index,
}: {
  metric: typeof metrics[0];
  index: number;
}) {
  const Icon = metric.icon;
  const colors = colorMap[metric.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <GlassCard
        variant="default"
        size="lg"
        className={cn('h-full border-t-2', colors.border)}
      >
        <div className="flex flex-col items-center text-center">
          <IconBadge
            icon={<Icon className="h-6 w-6" />}
            color={metric.color}
            size="lg"
            glow
          />

          <div className={cn('mt-4 text-4xl font-bold lg:text-5xl', colors.text)}>
            <CountUp
              target={metric.value}
              prefix={metric.prefix}
              suffix={metric.suffix}
              decimals={metric.decimals || 0}
              duration={2}
            />
          </div>

          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {metric.label}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {metric.description}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function MetricsSection({ className }: MetricsSectionProps) {
  return (
    <section className={cn('py-20 md:py-28 lg:py-32', className)}>
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="By the Numbers"
          title="Performance You Can Count On"
          titleHighlight="Count On"
          subtitle="Metrics that matter for data-driven organizations."
          align="center"
          className="mb-16"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsSection;
