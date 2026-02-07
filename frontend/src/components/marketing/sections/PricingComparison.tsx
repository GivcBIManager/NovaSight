/**
 * PricingComparison Component
 * 
 * Feature comparison table with expandable categories.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Minus, ChevronDown } from 'lucide-react';

export interface ComparisonFeature {
  /** Feature name */
  name: string;
  /** Tooltip/description (optional) */
  tooltip?: string;
  /** Value for each tier: true (check), false (minus), or string */
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

export interface ComparisonCategory {
  /** Category name */
  name: string;
  /** Features in this category */
  features: ComparisonFeature[];
}

export interface PricingComparisonProps {
  /** Comparison categories */
  categories: ComparisonCategory[];
  /** Additional CSS classes */
  className?: string;
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-foreground">{value}</span>;
  }
  if (value) {
    return <Check className="h-5 w-5 text-neon-green" />;
  }
  return <Minus className="h-5 w-5 text-muted-foreground/50" />;
}

function CategorySection({
  category,
  defaultExpanded = false,
}: {
  category: ComparisonCategory;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border-b border-border">
      {/* Category header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-muted/30"
        aria-expanded={isExpanded}
      >
        <span className="font-semibold text-foreground">{category.name}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Features */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {category.features.map((feature, index) => (
              <div
                key={feature.name}
                className={cn(
                  'grid grid-cols-4 gap-4 px-4 py-3',
                  index % 2 === 0 ? 'bg-bg-secondary/30' : 'bg-transparent'
                )}
              >
                <div className="col-span-1 text-sm text-muted-foreground">
                  {feature.name}
                </div>
                <div className="flex items-center justify-center">
                  <FeatureValue value={feature.starter} />
                </div>
                <div className="flex items-center justify-center">
                  <FeatureValue value={feature.professional} />
                </div>
                <div className="flex items-center justify-center">
                  <FeatureValue value={feature.enterprise} />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingComparison({ categories, className }: PricingComparisonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn('rounded-2xl border border-border bg-bg-secondary/50 overflow-hidden', className)}
    >
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 border-b border-border bg-muted/30 px-4 py-4">
        <div className="text-sm font-medium text-muted-foreground">Features</div>
        <div className="text-center text-sm font-medium text-foreground">Starter</div>
        <div className="text-center text-sm font-medium text-foreground">
          <span className="rounded-full bg-accent-purple/20 px-3 py-1 text-accent-purple">
            Professional
          </span>
        </div>
        <div className="text-center text-sm font-medium text-foreground">Enterprise</div>
      </div>

      {/* Categories */}
      {categories.map((category, index) => (
        <CategorySection
          key={category.name}
          category={category}
          defaultExpanded={index === 0}
        />
      ))}
    </motion.div>
  );
}

export default PricingComparison;
