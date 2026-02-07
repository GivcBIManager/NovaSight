# Prompt 010 — Pricing Page

**Agent**: `@frontend`  
**Phase**: 3 — Inner Pages  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build a clear, persuasive pricing page with tiered plans, feature comparison, and FAQ. The design should minimize friction and guide prospects toward the right plan.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/PricingPage.tsx
frontend/src/components/marketing/sections/PricingCards.tsx
frontend/src/components/marketing/sections/PricingComparison.tsx
frontend/src/components/marketing/sections/FAQAccordion.tsx
```

---

## 📐 Page Structure

```
1. Hero Banner
   "Simple, Transparent Pricing"
   "Start free. Scale as you grow."
   [Monthly / Annual toggle — save 20%]

2. Pricing Cards (3 tiers)
   [Starter] [Professional ★] [Enterprise]

3. Feature Comparison Table
   Detailed feature-by-feature breakdown

4. FAQ Section
   Common pricing questions

5. CTA Section
   "Not sure which plan? Talk to our team"
```

---

## 📐 Detailed Specifications

### Billing Toggle

```tsx
interface BillingToggleProps {
  period: 'monthly' | 'annual';
  onChange: (period: 'monthly' | 'annual') => void;
}
```

- Pill-shaped toggle with two options
- Active option: Gradient background
- "Save 20%" badge next to Annual option
- Animated price transition when toggling

### Pricing Tiers

```typescript
const pricingTiers = [
  {
    name: 'Starter',
    description: 'For small teams getting started with data analytics',
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: 'Free',
    highlight: false,
    cta: 'Get Started Free',
    ctaVariant: 'outline',
    features: [
      { text: 'Up to 3 users', included: true },
      { text: '5 data connections', included: true },
      { text: '10 dashboards', included: true },
      { text: 'Community support', included: true },
      { text: '1GB data storage', included: true },
      { text: 'Basic connectors', included: true },
      { text: 'AI queries', included: false, limit: '50/month' },
      { text: 'Custom pipelines', included: false },
      { text: 'SSO / SAML', included: false },
      { text: 'SLA guarantee', included: false },
    ],
  },
  {
    name: 'Professional',
    description: 'For growing teams that need full platform capabilities',
    monthlyPrice: 49,
    annualPrice: 39,
    priceLabel: null,  // show actual price
    highlight: true,   // ← RECOMMENDED plan
    badge: 'Most Popular',
    cta: 'Start Free Trial',
    ctaVariant: 'gradient',
    features: [
      { text: 'Up to 25 users', included: true },
      { text: 'Unlimited connections', included: true },
      { text: 'Unlimited dashboards', included: true },
      { text: 'Priority email support', included: true },
      { text: '50GB data storage', included: true },
      { text: 'All connectors', included: true },
      { text: 'Unlimited AI queries', included: true },
      { text: 'Custom pipelines', included: true },
      { text: 'SSO / SAML', included: false },
      { text: 'SLA guarantee', included: false },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced security & scale needs',
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: 'Custom',
    highlight: false,
    cta: 'Contact Sales',
    ctaVariant: 'outline',
    features: [
      { text: 'Unlimited users', included: true },
      { text: 'Unlimited connections', included: true },
      { text: 'Unlimited dashboards', included: true },
      { text: 'Dedicated support + SLA', included: true },
      { text: 'Unlimited storage', included: true },
      { text: 'All connectors + custom', included: true },
      { text: 'Unlimited AI queries', included: true },
      { text: 'Custom pipelines', included: true },
      { text: 'SSO / SAML', included: true },
      { text: '99.99% SLA guarantee', included: true },
    ],
    extras: [
      'Custom deployment options',
      'Dedicated infrastructure',
      'Professional services',
      'Custom integrations',
    ],
  },
];
```

### PricingCards.tsx Visual Design

```
┌─────────────┐  ┌─── ★ MOST POPULAR ────┐  ┌─────────────┐
│   Starter   │  │    Professional        │  │  Enterprise  │
│             │  │                        │  │              │
│   Free      │  │   $39/mo              │  │   Custom     │
│             │  │   billed annually      │  │              │
│  For small  │  │   For growing teams    │  │  For orgs    │
│  teams      │  │                        │  │  at scale    │
│             │  │                        │  │              │
│  ✓ 3 users  │  │  ✓ 25 users           │  │  ✓ Unlimited │
│  ✓ 5 conn   │  │  ✓ Unlimited conn     │  │  ✓ Unlimited │
│  ✓ 10 dash  │  │  ✓ Unlimited dash     │  │  ✓ Unlimited │
│  ✓ Community│  │  ✓ Priority support   │  │  ✓ Dedicated │
│  ✗ AI       │  │  ✓ Unlimited AI       │  │  ✓ SSO/SAML  │
│  ✗ SSO      │  │  ✗ SSO/SAML           │  │  ✓ SLA       │
│             │  │                        │  │              │
│ [Get Free]  │  │ [Start Free Trial →]  │  │ [Contact →]  │
│             │  │                        │  │              │
└─────────────┘  └────────────────────────┘  └──────────────┘
```

#### Highlighted Plan (Professional)
- `<GradientBorder>` with animated gradient
- Slightly taller (`scale-105` or negative margin-top)
- "Most Popular" badge: Gradient pill at top
- CTA: `<MagneticButton variant="gradient">` with glow
- Subtle background: `bg-accent-purple/5`

#### Standard Plans (Starter, Enterprise)
- `<GlassCard>` base
- Standard border
- CTAs: `variant="outline"`

#### Pricing Animation
- Price numbers animate with `<CountUp>` on page load
- Price transition on billing toggle: Number morphs with spring physics
- Cards stagger in on scroll
- Feature checkmarks pop in sequentially

#### Included/Excluded Features
- ✓ Included: Green checkmark icon + normal text
- ✗ Excluded: Muted X icon + `text-muted-foreground line-through`
- Limited: Orange partial icon + limit text

### PricingComparison.tsx

Full feature comparison table:

```
┌──────────────────────┬──────────┬──────────────┬────────────┐
│ Feature              │ Starter  │ Professional │ Enterprise │
├──────────────────────┼──────────┼──────────────┼────────────┤
│ USERS & ACCESS       │          │              │            │
│ Team members         │ 3        │ 25           │ Unlimited  │
│ Role-based access    │ Basic    │ Advanced     │ Custom     │
│ SSO / SAML           │ ✗        │ ✗            │ ✓          │
├──────────────────────┼──────────┼──────────────┼────────────┤
│ DATA CONNECTIONS     │          │              │            │
│ Database connectors  │ 5        │ Unlimited    │ Unlimited  │
│ API connectors       │ ✗        │ ✓            │ ✓ + Custom │
│ Schema introspection │ ✓        │ ✓            │ ✓          │
├──────────────────────┼──────────┼──────────────┼────────────┤
│ ... more categories  │          │              │            │
└──────────────────────┴──────────┴──────────────┴────────────┘
```

- Grouped by category with section headers
- Professional column highlighted
- Sticky header row on scroll
- Collapsible categories on mobile
- Expandable on mobile (accordion-style)

### FAQAccordion.tsx

```tsx
const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle. Downgrades will preserve your data."
  },
  {
    question: "What happens when I exceed my plan limits?",
    answer: "We'll notify you before you hit limits. You can upgrade seamlessly, or we'll work with you on a custom solution. We never delete your data."
  },
  {
    question: "Is there a free trial for Professional?",
    answer: "Yes! The Professional plan includes a 14-day free trial with full access to all features. No credit card required to start."
  },
  {
    question: "How does multi-tenant pricing work?",
    answer: "Each tenant is an isolated workspace. The user count applies per tenant. Contact us for multi-tenant volume pricing."
  },
  {
    question: "Can I self-host NovaSight?",
    answer: "Enterprise plans include self-hosted deployment options with our Kubernetes Helm charts. We provide full deployment support."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, Amex), wire transfers for Enterprise plans, and annual invoicing."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use AES-256 encryption at rest, TLS 1.3 in transit, and our Template Engine Rule ensures no arbitrary code execution. Enterprise plans include SOC2 compliance."
  },
  {
    question: "What kind of support do you offer?",
    answer: "Starter: Community forums & docs. Professional: Priority email with 24h SLA. Enterprise: Dedicated support engineer, Slack channel, and 4h SLA."
  },
];
```

- Uses Radix `<Accordion>` component
- Smooth expand/collapse animation
- Search/filter for questions (if > 8)
- Each answer supports markdown-like formatting
- Grouped by category if needed

---

## 📱 Responsive

| Breakpoint | Cards | Table |
|------------|-------|-------|
| Mobile | Stacked vertically, full width | Accordion per plan |
| Tablet | 2+1 layout or horizontal scroll | Horizontal scroll |
| Desktop | 3 columns, side by side | Full table |

---

## 🧪 Acceptance Criteria

- [ ] Billing toggle switches between monthly/annual with price animation
- [ ] 3 pricing cards render with correct tier data
- [ ] Professional card is visually highlighted
- [ ] Feature comparison table renders with categories
- [ ] FAQ accordion expands/collapses smoothly
- [ ] All CTAs link correctly (register, contact)
- [ ] Responsive at all breakpoints
- [ ] Price saves 20% on annual toggle
- [ ] "Most Popular" badge visible on Professional

---

*Prompt 010 — Pricing Page v1.0*
