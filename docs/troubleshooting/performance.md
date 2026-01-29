# Performance Optimization

This guide covers techniques to optimize NovaSight performance for better user experience.

## Query Performance

### Optimize Your Queries

#### Add Time Filters

Always include time boundaries:

```sql
-- Slow
SELECT SUM(amount) FROM orders;

-- Fast
SELECT SUM(amount) FROM orders 
WHERE created_at >= '2024-01-01';
```

#### Limit Results

Avoid fetching more data than needed:

```sql
-- Return only needed rows
SELECT * FROM customers LIMIT 100;

-- Use TOP N for rankings
SELECT * FROM customers 
ORDER BY revenue DESC 
LIMIT 10;
```

#### Select Only Needed Columns

```sql
-- Slow
SELECT * FROM orders;

-- Fast
SELECT order_id, amount, status FROM orders;
```

### Database Optimization

#### Index Key Columns

Ensure indexes exist on:
- Primary keys
- Foreign keys
- Frequently filtered columns
- Date/timestamp columns

```sql
-- Example index creation
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

#### Analyze Query Plans

Use EXPLAIN to understand query performance:

```sql
EXPLAIN ANALYZE
SELECT region, SUM(amount) 
FROM orders 
WHERE created_at >= '2024-01-01'
GROUP BY region;
```

Look for:
- Sequential scans (consider adding indexes)
- High row estimates
- Nested loops with large datasets

### Pre-Aggregation

For frequently used aggregations, create summary tables:

```sql
-- Create daily summary
CREATE TABLE daily_sales_summary AS
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    region,
    product_category,
    SUM(amount) AS total_sales,
    COUNT(*) AS order_count
FROM orders
GROUP BY 1, 2, 3;

-- Refresh daily
REFRESH MATERIALIZED VIEW daily_sales_summary;
```

---

## Dashboard Performance

### Widget Optimization

#### Limit Widgets Per Dashboard

| Widget Count | Load Time | Recommendation |
|-------------|-----------|----------------|
| 1-5 | Fast | ✅ Optimal |
| 6-10 | Moderate | ✅ Good |
| 11-15 | Slow | ⚠️ Consider splitting |
| 16+ | Very slow | ❌ Split into multiple dashboards |

#### Use Progressive Loading

Configure widgets to load incrementally:

1. Go to Dashboard Settings
2. Enable "Progressive Loading"
3. Set priority for critical widgets

#### Reduce Query Complexity

| Slow Pattern | Fast Alternative |
|-------------|------------------|
| Multiple CTEs | Pre-aggregated tables |
| Complex JOINs | Denormalized views |
| Subqueries | JOINs with aggregation |

### Caching

#### Enable Query Caching

```yaml
Cache Settings:
  Enabled: true
  TTL: 15 minutes
  Max Size: 1 GB
```

#### Cache Configuration

| Use Case | Recommended TTL |
|----------|-----------------|
| Real-time dashboards | 1-5 minutes |
| Daily reports | 1 hour |
| Historical analysis | 24 hours |

#### Force Cache Refresh

1. Click the refresh icon (🔄)
2. Hold Shift + Click for hard refresh (bypasses cache)

### Default Filters

Set sensible default filters:

```yaml
Default Filters:
  Date Range: "Last 30 days"  # Not "All time"
  Limit: 1000  # Not unlimited
```

---

## Data Source Performance

### Connection Pooling

Configure optimal pool sizes:

```yaml
Connection Pool:
  Min Connections: 2
  Max Connections: 10
  Connection Timeout: 30s
  Idle Timeout: 300s
```

### Read Replicas

Connect to read replicas for analytics:

- Reduces load on primary database
- Often optimized for read operations
- May have slight lag (usually acceptable)

### Query Timeout

Set appropriate timeouts:

```yaml
Query Settings:
  Statement Timeout: 60s  # Kill slow queries
  Connection Timeout: 30s
```

---

## Browser Performance

### Clear Cache Regularly

| Browser | Shortcut |
|---------|----------|
| Chrome | Ctrl+Shift+Delete |
| Firefox | Ctrl+Shift+Delete |
| Safari | Cmd+Option+E |
| Edge | Ctrl+Shift+Delete |

### Disable Unnecessary Extensions

Extensions can slow down NovaSight:
1. Open browser extensions
2. Disable ad blockers, dev tools extensions
3. Test performance

### Use Modern Browsers

| Browser | Minimum Version | Recommended |
|---------|-----------------|-------------|
| Chrome | 90+ | Latest |
| Firefox | 88+ | Latest |
| Safari | 14+ | Latest |
| Edge | 90+ | Latest |

---

## Semantic Layer Optimization

### Limit Dimensions

High cardinality dimensions impact performance:

| Cardinality | Example | Impact |
|-------------|---------|--------|
| Low (<100) | Region, Category | ✅ Fast |
| Medium (100-10K) | City, Product | ⚠️ Moderate |
| High (>10K) | Customer ID, SKU | ❌ Slow for GROUP BY |

### Use Calculated Fields Wisely

```yaml
# Efficient - calculated at query time
Calculated Field:
  Name: Profit Margin
  SQL: (revenue - cost) / revenue
  
# Less efficient - nested aggregation
Calculated Field:
  Name: Complex Ratio
  SQL: SUM(a) / (SUM(b) + SUM(c) - SUM(d))
```

### Optimize Relationships

- Prefer simple relationships over complex paths
- Limit relationship depth (max 3-4 joins)
- Use denormalized tables for common patterns

---

## Monitoring Performance

### Query Metrics

Monitor these metrics:

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| Query time | <1s | 1-5s | >5s |
| Rows returned | <10K | 10K-100K | >100K |
| Cache hit rate | >80% | 50-80% | <50% |

### Dashboard Metrics

Track dashboard performance:

1. Go to Dashboard Settings
2. Click "Performance"
3. View:
   - Load time
   - Slowest widgets
   - Cache hit rate

### Slow Query Log

Enable slow query logging:

```yaml
Logging:
  Slow Query Threshold: 5s
  Log Location: Admin > Logs
```

---

## Troubleshooting Slow Queries

### Diagnostic Steps

1. **Identify the slow query**
   - Check which widget is slow
   - View the generated SQL

2. **Run EXPLAIN ANALYZE**
   - Understand the query plan
   - Identify bottlenecks

3. **Check for missing indexes**
   - Look for sequential scans
   - Add indexes on filtered columns

4. **Reduce data scope**
   - Add time filters
   - Limit dimensions

5. **Consider pre-aggregation**
   - Create summary tables
   - Use dbt for transformations

### Performance Checklist

- [ ] Time filter applied
- [ ] Reasonable date range
- [ ] Limited number of dimensions
- [ ] Indexes on key columns
- [ ] Query caching enabled
- [ ] Reasonable row limit
- [ ] Using pre-aggregated data where possible

---

## Best Practices Summary

### Do

- ✅ Add time filters to all queries
- ✅ Use indexes on filtered columns
- ✅ Enable query caching
- ✅ Pre-aggregate frequently used metrics
- ✅ Keep dashboard widget count under 10
- ✅ Set sensible default filters

### Don't

- ❌ Query "all time" data
- ❌ SELECT * from large tables
- ❌ Create high-cardinality dimensions
- ❌ Nest many CTEs or subqueries
- ❌ Ignore slow query warnings
- ❌ Skip indexes on filter columns

---

## Next Steps

- [Common Issues](common-issues.md)
- [FAQ](faq.md)
- [SQL Reference](../reference/sql-reference.md)
