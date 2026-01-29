# Building Your First Dashboard

In this hands-on tutorial, you'll build a complete Sales Analytics dashboard from scratch. By the end, you'll have a fully functional dashboard with multiple visualizations, filters, and interactivity.

## What You'll Build

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Sales Analytics Dashboard                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Total Sales  │ │ Order Count  │ │   Avg Order  │  [Filters] │
│  │   $1.2M      │ │    15,234    │ │     $78.50   │  [Date]    │
│  │   ▲ 12%      │ │    ▲ 8%      │ │     ▼ 3%     │  [Region]  │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Monthly Sales Trend                          │ │
│  │  $150K ┤                                    ╭───           │ │
│  │  $100K ┤              ╭───╮      ╭───╮   ╭─╯              │ │
│  │   $50K ┤  ╭───╮   ╭──╯   ╰───╮╭─╯   ╰──╯                 │ │
│  │      0 ┼──┴───┴───┴──────────┴┴──────────────────         │ │
│  │        Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────┐ ┌───────────────────────────────┐ │
│  │  Sales by Region         │ │   Top 10 Customers            │ │
│  │  [Pie Chart]             │ │   [Table]                     │ │
│  └──────────────────────────┘ └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Time Required:** 30-45 minutes

---

## Prerequisites

Before starting, ensure you have:

- [x] Connected at least one data source
- [x] Basic understanding of [Core Concepts](concepts.md)
- [x] Sample data with orders, customers, and products

!!! note "Sample Data"
    If you don't have sample data, you can use our built-in demo dataset. Go to **Settings** > **Demo Data** > **Load Sample Dataset**.

---

## Step 1: Create the Semantic Model

First, let's define the semantic layer that powers our dashboard.

### Navigate to Semantic Layer

1. Click **Semantic Layer** in the sidebar
2. Click **+ Create Model**
3. Name it: **Sales Analytics**

### Select Tables

Choose the following tables from your data source:

- `orders` - Order transactions
- `customers` - Customer information
- `products` - Product catalog

### Define Dimensions

Click **+ Add Dimension** for each:

| Name | Source | Type | Description |
|------|--------|------|-------------|
| Order Date | `orders.created_at` | Date | Date of the order |
| Customer Name | `customers.name` | String | Customer full name |
| Customer Segment | `customers.segment` | String | Customer category |
| Product Name | `products.name` | String | Product name |
| Product Category | `products.category` | String | Product category |
| Region | `orders.region` | String | Sales region |
| City | `orders.city` | String | City name |

### Define Measures

Click **+ Add Measure** for each:

| Name | Formula | Format | Description |
|------|---------|--------|-------------|
| Total Sales | `SUM(orders.amount)` | Currency | Sum of all order amounts |
| Order Count | `COUNT(orders.id)` | Number | Number of orders |
| Avg Order Value | `AVG(orders.amount)` | Currency | Average order amount |
| Unique Customers | `COUNT(DISTINCT orders.customer_id)` | Number | Distinct customer count |

### Save the Model

Click **Save Model** to save your semantic layer.

---

## Step 2: Create the Dashboard

### Initialize Dashboard

1. Go to **Dashboards** in the sidebar
2. Click **+ Create Dashboard**
3. Name it: **Sales Analytics Dashboard**
4. Click **Create**

You'll see an empty dashboard canvas.

---

## Step 3: Add KPI Widgets

Let's add the three KPI cards at the top.

### Total Sales KPI

1. Click **+ Add Widget**
2. Select **KPI** widget type
3. Configure:
   - **Title**: Total Sales
   - **Query**: Type "Total sales this year"
   - **Comparison**: "vs last year"
   - **Format**: Currency
4. Click **Add to Dashboard**
5. Drag to position in top-left

### Order Count KPI

1. Click **+ Add Widget** > **KPI**
2. Configure:
   - **Title**: Order Count
   - **Query**: "Number of orders this year"
   - **Comparison**: "vs last year"
   - **Format**: Number
3. Position next to Total Sales

### Average Order Value KPI

1. Click **+ Add Widget** > **KPI**
2. Configure:
   - **Title**: Avg Order Value
   - **Query**: "Average order value this year"
   - **Comparison**: "vs last year"
   - **Format**: Currency
3. Position next to Order Count

---

## Step 4: Add Trend Chart

### Monthly Sales Trend

1. Click **+ Add Widget**
2. Select **Line Chart** type
3. Configure:
   - **Title**: Monthly Sales Trend
   - **Query**: "Total sales by month for the last 12 months"
   - **X-Axis**: Month
   - **Y-Axis**: Total Sales
4. Styling options:
   - Line color: `#3B82F6` (blue)
   - Fill area: Yes (with opacity 0.1)
   - Show data points: Yes
5. Click **Add to Dashboard**
6. Resize to span the full width

!!! tip "Resize Widgets"
    Drag the corners or edges of any widget to resize it. The grid will snap to help with alignment.

---

## Step 5: Add Regional Analysis

### Sales by Region Pie Chart

1. Click **+ Add Widget**
2. Select **Pie Chart** type
3. Configure:
   - **Title**: Sales by Region
   - **Query**: "Total sales by region"
   - **Segment**: Region
   - **Value**: Total Sales
4. Styling:
   - Show percentages: Yes
   - Show legend: Yes
5. Position in bottom-left

### Region Color Scheme

Optionally, set custom colors for each region:

```yaml
Colors:
  North: "#3B82F6"  # Blue
  South: "#10B981"  # Green
  East: "#F59E0B"   # Orange
  West: "#8B5CF6"   # Purple
```

---

## Step 6: Add Customer Table

### Top Customers Table

1. Click **+ Add Widget**
2. Select **Table** type
3. Configure:
   - **Title**: Top 10 Customers
   - **Query**: "Top 10 customers by total sales this year"
4. Columns to display:
   - Customer Name
   - Segment
   - Total Sales (formatted as currency)
   - Order Count
5. Sorting: Total Sales (descending)
6. Position in bottom-right

---

## Step 7: Add Interactive Filters

### Date Range Filter

1. Click **+ Add Widget**
2. Select **Filter** widget type
3. Configure:
   - **Type**: Date Range
   - **Label**: Date Range
   - **Default**: Last 12 months
   - **Apply to**: All widgets

### Region Filter

1. Click **+ Add Widget** > **Filter**
2. Configure:
   - **Type**: Multi-select
   - **Label**: Region
   - **Source**: Region dimension
   - **Apply to**: All widgets

### Position Filters

Drag both filters to the top-right corner of the dashboard.

---

## Step 8: Configure Cross-Filtering

Enable interactivity between widgets:

1. Click the **Settings** icon (⚙️) in the dashboard toolbar
2. Go to **Interactions**
3. Enable **Cross-filtering**:
   - When clicking on pie chart segment → Filter all widgets
   - When clicking on table row → Highlight in charts
4. Click **Save**

### Test Cross-Filtering

1. Click **Preview** mode
2. Click on a region in the pie chart
3. Watch all other widgets filter to that region
4. Click **Clear Filters** to reset

---

## Step 9: Add Polish

### Dashboard Description

1. Click **Settings** > **General**
2. Add description:
   ```
   Sales performance dashboard showing revenue, orders, 
   and customer metrics. Updated daily.
   ```

### Add a Header Widget

1. Click **+ Add Widget** > **Text**
2. Configure:
   ```markdown
   ## 📊 Sales Analytics
   
   *Real-time sales performance metrics*
   ```
3. Position at the very top

### Adjust Layout

Fine-tune the layout:

1. Ensure consistent spacing between widgets
2. Align widget edges using the grid
3. Group related widgets together

---

## Step 10: Save and Share

### Save Your Dashboard

1. Click **Save** (or press `Ctrl+S`)
2. Your dashboard is now saved

### Set Refresh Schedule

1. Click **Settings** > **Refresh**
2. Configure auto-refresh:
   - **Interval**: Every 15 minutes
   - **Time Range**: During business hours

### Share with Team

1. Click **Share** button
2. Choose sharing option:
   - **Users**: Select specific users
   - **Roles**: Share with entire role (e.g., "Analysts")
   - **Public Link**: Generate shareable link
3. Set permission level:
   - **View**: Can only view
   - **Edit**: Can modify the dashboard
4. Click **Share**

---

## Final Result

Congratulations! You've built a complete sales analytics dashboard with:

- [x] 3 KPI cards with comparisons
- [x] Monthly trend line chart
- [x] Regional pie chart
- [x] Top customers table
- [x] Interactive date and region filters
- [x] Cross-filtering between widgets

---

## Best Practices

### Layout Tips

- **KPIs at top**: Place key metrics prominently
- **Trends in middle**: Give charts space to breathe
- **Details at bottom**: Tables with drill-down capability
- **Filters accessible**: Keep filters visible and easy to use

### Performance Tips

- **Limit time ranges**: Avoid "All Time" as default
- **Aggregate data**: Use pre-aggregated measures when possible
- **Cache queries**: Enable query caching for frequently viewed dashboards

### Design Tips

- **Consistent colors**: Use a cohesive color palette
- **Clear titles**: Descriptive but concise widget titles
- **Whitespace**: Don't overcrowd the dashboard
- **Mobile-friendly**: Test on smaller screens

---

## Next Steps

<div class="grid cards" markdown>

-   :material-widgets: **Widget Types**

    ---

    Learn about all available widget types and their options.

    [:octicons-arrow-right-24: Widget Guide](../guides/dashboards/widget-types.md)

-   :material-filter: **Advanced Filters**

    ---

    Master complex filtering and cross-filtering.

    [:octicons-arrow-right-24: Filters Guide](../guides/dashboards/filters-interactions.md)

-   :material-share: **Sharing & Permissions**

    ---

    Control who can view and edit your dashboards.

    [:octicons-arrow-right-24: Sharing Guide](../guides/dashboards/sharing-permissions.md)

-   :material-chat-question: **Natural Language Tips**

    ---

    Get better results from your natural language queries.

    [:octicons-arrow-right-24: NL Tips](../guides/natural-language/tips-tricks.md)

</div>
