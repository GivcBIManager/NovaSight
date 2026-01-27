# Quick Start: Ingestion DAG Generator

## Setup

### 1. Install JDBC Drivers

Download required JAR files to `infrastructure/spark/jars/`:

```bash
cd infrastructure/spark/jars

# PostgreSQL
wget https://jdbc.postgresql.org/download/postgresql-42.6.0.jar

# ClickHouse
wget https://repo1.maven.org/maven2/com/clickhouse/clickhouse-jdbc/0.4.6/clickhouse-jdbc-0.4.6-all.jar

# MySQL (optional)
wget https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar
```

### 2. Configure Airflow Connection

```bash
# Add Spark cluster connection
airflow connections add spark_default \
  --conn-type spark \
  --conn-host spark://spark-master:7077
```

### 3. Set Environment Variables

```bash
# .env or docker-compose.yml
AIRFLOW_BASE_URL=http://airflow-webserver:8080
AIRFLOW_USERNAME=airflow
AIRFLOW_PASSWORD=airflow
```

## Generate Ingestion DAG

### Python API

```python
from app.services.dag_generator import DagGenerator
from app.models.connection import DataSource, DataSourceTable

# Initialize generator
generator = DagGenerator(tenant_id="your-tenant-uuid")

# Create datasource tables list
tables = [
    DataSourceTable(
        source_name="public.users",
        target_name="users",
        incremental_column="updated_at",  # For incremental mode
        primary_keys=["id"]
    ),
    DataSourceTable(
        source_name="public.orders",
        target_name="orders",
        incremental_column=None,  # Full refresh mode
        primary_keys=["order_id"]
    ),
]

# Generate DAG
dag_id = generator.generate_ingestion_dag(
    datasource=my_datasource,
    tables=tables,
    schedule="@hourly"  # Or "@daily", "0 */6 * * *", etc.
)

print(f"Generated: {dag_id}")
```

### REST API

```bash
# Create datasource (automatically generates DAG)
curl -X POST http://localhost:8000/api/v1/datasources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production DB",
    "type": "postgresql",
    "host": "prod-db.example.com",
    "port": 5432,
    "database": "myapp",
    "username": "readonly_user",
    "password": "secret",
    "sync_frequency": "@hourly",
    "selected_tables": [
      {
        "source_name": "public.users",
        "target_name": "users",
        "incremental_column": "updated_at"
      }
    ]
  }'
```

## Test Locally

### 1. Create Test Config

```json
{
  "tenant_id": "test-tenant",
  "datasource_id": "test-datasource",
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
    "database": "tenant_test"
  },
  "tables": [
    {
      "source_table": "public.test_table",
      "target_table": "test_table",
      "incremental_column": "updated_at",
      "mode": "incremental",
      "primary_keys": ["id"]
    }
  ]
}
```

Save as `test_config.json`

### 2. Run PySpark App

```bash
spark-submit \
  --master local[*] \
  --jars infrastructure/spark/jars/postgresql-42.6.0.jar,infrastructure/spark/jars/clickhouse-jdbc-0.4.6-all.jar \
  infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py \
  test_config.json
```

### 3. Check Output

```
Ingesting public.test_table -> test_table (mode: incremental)
Read 1234 rows from public.test_table
Wrote 1234 rows to ClickHouse table test_table

=== Ingestion Summary ===
Total tables: 1
Successful: 1
Failed: 0
Total rows ingested: 1234
```

## Verify in Airflow

1. Open Airflow UI: `http://localhost:8080`
2. Find DAG: `ingest_{tenant_id}_{datasource_id}`
3. Unpause the DAG (toggle switch)
4. Trigger manual run (play button)
5. View logs: Click on task → View Logs
6. Check Spark logs for job execution details

## Verify Data in ClickHouse

```sql
-- Connect to ClickHouse
clickhouse-client --host localhost --port 9000

-- Check ingested data
SELECT 
    _tenant_id,
    _datasource_id,
    _ingested_at,
    count(*) as row_count
FROM tenant_test.users
GROUP BY _tenant_id, _datasource_id, _ingested_at
ORDER BY _ingested_at DESC;
```

## Troubleshooting

### DAG not appearing in Airflow

```bash
# Check DAG file exists
ls -la /opt/airflow/dags/ingest_*

# Check Airflow logs
docker logs airflow-scheduler

# Manually trigger DAG parse
docker exec -it airflow-scheduler airflow dags list-import-errors
```

### Spark job fails

```bash
# Check Spark logs in Airflow task logs
# Look for:
# - JDBC connection errors
# - JAR file not found
# - Configuration errors

# Common fixes:
# 1. Verify JDBC JARs are in /opt/spark/jars/
# 2. Check database credentials
# 3. Verify network connectivity (source DB → Spark, Spark → ClickHouse)
```

### No data ingested

```bash
# Check incremental watermark
SELECT max(updated_at) FROM clickhouse_table;

# Force full refresh (update mode to 'full' in config)
# Or delete existing data and re-run
```

## Schedule Patterns

```python
# Every hour
schedule = "@hourly"

# Every day at 2 AM
schedule = "0 2 * * *"

# Every 6 hours
schedule = "0 */6 * * *"

# Weekly on Monday at 3 AM
schedule = "0 3 * * 1"

# Manual only (no automatic runs)
schedule = None
```

## Next Steps

1. Add more tables to datasource
2. Configure incremental columns for better performance
3. Monitor Spark job execution times
4. Adjust executor resources if needed
5. Set up alerts for failed runs
6. Review ClickHouse data quality

---

**Need help?** Check [IMPLEMENTATION_016.md](IMPLEMENTATION_016.md) for full documentation.
