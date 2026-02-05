/**
 * NovaSight Database Performance Test
 * 
 * Tests database query performance under various scenarios.
 * Separates simple, complex, and aggregation queries for independent analysis.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

// Custom metrics for different query types
const simpleQueryLatency = new Trend('simple_query_latency')
const complexQueryLatency = new Trend('complex_query_latency')
const aggregationLatency = new Trend('aggregation_latency')
const joinQueryLatency = new Trend('join_query_latency')
const errorRate = new Rate('errors')
const queryCount = new Counter('query_count')

// Multi-scenario configuration
export const options = {
  scenarios: {
    // Scenario 1: Simple queries (SELECT with basic WHERE)
    simple_queries: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'simpleQueries',
      tags: { scenario: 'simple' },
    },
    // Scenario 2: Complex queries (multi-table joins)
    complex_queries: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10m',
      exec: 'complexQueries',
      tags: { scenario: 'complex' },
    },
    // Scenario 3: Aggregation queries
    aggregations: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      exec: 'aggregationQueries',
      tags: { scenario: 'aggregation' },
    },
    // Scenario 4: Mixed realistic workload
    mixed_workload: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '6m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      exec: 'mixedWorkload',
      tags: { scenario: 'mixed' },
    },
  },
  thresholds: {
    simple_query_latency: ['p(95)<1000'],    // Simple queries < 1s
    complex_query_latency: ['p(95)<30000'],   // Complex queries < 30s
    aggregation_latency: ['p(95)<10000'],     // Aggregations < 10s
    join_query_latency: ['p(95)<15000'],      // Joins < 15s
    errors: ['rate<0.05'],                    // Less than 5% errors
  },
  tags: {
    test_type: 'database',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
}

const BASE_URL = __ENV.API_URL || 'http://localhost:5000'
const TEST_TENANT = __ENV.TENANT_SLUG || 'perf-test'

let authToken = null
let authHeaders = null

export function setup() {
  console.log(`Starting database performance test against ${BASE_URL}`)
  
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER || 'perf-test@example.com',
      password: __ENV.TEST_PASSWORD || 'Admin123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
  
  if (loginRes.status !== 200) {
    throw new Error('Setup failed: Could not authenticate')
  }
  
  return {
    token: loginRes.json('data.access_token'),
  }
}

// Scenario 1: Simple Queries
export function simpleQueries(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  const simpleQuerySet = [
    'SELECT * FROM orders LIMIT 100',
    'SELECT * FROM customers WHERE status = \'active\' LIMIT 50',
    'SELECT * FROM products WHERE category = \'electronics\' LIMIT 100',
    'SELECT id, name, email FROM customers LIMIT 200',
    'SELECT * FROM orders WHERE created_at > now() - INTERVAL 1 DAY LIMIT 100',
  ]
  
  const query = simpleQuerySet[Math.floor(Math.random() * simpleQuerySet.length)]
  
  const startTime = Date.now()
  const res = http.post(
    `${BASE_URL}/api/v1/query/sql`,
    JSON.stringify({
      sql: query,
      limit: 100,
    }),
    { 
      headers, 
      timeout: '30s',
      tags: { name: 'simple_query' },
    }
  )
  
  const duration = Date.now() - startTime
  simpleQueryLatency.add(duration)
  queryCount.add(1)
  
  const passed = check(res, {
    'simple query ok': (r) => r.status === 200,
    'simple query returns data': (r) => {
      try {
        return r.json('data') !== null
      } catch {
        return false
      }
    },
  })
  
  errorRate.add(!passed)
  sleep(1)
}

// Scenario 2: Complex Queries (Multi-table joins)
export function complexQueries(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  const complexQuerySet = [
    `
      SELECT c.name, c.email, COUNT(o.id) as order_count, SUM(o.amount) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE o.created_at > now() - INTERVAL 90 DAY
      GROUP BY c.id, c.name, c.email
      ORDER BY total_spent DESC
      LIMIT 100
    `,
    `
      SELECT 
        p.name as product_name,
        p.category,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id, p.name, p.category
      ORDER BY revenue DESC
      LIMIT 50
    `,
    `
      SELECT 
        c.name as customer_name,
        c.region,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT oi.product_id) as unique_products,
        SUM(o.amount) as total_revenue
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at > now() - INTERVAL 30 DAY
      GROUP BY c.id, c.name, c.region
      HAVING COUNT(DISTINCT o.id) >= 3
      ORDER BY total_revenue DESC
      LIMIT 100
    `,
  ]
  
  const query = complexQuerySet[Math.floor(Math.random() * complexQuerySet.length)]
  
  const startTime = Date.now()
  const res = http.post(
    `${BASE_URL}/api/v1/query/sql`,
    JSON.stringify({
      sql: query,
    }),
    { 
      headers, 
      timeout: '120s',  // Complex queries need more time
      tags: { name: 'complex_query' },
    }
  )
  
  const duration = Date.now() - startTime
  complexQueryLatency.add(duration)
  joinQueryLatency.add(duration)
  queryCount.add(1)
  
  const passed = check(res, {
    'complex query ok': (r) => r.status === 200,
    'complex query completes within timeout': (r) => r.status !== 0,
  })
  
  errorRate.add(!passed)
  
  if (duration > 30000) {
    console.warn(`Slow complex query: ${duration}ms`)
  }
  
  sleep(5)  // Longer think time for complex queries
}

// Scenario 3: Aggregation Queries
export function aggregationQueries(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  const aggregationQuerySet = [
    `
      SELECT 
        toStartOfMonth(created_at) as month,
        COUNT(*) as orders,
        SUM(amount) as revenue,
        AVG(amount) as avg_order,
        MIN(amount) as min_order,
        MAX(amount) as max_order
      FROM orders
      WHERE created_at > now() - INTERVAL 1 YEAR
      GROUP BY month
      ORDER BY month
    `,
    `
      SELECT 
        toStartOfMonth(created_at) as month,
        region,
        COUNT(*) as orders,
        SUM(amount) as revenue,
        AVG(amount) as avg_order
      FROM orders
      WHERE created_at > now() - INTERVAL 1 YEAR
      GROUP BY month, region
      ORDER BY month, revenue DESC
    `,
    `
      SELECT 
        toStartOfWeek(created_at) as week,
        toDayOfWeek(created_at) as day_of_week,
        toHour(created_at) as hour,
        COUNT(*) as orders,
        SUM(amount) as revenue
      FROM orders
      WHERE created_at > now() - INTERVAL 90 DAY
      GROUP BY week, day_of_week, hour
      ORDER BY week, day_of_week, hour
    `,
    `
      SELECT 
        category,
        COUNT(DISTINCT id) as product_count,
        SUM(stock_quantity) as total_stock,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products
      GROUP BY category
      ORDER BY product_count DESC
    `,
    `
      SELECT 
        region,
        status,
        COUNT(*) as customer_count,
        SUM(total_orders) as total_orders,
        AVG(total_spent) as avg_spent
      FROM customers
      GROUP BY region, status
      ORDER BY customer_count DESC
    `,
  ]
  
  const query = aggregationQuerySet[Math.floor(Math.random() * aggregationQuerySet.length)]
  
  const startTime = Date.now()
  const res = http.post(
    `${BASE_URL}/api/v1/query/sql`,
    JSON.stringify({
      sql: query,
    }),
    { 
      headers, 
      timeout: '60s',
      tags: { name: 'aggregation_query' },
    }
  )
  
  const duration = Date.now() - startTime
  aggregationLatency.add(duration)
  queryCount.add(1)
  
  const passed = check(res, {
    'aggregation ok': (r) => r.status === 200,
    'aggregation returns data': (r) => {
      try {
        const data = r.json('data')
        return data !== null && (Array.isArray(data) ? data.length > 0 : true)
      } catch {
        return false
      }
    },
  })
  
  errorRate.add(!passed)
  
  if (duration > 10000) {
    console.warn(`Slow aggregation: ${duration}ms`)
  }
  
  sleep(3)
}

// Scenario 4: Mixed Realistic Workload
export function mixedWorkload(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  // Weighted distribution: 60% simple, 25% aggregation, 15% complex
  const operation = Math.random()
  
  if (operation < 0.6) {
    // Simple query
    const res = http.post(
      `${BASE_URL}/api/v1/query/sql`,
      JSON.stringify({
        sql: 'SELECT * FROM orders WHERE status = \'completed\' LIMIT 50',
      }),
      { headers, timeout: '30s', tags: { name: 'mixed_simple' } }
    )
    simpleQueryLatency.add(res.timings.duration)
    queryCount.add(1)
    errorRate.add(res.status !== 200)
    
  } else if (operation < 0.85) {
    // Aggregation query
    const res = http.post(
      `${BASE_URL}/api/v1/query/sql`,
      JSON.stringify({
        sql: `
          SELECT region, SUM(amount) as total, COUNT(*) as count
          FROM orders
          WHERE created_at > now() - INTERVAL 30 DAY
          GROUP BY region
          ORDER BY total DESC
        `,
      }),
      { headers, timeout: '60s', tags: { name: 'mixed_aggregation' } }
    )
    aggregationLatency.add(res.timings.duration)
    queryCount.add(1)
    errorRate.add(res.status !== 200)
    
  } else {
    // Complex join query
    const res = http.post(
      `${BASE_URL}/api/v1/query/sql`,
      JSON.stringify({
        sql: `
          SELECT c.name, SUM(o.amount) as total
          FROM customers c
          JOIN orders o ON c.id = o.customer_id
          GROUP BY c.id, c.name
          ORDER BY total DESC
          LIMIT 20
        `,
      }),
      { headers, timeout: '120s', tags: { name: 'mixed_complex' } }
    )
    complexQueryLatency.add(res.timings.duration)
    joinQueryLatency.add(res.timings.duration)
    queryCount.add(1)
    errorRate.add(res.status !== 200)
  }
  
  sleep(Math.random() * 2 + 0.5)
}

export function teardown(data) {
  console.log('Database performance test completed')
}

// Custom summary
export function handleSummary(data) {
  const summary = {
    'database_test_results': {
      total_queries: data.metrics.query_count ? data.metrics.query_count.values.count : 0,
      error_rate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
      
      simple_queries: {
        p50: data.metrics.simple_query_latency ? data.metrics.simple_query_latency.values['p(50)'] : null,
        p95: data.metrics.simple_query_latency ? data.metrics.simple_query_latency.values['p(95)'] : null,
        p99: data.metrics.simple_query_latency ? data.metrics.simple_query_latency.values['p(99)'] : null,
        max: data.metrics.simple_query_latency ? data.metrics.simple_query_latency.values.max : null,
      },
      
      complex_queries: {
        p50: data.metrics.complex_query_latency ? data.metrics.complex_query_latency.values['p(50)'] : null,
        p95: data.metrics.complex_query_latency ? data.metrics.complex_query_latency.values['p(95)'] : null,
        p99: data.metrics.complex_query_latency ? data.metrics.complex_query_latency.values['p(99)'] : null,
        max: data.metrics.complex_query_latency ? data.metrics.complex_query_latency.values.max : null,
      },
      
      aggregations: {
        p50: data.metrics.aggregation_latency ? data.metrics.aggregation_latency.values['p(50)'] : null,
        p95: data.metrics.aggregation_latency ? data.metrics.aggregation_latency.values['p(95)'] : null,
        p99: data.metrics.aggregation_latency ? data.metrics.aggregation_latency.values['p(99)'] : null,
        max: data.metrics.aggregation_latency ? data.metrics.aggregation_latency.values.max : null,
      },
      
      joins: {
        p50: data.metrics.join_query_latency ? data.metrics.join_query_latency.values['p(50)'] : null,
        p95: data.metrics.join_query_latency ? data.metrics.join_query_latency.values['p(95)'] : null,
        p99: data.metrics.join_query_latency ? data.metrics.join_query_latency.values['p(99)'] : null,
        max: data.metrics.join_query_latency ? data.metrics.join_query_latency.values.max : null,
      },
    }
  }
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'database-test-results.json': JSON.stringify(summary, null, 2),
  }
}
