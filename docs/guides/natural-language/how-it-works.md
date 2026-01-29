# How Natural Language Queries Work

This guide explains how NovaSight's AI-powered natural language query system works.

## Overview

NovaSight uses local LLMs (powered by Ollama) to understand your questions and translate them into SQL queries. This enables anyone to explore data without knowing SQL.

---

## The NL2SQL Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    Natural Language Query                        │
│              "What were total sales by region last month?"       │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Step 1: Parse Intent                           │
│  ─────────────────────────────────────────────────────────────── │
│  Metric: "total sales"                                            │
│  Dimension: "region"                                              │
│  Time Filter: "last month"                                        │
│  Aggregation: sum                                                 │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Step 2: Semantic Mapping                       │
│  ─────────────────────────────────────────────────────────────── │
│  "total sales" → {Measure: Total Sales, SQL: SUM(orders.amount)} │
│  "region" → {Dimension: Region, SQL: orders.region}              │
│  "last month" → {Filter: created_at >= '2024-12-01'}             │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Step 3: Generate SQL                           │
│  ─────────────────────────────────────────────────────────────── │
│  SELECT                                                           │
│    orders.region AS "Region",                                     │
│    SUM(orders.amount) AS "Total Sales"                           │
│  FROM orders                                                      │
│  WHERE orders.created_at >= '2024-12-01'                         │
│    AND orders.created_at < '2025-01-01'                          │
│  GROUP BY orders.region                                          │
│  ORDER BY "Total Sales" DESC                                      │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Step 4: Execute & Visualize                    │
│  ─────────────────────────────────────────────────────────────── │
│  Execute query against database                                   │
│  Choose optimal visualization (bar chart)                         │
│  Render results to user                                           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Intent Recognition

The AI identifies:
- **What** you want to measure (metrics)
- **How** you want to group it (dimensions)
- **Which** data to include (filters)
- **How** to sort or limit (ordering)

### 2. Semantic Layer Matching

Your question is matched to defined:
- **Measures**: Quantitative values (sales, counts, averages)
- **Dimensions**: Grouping attributes (region, category, date)
- **Relationships**: How tables connect

### 3. SQL Generation

The system generates optimized SQL:
- Proper joins based on relationships
- Correct aggregations
- Appropriate filters
- Performance optimizations

### 4. Visualization Selection

NovaSight auto-selects the best chart:

| Query Pattern | Suggested Visualization |
|--------------|------------------------|
| Single value | KPI / Number |
| Value by time | Line chart |
| Value by category | Bar chart |
| Part of whole | Pie chart |
| Multiple values by time | Multi-line chart |
| Raw data request | Table |

---

## The AI Engine

### Local LLM (Ollama)

NovaSight uses Ollama for on-premise AI:

```yaml
AI Engine:
  Provider: Ollama
  Model: mistral | llama2 | codellama
  
  Benefits:
    - Data stays on-premise
    - No API costs
    - Low latency
    - Customizable
```

### Model Fine-tuning

The model is optimized for:
- SQL generation
- Business terminology
- Your semantic layer definitions

---

## Query Understanding

### Entity Extraction

The AI extracts entities from your question:

```yaml
Input: "Show me top 10 customers by revenue in Q4 2024"

Entities:
  Measures:
    - revenue (SUM of sales)
  Dimensions:
    - customer (customer name)
  Filters:
    - time: Q4 2024 (Oct-Dec)
  Modifiers:
    - top: 10
    - sort: descending
```

### Disambiguation

When queries are ambiguous, NovaSight:

1. Uses context from semantic layer
2. Applies business rules
3. May ask for clarification

```yaml
Input: "Show sales"

Ambiguous:
  - Which measure? (Total Sales, Net Sales, Gross Sales)
  - What time period?
  - Any grouping?
  
Resolution:
  - Use default measure: "Total Sales"
  - Use default period: "Last 30 days"
  - No grouping: show single value
```

---

## Confidence Scoring

Each query gets a confidence score:

| Confidence | Indicator | Action |
|------------|-----------|--------|
| High (>90%) | ✅ Green | Execute directly |
| Medium (70-90%) | 🟡 Yellow | Show interpretation, allow edit |
| Low (<70%) | ⚠️ Orange | Ask for clarification |

---

## Query Refinement

### See Generated SQL

1. Run your query
2. Click **Show SQL**
3. View the generated query

### Edit SQL

For power users:

1. Click **Edit SQL**
2. Modify the query
3. Click **Run** to execute

### Refine Question

If results aren't right:

1. Click **Refine**
2. Adjust your question
3. Re-run

---

## Limitations

### What Works Well

- ✅ Aggregations (sum, count, average)
- ✅ Time-based filtering
- ✅ Grouping by dimensions
- ✅ Comparisons (vs last period)
- ✅ Top/bottom N
- ✅ Simple joins

### Current Limitations

- ⚠️ Very complex multi-join queries
- ⚠️ Subqueries and CTEs
- ⚠️ Statistical functions
- ⚠️ Unstructured data analysis
- ⚠️ Questions outside your semantic layer

---

## Best Practices

### For Better Results

1. **Use semantic layer terms**: Match the names you defined
2. **Be specific about time**: "last month" vs "in 2024"
3. **Specify dimensions**: "by region" vs generic grouping
4. **Start simple**: Build up complexity gradually

### Improving the System

1. **Define clear measures**: Good names = better matching
2. **Add descriptions**: Help the AI understand context
3. **Create synonyms**: Map alternate terms
4. **Review failed queries**: Improve semantic definitions

---

## Next Steps

- [Writing Effective Queries](writing-queries.md)
- [Tips and Tricks](tips-tricks.md)
- [Semantic Layer Guide](../semantic-layer/dimensions-measures.md)
