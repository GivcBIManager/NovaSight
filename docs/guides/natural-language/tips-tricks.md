# Natural Language Tips and Tricks

Get the most out of NovaSight's natural language query system with these tips and tricks.

## Pro Tips

### 1. Use Semantic Layer Terms

Match the exact names defined in your semantic layer:

```
✅ "Total Revenue by Customer Segment"  (matches defined terms)
❌ "Sum of money by customer type"      (generic terms)
```

!!! tip "Auto-Complete"
    Start typing and use auto-complete suggestions to see available dimensions and measures.

### 2. Be Specific About Time

Always include time context:

```
✅ "Sales last month"
✅ "Orders this week"
✅ "Revenue in Q4 2024"
❌ "Sales" (ambiguous time period)
```

### 3. Start Simple, Then Refine

Build complex queries incrementally:

```
Step 1: "Total sales"
Step 2: "Total sales by region"
Step 3: "Total sales by region last month"
Step 4: "Total sales by region last month vs previous month"
```

### 4. Use Follow-Up Questions

After an initial query, ask follow-ups:

```
Initial: "Top 10 customers by revenue"
Follow-up: "Show me their orders"
Follow-up: "Filter to just Enterprise segment"
```

---

## Power User Tricks

### Quick Comparisons

Use "vs" for fast comparisons:

```
"Sales this month vs last month"
"Revenue Q4 vs Q3"
"Orders today vs yesterday"
"Customers this year vs last year"
```

### Percentage of Total

Get proportions quickly:

```
"Sales by region as percentage"
"Revenue share by product"
"Order distribution by source"
```

### Exclude Data

Filter out unwanted values:

```
"Sales excluding refunds"
"Customers not in Enterprise segment"
"Products except category Electronics"
"Orders without discounts"
```

### Combined Metrics

Request multiple metrics at once:

```
"Revenue and order count by month"
"Sales, returns, and net revenue by region"
"Average order value and customer count by segment"
```

---

## Common Patterns

### Time Intelligence

| Query | Result |
|-------|--------|
| "YTD sales" | Year-to-date total |
| "MTD orders" | Month-to-date orders |
| "QTD revenue" | Quarter-to-date revenue |
| "Rolling 12 month average" | 12-month moving average |
| "Same day last week" | Compare to 7 days ago |

### Ranking and Limiting

| Query | Result |
|-------|--------|
| "Top 10" | First 10 by default sort |
| "Top 10 by revenue" | First 10 by revenue |
| "Bottom 5 by sales" | Last 5 by sales |
| "First and last order" | Earliest and latest |
| "Best performing" | #1 by primary metric |

### Aggregation Variations

| Query | Result |
|-------|--------|
| "Total sales" | SUM |
| "Average order value" | AVG |
| "Number of orders" | COUNT |
| "Unique customers" | COUNT DISTINCT |
| "Median price" | MEDIAN |
| "Maximum discount" | MAX |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit query |
| `Shift+Enter` | New line (multiline query) |
| `↑` / `↓` | Navigate query history |
| `Tab` | Accept auto-complete |
| `Esc` | Clear query |
| `Ctrl+Space` | Trigger suggestions |

---

## Query History

### Access History

- Click the **History** icon (🕐)
- Use `↑` arrow to cycle through recent queries

### Save Favorites

1. Run a query
2. Click **Save Query**
3. Give it a name
4. Access from **Saved Queries**

### Share Queries

1. Run your query
2. Click **Share**
3. Copy the link

---

## Handling Ambiguity

### When NovaSight Asks for Clarification

```
Query: "Show sales"

NovaSight: "Which sales metric did you mean?"
  - Total Sales (revenue)
  - Sales Count (number of transactions)
  - Net Sales (after refunds)
  
> Select the intended metric
```

### Pre-empt Ambiguity

Be explicit to avoid clarification:

```
❌ "Show sales"                    → Ambiguous
✅ "Show total revenue"            → Clear
✅ "Show number of sales"          → Clear
✅ "Show net sales after refunds"  → Clear
```

---

## Working with Results

### Change Visualization

After running a query:

1. Click the chart type selector
2. Choose: Bar, Line, Pie, Table, etc.
3. View updates instantly

### Sort Results

```
"Sales by region sorted by highest first"
"Customers ordered by name alphabetically"
"Products by price low to high"
```

### Export Results

1. Click **Export** (📥)
2. Choose format: CSV, Excel, PDF
3. Download

---

## Common Mistakes

### ❌ Too Vague

```
Bad:  "Show me the data"
Good: "Show me total sales by region this month"
```

### ❌ Wrong Time Context

```
Bad:  "Sales in 2025" (future date, no data)
Good: "Sales in 2024"
```

### ❌ Non-Existent Dimensions

```
Bad:  "Sales by customer mood" (not defined)
Good: "Sales by customer segment" (defined in semantic layer)
```

### ❌ Requesting SQL

```
Bad:  "Write a SQL query to get sales"
Good: "Total sales by region"
```

---

## Optimization Tips

### Faster Queries

| Tip | Example |
|-----|---------|
| Add time filter | "last 30 days" not "all time" |
| Limit results | "top 100" not all rows |
| Fewer dimensions | "by region" not "by region, city, zip" |

### Better Accuracy

| Tip | Example |
|-----|---------|
| Use exact terms | Match semantic layer names |
| Specify aggregation | "sum of sales" not just "sales" |
| Include time | Always add date context |

---

## Examples Gallery

### Sales Queries
```
"Total revenue this quarter"
"Daily sales trend for last 30 days"
"Top 10 products by revenue in 2024"
"Sales by channel and region"
"Revenue vs target by month"
```

### Customer Queries
```
"New customers this month"
"Customer count by acquisition source"
"Top customers by lifetime value"
"Retention rate by cohort"
"Churn rate trend"
```

### Operations Queries
```
"Orders pending shipment"
"Average fulfillment time"
"Inventory by warehouse"
"Return rate by product category"
"Shipping costs by carrier"
```

---

## Need Help?

If a query doesn't work:

1. **Check semantic layer** - Is the term defined?
2. **Simplify the question** - Break it down
3. **Use exact names** - Match definitions
4. **Try the SQL editor** - For complex cases

---

## Next Steps

- [How NL Queries Work](how-it-works.md)
- [Writing Effective Queries](writing-queries.md)
- [Semantic Layer Guide](../semantic-layer/dimensions-measures.md)
