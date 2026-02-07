# Prompt 005 — Homepage Features Showcase

**Agent**: `@frontend`  
**Phase**: 2 — Homepage  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium-High  

---

## 🎯 Objective

Build the features section of the homepage that demonstrates NovaSight's core capabilities through interactive, visually rich showcases. This section should convince visitors that NovaSight is a comprehensive, modern platform.

---

## 📁 Files to Create

```
frontend/src/components/marketing/sections/FeatureShowcase.tsx
frontend/src/components/marketing/sections/BentoFeatures.tsx
frontend/src/components/marketing/sections/TechStackVisual.tsx
frontend/src/components/marketing/sections/HowItWorks.tsx
frontend/src/components/marketing/sections/index.ts
```

---

## 📐 Detailed Specifications

### 1. FeatureShowcase.tsx

**Purpose**: Alternating left-right feature rows with interactive visuals.

#### Layout Pattern (Desktop)
```
Section 1: [Visual ←→ Content]     (visual left, text right)
Section 2: [Content ←→ Visual]     (text left, visual right)
Section 3: [Visual ←→ Content]     (alternating)
Section 4: [Content ←→ Visual]     (alternating)
```

#### Features to Showcase

**Feature 1: Data Connections**
```
Icon:       Database (Lucide)
Color:      accent-indigo
Title:      "Connect to Any Data Source"
Subtitle:   "in Seconds"  (gradient text)
Description: "PostgreSQL, MySQL, ClickHouse, MongoDB, REST APIs, CSV files — 
              our unified connector framework handles them all with zero-code 
              configuration and real-time schema introspection."
Visual:     Animated connection diagram
            - Center: NovaSight logo orb (pulsing)
            - Around it: 6-8 database icons orbiting in a circle
            - Lines connecting each to center with flowing data particles
            - Use SVG + CSS animations
Bullets:
  - "20+ database connectors"
  - "Real-time schema detection"
  - "Encrypted credential vault"
CTA:        "Explore Connectors →" → /features#connections
```

**Feature 2: Pipeline Orchestration**
```
Icon:       GitBranch (Lucide)
Color:      neon-green
Title:      "Visual Pipeline Builder"
Subtitle:   "No Code Required"  (gradient text)
Description: "Design complex data workflows with our drag-and-drop DAG builder. 
              Schedule, monitor, and debug — all from a beautiful interface 
              powered by Apache Airflow."
Visual:     Mini DAG builder mockup
            - 4-5 connected nodes in a flow (glassmorphism cards)
            - Animated flowing lines between nodes (dashed, glowing)
            - Status indicators (green checkmarks, spinning loader)
Bullets:
  - "Drag-and-drop DAG builder"
  - "Cron & event-driven scheduling"
  - "Real-time pipeline monitoring"
CTA:        "See Orchestration →" → /features#orchestration
```

**Feature 3: AI-Powered Analytics**
```
Icon:       Bot (Lucide)
Color:      accent-purple
Title:      "Ask Your Data Anything"
Subtitle:   "in Plain English"  (gradient text)
Description: "Our local AI assistant understands your data schema and translates
              natural language into optimized SQL. No LLM data leaves your 
              infrastructure — complete privacy guaranteed."
Visual:     Chat interface mockup
            - Glass card chat window
            - User message: "Show me revenue by region for Q4"
            - AI response with typing animation: SQL code block + mini chart
            - Subtle AI glow effect around the chat window
Bullets:
  - "Natural language to SQL"
  - "100% local LLM — no data leaves"
  - "Schema-aware responses"
CTA:        "Try AI Assistant →" → /features#ai
```

**Feature 4: Interactive Dashboards**
```
Icon:       BarChart3 (Lucide)
Color:      neon-cyan
Title:      "Dashboards That Tell Stories"
Subtitle:   "Drag. Drop. Discover."  (gradient text)
Description: "Build stunning interactive dashboards with our drag-and-drop builder.
              Real-time data, sub-second queries powered by ClickHouse, and 
              beautiful visualizations your stakeholders will love."
Visual:     Dashboard builder mockup
            - Grid layout with 3-4 chart cards (bar, line, donut, metric)
            - Subtle animation: bars growing, line drawing, number counting
            - Drag handle indicators on cards
Bullets:
  - "Drag-and-drop dashboard builder"
  - "15+ chart types"
  - "Sub-second query performance"
CTA:        "Build Dashboards →" → /features#dashboards
```

#### Component Props
```tsx
interface FeatureShowcaseProps {
  features?: FeatureShowcaseItem[];   // override default features
  className?: string;
}

interface FeatureShowcaseItem {
  icon: LucideIcon;
  color: string;
  title: string;
  titleHighlight: string;
  description: string;
  bullets: string[];
  cta: { text: string; href: string };
  visual: React.ReactNode;
  reversed?: boolean;
}
```

#### Animation
- Each feature row animates in on scroll (`whileInView`)
- Content side: Stagger fade-up for title → description → bullets → CTA
- Visual side: Scale up from 0.9 with fade
- `<SectionDivider variant="gradient" />` between features

---

### 2. BentoFeatures.tsx

**Purpose**: A Bento grid overview of secondary features/capabilities.

#### Layout
```
┌────────────────┬────────────────┬────────────────┐
│                │                │                │
│  🔒 Security  │  📊 Semantic   │                │
│  Multi-tenant  │  Layer         │  ⚡ ClickHouse │
│  isolation     │  dbt models    │  Sub-second    │
│                │                │  analytics     │
├────────────────┼────────────────┤  (tall card)   │
│                │                │                │
│  🔄 Templates │  📋 Governance │                │
│  No arbitrary  │  Audit logs    │                │
│  code          │  & compliance  │                │
│                │                │                │
└────────────────┴────────────────┴────────────────┘
```

Each cell is a `<BentoGrid.Item>` with:
- `<IconBadge>` for the icon
- Title + short description
- Subtle background illustration or pattern unique to each
- On hover: card lifts, glow appears, icon color intensifies

#### Features to Display
1. **Security & Isolation** (indigo) — Multi-tenant RBAC with complete data isolation
2. **Semantic Layer** (purple) — dbt-powered semantic models for consistent metrics  
3. **Blazing Performance** (cyan, col-span-1 row-span-2) — ClickHouse-powered sub-second queries
4. **Template Engine** (green) — Secure code generation from pre-approved templates
5. **Governance** (pink) — Complete audit trail and compliance tooling

---

### 3. TechStackVisual.tsx

**Purpose**: Interactive visualization of the NovaSight technology stack.

#### Design: Layered Architecture Diagram
```
┌─────────────────────────────────────────────────┐
│  PRESENTATION       React · TypeScript          │  ← Layer 1 (top)
├─────────────────────────────────────────────────┤
│  API                Flask · REST · Auth         │  ← Layer 2
├─────────────────────────────────────────────────┤
│  COMPUTE            PySpark · dbt               │  ← Layer 3
├─────────────────────────────────────────────────┤
│  ORCHESTRATION      Apache Airflow              │  ← Layer 4
├─────────────────────────────────────────────────┤
│  STORAGE            ClickHouse · PostgreSQL     │  ← Layer 5 (bottom)
├─────────────────────────────────────────────────┤
│  AI                 Ollama (Local LLM)          │  ← Layer 6 (side)
└─────────────────────────────────────────────────┘
```

#### Interactions
- Each layer is a glass card that expands on hover/click to show details
- Hover: Layer glows with its accent color, related layers dim slightly
- Click: Expandable panel with tech details, version, and why it was chosen
- Animated connection lines between layers (vertical flowing particles)
- Each tech logo/icon beside its name

#### Animation
- Layers build up from bottom on scroll (like constructing a stack)
- Stagger delay: 150ms between layers
- Connection lines animate after all layers visible

---

### 4. HowItWorks.tsx

**Purpose**: Step-by-step visual journey showing the NovaSight workflow.

#### Steps
```
Step 1: Connect        Step 2: Transform      Step 3: Model         Step 4: Visualize
   🔌                     ⚙️                     📐                    📊
   
Configure your        Build automated        Create semantic       Build interactive
data sources          pipelines              models & KPIs         dashboards
```

#### Design
- Horizontal timeline on desktop (vertical on mobile)
- Each step: Numbered circle (gradient border) → Icon → Title → Description
- Connecting line between steps with animated flowing dots (left to right)
- Active/hover state: Step card expands slightly, glows
- Numbers: Large, gradient-filled, behind the step content (watermark style)

#### Animation
- Steps appear sequentially on scroll with stagger
- Connecting line draws itself between steps
- Dots flow along the line continuously after draw

---

## 📱 Responsive Behavior

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| FeatureShowcase | Stacked (visual above text), visual at 100% width | Stacked but wider | Side-by-side, alternating |
| BentoFeatures | Single column stack | 2-column grid | 3-column bento |
| TechStackVisual | Stacked cards (no expand) | Stacked with expand | Full layered diagram |
| HowItWorks | Vertical timeline | Vertical timeline | Horizontal timeline |

---

## 🧪 Acceptance Criteria

- [ ] FeatureShowcase renders 4 features with alternating layout
- [ ] Each feature visual is animated and interactive
- [ ] BentoFeatures displays asymmetric grid with hover effects
- [ ] TechStackVisual shows all 6 layers with hover interaction
- [ ] HowItWorks shows 4 steps with connecting animated line
- [ ] All sections animate on scroll into view
- [ ] Responsive at all breakpoints
- [ ] Feature visuals are lightweight (no heavy images, CSS/SVG only)
- [ ] All components export from barrel index

---

*Prompt 005 — Homepage Features v1.0*
