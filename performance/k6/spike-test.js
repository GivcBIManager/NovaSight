/**
 * NovaSight Spike Test
 * 
 * Tests system behavior under sudden traffic spikes.
 * Validates auto-scaling and recovery capabilities.
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const spikeLatency = new Trend('spike_latency')
const recoveryLatency = new Trend('recovery_latency')
const requestsDuringSpike = new Counter('requests_during_spike')
const requestsDuringRecovery = new Counter('requests_during_recovery')

// Spike test configuration
export const options = {
  stages: [
    { duration: '10s', target: 100 },    // Normal load baseline
    { duration: '1m', target: 100 },     // Stay at normal
    { duration: '10s', target: 1000 },   // SPIKE! 10x increase
    { duration: '3m', target: 1000 },    // Stay at spike level
    { duration: '10s', target: 100 },    // Scale down rapidly
    { duration: '3m', target: 100 },     // Recovery period
    { duration: '10s', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<15000'],  // 15s at p99 during spike (relaxed)
    http_req_failed: ['rate<0.30'],      // Allow 30% failures during spike
    errors: ['rate<0.35'],               // Allow 35% errors during spike
    recovery_latency: ['p(95)<3000'],    // Recovery should be quick
  },
  tags: {
    test_type: 'spike',
    environment: __ENV.ENVIRONMENT || 'staging',
  },
}

const BASE_URL = __ENV.API_URL || 'http://localhost:5000'
const TEST_TENANT = __ENV.TENANT_SLUG || 'perf-test'

// Track test phase
const SPIKE_START = 70   // seconds (10s ramp + 60s normal)
const SPIKE_END = 260    // seconds (70s + 10s ramp + 180s spike)

export function setup() {
  console.log(`Starting spike test against ${BASE_URL}`)
  console.log('Testing system resilience to sudden traffic spikes')
  
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
  
  // Calculate current phase
  const elapsedSeconds = (Date.now() - data.startTime) / 1000
  const isSpikePeriod = elapsedSeconds >= SPIKE_START && elapsedSeconds < SPIKE_END
  const isRecoveryPeriod = elapsedSeconds >= SPIKE_END
  
  group('Spike Test Operations', () => {
    // Critical path operations
    testCriticalOperations(headers, isSpikePeriod, isRecoveryPeriod)
  })
  
  // Minimal think time during spike
  if (isSpikePeriod) {
    sleep(0.1)
  } else {
    sleep(0.5)
  }
}

function testCriticalOperations(headers, isSpikePeriod, isRecoveryPeriod) {
  // Dashboard list - most common operation
  const dashboardRes = http.get(
    `${BASE_URL}/api/v1/dashboards`,
    { 
      headers, 
      timeout: '30s',
      tags: { 
        name: 'spike_dashboards',
        phase: isSpikePeriod ? 'spike' : (isRecoveryPeriod ? 'recovery' : 'normal'),
      },
    }
  )
  
  if (isSpikePeriod) {
    spikeLatency.add(dashboardRes.timings.duration)
    requestsDuringSpike.add(1)
  } else if (isRecoveryPeriod) {
    recoveryLatency.add(dashboardRes.timings.duration)
    requestsDuringRecovery.add(1)
  }
  
  const dashboardCheck = check(dashboardRes, {
    'dashboard request ok': (r) => r.status === 200 || r.status === 429 || r.status === 503,
    'not complete failure': (r) => r.status !== 0,
  })
  
  // 429 (rate limited) and 503 (service unavailable) are acceptable during spike
  if (dashboardRes.status !== 200 && dashboardRes.status !== 429 && dashboardRes.status !== 503) {
    errorRate.add(true)
  } else {
    errorRate.add(false)
  }
  
  // Query execution - second most common
  const queryRes = http.post(
    `${BASE_URL}/api/v1/query/execute`,
    JSON.stringify({
      query: 'Show total sales by region',
      use_ai: true,
    }),
    { 
      headers, 
      timeout: '60s',
      tags: { 
        name: 'spike_query',
        phase: isSpikePeriod ? 'spike' : (isRecoveryPeriod ? 'recovery' : 'normal'),
      },
    }
  )
  
  if (isSpikePeriod) {
    spikeLatency.add(queryRes.timings.duration)
    requestsDuringSpike.add(1)
  } else if (isRecoveryPeriod) {
    recoveryLatency.add(queryRes.timings.duration)
    requestsDuringRecovery.add(1)
  }
  
  const queryCheck = check(queryRes, {
    'query request ok': (r) => r.status === 200 || r.status === 202 || r.status === 429 || r.status === 503,
  })
  
  if (queryRes.status !== 200 && queryRes.status !== 202 && queryRes.status !== 429 && queryRes.status !== 503) {
    errorRate.add(true)
  }
  
  // Health check - should always work
  const healthRes = http.get(
    `${BASE_URL}/api/v1/health`,
    { 
      timeout: '10s',
      tags: { name: 'spike_health' },
    }
  )
  
  const healthCheck = check(healthRes, {
    'health check ok': (r) => r.status === 200,
    'system still responsive': (r) => r.status !== 0,
  })
  
  if (!healthCheck) {
    console.error(`Health check failed during ${isSpikePeriod ? 'spike' : 'recovery'} phase`)
  }
}

export function teardown(data) {
  const totalTime = (Date.now() - data.startTime) / 1000
  console.log(`Spike test completed in ${totalTime.toFixed(2)} seconds`)
}

// Custom summary
export function handleSummary(data) {
  const summary = {
    'spike_test_results': {
      total_requests: data.metrics.http_reqs.values.count,
      error_rate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
      
      spike_metrics: {
        requests: data.metrics.requests_during_spike ? data.metrics.requests_during_spike.values.count : 0,
        p95_latency: data.metrics.spike_latency ? data.metrics.spike_latency.values['p(95)'] : null,
        max_latency: data.metrics.spike_latency ? data.metrics.spike_latency.values.max : null,
      },
      
      recovery_metrics: {
        requests: data.metrics.requests_during_recovery ? data.metrics.requests_during_recovery.values.count : 0,
        p95_latency: data.metrics.recovery_latency ? data.metrics.recovery_latency.values['p(95)'] : null,
      },
      
      overall: {
        p95_response_time: data.metrics.http_req_duration.values['p(95)'],
        p99_response_time: data.metrics.http_req_duration.values['p(99)'],
        failed_requests: data.metrics.http_req_failed.values.rate,
      }
    }
  }
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'spike-test-results.json': JSON.stringify(summary, null, 2),
  }
}
