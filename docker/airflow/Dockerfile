# NovaSight Airflow Dockerfile
# =============================
# Custom Airflow image with NovaSight dependencies and Spark binaries
# Updated: February 2026 - Airflow 3.1.7 (latest stable)
# Includes: Apache Spark 3.5.4 for native SparkSubmitOperator support

FROM apache/airflow:3.1.7-python3.12

USER root

# Install system dependencies including Docker CLI (fallback) and wget for Spark download
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    default-jdk \
    curl \
    wget \
    procps \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME for Spark operations
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# ============================================
# Install Apache Spark 3.5.4
# ============================================
ENV SPARK_VERSION=3.5.4
ENV HADOOP_VERSION=3
ENV SPARK_HOME=/opt/spark
ENV PATH="${SPARK_HOME}/bin:${SPARK_HOME}/sbin:${PATH}"

# Download and install Spark
RUN mkdir -p ${SPARK_HOME} && \
    wget -q "https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz" \
    -O /tmp/spark.tgz && \
    tar -xzf /tmp/spark.tgz -C ${SPARK_HOME} --strip-components=1 && \
    rm /tmp/spark.tgz && \
    chown -R airflow:root ${SPARK_HOME}

# Create directories for custom JARs and jobs
RUN mkdir -p ${SPARK_HOME}/jars/custom && \
    mkdir -p /opt/spark/jobs && \
    chown -R airflow:root /opt/spark

# Download JDBC drivers for PostgreSQL and ClickHouse
RUN wget -q "https://jdbc.postgresql.org/download/postgresql-42.7.4.jar" \
    -O ${SPARK_HOME}/jars/custom/postgresql-42.7.4.jar && \
    wget -q "https://github.com/ClickHouse/clickhouse-java/releases/download/v0.6.3/clickhouse-jdbc-0.6.3-shaded.jar" \
    -O ${SPARK_HOME}/jars/custom/clickhouse-jdbc-0.6.3.jar && \
    chown -R airflow:root ${SPARK_HOME}/jars/custom

# Add airflow user to docker group for docker exec fallback
RUN usermod -aG docker airflow || true

USER airflow

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip

# Install Python dependencies for DAGs including Spark provider
RUN pip install --no-cache-dir \
    apache-airflow-providers-apache-spark \
    apache-airflow-providers-postgres \
    apache-airflow-providers-http \
    apache-airflow-providers-smtp \
    apache-airflow-providers-slack \
    apache-airflow-providers-common-sql \
    pyspark==3.5.4 \
    clickhouse-connect \
    pandas \
    numpy \
    httpx \
    structlog \
    pendulum

# Install dbt packages separately
RUN pip install --no-cache-dir \
    dbt-core \
    dbt-postgres \
    dbt-clickhouse

# Copy custom plugins and DAGs
COPY --chown=airflow:root plugins/ /opt/airflow/plugins/
COPY --chown=airflow:root dags/ /opt/airflow/dags/

# Copy init script for creating connections
COPY --chown=airflow:root scripts/init-connections.sh /opt/airflow/scripts/init-connections.sh

# Set Airflow home
ENV AIRFLOW_HOME=/opt/airflow
