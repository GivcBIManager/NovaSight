/**
 * NovaSight API Load Test
 * 
 * Tests system performance under normal to high load conditions.
 * Simulates realistic user behavior across all major API endpoints.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const queryLatency = new Trend('query_latency')
const dashboardLatency = new Trend('dashboard_latency')
const authLatency = new Trend('auth_latency')
const dataSourceLatency = new Trend('datasource_latency')
const successfulRequests = new Counter('successful_requests')
const failedRequests = new Counter('failed_requests')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.01'],            // Error rate < 1%
    query_latency: ['p(95)<3000'],
    dashboard_latency: ['p(95)<1000'],
    auth_latency: ['p(95)<500'],
    datasource_latency: ['p(95)<2000'],
  },
  // Tags for better filtering in Grafana
  tags: {
    test_type: 'load',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
}

const BASE_URL = __ENV.API_URL || 'http://localhost:5000'
const TEST_TENANT = __ENV.TENANT_SLUG || 'perf-test'

/**
 * Setup function - runs once before the test
 * Authenticates and returns the access token
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`)
  
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER || 'perf-test@example.com',
      password: __ENV.TEST_PASSWORD || 'Admin123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  )
  
  const loginCheck = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => r.json('data.access_token') !== undefined,
  })
  
  if (!loginCheck) {
    console.error(`Login failed: ${loginRes.status} - ${loginRes.body}`)
    throw new Error('Setup failed: Could not authenticate')
  }
  
  authLatency.add(loginRes.timings.duration)
  
  return {
    token: loginRes.json('data.access_token'),
    userId: loginRes.json('data.user.id'),
  }
}

/**
 * Main test function - runs for each VU
 */
export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT,
  }
  
  // Simulate realistic user behavior with weighted operations
  const operation = Math.random()
  
  if (operation < 0.4) {
    // 40% - Dashboard operations (most common)
    testDashboardOperations(headers)
  } else if (operation < 0.7) {
    // 30% - Query operations
    testQueryOperations(headers)
  } else if (operation < 0.9) {
    // 20% - Data source operations
    testDataSourceOperations(headers)
  } else {
    // 10% - User/Admin operations
    testUserOperations(headers)
  }
  
  sleep(Math.random() * 2 + 1) // 1-3 second think time
}

/**
 * Test dashboard-related operations
 */
function testDashboardOperations(headers) {
  group('Dashboard Operations', () => {
    // List dashboards
    const listRes = http.get(
      `${BASE_URL}/api/v1/dashboards`,
      { headers, tags: { name: 'list_dashboards' } }
    )
    
    const listCheck = check(listRes, {
      'list dashboards status 200': (r) => r.status === 200,
      'list dashboards returns array': (r) => Array.isArray(r.json('data')),
    })
    
    if (listCheck) {
      successfulRequests.add(1)
    } else {
      failedRequests.add(1)
    }
    
    errorRate.add(listRes.status !== 200)
    dashboardLatency.add(listRes.timings.duration)
    
    // Get specific dashboard if available
    if (listRes.status === 200) {
      const dashboards = listRes.json('data')
      if (dashboards && dashboards.length > 0) {
        const randomIndex = Math.floor(Math.random() * dashboards.length)
        const dashboardId = dashboards[randomIndex].id
        
        const getRes = http.get(
          `${BASE_URL}/api/v1/dashboards/${dashboardId}`,
          { headers, tags: { name: 'get_dashboard' } }
        )
        
        check(getRes, {
          'get dashboard status 200': (r) => r.status === 200,
          'get dashboard has widgets': (r) => r.json('data.widgets') !== undefined,
        })
        
        dashboardLatency.add(getRes.timings.duration)
        
        // Load dashboard data (simulate rendering)
        if (getRes.status === 200 && getRes.json('data.widgets')) {
          const widgets = getRes.json('data.widgets')
          widgets.slice(0, 3).forEach((widget, index) => {
            if (widget.query_id) {
              const dataRes = http.get(
                `${BASE_URL}/api/v1/queries/${widget.query_id}/execute`,
                { headers, tags: { name: 'widget_data' } }
              )
              queryLatency.add(dataRes.timings.duration)
            }
          })
        }
      }
    }
  })
}

/**
 * Test query execution operations
 */
function testQueryOperations(headers) {
  group('Query Operations', () => {
    // Natural language query
    const nlQueryRes = http.post(
      `${BASE_URL}/api/v1/query/execute`,
      JSON.stringify({
        query: getRandomNLQuery(),
        use_ai: true,
      }),
      { headers, tags: { name: 'nl_query' } }
    )
    
    const nlCheck = check(nlQueryRes, {
      'NL query status 200': (r) => r.status === 200,
      'NL query returns data': (r) => r.json('data') !== null,
    })
    
    if (nlCheck) {
      successfulRequests.add(1)
    } else {
      failedRequests.add(1)
    }
    
    errorRate.add(nlQueryRes.status !== 200)
    queryLatency.add(nlQueryRes.timings.duration)
    
    sleep(0.5)
    
    // SQL query
    const sqlQueryRes = http.post(
      `${BASE_URL}/api/v1/query/sql`,
      JSON.stringify({
        sql: getRandomSQLQuery(),
        limit: 100,
      }),
      { headers, tags: { name: 'sql_query' } }
    )
    
    check(sqlQueryRes, {
      'SQL query status 200': (r) => r.status === 200,
    })
    
    errorRate.add(sqlQueryRes.status !== 200)
    queryLatency.add(sqlQueryRes.timings.duration)
    
    // List saved queries
    const savedRes = http.get(
      `${BASE_URL}/api/v1/queries`,
      { headers, tags: { name: 'list_queries' } }
    )
    
    check(savedRes, {
      'list queries status 200': (r) => r.status === 200,
    })
  })
}

/**
 * Test data source operations
 */
function testDataSourceOperations(headers) {
  group('Data Source Operations', () => {
    // List data sources
    const listRes = http.get(
      `${BASE_URL}/api/v1/datasources`,
      { headers, tags: { name: 'list_datasources' } }
    )
    
    const listCheck = check(listRes, {
      'list datasources status 200': (r) => r.status === 200,
    })
    
    if (listCheck) {
      successfulRequests.add(1)
    } else {
      failedRequests.add(1)
    }
    
    errorRate.add(listRes.status !== 200)
    dataSourceLatency.add(listRes.timings.duration)
    
    // Get schema for a data source
    if (listRes.status === 200) {
      const datasources = listRes.json('data')
      if (datasources && datasources.length > 0) {
        const randomIndex = Math.floor(Math.random() * datasources.length)
        const dsId = datasources[randomIndex].id
        
        const schemaRes = http.get(
          `${BASE_URL}/api/v1/datasources/${dsId}/schema`,
          { headers, tags: { name: 'get_schema' } }
        )
        
        check(schemaRes, {
          'get schema status 200': (r) => r.status === 200,
          'schema has tables': (r) => r.json('data.tables') !== undefined,
        })
        
        dataSourceLatency.add(schemaRes.timings.duration)
        
        // Test connection
        const testRes = http.post(
          `${BASE_URL}/api/v1/datasources/${dsId}/test`,
          null,
          { headers, tags: { name: 'test_connection' } }
        )
        
        check(testRes, {
          'test connection status 200': (r) => r.status === 200,
        })
      }
    }
  })
}

/**
 * Test user/admin operations
 */
function testUserOperations(headers) {
  group('User Operations', () => {
    // Get current user profile
    const profileRes = http.get(
      `${BASE_URL}/api/v1/users/me`,
      { headers, tags: { name: 'get_profile' } }
    )
    
    check(profileRes, {
      'get profile status 200': (r) => r.status === 200,
    })
    
    // Get audit logs
    const auditRes = http.get(
      `${BASE_URL}/api/v1/audit/logs?limit=50`,
      { headers, tags: { name: 'audit_logs' } }
    )
    
    check(auditRes, {
      'audit logs status 200': (r) => r.status === 200 || r.status === 403,
    })
    
    // Get notifications
    const notifRes = http.get(
      `${BASE_URL}/api/v1/notifications`,
      { headers, tags: { name: 'notifications' } }
    )
    
    check(notifRes, {
      'notifications status 200': (r) => r.status === 200,
    })
  })
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log('Load test completed')
  // Logout (optional)
  http.post(
    `${BASE_URL}/api/v1/auth/logout`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${data.token}`,
      },
    }
  )
}

// Helper functions
function getRandomNLQuery() {
  const queries = [
    'Show total sales by region',
    'What are the top 10 customers by revenue?',
    'Monthly revenue trend for the last year',
    'Compare sales this quarter vs last quarter',
    'Show average order value by product category',
    'List active users in the last 30 days',
    'Revenue breakdown by payment method',
    'Show customer retention rate by month',
  ]
  return queries[Math.floor(Math.random() * queries.length)]
}

function getRandomSQLQuery() {
  const queries = [
    'SELECT * FROM orders LIMIT 100',
    'SELECT region, SUM(amount) as total FROM orders GROUP BY region',
    'SELECT COUNT(*) FROM customers WHERE created_at > now() - INTERVAL 30 DAY',
    'SELECT product_name, COUNT(*) as count FROM order_items GROUP BY product_name ORDER BY count DESC LIMIT 20',
    'SELECT DATE(created_at) as date, SUM(amount) FROM orders GROUP BY date ORDER BY date DESC LIMIT 30',
  ]
  return queries[Math.floor(Math.random() * queries.length)]
}
