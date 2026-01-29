/**
 * NovaSight Stress Test
 * 
 * Tests system behavior under extreme load conditions.
 * Identifies breaking points and degradation patterns.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const requestsPerSecond = new Counter('requests_per_second')
const timeouts = new Counter('timeouts')

// Stress test configuration - gradually increase load to find breaking point
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Hold at 100
    { duration: '2m', target: 200 },   // Ramp up to 200
    { duration: '5m', target: 200 },   // Hold at 200
    { duration: '2m', target: 300 },   // Ramp up to 300
    { duration: '5m', target: 300 },   // Hold at 300
    { duration: '2m', target: 400 },   // Ramp up to 400
    { duration: '5m', target: 400 },   // Hold at 400
    { duration: '2m', target: 500 },   // Ramp up to 500
    { duration: '5m', target: 500 },   // Hold at 500
    { duration: '10m', target: 0 },    // Gradual ramp down
  ],
  thresholds: {
    errors: ['rate<0.10'],             // Allow up to 10% errors under stress
    http_req_duration: ['p(95)<10000'], // 10s at p95 under stress
    http_req_failed: ['rate<0.15'],    // Allow up to 15% failures
    timeouts: ['count<1000'],          // Max 1000 timeouts total
  },
  // Prevent test from stopping on high error rate
  noConnectionReuse: false,
  userAgent: 'NovaSight-StressTest/1.0',
  tags: {
    test_type: 'stress',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
}

const BASE_URL = __ENV.API_URL || 'http://localhost:5000'
const TEST_TENANT = __ENV.TENANT_SLUG || 'perf-test'

// Token storage for VUs
let authToken = null

export function setup() {
  console.log(`Starting stress test against ${BASE_URL}`)
  console.log('This test will push the system to its limits!')
  
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER || 'perf-test@example.com',
      password: __ENV.TEST_PASSWORD || 'TestPassword123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  )
  
  if (loginRes.status !== 200) {
    console.error(`Login failed: ${loginRes.status}`)
    throw new Error('Setup failed')
  }
  
  return {
    token: loginRes.json('data.access_token'),
  }
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  // Mix of operations with heavier weight on expensive ones
  group('Stress Operations', () => {
    // Heavy dashboard load
    stressDashboards(headers)
    
    // Concurrent queries
    stressQueries(headers)
    
    // Data source operations
    stressDataSources(headers)
  })
  
  // Minimal think time under stress
  sleep(0.5)
}

function stressDashboards(headers) {
  const startTime = Date.now()
  
  const res = http.get(
    `${BASE_URL}/api/v1/dashboards`,
    { 
      headers, 
      timeout: '30s',
      tags: { name: 'stress_list_dashboards' },
    }
  )
  
  const duration = Date.now() - startTime
  responseTime.add(duration)
  requestsPerSecond.add(1)
  
  if (res.status === 0) {
    timeouts.add(1)
    errorRate.add(true)
  } else {
    const passed = check(res, {
      'dashboard list ok': (r) => r.status === 200,
      'response not empty': (r) => r.body.length > 0,
    })
    errorRate.add(!passed)
  }
  
  // If successful, try to load dashboard details
  if (res.status === 200) {
    const dashboards = res.json('data')
    if (dashboards && dashboards.length > 0) {
      // Load multiple dashboards concurrently
      const requests = dashboards.slice(0, 3).map(d => ({
        method: 'GET',
        url: `${BASE_URL}/api/v1/dashboards/${d.id}`,
        params: { headers, timeout: '30s' },
      }))
      
      const responses = http.batch(requests)
      responses.forEach(r => {
        responseTime.add(r.timings.duration)
        requestsPerSecond.add(1)
        errorRate.add(r.status !== 200)
      })
    }
  }
}

function stressQueries(headers) {
  // Execute multiple queries in parallel
  const queries = [
    { query: 'Show total sales by region', use_ai: true },
    { query: 'Top 10 customers by revenue', use_ai: true },
    { query: 'Monthly trend analysis', use_ai: true },
  ]
  
  const requests = queries.map(q => ({
    method: 'POST',
    url: `${BASE_URL}/api/v1/query/execute`,
    body: JSON.stringify(q),
    params: { 
      headers, 
      timeout: '60s',
      tags: { name: 'stress_query' },
    },
  }))
  
  const responses = http.batch(requests)
  
  responses.forEach((res, index) => {
    if (res.status === 0) {
      timeouts.add(1)
      errorRate.add(true)
    } else {
      const passed = check(res, {
        [`query ${index} ok`]: (r) => r.status === 200 || r.status === 202,
      })
      errorRate.add(!passed)
      responseTime.add(res.timings.duration)
    }
    requestsPerSecond.add(1)
  })
}

function stressDataSources(headers) {
  const res = http.get(
    `${BASE_URL}/api/v1/datasources`,
    { 
      headers, 
      timeout: '30s',
      tags: { name: 'stress_datasources' },
    }
  )
  
  if (res.status === 0) {
    timeouts.add(1)
    errorRate.add(true)
    return
  }
  
  responseTime.add(res.timings.duration)
  requestsPerSecond.add(1)
  
  const passed = check(res, {
    'datasources ok': (r) => r.status === 200,
  })
  errorRate.add(!passed)
  
  // Schema introspection (expensive operation)
  if (res.status === 200) {
    const datasources = res.json('data')
    if (datasources && datasources.length > 0) {
      const dsId = datasources[0].id
      
      const schemaRes = http.get(
        `${BASE_URL}/api/v1/datasources/${dsId}/schema`,
        { 
          headers, 
          timeout: '60s',
          tags: { name: 'stress_schema' },
        }
      )
      
      if (schemaRes.status === 0) {
        timeouts.add(1)
      } else {
        responseTime.add(schemaRes.timings.duration)
        errorRate.add(schemaRes.status !== 200)
      }
      requestsPerSecond.add(1)
    }
  }
}

export function teardown(data) {
  console.log('Stress test completed')
  console.log('Review metrics for breaking point analysis')
}

// Custom summary
export function handleSummary(data) {
  const summary = {
    'stress_test_results': {
      total_requests: data.metrics.http_reqs.values.count,
      error_rate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
      p95_response_time: data.metrics.http_req_duration.values['p(95)'],
      p99_response_time: data.metrics.http_req_duration.values['p(99)'],
      max_response_time: data.metrics.http_req_duration.values.max,
      timeouts: data.metrics.timeouts ? data.metrics.timeouts.values.count : 0,
    }
  }
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'stress-test-results.json': JSON.stringify(summary, null, 2),
  }
}
