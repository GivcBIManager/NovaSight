# Prompt 013 — SEO, Meta Tags & Performance Optimization

**Agent**: `@frontend`  
**Phase**: 4 — Polish  
**Dependencies**: 007 (all pages assembled)  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Implement comprehensive SEO metadata, Open Graph tags, structured data, and performance optimizations across all marketing pages to ensure maximum discoverability and fast load times.

---

## 📁 Files to Create

```
frontend/src/components/marketing/shared/SEOHead.tsx
frontend/src/hooks/useSEO.ts
frontend/src/data/seo-config.ts
frontend/public/robots.txt
frontend/public/sitemap.xml
frontend/public/manifest.json
```

## 📁 Files to Modify

```
frontend/index.html           → Base meta tags, fonts preload
frontend/src/pages/marketing/* → Add SEOHead to each page
```

---

## 📐 Detailed Specifications

### 1. SEOHead.tsx

**Purpose**: Declarative component for setting page-level SEO metadata.

```tsx
interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: object;    // JSON-LD
  noindex?: boolean;
}
```

Implementation:
- Use `document.title` and `<meta>` tag manipulation via `useEffect`
- Or use a lightweight library like `react-helmet-async` (add to deps)
- Set: `<title>`, `<meta name="description">`, `<meta name="keywords">`
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
- Twitter: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Canonical: `<link rel="canonical">`
- JSON-LD: `<script type="application/ld+json">`

### 2. seo-config.ts

Page-specific SEO data:

```typescript
export const seoConfig = {
  home: {
    title: 'NovaSight — AI-Powered Business Intelligence Platform',
    description: 'Transform raw data into actionable intelligence. Connect, transform, and visualize your data with NovaSight — the modern BI platform powered by AI, secured by design.',
    keywords: ['business intelligence', 'BI platform', 'data analytics', 'AI analytics', 'data visualization', 'self-service BI', 'multi-tenant'],
    ogImage: '/og/home.png',
  },
  features: {
    title: 'Features — NovaSight | Complete Data Analytics Platform',
    description: 'Explore NovaSight\'s full feature set: 20+ data connectors, visual pipeline builder, AI-powered queries, interactive dashboards, and enterprise security.',
    keywords: ['data connectors', 'ETL pipeline', 'dashboard builder', 'NL2SQL', 'AI queries'],
    ogImage: '/og/features.png',
  },
  solutions: {
    title: 'Solutions — NovaSight | Industry Data Solutions',
    description: 'See how NovaSight solves data challenges for financial services, healthcare, e-commerce, SaaS, and manufacturing industries.',
    ogImage: '/og/solutions.png',
  },
  pricing: {
    title: 'Pricing — NovaSight | Start Free, Scale as You Grow',
    description: 'Simple, transparent pricing. Free tier for small teams. Professional and Enterprise plans for growing organizations. No credit card required.',
    keywords: ['pricing', 'free BI tool', 'business intelligence pricing'],
    ogImage: '/og/pricing.png',
  },
  about: {
    title: 'About — NovaSight | Our Mission & Story',
    description: 'Built by engineers, for engineers. Learn about NovaSight\'s mission to democratize data analytics without compromising security.',
    ogImage: '/og/about.png',
  },
  contact: {
    title: 'Contact — NovaSight | Book a Demo or Get in Touch',
    description: 'Book a personalized demo, ask questions, or start your free trial. Our team responds within 24 hours.',
    ogImage: '/og/contact.png',
  },
};
```

### 3. Structured Data (JSON-LD)

**Homepage** — Organization + SoftwareApplication:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "NovaSight",
  "applicationCategory": "Business Intelligence",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "150"
  }
}
```

**Pricing** — Product with pricing tiers:
```json
{
  "@type": "Product",
  "name": "NovaSight",
  "offers": [
    { "@type": "Offer", "name": "Starter", "price": "0" },
    { "@type": "Offer", "name": "Professional", "price": "39" },
    { "@type": "Offer", "name": "Enterprise", "priceCurrency": "USD" }
  ]
}
```

**FAQ** — FAQPage schema for pricing FAQ section

### 4. Performance Optimizations

#### Font Loading
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

#### Image Optimization
- Create OG images (1200×630px) as static assets in `/public/og/`
- Use `<picture>` with WebP + PNG fallback where images are used
- Lazy load all images below the fold: `loading="lazy"`

#### Bundle Optimization
```typescript
// vite.config.ts additions
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'marketing': [
            './src/pages/marketing/HomePage.tsx',
            './src/pages/marketing/FeaturesPage.tsx',
            // ... all marketing pages
          ],
          'marketing-effects': [
            './src/components/marketing/effects/index.ts',
          ],
          'framer-motion': ['framer-motion'],
        },
      },
    },
  },
}
```

#### Core Web Vitals Targets
| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FCP (First Contentful Paint) | < 1.8s |
| TTI (Time to Interactive) | < 3.0s |

#### Implementation Checklist
- [ ] Preload critical fonts
- [ ] Preload hero section assets
- [ ] Lazy load below-fold sections with `React.lazy()`
- [ ] Add `will-change` only during active animations
- [ ] Use `content-visibility: auto` for off-screen sections
- [ ] Compress all static assets
- [ ] Enable Vite compression plugin for production build
- [ ] Set proper cache headers (fonts: 1 year, HTML: no-cache)

### 5. robots.txt

```
User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/
Disallow: /login
Disallow: /register

Sitemap: https://novasight.io/sitemap.xml
```

### 6. sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://novasight.io/</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://novasight.io/features</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://novasight.io/solutions</loc><priority>0.8</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://novasight.io/pricing</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://novasight.io/about</loc><priority>0.7</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://novasight.io/contact</loc><priority>0.8</priority><changefreq>monthly</changefreq></url>
</urlset>
```

### 7. manifest.json

```json
{
  "name": "NovaSight",
  "short_name": "NovaSight",
  "description": "AI-Powered Business Intelligence Platform",
  "theme_color": "#8b5cf6",
  "background_color": "#0a0a0f",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 🧪 Acceptance Criteria

- [ ] Each marketing page has unique title, description, and OG tags
- [ ] JSON-LD structured data renders correctly (validate with Google Rich Results Test)
- [ ] robots.txt blocks app/api routes, allows marketing routes
- [ ] sitemap.xml lists all marketing pages
- [ ] Fonts are preloaded (no FOUT/FOIT)
- [ ] Marketing bundle is code-split from app bundle
- [ ] Lighthouse Performance score ≥ 90
- [ ] Lighthouse SEO score ≥ 95
- [ ] All OG images are 1200×630px
- [ ] `manifest.json` is valid

---

*Prompt 013 — SEO & Performance v1.0*
