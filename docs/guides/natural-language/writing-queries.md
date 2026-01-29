# Writing Effective Natural Language Queries

NovaSight uses AI to understand your questions and translate them into database queries. Here's how to get the best results.

## Basic Query Patterns

### Aggregations

Ask for totals, averages, counts, etc.

| What You Type | What You Get |
|---------------|--------------|
| "Total sales" | Sum of all sales |
| "Average order value" | Mean order amount |
| "Number of customers" | Count of customers |
| "Minimum price" | Lowest price |
| "Maximum revenue" | Highest revenue |

### Grouping

Add "by" to group your results.

| What You Type | What You Get |
|---------------|--------------|
| "Sales by region" | Sales broken down by region |
| "Orders by month" | Orders grouped by month |
| "Revenue by product category" | Revenue per category |
| "Customers by country" | Customer count per country |

### Filtering

Use time periods and conditions.

| What You Type | What You Get |
|---------------|--------------|
| "Sales last month" | Sales from the previous month |
| "Orders this year" | Orders from current year |
| "Customers in California" | Only CA customers |
| "Products over $100" | Products priced above $100 |
| "Active users" | Users with active status |

---

## Time-Based Queries

### Relative Time

Common relative time expressions:

```
yesterday
last week
last month
last quarter
this year
last 7 days
last 30 days
last 90 days
year to date
quarter to date
month to date
```

### Specific Periods

Reference specific time periods:

```
in January 2024
in Q4 2023
between March and June
from Jan 1 to Jun 30
in the year 2023
during December
```

### Comparisons

Compare time periods:

```
compared to last month
vs same period last year
year over year
month over month
growth from Q1 to Q2
change from last week
```

### Examples

| Query | Description |
|-------|-------------|
| "Sales this month vs last month" | Monthly comparison |
| "Revenue year over year" | YoY comparison |
| "Orders today compared to yesterday" | Daily comparison |
| "Growth from Q1 to Q2 2024" | Quarter comparison |

---

## Advanced Patterns

### Top/Bottom N

Get the best or worst performers:

```
Top 10 customers by revenue
Bottom 5 products by sales
Top 20% of orders by value
Highest selling region
Lowest performing category
Best customer this month
```

### Percentages

Calculate proportions:

```
Percentage of orders by category
Sales as percent of total
Revenue share by region
Conversion rate by source
Return rate percentage
```

### Trends

Analyze patterns over time:

```
Sales trend over last 12 months
Daily order trend
Revenue growth by quarter
Weekly active users trend
Monthly retention trend
```

### Rankings

Rank items:

```
Rank products by sales
Customer ranking by lifetime value
Region rankings this quarter
```

---

## Combining Patterns

Combine multiple patterns for complex queries:

### Pattern + Time

```
Top 10 customers by revenue last quarter
Average order value by month this year
Lowest performing products in Q4
```

### Pattern + Filter

```
Sales by region for orders over $1000
Top customers in the Enterprise segment
Monthly trend for active products only
```

### Pattern + Comparison

```
Top 10 products this year vs last year
Sales by region compared to last month
Conversion rate trend YoY
```

---

## Question Starters

Different ways to phrase your questions:

### Show Me

```
Show me total sales
Show me orders by region
Show me the top customers
```

### What

```
What were total sales last month?
What is the average order value?
What are the top selling products?
```

### How Many

```
How many orders were placed this week?
How many customers do we have?
How many products are in each category?
```

### Which

```
Which region has the highest sales?
Which product sells the most?
Which customers are most valuable?
```

### List

```
List all orders from last week
List customers by revenue
List products by category
```

---

## Operators and Modifiers

### Comparison Operators

| Phrase | Meaning |
|--------|---------|
| "greater than", "more than", "above" | > |
| "less than", "below", "under" | < |
| "at least", "minimum of" | >= |
| "at most", "maximum of" | <= |
| "equal to", "exactly" | = |
| "not", "excluding", "except" | != |

### Logical Operators

| Phrase | Meaning |
|--------|---------|
| "and", "with", "having" | AND |
| "or" | OR |
| "not", "without", "excluding" | NOT |

### Examples

```
Orders greater than $500 and less than $2000
Customers in California or Texas
Products not in the Electronics category
Sales above average
```

---

## Troubleshooting Queries

### Query Not Understood

If NovaSight doesn't understand:

1. **Simplify**: Break into smaller questions
2. **Use exact terms**: Match semantic layer names
3. **Add context**: Specify time period, dimension

### Wrong Results

If results don't look right:

1. **Check SQL**: Click "Show SQL" to verify
2. **Verify filters**: Are filters applied correctly?
3. **Check semantic layer**: Is the measure defined correctly?

### Slow Queries

If queries are slow:

1. **Add time filter**: Limit date range
2. **Reduce dimensions**: Group by fewer fields
3. **Use aggregated data**: Check if pre-aggregated tables exist

---

## Practice Examples

Try these queries to get started:

### Sales Analysis
```
Total sales this year
Sales by region last quarter
Top 10 products by revenue
Sales trend by month
Average order value by customer segment
```

### Customer Analysis
```
Number of new customers this month
Customer retention rate
Top customers by lifetime value
Customers by acquisition channel
Active customers vs churned
```

### Product Analysis
```
Best selling products
Products by category
Inventory levels by warehouse
Low stock products
Product revenue trend
```

---

## Next Steps

- [Tips and Tricks](tips-tricks.md)
- [How NL Queries Work](how-it-works.md)
- [Semantic Layer Guide](../semantic-layer/dimensions-measures.md)
