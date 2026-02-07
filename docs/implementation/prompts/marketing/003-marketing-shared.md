# Prompt 003 — Marketing Shared Section Components

**Agent**: `@frontend`  
**Phase**: 1 — Foundation  
**Dependencies**: 001, 002  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build reusable section-level building blocks used across multiple marketing pages. These are higher-level components that compose the visual effects from Prompt 002 with content patterns.

---

## 📁 Files to Create

```
frontend/src/components/marketing/shared/SectionHeader.tsx
frontend/src/components/marketing/shared/FeatureCard.tsx
frontend/src/components/marketing/shared/LogoCloud.tsx
frontend/src/components/marketing/shared/NewsletterForm.tsx
frontend/src/components/marketing/shared/SectionDivider.tsx
frontend/src/components/marketing/shared/BentoGrid.tsx
frontend/src/components/marketing/shared/IconBadge.tsx
frontend/src/components/marketing/shared/index.ts
```

---

## 📐 Detailed Specifications

### 1. SectionHeader.tsx

**Purpose**: Consistent section title + subtitle used at the top of every major section.

```tsx
interface SectionHeaderProps {
  badge?: string;                 // small pill label above title (e.g., "Features")
  badgeIcon?: React.ReactNode;   // icon inside badge
  title: string;
  titleHighlight?: string;       // portion of title to render in gradient
  subtitle?: string;
  align?: 'left' | 'center';    // default center
  className?: string;
}
```

#### Visual Design
```
         ┌──────────────┐
         │ ✨ Features  │   ← Badge (pill, border-accent/30, bg-accent/10)
         └──────────────┘
    Connect to Any Data Source    ← Title (text-3xl md:text-4xl lg:text-5xl, font-bold)
         in Minutes              ← "in Minutes" in gradient text
    
    Unified connector framework   ← Subtitle (text-lg, text-muted-foreground, max-w-2xl)
    for all your data needs
```

- Badge: `rounded-full` pill with `border border-accent-purple/30 bg-accent-purple/10`
- Title highlight: Wrap highlighted portion in `<span className="text-gradient">`
- Animate in with `TextReveal` (word mode) when `align="center"`
- `whileInView` fade-up for subtitle

### 2. FeatureCard.tsx

**Purpose**: A versatile card for displaying features with icon, title, description, and optional visual.

```tsx
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: 'indigo' | 'purple' | 'cyan' | 'pink' | 'green';
  size?: 'sm' | 'md' | 'lg';
  visual?: React.ReactNode;       // optional illustration/screenshot
  href?: string;                   // optional link
  className?: string;
}
```

#### Size Variants

| Size | Layout | Icon Size | Use Case |
|------|--------|-----------|----------|
| `sm` | Vertical, compact | 40px | Grid of many features |
| `md` | Vertical, standard | 48px | Feature grid |
| `lg` | Horizontal (icon left, content right) | 56px | Feature showcase rows |

#### Visual Design
- Wraps in `<TiltCard>` for 3D hover effect
- Uses `<GlassCard variant="interactive">` as the base
- Icon wrapped in colored rounded-xl background matching `color` prop
- Hover: Card lifts slightly (`y: -4`), glow shadow appears
- If `href` provided, entire card is clickable (wrapped in Link)
- `<GradientBorder>` visible on hover only (opacity transition)

### 3. LogoCloud.tsx

**Purpose**: Displays a row of partner/integration/technology logos with optional auto-scroll.

```tsx
interface LogoCloudProps {
  title?: string;
  logos: Array<{
    name: string;
    icon: React.ReactNode;   // Lucide icon or SVG
    grayscale?: boolean;     // default true, color on hover
  }>;
  variant?: 'static' | 'scroll';  // auto-scrolling marquee or static grid
  className?: string;
}
```

#### Variants

**Static**: Grid of logos, centered, grayscale → color on hover  
**Scroll**: Infinite horizontal marquee animation (CSS `@keyframes marquee`)
- Duplicate logo array to create seamless loop
- `animation: marquee 30s linear infinite`
- Pause on hover (`animation-play-state: paused`)

#### Visual Design
- Logos at ~50% opacity by default, 100% on hover
- Grayscale filter by default, remove on hover
- Hover transition: 300ms
- Spacing: `gap-12` between logos

### 4. NewsletterForm.tsx

**Purpose**: Email capture form with validation and submit animation.

```tsx
interface NewsletterFormProps {
  title?: string;
  subtitle?: string;
  variant?: 'inline' | 'card';   // inline = single row, card = stacked in glass card
  className?: string;
  onSubmit?: (email: string) => void;
}
```

#### Visual Design

**Inline variant**:
```
[📧 Enter your email...          ] [Subscribe →]
```

**Card variant**:
```
┌─ GlassCard ────────────────────┐
│  Stay in the loop              │
│  Get product updates & news    │
│                                │
│  [📧 Enter your email...     ] │
│  [     Subscribe →           ] │
└────────────────────────────────┘
```

- Input: Glass-style input with `bg-bg-tertiary/50 border-border` 
- Button: `variant="gradient"` 
- Validation: Email regex, show error with `text-error` and shake animation
- Success state: Checkmark icon + "You're subscribed!" with confetti-like particle burst
- Use `react-hook-form` + `zod` for validation (already in deps)

### 5. SectionDivider.tsx

**Purpose**: Visual separator between sections with optional decorative elements.

```tsx
interface SectionDividerProps {
  variant?: 'line' | 'gradient' | 'dots' | 'wave';
  className?: string;
}
```

- **line**: Simple `border-t border-border` with `max-w-xs mx-auto`
- **gradient**: Horizontal gradient line (transparent → accent-purple → transparent)
- **dots**: Three small dots (`● ● ●`) centered, muted color
- **wave**: SVG wave shape separator (subtle, low opacity)

### 6. BentoGrid.tsx

**Purpose**: A modern asymmetric grid layout (Bento box style) for showcasing features.

```tsx
interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoGridItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3;      // grid columns to span
  rowSpan?: 1 | 2;           // grid rows to span
  className?: string;
  variant?: 'default' | 'highlight' | 'dark';
}
```

#### Grid Layout (Desktop)
```
┌─────────┬─────────┬─────────┐
│         │         │         │
│  1×1    │  1×1    │  1×2    │
│         │         │         │
├─────────┼─────────┤         │
│         │         │         │
│  2×1    │  1×1    │         │
│         │         ├─────────┤
│         │         │         │
├─────────┼─────────┤  1×1    │
│         │         │         │
│  1×1    │  1×1    │         │
│         │         │         │
└─────────┴─────────┴─────────┘
```

- Base: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Items use `col-span-*` and `row-span-*`
- Each item is a `<GlassCard>` with optional `<GradientBorder>`
- `highlight` variant: Gradient background overlay
- `dark` variant: Deeper background for contrast
- Items animate in with stagger on scroll

### 7. IconBadge.tsx

**Purpose**: Consistent icon wrapper with colored background circle.

```tsx
interface IconBadgeProps {
  icon: React.ReactNode;
  color?: 'indigo' | 'purple' | 'cyan' | 'pink' | 'green';
  size?: 'sm' | 'md' | 'lg';   // 32px, 48px, 64px
  glow?: boolean;
  className?: string;
}
```

- Renders `icon` inside a `rounded-xl` container
- Background: `bg-{color}/10`
- Icon color: `text-{color}`
- `glow`: Adds `shadow-glow-sm` matching the color
- Size maps to both container and icon dimensions

---

## 🎨 Animation Guidelines

All section components should:
1. **Animate on scroll**: Use `whileInView` with `viewport={{ once: true, margin: '-100px' }}`
2. **Stagger children**: Use `staggerContainerVariants` from `@/lib/motion-variants`
3. **Respect reduced motion**: Skip animations if `prefers-reduced-motion`
4. **Be lazy-friendly**: Components should render correctly before animation triggers

---

## ♿ Accessibility

- `SectionHeader`: Use semantic heading tags based on `as` prop
- `FeatureCard`: If clickable, ensure focus ring and keyboard navigation
- `LogoCloud`: `alt` text for all logos; marquee has `aria-hidden="true"` duplicate
- `NewsletterForm`: `<label>`, `aria-invalid`, `aria-describedby` for errors
- `BentoGrid`: Use CSS Grid with proper `role="list"` / `role="listitem"` if content is list-like
- All decorative SVGs: `aria-hidden="true"`

---

## 🧪 Acceptance Criteria

- [ ] SectionHeader renders badge, title with gradient highlight, and subtitle
- [ ] FeatureCard renders in all 3 sizes with tilt effect
- [ ] LogoCloud scrolls infinitely in `scroll` variant
- [ ] NewsletterForm validates email and shows success state
- [ ] SectionDivider renders all 4 variants
- [ ] BentoGrid lays out items in asymmetric grid on desktop
- [ ] IconBadge renders all color variants with optional glow
- [ ] All components animate on scroll into view
- [ ] All components export from barrel index

---

*Prompt 003 — Marketing Shared Components v1.0*
