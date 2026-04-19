/**
 * Marketing SolutionsPage
 * 
 * Solutions overview page for NovaSight marketing site.
 * Placeholder to be expanded in Phase 2.
 */

import { SEOHead } from '@/components/marketing/shared';
import { PageHeader } from '@/components/common';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

export function SolutionsPage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.solutions}
        canonical={getCanonicalUrl('/solutions')}
      />

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-32">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            accentTitle
            eyebrow="Solutions"
            title="Solutions for every team"
            description="Tailored solutions for startups, enterprises, and everything in between."
          />
        </div>
      </section>

      {/* Placeholder content */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-muted-foreground">
            Solutions page content coming soon. This will showcase industry-specific
            and team-specific solutions.
          </p>
        </div>
      </section>
    </div>
  );
}

export default SolutionsPage;
