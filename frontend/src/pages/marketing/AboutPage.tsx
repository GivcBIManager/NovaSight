/**
 * Marketing AboutPage
 * 
 * About us page for NovaSight marketing site.
 * Placeholder to be expanded in Phase 2.
 */

import { SectionHeader, SEOHead } from '@/components/marketing/shared';
import { motion } from 'framer-motion';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

export function AboutPage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.about}
        canonical={getCanonicalUrl('/about')}
      />

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-32">
        <SectionHeader
          badge="About Us"
          title="Building the future of data analytics"
          titleHighlight="future of data"
          subtitle="We're on a mission to democratize data intelligence for every organization."
          align="center"
        />
      </section>

      {/* Story Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-invert mx-auto"
          >
            <p className="text-lg text-muted-foreground leading-relaxed">
              NovaSight was founded with a simple belief: everyone should be able to
              unlock the power of their data, regardless of technical expertise.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Our platform combines cutting-edge AI with intuitive design to make
              data analytics accessible, actionable, and impactful.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Placeholder for team, values, etc. */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-muted-foreground">
            Team profiles and company values coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
