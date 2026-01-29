# Widget Types

This guide covers all widget types available in NovaSight dashboards.

## Overview

Widgets are the building blocks of dashboards. Each widget type is optimized for different data presentations.

---

## Chart Widgets

### Line Chart

Best for: **Trends over time**

```yaml
Line Chart:
  X-Axis: Date dimension
  Y-Axis: Measure(s)
  Features:
    - Multiple series
    - Area fill
    - Trend lines
    - Annotations
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| Line Style | Solid, dashed, dotted |
| Interpolation | Linear, smooth, step |
| Area Fill | None, solid, gradient |
| Data Points | Show/hide markers |
| Y-Axis | Single, dual, logarithmic |

### Bar Chart

Best for: **Comparisons across categories**

```yaml
Bar Chart:
  X-Axis: Dimension
  Y-Axis: Measure
  Orientation: vertical | horizontal
  Features:
    - Stacked
    - Grouped
    - 100% stacked
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| Orientation | Vertical, horizontal |
| Grouping | Stacked, grouped, 100% |
| Bar Width | Thin, medium, thick |
| Sort | By value, by label, custom |

### Pie / Donut Chart

Best for: **Part-to-whole relationships**

```yaml
Pie Chart:
  Segment: Dimension
  Value: Measure
  Features:
    - Donut variant
    - Labels
    - Legend
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| Type | Pie, donut |
| Label Position | Inside, outside, none |
| Show Percentage | Yes, no |
| Inner Radius | 0-90% (for donut) |

### Area Chart

Best for: **Cumulative totals over time**

```yaml
Area Chart:
  X-Axis: Date dimension
  Y-Axis: Measure(s)
  Features:
    - Stacked
    - 100% stacked
    - Gradient fill
```

### Scatter Plot

Best for: **Correlation between variables**

```yaml
Scatter Plot:
  X-Axis: Measure 1
  Y-Axis: Measure 2
  Size: Optional measure
  Color: Optional dimension
  Features:
    - Trend line
    - Clusters
    - Quadrants
```

### Combo Chart

Best for: **Combining different chart types**

```yaml
Combo Chart:
  Primary Axis: Bar (Revenue)
  Secondary Axis: Line (Growth %)
  Features:
    - Dual Y-axis
    - Mixed types
```

---

## KPI Widgets

### Single Value KPI

Display a prominent metric:

```yaml
KPI Widget:
  Value: Total Revenue
  Comparison: vs Last Period
  
  Display:
    Font Size: large
    Show Trend: true
    Trend Arrow: up/down
    Color Coding: true
```

**Comparison Options:**

| Type | Description |
|------|-------------|
| Previous Period | vs last week/month/year |
| Target | vs defined target |
| Absolute Change | Difference in value |
| Percent Change | % difference |

### KPI Grid

Multiple KPIs in a grid:

```yaml
KPI Grid:
  Columns: 3
  Metrics:
    - Revenue
    - Orders
    - Customers
    - Avg Order Value
```

### Gauge

Visual representation against a target:

```yaml
Gauge:
  Value: Conversion Rate
  Min: 0
  Max: 100
  Target: 15
  
  Zones:
    - Red: 0-10
    - Yellow: 10-15
    - Green: 15-100
```

---

## Table Widgets

### Data Table

Display tabular data:

```yaml
Data Table:
  Columns:
    - Customer Name
    - Region
    - Total Sales
    - Order Count
    
  Features:
    - Sorting
    - Pagination
    - Column resize
    - Export
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| Pagination | Rows per page |
| Column Width | Auto, fixed, resizable |
| Row Height | Compact, standard, comfortable |
| Alternating Rows | Zebra striping |
| Frozen Columns | Pin left columns |

### Pivot Table

Summarize data with rows and columns:

```yaml
Pivot Table:
  Rows: Region, City
  Columns: Year, Quarter
  Values: Total Sales
  
  Features:
    - Subtotals
    - Grand totals
    - Drill-down
```

### Heatmap Table

Table with color-coded values:

```yaml
Heatmap Table:
  Rows: Product
  Columns: Month
  Values: Sales
  
  Color Scale:
    Min: #fee0d2
    Mid: #fc9272
    Max: #de2d26
```

---

## Text Widgets

### Markdown Text

Add formatted text:

```markdown
## Key Insights

- Revenue up **12%** this quarter
- New customer acquisition accelerating
- Western region outperforming

_Last updated: {{ current_date }}_
```

**Supported Markdown:**

- Headings (H1-H6)
- Bold, italic, strikethrough
- Lists (ordered, unordered)
- Links
- Code blocks
- Tables
- Images

### Dynamic Variables

Insert dynamic content:

```markdown
Current Period: {{ filter.date_range }}
Selected Region: {{ filter.region }}
Last Refresh: {{ dashboard.last_refresh }}
```

---

## Filter Widgets

### Date Range Filter

Select time periods:

```yaml
Date Range Filter:
  Type: range | relative | presets
  Default: "Last 30 days"
  
  Presets:
    - Today
    - Last 7 days
    - Last 30 days
    - This month
    - Last quarter
    - Year to date
  
  Custom Range: true
```

### Dropdown Filter

Single or multi-select:

```yaml
Dropdown Filter:
  Field: Region
  Type: single | multi
  Search: true
  Select All: true
  Default: ["North", "South"]
```

### Slider Filter

Numeric range selection:

```yaml
Slider Filter:
  Field: Price
  Min: 0
  Max: 1000
  Step: 10
  Range: true
```

### Button Filter

Quick toggle options:

```yaml
Button Filter:
  Field: Status
  Options:
    - label: "Active"
      value: "active"
    - label: "Completed"
      value: "completed"
    - label: "All"
      value: null
```

---

## Map Widgets

### Choropleth Map

Geographic regions with color coding:

```yaml
Choropleth Map:
  Region: State/Country
  Value: Sales
  
  Map Type: US States | Countries | Custom GeoJSON
  Color Scale: Sequential | Diverging
```

### Point Map

Location markers:

```yaml
Point Map:
  Latitude: lat
  Longitude: lng
  Size: Optional measure
  Color: Optional dimension
  
  Clustering: true
  Zoom: auto
```

---

## Advanced Widgets

### Image Widget

Display images:

```yaml
Image Widget:
  Source: URL | Upload
  Alt Text: "Company Logo"
  Link: Optional URL
  Fit: contain | cover | fill
```

### Embed Widget

Embed external content:

```yaml
Embed Widget:
  Type: iframe | video | html
  URL: "https://example.com/embed"
  Height: 400px
```

### Divider

Visual separator:

```yaml
Divider:
  Style: solid | dashed | dotted
  Color: #E5E7EB
  Margin: 16px
```

---

## Widget Styling

### Colors

Configure widget colors:

```yaml
Colors:
  Palette: default | categorical | sequential
  Custom:
    - "#3B82F6"
    - "#10B981"
    - "#F59E0B"
```

### Typography

Text styling:

```yaml
Typography:
  Title:
    Size: 18px
    Weight: bold
    Color: #1F2937
  
  Labels:
    Size: 12px
    Color: #6B7280
```

### Borders and Shadows

Widget container styling:

```yaml
Container:
  Border: 1px solid #E5E7EB
  Border Radius: 8px
  Shadow: sm | md | lg | none
  Background: #FFFFFF
```

---

## Next Steps

- [Filters and Interactions](filters-interactions.md)
- [Sharing and Permissions](sharing-permissions.md)
- [Building Dashboards](building-dashboards.md)
