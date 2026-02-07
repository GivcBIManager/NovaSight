/**
 * PricingCards Component
 * 
 * Three-tier pricing cards with billing toggle.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';
import { MagneticButton } from '@/components/marketing/effects';

export interface PricingTier {
  /** Tier name */
  name: string;
  /** Monthly price (or null for custom) */
  monthlyPrice: number | null;
  /** Annual price (or null for custom) */
  annualPrice: number | null;
  /** Tier description */
  description: string;
  /** Feature list */
  features: string[];
  /** CTA text */
  cta: string;
  /** CTA link */
  ctaLink: string;
  /** Is this the highlighted tier? */
  highlighted?: boolean;
  /** Badge text (e.g., "Most Popular") */
  badge?: string;
}

export interface PricingCardsProps {
  /** Pricing tiers */
  tiers: PricingTier[];
  /** Billing period */
  billingPeriod: 'monthly' | 'annual';
  /** Callback when billing period changes */
  onBillingChange: (period: 'monthly' | 'annual') => void;
  /** Annual discount percentage */
  annualDiscount?: number;
  /** Additional CSS classes */
  className?: string;
}

export function PricingCards({
  tiers,
  billingPeriod,
  onBillingChange,
  annualDiscount = 20,
  className,
}: PricingCardsProps) {
  return (
    <div className={cn('space-y-10', className)}>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <span
          className={cn(
            'text-sm font-medium transition-colors',
            billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Monthly
        </span>
        <button
          onClick={() => onBillingChange(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
          className={cn(
            'relative h-7 w-14 rounded-full transition-colors',
            billingPeriod === 'annual' ? 'bg-accent-purple' : 'bg-muted'
          )}
          role="switch"
          aria-checked={billingPeriod === 'annual'}
          aria-label="Toggle annual billing"
        >
          <motion.div
            className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
            animate={{ left: billingPeriod === 'annual' ? 32 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span
          className={cn(
            'text-sm font-medium transition-colors',
            billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Annual
          <span className="ml-1 rounded-full bg-neon-green/20 px-2 py-0.5 text-xs text-neon-green">
            Save {annualDiscount}%
          </span>
        </span>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn(
              'relative flex flex-col rounded-2xl border p-8',
              tier.highlighted
                ? 'border-accent-purple bg-accent-purple/5 shadow-glow-md'
                : 'border-border bg-bg-secondary/50'
            )}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple px-3 py-1 text-xs font-medium text-white">
                  <Sparkles className="h-3 w-3" />
                  {tier.badge}
                </span>
              </div>
            )}

            {/* Tier name */}
            <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-1">
              {tier.monthlyPrice !== null ? (
                <>
                  <span className="text-4xl font-bold text-foreground">
                    ${billingPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </>
              ) : (
                <span className="text-4xl font-bold text-foreground">Custom</span>
              )}
            </div>

            {/* Description */}
            <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>

            {/* Features */}
            <ul className="mt-6 flex-1 space-y-3">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-8">
              <Link to={tier.ctaLink} className="block">
                <MagneticButton
                  variant={tier.highlighted ? 'gradient' : 'outline'}
                  size="lg"
                  glow={tier.highlighted}
                  className="w-full"
                >
                  {tier.cta}
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default PricingCards;
