# Prompt 009 — Solutions Page (Use Cases & Industries)

**Agent**: `@frontend`  
**Phase**: 3 — Inner Pages  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build a solutions page that maps NovaSight's capabilities to specific industries and use cases. This helps prospects self-identify and see how the platform solves their specific problems.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/SolutionsPage.tsx
frontend/src/components/marketing/sections/UseCaseCard.tsx
frontend/src/components/marketing/sections/IndustrySection.tsx
```

---

## 📐 Page Structure

```
1. Hero Banner
   "Built for Every Data Challenge"
   "From startups to enterprises, NovaSight adapts to your industry"

2. Industry Solutions (tab or card grid)
   - Financial Services
   - Healthcare & Life Sciences
   - E-Commerce & Retail
   - SaaS & Technology
   - Manufacturing & IoT

3. Use Case Spotlights (detailed)
   - Real-time Analytics Dashboard
   - Automated ETL Pipelines
   - AI-Powered Data Exploration
   - Multi-tenant Data Platform

4. Customer Journey
   Visual timeline: Day 1 → Week 1 → Month 1 → Month 3

5. CTA Section
```

---

## 📐 Detailed Specifications

### Industry Solutions

Each industry card:
```tsx
interface IndustrySolution {
  industry: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
  challenges: string[];
  solutions: string[];
  keyMetric: { value: string; label: string };
}
```

#### Industries Data

**Financial Services** (color: indigo)
- Challenges: Regulatory compliance, data silos, real-time reporting
- Solutions: Multi-tenant isolation, audit trails, sub-second dashboards
- Key metric: "10x faster" compliance reporting

**Healthcare & Life Sciences** (color: green)
- Challenges: PHI data security, research analytics, cross-system data
- Solutions: Encrypted connections, semantic layer, self-service analytics
- Key metric: "80% less" time from data to insight

**E-Commerce & Retail** (color: pink)
- Challenges: Customer 360, inventory analytics, seasonal scaling
- Solutions: Multi-source connectors, automated pipelines, AI queries
- Key metric: "24/7" real-time analytics

**SaaS & Technology** (color: cyan)
- Challenges: Product analytics, customer churn, usage metrics
- Solutions: ClickHouse performance, dbt models, dashboard builder
- Key metric: "<1 second" query latency

**Manufacturing & IoT** (color: purple)
- Challenges: Sensor data volume, predictive insights, operational dashboards
- Solutions: PySpark compute, streaming ingestion, KPI alerts
- Key metric: "Millions" of data points per second

#### Visual Design
- Cards laid out in a responsive grid with `<TiltCard>` hover effects
- Each card: Glass morphism, icon badge, industry name, tagline
- Click/expand: Reveals challenges → solutions mapping with connecting arrows
- Key metric: Large gradient number with label below

### Use Case Spotlights

4 detailed use case sections, each with:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  [Badge: Use Case]                              │
│  Title: "Real-time Analytics Dashboard"         │
│                                                 │
│  ┌──────────────┐  ┌───────────────────────┐   │
│  │ THE PROBLEM  │  │ THE SOLUTION          │   │
│  │              │  │                       │   │
│  │ Pain point   │  │ How NovaSight solves  │   │
│  │ description  │  │ this with specific    │   │
│  │              │  │ features              │   │
│  └──────────────┘  └───────────────────────┘   │
│                                                 │
│  [Visual: Before/After or workflow diagram]     │
│                                                 │
│  Results: [Metric 1] [Metric 2] [Metric 3]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Problem card: Darker background, subtle red-tinted border
- Solution card: Glass morphism, green-tinted accent
- Visual: Split comparison or flow diagram
- Results: 3 CountUp metrics below

### Customer Journey Timeline

```
  Day 1              Week 1            Month 1           Month 3
    🔌                 ⚙️                📊                🚀
  Connect           Build             Launch            Scale
  your data         pipelines         dashboards        & optimize
  sources           & models          & share           with AI

  ──────●──────────────●──────────────●──────────────●──────→
```

- Horizontal timeline with animated connecting line
- Each milestone: Circle node → icon → title → description
- Line draws itself on scroll
- Dots pulse when active
- Mobile: Vertical timeline

---

## 🧪 Acceptance Criteria

- [ ] Hero renders with subtitle
- [ ] 5 industry solution cards render with expand interaction
- [ ] 4 use case spotlights render with problem/solution layout
- [ ] Customer journey timeline animates on scroll
- [ ] Responsive at all breakpoints
- [ ] Each industry card shows key metric
- [ ] CTA section renders at bottom

---

*Prompt 009 — Solutions Page v1.0*
