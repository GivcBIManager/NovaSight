# Prompt 014 — Responsive Design & Mobile Polish

**Agent**: `@frontend`  
**Phase**: 4 — Polish  
**Dependencies**: All pages assembled (007–012)  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Perform a comprehensive responsive design pass across all marketing pages. Ensure pixel-perfect rendering, touch-friendly interactions, and optimized experiences from 320px mobile to 2560px ultrawide displays.

---

## 📁 Files to Modify

All marketing components and pages.

---

## 📐 Breakpoint System

```css
/* Tailwind defaults + custom */
xs:  320px    /* Small phones */
sm:  640px    /* Large phones */
md:  768px    /* Tablets */
lg:  1024px   /* Small laptops */
xl:  1280px   /* Desktop */
2xl: 1536px   /* Large desktop */
3xl: 1920px   /* Ultrawide (custom) */
```

---

## 📐 Page-by-Page Responsive Audit

### Homepage

| Section | Mobile (< 640px) | Tablet (640-1023px) | Desktop (≥ 1024px) |
|---------|-------------------|---------------------|---------------------|
| **Hero** | Text center-aligned, `text-3xl`, CTAs stack vertically, HeroVisual below at 95% width, hide floating metric cards | `text-4xl`, CTAs side-by-side, show 1 floating card | Full layout, `text-5xl md:text-6xl`, all floating cards |
| **HowItWorks** | Vertical timeline, line on left | Vertical timeline, wider cards | Horizontal timeline |
| **FeatureShowcase** | Stacked: visual 100% width above text, no alternating | Stacked but wider margins | Side-by-side, alternating |
| **BentoFeatures** | Single column stack | 2-column grid | 3-column bento |
| **Metrics** | 2×2 grid, smaller numbers (`text-3xl`) | 2×2 grid, full numbers | 4-column, `text-5xl` |
| **TechStack** | Stacked layer cards, no expand animation | Stacked with expand | Full layered diagram |
| **Testimonials** | Full width, swipe gesture support, smaller text | Max-w-2xl centered | Max-w-3xl centered |
| **Comparison** | Accordion per plan (not table) | Horizontal scroll table | Full table |
| **CTA** | Stacked CTAs, `py-16`, `text-2xl` | Side-by-side CTAs | Full layout, `text-4xl` |

### Features Page

| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| **ScrollSpy** | Horizontal scroll, smaller labels | Horizontal scroll | Full width, sticky |
| **Feature Tabs** | Stacked: tabs above, content, then visual | Two-column with tabs | Full side-by-side |
| **Integration Grid** | 2-column | 3-column | 4-column |

### Pricing Page

| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| **Cards** | Full width, stacked | 2+1 layout | 3-column |
| **Comparison** | Accordion by plan | Horizontal scroll | Full table |
| **FAQ** | Full width accordion | Max-w-2xl | Max-w-3xl |

### Other Pages

- **Solutions**: Industry cards 1-col → 2-col → 3-col
- **About**: Values 1-col → 2-col → 3-col, timeline vertical → horizontal
- **Contact**: Form stacked → side-by-side with info

---

## 📐 Mobile-Specific Enhancements

### Touch Interactions
```tsx
// 1. Touch-friendly targets
// All clickable elements: min height/width 44px (--touch-target-min)
// Increase padding on interactive elements for mobile

// 2. Swipe gestures for carousels
// TestimonialsCarousel: Add swipe left/right support
// Use framer-motion drag gesture:
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(e, info) => {
    if (info.offset.x > 50) prevSlide();
    if (info.offset.x < -50) nextSlide();
  }}
/>

// 3. Haptic feedback (where supported)
// On successful form submission: navigator.vibrate?.(50)
```

### Mobile Navigation
```tsx
// Already handled in MarketingNavbar, verify:
// - Hamburger menu works at < 1024px
// - Menu items have 44px min height
// - Menu closes on link click
// - No body scroll when menu is open (overflow: hidden on body)
// - Menu animation is snappy (< 300ms)
```

### Mobile Typography Scale
```css
/* Ensure text doesn't break layouts on small screens */
.hero-headline {
  @apply text-3xl sm:text-4xl md:text-5xl lg:text-6xl;
  @apply leading-tight;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.section-title {
  @apply text-2xl sm:text-3xl md:text-4xl;
}

.body-text {
  @apply text-sm sm:text-base;
}
```

### Performance on Mobile
- Reduce `NeuralNetwork` node count on mobile: `nodeCount={30}` (vs 80 on desktop)
- Reduce `FloatingElements` count: `count={3}` (vs 8)
- Simplify `TiltCard` on touch: No tilt on touch devices (use scale only)
- Reduce `GlowOrb` blur on mobile for better GPU performance
- Detect with: `window.matchMedia('(hover: none)')` for touch devices

```tsx
// Hook for responsive effects
function useIsTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}
```

---

## 📐 Ultra-Wide Display Handling (≥ 1920px)

```css
/* Prevent content from stretching too wide */
.marketing-container {
  @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
}

/* For full-bleed backgrounds, still constrain content */
.full-bleed {
  @apply w-full;
}
.full-bleed > .content {
  @apply mx-auto max-w-7xl;
}
```

- Background effects (GlowOrbs, NeuralNetwork) fill full width
- Content stays within `max-w-7xl` (1280px)
- On 2560px+ screens, increase side padding proportionally

---

## 📐 Specific Component Fixes

### 1. Comparison Table Mobile Fallback
Replace full table with per-plan accordion on mobile:
```tsx
{isMobile ? (
  <Accordion type="single" collapsible>
    {tiers.map(tier => (
      <AccordionItem key={tier.name} value={tier.name}>
        <AccordionTrigger>{tier.name} — {tier.priceLabel}</AccordionTrigger>
        <AccordionContent>
          {tier.features.map(f => (
            <FeatureRow key={f.text} feature={f} />
          ))}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
) : (
  <ComparisonTableDesktop />
)}
```

### 2. Logo Cloud Scroll on Mobile
```css
/* Ensure marquee scrolls smoothly on mobile */
@media (max-width: 640px) {
  .logo-marquee {
    animation-duration: 20s; /* faster on smaller viewport */
  }
}
```

### 3. Form Inputs on Mobile
```css
/* Prevent iOS zoom on input focus */
input, select, textarea {
  font-size: 16px; /* iOS won't zoom if font-size >= 16px */
}
```

---

## 🧪 Testing Matrix

### Devices to Test
| Device | Resolution | Browser |
|--------|-----------|---------|
| iPhone SE | 375×667 | Safari |
| iPhone 14 Pro | 393×852 | Safari |
| Samsung Galaxy S23 | 360×780 | Chrome |
| iPad Air | 820×1180 | Safari |
| iPad Pro 12.9" | 1024×1366 | Safari |
| MacBook Air 13" | 1440×900 | Chrome, Safari |
| Desktop 1080p | 1920×1080 | Chrome, Firefox, Edge |
| Desktop 1440p | 2560×1440 | Chrome |

### Acceptance Criteria

- [ ] No horizontal scroll on any viewport width ≥ 320px
- [ ] All text readable without zoom on mobile
- [ ] All touch targets ≥ 44×44px
- [ ] No content overlapping or clipping at any breakpoint
- [ ] Images and visuals scale proportionally
- [ ] Forms usable on mobile with proper keyboard types
- [ ] Navigation works on all breakpoints
- [ ] Animations are reduced on touch devices (no tilt)
- [ ] NeuralNetwork particle count reduced on mobile
- [ ] No layout shift when viewport orientation changes
- [ ] Comparison table has proper mobile fallback
- [ ] All pages scroll smoothly on mobile (60fps)

---

*Prompt 014 — Responsive Polish v1.0*
