# SQL Reference

This document provides a reference for SQL syntax supported in NovaSight's query editor.

## Overview

NovaSight supports standard SQL with extensions for analytics. The SQL dialect depends on your underlying data source, but NovaSight provides a consistent interface.

---

## Basic Syntax

### SELECT Statement

```sql
SELECT 
    column1,
    column2,
    aggregate_function(column3) AS alias
FROM table_name
WHERE condition
GROUP BY column1, column2
HAVING aggregate_condition
ORDER BY column1 [ASC|DESC]
LIMIT n
OFFSET m;
```

### Example

```sql
SELECT 
    region,
    product_category,
    SUM(amount) AS total_sales,
    COUNT(*) AS order_count
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY region, product_category
HAVING SUM(amount) > 10000
ORDER BY total_sales DESC
LIMIT 10;
```

---

## Data Types

### Numeric Types

| Type | Description | Example |
|------|-------------|---------|
| `INTEGER` | Whole numbers | `42` |
| `BIGINT` | Large integers | `9223372036854775807` |
| `DECIMAL(p,s)` | Exact decimal | `DECIMAL(10,2)` |
| `FLOAT` | Floating point | `3.14159` |
| `DOUBLE` | Double precision | `3.141592653589793` |

### String Types

| Type | Description | Example |
|------|-------------|---------|
| `VARCHAR(n)` | Variable string | `VARCHAR(255)` |
| `TEXT` | Long text | Unlimited |
| `CHAR(n)` | Fixed string | `CHAR(10)` |

### Date/Time Types

| Type | Description | Example |
|------|-------------|---------|
| `DATE` | Date only | `'2024-01-15'` |
| `TIME` | Time only | `'14:30:00'` |
| `TIMESTAMP` | Date and time | `'2024-01-15 14:30:00'` |
| `INTERVAL` | Duration | `INTERVAL '1 day'` |

### Boolean Type

| Type | Values |
|------|--------|
| `BOOLEAN` | `TRUE`, `FALSE`, `NULL` |

---

## Operators

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal | `status = 'active'` |
| `<>` or `!=` | Not equal | `region <> 'Other'` |
| `<` | Less than | `amount < 100` |
| `>` | Greater than | `quantity > 10` |
| `<=` | Less or equal | `age <= 65` |
| `>=` | Greater or equal | `score >= 80` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `AND` | Both true | `a > 1 AND b < 10` |
| `OR` | Either true | `status = 'A' OR status = 'B'` |
| `NOT` | Negation | `NOT is_deleted` |

### Pattern Matching

| Operator | Description | Example |
|----------|-------------|---------|
| `LIKE` | Pattern match | `name LIKE 'John%'` |
| `ILIKE` | Case-insensitive | `email ILIKE '%@gmail.com'` |
| `SIMILAR TO` | Regex-like | `code SIMILAR TO '[A-Z]{3}[0-9]{4}'` |

### Range and Set Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `BETWEEN` | Range check | `amount BETWEEN 100 AND 500` |
| `IN` | Set membership | `region IN ('North', 'South')` |
| `IS NULL` | Null check | `deleted_at IS NULL` |
| `IS NOT NULL` | Not null | `email IS NOT NULL` |

---

## Aggregate Functions

### Basic Aggregates

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT(*)` | Row count | `COUNT(*)` |
| `COUNT(col)` | Non-null count | `COUNT(email)` |
| `COUNT(DISTINCT col)` | Unique count | `COUNT(DISTINCT customer_id)` |
| `SUM(col)` | Total | `SUM(amount)` |
| `AVG(col)` | Average | `AVG(price)` |
| `MIN(col)` | Minimum | `MIN(created_at)` |
| `MAX(col)` | Maximum | `MAX(score)` |

### Statistical Aggregates

| Function | Description |
|----------|-------------|
| `STDDEV(col)` | Standard deviation |
| `VARIANCE(col)` | Variance |
| `PERCENTILE_CONT(p)` | Continuous percentile |
| `PERCENTILE_DISC(p)` | Discrete percentile |
| `MEDIAN(col)` | Median value |

### Example

```sql
SELECT 
    category,
    COUNT(*) AS count,
    SUM(amount) AS total,
    AVG(amount) AS average,
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median
FROM orders
GROUP BY category;
```

---

## Window Functions

### Syntax

```sql
function_name(args) OVER (
    [PARTITION BY partition_columns]
    [ORDER BY sort_columns]
    [frame_clause]
)
```

### Ranking Functions

| Function | Description |
|----------|-------------|
| `ROW_NUMBER()` | Unique row number |
| `RANK()` | Rank with gaps |
| `DENSE_RANK()` | Rank without gaps |
| `NTILE(n)` | Divide into n buckets |

### Aggregate Windows

| Function | Description |
|----------|-------------|
| `SUM() OVER()` | Running/cumulative sum |
| `AVG() OVER()` | Moving average |
| `COUNT() OVER()` | Running count |

### Navigation Functions

| Function | Description |
|----------|-------------|
| `LAG(col, n)` | Previous row value |
| `LEAD(col, n)` | Next row value |
| `FIRST_VALUE(col)` | First value in partition |
| `LAST_VALUE(col)` | Last value in partition |

### Examples

```sql
-- Row numbers within each region
SELECT 
    region,
    customer_name,
    revenue,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) AS rank
FROM customers;

-- Running total
SELECT 
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) AS running_total
FROM orders;

-- Percent of total
SELECT 
    product,
    sales,
    sales * 100.0 / SUM(sales) OVER () AS percent_of_total
FROM product_sales;
```

---

## Date Functions

### Current Date/Time

| Function | Returns |
|----------|---------|
| `CURRENT_DATE` | Today's date |
| `CURRENT_TIMESTAMP` | Current timestamp |
| `NOW()` | Current timestamp |

### Date Parts

| Function | Description | Example |
|----------|-------------|---------|
| `EXTRACT(part FROM date)` | Extract component | `EXTRACT(YEAR FROM order_date)` |
| `DATE_PART('part', date)` | Same as EXTRACT | `DATE_PART('month', order_date)` |
| `DATE_TRUNC('part', date)` | Truncate to part | `DATE_TRUNC('month', order_date)` |

### Date Arithmetic

| Function | Description | Example |
|----------|-------------|---------|
| `date + INTERVAL` | Add interval | `order_date + INTERVAL '30 days'` |
| `date - INTERVAL` | Subtract interval | `NOW() - INTERVAL '1 year'` |
| `DATE_ADD(date, interval)` | Add to date | `DATE_ADD(order_date, INTERVAL 7 DAY)` |
| `DATEDIFF(date1, date2)` | Days between | `DATEDIFF(end_date, start_date)` |

### Formatting

| Function | Description | Example |
|----------|-------------|---------|
| `TO_CHAR(date, format)` | Format date | `TO_CHAR(order_date, 'YYYY-MM')` |
| `TO_DATE(string, format)` | Parse date | `TO_DATE('2024-01-15', 'YYYY-MM-DD')` |

### Examples

```sql
-- Sales by month
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS total_sales
FROM orders
WHERE order_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1
ORDER BY 1;

-- Compare to same day last year
SELECT 
    SUM(CASE WHEN order_date = CURRENT_DATE THEN amount END) AS today,
    SUM(CASE WHEN order_date = CURRENT_DATE - INTERVAL '1 year' THEN amount END) AS last_year
FROM orders;
```

---

## String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CONCAT(s1, s2, ...)` | Concatenate | `CONCAT(first_name, ' ', last_name)` |
| `UPPER(s)` | Uppercase | `UPPER(name)` |
| `LOWER(s)` | Lowercase | `LOWER(email)` |
| `TRIM(s)` | Remove whitespace | `TRIM(input)` |
| `LENGTH(s)` | String length | `LENGTH(description)` |
| `SUBSTRING(s, start, len)` | Extract substring | `SUBSTRING(phone, 1, 3)` |
| `REPLACE(s, from, to)` | Replace text | `REPLACE(url, 'http:', 'https:')` |
| `SPLIT_PART(s, delim, n)` | Split and get part | `SPLIT_PART(email, '@', 2)` |

---

## Conditional Expressions

### CASE Statement

```sql
CASE 
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ELSE default_result
END
```

### COALESCE

```sql
COALESCE(value1, value2, default)  -- First non-null value
```

### NULLIF

```sql
NULLIF(value, compare)  -- NULL if equal, else value
```

### Examples

```sql
-- Customer segments
SELECT 
    customer_name,
    CASE 
        WHEN lifetime_value >= 10000 THEN 'Enterprise'
        WHEN lifetime_value >= 1000 THEN 'Business'
        ELSE 'Consumer'
    END AS segment
FROM customers;

-- Safe division
SELECT 
    region,
    COALESCE(sales / NULLIF(target, 0), 0) AS attainment
FROM sales_targets;
```

---

## Joins

### Join Types

| Type | Description |
|------|-------------|
| `INNER JOIN` | Matching rows only |
| `LEFT JOIN` | All left + matching right |
| `RIGHT JOIN` | All right + matching left |
| `FULL OUTER JOIN` | All rows from both |
| `CROSS JOIN` | Cartesian product |

### Syntax

```sql
SELECT *
FROM table1
JOIN table2 ON table1.id = table2.table1_id;

-- or using alias
SELECT o.*, c.name
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
```

---

## Common Table Expressions (CTEs)

### Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

### Example

```sql
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount) AS total
    FROM orders
    GROUP BY 1
),
growth AS (
    SELECT 
        month,
        total,
        LAG(total) OVER (ORDER BY month) AS prev_month,
        (total - LAG(total) OVER (ORDER BY month)) / LAG(total) OVER (ORDER BY month) AS growth_rate
    FROM monthly_sales
)
SELECT * FROM growth;
```

---

## Subqueries

### In SELECT

```sql
SELECT 
    customer_name,
    (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) AS order_count
FROM customers c;
```

### In FROM

```sql
SELECT *
FROM (
    SELECT region, SUM(amount) AS total
    FROM orders
    GROUP BY region
) AS regional_totals
WHERE total > 10000;
```

### In WHERE

```sql
SELECT *
FROM products
WHERE category_id IN (
    SELECT id FROM categories WHERE name = 'Electronics'
);
```

---

## Performance Tips

### Use Indexes

Query columns that are indexed:
- Primary keys
- Foreign keys
- Frequently filtered columns

### Limit Data

```sql
-- Add time filters
WHERE order_date >= '2024-01-01'

-- Limit rows
LIMIT 1000
```

### Avoid SELECT *

```sql
-- Bad
SELECT * FROM large_table;

-- Good
SELECT id, name, amount FROM large_table;
```

---

## Next Steps

- [Keyboard Shortcuts](keyboard-shortcuts.md)
- [Natural Language Tips](../guides/natural-language/tips-tricks.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
