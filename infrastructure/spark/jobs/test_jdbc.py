"""
Simple JDBC Test Job for PySpark
Tests connectivity to PostgreSQL and ClickHouse
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import lit, current_timestamp
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_jdbc")

def main():
    logger.info("Creating Spark Session...")
    
    spark = SparkSession.builder \
        .appName("JDBC Test") \
        .config("spark.jars", "/opt/spark/jars/custom/postgresql-42.7.4.jar,/opt/spark/jars/custom/clickhouse-jdbc-0.6.3.jar") \
        .getOrCreate()
    
    logger.info(f"Spark Version: {spark.version}")
    
    # Test PostgreSQL connectivity
    logger.info("=" * 50)
    logger.info("Testing PostgreSQL Connection...")
    logger.info("=" * 50)
    
    try:
        pg_url = os.getenv("SOURCE_DB_URL", "jdbc:postgresql://postgres:5432/postgres")
        pg_user = os.getenv("SOURCE_DB_USER", "novasight")
        pg_password = os.getenv("SOURCE_DB_PASSWORD", "novasight")
        
        logger.info(f"Connecting to: {pg_url}")
        
        pg_df = spark.read.jdbc(
            url=pg_url,
            table="public.staff_records",
            properties={
                "user": pg_user,
                "password": pg_password,
                "driver": "org.postgresql.Driver"
            }
        )
        
        logger.info("PostgreSQL Connection: SUCCESS")
        logger.info(f"Row count: {pg_df.count()}")
        pg_df.show()
        
    except Exception as e:
        logger.error(f"PostgreSQL Connection: FAILED - {e}")
    
    # Test ClickHouse connectivity
    logger.info("=" * 50)
    logger.info("Testing ClickHouse Connection...")
    logger.info("=" * 50)
    
    try:
        ch_url = os.getenv("CLICKHOUSE_URL", "jdbc:clickhouse://clickhouse:8123")
        ch_user = os.getenv("CLICKHOUSE_USER", "default")
        ch_password = os.getenv("CLICKHOUSE_PASSWORD", "")
        
        logger.info(f"Connecting to: {ch_url}")
        
        # First create test table
        ch_df = spark.createDataFrame([
            (1, "Test Record 1"),
            (2, "Test Record 2")
        ], ["id", "name"])
        
        ch_df = ch_df.withColumn("created_at", current_timestamp())
        
        # Read existing databases to verify connection
        databases_df = spark.read.jdbc(
            url=ch_url,
            table="(SELECT name FROM system.databases) AS dbs",
            properties={
                "user": ch_user,
                "password": ch_password,
                "driver": "com.clickhouse.jdbc.ClickHouseDriver"
            }
        )
        
        logger.info("ClickHouse Connection: SUCCESS")
        logger.info("Available databases:")
        databases_df.show()
        
    except Exception as e:
        logger.error(f"ClickHouse Connection: FAILED - {e}")
    
    logger.info("=" * 50)
    logger.info("JDBC Test Complete!")
    logger.info("=" * 50)
    
    spark.stop()

if __name__ == "__main__":
    main()
