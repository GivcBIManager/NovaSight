"""
NovaSight Test Factories
=========================

Factory Boy factories for creating test database objects.
Use these factories in tests to create realistic test data.
"""

import uuid
from datetime import datetime, timedelta
import factory
from factory import fuzzy, LazyAttribute

# Note: These factories are designed to work with SQLAlchemy models
# When the database session is available, use:
#   class Meta:
#       sqlalchemy_session = db.session


class TenantFactory(factory.Factory):
    """Factory for creating Tenant objects."""
    
    class Meta:
        model = dict  # Use dict for simplicity, replace with actual model
    
    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Test Tenant {n}")
    slug = factory.Sequence(lambda n: f"test-tenant-{n}")
    plan = fuzzy.FuzzyChoice(["starter", "professional", "enterprise"])
    status = "active"
    is_active = True
    settings = factory.LazyFunction(lambda: {"timezone": "UTC"})
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class UserFactory(factory.Factory):
    """Factory for creating User objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker('name')
    password_hash = "$argon2id$v=19$m=65536,t=3,p=4$test_hash"
    status = "active"
    is_active = True
    email_verified = True
    tenant_id = factory.LazyFunction(uuid.uuid4)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ConnectionFactory(factory.Factory):
    """Factory for creating DataConnection objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    tenant_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Connection {n}")
    db_type = fuzzy.FuzzyChoice(["postgresql", "mysql", "clickhouse"])
    host = "localhost"
    port = fuzzy.FuzzyChoice([5432, 3306, 8123])
    database = factory.Sequence(lambda n: f"database_{n}")
    username = "testuser"
    password_encrypted = "encrypted:testpassword"
    ssl_mode = None
    status = "active"
    extra_params = factory.LazyFunction(dict)
    created_by = factory.LazyFunction(uuid.uuid4)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class SemanticModelFactory(factory.Factory):
    """Factory for creating SemanticModel objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    tenant_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"model_{n}")
    dbt_model = factory.Sequence(lambda n: f"mart_model_{n}")
    label = factory.Sequence(lambda n: f"Model {n}")
    description = factory.Faker('sentence')
    model_type = fuzzy.FuzzyChoice(["fact", "dimension"])
    is_active = True
    cache_enabled = True
    cache_ttl_seconds = 3600
    tags = factory.LazyFunction(lambda: ["test"])
    created_by = factory.LazyFunction(uuid.uuid4)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class DimensionFactory(factory.Factory):
    """Factory for creating Dimension objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    model_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"dimension_{n}")
    expression = factory.Sequence(lambda n: f"column_{n}")
    label = factory.Sequence(lambda n: f"Dimension {n}")
    description = None
    type = fuzzy.FuzzyChoice(["categorical", "temporal", "numeric"])
    data_type = "String"
    is_primary_key = False
    is_hidden = False
    is_filterable = True
    is_groupable = True


class MeasureFactory(factory.Factory):
    """Factory for creating Measure objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    model_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"measure_{n}")
    aggregation = fuzzy.FuzzyChoice(["sum", "count", "avg", "min", "max"])
    expression = factory.Sequence(lambda n: f"value_{n}")
    label = factory.Sequence(lambda n: f"Measure {n}")
    description = None
    format = "number"
    format_string = "#,##0"
    decimal_places = 0
    is_hidden = False
    is_additive = True


class DashboardFactory(factory.Factory):
    """Factory for creating Dashboard objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    tenant_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Dashboard {n}")
    description = factory.Faker('sentence')
    is_public = False
    is_deleted = False
    auto_refresh = False
    refresh_interval = None
    tags = factory.LazyFunction(list)
    layout = factory.LazyFunction(list)
    settings = factory.LazyFunction(dict)
    shared_with = factory.LazyFunction(list)
    created_by = factory.LazyFunction(uuid.uuid4)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class WidgetFactory(factory.Factory):
    """Factory for creating Widget objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    dashboard_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Widget {n}")
    widget_type = fuzzy.FuzzyChoice(["kpi", "bar_chart", "line_chart", "table"])
    position = factory.LazyFunction(lambda: {"x": 0, "y": 0, "w": 6, "h": 4})
    config = factory.LazyFunction(lambda: {"measures": ["count"]})
    is_visible = True
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class RoleFactory(factory.Factory):
    """Factory for creating Role objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    tenant_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"role_{n}")
    display_name = factory.Sequence(lambda n: f"Role {n}")
    description = factory.Faker('sentence')
    is_system = False
    is_default = False
    permissions = factory.LazyFunction(lambda: {"dashboards": ["view"]})
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class DAGConfigFactory(factory.Factory):
    """Factory for creating DAG configuration objects."""
    
    class Meta:
        model = dict
    
    id = factory.LazyFunction(uuid.uuid4)
    tenant_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"dag_{n}")
    description = factory.Faker('sentence')
    schedule_interval = "0 2 * * *"
    start_date = "2024-01-01"
    is_active = True
    default_args = factory.LazyFunction(lambda: {
        "owner": "data-team",
        "retries": 2,
        "retry_delay_minutes": 5,
    })
    tasks = factory.LazyFunction(list)
    created_by = factory.LazyFunction(uuid.uuid4)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


# Batch creation helpers
def create_batch(factory_class, count: int, **kwargs):
    """Create multiple objects using a factory."""
    return [factory_class(**kwargs) for _ in range(count)]


def create_tenant_with_users(user_count: int = 3):
    """Create a tenant with multiple users."""
    tenant = TenantFactory()
    users = [UserFactory(tenant_id=tenant['id']) for _ in range(user_count)]
    return tenant, users


def create_tenant_with_connections(connection_count: int = 2):
    """Create a tenant with multiple connections."""
    tenant = TenantFactory()
    user = UserFactory(tenant_id=tenant['id'])
    connections = [
        ConnectionFactory(
            tenant_id=tenant['id'],
            created_by=user['id']
        )
        for _ in range(connection_count)
    ]
    return tenant, user, connections


def create_semantic_model_with_dimensions_and_measures(
    dim_count: int = 3,
    measure_count: int = 2
):
    """Create a semantic model with dimensions and measures."""
    tenant = TenantFactory()
    user = UserFactory(tenant_id=tenant['id'])
    model = SemanticModelFactory(
        tenant_id=tenant['id'],
        created_by=user['id']
    )
    dimensions = [
        DimensionFactory(model_id=model['id'])
        for _ in range(dim_count)
    ]
    measures = [
        MeasureFactory(model_id=model['id'])
        for _ in range(measure_count)
    ]
    return model, dimensions, measures


def create_dashboard_with_widgets(widget_count: int = 4):
    """Create a dashboard with multiple widgets."""
    tenant = TenantFactory()
    user = UserFactory(tenant_id=tenant['id'])
    dashboard = DashboardFactory(
        tenant_id=tenant['id'],
        created_by=user['id']
    )
    widgets = [
        WidgetFactory(dashboard_id=dashboard['id'])
        for _ in range(widget_count)
    ]
    return dashboard, widgets
