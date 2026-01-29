# Filters and Interactions

This guide covers how to create interactive dashboards with filters and cross-widget interactions.

## Overview

Interactive dashboards enable users to:
- Filter data dynamically
- Drill down into details
- Cross-filter between widgets
- Explore data freely

---

## Dashboard Filters

### Adding Filters

1. Click **+ Add Widget**
2. Select **Filter**
3. Choose filter type
4. Configure and position

### Filter Types

| Type | Use Case | Example |
|------|----------|---------|
| Date Range | Time periods | Last 30 days |
| Dropdown | Category selection | Region, Status |
| Multi-Select | Multiple values | Multiple products |
| Slider | Numeric ranges | Price $0-$100 |
| Text Search | Free-form search | Customer name |
| Toggle | Boolean options | Include archived |

### Filter Configuration

```yaml
Filter:
  Name: Region Filter
  Field: region
  Type: multi-select
  
  Behavior:
    Default: ["North", "South"]
    Allow Empty: false
    Show Search: true
    Select All: true
    
  Scope:
    Apply To: all  # or specific widgets
```

---

## Filter Scoping

### Global Filters

Apply to all widgets:

```yaml
Scope: global
Apply To: all_widgets
```

### Widget-Specific Filters

Apply to selected widgets only:

```yaml
Scope: selected
Apply To:
  - widget_sales_chart
  - widget_revenue_table
Exclude:
  - widget_comparison_kpi
```

### Filter Groups

Create logical filter groups:

```yaml
Filter Group: "Time Controls"
  Filters:
    - Date Range
    - Comparison Period
  Layout: horizontal
```

---

## Cross-Filtering

Enable clicking on one widget to filter others.

### Enable Cross-Filtering

1. Go to **Dashboard Settings**
2. Navigate to **Interactions**
3. Enable **Cross-filtering**

### Configuration

```yaml
Cross-Filtering:
  Enabled: true
  
  Sources:
    - Pie Chart: filter by segment
    - Bar Chart: filter by bar
    - Table: filter by row click
    
  Targets: all_widgets
  
  Behavior:
    Click: filter
    Double Click: drill down
    Escape: clear filters
```

### Filter Indicators

Visual feedback for active filters:

```yaml
Filter Indicators:
  Show Badge: true
  Highlight: true
  Clear Button: true
```

---

## Drill-Down

Navigate from summary to detail.

### Configuring Drill-Down

```yaml
Drill-Down:
  Path:
    - Year
    - Quarter
    - Month
    - Day
    
  Action: double_click  # or click
  
  Behavior:
    Animate: true
    Show Breadcrumb: true
    Back Button: true
```

### Drill-Through

Navigate to a different dashboard:

```yaml
Drill-Through:
  Target Dashboard: "Customer Details"
  Pass Filters:
    - customer_id: {selected_row.customer_id}
    - date_range: {current_filter.date_range}
```

---

## Linked Widgets

### Hover Synchronization

Highlight across widgets on hover:

```yaml
Hover Sync:
  Enabled: true
  Widgets:
    - line_chart
    - bar_chart
    - data_table
  Field: date
```

### Scroll Synchronization

Sync scrolling between tables:

```yaml
Scroll Sync:
  Group: "financial_tables"
  Widgets:
    - revenue_table
    - expense_table
  Direction: vertical
```

---

## Filter Persistence

### Session Persistence

Filters persist during the session:

```yaml
Persistence:
  Type: session
  Clear On: page_reload
```

### URL Parameters

Filters stored in URL:

```yaml
Persistence:
  Type: url
  
  Example URL:
  /dashboard/sales?date=last_30_days&region=North,South
```

### User Defaults

Save personal default filters:

```yaml
Persistence:
  Type: user_preference
  Save Button: true
  Reset Button: true
```

---

## Conditional Visibility

Show/hide widgets based on filters.

### Configuration

```yaml
Widget: Detail Table
Visibility:
  Condition: filter.region != null
  Animation: fade
```

### Common Conditions

```yaml
# Show if filter has value
Condition: filter.customer_id != null

# Show if multiple regions selected
Condition: filter.region.length > 1

# Show for specific role
Condition: user.role == 'admin'

# Show if data exists
Condition: query.row_count > 0
```

---

## Actions

Trigger actions from widgets.

### Link Actions

Navigate to URLs:

```yaml
Action:
  Type: link
  URL: /customers/{customer_id}
  Target: new_tab
```

### Dashboard Actions

Navigate to another dashboard:

```yaml
Action:
  Type: dashboard
  Target: "Order Details"
  Filters:
    order_id: {row.order_id}
```

### Custom Actions

Trigger webhooks or exports:

```yaml
Action:
  Type: webhook
  URL: https://api.example.com/trigger
  Method: POST
  Body:
    customer_id: {row.customer_id}
    action: "flag_for_review"
```

---

## Best Practices

### Filter Placement

| Location | Best For |
|----------|----------|
| Top bar | Global date/time filters |
| Sidebar | Multi-select dimensions |
| Inline | Widget-specific controls |

### Performance

| Tip | Description |
|-----|-------------|
| Limit options | Cap dropdown options at 100-200 |
| Use search | Enable search for large lists |
| Cascade filters | Second filter respects first |

### User Experience

| Tip | Description |
|-----|-------------|
| Clear defaults | Set sensible default values |
| Reset option | Provide "Reset All" button |
| Feedback | Show loading states |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Clear selection / close filter |
| `Enter` | Apply filter |
| `Ctrl+Click` | Multi-select |
| `Shift+Click` | Range select |

---

## Next Steps

- [Widget Types](widget-types.md)
- [Sharing and Permissions](sharing-permissions.md)
- [Building Dashboards](building-dashboards.md)
