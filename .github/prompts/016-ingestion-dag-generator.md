# 016 - Ingestion DAG Generator

## Metadata

```yaml
prompt_id: "016"
phase: 2
agent: "@orchestration"
model: "sonnet 4.5"
priority: P0
estimated_effort: "3 days"
dependencies: ["011", "013"]
```

## Objective

Implement automated Airflow DAG generation for data ingestion workflows using PySpark on Spark cluster.

## Task Description

Create a service that generates Airflow DAGs that submit PySpark jobs to a Spark cluster for data ingestion from various sources to ClickHouse.

## Requirements

### DAG Generator Service

```python
# backend/app/services/dag_generator.py
from typing import Dict, List, Any
from pathlib import Path
from app.services.template_engine import TemplateEngine
from app.models import DataSource, DataSourceTable
from app.utils.airflow_client import AirflowClient

class DAGGenerator:
    """Generates Airflow DAGs for data ingestion using PySpark."""
    
    def __init__(self, template_engine: TemplateEngine, airflow_client: AirflowClient):
        self.template_engine = template_engine
        self.airflow_client = airflow_client
        self.dags_path = Path('/opt/airflow/dags')
        self.spark_apps_path = Path('/opt/airflow/spark_apps')
    
    def generate_ingestion_dag(
        self,
        datasource: DataSource,
        tables: List[DataSourceTable],
        schedule: str = '@hourly'
    ) -> str:
        """Generate ingestion DAG that submits PySpark jobs to Spark cluster."""
        
        # Prepare table configurations
        table_configs = [
            {
                'source_table': t.source_name,
                'target_table': t.target_name,
                'incremental_column': t.incremental_column or 'updated_at',
                'mode': 'incremental' if t.incremental_column else 'full',
                'primary_keys': t.primary_keys or [],
            }
            for t in tables
        ]
        
        # Generate PySpark application config
        spark_config = {
            'tenant_id': str(datasource.tenant_id),
            'datasource_id': str(datasource.id),
            'datasource_type': datasource.type.value,
            'connection_config': {
                'host': datasource.host,
                'port': datasource.port,
                'database': datasource.database,
                'username': datasource.username,
                'jdbc_driver': self._get_jdbc_driver(datasource.type),
            },
            'clickhouse_config': {
                'host': 'clickhouse',
                'port': 9000,
                'database': f'tenant_{datasource.tenant_id}',
            },
            'tables': table_configs,
        }
        
        # Render DAG from template
        dag_content = self.template_engine.render(
            'airflow/spark_ingestion_dag.py.j2',
            {
                'tenant_id': str(datasource.tenant_id),
                'datasource_id': str(datasource.id),
                'datasource_name': datasource.name,
                'datasource_type': datasource.type.value,
                'dag_id': f'ingest_{datasource.tenant_id}_{datasource.id}',
                'schedule': schedule,
                'spark_app_path': '/opt/airflow/spark_apps/ingestion/ingest_to_clickhouse.py',
                'spark_config': spark_config,
                'num_tables': len(tables),
                'spark_conf': {
                    'spark.executor.memory': '2g',
                    'spark.executor.cores': '2',
                    'spark.dynamicAllocation.enabled': 'true',
                    'spark.dynamicAllocation.minExecutors': '1',
                    'spark.dynamicAllocation.maxExecutors': '5',
                },
            }
        )
        
        # Write DAG file
        dag_id = f'ingest_{datasource.tenant_id}_{datasource.id}'
        dag_file = self.dags_path / f'{dag_id}.py'
        dag_file.write_text(dag_content)
        
        # Write PySpark config file for this datasource
        config_file = self.spark_apps_path / 'configs' / f'{dag_id}_config.json'
        config_file.parent.mkdir(parents=True, exist_ok=True)
        import json
        config_file.write_text(json.dumps(spark_config, indent=2))
        
        # Trigger DAG parsing
        self.airflow_client.trigger_dag_parse()
        
        return dag_id
    
    def _get_jdbc_driver(self, db_type: str) -> str:
        """Get JDBC driver class for database type."""
        drivers = {
            'postgresql': 'org.postgresql.Driver',
            'mysql': 'com.mysql.cj.jdbc.Driver',
            'oracle': 'oracle.jdbc.OracleDriver',
            'sqlserver': 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
        }
        return drivers.get(db_type, 'org.postgresql.Driver')
    
    def update_ingestion_dag(
        self,
        datasource: DataSource,
        tables: List[DataSourceTable],
        schedule: str = None
    ) -> str:
        """Update existing ingestion DAG."""
        # Delete old DAG
        dag_id = f'ingest_{datasource.tenant_id}_{datasource.id}'
        self.delete_dag(dag_id)
        
        # Generate new DAG
        return self.generate_ingestion_dag(
            datasource, 
            tables, 
            schedule or datasource.sync_frequency
        )
    
    def delete_dag(self, dag_id: str) -> None:
        """Delete a DAG file and its config."""
        dag_file = self.dags_path / f'{dag_id}.py'
        if dag_file.exists():
            dag_file.unlink()
        
        # Delete config file
        config_file = self.spark_apps_path / 'configs' / f'{dag_id}_config.json'
        if config_file.exists():
            config_file.unlink()
        
        # Pause and delete from Airflow
        self.airflow_client.pause_dag(dag_id)
        self.airflow_client.delete_dag(dag_id)
```

### PySpark Ingestion Application

```python
# infrastructure/airflow/spark_apps/ingestion/ingest_to_clickhouse.py
"""
PySpark application for ingesting data from various sources to ClickHouse.
"""
import sys
import json
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, lit
from clickhouse_driver import Client as ClickHouseClient


class DataIngestionJob:
    """PySpark job for data ingestion."""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.spark = self._create_spark_session()
        self.ch_client = ClickHouseClient(
            host=self.config['clickhouse_config']['host'],
            port=self.config['clickhouse_config']['port'],
            database=self.config['clickhouse_config']['database']
        )
    
    def _load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file."""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def _create_spark_session(self) -> SparkSession:
        """Create Spark session with necessary configurations."""
        builder = SparkSession.builder \
            .appName(f"Ingestion-{self.config['datasource_id']}")
        
        # Add JDBC driver based on source type
        jdbc_jars = {
            'postgresql': '/opt/spark/jars/postgresql-42.6.0.jar',
            'mysql': '/opt/spark/jars/mysql-connector-j-8.2.0.jar',
            'oracle': '/opt/spark/jars/ojdbc8.jar',
            'sqlserver': '/opt/spark/jars/mssql-jdbc-12.4.2.jre11.jar',
        }
        
        db_type = self.config['datasource_type']
        if db_type in jdbc_jars:
            builder = builder.config('spark.jars', jdbc_jars[db_type])
        
        # Add ClickHouse JDBC driver
        builder = builder.config(
            'spark.jars',
            '/opt/spark/jars/clickhouse-jdbc-0.4.6-all.jar'
        )
        
        return builder.getOrCreate()
    
    def _get_jdbc_url(self) -> str:
        """Build JDBC URL for source database."""
        conn = self.config['connection_config']
        db_type = self.config['datasource_type']
        
        urls = {
            'postgresql': f"jdbc:postgresql://{conn['host']}:{conn['port']}/{conn['database']}",
            'mysql': f"jdbc:mysql://{conn['host']}:{conn['port']}/{conn['database']}",
            'oracle': f"jdbc:oracle:thin:@{conn['host']}:{conn['port']}:{conn['database']}",
            'sqlserver': f"jdbc:sqlserver://{conn['host']}:{conn['port']};databaseName={conn['database']}",
        }
        
        return urls.get(db_type, urls['postgresql'])
    
    def _get_last_ingested_value(self, table_name: str, column: str):
        """Get last ingested value from ClickHouse."""
        query = f"""
            SELECT max({column}) as max_value
            FROM {table_name}
            WHERE _tenant_id = '{self.config['tenant_id']}'
        """
        try:
            result = self.ch_client.execute(query)
            return result[0][0] if result and result[0][0] else None
        except:
            return None
    
    def ingest_table(self, table_config: dict) -> dict:
        """Ingest a single table."""
        source_table = table_config['source_table']
        target_table = table_config['target_table']
        mode = table_config['mode']
        incremental_column = table_config.get('incremental_column')
        
        print(f"Ingesting {source_table} -> {target_table} (mode: {mode})")
        
        # Build source query
        if mode == 'incremental' and incremental_column:
            last_value = self._get_last_ingested_value(target_table, incremental_column)
            
            if last_value:
                query = f"""
                    (SELECT * FROM {source_table} 
                     WHERE {incremental_column} > '{last_value}'
                     ORDER BY {incremental_column}) as incremental_data
                """
            else:
                query = f"(SELECT * FROM {source_table}) as full_data"
        else:
            query = f"(SELECT * FROM {source_table}) as full_data"
        
        # Read from source using JDBC
        conn = self.config['connection_config']
        df = self.spark.read \
            .format('jdbc') \
            .option('url', self._get_jdbc_url()) \
            .option('dbtable', query) \
            .option('user', conn['username']) \
            .option('password', conn.get('password', '')) \
            .option('driver', conn['jdbc_driver']) \
            .option('fetchsize', '10000') \
            .load()
        
        # Add metadata columns
        df = df \
            .withColumn('_tenant_id', lit(self.config['tenant_id'])) \
            .withColumn('_datasource_id', lit(self.config['datasource_id'])) \
            .withColumn('_ingested_at', current_timestamp())
        
        row_count = df.count()
        print(f"Read {row_count} rows from {source_table}")
        
        if row_count == 0:
            print(f"No new data to ingest for {source_table}")
            return {'table': source_table, 'rows': 0, 'status': 'success'}
        
        # Write to ClickHouse
        ch_config = self.config['clickhouse_config']
        clickhouse_url = f"jdbc:clickhouse://{ch_config['host']}:{ch_config['port']}/{ch_config['database']}"
        
        # For incremental mode, we append; for full mode, we can overwrite
        save_mode = 'append' if mode == 'incremental' else 'overwrite'
        
        df.write \
            .format('jdbc') \
            .option('url', clickhouse_url) \
            .option('dbtable', target_table) \
            .option('driver', 'com.clickhouse.jdbc.ClickHouseDriver') \
            .option('batchsize', '10000') \
            .option('isolationLevel', 'NONE') \
            .mode(save_mode) \
            .save()
        
        print(f"Wrote {row_count} rows to ClickHouse table {target_table}")
        
        return {
            'table': source_table,
            'rows': row_count,
            'status': 'success',
            'mode': mode
        }
    
    def run(self) -> dict:
        """Execute ingestion for all configured tables."""
        results = []
        
        for table_config in self.config['tables']:
            try:
                result = self.ingest_table(table_config)
                results.append(result)
            except Exception as e:
                print(f"Error ingesting {table_config['source_table']}: {str(e)}")
                results.append({
                    'table': table_config['source_table'],
                    'rows': 0,
                    'status': 'failed',
                    'error': str(e)
                })
        
        # Summary
        total_rows = sum(r['rows'] for r in results)
        failed = sum(1 for r in results if r['status'] == 'failed')
        
        summary = {
            'total_tables': len(results),
            'successful': len(results) - failed,
            'failed': failed,
            'total_rows': total_rows,
            'results': results
        }
        
        print(f"\n=== Ingestion Summary ===")
        print(f"Total tables: {summary['total_tables']}")
        print(f"Successful: {summary['successful']}")
        print(f"Failed: {summary['failed']}")
        print(f"Total rows ingested: {summary['total_rows']}")
        
        return summary


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: ingest_to_clickhouse.py <config_path>")
        sys.exit(1)
    
    config_path = sys.argv[1]
    job = DataIngestionJob(config_path)
    result = job.run()
    
    # Exit with error code if any table failed
    sys.exit(0 if result['failed'] == 0 else 1)
```

### Airflow DAG Template

```jinja2
{# backend/templates/airflow/spark_ingestion_dag.py.j2 #}
"""
Auto-generated Airflow DAG for ingesting data from {{ datasource_name }}
Generated for tenant: {{ tenant_id }}
Datasource ID: {{ datasource_id }}
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

# Default arguments for the DAG
default_args = {
    'owner': 'novasight',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

# DAG definition
with DAG(
    dag_id='{{ dag_id }}',
    default_args=default_args,
    description='Ingest data from {{ datasource_name }} ({{ datasource_type }}) to ClickHouse',
    schedule_interval='{{ schedule }}',
    catchup=False,
    max_active_runs=1,
    tags=['ingestion', '{{ datasource_type }}', 'tenant_{{ tenant_id }}'],
) as dag:
    
    # Task to submit PySpark job to Spark cluster
    ingest_data = SparkSubmitOperator(
        task_id='ingest_{{ datasource_type }}_data',
        application='{{ spark_app_path }}',
        name='ingest_{{ datasource_id }}',
        conn_id='spark_default',  # Airflow connection to Spark cluster
        application_args=[
            '/opt/airflow/spark_apps/configs/{{ dag_id }}_config.json'
        ],
        conf={
            {% for key, value in spark_conf.items() %}
            '{{ key }}': '{{ value }}',
            {% endfor %}
        },
        jars='/opt/spark/jars/postgresql-42.6.0.jar,/opt/spark/jars/clickhouse-jdbc-0.4.6-all.jar',
        driver_memory='1g',
        executor_memory='{{ spark_conf.get("spark.executor.memory", "2g") }}',
        executor_cores={{ spark_conf.get("spark.executor.cores", "2") }},
        num_executors=None,  # Dynamic allocation enabled
        verbose=True,
    )
    
    def log_completion(**context):
        """Log completion of ingestion."""
        print(f"Ingestion completed for {{ datasource_name }}")
        print(f"Processed {{ num_tables }} tables")
    
    log_task = PythonOperator(
        task_id='log_completion',
        python_callable=log_completion,
        provide_context=True,
    )
    
    # Task dependencies
    ingest_data >> log_task
```

### Airflow Client

```python
# backend/app/utils/airflow_client.py
import requests
from typing import Optional, Dict, Any

class AirflowClient:
    """Client for Airflow REST API."""
    
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.auth = (username, password)
    
    def trigger_dag(self, dag_id: str, conf: Dict[str, Any] = None) -> str:
        """Trigger a DAG run."""
        response = requests.post(
            f'{self.base_url}/api/v1/dags/{dag_id}/dagRuns',
            json={'conf': conf or {}},
            auth=self.auth
        )
        response.raise_for_status()
        return response.json()['dag_run_id']
    
    def get_dag_run_status(self, dag_id: str, run_id: str) -> str:
        """Get status of a DAG run."""
        response = requests.get(
            f'{self.base_url}/api/v1/dags/{dag_id}/dagRuns/{run_id}',
            auth=self.auth
        )
        response.raise_for_status()
        return response.json()['state']
    
    def pause_dag(self, dag_id: str) -> None:
        """Pause a DAG."""
        requests.patch(
            f'{self.base_url}/api/v1/dags/{dag_id}',
            json={'is_paused': True},
            auth=self.auth
        )
    
    def delete_dag(self, dag_id: str) -> None:
        """Delete a DAG."""
        requests.delete(
            f'{self.base_url}/api/v1/dags/{dag_id}',
            auth=self.auth
        )
```

## Expected Output

```
backend/app/
├── services/
│   └── dag_generator.py          # Generates Spark-based DAGs
├── templates/
│   └── airflow/
│       └── spark_ingestion_dag.py.j2
└── utils/
    └── airflow_client.py

infrastructure/airflow/
├── dags/                          # Generated DAG files
│   └── ingest_{tenant}_{id}.py
└── spark_apps/
    ├── ingestion/
    │   └── ingest_to_clickhouse.py   # PySpark ingestion app
    └── configs/
        └── ingest_{tenant}_{id}_config.json

infrastructure/spark/
└── jars/                          # JDBC drivers
    ├── postgresql-42.6.0.jar
    ├── mysql-connector-j-8.2.0.jar
    ├── clickhouse-jdbc-0.4.6-all.jar
    └── ojdbc8.jar
```

## Acceptance Criteria

- [ ] DAG generation creates Spark-based DAGs
- [ ] Generated DAGs pass Airflow syntax check
- [ ] PySpark app reads from source databases via JDBC
- [ ] PySpark app writes to ClickHouse via JDBC
- [ ] Incremental ingestion works with watermark tracking
- [ ] Full refresh mode works
- [ ] DAGs submit to Spark cluster successfully
- [ ] DAGs appear in Airflow UI
- [ ] Spark job logs are accessible
- [ ] Multiple tables processed in single Spark job
- [ ] Dynamic executor allocation works

## Reference Documents

- [Airflow Templates](./011-airflow-templates.md)
- [Airflow DAGs Skill](../skills/airflow-dags/SKILL.md)
