# Prompt 008 — Features Page (Deep Dive)

**Agent**: `@frontend`  
**Phase**: 3 — Inner Pages  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: High  

---

## 🎯 Objective

Build a comprehensive features page that provides deep-dive details on every NovaSight capability. This is the page prospects visit after the homepage hooks them — it must be thorough, visually engaging, and scannable.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/FeaturesPage.tsx
frontend/src/components/marketing/sections/FeatureDeepDive.tsx
frontend/src/components/marketing/sections/FeatureTabView.tsx
```

---

## 📐 Detailed Specifications

### Page Structure

```
1. Hero Banner (compact)
   "Everything You Need to Master Your Data"
   Sub-nav anchors: [Connections] [Pipelines] [Analytics] [AI] [Security] [Admin]
   
2. Sub-nav (sticky, scrollspy)
   Highlights active section based on scroll position

3. Feature Deep Dives (one per capability)
   3a. Data Connections
   3b. Pipeline Orchestration  
   3c. Dashboard & Analytics
   3d. AI Assistant & NL2SQL
   3e. Security & Multi-Tenancy
   3f. Admin & Governance

4. Integration Ecosystem
   Grid of all supported integrations

5. CTA Section
   "See It in Action — Start Free Trial"
```

### Hero Banner

- Compact hero (not full viewport): `py-16 md:py-24`
- Background: `<GridBackground>` + single `<GlowOrb>`
- Title: "Everything You Need to" (default) + "Master Your Data" (gradient)
- Sub-text: "Explore our complete platform capabilities"

### Sticky Sub-Nav (ScrollSpy)

```tsx
const sections = [
  { id: 'connections', label: 'Connections', icon: Database },
  { id: 'pipelines', label: 'Pipelines', icon: GitBranch },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'admin', label: 'Admin', icon: Settings },
];
```

- Horizontal scrollable on mobile
- Sticky below navbar on scroll
- Active section highlighted with gradient underline + bold text
- Uses `IntersectionObserver` to detect active section
- Glass morphism background when sticky

### Feature Deep Dives

Each feature section follows this template:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [SectionHeader with badge, title, subtitle]                │
│                                                             │
│  ┌─── Tab View (if multiple sub-features) ──────────────┐  │
│  │  [Tab 1] [Tab 2] [Tab 3]                             │  │
│  │                                                       │  │
│  │  ┌──────────────────┬─────────────────────────────┐  │  │
│  │  │                  │                             │  │  │
│  │  │  Feature details │  Interactive Visual /       │  │  │
│  │  │  • Bullet 1      │  Screenshot mockup          │  │  │
│  │  │  • Bullet 2      │                             │  │  │
│  │  │  • Bullet 3      │                             │  │  │
│  │  │                  │                             │  │  │
│  │  │  [Learn More →]  │                             │  │  │
│  │  │                  │                             │  │  │
│  │  └──────────────────┴─────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Key Metrics:  [20+ Connectors]  [Real-time]  [Zero-code]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3a. Data Connections Section

**Badge**: "🔌 Data Connections"  
**Title**: "Connect to Any Data Source" + " in Seconds" (gradient)  

**Tabs**:
1. **Database Connectors** — PostgreSQL, MySQL, ClickHouse, MongoDB, MSSQL, Oracle
   - Visual: Grid of database logos with connection status indicators
   - Key points: Zero-code config, encrypted credentials, connection pooling

2. **Schema Introspection** — Auto-detect tables, columns, types
   - Visual: Animated tree view showing schema discovery in real-time
   - Key points: Automatic type mapping, relationship detection, metadata sync

3. **Connection Testing** — Validate before deploy
   - Visual: Connection test flow with progress steps and green checkmarks
   - Key points: Connectivity validation, permission checking, latency measurement

**Bottom metrics**: `20+ connectors` | `Real-time sync` | `Encrypted vault`

#### 3b. Pipeline Orchestration Section

**Badge**: "⚙️ Orchestration"  
**Title**: "Visual Pipeline Builder" + " — No Code Required" (gradient)  

**Tabs**:
1. **DAG Builder** — Drag-and-drop workflow designer
   - Visual: Mini DAG editor mockup with nodes and edges
2. **Scheduling** — Cron, event triggers, dependencies
   - Visual: Calendar/timeline view with scheduled runs
3. **Monitoring** — Real-time status, logs, alerts
   - Visual: Pipeline run history with status bars (green/yellow/red)

#### 3c. Dashboard & Analytics Section

**Badge**: "📊 Analytics"  
**Title**: "Dashboards That" + " Tell Stories" (gradient)  

**Tabs**:
1. **Dashboard Builder** — Drag-and-drop layout with live data
2. **SQL Editor** — Full-featured query interface
3. **Chart Library** — 15+ visualization types
4. **Semantic Layer** — dbt-powered consistent metrics

#### 3d. AI Assistant Section

**Badge**: "🤖 AI Assistant"  
**Title**: "Ask Your Data" + " Anything" (gradient)  

**Tabs**:
1. **Natural Language Queries** — Chat-style interface
2. **Schema Awareness** — AI understands your data model
3. **Privacy First** — 100% local Ollama deployment

**Special visual**: Animated chat mockup with typing indicators

#### 3e. Security & Multi-Tenancy Section

**Badge**: "🔒 Security"  
**Title**: "Enterprise-Grade" + " Security" (gradient)  

No tabs — single comprehensive view:
- RBAC hierarchy diagram
- Tenant isolation visual (separated data silos)
- Template engine rule callout (emphasized)
- Encryption at rest + in transit badges

#### 3f. Admin & Governance Section

**Badge**: "⚙️ Governance"  
**Title**: "Complete Control" + " & Visibility" (gradient)  

- Audit logging
- User management
- Quota management
- Compliance tooling

### Integration Ecosystem

Grid of all supported technologies/integrations:
- 4-column grid of integration cards
- Each: Logo + Name + Category badge
- Categories: Databases, Cloud, APIs, File Formats
- Filterable by category
- Hover: Card glows with category color

### FeatureTabView.tsx

Reusable tab component for feature sections:
```tsx
interface FeatureTabViewProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
    visual: React.ReactNode;
  }>;
  reversed?: boolean;  // visual on left vs right
}
```
- Uses Radix `<Tabs>` for accessibility
- Tab content transitions with AnimatePresence (crossfade)
- Active tab has gradient underline

---

## 📱 Responsive

- Sticky sub-nav: Horizontal scroll on mobile
- Tab views: Stack vertically on mobile (content above visual)
- Integration grid: 2 columns on mobile, 4 on desktop

---

## 🧪 Acceptance Criteria

- [ ] Page loads with compact hero and sticky sub-nav
- [ ] ScrollSpy correctly highlights active section
- [ ] All 6 feature deep-dives render with tabs and visuals
- [ ] Tab switching is animated and accessible (keyboard)
- [ ] Integration ecosystem grid renders with filtering
- [ ] Responsive at all breakpoints
- [ ] Each section linkable via hash (#connections, #ai, etc.)
- [ ] CTA section at bottom

---

*Prompt 008 — Features Page v1.0*
