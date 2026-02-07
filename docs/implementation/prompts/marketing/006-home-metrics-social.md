# Prompt 006 — Homepage Metrics, Testimonials & CTA

**Agent**: `@frontend`  
**Phase**: 2 — Homepage  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build the social proof and conversion sections of the homepage: animated metrics, customer testimonials, a comparison table, and a powerful final call-to-action section.

---

## 📁 Files to Create

```
frontend/src/components/marketing/sections/MetricsSection.tsx
frontend/src/components/marketing/sections/TestimonialsCarousel.tsx
frontend/src/components/marketing/sections/ComparisonTable.tsx
frontend/src/components/marketing/sections/CTASection.tsx
```

---

## 📐 Detailed Specifications

### 1. MetricsSection.tsx

**Purpose**: Animated counters showcasing platform capabilities and scale.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        Numbers That Speak for Themselves                    │
│                                                             │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐│
│   │           │  │           │  │           │  │         ││
│   │   <1s     │  │   20+     │  │   99.9%   │  │  100+   ││
│   │  Query    │  │ Connectors│  │  Uptime   │  │ Tenants ││
│   │  Latency  │  │  Ready    │  │  SLA      │  │ Served  ││
│   │           │  │           │  │           │  │         ││
│   └───────────┘  └───────────┘  └───────────┘  └─────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Metrics Data
```typescript
const metrics = [
  { end: 1, suffix: 's', prefix: '<', label: 'Query Latency', sublabel: 'Powered by ClickHouse', icon: Zap, color: 'cyan' },
  { end: 20, suffix: '+', label: 'Data Connectors', sublabel: 'And growing', icon: Database, color: 'indigo' },
  { end: 99.9, suffix: '%', decimals: 1, label: 'Uptime SLA', sublabel: 'Enterprise reliability', icon: Shield, color: 'green' },
  { end: 100, suffix: '+', label: 'Tenants Served', sublabel: 'Multi-tenant ready', icon: Users, color: 'purple' },
];
```

#### Visual Design
- Each metric card: `<GlassCard>` with colored top border (3px gradient)
- Number: Uses `<CountUp>` component, `text-4xl md:text-5xl font-bold`
- Number color: Matches metric's accent color
- Label: `text-lg font-semibold`
- Sublabel: `text-sm text-muted-foreground`
- Icon: `<IconBadge>` floated top-right of card
- Grid: `grid-cols-2 lg:grid-cols-4 gap-6`

#### Animation
- Cards stagger in on scroll (200ms between each)
- CountUp triggers when card comes into view
- Icon has subtle `ai-pulse` animation

---

### 2. TestimonialsCarousel.tsx

**Purpose**: Auto-rotating carousel of customer testimonials.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           Loved by Data Teams Worldwide                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │  "NovaSight transformed how our team handles data.  │   │
│   │   What used to take days now takes minutes.         │   │
│   │   The AI query feature alone saved us 100+ hours    │   │
│   │   per quarter."                                     │   │
│   │                                                     │   │
│   │   ┌─────┐                                          │   │
│   │   │ 👤  │  Sarah Chen                              │   │
│   │   │ AVT │  Head of Data Engineering                │   │
│   │   └─────┘  TechCorp Inc.                           │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│              ○ ○ ● ○ ○        ← dots indicator             │
│         [←]            [→]    ← nav arrows                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Testimonials Data
```typescript
const testimonials = [
  {
    quote: "NovaSight transformed how our team handles data. What used to take days now takes minutes. The AI query feature alone saved us 100+ hours per quarter.",
    author: "Sarah Chen",
    role: "Head of Data Engineering",
    company: "TechCorp Inc.",
    avatar: null,  // use initials fallback
    rating: 5,
  },
  {
    quote: "The template engine approach gives us the security guarantees we need while still empowering our analysts to build their own pipelines.",
    author: "Marcus Rodriguez",
    role: "CISO",
    company: "FinanceFlow",
    avatar: null,
    rating: 5,
  },
  {
    quote: "We evaluated 6 BI platforms. NovaSight was the only one that offered multi-tenant isolation out of the box with sub-second query performance.",
    author: "Priya Sharma",
    role: "VP of Analytics",
    company: "DataDriven Co.",
    avatar: null,
    rating: 5,
  },
  {
    quote: "The natural language query interface made data accessible to our non-technical stakeholders for the first time. Game changer.",
    author: "James O'Brien",
    role: "Chief Data Officer",
    company: "InsightHub",
    avatar: null,
    rating: 5,
  },
  {
    quote: "Moving from our legacy BI tool to NovaSight cut our infrastructure costs by 40% and improved query speeds by 10x.",
    author: "Lisa Park",
    role: "Director of Engineering",
    company: "ScaleUp Labs",
    avatar: null,
    rating: 5,
  },
];
```

#### Visual Design
- Central testimonial card: Large `<GlassCard>` with extra padding
- Quote mark: Large decorative `"` in `text-accent-purple/20` behind text
- Star rating: 5 gold stars above quote
- Avatar: Circle with initials (use `<Avatar>` from Radix) 
- Auto-rotate: Every 5 seconds, crossfade to next
- Dot indicators: Small circles, active = gradient-filled
- Nav arrows: Glass circle buttons with chevron icons
- Pause on hover

#### Animation
- Crossfade transition between testimonials (AnimatePresence)
- Quote text: Subtle fade + slide effect on change
- Auto-advance pauses when user interacts with arrows

---

### 3. ComparisonTable.tsx

**Purpose**: Feature comparison table showing NovaSight vs traditional BI tools.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           Why Teams Choose NovaSight                        │
│                                                             │
│   ┌──────────────────┬──────────┬──────────┬──────────┐    │
│   │  Feature         │ NovaSight│ Trad. BI │ Custom   │    │
│   ├──────────────────┼──────────┼──────────┼──────────┤    │
│   │ Setup Time       │ Minutes  │  Weeks   │ Months   │    │
│   │ AI Queries       │   ✓ ✨   │    ✗     │    ✗     │    │
│   │ Multi-tenant     │   ✓      │    ~     │    ✗     │    │
│   │ No-code Pipelines│   ✓      │    ~     │    ✗     │    │
│   │ Self-hosted AI   │   ✓      │    ✗     │    ~     │    │
│   │ Template Security│   ✓      │    ✗     │    ✗     │    │
│   │ Sub-second Query │   ✓      │    ~     │    ~     │    │
│   │ Cost             │   $      │   $$$    │  $$$$    │    │
│   └──────────────────┴──────────┴──────────┴──────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Visual Design
- NovaSight column: Highlighted with gradient top border and subtle `bg-accent-purple/5`
- Checkmarks: Green (`text-success`) with subtle glow
- Crosses: Red (`text-error`), muted
- Tilde (~): Yellow (`text-warning`), "partial"
- NovaSight ✨: Extra sparkle emoji/icon for standout features
- Table: `<GlassCard>` wrapper, proper `<table>` semantic markup
- Rows: Alternate subtle background shading
- Sticky header row on mobile scroll

#### Animation
- Table fades in on scroll
- Each row staggers in from left (50ms delay each)
- NovaSight column checkmarks animate in with a "pop" scale effect

---

### 4. CTASection.tsx

**Purpose**: The final conversion section before the footer — bold, immersive, impossible to miss.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░                                                         ░ │
│ ░  [GlowOrb]                              [GlowOrb]      ░ │
│ ░                                                         ░ │
│ ░          Ready to Transform Your Data?                  ░ │
│ ░                                                         ░ │
│ ░     Start building your data platform in minutes.       ░ │
│ ░     No credit card required. Free for small teams.      ░ │
│ ░                                                         ░ │
│ ░       [🚀 Start Free Trial]   [📞 Book a Demo]         ░ │
│ ░                                                         ░ │
│ ░     ✓ Free tier available  ✓ No credit card             ░ │
│ ░     ✓ 5-minute setup      ✓ Cancel anytime             ░ │
│ ░                                                         ░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────────┘
```

#### Visual Design
- Full-width section with generous vertical padding (`py-24 md:py-32`)
- Background: Dark gradient `from-accent-purple/20 via-bg-primary to-neon-cyan/10`
- Two large `<GlowOrb>` components flanking the content
- `<NeuralNetwork>` or `<ParticleField>` behind at very low opacity
- Title: `text-4xl md:text-5xl font-bold` — "Ready to" in default, "Transform Your Data?" in gradient
- Subtitle: Muted foreground
- CTAs: Two `<MagneticButton>` components side by side
  - Primary: `variant="gradient"`, glowing
  - Secondary: `variant="outline"`
- Trust badges below CTAs: Inline checkmarks with trust signals
- All centered

#### Animation
- Background gradient slowly shifts (8s loop)
- Title: `<TextReveal mode="word">` on scroll
- CTAs: Fade-up with stagger
- Trust badges: Fade in after CTAs

---

## 📱 Responsive Behavior

| Component | Mobile | Desktop |
|-----------|--------|---------|
| MetricsSection | 2×2 grid | 4-column grid |
| TestimonialsCarousel | Full width, swipe gesture | Centered max-w-3xl |
| ComparisonTable | Horizontal scroll with sticky first column | Full table |
| CTASection | Stacked CTAs, reduced padding | Side-by-side CTAs |

---

## ♿ Accessibility

- MetricsSection: `aria-live="polite"` on counting numbers
- TestimonialsCarousel: `aria-roledescription="carousel"`, `aria-label` for slides, keyboard arrow key navigation
- ComparisonTable: Proper `<table>`, `<thead>`, `<th scope>` markup
- CTASection: Clear button labels, focus management

---

## 🧪 Acceptance Criteria

- [ ] Metrics animate from 0 to target on scroll
- [ ] Testimonials auto-rotate every 5s with crossfade
- [ ] Testimonials pause on hover and support keyboard navigation
- [ ] Comparison table highlights NovaSight column
- [ ] CTA section renders with animated background effects
- [ ] All sections responsive at all breakpoints
- [ ] All components animate on scroll
- [ ] Testimonial data can be easily updated/extended

---

*Prompt 006 — Homepage Metrics, Testimonials & CTA v1.0*
