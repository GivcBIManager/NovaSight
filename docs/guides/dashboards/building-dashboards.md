# Building Dashboards

This guide covers everything you need to know about creating and managing dashboards in NovaSight.

## Overview

Dashboards are collections of widgets that visualize your data. They provide:
- At-a-glance insights into key metrics
- Interactive exploration capabilities
- Shareable views for stakeholders

---

## Creating a Dashboard

### Step 1: Start a New Dashboard

1. Click **Dashboards** in the sidebar
2. Click **+ Create Dashboard**
3. Enter a name and description
4. Click **Create**

### Step 2: Add Widgets

Click **+ Add Widget** to add:
- **Query Widget**: Natural language query
- **Chart Widget**: Specific visualization
- **KPI Widget**: Single metric with comparison
- **Table Widget**: Tabular data
- **Text Widget**: Markdown content
- **Filter Widget**: Interactive filter

### Step 3: Arrange Layout

- **Drag** widgets to reposition
- **Resize** by dragging corners
- **Snap** to grid for alignment

### Step 4: Save

Press **Ctrl+S** or click **Save**.

---

## Dashboard Canvas

### Grid System

NovaSight uses a 12-column grid:

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

**Common Layouts:**

| Layout | Columns |
|--------|---------|
| Full width | 12 |
| Half | 6 |
| Third | 4 |
| Quarter | 3 |

### Responsive Behavior

Dashboards adapt to screen size:
- **Desktop**: Full grid layout
- **Tablet**: Widgets stack to 6-column
- **Mobile**: Single column (12-width)

---

## Widget Configuration

### Common Settings

Every widget has:

```yaml
Widget Settings:
  Title: "Widget Title"
  Description: "Optional description"
  Visibility: always | conditional
  Refresh: inherit | custom
  
  Size:
    Width: 6  # columns (1-12)
    Height: 4  # rows
```

### Query Configuration

For data widgets:

```yaml
Query:
  Type: natural_language | sql
  Content: "Total sales by region"
  
  # Or SQL
  SQL: |
    SELECT region, SUM(amount) as total
    FROM orders
    GROUP BY region
```

---

## Dashboard Settings

### General Settings

Click **Settings** (⚙️) to configure:

```yaml
Dashboard Settings:
  Name: "Sales Dashboard"
  Description: "Executive summary of sales metrics"
  
  Theme: light | dark | system
  
  Tags:
    - sales
    - executive
    - weekly
```

### Refresh Settings

Control how often data refreshes:

```yaml
Auto Refresh:
  Enabled: true
  Interval: 15 minutes
  
  Schedule:
    Start: "08:00"
    End: "18:00"
    Days: ["Mon", "Tue", "Wed", "Thu", "Fri"]
```

### Default Filters

Set default filter values:

```yaml
Default Filters:
  Date Range: "Last 30 days"
  Region: ["North", "South"]
  Status: "Active"
```

---

## Dashboard Templates

### Using Templates

1. Click **+ Create Dashboard**
2. Select **Start from Template**
3. Choose a template:
   - Sales Overview
   - Marketing Performance
   - Financial Summary
   - Operations Monitor
4. Customize to your needs

### Saving as Template

1. Open your dashboard
2. Click **Settings** > **Save as Template**
3. Enter template name
4. Choose visibility (personal/shared)

---

## Organizing Dashboards

### Folders

Organize dashboards in folders:

1. Go to **Dashboards**
2. Click **+ New Folder**
3. Name and create
4. Drag dashboards into folders

### Favorites

Star frequently used dashboards:

1. Hover over a dashboard
2. Click the ⭐ icon
3. Access favorites from the sidebar

### Tags

Add tags for discovery:

1. Open dashboard settings
2. Add tags
3. Search by tag in the dashboard list

---

## Version History

NovaSight maintains version history:

### View History

1. Open dashboard
2. Click **Settings** > **Version History**
3. See all saved versions

### Restore Version

1. Click on a version
2. Preview the changes
3. Click **Restore** to roll back

### Compare Versions

1. Select two versions
2. Click **Compare**
3. See side-by-side diff

---

## Best Practices

### Layout

| Tip | Description |
|-----|-------------|
| **KPIs at top** | Place key metrics prominently |
| **Flow left-to-right** | Match natural reading order |
| **Group related items** | Keep related widgets together |
| **Whitespace** | Don't overcrowd |

### Performance

| Tip | Description |
|-----|-------------|
| **Limit widgets** | 10-15 widgets max per dashboard |
| **Use filters** | Reduce data volume with filters |
| **Appropriate refresh** | Match refresh to data freshness needs |

### Design

| Tip | Description |
|-----|-------------|
| **Consistent colors** | Use a cohesive palette |
| **Clear titles** | Descriptive but concise |
| **Add context** | Use text widgets for explanations |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save dashboard |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Del` | Delete selected widget |
| `Ctrl+D` | Duplicate widget |
| `Arrow keys` | Move selected widget |
| `Escape` | Deselect |

---

## Next Steps

- [Widget Types](widget-types.md)
- [Filters and Interactions](filters-interactions.md)
- [Sharing and Permissions](sharing-permissions.md)
