"""
NovaSight Prometheus Metrics Middleware
=======================================

Collects and exposes metrics for monitoring with Prometheus.
Includes HTTP request metrics, query metrics, template engine metrics,
and tenant-level metrics.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from flask import Flask, request, g, Response
import time
from typing import Optional, Callable
from functools import wraps


# =============================================================================
# HTTP Request Metrics
# =============================================================================

REQUEST_COUNT = Counter(
    'novasight_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'novasight_http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_REQUESTS = Gauge(
    'novasight_http_requests_in_progress',
    'Number of requests in progress',
    ['method']
)

REQUEST_SIZE = Histogram(
    'novasight_http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'endpoint'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)

RESPONSE_SIZE = Histogram(
    'novasight_http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'endpoint'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)


# =============================================================================
# Query Metrics
# =============================================================================

QUERY_EXECUTION_TIME = Histogram(
    'novasight_query_execution_seconds',
    'Query execution time',
    ['query_type', 'datasource_type'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

QUERY_RESULT_SIZE = Histogram(
    'novasight_query_result_rows',
    'Number of rows returned by queries',
    ['query_type'],
    buckets=[10, 100, 1000, 10000, 100000, 1000000]
)

QUERY_COUNT = Counter(
    'novasight_queries_total',
    'Total number of queries executed',
    ['query_type', 'datasource_type', 'status']
)

QUERY_ERRORS = Counter(
    'novasight_query_errors_total',
    'Total number of query errors',
    ['query_type', 'datasource_type', 'error_type']
)


# =============================================================================
# Template Engine Metrics
# =============================================================================

TEMPLATE_GENERATION_TIME = Histogram(
    'novasight_template_generation_seconds',
    'Template generation time',
    ['template_type']
)

TEMPLATE_VALIDATION_ERRORS = Counter(
    'novasight_template_validation_errors_total',
    'Template validation errors',
    ['template_type', 'error_type']
)

TEMPLATE_GENERATION_COUNT = Counter(
    'novasight_template_generations_total',
    'Total template generations',
    ['template_type', 'status']
)


# =============================================================================
# Tenant Metrics
# =============================================================================

ACTIVE_TENANTS = Gauge(
    'novasight_active_tenants',
    'Number of active tenants'
)

USERS_PER_TENANT = Gauge(
    'novasight_users_per_tenant',
    'Number of users per tenant',
    ['tenant_id']
)

TENANT_REQUESTS = Counter(
    'novasight_tenant_requests_total',
    'Total requests per tenant',
    ['tenant_id', 'endpoint']
)

TENANT_QUOTA_USAGE = Gauge(
    'novasight_tenant_quota_usage_ratio',
    'Tenant quota usage ratio (0-1)',
    ['tenant_id', 'quota_type']
)


# =============================================================================
# Database Connection Metrics
# =============================================================================

DB_CONNECTION_POOL_SIZE = Gauge(
    'novasight_db_pool_size',
    'Database connection pool size',
    ['database']
)

DB_CONNECTION_POOL_CHECKED_OUT = Gauge(
    'novasight_db_pool_checked_out',
    'Database connections currently in use',
    ['database']
)

DB_CONNECTION_ERRORS = Counter(
    'novasight_db_connection_errors_total',
    'Database connection errors',
    ['database', 'error_type']
)


# =============================================================================
# Pipeline Metrics
# =============================================================================

PIPELINE_EXECUTION_TIME = Histogram(
    'novasight_pipeline_execution_seconds',
    'Pipeline execution time',
    ['pipeline_type', 'tenant_id'],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0, 1800.0, 3600.0]
)

PIPELINE_STATUS = Counter(
    'novasight_pipeline_runs_total',
    'Total pipeline runs',
    ['pipeline_type', 'tenant_id', 'status']
)


# =============================================================================
# Authentication Metrics
# =============================================================================

AUTH_ATTEMPTS = Counter(
    'novasight_auth_attempts_total',
    'Total authentication attempts',
    ['method', 'status']
)

AUTH_FAILURES = Counter(
    'novasight_auth_failures_total',
    'Authentication failures by reason',
    ['reason']
)

ACTIVE_SESSIONS = Gauge(
    'novasight_active_sessions',
    'Number of active user sessions'
)


# =============================================================================
# Metrics Helper Functions
# =============================================================================

def track_query_execution(
    query_type: str,
    datasource_type: str,
    duration: float,
    row_count: int,
    success: bool = True,
    error_type: Optional[str] = None
) -> None:
    """
    Track query execution metrics.
    
    Args:
        query_type: Type of query (ad_hoc, dashboard, report)
        datasource_type: Data source type (postgresql, clickhouse, mysql)
        duration: Query execution time in seconds
        row_count: Number of rows returned
        success: Whether query succeeded
        error_type: Error type if failed
    """
    QUERY_EXECUTION_TIME.labels(
        query_type=query_type,
        datasource_type=datasource_type
    ).observe(duration)
    
    QUERY_RESULT_SIZE.labels(query_type=query_type).observe(row_count)
    
    status = 'success' if success else 'failure'
    QUERY_COUNT.labels(
        query_type=query_type,
        datasource_type=datasource_type,
        status=status
    ).inc()
    
    if not success and error_type:
        QUERY_ERRORS.labels(
            query_type=query_type,
            datasource_type=datasource_type,
            error_type=error_type
        ).inc()


def track_template_generation(
    template_type: str,
    duration: float,
    success: bool = True,
    error_type: Optional[str] = None
) -> None:
    """
    Track template generation metrics.
    
    Args:
        template_type: Type of template (pyspark, dbt, airflow, sql)
        duration: Generation time in seconds
        success: Whether generation succeeded
        error_type: Error type if validation failed
    """
    TEMPLATE_GENERATION_TIME.labels(template_type=template_type).observe(duration)
    
    status = 'success' if success else 'failure'
    TEMPLATE_GENERATION_COUNT.labels(
        template_type=template_type,
        status=status
    ).inc()
    
    if not success and error_type:
        TEMPLATE_VALIDATION_ERRORS.labels(
            template_type=template_type,
            error_type=error_type
        ).inc()


def track_pipeline_execution(
    pipeline_type: str,
    tenant_id: str,
    duration: float,
    status: str
) -> None:
    """
    Track pipeline execution metrics.
    
    Args:
        pipeline_type: Type of pipeline (ingestion, transformation, export)
        tenant_id: Tenant identifier
        duration: Execution time in seconds
        status: Pipeline status (success, failure, timeout)
    """
    PIPELINE_EXECUTION_TIME.labels(
        pipeline_type=pipeline_type,
        tenant_id=tenant_id
    ).observe(duration)
    
    PIPELINE_STATUS.labels(
        pipeline_type=pipeline_type,
        tenant_id=tenant_id,
        status=status
    ).inc()


def update_tenant_metrics(tenant_id: str, user_count: int) -> None:
    """
    Update tenant-level metrics.
    
    Args:
        tenant_id: Tenant identifier
        user_count: Number of users in tenant
    """
    USERS_PER_TENANT.labels(tenant_id=tenant_id).set(user_count)


def update_quota_usage(tenant_id: str, quota_type: str, usage_ratio: float) -> None:
    """
    Update tenant quota usage metrics.
    
    Args:
        tenant_id: Tenant identifier
        quota_type: Type of quota (storage, queries, users)
        usage_ratio: Usage ratio (0.0 to 1.0)
    """
    TENANT_QUOTA_USAGE.labels(
        tenant_id=tenant_id,
        quota_type=quota_type
    ).set(usage_ratio)


# =============================================================================
# Decorator for Timing Functions
# =============================================================================

def timed_operation(metric: Histogram, labels: Optional[dict] = None):
    """
    Decorator to time function execution and record to histogram.
    
    Args:
        metric: Prometheus Histogram to record to
        labels: Labels to apply to the metric
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                if labels:
                    metric.labels(**labels).observe(duration)
                else:
                    metric.observe(duration)
        return wrapper
    return decorator


# =============================================================================
# Metrics Middleware Setup
# =============================================================================

class MetricsMiddleware:
    """
    Flask middleware for collecting HTTP metrics.
    
    Automatically tracks:
    - Request count by method, endpoint, and status
    - Request latency
    - Active requests
    - Request/response sizes
    - Per-tenant request counts
    """
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask) -> None:
        """Initialize metrics middleware with Flask app."""
        self.app = app
        
        # Register before/after request handlers
        app.before_request(self._before_request)
        app.after_request(self._after_request)
        
        # Register metrics endpoint
        @app.route('/metrics')
        def metrics_endpoint():
            """Expose Prometheus metrics."""
            return Response(
                generate_latest(),
                mimetype=CONTENT_TYPE_LATEST
            )
    
    def _before_request(self):
        """Record request start time and increment active requests."""
        g.metrics_start_time = time.time()
        ACTIVE_REQUESTS.labels(method=request.method).inc()
        
        # Track request size
        request_size = request.content_length or 0
        if request_size > 0:
            endpoint = self._get_endpoint()
            REQUEST_SIZE.labels(
                method=request.method,
                endpoint=endpoint
            ).observe(request_size)
    
    def _after_request(self, response):
        """Record request metrics after response."""
        if hasattr(g, 'metrics_start_time'):
            latency = time.time() - g.metrics_start_time
            endpoint = self._get_endpoint()
            
            # Request count
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=endpoint,
                status=response.status_code
            ).inc()
            
            # Request latency
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=endpoint
            ).observe(latency)
            
            # Response size
            response_size = response.content_length or len(response.get_data())
            if response_size > 0:
                RESPONSE_SIZE.labels(
                    method=request.method,
                    endpoint=endpoint
                ).observe(response_size)
            
            # Tenant-specific metrics
            tenant_id = getattr(g, 'tenant_id', None)
            if tenant_id:
                TENANT_REQUESTS.labels(
                    tenant_id=tenant_id,
                    endpoint=endpoint
                ).inc()
        
        # Decrement active requests
        ACTIVE_REQUESTS.labels(method=request.method).dec()
        
        return response
    
    def _get_endpoint(self) -> str:
        """Get normalized endpoint name."""
        if request.endpoint:
            return request.endpoint
        
        # Fallback to URL rule or path
        if request.url_rule:
            return request.url_rule.rule
        
        return request.path


def setup_metrics(app: Flask) -> MetricsMiddleware:
    """
    Setup metrics middleware for Flask application.
    
    Args:
        app: Flask application instance
    
    Returns:
        MetricsMiddleware instance
    """
    middleware = MetricsMiddleware(app)
    return middleware


# =============================================================================
# Metrics Collection Jobs (for periodic metrics)
# =============================================================================

def collect_tenant_metrics(db_session) -> None:
    """
    Collect and update tenant metrics.
    Should be called periodically (e.g., every minute).
    
    Args:
        db_session: Database session for querying tenant data
    """
    from app.models import Tenant, User
    
    # Count active tenants
    active_tenant_count = db_session.query(Tenant).filter(
        Tenant.is_active == True
    ).count()
    ACTIVE_TENANTS.set(active_tenant_count)
    
    # Update users per tenant
    tenant_users = db_session.query(
        Tenant.id,
        db_session.query(User).filter(
            User.tenant_id == Tenant.id,
            User.is_active == True
        ).count()
    ).filter(Tenant.is_active == True).all()
    
    for tenant_id, user_count in tenant_users:
        USERS_PER_TENANT.labels(tenant_id=str(tenant_id)).set(user_count)


def collect_db_pool_metrics(engine, database_name: str = 'postgres') -> None:
    """
    Collect database connection pool metrics.
    
    Args:
        engine: SQLAlchemy engine
        database_name: Name for labeling
    """
    pool = engine.pool
    
    DB_CONNECTION_POOL_SIZE.labels(database=database_name).set(pool.size())
    DB_CONNECTION_POOL_CHECKED_OUT.labels(database=database_name).set(
        pool.checkedout()
    )
