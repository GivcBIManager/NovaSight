/**
 * BentoFeatures Component
 * 
 * Asymmetric grid layout showcasing secondary features.
 * Each card is a GlassCard with hover effects.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Shield, Layers, Zap, FileCode, Users } from 'lucide-react';
import { IconBadge, SectionHeader } from '@/components/marketing/shared';
import { GlassCard } from '@/components/ui/glass-card';

export interface BentoFeaturesProps {
  /** Additional CSS classes */
  className?: string;
}

const features = [
  {
    id: 'security',
    title: 'Security & Isolation',
    description:
      'Enterprise-grade security with multi-tenant isolation, role-based access control, and end-to-end encryption.',
    icon: Shield,
    color: 'indigo' as const,
    span: 'default',
  },
  {
    id: 'semantic',
    title: 'Semantic Layer',
    description:
      'Define business metrics once, use everywhere. Consistent definitions across all reports and dashboards.',
    icon: Layers,
    color: 'purple' as const,
    span: 'default',
  },
  {
    id: 'performance',
    title: 'Blazing Performance',
    description:
      'Sub-second query response powered by ClickHouse. Smart caching and query optimization keep everything fast.',
    icon: Zap,
    color: 'cyan' as const,
    span: 'tall',
  },
  {
    id: 'templates',
    title: 'Template Engine',
    description:
      'Jumpstart with pre-built templates for common use cases. Customize and extend to fit your needs.',
    icon: FileCode,
    color: 'green' as const,
    span: 'default',
  },
  {
    id: 'governance',
    title: 'Data Governance',
    description:
      'Full lineage tracking, audit logs, and compliance tools. Know exactly where your data comes from.',
    icon: Users,
    color: 'pink' as const,
    span: 'default',
  },
];

const colorMap: Record<string, { icon: string; border: string; glow: string }> = {
  indigo: {
    icon: 'text-accent-indigo',
    border: 'hover:border-accent-indigo/40',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-accent-indigo)/0.15)]',
  },
  purple: {
    icon: 'text-accent-purple',
    border: 'hover:border-accent-purple/40',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-accent-purple)/0.15)]',
  },
  cyan: {
    icon: 'text-neon-cyan',
    border: 'hover:border-neon-cyan/40',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-cyan)/0.15)]',
  },
  green: {
    icon: 'text-neon-green',
    border: 'hover:border-neon-green/40',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-green)/0.15)]',
  },
  pink: {
    icon: 'text-neon-pink',
    border: 'hover:border-neon-pink/40',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-pink)/0.15)]',
  },
};

function FeatureCard({
  feature,
  index,
}: {
  feature: typeof features[0];
  index: number;
}) {
  const Icon = feature.icon;
  const colors = colorMap[feature.color];

  return (
    <motion.div
      className={cn(
        'group',
        feature.span === 'tall' && 'md:row-span-2'
      )}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <GlassCard
        variant="elevated"
        size="lg"
        className={cn(
          'h-full transition-all duration-base',
          colors.border,
          colors.glow
        )}
      >
        <div className="flex h-full flex-col">
          <IconBadge
            icon={<Icon className="h-6 w-6" />}
            color={feature.color}
            size="lg"
            glow
          />

          <h3 className="mt-4 text-xl font-semibold text-foreground">
            {feature.title}
          </h3>

          <p className="mt-2 flex-1 text-muted-foreground">
            {feature.description}
          </p>

          {/* Additional content for tall card */}
          {feature.span === 'tall' && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-bg-primary/50 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Average Query Time
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-neon-cyan">&lt;1</span>
                  <span className="text-lg text-muted-foreground">second</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-accent-purple"
                    initial={{ width: 0 }}
                    whileInView={{ width: '15%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-neon-cyan" />
                  <span>Columnar storage optimization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-neon-cyan" />
                  <span>Intelligent query caching</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-neon-cyan" />
                  <span>Parallel query execution</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function BentoFeatures({ className }: BentoFeaturesProps) {
  return (
    <section className={cn('py-20 md:py-28 lg:py-32', className)}>
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="Platform"
          title="Built for Enterprise Scale"
          titleHighlight="Enterprise Scale"
          subtitle="The foundation you need to build, deploy, and scale your data infrastructure with confidence."
          align="center"
          className="mb-16"
        />

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default BentoFeatures;
