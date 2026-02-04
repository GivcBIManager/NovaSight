# NovaSight Debugging & Testing Prompts

This document contains step-by-step prompts for systematically debugging the codebase and running all tests. Use these prompts sequentially with the NovaSight Orchestrator Agent.

---

## 📋 Table of Contents

1. [Phase 1: Environment Verification](#phase-1-environment-verification)
2. [Phase 2: Docker Services Health Check](#phase-2-docker-services-health-check)
3. [Phase 3: Backend Unit Tests](#phase-3-backend-unit-tests)
4. [Phase 4: Backend Integration Tests](#phase-4-backend-integration-tests)
5. [Phase 5: Frontend Unit Tests](#phase-5-frontend-unit-tests)
6. [Phase 6: End-to-End Tests](#phase-6-end-to-end-tests)
7. [Phase 7: Multi-Agent Workflow Tests](#phase-7-multi-agent-workflow-tests)
8. [Phase 8: Security Tests](#phase-8-security-tests)
9. [Phase 9: Performance Tests](#phase-9-performance-tests)
10. [Phase 10: Full System Integration](#phase-10-full-system-integration)

---

## Phase 1: Environment Verification

### Prompt 1.1: Check System Prerequisites
```
Check my development environment prerequisites for NovaSight:
1. Verify Python version (should be 3.11+)
2. Verify Node.js version (should be 18+)
3. Verify Docker and Docker Compose versions
4. Verify all required tools are installed (pip, npm, git)

Report any version mismatches or missing tools.
```

### Prompt 1.2: Validate Project Structure
```
Validate the NovaSight project structure:
1. Check that all required directories exist (backend, frontend, infrastructure, dbt, etc.)
2. Verify key configuration files are present (docker-compose.yml, pytest.ini, package.json)
3. Check for any missing or corrupted files
4. Report any structural issues that need fixing.
```

### Prompt 1.3: Check Python Dependencies
```
Navigate to the backend directory and check Python dependencies:
1. Create or activate the virtual environment
2. Install requirements.txt and requirements-dev.txt
3. Check for any dependency conflicts or missing packages
4. List any outdated packages that might cause compatibility issues
```

### Prompt 1.4: Check Frontend Dependencies
```
Navigate to the frontend directory and check Node.js dependencies:
1. Run npm install to ensure all packages are installed
2. Check for any peer dependency warnings
3. Verify TypeScript compilation works
4. Report any package version conflicts
```

---

## Phase 2: Docker Services Health Check

### Prompt 2.1: Start Core Infrastructure
```
Start the core Docker infrastructure for NovaSight:
1. Run docker-compose up -d postgres redis clickhouse
2. Wait for all services to become healthy
3. Check the status of each container
4. Report any containers that failed to start

If any service fails, provide the logs and suggest fixes.
```

### Prompt 2.2: Verify PostgreSQL Connection
```
Verify PostgreSQL is working correctly:
1. Check the postgres container is healthy
2. Test connecting to the novasight_platform database
3. Verify the database schema can be created
4. Run any pending migrations

Report connection details and any errors encountered.
```

### Prompt 2.3: Verify ClickHouse Connection
```
Verify ClickHouse is working correctly:
1. Check the clickhouse container is healthy
2. Test the HTTP interface on port 8123
3. Verify basic queries work
4. Check the novasight database exists

Report any configuration or connection issues.
```

### Prompt 2.4: Verify Redis Connection
```
Verify Redis is working correctly:
1. Check the redis container is healthy
2. Test redis-cli ping
3. Verify the append-only file is working
4. Test basic set/get operations

Report memory usage and any issues.
```

### Prompt 2.5: Start Airflow Services
```
Start and verify Apache Airflow services:
1. Start airflow-postgres, airflow-init, airflow-webserver, airflow-scheduler
2. Wait for initialization to complete
3. Verify the webserver is accessible on port 8080
4. Check scheduler is running

Report any DAG loading errors or configuration issues.
```

### Prompt 2.6: Start Spark Cluster
```
Start and verify the Apache Spark cluster:
1. Start spark-master and spark workers
2. Verify the master web UI is accessible on port 8081
3. Check workers are connected to the master
4. Verify memory allocation is correct

Report cluster status and any issues.
```

### Prompt 2.7: Verify Ollama Service
```
Start and verify the Ollama LLM service:
1. Start the ollama container
2. Verify the API is accessible on port 11434
3. Check if any models are loaded
4. Test a basic API call

Report service status and memory allocation.
```

---

## Phase 3: Backend Unit Tests

### Prompt 3.1: Run All Backend Unit Tests
```
Run all backend unit tests:
1. Navigate to the backend directory
2. Activate the virtual environment
3. Run: pytest -m unit -v --tb=short
4. Collect and summarize test results

Report: total tests, passed, failed, skipped, and test duration.
For any failures, show the error messages.
```

### Prompt 3.2: Debug Authentication Tests
```
Debug the authentication-related unit tests:
1. Run: pytest backend/tests/unit/test_auth.py backend/tests/unit/test_auth_service.py -v
2. Analyze any failing tests
3. Check the auth service implementation at backend/app/services/auth_service.py
4. Identify root causes of failures

Provide specific fixes for any failing tests.
```

### Prompt 3.3: Debug Connector Tests
```
Debug the database connector tests:
1. Run: pytest backend/tests/unit/test_connectors.py -v
2. Check the connector implementations in backend/app/connectors/
3. Verify all supported database types are tested
4. Analyze any mock or fixture issues

Provide fixes for failing connector tests.
```

### Prompt 3.4: Debug Template Engine Tests
```
Debug the template engine tests:
1. Run: pytest backend/tests/unit/test_template_engine.py backend/tests/unit/test_template_validators.py backend/tests/unit/test_template_filters.py -v
2. Check template implementations in backend/app/templates/
3. Verify Jinja2 template rendering works
4. Check template validation logic

This is critical - the template engine is core to NovaSight security.
```

### Prompt 3.5: Debug DAG Generator Tests
```
Debug the DAG generator tests:
1. Run: pytest backend/tests/unit/test_dag_generator.py backend/tests/unit/test_transformation_dag_generator.py -v
2. Check the DAG templates in backend/templates/airflow/
3. Verify generated DAGs are valid Python
4. Check Airflow compatibility

Report any template rendering or validation errors.
```

### Prompt 3.6: Debug dbt Model Generator Tests
```
Debug the dbt model generator tests:
1. Run: pytest backend/tests/unit/test_dbt_model_generator.py -v
2. Check dbt templates in backend/templates/dbt/
3. Verify generated SQL is valid
4. Check model configuration

Report any SQL generation or validation errors.
```

### Prompt 3.7: Debug NL2SQL Tests
```
Debug the Natural Language to SQL tests:
1. Run: pytest backend/tests/unit/test_nl_to_sql.py backend/tests/unit/test_nl_to_params.py -v
2. Check the NL2SQL service implementation
3. Verify Ollama integration is properly mocked
4. Test edge cases in query parsing

Report accuracy and any parsing failures.
```

### Prompt 3.8: Debug Semantic Layer Tests
```
Debug the semantic layer tests:
1. Run: pytest backend/tests/unit/test_semantic_layer.py backend/tests/unit/test_semantic_service.py -v
2. Check semantic layer model definitions
3. Verify metric calculations are correct
4. Check dimension and measure mappings

Report any schema or calculation errors.
```

### Prompt 3.9: Debug Dashboard Tests
```
Debug the dashboard-related tests:
1. Run: pytest backend/tests/unit/test_dashboard_api.py backend/tests/unit/test_dashboard_service.py -v
2. Check dashboard service implementation
3. Verify chart configuration validation
4. Check query execution logic

Report any API or rendering issues.
```

### Prompt 3.10: Debug Security Tests
```
Debug the security-related unit tests:
1. Run: pytest backend/tests/unit/test_encryption_service.py backend/tests/unit/test_password_service.py backend/tests/unit/test_credential_manager.py -v
2. Check encryption implementations
3. Verify password hashing is secure
4. Check credential storage

Report any security vulnerabilities found.
```

### Prompt 3.11: Debug RBAC Tests
```
Debug the Role-Based Access Control tests:
1. Run: pytest backend/tests/unit/test_rbac_service.py backend/tests/unit/test_tenant_middleware.py -v
2. Check permission checking logic
3. Verify tenant isolation
4. Test role hierarchy

Report any authorization bypass issues.
```

---

## Phase 4: Backend Integration Tests

### Prompt 4.1: Run All Backend Integration Tests
```
Run all backend integration tests (requires Docker services):
1. Ensure postgres, redis, and clickhouse are running
2. Navigate to the backend directory
3. Run: pytest -m integration -v --tb=short
4. Collect and summarize test results

Report which tests require specific infrastructure.
```

### Prompt 4.2: Debug Auth Flow Integration
```
Debug the authentication flow integration tests:
1. Run: pytest backend/tests/integration/test_auth_flow.py -v
2. Verify JWT token generation and validation
3. Check session management
4. Test refresh token flow

Report any authentication flow issues.
```

### Prompt 4.3: Debug Data Source Flow Integration
```
Debug the data source connection integration tests:
1. Run: pytest backend/tests/integration/test_datasource_flow.py -v
2. Test actual database connections (if available)
3. Verify schema introspection
4. Check connection pooling

Report connection and introspection issues.
```

### Prompt 4.4: Debug Query Flow Integration
```
Debug the query execution integration tests:
1. Run: pytest backend/tests/integration/test_query_flow.py -v
2. Test query execution against real databases
3. Verify result formatting
4. Check query timeout handling

Report any query execution errors.
```

### Prompt 4.5: Debug Dashboard Flow Integration
```
Debug the dashboard creation integration tests:
1. Run: pytest backend/tests/integration/test_dashboard_flow.py -v
2. Test dashboard CRUD operations
3. Verify chart rendering
4. Check data refresh

Report any integration issues.
```

### Prompt 4.6: Debug Semantic Flow Integration
```
Debug the semantic layer integration tests:
1. Run: pytest backend/tests/integration/test_semantic_flow.py -v
2. Test semantic model creation
3. Verify metric queries
4. Check lineage tracking

Report any semantic layer issues.
```

### Prompt 4.7: Debug Admin Flow Integration
```
Debug the admin functionality integration tests:
1. Run: pytest backend/tests/integration/test_admin_flow.py -v
2. Test tenant management
3. Verify user provisioning
4. Check quota enforcement

Report any admin flow issues.
```

---

## Phase 5: Frontend Unit Tests

### Prompt 5.1: Run All Frontend Unit Tests
```
Run all frontend unit tests:
1. Navigate to the frontend directory
2. Run: npm test
3. Collect and summarize test results
4. Check code coverage

Report: total tests, passed, failed, and coverage percentage.
```

### Prompt 5.2: Run Frontend Tests with Coverage
```
Run frontend tests with detailed coverage:
1. Navigate to the frontend directory
2. Run: npm run test:coverage
3. Analyze coverage report
4. Identify untested components

Report coverage by component and suggest improvements.
```

### Prompt 5.3: Debug TypeScript Compilation
```
Check for TypeScript errors in the frontend:
1. Navigate to the frontend directory
2. Run: npx tsc --noEmit
3. List all TypeScript errors
4. Categorize errors by type

Provide fixes for critical type errors.
```

### Prompt 5.4: Run ESLint Check
```
Run ESLint on the frontend codebase:
1. Navigate to the frontend directory
2. Run: npm run lint
3. List all linting errors and warnings
4. Categorize by severity

Provide fixes for critical linting issues.
```

---

## Phase 6: End-to-End Tests

### Prompt 6.1: Setup E2E Testing Environment
```
Set up the E2E testing environment:
1. Ensure Docker services are running (all services)
2. Start the backend server
3. Start the frontend dev server
4. Install Playwright browsers: npm run e2e:install

Report when all services are ready for E2E testing.
```

### Prompt 6.2: Run All E2E Tests
```
Run all Playwright E2E tests:
1. Navigate to the frontend directory
2. Run: npm run e2e
3. Collect and summarize test results
4. Check for flaky tests

Report: total tests, passed, failed, and test duration.
```

### Prompt 6.3: Debug Authentication E2E Tests
```
Debug the authentication E2E tests:
1. Run: npx playwright test e2e/tests/auth.spec.ts --headed
2. Watch the test execution
3. Identify any timing or selector issues
4. Check authentication flows

Report specific failures and provide fixes.
```

### Prompt 6.4: Debug Data Sources E2E Tests
```
Debug the data sources E2E tests:
1. Run: npx playwright test e2e/tests/data-sources.spec.ts --headed
2. Test connection form submission
3. Verify connection listing
4. Check error handling

Report any UI or API integration issues.
```

### Prompt 6.5: Debug Dashboard Builder E2E Tests
```
Debug the dashboard builder E2E tests:
1. Run: npx playwright test e2e/tests/dashboard-builder.spec.ts --headed
2. Test chart creation
3. Verify drag-and-drop functionality
4. Check save/load operations

Report any UI interaction issues.
```

### Prompt 6.6: Debug Query Interface E2E Tests
```
Debug the query interface E2E tests:
1. Run: npx playwright test e2e/tests/query-interface.spec.ts --headed
2. Test SQL editor functionality
3. Verify query execution
4. Check result display

Report any editor or execution issues.
```

### Prompt 6.7: Debug Admin E2E Tests
```
Debug the admin panel E2E tests:
1. Run: npx playwright test e2e/tests/admin.spec.ts --headed
2. Test tenant management UI
3. Verify user management
4. Check settings pages

Report any admin UI issues.
```

### Prompt 6.8: Generate E2E Test Report
```
Generate a comprehensive E2E test report:
1. Run: npm run e2e:report
2. Analyze the HTML report
3. Identify patterns in failures
4. Check screenshot/video artifacts

Summarize overall E2E test health.
```

---

## Phase 7: Multi-Agent Workflow Tests

### Prompt 7.1: Validate Agent Configurations
```
Run the multi-agent workflow tests focusing on agent validation:
1. Navigate to the project root
2. Run: python -m pytest tests/multi_agent_workflow_test.py::TestAgentValidation -v
3. Check that all agent configurations are valid
4. Verify agent model assignments

Report any invalid agent configurations.
```

### Prompt 7.2: Validate Prompt Configurations
```
Run the multi-agent workflow tests focusing on prompt validation:
1. Run: python -m pytest tests/multi_agent_workflow_test.py::TestPromptValidation -v
2. Check that all prompts have valid metadata
3. Verify prompt dependencies are resolvable
4. Check phase assignments

Report any invalid or orphaned prompts.
```

### Prompt 7.3: Validate Workflow Dependencies
```
Run the multi-agent workflow tests focusing on dependencies:
1. Run: python -m pytest tests/multi_agent_workflow_test.py::TestWorkflowDependencies -v
2. Check for circular dependencies
3. Verify dependency order
4. Test dependency resolution algorithm

Report any dependency graph issues.
```

### Prompt 7.4: Simulate Workflow Execution
```
Run the workflow simulation tests:
1. Run: python -m pytest tests/multi_agent_workflow_test.py::TestWorkflowExecution -v
2. Simulate end-to-end workflow
3. Check state transitions
4. Verify completion criteria

Report any workflow execution issues.
```

---

## Phase 8: Security Tests

### Prompt 8.1: Run Backend Security Tests
```
Run the backend security test suite:
1. Navigate to the backend directory
2. Run: pytest tests/security/ -v
3. Check for common vulnerabilities
4. Verify secure coding practices

Report any security findings by severity.
```

### Prompt 8.2: Run OWASP ZAP Scan
```
Run the OWASP ZAP security scan (if configured):
1. Check if ZAP is configured in security/zap/
2. Start the application stack
3. Run: ./security/run-security-scan.bat (or .sh)
4. Analyze the security report

Report vulnerabilities found by ZAP.
```

### Prompt 8.3: Check Secrets Management
```
Verify secrets are not exposed in the codebase:
1. Search for hardcoded credentials
2. Check environment variable usage
3. Verify .env files are gitignored
4. Check Docker secrets handling

Report any exposed secrets or misconfigurations.
```

### Prompt 8.4: Verify Template Engine Security
```
Verify the template engine security constraints:
1. Check that arbitrary code execution is prevented
2. Verify template sandboxing
3. Test input validation
4. Check for injection vulnerabilities

This is critical for the Template Engine Rule compliance.
```

---

## Phase 9: Performance Tests

### Prompt 9.1: Run K6 Performance Tests
```
Run the K6 performance test suite (if configured):
1. Check performance test scripts in performance/k6/
2. Start the application stack
3. Run performance tests
4. Analyze results

Report response times, throughput, and error rates.
```

### Prompt 9.2: Check Database Performance
```
Analyze database performance:
1. Check PostgreSQL query performance
2. Analyze ClickHouse query times
3. Check index usage
4. Verify connection pool sizing

Report any slow queries or bottlenecks.
```

### Prompt 9.3: Check API Response Times
```
Measure API endpoint response times:
1. Test authentication endpoints
2. Test data source endpoints
3. Test query execution endpoints
4. Test dashboard endpoints

Report average, p95, and p99 response times.
```

---

## Phase 10: Full System Integration

### Prompt 10.1: Run Full Integration Test Suite
```
Run the complete integration test suite:
1. Start all Docker services
2. Run database migrations
3. Seed test data
4. Execute: ./scripts/run-all-tests.bat

Report overall test results and coverage.
```

### Prompt 10.2: Test Complete User Workflow
```
Test a complete user workflow end-to-end:
1. User registration and login
2. Add a data source connection
3. Introspect schema
4. Create a semantic model
5. Build a dashboard
6. Share with another user

Report any issues in the workflow.
```

### Prompt 10.3: Test Multi-Tenant Isolation
```
Test multi-tenant data isolation:
1. Create two test tenants
2. Add data for each tenant
3. Verify cross-tenant queries are blocked
4. Check permission boundaries

Report any data leakage or access control issues.
```

### Prompt 10.4: Generate Final Test Report
```
Generate a comprehensive test report:
1. Aggregate all test results
2. Calculate overall coverage
3. List all open issues
4. Provide remediation recommendations

Format as a release readiness report.
```

---

## 🛠️ Quick Reference Commands

### Backend Commands
```bash
# All unit tests
cd backend && pytest -m unit -v

# All integration tests
cd backend && pytest -m integration -v

# Specific test file
cd backend && pytest tests/unit/test_auth.py -v

# With coverage
cd backend && pytest --cov=app --cov-report=html
```

### Frontend Commands
```bash
# All tests
cd frontend && npm test

# With coverage
cd frontend && npm run test:coverage

# E2E tests
cd frontend && npm run e2e

# E2E with UI
cd frontend && npm run e2e:ui
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis clickhouse

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 📊 Test Categories by Priority

| Priority | Category | Command | Time |
|----------|----------|---------|------|
| P0 - Critical | Backend Unit | `pytest -m unit` | ~2 min |
| P0 - Critical | Security | `pytest tests/security/` | ~1 min |
| P1 - High | Integration | `pytest -m integration` | ~5 min |
| P1 - High | Frontend Unit | `npm test` | ~2 min |
| P2 - Medium | E2E | `npm run e2e` | ~10 min |
| P2 - Medium | Multi-Agent | `pytest tests/multi_agent_workflow_test.py` | ~1 min |
| P3 - Low | Performance | K6 tests | ~5 min |

---

*NovaSight Debugging Prompts v1.0*
