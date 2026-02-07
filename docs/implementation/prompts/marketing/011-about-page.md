# Prompt 011 — About Page (Company & Team)

**Agent**: `@frontend`  
**Phase**: 3 — Inner Pages  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build an About page that tells the NovaSight story, communicates the mission and values, and builds trust. This page humanizes the brand and establishes credibility.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/AboutPage.tsx
frontend/src/components/marketing/sections/MissionSection.tsx
frontend/src/components/marketing/sections/ValuesGrid.tsx
frontend/src/components/marketing/sections/TimelineSection.tsx
frontend/src/components/marketing/sections/TeamSection.tsx
```

---

## 📐 Page Structure

```
1. Hero Banner
   "Built by Engineers, for Engineers"
   "We believe data should be accessible to everyone — without compromising security."

2. Mission Statement
   Large, cinematic text reveal

3. Core Values (4-6 values)
   Interactive value cards

4. Our Journey / Timeline
   Key milestones in NovaSight's story

5. Open Source & Community
   Commitment to open standards

6. CTA Section
   "Join Us on This Journey"
```

---

## 📐 Detailed Specifications

### Mission Section

#### Visual Design
- Full-width section with dramatic presentation
- Large quote-style text: `text-2xl md:text-3xl lg:text-4xl`, `font-light`, `leading-relaxed`
- Text reveals word-by-word using `<TextReveal>` as user scrolls
- Key phrases highlighted in gradient text
- Background: Subtle `<ParticleField>` or `<GridBackground>` at low opacity
- Pull quote style: Large decorative `"` marks

#### Content
```
"We started NovaSight with a simple belief: every organization 
deserves enterprise-grade data analytics without the enterprise-grade 
complexity. We're building the platform we always wished existed — 
one where data flows freely, insights emerge naturally, and security 
is never an afterthought."
```

### ValuesGrid.tsx

#### Values Data
```typescript
const values = [
  {
    icon: Shield,
    title: 'Security by Design',
    description: 'Our Template Engine Rule ensures no arbitrary code execution. Security isn\'t a feature — it\'s the foundation.',
    color: 'indigo',
    visual: '🔒', // or SVG illustration
  },
  {
    icon: Lightbulb,
    title: 'Democratize Data',
    description: 'We believe everyone should have access to data insights, regardless of their technical background.',
    color: 'purple',
    visual: '💡',
  },
  {
    icon: Rocket,
    title: 'Performance First',
    description: 'Sub-second queries, instant dashboards. We obsess over speed because your time matters.',
    color: 'cyan',
    visual: '🚀',
  },
  {
    icon: Users,
    title: 'Built for Teams',
    description: 'Multi-tenant from day one. Every team gets their own secure workspace with full isolation.',
    color: 'green',
    visual: '👥',
  },
  {
    icon: Brain,
    title: 'AI with Privacy',
    description: 'Local LLMs mean your data never leaves your infrastructure. Intelligence without compromise.',
    color: 'pink',
    visual: '🧠',
  },
  {
    icon: Code,
    title: 'Open Standards',
    description: 'Built on open-source technologies. No vendor lock-in. Your data stays yours.',
    color: 'indigo',
    visual: '🔓',
  },
];
```

#### Visual Design
- 3×2 grid on desktop, 2×3 on tablet, single column on mobile
- Each value card: `<GlassCard>` with `<TiltCard>` hover effect
- `<IconBadge>` at top with color-matched glow
- Title: `text-xl font-semibold`
- Description: `text-sm text-muted-foreground`
- Hover: Card lifts, subtle glow in card's accent color
- Stagger animation on scroll

### TimelineSection.tsx

#### Milestones
```typescript
const milestones = [
  {
    date: 'Q1 2025',
    title: 'The Vision',
    description: 'NovaSight concept born from the frustration of fragmented BI tooling.',
    icon: Lightbulb,
    status: 'complete',
  },
  {
    date: 'Q3 2025',
    title: 'Architecture Design',
    description: 'Template Engine Rule defined. Security-first architecture finalized.',
    icon: Layers,
    status: 'complete',
  },
  {
    date: 'Q1 2026',
    title: 'Platform Launch',
    description: 'Core platform released with data connections, pipelines, and dashboards.',
    icon: Rocket,
    status: 'current',
  },
  {
    date: 'Q2 2026',
    title: 'AI Integration',
    description: 'Ollama-powered natural language queries and AI-assisted analytics.',
    icon: Bot,
    status: 'upcoming',
  },
  {
    date: 'Q4 2026',
    title: 'Enterprise & Scale',
    description: 'Kubernetes auto-scaling, advanced governance, and marketplace.',
    icon: Globe,
    status: 'upcoming',
  },
];
```

#### Visual Design (Desktop)
```
  Q1 2025          Q3 2025          Q1 2026          Q2 2026          Q4 2026
    ●───────────────●───────────────●───────────────●───────────────●
    │               │               │               │               │
  The Vision    Architecture    Platform        AI              Enterprise
                Design          Launch          Integration     & Scale

  ● complete (green fill)
  ● current (pulsing purple glow)  
  ○ upcoming (outlined, muted)
```

- Horizontal line with milestone dots
- Each dot: Circle with icon inside
- Complete: Solid green with checkmark
- Current: Purple with `ai-pulse` animation ring
- Upcoming: Outlined, muted, slight opacity
- Content below each dot with date label above
- Line draws itself from left to right on scroll
- Mobile: Vertical layout with line on left

### Open Source & Community Section

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         Built on Open Source, for the Community              │
│                                                             │
│   ┌───────────────────┐  ┌───────────────────────────────┐ │
│   │   Tech Stack       │  │   Our Commitment              │ │
│   │                    │  │                               │ │
│   │   🐍 Flask         │  │   • Apache 2.0 licensed core │ │
│   │   ⚛️ React         │  │   • Open contribution model  │ │
│   │   🎯 ClickHouse    │  │   • Transparent roadmap      │ │
│   │   🔀 Airflow       │  │   • Community-driven features│ │
│   │   📊 dbt           │  │   • Public changelog         │ │
│   │   🤖 Ollama        │  │                               │ │
│   └───────────────────┘  └───────────────────────────────┘ │
│                                                             │
│   [⭐ Star on GitHub]  [💬 Join Discord]  [📖 Read Docs]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Two-column layout: Tech stack visual + commitment list
- Tech logos with labels
- Community CTA buttons with icon badges
- `<GlassCard>` wrapper

---

## 🧪 Acceptance Criteria

- [ ] Hero renders with tagline
- [ ] Mission text reveals on scroll (word-by-word)
- [ ] 6 value cards render in grid with tilt hover effect
- [ ] Timeline renders with correct status states (complete/current/upcoming)
- [ ] Timeline animates line drawing on scroll
- [ ] Current milestone pulses
- [ ] Open source section renders with tech stack and community CTAs
- [ ] CTA section at bottom
- [ ] All sections responsive

---

*Prompt 011 — About Page v1.0*
