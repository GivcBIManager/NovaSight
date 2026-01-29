# Dimensions and Measures

This guide explains how to define dimensions and measures in NovaSight's semantic layer.

## Overview

The semantic layer translates your database schema into business terms. The two core building blocks are:

- **Dimensions**: Attributes you group, filter, or slice by
- **Measures**: Quantitative values you calculate and aggregate

---

## Understanding the Semantic Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                       Semantic Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Database Columns          →       Business Terms              │
│   ─────────────────                ──────────────               │
│   tbl_ord.ord_amt           →       Total Sales                 │
│   tbl_cust.cust_nm          →       Customer Name               │
│   tbl_ord.rgn_cd            →       Region                      │
│                                                                  │
│   Questions like:                                                │
│   "What are total sales by region?"                              │
│   Automatically map to the right SQL                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dimensions

Dimensions are the "by" in your questions: "Sales **by region**", "Orders **by customer**".

### Creating a Dimension

1. Go to **Semantic Layer** > **Models**
2. Click on your model (or create one)
3. Click **+ Add Dimension**
4. Fill in the configuration:

```yaml
Dimension:
  Name: Region
  Description: Geographic sales region
  Source:
    Table: orders
    Column: region_code
  Type: string
  
  Display:
    Label: Region
    Format: none
    
  Properties:
    Filterable: true
    Groupable: true
    Searchable: true
```

### Dimension Types

| Type | Examples | Use Case |
|------|----------|----------|
| **String** | Name, Category, Status | Text-based grouping |
| **Number** | Age, Score, Rating | Numeric grouping |
| **Date** | Order Date, Created At | Time-based analysis |
| **Boolean** | Is Active, Has Subscription | Yes/No filtering |
| **Geo** | Country, City, Coordinates | Geographic analysis |

### Temporal Dimensions

For date/time dimensions, NovaSight auto-generates time hierarchies:

```yaml
Dimension: Order Date
  Type: date
  Time Grains:
    - Year
    - Quarter
    - Month
    - Week
    - Day
    - Hour  # For timestamp types
```

!!! tip "Time Intelligence"
    Temporal dimensions enable questions like "sales this month" or "orders last quarter" without additional configuration.

### Calculated Dimensions

Create dimensions with SQL logic:

```yaml
Dimension:
  Name: Customer Segment
  Type: string
  SQL: |
    CASE 
      WHEN total_orders >= 100 THEN 'Enterprise'
      WHEN total_orders >= 10 THEN 'Business'
      ELSE 'Consumer'
    END
```

### Hierarchical Dimensions

Define drill-down paths:

```yaml
Hierarchy: Geography
  Levels:
    - Country
    - State
    - City
    - Postal Code
  
  Default Roll-up: Country
```

---

## Measures

Measures are the "what" in your questions: "**Total sales**", "**Order count**".

### Creating a Measure

1. Go to **Semantic Layer** > **Models**
2. Click on your model
3. Click **+ Add Measure**
4. Fill in the configuration:

```yaml
Measure:
  Name: Total Sales
  Description: Sum of all order amounts
  Source:
    Table: orders
    Column: amount
  Aggregation: sum
  
  Display:
    Label: Total Sales
    Format: currency
    Format Options:
      Currency: USD
      Decimal Places: 2
```

### Aggregation Types

| Aggregation | SQL | Description |
|-------------|-----|-------------|
| `sum` | `SUM(column)` | Total of all values |
| `count` | `COUNT(column)` | Number of rows |
| `count_distinct` | `COUNT(DISTINCT column)` | Unique values |
| `avg` | `AVG(column)` | Average value |
| `min` | `MIN(column)` | Minimum value |
| `max` | `MAX(column)` | Maximum value |
| `median` | `MEDIAN(column)` | Median value |

### Format Types

| Format | Example Output | Description |
|--------|---------------|-------------|
| `number` | `1,234,567` | Standard number |
| `currency` | `$1,234.56` | Money format |
| `percent` | `45.6%` | Percentage |
| `decimal` | `1234.567` | Decimal number |
| `compact` | `1.2M` | Abbreviated |

### Calculated Measures

Create measures with custom SQL:

```yaml
Measure:
  Name: Profit Margin
  Type: number
  Format: percent
  SQL: |
    SUM(revenue - cost) / NULLIF(SUM(revenue), 0)
```

### Derived Measures

Create measures based on other measures:

```yaml
Measure:
  Name: Average Order Value
  Type: derived
  Formula: |
    {Total Sales} / NULLIF({Order Count}, 0)
  Format: currency
```

### Measure Filters

Apply automatic filters to measures:

```yaml
Measure:
  Name: Completed Orders
  Source: orders
  Aggregation: count
  Filter: |
    status = 'completed'
```

---

## Best Practices

### Naming Conventions

| Do | Don't |
|----|-------|
| `Total Sales` | `sum_ord_amt` |
| `Customer Name` | `cust_nm` |
| `Order Date` | `created_at_ts` |

### Documentation

Always add descriptions:

```yaml
Dimension:
  Name: Customer Segment
  Description: |
    Customer classification based on purchase behavior:
    - Enterprise: 100+ orders
    - Business: 10-99 orders
    - Consumer: Less than 10 orders
```

### Performance

| Tip | Description |
|-----|-------------|
| **Index source columns** | Ensure dimensions have indexes |
| **Pre-aggregate measures** | Use dbt for common aggregations |
| **Limit cardinality** | High-cardinality dims impact performance |

---

## Testing Definitions

### Preview Results

1. Click on a dimension or measure
2. Click **Preview**
3. See sample values

### Test Queries

1. Go to **Query**
2. Ask a question using your definitions
3. Click **Show SQL** to verify

---

## Common Patterns

### Year-over-Year Comparison

```yaml
Measure:
  Name: Sales YoY Growth
  SQL: |
    (SUM(CASE WHEN year = CURRENT_YEAR THEN amount END) -
     SUM(CASE WHEN year = CURRENT_YEAR - 1 THEN amount END)) /
    NULLIF(SUM(CASE WHEN year = CURRENT_YEAR - 1 THEN amount END), 0)
  Format: percent
```

### Running Total

```yaml
Measure:
  Name: Cumulative Sales
  SQL: |
    SUM(SUM(amount)) OVER (ORDER BY order_date)
  Type: window
```

### Percent of Total

```yaml
Measure:
  Name: Sales % of Total
  SQL: |
    SUM(amount) / SUM(SUM(amount)) OVER ()
  Format: percent
```

---

## Next Steps

- [Define Relationships](relationships.md)
- [Create Calculated Fields](calculated-fields.md)
- [Build Your First Dashboard](../../getting-started/first-dashboard.md)
