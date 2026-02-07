# Prompt 001 — Marketing Layout, Navbar & Footer

**Agent**: `@frontend`  
**Phase**: 1 — Foundation  
**Dependencies**: None  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Create the shared marketing layout wrapper, a futuristic transparent-to-solid navigation bar, and a comprehensive footer. These components frame every marketing page.

---

## 📁 Files to Create

```
frontend/src/components/marketing/layout/MarketingLayout.tsx
frontend/src/components/marketing/layout/MarketingNavbar.tsx
frontend/src/components/marketing/layout/MarketingFooter.tsx
frontend/src/components/marketing/layout/index.ts
```

---

## 📐 Detailed Specifications

### 1. MarketingLayout.tsx

**Purpose**: Wraps all marketing pages with consistent navbar + footer + background effects.

```tsx
// Requirements:
// - Renders <MarketingNavbar /> at top
// - Renders <Outlet /> or children for page content
// - Renders <MarketingFooter /> at bottom
// - Includes a subtle global background:
//   - <GridBackground> with very low opacity (0.03)
//   - Two floating <GlowOrb> components (top-left purple, bottom-right cyan)
// - Wraps content in <motion.div> with page transition (fade + slight Y shift)
// - Applies className="min-h-screen bg-bg-primary text-foreground"
```

### 2. MarketingNavbar.tsx

**Purpose**: A sticky navigation bar that transitions from transparent (at top) to frosted glass on scroll.

#### Visual Design
- **Transparent state** (scroll Y = 0): Fully transparent, no border, no backdrop blur
- **Scrolled state** (scroll Y > 50): `backdrop-blur-glass`, `bg-bg-primary/80`, subtle bottom border (`border-border/50`)
- **Transition**: Smooth 300ms transition between states
- **Height**: 72px desktop, 64px mobile
- **Z-index**: `z-sticky` (200)

#### Layout (Desktop ≥ 1024px)
```
[Logo]          [Features] [Solutions] [Pricing] [About]          [Sign In] [Get Started →]
```

- **Logo**: NovaSight text logo with gradient text effect (`text-gradient` class). Links to `/`.
- **Nav links**: Text links with hover underline animation (gradient underline slides in from left). Active state uses `text-accent-purple`.
- **Sign In**: Ghost/outline button → links to `/login`
- **Get Started**: Gradient button (`variant="gradient"`) with glow hover → links to `/register`

#### Layout (Mobile < 1024px)
- Hamburger icon (animated ☰ → ✕ morph using framer-motion)
- Full-screen mobile menu overlay:
  - Backdrop blur full screen
  - Nav links stacked vertically with stagger animation
  - CTA buttons at bottom
  - Close on link click or ✕ button

#### Interactions
- Nav links: Hover reveals a gradient underline (2px, `gradient-primary`) that slides in from left
- Get Started button: Subtle glow pulse on hover (`shadow-glow-md`)
- Mobile menu: Slides in from right with spring physics

#### Implementation Notes
```tsx
// Use useState for scroll position tracking
// Use useEffect with scroll listener (throttled/passive)
// Use framer-motion AnimatePresence for mobile menu
// Use react-router-dom NavLink for active state
// Respect prefers-reduced-motion
```

### 3. MarketingFooter.tsx

**Purpose**: Comprehensive footer with links, branding, and newsletter signup.

#### Visual Design
- Background: `bg-bg-secondary` with top border (`border-border`)
- Optional: Subtle gradient glow at top edge

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [NovaSight Logo]           [Newsletter Signup]             │
│  Brief tagline              [Email input] [Subscribe →]     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Product        Solutions      Company       Resources      │
│  · Features     · Analytics    · About       · Documentation│
│  · Pricing      · Data Eng     · Contact     · Blog         │
│  · Integrations · Enterprise   · Careers     · Changelog    │
│  · Security                                  · Status       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  © 2026 NovaSight. All rights reserved.                     │
│  [Twitter] [GitHub] [LinkedIn] [Discord]     Privacy Terms  │
└─────────────────────────────────────────────────────────────┘
```

- **Social icons**: Use Lucide icons, hover glow effect
- **Newsletter**: Glass card input with gradient submit button
- **Bottom bar**: Muted text, subtle separator

---

## 🎨 Design Tokens to Use

| Element | Token |
|---------|-------|
| Navbar bg (scrolled) | `bg-bg-primary/80` + `backdrop-blur-glass` |
| Logo gradient | `gradient-primary` (indigo → purple) |
| Nav link hover | `gradient-primary` underline |
| CTA button | `variant="gradient"` + `shadow-glow-md` on hover |
| Footer bg | `bg-bg-secondary` |
| Footer border | `border-border` |
| Muted text | `text-muted-foreground` |
| Social hover | `shadow-glow-sm` + color transition |

---

## ♿ Accessibility Requirements

- Navbar: `<nav>` with `aria-label="Main navigation"`
- Mobile menu: `aria-expanded`, focus trap, Escape to close
- Footer: `<footer>` landmark
- Skip-to-content link as first focusable element
- All links have visible focus rings (`focus.css` system)
- Newsletter form: proper `<label>`, `aria-describedby` for validation

---

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 640px (sm) | Stack footer columns 2×2, compact padding |
| 640–1023px (md) | Footer 2 columns, mobile nav |
| ≥ 1024px (lg) | Full desktop nav, 4 footer columns |
| ≥ 1280px (xl) | Max-width container centering |

---

## 🧪 Acceptance Criteria

- [ ] Navbar is transparent at page top, frosted on scroll
- [ ] All nav links route correctly to marketing pages
- [ ] Mobile hamburger menu opens/closes with animation
- [ ] Logo links to home page
- [ ] Footer renders all link sections
- [ ] Newsletter form validates email format
- [ ] Skip-to-content link works
- [ ] Smooth scroll transitions respect `prefers-reduced-motion`
- [ ] No layout shift on page load
- [ ] Works in Chrome, Firefox, Safari, Edge

---

## 📁 Files to Modify

```
frontend/src/App.tsx  →  Add marketing routes (public, outside ProtectedRoute)
```

Add a new route group for marketing pages:
```tsx
// Public marketing routes (before protected routes)
<Route element={<MarketingLayout />}>
  <Route path="/" element={<HomePage />} />
  <Route path="/features" element={<FeaturesPage />} />
  <Route path="/solutions" element={<SolutionsPage />} />
  <Route path="/pricing" element={<PricingPage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/contact" element={<ContactPage />} />
</Route>
```

Update the existing `<Route index>` inside protected routes to point to `/dashboard` instead of relying on the root.

---

*Prompt 001 — Marketing Layout v1.0*
