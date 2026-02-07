# Prompt 002 — Marketing Visual Effects Components

**Agent**: `@frontend`  
**Phase**: 1 — Foundation  
**Dependencies**: 001 (MarketingLayout exists)  
**Estimated Effort**: Medium-High  

---

## 🎯 Objective

Build a library of reusable visual effects components that give the marketing pages their futuristic, eye-catching character. These are the "wow factor" building blocks used across all marketing sections.

---

## 📁 Files to Create

```
frontend/src/components/marketing/effects/GlowOrb.tsx
frontend/src/components/marketing/effects/MagneticButton.tsx
frontend/src/components/marketing/effects/ParallaxLayer.tsx
frontend/src/components/marketing/effects/TextReveal.tsx
frontend/src/components/marketing/effects/TiltCard.tsx
frontend/src/components/marketing/effects/GradientBorder.tsx
frontend/src/components/marketing/effects/FloatingElements.tsx
frontend/src/components/marketing/effects/TypewriterText.tsx
frontend/src/components/marketing/effects/CountUp.tsx
frontend/src/components/marketing/effects/index.ts
```

---

## 📐 Detailed Specifications

### 1. GlowOrb.tsx

**Purpose**: Floating gradient blur orbs that create atmospheric depth in backgrounds.

```tsx
interface GlowOrbProps {
  color: 'purple' | 'cyan' | 'pink' | 'indigo' | 'green';
  size?: 'sm' | 'md' | 'lg' | 'xl';  // 200px, 400px, 600px, 800px
  position?: { top?: string; left?: string; right?: string; bottom?: string };
  intensity?: number;    // opacity 0–1, default 0.15
  animate?: boolean;     // slow drift animation, default true
  blur?: number;         // blur radius in px, default 120
}
```

- Renders a `div` with `rounded-full`, background color from palette, Gaussian blur
- When `animate=true`, uses framer-motion with a slow, organic drift:
  - `x`: oscillates ±30px over 15–20s
  - `y`: oscillates ±20px over 12–18s
  - `scale`: oscillates between 0.9–1.1 over 10–15s
  - All with different durations for organic feel
- `pointer-events-none` and `absolute` positioning
- Must respect `prefers-reduced-motion` — no animation if reduced

### 2. MagneticButton.tsx

**Purpose**: A button that subtly follows the cursor when hovering, creating a "magnetic" pull effect.

```tsx
interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;     // magnetic pull strength, default 0.3
  variant?: 'gradient' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;        // glow effect on hover
  asChild?: boolean;     // Radix Slot pattern for Link wrapping
}
```

- Track mouse position relative to button center using `onMouseMove`
- Apply `transform: translate(deltaX * strength, deltaY * strength)` with spring physics
- On `onMouseLeave`, spring back to center
- Use `framer-motion` `useMotionValue` and `useSpring` for smooth physics
- Glow: On hover, add `shadow-glow-md` with button's accent color
- Must be keyboard-accessible (no transform on keyboard focus)

### 3. ParallaxLayer.tsx

**Purpose**: Wraps content to create depth-based parallax scrolling effects.

```tsx
interface ParallaxLayerProps {
  children: React.ReactNode;
  speed?: number;       // parallax speed multiplier (-1 to 1), default 0.1
  direction?: 'vertical' | 'horizontal';
  className?: string;
}
```

- Uses `framer-motion` `useScroll` and `useTransform`
- Translates content based on scroll position × speed
- Negative speed = moves opposite to scroll (foreground feel)
- Positive speed = moves slower than scroll (background feel)
- Disable for `prefers-reduced-motion`

### 4. TextReveal.tsx

**Purpose**: Text that reveals character-by-character or word-by-word as it scrolls into view.

```tsx
interface TextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  mode?: 'char' | 'word' | 'line';   // granularity of reveal
  delay?: number;                      // stagger delay between units
  className?: string;
  gradient?: boolean;                  // apply gradient color to text
  once?: boolean;                      // animate only once, default true
}
```

- Splits text into spans based on mode
- Each unit animates from `opacity: 0, y: 20` to `opacity: 1, y: 0`
- Uses `whileInView` with stagger children
- `gradient` mode applies `text-gradient` class with clip-path animation
- Preserve spaces between words (use `&nbsp;` or `white-space: pre-wrap`)

### 5. TiltCard.tsx

**Purpose**: A card that tilts in 3D toward the cursor on hover, with a light reflection effect.

```tsx
interface TiltCardProps {
  children: React.ReactNode;
  maxTilt?: number;       // max tilt in degrees, default 10
  glare?: boolean;        // light reflection effect, default true
  glareOpacity?: number;  // max glare opacity, default 0.15
  scale?: number;         // scale on hover, default 1.02
  className?: string;
}
```

- Track cursor position relative to card center
- Apply `rotateX` and `rotateY` transforms using `perspective(1000px)`
- Glare: A `div` overlay with a radial gradient that follows cursor position
  - `background: radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,glareOpacity), transparent 60%)`
- On `onMouseLeave`, spring back to flat with damping
- Add `transform-style: preserve-3d` for child depth
- Disable tilt for `prefers-reduced-motion`, keep hover scale only

### 6. GradientBorder.tsx

**Purpose**: A wrapper that applies an animated gradient border around its children.

```tsx
interface GradientBorderProps {
  children: React.ReactNode;
  gradient?: string;      // CSS gradient, default gradient-neon
  width?: number;         // border width in px, default 1
  radius?: string;        // border-radius, default 'xl'
  animate?: boolean;      // rotating gradient, default true
  className?: string;
}
```

- Implementation technique: Outer div with gradient background, inner div with solid background, `padding` = border width
- Animated: Rotate the gradient using `@keyframes gradient-rotate` (background-position shift)
- Static: Just display the gradient border
- Both inner and outer get matching `border-radius`

### 7. FloatingElements.tsx

**Purpose**: Decorative floating geometric shapes (circles, hexagons, triangles) for backgrounds.

```tsx
interface FloatingElementsProps {
  count?: number;         // number of shapes, default 6
  shapes?: ('circle' | 'hexagon' | 'triangle' | 'square' | 'ring')[];
  colors?: string[];      // tailwind color classes
  area?: { width: string; height: string };  // constraint area
  className?: string;
}
```

- Generate `count` shapes with random positions, sizes (8–40px), and rotations
- Each shape has a unique `float` animation with different duration (8–20s) and delay
- Shapes are rendered as SVG or styled divs
- Very low opacity (0.1–0.3) so they serve as subtle background decoration
- `pointer-events-none`, `absolute` positioning
- Use `useMemo` to generate stable random values (seeded or on mount)

### 8. TypewriterText.tsx

**Purpose**: Text that types out character by character with a blinking cursor.

```tsx
interface TypewriterTextProps {
  texts: string[];        // array of strings to cycle through
  typingSpeed?: number;   // ms per character, default 50
  deletingSpeed?: number; // ms per character delete, default 30
  pauseDuration?: number; // ms to pause after full text, default 2000
  className?: string;
  cursorColor?: string;   // default accent-purple
  loop?: boolean;         // cycle through texts, default true
}
```

- Type out first text, pause, delete, type next text, repeat
- Blinking cursor (vertical bar) with `ai-pulse` animation or simple blink
- Use `useEffect` with `setTimeout` chain (not `setInterval`)
- Clean up timeouts on unmount
- If single text and `loop=false`, type once and keep cursor blinking

### 9. CountUp.tsx

**Purpose**: Animated counter that counts from 0 to a target number when scrolled into view.

```tsx
interface CountUpProps {
  end: number;
  start?: number;          // default 0
  duration?: number;       // ms, default 2000
  prefix?: string;         // e.g., "$"
  suffix?: string;         // e.g., "+"
  decimals?: number;       // decimal places
  separator?: string;      // thousands separator, default ","
  className?: string;
  once?: boolean;          // count only once, default true
}
```

- Use `useInView` (framer-motion) to trigger
- Easing: `easeOut` curve for natural deceleration
- Use `requestAnimationFrame` for smooth animation
- Format with thousands separator and decimals
- Display `prefix + formatted_number + suffix`

---

## 🎨 Visual Guidelines

- All effects must be **subtle and purposeful** — never distracting
- Performance: Use `will-change: transform` only during animation, remove after
- GPU acceleration: Use `transform` and `opacity` only (no layout-triggering properties)
- Every component must handle `prefers-reduced-motion: reduce`:
  ```tsx
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ```

---

## ♿ Accessibility

- All decorative elements: `aria-hidden="true"`, `role="presentation"`
- MagneticButton: Must remain fully keyboard-accessible
- TypewriterText: Provide `aria-label` with complete text for screen readers
- CountUp: Use `aria-live="polite"` for dynamic number updates
- TextReveal: Full text accessible to screen readers regardless of animation state

---

## 🧪 Acceptance Criteria

- [ ] GlowOrb renders and drifts smoothly without jank
- [ ] MagneticButton follows cursor and springs back
- [ ] ParallaxLayer creates visible depth effect on scroll
- [ ] TextReveal triggers on scroll into view
- [ ] TiltCard tilts toward cursor with glare reflection
- [ ] GradientBorder displays animated rotating border
- [ ] FloatingElements renders random shapes that float
- [ ] TypewriterText cycles through texts with cursor
- [ ] CountUp counts from 0 to target on scroll
- [ ] All effects disabled under `prefers-reduced-motion`
- [ ] No dropped frames (60fps target) on mid-range hardware
- [ ] All components export from barrel index

---

*Prompt 002 — Marketing Effects v1.0*
