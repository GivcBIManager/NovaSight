/**
 * Marketing HomePage
 * 
 * Main landing page for NovaSight marketing site.
 * Composed of multiple sections with lazy loading for below-the-fold content.
 */

import * as React from 'react';
import { HeroSection } from '@/components/marketing/hero';
import { SectionDivider, SEOHead } from '@/components/marketing/shared';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

// Lazy load sections below the fold for better initial load performance
const HowItWorks = React.lazy(() =>
  import('@/components/marketing/sections/HowItWorks').then((m) => ({
    default: m.HowItWorks,
  }))
);

const FeatureShowcase = React.lazy(() =>
  import('@/components/marketing/sections/FeatureShowcase').then((m) => ({
    default: m.FeatureShowcase,
  }))
);

const BentoFeatures = React.lazy(() =>
  import('@/components/marketing/sections/BentoFeatures').then((m) => ({
    default: m.BentoFeatures,
  }))
);

const MetricsSection = React.lazy(() =>
  import('@/components/marketing/sections/MetricsSection').then((m) => ({
    default: m.MetricsSection,
  }))
);

const TechStackVisual = React.lazy(() =>
  import('@/components/marketing/sections/TechStackVisual').then((m) => ({
    default: m.TechStackVisual,
  }))
);

const TestimonialsCarousel = React.lazy(() =>
  import('@/components/marketing/sections/TestimonialsCarousel').then((m) => ({
    default: m.TestimonialsCarousel,
  }))
);

const ComparisonTable = React.lazy(() =>
  import('@/components/marketing/sections/ComparisonTable').then((m) => ({
    default: m.ComparisonTable,
  }))
);

const CTASection = React.lazy(() =>
  import('@/components/marketing/sections/CTASection').then((m) => ({
    default: m.CTASection,
  }))
);

// Loading fallback for lazy-loaded sections
function SectionLoading() {
  return (
    <div className="flex min-h-[300px] items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-purple/20 border-t-accent-purple" />
    </div>
  );
}

export function HomePage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.home}
        canonical={getCanonicalUrl('/')}
      />

      {/* Hero - loaded immediately */}
      <HeroSection />

      {/* Below-the-fold sections - lazy loaded */}
      <React.Suspense fallback={<SectionLoading />}>
        <SectionDivider variant="gradient" />
        <HowItWorks />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <SectionDivider variant="dots" />
        <FeatureShowcase />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <SectionDivider variant="gradient" />
        <BentoFeatures />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <SectionDivider variant="dots" />
        <MetricsSection />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <TechStackVisual />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <SectionDivider variant="gradient" />
        <TestimonialsCarousel />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <ComparisonTable />
      </React.Suspense>

      <React.Suspense fallback={<SectionLoading />}>
        <CTASection />
      </React.Suspense>
    </div>
  );
}

export default HomePage;
