/**
 * SEO Configuration
 * 
 * Centralized SEO metadata for all marketing pages.
 * Each page has pre-defined title, description, keywords, and Open Graph settings.
 */

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogType?: 'website' | 'article' | 'product';
  structuredData?: object;
}

export const seoConfig: Record<string, PageSEOConfig> = {
  home: {
    title: 'NovaSight — AI-Powered Business Intelligence Platform',
    description: 'Transform raw data into actionable intelligence with NovaSight. Connect 20+ data sources, build automated pipelines, and get AI-powered insights in seconds.',
    keywords: [
      'business intelligence',
      'BI platform',
      'data analytics',
      'AI analytics',
      'data visualization',
      'dashboard builder',
      'data pipeline',
      'self-service BI',
    ],
    ogImage: '/og/home.png',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'NovaSight',
      url: 'https://novasight.io',
      description: 'AI-Powered Business Intelligence Platform',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://novasight.io/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  },

  features: {
    title: 'Features — NovaSight | Complete Data Analytics Platform',
    description: 'Explore NovaSight\'s full feature set: AI-powered queries, 20+ data connectors, visual DAG builder, real-time dashboards, and enterprise-grade security.',
    keywords: [
      'data connectors',
      'AI query generation',
      'natural language SQL',
      'data pipeline builder',
      'DAG orchestration',
      'real-time dashboards',
      'semantic layer',
      'data modeling',
    ],
    ogImage: '/og/features.png',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'NovaSight Features',
      description: 'Complete feature set for modern data analytics',
      mainEntity: {
        '@type': 'SoftwareApplication',
        name: 'NovaSight',
        applicationCategory: 'Business Intelligence',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    },
  },

  solutions: {
    title: 'Solutions — NovaSight | Industry-Specific Data Analytics',
    description: 'Tailored analytics solutions for startups, enterprises, and specific industries. See how NovaSight adapts to your unique data challenges.',
    keywords: [
      'enterprise analytics',
      'startup BI',
      'industry solutions',
      'data analytics consulting',
      'custom analytics',
      'embedded analytics',
      'white-label BI',
    ],
    ogImage: '/og/solutions.png',
  },

  pricing: {
    title: 'Pricing — NovaSight | Transparent Plans for Every Team',
    description: 'Simple, transparent pricing. Start free with our Starter plan, scale to Pro for growing teams, or get custom Enterprise solutions.',
    keywords: [
      'BI pricing',
      'analytics pricing',
      'free BI tool',
      'enterprise pricing',
      'team analytics cost',
    ],
    ogImage: '/og/pricing.png',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'NovaSight Pricing',
      description: 'Transparent pricing plans',
      mainEntity: {
        '@type': 'Product',
        name: 'NovaSight',
        offers: [
          {
            '@type': 'Offer',
            name: 'Starter',
            price: '0',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            name: 'Pro',
            price: '99',
            priceCurrency: 'USD',
            billingDuration: 'P1M',
          },
          {
            '@type': 'Offer',
            name: 'Enterprise',
            price: 'Contact for pricing',
          },
        ],
      },
    },
  },

  about: {
    title: 'About Us — NovaSight | Our Mission & Team',
    description: 'Learn about NovaSight\'s mission to democratize data intelligence. Meet our team and discover our values driving innovation in analytics.',
    keywords: [
      'about NovaSight',
      'data analytics company',
      'BI startup',
      'analytics team',
      'company mission',
    ],
    ogImage: '/og/about.png',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'NovaSight',
      url: 'https://novasight.io',
      logo: 'https://novasight.io/logo.png',
      description: 'AI-Powered Business Intelligence Platform',
      sameAs: [
        'https://twitter.com/novasight',
        'https://linkedin.com/company/novasight',
        'https://github.com/novasight',
      ],
    },
  },

  contact: {
    title: 'Contact Us — NovaSight | Get in Touch',
    description: 'Have questions about NovaSight? Contact our team for sales inquiries, support, or partnership opportunities. We\'d love to hear from you.',
    keywords: [
      'contact NovaSight',
      'sales inquiry',
      'support',
      'partnership',
      'demo request',
    ],
    ogImage: '/og/contact.png',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact NovaSight',
      description: 'Get in touch with our team',
      mainEntity: {
        '@type': 'Organization',
        name: 'NovaSight',
        email: 'hello@novasight.io',
        telephone: '+1-555-123-4567',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'San Francisco',
          addressRegion: 'CA',
          addressCountry: 'US',
        },
      },
    },
  },
};

/**
 * Get SEO config for a specific page
 */
export function getPageSEO(page: keyof typeof seoConfig): PageSEOConfig {
  return seoConfig[page];
}

/**
 * Get canonical URL for a page
 */
export function getCanonicalUrl(path: string): string {
  const baseUrl = 'https://novasight.io';
  return `${baseUrl}${path}`;
}

export default seoConfig;
