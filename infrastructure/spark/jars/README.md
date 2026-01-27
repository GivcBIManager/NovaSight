# Spark JDBC Drivers

This directory contains JDBC driver JAR files for various databases.

## Required JARs

Download and place the following JAR files here:

### PostgreSQL
- **File**: `postgresql-42.6.0.jar`
- **Download**: https://jdbc.postgresql.org/download/
- **Maven**: `org.postgresql:postgresql:42.6.0`

### MySQL
- **File**: `mysql-connector-j-8.2.0.jar`
- **Download**: https://dev.mysql.com/downloads/connector/j/
- **Maven**: `com.mysql:mysql-connector-j:8.2.0`

### Oracle
- **File**: `ojdbc8.jar`
- **Download**: https://www.oracle.com/database/technologies/jdbc-ucp-downloads.html
- **Maven**: `com.oracle.database.jdbc:ojdbc8:21.9.0.0`

### SQL Server
- **File**: `mssql-jdbc-12.4.2.jre11.jar`
- **Download**: https://learn.microsoft.com/en-us/sql/connect/jdbc/download-microsoft-jdbc-driver-for-sql-server
- **Maven**: `com.microsoft.sqlserver:mssql-jdbc:12.4.2.jre11`

### ClickHouse
- **File**: `clickhouse-jdbc-0.4.6-all.jar`
- **Download**: https://github.com/ClickHouse/clickhouse-java
- **Maven**: `com.clickhouse:clickhouse-jdbc:0.4.6:all`

## Installation

### Option 1: Manual Download
1. Download each JAR from the links above
2. Place in this directory: `infrastructure/spark/jars/`

### Option 2: Maven Download
```bash
# PostgreSQL
mvn dependency:get -Dartifact=org.postgresql:postgresql:42.6.0

# MySQL
mvn dependency:get -Dartifact=com.mysql:mysql-connector-j:8.2.0

# ClickHouse
mvn dependency:get -Dartifact=com.clickhouse:clickhouse-jdbc:0.4.6:all
```

### Option 3: Docker Build
The JARs can be automatically downloaded during Docker build.
Add to `docker/airflow/Dockerfile`:

```dockerfile
RUN wget -P /opt/spark/jars \
    https://jdbc.postgresql.org/download/postgresql-42.6.0.jar \
    https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.2.0/mysql-connector-j-8.2.0.jar \
    https://repo1.maven.org/maven2/com/clickhouse/clickhouse-jdbc/0.4.6/clickhouse-jdbc-0.4.6-all.jar
```

## Usage

These JARs are automatically included by the PySpark ingestion application.
The `SparkSubmitOperator` in generated DAGs references them:

```python
SparkSubmitOperator(
    jars='/opt/spark/jars/postgresql-42.6.0.jar,/opt/spark/jars/clickhouse-jdbc-0.4.6-all.jar',
    ...
)
```

## Note

- JARs are **not** committed to Git (too large)
- Add `*.jar` to `.gitignore`
- Download as part of deployment/setup process

