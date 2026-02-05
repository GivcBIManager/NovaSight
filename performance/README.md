# NovaSight Performance Testing

This directory contains performance testing configurations and scripts using [k6](https://k6.io/).

## Overview

Performance tests are designed to validate that NovaSight meets its performance requirements under various load conditions.

### Test Types

| Test | Description | Duration | Purpose |
|------|-------------|----------|---------|
| **Load Test** | Normal to high load | ~23 min | Validate performance under expected traffic |
| **Stress Test** | Push to breaking point | ~45 min | Find system limits and breaking points |
| **Spike Test** | Sudden traffic spikes | ~8 min | Test auto-scaling and recovery |
| **Soak Test** | Extended duration | ~4 hours | Detect memory leaks and degradation |
| **Database Test** | Database-specific | ~10 min | Validate query performance |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- k6 (optional, for local runs without Docker)
- Running NovaSight backend

### Running Tests Locally

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start the performance testing stack (InfluxDB + Grafana)
cd performance/k6
docker compose up -d influxdb grafana

# Run a specific test
docker compose run --rm k6 run /scripts/api-load-test.js

# View results in Grafana
open http://localhost:3001  # admin/Admin123!
```

#### Option 2: Using k6 Directly

```bash
# Install k6
# macOS: brew install k6
# Linux: see https://k6.io/docs/getting-started/installation/
# Windows: choco install k6

# Run load test
k6 run performance/k6/api-load-test.js

# Run with custom options
k6 run --env API_URL=http://localhost:5000 \
       --env TEST_USER=admin@example.com \
       --env TEST_PASSWORD=password123 \
       performance/k6/api-load-test.js
```

### Running Tests in CI

Performance tests run automatically:
- **Daily at 2 AM UTC**: Load test runs against staging
- **On-demand**: Any test type can be triggered manually via GitHub Actions

To trigger manually:
1. Go to Actions → Performance Tests
2. Click "Run workflow"
3. Select test type and environment
4. Click "Run workflow"

## Test Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:5000` | Backend API URL |
| `TENANT_SLUG` | `perf-test` | Test tenant identifier |
| `TEST_USER` | `perf-test@example.com` | Test user email |
| `TEST_PASSWORD` | `Admin123!!` | Test user password |
| `ENVIRONMENT` | `staging` | Environment tag for metrics |

### Performance Thresholds

| Metric | Load Test | Stress Test | Spike Test |
|--------|-----------|-------------|------------|
| P95 Response Time | < 2s | < 10s | < 15s |
| P99 Response Time | < 5s | N/A | N/A |
| Error Rate | < 1% | < 10% | < 30% |
| Query Latency (P95) | < 3s | N/A | N/A |
| Dashboard Latency (P95) | < 1s | N/A | N/A |

## Viewing Results

### Grafana Dashboard

1. Start the performance stack: `docker compose up -d`
2. Open Grafana: http://localhost:3001
3. Login: admin / Admin123!
4. Navigate to: Performance → NovaSight k6 Performance Results

### Dashboard Features

- **Overview**: VUs, total requests, error rate, response times
- **Load & Response Time**: VUs over time, response time distribution
- **Throughput & Errors**: RPS, error rate trends
- **Custom Metrics**: Query latency, dashboard latency
- **By Endpoint**: P95 response time breakdown by API endpoint

### JSON Reports

Each test generates a JSON summary with key metrics:

```json
{
  "load_test_results": {
    "total_requests": 125000,
    "error_rate": 0.005,
    "p95_response_time": 1850,
    "p99_response_time": 3200
  }
}
```

## Test Details

### Load Test (`api-load-test.js`)

Simulates realistic user behavior with weighted operations:
- 40% Dashboard operations
- 30% Query operations  
- 20% Data source operations
- 10% User/Admin operations

Stages:
1. Ramp up to 50 VUs (2 min)
2. Hold at 50 VUs (5 min)
3. Ramp to 100 VUs (2 min)
4. Hold at 100 VUs (5 min)
5. Ramp to 200 VUs (2 min)
6. Hold at 200 VUs (5 min)
7. Ramp down (2 min)

### Stress Test (`stress-test.js`)

Gradually increases load to find breaking points:
- Ramps from 100 → 200 → 300 → 400 → 500 VUs
- Monitors error rates and response times
- Identifies degradation patterns

### Spike Test (`spike-test.js`)

Tests sudden traffic increases:
- Normal load: 100 VUs
- Spike: 1000 VUs (10x increase)
- Recovery monitoring

### Soak Test (`soak-test.js`)

Extended duration testing:
- Constant 100 VUs for 4 hours
- Monitors for memory leaks
- Tracks connection exhaustion
- Detects performance degradation over time

### Database Test (`database-test.js`)

Multi-scenario database performance:
- Simple queries (20 VUs)
- Complex joins (5 VUs)
- Aggregations (10 VUs)
- Mixed workload (30 VUs)

## Best Practices

### Before Running Tests

1. Ensure test environment is isolated
2. Seed realistic test data
3. Warm up the application
4. Verify authentication works

### Analyzing Results

1. Compare against baseline metrics
2. Look for degradation patterns
3. Identify slow endpoints
4. Check for memory leaks (soak test)
5. Validate error responses

### After Tests

1. Clean up test data
2. Archive results for trend analysis
3. Document any issues found
4. Create tickets for performance improvements

## Troubleshooting

### Common Issues

**Authentication fails in setup**
- Verify TEST_USER and TEST_PASSWORD are correct
- Check if user exists in test environment
- Ensure tenant is properly configured

**Connection refused errors**
- Verify API_URL is accessible from test runner
- Check if backend is running
- Verify network configuration in Docker

**High error rates**
- Check backend logs for errors
- Verify database connectivity
- Review rate limiting configuration

**Metrics not appearing in Grafana**
- Verify InfluxDB is running and healthy
- Check k6 K6_OUT environment variable
- Ensure network connectivity between services

## File Structure

```
performance/
├── k6/
│   ├── api-load-test.js     # Main load test
│   ├── stress-test.js       # Stress testing
│   ├── spike-test.js        # Spike testing
│   ├── soak-test.js         # Endurance testing
│   ├── database-test.js     # Database performance
│   └── docker-compose.yml   # Test infrastructure
├── grafana/
│   ├── dashboards/
│   │   └── k6-results.json  # Grafana dashboard
│   └── provisioning/
│       ├── dashboards/
│       │   └── dashboards.yml
│       └── datasources/
│           └── influxdb.yml
└── README.md                 # This file
```

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Grafana Integration](https://k6.io/docs/results-visualization/influxdb-+-grafana/)
- [NovaSight Architecture](../docs/requirements/Architecture_Decisions.md)
- [Testing Guide](../docs/TESTING_GUIDE.md)
