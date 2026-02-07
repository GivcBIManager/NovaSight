/**
 * Marketing PricingPage
 * 
 * Pricing tiers page for NovaSight marketing site.
 * Placeholder to be expanded in Phase 2.
 */

import { motion } from 'framer-motion';
import { SectionHeader, SEOHead } from '@/components/marketing/shared';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for exploring NovaSight',
    features: [
      '5 data sources',
      '1 GB data processing/month',
      'Basic AI queries',
      'Community support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For growing teams',
    features: [
      'Unlimited data sources',
      '100 GB data processing/month',
      'Advanced AI analytics',
      'Priority support',
      'Team collaboration',
      'Custom dashboards',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Unlimited data processing',
      'Dedicated infrastructure',
      'SSO & SAML',
      'SLA guarantees',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingPage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.pricing}
        canonical={getCanonicalUrl('/pricing')}
      />

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-32">
        <SectionHeader
          badge="Pricing"
          title="Simple, transparent pricing"
          titleHighlight="transparent"
          subtitle="Start free and scale as you grow. No hidden fees."
          align="center"
        />
      </section>

      {/* Pricing Grid */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  'relative rounded-2xl border p-8',
                  plan.highlighted
                    ? 'border-accent-purple bg-accent-purple/5 shadow-glow-md'
                    : 'border-border bg-bg-secondary/50'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-accent-purple px-3 py-1 text-xs font-medium text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent-purple" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? 'gradient' : 'outline'}
                  className={cn('mt-8 w-full', plan.highlighted && 'shadow-glow-sm')}
                  asChild
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PricingPage;
