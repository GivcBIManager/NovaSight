# NovaSight Color Token Reference v2.0

> Single source of truth for all colors in the NovaSight frontend.
> **DO NOT add hardcoded hex/rgb/hsl values in components.** Use these tokens instead.

---

## Architecture Overview

```
design-tokens.css          ← CSS custom properties (single truth)
       ↓
tailwind.config.js         ← Maps CSS vars → Tailwind utility classes
       ↓
index.css                  ← Shadcn UI compatibility aliases
       ↓
lib/colors.ts              ← JS/TS hex constants for charts / canvas / SVG
```

- **In JSX/Tailwind**: Use `className="text-primary-500 bg-success-100"` etc.
- **In Recharts/D3/canvas**: Import from `@/lib/colors` (`palette`, `CHART_COLORS`, etc.)
- **For status badges**: Use `getStatusClasses()`, `getRoleClasses()`, `getPlanClasses()`, etc.

---

## Color Families

### Primary (Blue) — Brand identity, main CTA, navigation
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `primary-50` | `--color-primary-50` | `#eff6ff` | Lightest tint backgrounds |
| `primary-100` | `--color-primary-100` | `#dbeafe` | Badge backgrounds (light mode) |
| `primary-200` | `--color-primary-200` | `#bfdbfe` | Borders, dividers |
| `primary-300` | `--color-primary-300` | `#93c5fd` | Hover states |
| `primary-400` | `--color-primary-400` | `#60a5fa` | Icons, accents |
| `primary-500` | `--color-primary-500` | `#3b82f6` | **Main brand color** |
| `primary-600` | `--color-primary-600` | `#2563eb` | Button backgrounds |
| `primary-700` | `--color-primary-700` | `#1d4ed8` | Active/pressed states |
| `primary-800` | `--color-primary-800` | `#1e40af` | Badge text (light mode) |
| `primary-900` | `--color-primary-900` | `#1e3a8a` | Deep backgrounds |
| `primary-950` | `--color-primary-950` | `#172554` | Badge backgrounds (dark mode) |

### Secondary (Cyan) — Positive metrics, complementary
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `secondary-50` | `--color-secondary-50` | `#ecfeff` | Lightest tint |
| `secondary-100` | `--color-secondary-100` | `#cffafe` | Badge backgrounds |
| `secondary-200` | `--color-secondary-200` | `#a5f3fc` | Borders |
| `secondary-300` | `--color-secondary-300` | `#67e8f9` | Text (dark mode badges) |
| `secondary-400` | `--color-secondary-400` | `#22d3ee` | Icons |
| `secondary-500` | `--color-secondary-500` | `#06b6d4` | **Main secondary** |
| `secondary-600` | `--color-secondary-600` | `#0891b2` | Active states |
| `secondary-700` | `--color-secondary-700` | `#0e7490` | Deep tones |
| `secondary-800` | `--color-secondary-800` | `#155e75` | Badge text (light mode) |
| `secondary-900` | `--color-secondary-900` | `#164e63` | Dark backgrounds |
| `secondary-950` | `--color-secondary-950` | `#083344` | Badge backgrounds (dark mode) |

### Accent (Violet) — AI features, premium, creative
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `accent-50` | `--color-accent-50` | `#f5f3ff` | Lightest tint |
| `accent-100` | `--color-accent-100` | `#ede9fe` | Badge backgrounds |
| `accent-200` | `--color-accent-200` | `#ddd6fe` | Borders |
| `accent-300` | `--color-accent-300` | `#c4b5fd` | Text (dark mode badges) |
| `accent-400` | `--color-accent-400` | `#a78bfa` | Icons |
| `accent-500` | `--color-accent-500` | `#8b5cf6` | **Main accent** |
| `accent-600` | `--color-accent-600` | `#7c3aed` | Active states |
| `accent-700` | `--color-accent-700` | `#6d28d9` | Deep tones |
| `accent-800` | `--color-accent-800` | `#5b21b6` | Badge text (light mode) |
| `accent-900` | `--color-accent-900` | `#4c1d95` | Dark backgrounds |
| `accent-950` | `--color-accent-950` | `#2e1065` | Badge backgrounds (dark mode) |

### Success (Emerald) — Active, completed, healthy, running
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `success-50` | `--color-success-50` | `#ecfdf5` | Lightest tint |
| `success-100` | `--color-success-100` | `#d1fae5` | Badge backgrounds |
| `success-200` | `--color-success-200` | `#a7f3d0` | Borders |
| `success-300` | `--color-success-300` | `#6ee7b7` | Text (dark mode badges) |
| `success-400` | `--color-success-400` | `#34d399` | Icons |
| `success-500` | `--color-success-500` | `#10b981` | **Main success** |
| `success-600` | `--color-success-600` | `#059669` | Active states |
| `success-700` | `--color-success-700` | `#047857` | Deep tones |
| `success-800` | `--color-success-800` | `#065f46` | Badge text (light mode) |
| `success-900` | `--color-success-900` | `#064e3b` | Dark backgrounds |
| `success-950` | `--color-success-950` | `#022c22` | Badge backgrounds (dark mode) |

### Warning (Amber) — Paused, pending, queued, degraded
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `warning-50` | `--color-warning-50` | `#fffbeb` | Lightest tint |
| `warning-100` | `--color-warning-100` | `#fef3c7` | Badge backgrounds |
| `warning-200` | `--color-warning-200` | `#fde68a` | Borders |
| `warning-300` | `--color-warning-300` | `#fcd34d` | Text (dark mode badges) |
| `warning-400` | `--color-warning-400` | `#fbbf24` | Icons |
| `warning-500` | `--color-warning-500` | `#f59e0b` | **Main warning** |
| `warning-600` | `--color-warning-600` | `#d97706` | Active states |
| `warning-700` | `--color-warning-700` | `#b45309` | Deep tones |
| `warning-800` | `--color-warning-800` | `#92400e` | Badge text (light mode) |
| `warning-900` | `--color-warning-900` | `#78350f` | Dark backgrounds |
| `warning-950` | `--color-warning-950` | `#451a03` | Badge backgrounds (dark mode) |

### Danger (Red) — Errors, failures, deletions, locked
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `danger-50` | `--color-danger-50` | `#fef2f2` | Lightest tint |
| `danger-100` | `--color-danger-100` | `#fee2e2` | Badge backgrounds |
| `danger-200` | `--color-danger-200` | `#fecaca` | Borders |
| `danger-300` | `--color-danger-300` | `#fca5a5` | Text (dark mode badges) |
| `danger-400` | `--color-danger-400` | `#f87171` | Icons |
| `danger-500` | `--color-danger-500` | `#ef4444` | **Main danger** |
| `danger-600` | `--color-danger-600` | `#dc2626` | Active states |
| `danger-700` | `--color-danger-700` | `#b91c1c` | Deep tones |
| `danger-800` | `--color-danger-800` | `#991b1b` | Badge text (light mode) |
| `danger-900` | `--color-danger-900` | `#7f1d1d` | Dark backgrounds |
| `danger-950` | `--color-danger-950` | `#450a0a` | Badge backgrounds (dark mode) |

### Info (Sky) — Processing, syncing, informational
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `info-50` | `--color-info-50` | `#f0f9ff` | Lightest tint |
| `info-100` | `--color-info-100` | `#e0f2fe` | Badge backgrounds |
| `info-200` | `--color-info-200` | `#bae6fd` | Borders |
| `info-300` | `--color-info-300` | `#7dd3fc` | Text (dark mode badges) |
| `info-400` | `--color-info-400` | `#38bdf8` | Icons |
| `info-500` | `--color-info-500` | `#0ea5e9` | **Main info** |
| `info-600` | `--color-info-600` | `#0284c7` | Active states |
| `info-700` | `--color-info-700` | `#0369a1` | Deep tones |
| `info-800` | `--color-info-800` | `#075985` | Badge text (light mode) |
| `info-900` | `--color-info-900` | `#0c4a6e` | Dark backgrounds |
| `info-950` | `--color-info-950` | `#082f49` | Badge backgrounds (dark mode) |

### Neutral (Zinc) — Backgrounds, borders, muted text
| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `neutral-50` | `--color-neutral-50` | `#fafafa` | Page backgrounds (light) |
| `neutral-100` | `--color-neutral-100` | `#f4f4f5` | Card backgrounds (light) |
| `neutral-200` | `--color-neutral-200` | `#e4e4e7` | Borders (light) |
| `neutral-300` | `--color-neutral-300` | `#d4d4d8` | Dividers |
| `neutral-400` | `--color-neutral-400` | `#a1a1aa` | Muted text |
| `neutral-500` | `--color-neutral-500` | `#71717a` | Secondary text |
| `neutral-600` | `--color-neutral-600` | `#52525b` | Body text (light mode) |
| `neutral-700` | `--color-neutral-700` | `#3f3f46` | Borders (dark) |
| `neutral-800` | `--color-neutral-800` | `#27272a` | Card backgrounds (dark) |
| `neutral-900` | `--color-neutral-900` | `#18181b` | Page backgrounds (dark) |
| `neutral-950` | `--color-neutral-950` | `#09090b` | Deepest dark |

---

## Chart Colors

Use `CHART_COLORS` array from `@/lib/colors` for sequential chart series:

| Index | Name | Hex | Preview |
|-------|------|-----|---------|
| 0 | Blue | `#3b82f6` | Primary series |
| 1 | Cyan | `#06b6d4` | Secondary series |
| 2 | Amber | `#f59e0b` | Third series |
| 3 | Red | `#ef4444` | Fourth series |
| 4 | Violet | `#8b5cf6` | Fifth series |
| 5 | Sky | `#0ea5e9` | Sixth series |
| 6 | Orange | `#f97316` | Seventh series |
| 7 | Lime | `#84cc16` | Eighth series |
| 8 | Pink | `#ec4899` | Ninth series |
| 9 | Emerald | `#10b981` | Tenth series |

### Chart Axis Colors

Use `CHART_AXIS` from `@/lib/colors`:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Axis | `neutral-400` | `neutral-400` |
| Grid | `neutral-200` | `neutral-700` |
| Tick | `neutral-300` | `neutral-600` |
| Label | `neutral-500` | `neutral-400` |

---

## Utility Functions (`@/lib/colors`)

### Status Badges
```tsx
import { getStatusClasses } from '@/lib/colors'

// Returns: "bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-300"
<Badge className={getStatusClasses('active')}>Active</Badge>
<Badge className={getStatusClasses('failed')}>Failed</Badge>
<Badge className={getStatusClasses('pending')}>Pending</Badge>
```

Supported statuses: `success`, `active`, `healthy`, `completed`, `running`, `enabled`, `warning`, `paused`, `queued`, `pending`, `degraded`, `danger`, `error`, `failed`, `deleted`, `locked`, `suspended`, `critical`, `disabled`, `info`, `processing`, `updating`, `syncing`, `neutral`, `inactive`, `default`, `unknown`, `draft`, `failure`, `archived`, `started`, `canceled`, `notstarted`, `primary`, `admin`, `enterprise`, `accent`, `ai`, `premium`, `login`, `trial`, `professional`

### Role Badges
```tsx
import { getRoleClasses } from '@/lib/colors'

<Badge className={getRoleClasses('super_admin')}>Super Admin</Badge>
<Badge className={getRoleClasses('analyst')}>Analyst</Badge>
```

Supported roles: `super_admin`, `tenant_admin`, `data_engineer`, `bi_developer`, `analyst`, `viewer`, `auditor`

### Plan Badges
```tsx
import { getPlanClasses } from '@/lib/colors'

<Badge className={getPlanClasses('enterprise')}>Enterprise</Badge>
```

Supported plans: `basic`, `professional`, `enterprise`

### Audit Action Badges
```tsx
import { getActionClasses } from '@/lib/colors'

<Badge className={getActionClasses('user.created')}>user.created</Badge>
<Badge className={getActionClasses('delete')}>Delete</Badge>
```

Supports dotted notation and suffix-based classification (created → success, deleted → danger, updated → info, etc.)

### Severity Icons
```tsx
import { getSeverityIconClass } from '@/lib/colors'

<AlertTriangle className={`h-4 w-4 ${getSeverityIconClass('critical')}`} />
```

### Semantic Layer

| Function | Keys |
|----------|------|
| `getAggregationClasses(type)` | sum, count, count_distinct, avg, min, max, median, percentile, raw |
| `getDimensionTypeClasses(type)` | categorical, temporal, numeric, hierarchical |
| `getModelTypeClasses(type)` | fact, dimension, aggregate, view |
| `getJoinTypeClasses(type)` | LEFT, INNER, RIGHT, FULL |
| `getQueryTypeConfig(type)` | adhoc, pyspark, dbt, report → `{ label, classes }` |

### Hex Colors (Charts/Canvas)
```tsx
import { palette, getStatusColor } from '@/lib/colors'

// Direct palette access
const fill = palette.primary[500]  // "#6366f1"

// Status → hex
const dotColor = getStatusColor('active')  // "#10b981"
```

---

## Gradients

| Token | CSS Variable | Definition |
|-------|-------------|------------|
| Brand | `--gradient-brand` | `linear-gradient(135deg, primary-500, accent-500)` |
| Cyan | `--gradient-teal` | `linear-gradient(135deg, secondary-500, primary-500)` |

Tailwind usage: `bg-gradient-brand` or `bg-gradient-teal`

---

## Migration Guide

### Before (hardcoded)
```tsx
// ❌ Don't do this
const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}
<Badge className={statusColors[status]}>{status}</Badge>
```

### After (centralized)
```tsx
// ✅ Do this
import { getStatusClasses } from '@/lib/colors'
<Badge className={getStatusClasses(status)}>{status}</Badge>
```

### For Charts
```tsx
// ❌ Don't
<Line stroke="#6366f1" />

// ✅ Do
import { CHART_COLORS } from '@/lib/colors'
<Line stroke={CHART_COLORS[0]} />
```

---

## WCAG AA Compliance

All badge combinations meet WCAG AA contrast ratios (≥4.5:1 for text):

| Family | Light Mode | Dark Mode |
|--------|-----------|-----------|
| Success | `#065f46` on `#d1fae5` = 7.2:1 ✓ | `#6ee7b7` on `#022c22` = 8.1:1 ✓ |
| Warning | `#92400e` on `#fef3c7` = 6.8:1 ✓ | `#fcd34d` on `#451a03` = 7.5:1 ✓ |
| Danger | `#991b1b` on `#fee2e2` = 7.1:1 ✓ | `#fca5a5` on `#450a0a` = 7.9:1 ✓ |
| Info | `#075985` on `#e0f2fe` = 6.9:1 ✓ | `#7dd3fc` on `#082f49` = 7.3:1 ✓ |
| Primary | `#1e40af` on `#dbeafe` = 6.8:1 ✓ | `#93c5fd` on `#172554` = 7.0:1 ✓ |
| Accent | `#5b21b6` on `#ede9fe` = 7.2:1 ✓ | `#c4b5fd` on `#2e1065` = 7.5:1 ✓ |
| Neutral | `#3f3f46` on `#f4f4f5` = 8.4:1 ✓ | `#d4d4d8` on `#27272a` = 9.1:1 ✓ |

---

## Files Modified in This Refactoring

### Core Token Files
- `src/styles/design-tokens.css` — CSS custom properties (8 families × 11 shades)
- `tailwind.config.js` — Tailwind color mapping
- `src/index.css` — Shadcn UI compatibility layer
- `src/lib/colors.ts` — JS/TS constants + utility functions

### Component Files
- `src/components/ui/badge.tsx` — Semantic badge variants

### Chart Components
- `src/components/charts/types.ts`
- `src/components/charts/ChartRenderer.tsx`
- `src/features/dashboards/components/widgets/ChartWrapper.tsx`
- `src/features/dashboards/components/widgets/ScatterPlot.tsx`
- `src/features/dashboards/components/widgets/Heatmap.tsx`

### dbt/DAG Components
- `src/features/dbt-studio/components/LineageViewer.tsx`
- `src/features/dbt-studio/components/ModelCanvas.tsx`
- `src/features/dbt-studio/pages/DbtStudioPage.tsx`
- `src/pages/orchestration/DagBuilderPage.tsx`
- `src/components/dagster/AssetGraph.tsx`

### Admin/Portal Pages
- `src/pages/admin/AuditLogsPage.tsx`
- `src/pages/portal/TenantDetailPage.tsx`
- `src/pages/portal/UserManagementPage.tsx`
- `src/pages/admin/TenantUserManagementPage.tsx`
- `src/pages/portal/TenantManagementPage.tsx`
- `src/pages/portal/PortalOverviewPage.tsx`

### Orchestration Pages
- `src/pages/orchestration/DagsListPage.tsx`
- `src/pages/orchestration/DagMonitorPage.tsx`
- `src/pages/orchestration/JobDetailPage.tsx`
- `src/pages/orchestration/JobsListPage.tsx`
- `src/pages/orchestration/SchedulingPage.tsx`
- `src/pages/orchestration/DagsterDashboardPage.tsx`
- `src/components/dagster/RunsList.tsx`
- `src/components/dagster/InstanceStatus.tsx`

### Semantic Layer & SQL Editor
- `src/features/semantic/components/MeasureList.tsx`
- `src/features/semantic/components/DimensionList.tsx`
- `src/features/semantic/components/ModelCard.tsx`
- `src/features/semantic/components/RelationshipDiagram.tsx`
- `src/features/sql-editor/pages/SqlEditorPage.tsx`
- `src/features/sql-editor/components/SavedQueriesList.tsx`
