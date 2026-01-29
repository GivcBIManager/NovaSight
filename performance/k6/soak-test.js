/**
 * NovaSight Soak Test (Endurance Test)
 * 
 * Tests system stability over an extended period.
 * Identifies memory leaks, connection exhaustion, and degradation over time.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const hourlyErrors = new Counter('hourly_errors')
const memoryIndicator = new Gauge('memory_indicator')
const connectionErrors = new Counter('connection_errors')
const slowRequests = new Counter('slow_requests')

// Soak test configuration - extended duration
export const options = {
  stages: [
    { duration: '5m', target: 100 },    // Ramp up
    { duration: '4h', target: 100 },    // Extended soak period (4 hours)
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],     // Very strict during soak
    errors: ['rate<0.01'],
    slow_requests: ['count<500'],       // Max 500 slow requests in 4 hours
    connection_errors: ['count<100'],   // Max 100 connection errors
  },
  tags: {
    test_type: 'soak',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
  // Connection settings for long-running test
  batch: 20,
  batchPerHost: 6,
  noConnectionReuse: false,
  noVUConnectionReuse: false,
}

const BASE_URL = __ENV.API_URL || 'http://localhost:5000'
const TEST_TENANT = __ENV.TENANT_SLUG || 'perf-test'

// Response time threshold for "slow" requests
const SLOW_THRESHOLD = 3000  // 3 seconds

export function setup() {
  console.log(`Starting soak test against ${BASE_URL}`)
  console.log('This test will run for approximately 4 hours')
  console.log('Monitoring for memory leaks, connection exhaustion, and degradation')
  
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
    startTime: Date.now(),
  }
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  // Calculate elapsed hours for periodic reporting
  const elapsedHours = Math.floor((Date.now() - data.startTime) / 3600000)
  
  group('Soak Test Operations', () => {
    // Dashboard operations
    soakTestDashboards(headers)
    
    // Query operations
    soakTestQueries(headers)
    
    // Data source operations
    soakTestDataSources(headers)
    
    // Periodic health and metrics check
    if (__VU === 1 && __ITER % 100 === 0) {
      checkSystemHealth(headers, elapsedHours)
    }
  })
  
  // Standard think time
  sleep(Math.random() * 2 + 1)
}

function soakTestDashboards(headers) {
  const startTime = Date.now()
  
  // List dashboards
  const listRes = http.get(
    `${BASE_URL}/api/v1/dashboards`,
    { 
      headers, 
      timeout: '30s',
      tags: { name: 'soak_list_dashboards' },
    }
  )
  
  const duration = Date.now() - startTime
  responseTime.add(duration)
  
  if (duration > SLOW_THRESHOLD) {
    slowRequests.add(1)
    console.warn(`Slow dashboard list request: ${duration}ms`)
  }
  
  if (listRes.status === 0) {
    connectionErrors.add(1)
    errorRate.add(true)
    return
  }
  
  const passed = check(listRes, {
    'dashboard list ok': (r) => r.status === 200,
  })
  
  if (!passed) {
    errorRate.add(true)
    hourlyErrors.add(1)
  }
  
  // Get a specific dashboard
  if (listRes.status === 200) {
    const dashboards = listRes.json('data')
    if (dashboards && dashboards.length > 0) {
      const randomIndex = Math.floor(Math.random() * dashboards.length)
      const dashboardId = dashboards[randomIndex].id
      
      const getStart = Date.now()
      const getRes = http.get(
        `${BASE_URL}/api/v1/dashboards/${dashboardId}`,
        { 
          headers, 
          timeout: '30s',
          tags: { name: 'soak_get_dashboard' },
        }
      )
      
      const getDuration = Date.now() - getStart
      responseTime.add(getDuration)
      
      if (getDuration > SLOW_THRESHOLD) {
        slowRequests.add(1)
      }
      
      if (getRes.status === 0) {
        connectionErrors.add(1)
      }
      
      check(getRes, {
        'get dashboard ok': (r) => r.status === 200,
      })
    }
  }
}

function soakTestQueries(headers) {
  const queries = [
    'Show total sales by region',
    'Monthly revenue trend',
    'Top customers by order count',
    'Product category breakdown',
  ]
  
  const query = queries[Math.floor(Math.random() * queries.length)]
  
  const startTime = Date.now()
  
  const res = http.post(
    `${BASE_URL}/api/v1/query/execute`,
    JSON.stringify({
      query: query,
      use_ai: true,
    }),
    { 
      headers, 
      timeout: '60s',
      tags: { name: 'soak_query' },
    }
  )
  
  const duration = Date.now() - startTime
  responseTime.add(duration)
  
  if (duration > SLOW_THRESHOLD) {
    slowRequests.add(1)
    console.warn(`Slow query request: ${duration}ms - "${query}"`)
  }
  
  if (res.status === 0) {
    connectionErrors.add(1)
    errorRate.add(true)
    return
  }
  
  const passed = check(res, {
    'query ok': (r) => r.status === 200 || r.status === 202,
  })
  
  if (!passed) {
    errorRate.add(true)
    hourlyErrors.add(1)
  }
}

function soakTestDataSources(headers) {
  const startTime = Date.now()
  
  const res = http.get(
    `${BASE_URL}/api/v1/datasources`,
    { 
      headers, 
      timeout: '30s',
      tags: { name: 'soak_datasources' },
    }
  )
  
  const duration = Date.now() - startTime
  responseTime.add(duration)
  
  if (duration > SLOW_THRESHOLD) {
    slowRequests.add(1)
  }
  
  if (res.status === 0) {
    connectionErrors.add(1)
    errorRate.add(true)
    return
  }
  
  const passed = check(res, {
    'datasources ok': (r) => r.status === 200,
  })
  
  if (!passed) {
    errorRate.add(true)
    hourlyErrors.add(1)
  }
  
  // Schema introspection
  if (res.status === 200) {
    const datasources = res.json('data')
    if (datasources && datasources.length > 0 && Math.random() < 0.2) {
      // Only do schema introspection 20% of the time (expensive)
      const dsId = datasources[0].id
      
      const schemaRes = http.get(
        `${BASE_URL}/api/v1/datasources/${dsId}/schema`,
        { 
          headers, 
          timeout: '60s',
          tags: { name: 'soak_schema' },
        }
      )
      
      if (schemaRes.timings.duration > SLOW_THRESHOLD) {
        slowRequests.add(1)
      }
      
      if (schemaRes.status === 0) {
        connectionErrors.add(1)
      }
    }
  }
}

function checkSystemHealth(headers, elapsedHours) {
  // Health endpoint
  const healthRes = http.get(
    `${BASE_URL}/api/v1/health`,
    { timeout: '10s' }
  )
  
  if (healthRes.status !== 200) {
    console.error(`Health check failed at hour ${elapsedHours}`)
  }
  
  // Metrics endpoint (if available)
  const metricsRes = http.get(
    `${BASE_URL}/api/v1/metrics`,
    { headers, timeout: '10s' }
  )
  
  if (metricsRes.status === 200) {
    try {
      const metrics = metricsRes.json()
      
      // Log memory usage if available
      if (metrics.memory_mb) {
        memoryIndicator.add(metrics.memory_mb)
        console.log(`Hour ${elapsedHours}: Memory usage ${metrics.memory_mb}MB`)
      }
      
      // Log active connections if available
      if (metrics.db_connections) {
        console.log(`Hour ${elapsedHours}: DB connections ${metrics.db_connections}`)
      }
    } catch (e) {
      // Metrics parsing failed, ignore
    }
  }
}

export function teardown(data) {
  const totalTime = (Date.now() - data.startTime) / 1000
  const totalHours = (totalTime / 3600).toFixed(2)
  console.log(`Soak test completed after ${totalHours} hours`)
}

// Custom summary
export function handleSummary(data) {
  const totalDurationSeconds = data.state.testRunDurationMs / 1000
  const totalHours = (totalDurationSeconds / 3600).toFixed(2)
  
  const summary = {
    'soak_test_results': {
      duration_hours: parseFloat(totalHours),
      total_requests: data.metrics.http_reqs.values.count,
      
      error_metrics: {
        error_rate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
        hourly_errors: data.metrics.hourly_errors ? data.metrics.hourly_errors.values.count : 0,
        connection_errors: data.metrics.connection_errors ? data.metrics.connection_errors.values.count : 0,
        slow_requests: data.metrics.slow_requests ? data.metrics.slow_requests.values.count : 0,
      },
      
      latency_metrics: {
        avg: data.metrics.http_req_duration.values.avg,
        p50: data.metrics.http_req_duration.values['p(50)'],
        p90: data.metrics.http_req_duration.values['p(90)'],
        p95: data.metrics.http_req_duration.values['p(95)'],
        p99: data.metrics.http_req_duration.values['p(99)'],
        max: data.metrics.http_req_duration.values.max,
      },
      
      stability: {
        requests_per_hour: data.metrics.http_reqs.values.count / parseFloat(totalHours),
        errors_per_hour: (data.metrics.hourly_errors ? data.metrics.hourly_errors.values.count : 0) / parseFloat(totalHours),
      }
    }
  }
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'soak-test-results.json': JSON.stringify(summary, null, 2),
  }
}
