# Calculated Fields

This guide explains how to create calculated fields in NovaSight's semantic layer.

## Overview

Calculated fields extend your semantic model with:
- Custom dimensions based on logic
- Derived measures from existing measures
- Complex business calculations

---

## Types of Calculated Fields

### Calculated Dimensions

Transform or combine source columns:

```yaml
Calculated Dimension:
  Name: Age Group
  Type: string
  SQL: |
    CASE 
      WHEN age < 18 THEN 'Under 18'
      WHEN age < 35 THEN '18-34'
      WHEN age < 55 THEN '35-54'
      ELSE '55+'
    END
```

### Calculated Measures

Create custom aggregations:

```yaml
Calculated Measure:
  Name: Profit
  Type: number
  SQL: |
    SUM(revenue) - SUM(cost)
  Format: currency
```

### Derived Measures

Combine existing measures:

```yaml
Derived Measure:
  Name: Average Order Value
  Formula: |
    {Total Revenue} / {Order Count}
  Format: currency
```

---

## Creating Calculated Fields

### Step 1: Open the Editor

1. Go to **Semantic Layer** > **Models**
2. Click on your model
3. Click **+ Add Calculated Field**

### Step 2: Define the Calculation

Use the formula editor with:
- SQL syntax for complex logic
- References to existing fields: `{Field Name}`
- Built-in functions

### Step 3: Set Properties

```yaml
Properties:
  Name: Conversion Rate
  Description: Percentage of visitors who purchased
  Type: measure
  Format: percent
  Decimal Places: 2
  
  Dependencies:
    - Purchasers
    - Total Visitors
```

---

## Formula Syntax

### Referencing Fields

Reference existing dimensions and measures:

```sql
-- Reference a measure
{Total Sales}

-- Reference with table prefix
{orders.amount}

-- Reference a dimension
{Customer Segment}
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `{Revenue} + {Tax}` |
| `-` | Subtraction | `{Revenue} - {Refunds}` |
| `*` | Multiplication | `{Quantity} * {Price}` |
| `/` | Division | `{Profit} / {Revenue}` |
| `%` | Modulo | `{Value} % 100` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal | `status = 'active'` |
| `!=` | Not equal | `region != 'Other'` |
| `>` | Greater than | `amount > 100` |
| `<` | Less than | `quantity < 10` |
| `>=` | Greater or equal | `score >= 80` |
| `<=` | Less or equal | `age <= 65` |

---

## Built-in Functions

### Aggregate Functions

```sql
SUM(column)
COUNT(column)
COUNT(DISTINCT column)
AVG(column)
MIN(column)
MAX(column)
MEDIAN(column)
```

### String Functions

```sql
CONCAT(str1, str2)
UPPER(string)
LOWER(string)
TRIM(string)
SUBSTRING(string, start, length)
REPLACE(string, from, to)
LENGTH(string)
```

### Date Functions

```sql
DATE_TRUNC('month', date)
DATE_ADD(date, INTERVAL 1 DAY)
DATE_DIFF('day', date1, date2)
EXTRACT(YEAR FROM date)
CURRENT_DATE
CURRENT_TIMESTAMP
```

### Math Functions

```sql
ABS(number)
ROUND(number, decimals)
FLOOR(number)
CEIL(number)
POWER(base, exponent)
SQRT(number)
LOG(number)
```

### Conditional Functions

```sql
-- CASE statement
CASE 
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default_result
END

-- IF shorthand
IF(condition, then_value, else_value)

-- COALESCE (first non-null)
COALESCE(value1, value2, default)

-- NULLIF
NULLIF(value, compare_value)
```

---

## Common Patterns

### Percentage Calculations

```yaml
Name: Profit Margin
Formula: |
  ({Revenue} - {Cost}) / NULLIF({Revenue}, 0) * 100
Format: percent
```

!!! tip "Avoid Division by Zero"
    Always use `NULLIF(divisor, 0)` to prevent division by zero errors.

### Year-over-Year Growth

```yaml
Name: YoY Growth
Formula: |
  ({Current Year Sales} - {Previous Year Sales}) / 
  NULLIF({Previous Year Sales}, 0)
Format: percent
```

### Running Totals

```yaml
Name: Cumulative Revenue
SQL: |
  SUM({Revenue}) OVER (
    ORDER BY {Order Date}
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  )
```

### Percent of Total

```yaml
Name: Revenue Share
SQL: |
  {Revenue} / SUM({Revenue}) OVER ()
Format: percent
```

### Time Comparisons

```yaml
Name: Same Period Last Year
SQL: |
  SUM(CASE 
    WHEN {Order Date} >= DATE_ADD(CURRENT_DATE, INTERVAL -1 YEAR)
    AND {Order Date} < CURRENT_DATE
    THEN {Amount}
  END)
```

### Conditional Aggregation

```yaml
Name: Completed Orders
SQL: |
  COUNT(CASE WHEN {Status} = 'completed' THEN 1 END)
```

### Bucketing

```yaml
Name: Order Size Bucket
SQL: |
  CASE
    WHEN {Order Amount} < 50 THEN 'Small'
    WHEN {Order Amount} < 200 THEN 'Medium'
    WHEN {Order Amount} < 1000 THEN 'Large'
    ELSE 'Enterprise'
  END
```

---

## Level of Detail (LOD) Expressions

Control the granularity of calculations.

### FIXED LOD

Calculate at a specific grain:

```yaml
Name: Customer Lifetime Value
SQL: |
  {FIXED {Customer ID}: SUM({Order Amount})}
Description: Total spend per customer regardless of dashboard filters
```

### INCLUDE LOD

Add dimensions to the calculation:

```yaml
Name: Sales per Category Customer
SQL: |
  {INCLUDE {Category}: SUM({Amount}) / COUNT(DISTINCT {Customer ID})}
```

### EXCLUDE LOD

Remove dimensions from the calculation:

```yaml
Name: Percent of Category Total
SQL: |
  {Amount} / {EXCLUDE {Product}: SUM({Amount})}
Format: percent
```

---

## Validation and Testing

### Preview Results

1. In the formula editor, click **Preview**
2. See sample calculated values
3. Verify against expected results

### Test in Queries

1. Go to **Query**
2. Use the calculated field in a question
3. Click **Show SQL** to verify

### Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Division by zero | Null or zero divisor | Use `NULLIF()` |
| Type mismatch | Comparing incompatible types | Cast to matching types |
| Invalid reference | Field name not found | Check spelling and existence |
| Circular reference | Field references itself | Break the circular dependency |

---

## Best Practices

### Naming

- Use clear, business-friendly names
- Include units where appropriate (e.g., "Revenue (USD)")
- Prefix with category if needed (e.g., "Customer: Lifetime Value")

### Documentation

```yaml
Name: Churn Rate
Description: |
  Percentage of customers who stopped purchasing.
  
  Calculation: Churned customers / Total customers
  
  A customer is considered "churned" if they have not
  made a purchase in the last 90 days.
  
  Updated: Monthly
  Owner: Analytics Team
```

### Performance

- Use pre-aggregated measures when possible
- Avoid complex calculations on high-cardinality fields
- Consider materializing frequently used calculations

---

## Next Steps

- [Dimensions and Measures](dimensions-measures.md)
- [Relationships](relationships.md)
- [Build Dashboards](../../getting-started/first-dashboard.md)
