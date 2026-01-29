# ADR-005: Template Catalog

## Status

✅ **Accepted**

## Summary

Define and maintain a **catalog of pre-approved templates** for all code generation in NovaSight, as required by ADR-002 (Template-Filling Architecture).

## Context

Per ADR-002, all executable artifacts must be generated from pre-approved templates. This ADR catalogs the complete template library and defines versioning and governance policies.

## Template Categories

### 1. PySpark Ingestion Templates

| Template | Purpose |
|----------|---------|
| `spark_ingestion_base.py.j2` | Core ingestion logic |
| `spark_jdbc_reader.py.j2` | JDBC source reading |
| `spark_scd_type1.py.j2` | SCD Type 1 merge |
| `spark_scd_type2.py.j2` | SCD Type 2 merge |
| `spark_incremental.py.j2` | Watermark-based loading |
| `spark_full_load.py.j2` | Full table replacement |

### 2. Airflow DAG Templates

| Template | Purpose |
|----------|---------|
| `dag_base.py.j2` | DAG structure and config |
| `task_spark_submit.py.j2` | Spark job submission |
| `task_dbt_run.py.j2` | dbt execution |
| `task_dbt_test.py.j2` | dbt testing |
| `task_email.py.j2` | Email notification |
| `task_http_sensor.py.j2` | HTTP sensor |
| `task_sql_query.py.j2` | SQL execution |

### 3. dbt Model Templates

| Template | Purpose |
|----------|---------|
| `model_base.sql.j2` | Base model structure |
| `model_incremental.sql.j2` | Incremental materialization |
| `model_snapshot.sql.j2` | Snapshot logic |
| `join_clause.sql.j2` | JOIN generation |
| `cte_block.sql.j2` | CTE generation |
| `schema.yml.j2` | Schema/test definitions |
| `sources.yml.j2` | Source definitions |

### 4. SQL Query Templates

| Template | Purpose |
|----------|---------|
| `select_basic.sql.j2` | Simple SELECT |
| `select_aggregate.sql.j2` | Aggregation queries |
| `select_join.sql.j2` | JOIN queries |
| `rls_wrapper.sql.j2` | RLS injection wrapper |

## Template Example

### `spark_ingestion_base.py.j2`

```python
"""
PySpark Ingestion Job: {{ job_name }}
Generated: {{ generated_at }}
Template Version: 1.0.0
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import lit, current_timestamp

def main():
    spark = SparkSession.builder \
        .appName("{{ tenant_id }}_{{ job_name }}") \
        .getOrCreate()
    
    df = spark.read \
        .format("jdbc") \
        .option("url", "{{ source_jdbc_url }}") \
        .option("dbtable", "{{ source_table }}") \
        .load()
    
    df = df.select(
        {% for col in columns %}
        df["{{ col.source }}"].alias("{{ col.target }}"){{ "," if not loop.last }}
        {% endfor %}
    )
    
    df = df.withColumn("_loaded_at", current_timestamp())
    
    df.write \
        .format("clickhouse") \
        .option("table", "{{ target_table }}") \
        .mode("{{ write_mode }}") \
        .save()
    
    spark.stop()

if __name__ == "__main__":
    main()
```

## Template Versioning

Each template includes:
- **Version number**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Generated timestamp**: When the artifact was created
- **Template ID**: Reference for audit purposes

```python
"""
Template: spark_ingestion_base.py.j2
Version: 1.2.0
Generated: 2026-01-15T10:30:00Z
Job ID: {{ job_id }}
"""
```

## Template Governance

### Change Process

1. **Proposal**: Create RFC for template change
2. **Security Review**: Security team reviews changes
3. **Testing**: Run against test suite
4. **Approval**: Architecture team approves
5. **Deployment**: Version bump and release
6. **Migration**: Regenerate affected artifacts

### Backward Compatibility

- **PATCH**: Bug fixes, no parameter changes
- **MINOR**: New optional parameters
- **MAJOR**: Breaking changes, requires regeneration

## Consequences

### Positive
- Complete inventory of all code generation
- Versioned and auditable templates
- Clear governance process

### Negative
- Overhead for template changes
- Limited flexibility for edge cases

### Mitigations
- Comprehensive template library
- Fast-track process for critical fixes
- Enterprise custom template tier

---

*Full details: [Architecture Decisions](../../requirements/Architecture_Decisions.md#adr-005-template-catalog)*
