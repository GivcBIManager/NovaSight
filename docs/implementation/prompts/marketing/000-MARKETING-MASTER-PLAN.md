# NovaSight Marketing Pages — Master Implementation Plan

## 🎯 Objective

Build a world-class marketing website for NovaSight that communicates the platform's value proposition with a **futuristic, immersive, eye-catching design**. The marketing site lives as public (unauthenticated) routes alongside the existing SaaS application.

---

## 🎨 Design Vision

### Aesthetic: "AI-Native Data Intelligence"

| Principle | Description |
|-----------|-------------|
| **Dark-first glass morphism** | Continues the existing NovaSight design system |
| **Neon accent palette** | Indigo → Purple → Violet primary; Cyan/Pink/Green neon accents |
| **Neural network motifs** | Existing `<NeuralNetwork>`, `<ParticleField>`, `<GridBackground>` components |
| **Cinematic scroll animations** | Framer Motion orchestrated reveals, parallax, and stagger effects |
| **Glass cards & glow effects** | `<GlassCard>` with hover glow, `shadow-glow-*` tokens |
| **Micro-interactions** | Hover lifts, cursor-following gradients, magnetic buttons |
| **3D perspective transforms** | Tilting product screenshots, depth-layered hero elements |

### Design Tokens Reference

- Colors: `accent-indigo`, `accent-purple`, `accent-violet`, `neon-cyan`, `neon-pink`, `neon-green`
- Glass: `--glass-bg`, `--glass-border`, `--glass-blur`
- Gradients: `gradient-primary`, `gradient-neon`, `gradient-ai`, `gradient-glow`
- Shadows: `shadow-glow-sm/md/lg`, `shadow-glow-neon`, `shadow-glow-pink`
- Animations: `ai-pulse`, `gradient-flow`, `shimmer`, `float`, `fade-up`
- Typography: Inter (sans), JetBrains Mono (code)

---

## 📐 Architecture Decisions

### Routing Strategy

```
/                 → Marketing Home (Hero + Overview)
/features         → Features deep-dive
/solutions        → Industry solutions & use cases
/pricing          → Pricing tiers
/about            → About / Company
/contact          → Contact / Demo request
/blog             → Blog listing (future)
/login            → Existing auth
/register         → Existing auth
/dashboard        → Existing protected app
```

### Component Architecture

```
frontend/src/
├── pages/
│   └── marketing/
│       ├── HomePage.tsx
│       ├── FeaturesPage.tsx
│       ├── SolutionsPage.tsx
│       ├── PricingPage.tsx
│       ├── AboutPage.tsx
│       └── ContactPage.tsx
├── components/
│   └── marketing/
│       ├── layout/
│       │   ├── MarketingLayout.tsx       # Shared layout wrapper
│       │   ├── MarketingNavbar.tsx       # Transparent → solid on scroll
│       │   └── MarketingFooter.tsx       # Links, social, newsletter
│       ├── hero/
│       │   ├── HeroSection.tsx          # Main hero with 3D effects
│       │   ├── HeroParticles.tsx        # Custom particle config
│       │   └── AnimatedHeadline.tsx     # Typewriter / morphing text
│       ├── sections/
│       │   ├── FeatureShowcase.tsx      # Alternating feature rows
│       │   ├── MetricsCounter.tsx       # Animated counting numbers
│       │   ├── TestimonialsCarousel.tsx  # Client quotes slider
│       │   ├── TechStackVisual.tsx      # Interactive tech stack
│       │   ├── PricingCards.tsx         # Tier comparison
│       │   ├── CTASection.tsx           # Conversion call-to-action
│       │   ├── ComparisonTable.tsx      # vs competitors
│       │   ├── TimelineSection.tsx      # Roadmap / journey
│       │   └── FAQAccordion.tsx         # Expandable questions
│       ├── effects/
│       │   ├── GlowOrb.tsx             # Floating gradient orbs
│       │   ├── MagneticButton.tsx       # Cursor-aware button
│       │   ├── ParallaxLayer.tsx        # Scroll-based parallax
│       │   ├── TextReveal.tsx           # Scroll-triggered text
│       │   ├── TiltCard.tsx             # 3D perspective on hover
│       │   └── GradientBorder.tsx       # Animated gradient border
│       └── shared/
│           ├── SectionHeader.tsx        # Consistent section titles
│           ├── FeatureCard.tsx          # Reusable feature card
│           ├── LogoCloud.tsx            # Partner / integration logos
│           └── NewsletterForm.tsx       # Email capture
```

### Performance Requirements

- **Lighthouse Score**: ≥ 90 on all metrics
- **First Contentful Paint**: < 1.5s
- **Cumulative Layout Shift**: < 0.1
- **Lazy-load**: All below-fold sections
- **Image optimization**: WebP + AVIF with srcSet
- **Animation budget**: `will-change` only when animating, `prefers-reduced-motion` respected

---

## 📦 Prompt Files (Implementation Order)

| # | Prompt File | Agent | Description | Deps |
|---|------------|-------|-------------|------|
| 001 | `001-marketing-layout.md` | `@frontend` | Shared layout, navbar, footer | — |
| 002 | `002-marketing-effects.md` | `@frontend` | Reusable visual effects components | 001 |
| 003 | `003-marketing-shared.md` | `@frontend` | Shared section components | 001, 002 |
| 004 | `004-home-hero.md` | `@frontend` | Homepage hero section | 001–003 |
| 005 | `005-home-features.md` | `@frontend` | Homepage features showcase | 001–003 |
| 006 | `006-home-metrics-social.md` | `@frontend` | Metrics, testimonials, CTA | 001–003 |
| 007 | `007-home-assembly.md` | `@frontend` | Assemble full homepage + routing | 004–006 |
| 008 | `008-features-page.md` | `@frontend` | Detailed features page | 001–003 |
| 009 | `009-solutions-page.md` | `@frontend` | Industry solutions page | 001–003 |
| 010 | `010-pricing-page.md` | `@frontend` | Pricing tiers page | 001–003 |
| 011 | `011-about-page.md` | `@frontend` | About / company page | 001–003 |
| 012 | `012-contact-page.md` | `@frontend` | Contact / demo request page | 001–003 |
| 013 | `013-seo-performance.md` | `@frontend` | SEO meta, OG tags, performance | All |
| 014 | `014-responsive-polish.md` | `@frontend` | Mobile/tablet responsive pass | All |
| 015 | `015-accessibility-a11y.md` | `@frontend` | Accessibility audit & fixes | All |
| 016 | `016-marketing-tests.md` | `@testing` | Unit + E2E tests for marketing | All |

---

## 🔗 Integration Points

1. **Auth flow**: Marketing navbar "Sign In" / "Get Started" links to `/login` and `/register`
2. **Theme**: Reuses existing `ThemeProvider` and design tokens
3. **Router**: New public routes in `App.tsx` outside `<ProtectedRoute>`
4. **Shared UI**: Reuses `<Button>`, `<GlassCard>`, `<NeuralNetwork>`, etc.

---

## 🚀 Execution Order

```
Phase 1 (Foundation):     001 → 002 → 003
Phase 2 (Homepage):       004 → 005 → 006 → 007
Phase 3 (Inner Pages):    008, 009, 010, 011, 012 (parallel)
Phase 4 (Polish):         013 → 014 → 015
Phase 5 (Quality):        016
```

---

*Marketing Pages Master Plan v1.0 — NovaSight Project*
