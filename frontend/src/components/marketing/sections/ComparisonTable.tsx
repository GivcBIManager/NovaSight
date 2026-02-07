/**
 * ComparisonTable Component
 * 
 * Feature comparison table between NovaSight and alternatives.
 * NovaSight column is highlighted with animations.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X, Minus } from 'lucide-react';
import { SectionHeader } from '@/components/marketing/shared';

export interface ComparisonTableProps {
  /** Additional CSS classes */
  className?: string;
}

type FeatureValue = 'yes' | 'no' | 'partial';

interface Feature {
  name: string;
  novasight: FeatureValue;
  traditional: FeatureValue;
  custom: FeatureValue;
}

const features: Feature[] = [
  {
    name: 'Multi-tenant Architecture',
    novasight: 'yes',
    traditional: 'no',
    custom: 'partial',
  },
  {
    name: 'AI-Powered Query Generation',
    novasight: 'yes',
    traditional: 'no',
    custom: 'no',
  },
  {
    name: 'Real-time Data Sync',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'yes',
  },
  {
    name: 'Visual DAG Builder',
    novasight: 'yes',
    traditional: 'no',
    custom: 'partial',
  },
  {
    name: 'Sub-second Query Performance',
    novasight: 'yes',
    traditional: 'no',
    custom: 'partial',
  },
  {
    name: 'Semantic Layer',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'no',
  },
  {
    name: 'Built-in dbt Integration',
    novasight: 'yes',
    traditional: 'no',
    custom: 'partial',
  },
  {
    name: 'Self-hosted Option',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'yes',
  },
  {
    name: 'RBAC & Row-Level Security',
    novasight: 'yes',
    traditional: 'yes',
    custom: 'partial',
  },
  {
    name: 'White-label Embedding',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'yes',
  },
  {
    name: 'Time to Deploy',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'no',
  },
  {
    name: 'Total Cost of Ownership',
    novasight: 'yes',
    traditional: 'partial',
    custom: 'no',
  },
];

// Feature value icon component
function FeatureIcon({ value }: { value: FeatureValue }) {
  switch (value) {
    case 'yes':
      return (
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-neon-green/20 p-1">
            <Check className="h-4 w-4 text-neon-green" />
          </div>
        </div>
      );
    case 'no':
      return (
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-destructive/20 p-1">
            <X className="h-4 w-4 text-destructive" />
          </div>
        </div>
      );
    case 'partial':
      return (
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-yellow-500/20 p-1">
            <Minus className="h-4 w-4 text-yellow-500" />
          </div>
        </div>
      );
  }
}

export function ComparisonTable({ className }: ComparisonTableProps) {
  return (
    <section className={cn('py-20 md:py-28 lg:py-32', className)}>
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="Comparison"
          title="Why Teams Choose NovaSight"
          titleHighlight="Choose NovaSight"
          subtitle="See how we stack up against traditional BI tools and custom solutions."
          align="center"
          className="mb-16"
        />

        {/* Table container with horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            {/* Header */}
            <thead>
              <tr>
                <th className="p-4 text-left font-medium text-muted-foreground">
                  Feature
                </th>
                <th className="relative p-4 text-center">
                  {/* Highlighted header for NovaSight */}
                  <div className="absolute inset-0 -top-4 rounded-t-lg bg-gradient-primary opacity-10" />
                  <span className="relative z-10 font-semibold text-accent-purple">
                    NovaSight
                  </span>
                </th>
                <th className="p-4 text-center font-medium text-muted-foreground">
                  Traditional BI
                </th>
                <th className="p-4 text-center font-medium text-muted-foreground">
                  Custom Solution
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {features.map((feature, index) => (
                <motion.tr
                  key={feature.name}
                  className="border-t border-border"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="p-4 text-sm text-foreground md:text-base">
                    {feature.name}
                  </td>
                  <td className="relative p-4">
                    {/* Highlighted column background */}
                    <div className="absolute inset-0 bg-gradient-primary opacity-5" />
                    <div className="relative z-10">
                      <FeatureIcon value={feature.novasight} />
                    </div>
                  </td>
                  <td className="p-4">
                    <FeatureIcon value={feature.traditional} />
                  </td>
                  <td className="p-4">
                    <FeatureIcon value={feature.custom} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-neon-green/20 p-1">
              <Check className="h-3 w-3 text-neon-green" />
            </div>
            <span>Full Support</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-yellow-500/20 p-1">
              <Minus className="h-3 w-3 text-yellow-500" />
            </div>
            <span>Partial Support</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-destructive/20 p-1">
              <X className="h-3 w-3 text-destructive" />
            </div>
            <span>Not Available</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonTable;
