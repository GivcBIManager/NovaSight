"""
NovaSight Sample Test Data
===========================

Predefined sample data for testing various services and APIs.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List


class SampleConnections:
    """Sample connection configurations for testing."""
    
    POSTGRESQL = {
        "name": "Test PostgreSQL",
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database": "testdb",
        "username": "testuser",
        "password": "testpass123",
        "ssl_mode": "prefer",
        "extra_params": {},
    }
    
    MYSQL = {
        "name": "Test MySQL",
        "db_type": "mysql",
        "host": "localhost",
        "port": 3306,
        "database": "testdb",
        "username": "testuser",
        "password": "testpass123",
        "ssl_mode": None,
        "extra_params": {"charset": "utf8mb4"},
    }
    
    CLICKHOUSE = {
        "name": "Test ClickHouse",
        "db_type": "clickhouse",
        "host": "localhost",
        "port": 8123,
        "database": "default",
        "username": "default",
        "password": "",
        "ssl_mode": None,
        "extra_params": {},
    }
    
    ORACLE = {
        "name": "Test Oracle",
        "db_type": "oracle",
        "host": "localhost",
        "port": 1521,
        "database": "ORCL",
        "username": "testuser",
        "password": "testpass123",
        "ssl_mode": None,
        "extra_params": {"service_name": "ORCL"},
    }
    
    SQL_SERVER = {
        "name": "Test SQL Server",
        "db_type": "sqlserver",
        "host": "localhost",
        "port": 1433,
        "database": "TestDB",
        "username": "sa",
        "password": "testpass123",
        "ssl_mode": None,
        "extra_params": {"driver": "ODBC Driver 17 for SQL Server"},
    }
    
    @classmethod
    def all_types(cls) -> List[Dict[str, Any]]:
        """Return all connection types for parametrized testing."""
        return [
            cls.POSTGRESQL,
            cls.MYSQL,
            cls.CLICKHOUSE,
            cls.ORACLE,
            cls.SQL_SERVER,
        ]
    
    @classmethod
    def invalid_configs(cls) -> List[Dict[str, Any]]:
        """Return invalid connection configs for negative testing."""
        return [
            # Invalid port
            {
                **cls.POSTGRESQL,
                "port": 99999,
            },
            # Invalid db_type
            {
                **cls.POSTGRESQL,
                "db_type": "invalid_db",
            },
            # Missing required field
            {
                "name": "Missing Host",
                "db_type": "postgresql",
                "port": 5432,
                "database": "testdb",
                "username": "user",
                "password": "pass",
            },
            # Empty name
            {
                **cls.POSTGRESQL,
                "name": "",
            },
        ]


class SampleSemanticModels:
    """Sample semantic model configurations for testing."""
    
    SALES_ORDERS = {
        "name": "sales_orders",
        "dbt_model": "mart_sales_orders",
        "label": "Sales Orders",
        "description": "Sales order fact table",
        "model_type": "fact",
        "cache_enabled": True,
        "cache_ttl_seconds": 3600,
        "tags": ["sales", "orders"],
    }
    
    CUSTOMERS = {
        "name": "customers",
        "dbt_model": "dim_customers",
        "label": "Customers",
        "description": "Customer dimension table",
        "model_type": "dimension",
        "cache_enabled": True,
        "cache_ttl_seconds": 7200,
        "tags": ["customers", "master"],
    }
    
    PRODUCTS = {
        "name": "products",
        "dbt_model": "dim_products",
        "label": "Products",
        "description": "Product dimension table",
        "model_type": "dimension",
        "cache_enabled": True,
        "cache_ttl_seconds": 7200,
        "tags": ["products", "catalog"],
    }
    
    SAMPLE_DIMENSIONS = [
        {
            "name": "order_date",
            "expression": "order_created_at",
            "label": "Order Date",
            "type": "temporal",
            "data_type": "Date",
            "is_filterable": True,
            "is_groupable": True,
        },
        {
            "name": "customer_id",
            "expression": "customer_id",
            "label": "Customer ID",
            "type": "categorical",
            "data_type": "UUID",
            "is_primary_key": False,
            "is_hidden": True,
        },
        {
            "name": "order_status",
            "expression": "status",
            "label": "Order Status",
            "type": "categorical",
            "data_type": "String",
            "is_filterable": True,
            "is_groupable": True,
        },
    ]
    
    SAMPLE_MEASURES = [
        {
            "name": "total_revenue",
            "aggregation": "sum",
            "expression": "order_total",
            "label": "Total Revenue",
            "format": "currency",
            "format_string": "$#,##0.00",
            "decimal_places": 2,
        },
        {
            "name": "order_count",
            "aggregation": "count",
            "expression": "order_id",
            "label": "Order Count",
            "format": "number",
        },
        {
            "name": "unique_customers",
            "aggregation": "count_distinct",
            "expression": "customer_id",
            "label": "Unique Customers",
            "format": "number",
        },
        {
            "name": "avg_order_value",
            "aggregation": "avg",
            "expression": "order_total",
            "label": "Average Order Value",
            "format": "currency",
            "format_string": "$#,##0.00",
            "decimal_places": 2,
            "is_additive": False,
        },
    ]


class SampleDashboards:
    """Sample dashboard configurations for testing."""
    
    SALES_DASHBOARD = {
        "name": "Sales Overview",
        "description": "Main sales KPI dashboard",
        "is_public": False,
        "auto_refresh": True,
        "refresh_interval": 60,
        "tags": ["sales", "kpi"],
        "layout": [
            {"widget_id": "w1", "x": 0, "y": 0, "w": 6, "h": 4},
            {"widget_id": "w2", "x": 6, "y": 0, "w": 6, "h": 4},
        ],
    }
    
    SAMPLE_WIDGETS = [
        {
            "name": "Revenue KPI",
            "widget_type": "kpi",
            "position": {"x": 0, "y": 0, "w": 3, "h": 2},
            "config": {
                "measures": ["total_revenue"],
                "comparison_period": "previous_month",
            },
        },
        {
            "name": "Sales by Region",
            "widget_type": "bar_chart",
            "position": {"x": 3, "y": 0, "w": 6, "h": 4},
            "config": {
                "dimensions": ["region"],
                "measures": ["total_revenue"],
                "order_by": [{"field": "total_revenue", "direction": "desc"}],
            },
        },
        {
            "name": "Monthly Trend",
            "widget_type": "line_chart",
            "position": {"x": 0, "y": 2, "w": 12, "h": 4},
            "config": {
                "dimensions": ["order_month"],
                "measures": ["total_revenue", "order_count"],
                "time_series": True,
            },
        },
    ]


class SampleUsers:
    """Sample user configurations for testing."""
    
    ADMIN_USER = {
        "email": "admin@example.com",
        "password": "AdminPass123!@#",
        "name": "Admin User",
        "roles": ["tenant_admin"],
    }
    
    ANALYST_USER = {
        "email": "analyst@example.com",
        "password": "AnalystPass123!@#",
        "name": "Data Analyst",
        "roles": ["analyst"],
    }
    
    VIEWER_USER = {
        "email": "viewer@example.com",
        "password": "ViewerPass123!@#",
        "name": "Dashboard Viewer",
        "roles": ["viewer"],
    }
    
    DATA_ENGINEER = {
        "email": "engineer@example.com",
        "password": "EngineerPass123!@#",
        "name": "Data Engineer",
        "roles": ["data_engineer"],
    }
    
    INVALID_PASSWORDS = [
        "short",                    # Too short
        "alllowercase123!",        # No uppercase
        "ALLUPPERCASE123!",        # No lowercase  
        "NoDigitsHere!!",          # No digits
        "NoSpecialChars123",       # No special chars
        "Password123456!",         # Common pattern
    ]
    
    VALID_PASSWORDS = [
        "SecurePass123!@#",
        "MyP@ssw0rd2024!",
        "Complex#1Password",
        "AbCdEfGh12!@#$",
        "V3ryStr0ng!Pass",
    ]


class SampleDAGConfigs:
    """Sample DAG configurations for testing."""
    
    SIMPLE_ETL = {
        "name": "simple_etl_dag",
        "description": "Simple ETL pipeline",
        "schedule_interval": "0 2 * * *",
        "start_date": "2024-01-01",
        "default_args": {
            "owner": "data-team",
            "retries": 2,
            "retry_delay_minutes": 5,
        },
        "tasks": [
            {
                "task_id": "extract",
                "task_type": "python",
                "python_callable": "extract_data",
            },
            {
                "task_id": "transform",
                "task_type": "python",
                "python_callable": "transform_data",
                "upstream": ["extract"],
            },
            {
                "task_id": "load",
                "task_type": "python",
                "python_callable": "load_data",
                "upstream": ["transform"],
            },
        ],
    }
    
    DBT_PIPELINE = {
        "name": "dbt_pipeline_dag",
        "description": "dbt transformation pipeline",
        "schedule_interval": "0 3 * * *",
        "start_date": "2024-01-01",
        "tasks": [
            {
                "task_id": "dbt_run_staging",
                "task_type": "dbt",
                "dbt_command": "run",
                "models": "+staging.*",
            },
            {
                "task_id": "dbt_run_marts",
                "task_type": "dbt",
                "dbt_command": "run",
                "models": "+marts.*",
                "upstream": ["dbt_run_staging"],
            },
            {
                "task_id": "dbt_test",
                "task_type": "dbt",
                "dbt_command": "test",
                "upstream": ["dbt_run_marts"],
            },
        ],
    }
    
    SPARK_PIPELINE = {
        "name": "spark_pipeline_dag",
        "description": "Spark data processing pipeline",
        "schedule_interval": "0 4 * * *",
        "start_date": "2024-01-01",
        "tasks": [
            {
                "task_id": "spark_process",
                "task_type": "spark",
                "application_path": "/opt/spark/apps/process_data.py",
                "spark_conf": {
                    "spark.executor.memory": "4g",
                    "spark.executor.cores": 2,
                },
            },
        ],
    }


class SampleQueryResults:
    """Sample query results for mocking ClickHouse responses."""
    
    SALES_BY_REGION = [
        {"region": "North", "total_revenue": 150000.00, "order_count": 1200},
        {"region": "South", "total_revenue": 120000.00, "order_count": 980},
        {"region": "East", "total_revenue": 180000.00, "order_count": 1450},
        {"region": "West", "total_revenue": 145000.00, "order_count": 1150},
    ]
    
    MONTHLY_TREND = [
        {"month": "2024-01", "total_revenue": 450000.00, "order_count": 3600},
        {"month": "2024-02", "total_revenue": 480000.00, "order_count": 3850},
        {"month": "2024-03", "total_revenue": 520000.00, "order_count": 4200},
    ]
    
    CUSTOMER_SEGMENTS = [
        {"segment": "Enterprise", "customer_count": 150, "revenue_share": 0.45},
        {"segment": "SMB", "customer_count": 800, "revenue_share": 0.35},
        {"segment": "Individual", "customer_count": 2500, "revenue_share": 0.20},
    ]
