# Prompt 004 — Homepage Hero Section

**Agent**: `@frontend`  
**Phase**: 2 — Homepage  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: High  

---

## 🎯 Objective

Build a jaw-dropping hero section for the NovaSight marketing homepage. This is the first thing visitors see — it must be **cinematic, immersive, and instantly communicate value**.

---

## 📁 Files to Create

```
frontend/src/components/marketing/hero/HeroSection.tsx
frontend/src/components/marketing/hero/HeroVisual.tsx
frontend/src/components/marketing/hero/HeroBadge.tsx
frontend/src/components/marketing/hero/index.ts
```

---

## 📐 Detailed Specifications

### 1. HeroSection.tsx

**Purpose**: The full hero section composing background, content, and interactive visual.

#### Visual Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [NeuralNetwork animated background — full bleed, low opacity]            │
│                                                                           │
│  [GlowOrb purple, top-left]              [GlowOrb cyan, bottom-right]    │
│                                                                           │
│           ┌──────────────────────────┐                                    │
│           │ 🚀 Now with AI-Powered   │   ← Animated badge                │
│           │    Query Generation      │                                    │
│           └──────────────────────────┘                                    │
│                                                                           │
│        Transform Your Raw Data Into                                       │
│         Actionable Intelligence         ← Main headline (text-5xl/6xl)   │
│                                                                           │
│    The modern BI platform that connects,  ← Subtitle (text-xl)           │
│    transforms, and visualizes your data                                   │
│    — powered by AI, secured by design.                                    │
│                                                                           │
│    [🚀 Start Free Trial]  [▶ Watch Demo]  ← CTA buttons                 │
│                                                                           │
│    ┌─────────────────────────────────────────┐                            │
│    │                                         │                            │
│    │     ┌─── Product Screenshot/Visual ──┐  │  ← HeroVisual             │
│    │     │                                │  │    (3D tilted, glowing     │
│    │     │    Dashboard mockup with       │  │     border, floating)      │
│    │     │    glass morphism overlay      │  │                            │
│    │     │                                │  │                            │
│    │     └────────────────────────────────┘  │                            │
│    │                                         │                            │
│    └─────────────────────────────────────────┘                            │
│                                                                           │
│    Trusted by data teams at innovative companies                          │
│    [Logo] [Logo] [Logo] [Logo] [Logo]         ← LogoCloud                │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Animation Sequence (Orchestrated)
```
T+0ms:     Background fades in (NeuralNetwork + GlowOrbs)
T+200ms:   Badge slides down with bounce
T+400ms:   Headline reveals word-by-word (TextReveal)
T+800ms:   Subtitle fades up
T+1000ms:  CTA buttons fade up with stagger
T+1200ms:  Hero visual floats up with 3D perspective tilt
T+1600ms:  Logo cloud fades in
```

Use `staggerContainerVariants` with custom delays.

#### Content

**Badge**: "🚀 Now with AI-Powered Query Generation" (or dynamically rotate between announcements using `TypewriterText`)

**Headline**:
```
Transform Your Raw Data Into
Actionable Intelligence
```
- "Actionable Intelligence" rendered with `text-gradient` (gradient-primary)

**Subtitle**:
```
The modern BI platform that connects, transforms, and visualizes
your data — powered by AI, secured by design.
```

**Primary CTA**: "Start Free Trial" → `/register`
- `MagneticButton` with `variant="gradient"`, `size="lg"`
- Subtle glow pulse animation on hover
- Icon: Rocket or ArrowRight

**Secondary CTA**: "Watch Demo" → opens modal or scrolls to demo section
- `variant="outline"`, `size="lg"`
- Play icon (▶)

### 2. HeroVisual.tsx

**Purpose**: The product screenshot / interactive visual in the hero section.

#### Design Options (implement Option A, structure for easy swap)

**Option A: Floating Dashboard Mockup**
- A stylized screenshot of the NovaSight dashboard
- Wrapped in `<TiltCard maxTilt={8} glare>`
- Surrounded by `<GradientBorder gradient="gradient-neon" animate>`
- Floating animation: `y` oscillates ±10px over 6s
- Decorative floating UI elements around it:
  - Small glass card showing a metric: "Revenue ↑ 24%" (top-right, offset)
  - Small glass card showing chart mini-preview (bottom-left, offset)
  - Small glass card showing "AI Query: Show me top customers" (top-left)
- Each floating element has different float speed for parallax depth

**Option B: Interactive 3D Data Visualization** (future enhancement)
- Three.js / react-three-fiber orb with data particles
- Can be swapped in later

#### Implementation Notes
```tsx
// Structure:
<div className="relative mx-auto max-w-4xl">
  {/* Main dashboard mockup */}
  <TiltCard>
    <GradientBorder>
      <div className="rounded-2xl overflow-hidden shadow-2xl">
        {/* Dashboard screenshot or styled mockup */}
        <DashboardMockup />
      </div>
    </GradientBorder>
  </TiltCard>
  
  {/* Floating metric cards */}
  <FloatingMetricCard position="top-right" delay={0.5} />
  <FloatingMetricCard position="bottom-left" delay={0.8} />
  <FloatingAICard position="top-left" delay={1.0} />
</div>
```

**DashboardMockup**: A simplified, stylized representation of the NovaSight dashboard. NOT a real screenshot — build it as a component with:
- Fake sidebar (thin dark strip)
- Fake header bar
- 2–3 glass cards with simplified chart shapes (bars, lines)
- Use the actual NovaSight color palette
- Everything rendered at ~60% scale, slightly blurred to suggest depth
- Gradient overlay at bottom to fade into page background

### 3. HeroBadge.tsx

**Purpose**: The animated announcement badge at the top of the hero.

```tsx
interface HeroBadgeProps {
  icon?: React.ReactNode;
  text: string;
  href?: string;        // optional link
  animate?: boolean;    // shimmer effect, default true
}
```

- Pill shape: `rounded-full`
- Border: `border border-accent-purple/30`
- Background: `bg-accent-purple/10`
- Shimmer: A highlight sweep across the badge every 3 seconds
- Hover: Slight scale (1.02) and border brightens
- If `href`, render as `<Link>`

---

## 🎨 Background Composition

Layer the hero background for depth:

```
Layer 0 (bottom):  Solid bg-bg-primary
Layer 1:           <GridBackground opacity={0.03} />
Layer 2:           <NeuralNetwork nodeCount={80} interactive speed={0.3} />
Layer 3:           <GlowOrb color="purple" size="xl" position={{ top: '10%', left: '15%' }} />
Layer 4:           <GlowOrb color="cyan" size="lg" position={{ bottom: '20%', right: '10%' }} />
Layer 5:           <FloatingElements count={8} shapes={['circle', 'hexagon']} />
Layer 6 (top):     Content (text, CTAs, visual)
```

All background layers: `pointer-events-none`, `absolute`, `inset-0`

---

## 📱 Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| < 640px | Headline: `text-3xl`, subtitle: `text-base`, CTAs stack vertically, HeroVisual scales to 90% width, floating metric cards hidden |
| 640–1023px | Headline: `text-4xl`, HeroVisual at 80% width, 1 floating card visible |
| ≥ 1024px | Full layout as designed, all floating elements visible |
| ≥ 1280px | Max-width container, generous padding |

---

## ⚡ Performance

- `<NeuralNetwork>` already uses canvas — ensure it doesn't re-render on content changes
- Hero visual floating elements: Use CSS `animation` (not JS) for the constant float
- `will-change: transform` on the TiltCard only during hover
- Lazy load `<NeuralNetwork>` component if not already visible
- Total hero paint should be < 200ms

---

## ♿ Accessibility

- Headline: Proper `<h1>` tag
- Subtitle: `<p>` tag
- CTAs: Proper button/link roles with descriptive text
- Background animations: All `aria-hidden="true"`
- Dashboard mockup: `alt="NovaSight dashboard preview"` or `aria-hidden` if decorative
- Color contrast: All text meets WCAG 2.1 AA against backgrounds

---

## 🧪 Acceptance Criteria

- [ ] Hero loads with orchestrated animation sequence
- [ ] Headline renders with gradient highlight on "Actionable Intelligence"
- [ ] Both CTA buttons are visible and functional
- [ ] HeroVisual displays dashboard mockup with 3D tilt on hover
- [ ] Floating metric cards animate with different speeds
- [ ] GlowOrbs drift slowly in background
- [ ] NeuralNetwork renders behind content
- [ ] Responsive at all breakpoints (mobile → desktop)
- [ ] No layout shift (CLS < 0.05)
- [ ] Animation respects `prefers-reduced-motion`
- [ ] LogoCloud displays below hero visual

---

*Prompt 004 — Homepage Hero v1.0*
