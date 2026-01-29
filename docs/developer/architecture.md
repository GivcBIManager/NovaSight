# Architecture Overview

NovaSight is a multi-tenant SaaS platform for self-service business intelligence. This document provides a comprehensive overview of the system architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                    React + TypeScript                           │
│                    (Vite, Shadcn/UI)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────────────────┐
│                    API Gateway / Load Balancer                   │
│                        (NGINX / K8s Ingress)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                      Backend Services                            │
│                    Flask + Python 3.11                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Auth     │ │ DataSource │ │  Semantic  │ │  Dashboard │   │
│  │  Service   │ │  Service   │ │   Layer    │ │  Service   │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │   Query    │ │  Template  │ │   Admin    │                   │
│  │  Service   │ │   Engine   │ │  Service   │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
└─────────┬─────────────┬─────────────┬───────────────────────────┘
          │             │             │
┌─────────┴───┐ ┌───────┴───┐ ┌───────┴───────┐
│  PostgreSQL │ │ ClickHouse│ │     Redis     │
│  (Metadata) │ │  (OLAP)   │ │   (Cache)     │
└─────────────┘ └───────────┘ └───────────────┘
          │             
┌─────────┴─────────────────────┐ ┌────────────────────┐
│         Apache Airflow        │ │       Ollama       │
│      (Workflow Orchestration) │ │    (NL-to-SQL)     │
└───────────────────────────────┘ └────────────────────┘
```

## Key Components

### Frontend (React + TypeScript)

The frontend is a modern single-page application built for performance and developer experience.

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and dev server |
| **React 18** | UI framework with concurrent features |
| **TypeScript** | Type-safe development |
| **Shadcn/UI** | Tailwind-based component library |
| **Zustand** | Lightweight state management |
| **TanStack Query** | Server state & data fetching |
| **TanStack Router** | Type-safe routing |

**Key Frontend Features:**
- Real-time dashboard updates via WebSocket
- Drag-and-drop dashboard builder
- Monaco editor for SQL queries
- Chart visualizations with ECharts
- Responsive design for all screen sizes

### Backend (Flask + Python)

The backend follows a service-oriented architecture with clear separation of concerns.

| Component | Purpose |
|-----------|---------|
| **Flask** | Web framework with Blueprints for modularity |
| **SQLAlchemy** | ORM for database operations |
| **Pydantic** | Request/response validation |
| **Flask-JWT-Extended** | JWT authentication |
| **Flask-RESTX** | API documentation (Swagger) |
| **Celery** | Background task processing |

**Service Layer:**

```
app/services/
├── auth_service.py          # Authentication & authorization
├── connection_service.py    # Data source connections
├── semantic_service.py      # Semantic layer management
├── dashboard_service.py     # Dashboard CRUD
├── query_service.py         # Query execution
├── template_engine.py       # Code generation
├── ingestion_service.py     # Data ingestion pipelines
└── ai_service.py            # NL-to-SQL processing
```

### Data Layer

#### PostgreSQL (Metadata Store)

Stores all tenant configurations, user data, and platform metadata.

```
Platform Database: novasight_platform
├── public schema (platform-level)
│   ├── tenants
│   ├── platform_admins
│   ├── subscription_plans
│   └── platform_audit_log
│
├── tenant_<slug> schema (per-tenant)
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── data_connections
│   ├── ingestion_jobs
│   ├── dbt_models
│   ├── dashboards
│   ├── saved_queries
│   └── audit_log
```

#### ClickHouse (OLAP)

High-performance analytical database for query execution.

- **Database-per-tenant** isolation
- Columnar storage for fast aggregations
- MergeTree family tables
- Materialized views for pre-aggregation

#### Redis (Cache)

- Session storage
- Query result caching
- Rate limiting counters
- Real-time WebSocket pub/sub

### Data Processing

#### Apache Airflow

Workflow orchestration for data pipelines.

- **DAG-per-pipeline** architecture
- Tenant-isolated namespaces
- Template-generated DAGs (no arbitrary code)
- Integration with PySpark and dbt

#### PySpark

Large-scale data ingestion engine.

- JDBC connections to source databases
- SCD Type 1/2 merge logic
- Incremental and full load strategies
- ClickHouse writer

#### dbt (Data Build Tool)

SQL-based transformations in ClickHouse.

- Semantic layer model definitions
- Data quality tests
- Lineage tracking
- Version-controlled models

### AI/ML Components

#### Ollama (Local LLM)

Natural language to SQL translation.

| Component | Description |
|-----------|-------------|
| **Model** | CodeLlama 13B (or similar) |
| **Context Builder** | Builds prompts with schema metadata |
| **SQL Validator** | Ensures only SELECT queries |
| **RLS Injector** | Applies row-level security |

## Multi-Tenancy Architecture

NovaSight uses a hybrid multi-tenancy approach for maximum isolation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ROUTING LAYER                                 │
│                                                                      │
│  Request: https://acme.novasight.com/api/...                        │
│                    │                                                 │
│                    ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Tenant Resolution Middleware                                   │ │
│  │  • Extract tenant from subdomain                                │ │
│  │  • Validate tenant exists and is active                        │ │
│  │  • Inject tenant context into request                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Isolation by Component

| Component | Isolation Method | Enforcement |
|-----------|-----------------|-------------|
| **PostgreSQL** | Schema-per-tenant | `search_path` set on connection |
| **ClickHouse** | Database-per-tenant | Database specified in all queries |
| **Airflow** | Folder-per-tenant | DAGs only loaded from tenant folder |
| **dbt** | Project-per-tenant | Separate dbt project directories |
| **File Storage** | Folder-per-tenant | Path constructed with tenant ID |
| **API** | Tenant context injection | Middleware validates all requests |

## Template Engine Architecture

**Critical Constraint**: NovaSight does NOT generate arbitrary code. All executable artifacts must be produced by filling pre-approved templates.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Ingestion    │  │ DAG Builder  │  │ dbt Model    │               │
│  │ Config Form  │  │ Canvas       │  │ Builder      │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INPUT VALIDATION LAYER                          │
│  • Schema validation (Pydantic)                                     │
│  • SQL injection prevention                                         │
│  • Allowlist validation for identifiers                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TEMPLATE ENGINE SERVICE                            │
│  ┌─────────────────┐    ┌─────────────────┐                         │
│  │ Template        │    │ Parameter       │                         │
│  │ Registry        │◄───│ Injection       │                         │
│  │ (approved only) │    │ Engine (Jinja2) │                         │
│  └─────────────────┘    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PySpark Job   │ │  Airflow DAG    │ │   dbt Model     │
│   (.py file)    │ │  (.py file)     │ │   (.sql file)   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Template Categories

```
templates/
├── pyspark/
│   ├── base_ingestion.py.j2
│   ├── jdbc_reader.py.j2
│   ├── scd_type1.py.j2
│   └── scd_type2.py.j2
│
├── airflow/
│   ├── dag_base.py.j2
│   ├── task_spark_submit.py.j2
│   ├── task_dbt_run.py.j2
│   └── task_email.py.j2
│
└── dbt/
    ├── model_base.sql.j2
    ├── model_incremental.sql.j2
    └── schema.yml.j2
```

### Security Guarantees

| Threat | Mitigation |
|--------|------------|
| **SQL Injection** | Identifiers validated against regex, no string concatenation |
| **Code Injection** | No `eval()` or `exec()`, templates are static |
| **Path Traversal** | Output paths constructed server-side, no user paths |
| **Template Injection** | Jinja2 sandboxed, no user content in templates |
| **Privilege Escalation** | Generated code runs with job-specific credentials |

## AI Integration Architecture

```
User Question: "What were our top products last month?"
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  1. CONTEXT BUILDER                                                 │
│  • Available tables/models (filtered by user's RLS)                │
│  • Column names and descriptions (from semantic layer)             │
│  • Strict instructions: SELECT only, no DDL/DML                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  2. OLLAMA LLM                                                      │
│  Generates SQL based on context and question                       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  3. SQL VALIDATOR                                                   │
│  • Parse SQL with sqlparse                                         │
│  • Reject if not SELECT statement                                  │
│  • Reject forbidden functions (SLEEP, etc.)                        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  4. RLS INJECTION                                                   │
│  Wrap with row-level security filters                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  5. QUERY EXECUTION                                                 │
│  Execute against ClickHouse with timeout and row limits            │
└────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│ API GW  │────▶│ Backend │────▶│  Redis  │
│         │     │         │     │         │     │(Session)│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │
     │  JWT Token    │               │
     │◀──────────────│               │
     │               │               │
     │  API Request  │               │
     │  (Bearer JWT) │               │
     │──────────────▶│──────────────▶│
```

### Authorization Layers

1. **Tenant Isolation**: Middleware validates tenant access
2. **Role-Based Access Control (RBAC)**: Permission checks per endpoint
3. **Row-Level Security (RLS)**: Data filtered by user context
4. **Resource Quotas**: Per-tenant limits enforced

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                       CACHING LAYERS                             │
│                                                                  │
│  L1: Browser Cache (static assets, 1 year)                      │
│  L2: CDN Cache (API responses, configurable TTL)                │
│  L3: Redis Cache (query results, metadata, 5-15 min)            │
│  L4: ClickHouse Materialized Views (pre-aggregated data)        │
└─────────────────────────────────────────────────────────────────┘
```

### Query Optimization

- Query result caching with cache invalidation on data refresh
- Materialized views for common aggregations
- Query timeout limits (30 seconds default)
- Row limit enforcement (10,000 rows default)

## Deployment Architecture

See [Deployment Guide](deployment/README.md) for detailed deployment instructions.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │   Workers    │          │
│  │   (3 pods)   │  │   (5 pods)   │  │   (3 pods)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  ClickHouse  │  │    Redis     │          │
│  │   (HA)       │  │   (Cluster)  │  │   (Cluster)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   Airflow    │  │   Ollama     │                             │
│  │   (HA)       │  │   (GPU)      │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Related Documents

- [ADR Index](adr/README.md) - All Architecture Decision Records
- [API Reference](../api/index.md) - API documentation
- [Deployment Guide](deployment/README.md) - Production deployment

---

*Last updated: January 2026*
