# Implementation 016: Ingestion DAG Generator

**Status**: ✅ Completed  
**Date**: January 27, 2026  
**Agent**: @orchestration  
**Priority**: P0

## Overview

Implemented automated Airflow DAG generation for data ingestion workflows using PySpark on Spark cluster. This replaces custom Airflow operators with distributed Spark jobs for better performance and scalability.

## Architecture

### Spark-Based Ingestion

```
┌─────────────────┐
│  Data Source    │ (PostgreSQL, MySQL, Oracle, SQL Server)
│  (JDBC Read)    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Spark Cluster  │ ← PySpark Application
│  (Distributed)  │   (ingest_to_clickhouse.py)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  ClickHouse     │ (JDBC Write)
│  (Analytics)    │
└─────────────────┘
```

### Components

1. **DAG Generator Service** - Generates SparkSubmitOperator-based DAGs
2. **PySpark Application** - JDBC-based data ingestion with watermark tracking
3. **Airflow DAG Template** - Jinja2 template for consistent DAG structure
4. **Configuration Files** - JSON configs per datasource

## Files Created

### Backend Services

**`backend/app/services/dag_generator.py`** (Modified)
- Added `generate_ingestion_dag()` - Creates Spark-based DAGs
- Added `update_ingestion_dag()` - Updates existing DAGs
- Added `delete_dag()` - Cleanup DAG files and configs
- Added `_get_jdbc_driver()` - Maps DB types to JDBC drivers
- Generates JSON config files for PySpark app
- Writes DAG files to `/opt/airflow/dags/`

**`backend/app/services/airflow_client.py`** (Modified)
- Added `trigger_dag_parse()` - Refreshes DAG list
- Added `delete_dag()` - Removes DAG from Airflow
- Added `close()` - Cleanup HTTP client

### Templates

**`backend/app/templates/airflow/spark_ingestion_dag.py.j2`** (New)
- Generates DAGs using `SparkSubmitOperator`
- Configures Spark cluster connection
- Sets up dynamic executor allocation
- Includes JDBC JARs (PostgreSQL, ClickHouse)
- Tags DAGs by tenant and datasource type

### PySpark Application

**`infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py`** (New)
- **DataIngestionJob** class for orchestrating ingestion
- **JDBC Reading**: Reads from multiple database types
- **JDBC Writing**: Writes to ClickHouse
- **Incremental Mode**: Watermark-based ingestion
- **Full Refresh**: Complete table reload
- **Metadata Columns**: Adds `_tenant_id`, `_datasource_id`, `_ingested_at`
- **Error Handling**: Continues on failure, returns summary

### Supporting Files

**`infrastructure/airflow/spark_apps/README.md`** (New)
- Documentation for Spark applications
- Configuration format examples
- Usage instructions
- Development setup

**`infrastructure/airflow/spark_apps/configs/.gitkeep`** (New)
- Directory for auto-generated config files
- Format: `ingest_{tenant_id}_{datasource_id}_config.json`

**`infrastructure/spark/jars/README.md`** (Modified)
- Complete guide for JDBC driver JARs
- Download links for all supported databases
- Maven coordinates
- Docker build integration
- `.gitignore` for JAR files

## Features

### 1. Multi-Database Support
- PostgreSQL via `org.postgresql.Driver`
- MySQL via `com.mysql.cj.jdbc.Driver`
- Oracle via `oracle.jdbc.OracleDriver`
- SQL Server via `com.microsoft.sqlserver.jdbc.SQLServerDriver`

### 2. Ingestion Modes

**Incremental**
- Tracks last ingested value via watermark column
- Only fetches new/updated records
- Appends to ClickHouse

**Full Refresh**
- Fetches entire table
- Overwrites ClickHouse table
- Used when no incremental column available

### 3. Spark Configuration

**Dynamic Executor Allocation**
```python
spark_conf = {
    'spark.dynamicAllocation.enabled': 'true',
    'spark.dynamicAllocation.minExecutors': '1',
    'spark.dynamicAllocation.maxExecutors': '5',
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
}
```

**JDBC Optimization**
- Fetch size: 10,000 rows
- Batch size: 10,000 rows
- Isolation level: NONE (for performance)

### 4. Metadata Enrichment

Every ingested row gets:
- `_tenant_id` - Tenant identifier
- `_datasource_id` - Source datasource ID
- `_ingested_at` - Timestamp of ingestion

### 5. Error Handling

- Continue on table failure
- Track failed vs successful tables
- Return detailed summary
- Exit code indicates overall success

## Usage Examples

### Generate Ingestion DAG

```python
from app.services.dag_generator import DagGenerator
from app.models.connection import DataSource, DataSourceTable

generator = DagGenerator(tenant_id="tenant-uuid")

# Create DAG for PostgreSQL datasource
dag_id = generator.generate_ingestion_dag(
    datasource=datasource,
    tables=[
        DataSourceTable(
            source_name="public.users",
            target_name="users",
            incremental_column="updated_at",
            primary_keys=["id"]
        ),
        DataSourceTable(
            source_name="public.orders",
            target_name="orders",
            incremental_column="created_at",
            primary_keys=["order_id"]
        ),
    ],
    schedule="@hourly"
)

print(f"Generated DAG: {dag_id}")
# Output: ingest_tenant-uuid_datasource-uuid
```

### Generated Config File

```json
{
  "tenant_id": "tenant-uuid",
  "datasource_id": "datasource-uuid",
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
    "database": "tenant_tenant-uuid"
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

### Update DAG

```python
# Update with new table list or schedule
generator.update_ingestion_dag(
    datasource=datasource,
    tables=updated_table_list,
    schedule="@daily"
)
```

### Delete DAG

```python
generator.delete_dag("ingest_tenant-uuid_datasource-uuid")
```

## Testing

### Local Spark Testing

```bash
# Run PySpark app locally
spark-submit \
  --master local[*] \
  --jars infrastructure/spark/jars/postgresql-42.6.0.jar,infrastructure/spark/jars/clickhouse-jdbc-0.4.6-all.jar \
  infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py \
  infrastructure/airflow/spark_apps/configs/test_config.json
```

### Integration Test

1. Create test datasource via API
2. Generate DAG using `dag_generator.generate_ingestion_dag()`
3. Verify DAG file exists in `/opt/airflow/dags/`
4. Verify config file exists in `/opt/airflow/spark_apps/configs/`
5. Unpause DAG in Airflow UI
6. Trigger manual run
7. Check Spark job logs
8. Verify data in ClickHouse

## Configuration

### Airflow Connection

Set up Spark connection in Airflow:

```bash
airflow connections add spark_default \
  --conn-type spark \
  --conn-host spark://spark-master:7077
```

### Environment Variables

```bash
# In backend/.env or docker-compose.yml
AIRFLOW_BASE_URL=http://airflow-webserver:8080
AIRFLOW_USERNAME=airflow
AIRFLOW_PASSWORD=airflow
```

## Performance Considerations

### Spark Resources

- **Driver Memory**: 1g (sufficient for orchestration)
- **Executor Memory**: 2g (configurable per datasource)
- **Executor Cores**: 2 (balance parallelism vs resource usage)
- **Dynamic Allocation**: 1-5 executors (scales with data volume)

### JDBC Tuning

- **Fetch Size**: 10,000 rows (balance memory vs round trips)
- **Batch Size**: 10,000 rows (ClickHouse write batching)
- **Partitioning**: Future enhancement for large tables

### Incremental Optimization

- Watermark tracking reduces data volume
- Only processes changed records
- Index on incremental column recommended

## Limitations & Future Work

### Current Limitations

1. **No Partitioning**: Large tables read in single partition
2. **Simple Watermark**: Only single column tracking
3. **No Schema Evolution**: Schema changes require manual handling
4. **Password in Config**: Credentials stored in JSON (needs encryption)

### Planned Enhancements

1. **Partition Hints**: Add `numPartitions` config for large tables
2. **Composite Watermarks**: Support multiple columns
3. **Schema Registry**: Automatic schema evolution handling
4. **Credential Encryption**: Use Airflow connections for credentials
5. **Data Quality**: Add validation rules
6. **Monitoring**: Add metrics collection (rows/sec, errors)

## Dependencies

### Python Packages (PySpark)
- `pyspark >= 3.4.0`
- `clickhouse-driver >= 0.2.6`

### JDBC Drivers
- PostgreSQL: `postgresql-42.6.0.jar`
- MySQL: `mysql-connector-j-8.2.0.jar`
- Oracle: `ojdbc8.jar`
- SQL Server: `mssql-jdbc-12.4.2.jre11.jar`
- ClickHouse: `clickhouse-jdbc-0.4.6-all.jar`

### Airflow Providers
- `apache-airflow-providers-apache-spark >= 4.1.0`

## Acceptance Criteria

- [x] DAG generation creates Spark-based DAGs
- [x] Generated DAGs use SparkSubmitOperator
- [x] PySpark app reads from source databases via JDBC
- [x] PySpark app writes to ClickHouse via JDBC
- [x] Incremental ingestion with watermark tracking implemented
- [x] Full refresh mode implemented
- [x] Config files generated per datasource
- [x] JDBC drivers documented and structure created
- [x] Metadata columns added to ingested data
- [x] Error handling and summary reporting

## Related Prompts

- **011**: Airflow Templates - Base template engine
- **013**: Data Source Connectors - Connection management
- **014**: Data Source Management API - REST API endpoints
- **015**: Data Source UI - Frontend interface

---

**Implementation Notes**:
- Replaces custom operators with distributed Spark jobs
- Better performance for large datasets (millions of rows)
- Resource isolation via Spark cluster
- Built-in fault tolerance and retry mechanisms
- Scalable with dynamic executor allocation
