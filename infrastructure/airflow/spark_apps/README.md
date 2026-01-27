# Spark Apps for Data Ingestion

This directory contains PySpark applications for data ingestion workflows.

## Structure

```
spark_apps/
├── ingestion/
│   └── ingest_to_clickhouse.py  # Main ingestion PySpark app
└── configs/
    └── *.json                    # Auto-generated config files per datasource
```

## Ingestion Application

The `ingest_to_clickhouse.py` application handles:

- **JDBC Reading**: Reads from PostgreSQL, MySQL, Oracle, SQL Server
- **ClickHouse Writing**: Writes to ClickHouse via JDBC
- **Incremental Mode**: Tracks watermarks for incremental ingestion
- **Full Refresh**: Complete table reload
- **Metadata**: Adds `_tenant_id`, `_datasource_id`, `_ingested_at` columns

## Configuration Format

Each datasource gets a JSON config file:

```json
{
  "tenant_id": "uuid",
  "datasource_id": "uuid",
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
    "database": "tenant_uuid"
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

## Usage

The application is invoked by Airflow's `SparkSubmitOperator`:

```python
SparkSubmitOperator(
    application='/opt/airflow/spark_apps/ingestion/ingest_to_clickhouse.py',
    application_args=['/opt/airflow/spark_apps/configs/ingest_{tenant}_{id}_config.json'],
    conn_id='spark_default',
    ...
)
```

## JDBC Drivers

Required JAR files in `/opt/spark/jars/`:

- `postgresql-42.6.0.jar` - PostgreSQL
- `mysql-connector-j-8.2.0.jar` - MySQL
- `ojdbc8.jar` - Oracle
- `mssql-jdbc-12.4.2.jre11.jar` - SQL Server
- `clickhouse-jdbc-0.4.6-all.jar` - ClickHouse

## Development

To test locally:

```bash
spark-submit \
  --master local[*] \
  --jars /opt/spark/jars/postgresql-42.6.0.jar,/opt/spark/jars/clickhouse-jdbc-0.4.6-all.jar \
  ingestion/ingest_to_clickhouse.py \
  configs/test_config.json
```
