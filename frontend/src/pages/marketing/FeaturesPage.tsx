/**
 * Marketing FeaturesPage
 * 
 * Features showcase page for NovaSight marketing site.
 * Placeholder to be expanded in Phase 2.
 */

import { motion } from 'framer-motion';
import { SEOHead } from '@/components/marketing/shared';
import { PageHeader } from '@/components/common';
import { Zap, Database, BarChart3, Bot, Shield, Workflow } from 'lucide-react';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

const features = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: 'AI-Powered Analytics',
    description: 'Natural language queries and intelligent insights powered by advanced AI models.',
  },
  {
    icon: <Database className="h-6 w-6" />,
    title: 'Unified Data Layer',
    description: 'Connect all your data sources in one semantic layer for consistent analysis.',
  },
  {
    icon: <Workflow className="h-6 w-6" />,
    title: 'Visual Orchestration',
    description: 'Build and manage data pipelines with our intuitive DAG builder.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Real-Time Dashboards',
    description: 'Create beautiful, interactive dashboards that update in real-time.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'PySpark Integration',
    description: 'Run distributed processing jobs with built-in Spark support.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with role-based access control and audit logging.',
  },
];

export function FeaturesPage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.features}
        canonical={getCanonicalUrl('/features')}
      />

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-32">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            accentTitle
            eyebrow="Features"
            title="Everything you need to master your data"
            description="A complete platform for data ingestion, transformation, analysis, and visualization."
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl border border-border bg-bg-secondary/50 p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default FeaturesPage;
