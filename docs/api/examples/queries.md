# Natural Language Query Examples

This guide demonstrates how to use NovaSight's AI-powered analytics assistant.

## Basic Query

Ask questions in natural language and get structured data back.

```bash
curl -X POST http://localhost:5000/api/v1/assistant/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What were total sales by region last month?"
  }'
```

### Response

```json
{
  "data": [
    {"region": "North America", "total_sales": 1250000.00},
    {"region": "Europe", "total_sales": 890000.00},
    {"region": "Asia Pacific", "total_sales": 720000.00},
    {"region": "Latin America", "total_sales": 340000.00}
  ],
  "columns": [
    {"name": "region", "type": "string", "label": "Region"},
    {"name": "total_sales", "type": "number", "label": "Total Sales"}
  ],
  "row_count": 4,
  "execution_time_ms": 145.3,
  "generated_sql": "SELECT region, SUM(amount) as total_sales FROM orders WHERE order_date >= '2025-12-01' AND order_date < '2026-01-01' GROUP BY region ORDER BY total_sales DESC",
  "intent": {
    "dimensions": ["region"],
    "measures": ["total_sales"],
    "filters": [],
    "time_range": {
      "type": "relative",
      "period": "last_month"
    },
    "aggregation": "sum",
    "limit": null,
    "sort": {"field": "total_sales", "direction": "desc"}
  }
}
```

## Query Options

### Parse Only (Don't Execute)

See how the AI interprets your query without executing it:

```bash
curl -X POST http://localhost:5000/api/v1/assistant/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me top 10 customers by lifetime value",
    "execute": false
  }'
```

### With Explanation

Get an AI-generated explanation of the results:

```bash
curl -X POST http://localhost:5000/api/v1/assistant/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare this month sales to last month by product category",
    "explain": true
  }'
```

### Response with Explanation

```json
{
  "data": [...],
  "columns": [...],
  "row_count": 8,
  "execution_time_ms": 234.5,
  "explanation": "Sales increased 12% month-over-month, with Electronics showing the strongest growth at 25%. The Home & Garden category saw a 5% decline, possibly due to seasonal factors. Overall, 6 out of 8 categories showed positive growth."
}
```

### Strict Mode

Reject queries that reference unknown dimensions or measures:

```bash
curl -X POST http://localhost:5000/api/v1/assistant/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me the weather forecast",
    "strict": true
  }'
```

#### Error Response

```json
{
  "error": "Query references unknown data",
  "message": "The query mentions 'weather forecast' which is not available in your semantic models. Available measures: total_sales, order_count, average_order_value. Available dimensions: region, product_category, customer_segment."
}
```

## Example Queries

### Time-Based Analysis

```
"What were sales for the last 7 days?"
"Show monthly revenue for 2025"
"Compare Q4 2025 to Q4 2024"
"What's the week-over-week growth rate?"
```

### Ranking and Top-N

```
"Top 10 products by revenue"
"Bottom 5 regions by order count"
"Which customers placed the most orders?"
"Best performing sales reps this quarter"
```

### Comparisons

```
"Compare online vs in-store sales"
"Show sales by channel and region"
"What's the breakdown by customer segment?"
```

### Aggregations

```
"What's the average order value?"
"How many unique customers do we have?"
"What's the median transaction amount?"
"Show the count of orders by status"
```

### Filtered Queries

```
"Sales in Europe for premium customers"
"Orders over $1000 in the last month"
"Revenue from returning customers"
"Show incomplete orders from last week"
```

## Get Query Suggestions

Get AI-powered suggestions based on your data:

```bash
curl -X POST http://localhost:5000/api/v1/assistant/suggest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Analyzing Q4 sales performance"
  }'
```

### Response

```json
{
  "suggestions": [
    {
      "query": "What were total sales by month in Q4?",
      "description": "Track monthly sales trends during Q4",
      "category": "trends"
    },
    {
      "query": "Which product categories drove the most revenue in Q4?",
      "description": "Identify top-performing categories",
      "category": "ranking"
    },
    {
      "query": "How did Q4 sales compare to Q3?",
      "description": "Quarter-over-quarter comparison",
      "category": "comparison"
    }
  ]
}
```

## Explain Results

Get detailed insights about query results:

```bash
curl -X POST http://localhost:5000/api/v1/assistant/explain \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query_description": "Sales by region for last month",
    "dimensions": ["region"],
    "measures": ["total_sales"],
    "row_count": 4,
    "sample_data": [
      {"region": "North America", "total_sales": 1250000},
      {"region": "Europe", "total_sales": 890000}
    ]
  }'
```

### Response

```json
{
  "explanation": "The data shows sales performance across 4 regions for the past month. North America leads with $1.25M in sales, representing approximately 39% of total revenue. Europe follows at $890K (28%). The top 2 regions account for 67% of total sales.",
  "insights": [
    "North America is the dominant region with 39% market share",
    "Top 2 regions contribute 67% of total revenue",
    "Asia Pacific and Latin America combined represent 33%",
    "Regional distribution is uneven - consider growth strategies for smaller regions"
  ],
  "follow_up_questions": [
    "What products drive the most sales in North America?",
    "How does this month's regional distribution compare to last year?",
    "What's the growth rate by region?"
  ]
}
```

## Get Available Schema

See what dimensions and measures are available for querying:

```bash
curl http://localhost:5000/api/v1/assistant/schema \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "dimensions": [
    {"name": "region", "label": "Region", "type": "string", "model": "sales"},
    {"name": "product_category", "label": "Product Category", "type": "string", "model": "sales"},
    {"name": "customer_segment", "label": "Customer Segment", "type": "string", "model": "customers"},
    {"name": "order_date", "label": "Order Date", "type": "date", "model": "orders"}
  ],
  "measures": [
    {"name": "total_sales", "label": "Total Sales", "type": "sum", "format": "$,.2f", "model": "sales"},
    {"name": "order_count", "label": "Order Count", "type": "count", "model": "orders"},
    {"name": "avg_order_value", "label": "Avg Order Value", "type": "avg", "format": "$,.2f", "model": "orders"},
    {"name": "customer_count", "label": "Customer Count", "type": "count_distinct", "model": "customers"}
  ],
  "models": [
    {
      "id": "uuid-here",
      "name": "sales",
      "label": "Sales",
      "dimensions": [...],
      "measures": [...]
    }
  ]
}
```

## Security Notes

1. **No Raw SQL Generation**: The AI only generates parameters, never executable SQL code. All queries are executed through pre-approved templates (ADR-002 compliance).

2. **Tenant Isolation**: All queries are automatically scoped to your tenant. You cannot query data from other tenants.

3. **Permission Checks**: The `analytics.query` permission is required to use the assistant.

4. **Audit Logging**: All queries are logged for audit purposes.

## Error Handling

### Invalid Query (400)

```json
{
  "error": "Invalid request",
  "details": [
    {"loc": ["query"], "msg": "field required", "type": "value_error.missing"}
  ]
}
```

### No Semantic Models (400)

```json
{
  "error": "No semantic models configured",
  "message": "Please configure semantic models before using natural language queries"
}
```

### AI Service Unavailable (503)

```json
{
  "error": "AI service unavailable",
  "message": "Unable to connect to Ollama service"
}
```
