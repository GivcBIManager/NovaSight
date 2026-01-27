# Ingestion DAG Generator - README

## Overview

The Ingestion DAG Generator automatically creates Airflow DAGs that submit PySpark jobs to a Spark cluster for ingesting data from various sources (PostgreSQL, MySQL, Oracle, SQL Server) into ClickHouse.

## Quick Links

- 📘 [Full Implementation Guide](../../docs/implementation/IMPLEMENTATION_016.md)
- 🚀 [Quick Start Guide](../../docs/implementation/QUICKSTART_016.md)
- 📝 [Implementation Summary](../../docs/implementation/SUMMARY_016.md)
- 🧪 [Unit Tests](../../backend/tests/unit/test_dag_generator.py)

## Architecture

```
┌──────────────┐
│ Data Source  │ (PostgreSQL, MySQL, Oracle, SQL Server)
│ (via JDBC)   │
└──────┬───────┘
       │
       v
┌──────────────┐     ┌─────────────────────┐
│   Airflow    │────▶│   Spark Cluster     │
│ (Scheduler)  │     │ (PySpark Jobs)      │
└──────────────┘     └─────────┬───────────┘
                               │
                               v
                     ┌─────────────────┐
                     │   ClickHouse    │
                     │   (Analytics)   │
                     └─────────────────┘
```

## Components

### 1. DAG Generator (`backend/app/services/dag_generator.py`)

Generates Airflow DAGs and configuration files:

```python
from app.services.dag_generator import DagGenerator

generator = DagGenerator(tenant_id="my-tenant")
dag_id = generator.generate_ingestion_dag(
    datasource=datasource,
    tables=tables,
    schedule="@hourly"
)
```

**Methods**:
- `generate_ingestion_dag()` - Create new DAG
- `update_ingestion_dag()` - Update existing DAG
- `delete_dag()` - Remove DAG and cleanup files

### 2. PySpark Application (`infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py`)

Distributed data ingestion job:

```bash
spark-submit \
  --master spark://spark-master:7077 \
  --jars /opt/spark/jars/postgresql-42.6.0.jar,/opt/spark/jars/clickhouse-jdbc-0.4.6-all.jar \
  ingest_to_clickhouse.py \
  config.json
```

**Features**:
- JDBC reading from multiple database types
- Incremental ingestion with watermarks
- Full refresh mode
- Metadata column injection
- Error handling and reporting

### 3. Airflow DAG Template (`backend/app/templates/airflow/spark_ingestion_dag.py.j2`)

Jinja2 template for generating DAG files:

```python
SparkSubmitOperator(
    application='/opt/airflow/spark_apps/ingestion/ingest_to_clickhouse.py',
    application_args=['config.json'],
    conn_id='spark_default',
    ...
)
```

## File Structure

```
backend/app/
├── services/
│   ├── dag_generator.py           # DAG generation logic
│   └── airflow_client.py          # Airflow REST API client
└── templates/airflow/
    └── spark_ingestion_dag.py.j2  # DAG template

infrastructure/
├── airflow/
│   └── spark_apps/
│       ├── ingestion/
│       │   └── ingest_to_clickhouse.py  # PySpark app
│       └── configs/
│           └── *.json                    # Auto-generated configs
└── spark/
    └── jars/
        ├── postgresql-42.6.0.jar
        ├── clickhouse-jdbc-0.4.6-all.jar
        └── ...                            # Other JDBC drivers
```

## Installation

### 1. Install JDBC Drivers

```bash
cd infrastructure/spark/jars

# PostgreSQL
wget https://jdbc.postgresql.org/download/postgresql-42.6.0.jar

# ClickHouse
wget https://repo1.maven.org/maven2/com/clickhouse/clickhouse-jdbc/0.4.6/clickhouse-jdbc-0.4.6-all.jar
```

See [JDBC Driver Guide](../../infrastructure/spark/jars/README.md)

### 2. Configure Airflow Connection

```bash
airflow connections add spark_default \
  --conn-type spark \
  --conn-host spark://spark-master:7077
```

### 3. Set Environment Variables

```bash
export AIRFLOW_BASE_URL=http://airflow-webserver:8080
export AIRFLOW_USERNAME=airflow
export AIRFLOW_PASSWORD=airflow
```

## Usage

### Generate DAG

```python
from app.services.dag_generator import DagGenerator
from app.models.connection import DataSource, DataSourceTable

generator = DagGenerator(tenant_id="tenant-123")

tables = [
    DataSourceTable(
        source_name="public.users",
        target_name="users",
        incremental_column="updated_at",  # For incremental mode
        primary_keys=["id"]
    )
]

dag_id = generator.generate_ingestion_dag(
    datasource=my_datasource,
    tables=tables,
    schedule="@hourly"
)

print(f"Generated: {dag_id}")
# Output: ingest_tenant-123_datasource-456
```

### Trigger DAG Run

Via Airflow UI:
1. Navigate to `http://localhost:8080`
2. Find DAG: `ingest_tenant-123_datasource-456`
3. Unpause (toggle switch)
4. Trigger (play button)

Via API:
```python
from app.services.airflow_client import AirflowClient

client = AirflowClient()
run = client.trigger_dag(
    dag_id="ingest_tenant-123_datasource-456",
    conf={"force_full_refresh": True}
)
```

### Check Logs

```python
logs = client.get_task_logs(
    dag_id="ingest_tenant-123_datasource-456",
    run_id=run.run_id,
    task_id="ingest_postgresql_data"
)
print(logs)
```

## Configuration

### Datasource Config

Generated JSON file: `spark_apps/configs/ingest_{tenant}_{id}_config.json`

```json
{
  "tenant_id": "tenant-123",
  "datasource_id": "datasource-456",
  "datasource_type": "postgresql",
  "connection_config": {
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "user",
    "jdbc_driver": "org.postgresql.Driver"
  },
  "clickhouse_config": {
    "host": "clickhouse",
    "port": 9000,
    "database": "tenant_tenant-123"
  },
  "tables": [
    {
      "source_table": "public.users",
      "target_table": "users",
      "incremental_column": "updated_at",
      "mode": "incremental",
      "primary_keys": ["id"]
    }
  ]
}
```

### Spark Configuration

Configurable in DAG generation:

```python
spark_conf = {
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
    'spark.dynamicAllocation.enabled': 'true',
    'spark.dynamicAllocation.minExecutors': '1',
    'spark.dynamicAllocation.maxExecutors': '5',
}
```

## Ingestion Modes

### Incremental (Watermark-Based)

Only fetches new/updated records:

```sql
SELECT * FROM public.users 
WHERE updated_at > 'last_watermark'
ORDER BY updated_at
```

**Best for**: Large tables with frequent updates  
**Requires**: Timestamp or sequential ID column

### Full Refresh

Fetches entire table:

```sql
SELECT * FROM public.users
```

**Best for**: Small static tables, dimension tables  
**Overwrites**: Existing data in ClickHouse

## Metadata Columns

Every ingested row includes:

| Column | Type | Description |
|--------|------|-------------|
| `_tenant_id` | String | Tenant UUID |
| `_datasource_id` | String | Source datasource UUID |
| `_ingested_at` | Timestamp | Ingestion timestamp (UTC) |

## Monitoring

### Check DAG Status

```python
dag_info = client.get_dag("ingest_tenant-123_datasource-456")
print(f"Is Paused: {dag_info['is_paused']}")
```

### Get Run History

```python
runs = client.get_dag_runs(
    dag_id="ingest_tenant-123_datasource-456",
    limit=10
)
for run in runs:
    print(f"{run.run_id}: {run.state}")
```

### View Task Instances

```python
tasks = client.get_task_instances(
    dag_id="ingest_tenant-123_datasource-456",
    run_id=run.run_id
)
for task in tasks:
    print(f"{task.task_id}: {task.state}")
```

## Testing

### Run Unit Tests

```bash
cd backend
pytest tests/unit/test_dag_generator.py -v
```

### Test Locally

```bash
# Create test config
cat > test_config.json <<EOF
{
  "tenant_id": "test",
  "datasource_id": "test",
  "datasource_type": "postgresql",
  "connection_config": {
    "host": "localhost",
    "port": 5432,
    "database": "testdb",
    "username": "user",
    "jdbc_driver": "org.postgresql.Driver"
  },
  "clickhouse_config": {
    "host": "localhost",
    "port": 9000,
    "database": "test"
  },
  "tables": [
    {
      "source_table": "public.test",
      "target_table": "test",
      "mode": "full",
      "primary_keys": ["id"]
    }
  ]
}
EOF

# Run PySpark app
spark-submit \
  --master local[*] \
  --jars infrastructure/spark/jars/postgresql-42.6.0.jar,infrastructure/spark/jars/clickhouse-jdbc-0.4.6-all.jar \
  infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py \
  test_config.json
```

## Troubleshooting

### DAG not appearing

```bash
# Check file exists
ls /opt/airflow/dags/ingest_*

# Check Airflow scheduler logs
docker logs airflow-scheduler

# Check for parsing errors
airflow dags list-import-errors
```

### JDBC connection failed

```bash
# Verify JDBC JAR is in Spark classpath
ls /opt/spark/jars/*.jar

# Test database connectivity
psql -h localhost -p 5432 -U user -d mydb
```

### No data ingested

```sql
-- Check watermark in ClickHouse
SELECT max(updated_at) FROM users;

-- Check if any rows match incremental filter
SELECT count(*) FROM public.users WHERE updated_at > 'watermark';
```

## Performance Tuning

### For Large Tables (>10M rows)

```python
# Increase executor resources
spark_conf = {
    'spark.executor.memory': '4g',
    'spark.executor.cores': '4',
    'spark.dynamicAllocation.maxExecutors': '10',
}
```

### For Many Small Tables

```python
# Reduce resources
spark_conf = {
    'spark.executor.memory': '1g',
    'spark.executor.cores': '1',
    'spark.dynamicAllocation.maxExecutors': '3',
}
```

## Support

- 📘 [Full Documentation](../../docs/implementation/IMPLEMENTATION_016.md)
- 🚀 [Quick Start](../../docs/implementation/QUICKSTART_016.md)
- 🐛 [Report Issues](https://github.com/your-org/novasight/issues)

## License

Copyright © 2026 NovaSight. All rights reserved.
