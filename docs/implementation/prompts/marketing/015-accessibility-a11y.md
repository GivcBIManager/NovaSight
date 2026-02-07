# Prompt 015 — Accessibility (a11y) Audit & Fixes

**Agent**: `@frontend`  
**Phase**: 4 — Polish  
**Dependencies**: All pages assembled (007–012)  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Perform a comprehensive accessibility audit across all marketing pages and fix all issues to achieve WCAG 2.1 AA compliance. Ensure the marketing site is usable by everyone, including users with visual, motor, and cognitive disabilities.

---

## 📐 Audit Checklist

### 1. Semantic HTML Structure

**Per Page Requirements**:
- [ ] Exactly one `<h1>` per page (the hero headline)
- [ ] Heading hierarchy: `h1 → h2 → h3` (no skipping levels)
- [ ] All sections use `<section>` with `aria-labelledby` pointing to section heading
- [ ] Navigation uses `<nav>` with unique `aria-label`
- [ ] Footer uses `<footer>` landmark
- [ ] Main content wrapped in `<main>` landmark
- [ ] Lists use `<ul>/<ol>` with `<li>` (feature lists, nav links, etc.)

**Audit each page**:
```
HomePage:       h1: "Transform Your Raw Data..." 
                h2: "How It Works", "Features", "Metrics", "Testimonials", etc.
FeaturesPage:   h1: "Everything You Need..."
                h2: per feature section
PricingPage:    h1: "Simple, Transparent Pricing"
                h2: "Choose Your Plan", "Compare Features", "FAQ"
SolutionsPage:  h1: "Built for Every Data Challenge"
                h2: per industry, per use case
AboutPage:      h1: "Built by Engineers..."
                h2: "Our Mission", "Our Values", "Our Journey"
ContactPage:    h1: "Let's Talk Data"
                h2: "Get in Touch", "Contact Options"
```

### 2. Keyboard Navigation

- [ ] **Tab order**: All interactive elements reachable via Tab in logical order
- [ ] **Focus visible**: All focused elements show visible focus ring (`:focus-visible`)
- [ ] **Skip link**: "Skip to main content" as first focusable element on every page
- [ ] **Escape key**: Closes modals, menus, and popups
- [ ] **Arrow keys**: Navigate within carousels, tabs, and accordions
- [ ] **Enter/Space**: Activate buttons, links, and toggles
- [ ] **No keyboard traps**: Tab always allows leaving any component

**Component-Specific**:
```
MarketingNavbar:
  - Tab through all nav links
  - Mobile menu: focus trapped when open, Escape to close
  - Logo: focusable link to home

TestimonialsCarousel:
  - Arrow keys cycle testimonials
  - Dot indicators focusable
  - Pause/play accessible

PricingCards:
  - Tab between cards and CTAs
  - Billing toggle: Space to switch

FAQAccordion:
  - Arrow Up/Down between items
  - Enter/Space to expand/collapse
  - Home/End to first/last item

ContactForm:
  - Tab through all fields in order
  - Focus first error on validation failure
  - Submit with Enter

FeatureTabView:
  - Arrow keys switch tabs
  - Tab content receives focus after switch
```

### 3. Color & Contrast

**WCAG 2.1 AA Requirements**:
- Normal text (< 18px): Contrast ratio ≥ 4.5:1
- Large text (≥ 18px bold or ≥ 24px): Contrast ratio ≥ 3:1
- UI components and graphical objects: ≥ 3:1

**Audit Points**:
```
Background: --color-bg-primary (#0a0a0f) — very dark
Text:       --color-text-primary (#fafafa) — ✅ excellent contrast
Muted:      --color-text-muted (#71717a) — ⚠️ check against dark bg
Links:      --color-accent-purple (#8b5cf6) — check against dark bg
Badges:     accent text on accent/10 bg — check readability

Light Mode: All the same checks against light backgrounds
```

**Fix any failing contrasts**:
- Increase muted text opacity if needed
- Add text-shadow behind gradient text for legibility
- Ensure gradient text has sufficient contrast at all gradient points

### 4. Images & Media

- [ ] All informational images: descriptive `alt` text
- [ ] Decorative images: `alt=""` or `aria-hidden="true"`
- [ ] Icons with meaning: `aria-label` or accompanying text
- [ ] Dashboard mockup in hero: `alt="Preview of NovaSight analytics dashboard"`
- [ ] Logo images: `alt="NovaSight logo"` 
- [ ] SVG icons: `role="img"` with `aria-label`, or `aria-hidden` if decorative

### 5. ARIA & Dynamic Content

```tsx
// Animated counters
<CountUp aria-live="polite" aria-atomic="true" />

// Typewriter text — provide full text to screen readers
<TypewriterText 
  texts={['Connect', 'Transform', 'Visualize']} 
  aria-label="Connect, Transform, Visualize"
/>

// Carousel
<div role="region" aria-roledescription="carousel" aria-label="Customer testimonials">
  <div role="group" aria-roledescription="slide" aria-label="Slide 1 of 5">
    {/* testimonial content */}
  </div>
  <button aria-label="Previous slide">←</button>
  <button aria-label="Next slide">→</button>
  <div role="tablist" aria-label="Slide indicators">
    <button role="tab" aria-selected={active === 0} aria-label="Go to slide 1" />
  </div>
</div>

// Loading states
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Loading...' : content}
</div>

// Form errors
<input 
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
<span id="email-error" role="alert">{errors.email?.message}</span>
```

### 6. Motion & Animations

```tsx
// Global motion preference hook
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
}

// Usage in components:
const prefersReducedMotion = usePrefersReducedMotion();

// Option 1: Skip animation entirely
const variants = prefersReducedMotion ? {} : fadeUpVariants;

// Option 2: Instant transition
const transition = prefersReducedMotion 
  ? { duration: 0 } 
  : { duration: 0.4, ease: 'easeOut' };
```

**Components to audit for reduced motion**:
- [ ] NeuralNetwork → stop animation, show static state
- [ ] GlowOrb → no drift, static position
- [ ] ParallaxLayer → no parallax, normal scroll
- [ ] TextReveal → show immediately, no animation
- [ ] TypewriterText → show full text immediately
- [ ] CountUp → show final number immediately
- [ ] TiltCard → no tilt, keep hover scale only (or remove)
- [ ] FloatingElements → static positions, no float
- [ ] TestimonialsCarousel → no auto-advance, manual only
- [ ] GradientBorder → static gradient, no rotation
- [ ] MagneticButton → no magnetic pull, normal button
- [ ] All scroll animations → elements visible immediately

### 7. Forms Accessibility

```tsx
// ContactForm checklist:
// ✅ Every input has a visible <label>
// ✅ Required fields marked with aria-required="true"
// ✅ Error messages linked via aria-describedby
// ✅ Error summary at top of form with links to fields
// ✅ Success message announced with role="alert"
// ✅ Proper input types: type="email", type="tel"
// ✅ Autocomplete attributes: autocomplete="given-name", etc.
// ✅ Submit button has descriptive text (not just "Submit")

// NewsletterForm checklist:
// ✅ Input has label (can be visually hidden: sr-only)
// ✅ Error/success announced
// ✅ Button text descriptive
```

### 8. Screen Reader Testing Script

Manual testing steps:
```
1. Navigate to homepage
2. Verify page title is announced
3. Tab through all interactive elements — verify logical order
4. Verify hero heading reads as h1
5. Navigate through features section — verify headings, descriptions
6. Interact with testimonials carousel via keyboard
7. Navigate to pricing — verify plan names and prices read correctly
8. Fill out contact form using only keyboard
9. Trigger validation error — verify error is announced
10. Submit form — verify success message is announced
```

---

## 📁 Files to Create

```
frontend/src/hooks/usePrefersReducedMotion.ts
frontend/src/components/marketing/shared/SkipToContent.tsx
```

### SkipToContent.tsx

```tsx
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:left-4 focus:top-4 focus:z-maximum
        focus:rounded-lg focus:bg-accent-purple focus:px-4 focus:py-2
        focus:text-white focus:outline-none focus:ring-2 focus:ring-white
      "
    >
      Skip to main content
    </a>
  );
}
```

Add `id="main-content"` to `<main>` in MarketingLayout.

---

## 🧪 Acceptance Criteria

- [ ] All pages pass axe-core automated audit with 0 critical/serious issues
- [ ] Heading hierarchy is correct on every page
- [ ] All interactive elements keyboard-accessible
- [ ] Skip-to-content link works on every page
- [ ] Color contrast ≥ 4.5:1 for all normal text
- [ ] Color contrast ≥ 3:1 for large text and UI components
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Carousel navigable via keyboard with proper ARIA
- [ ] Forms have proper labels, error handling, and announcements
- [ ] Screen reader testing passes all 10 manual test steps
- [ ] No ARIA misuse (no role="button" on `<div>` without keyboard handler)
- [ ] Focus management works correctly (modal open/close, form errors)

---

*Prompt 015 — Accessibility v1.0*
