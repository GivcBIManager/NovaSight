"""
Unit tests for DAG Generator Service
=====================================

Tests for Spark-based ingestion DAG generation.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch, mock_open
from app.services.dag_generator import DagGenerator
from app.models.connection import DataSource, DataSourceTable
from app.services.airflow_client import AirflowClient


@pytest.fixture
def mock_airflow_client():
    """Mock Airflow client."""
    client = Mock(spec=AirflowClient)
    client.trigger_dag_parse = Mock()
    client.pause_dag = Mock()
    client.delete_dag = Mock()
    return client


@pytest.fixture
def dag_generator(mock_airflow_client):
    """Create DAG generator with mocked client."""
    with patch('app.services.dag_generator.Path.mkdir'):
        generator = DagGenerator(
            tenant_id="test-tenant-123",
            airflow_client=mock_airflow_client
        )
        return generator


@pytest.fixture
def sample_datasource():
    """Sample PostgreSQL datasource."""
    return DataSource(
        id="datasource-456",
        tenant_id="test-tenant-123",
        name="Test PostgreSQL DB",
        type="postgresql",
        host="localhost",
        port=5432,
        database="testdb",
        username="testuser",
        sync_frequency="@hourly"
    )


@pytest.fixture
def sample_tables():
    """Sample tables configuration."""
    return [
        DataSourceTable(
            source_name="public.users",
            target_name="users",
            incremental_column="updated_at",
            primary_keys=["id"]
        ),
        DataSourceTable(
            source_name="public.orders",
            target_name="orders",
            incremental_column=None,
            primary_keys=["order_id"]
        ),
    ]


class TestDagGenerator:
    """Test DAG Generator."""
    
    def test_get_jdbc_driver_postgresql(self, dag_generator):
        """Test JDBC driver for PostgreSQL."""
        driver = dag_generator._get_jdbc_driver("postgresql")
        assert driver == "org.postgresql.Driver"
    
    def test_get_jdbc_driver_mysql(self, dag_generator):
        """Test JDBC driver for MySQL."""
        driver = dag_generator._get_jdbc_driver("mysql")
        assert driver == "com.mysql.cj.jdbc.Driver"
    
    def test_get_jdbc_driver_oracle(self, dag_generator):
        """Test JDBC driver for Oracle."""
        driver = dag_generator._get_jdbc_driver("oracle")
        assert driver == "oracle.jdbc.OracleDriver"
    
    def test_get_jdbc_driver_sqlserver(self, dag_generator):
        """Test JDBC driver for SQL Server."""
        driver = dag_generator._get_jdbc_driver("sqlserver")
        assert driver == "com.microsoft.sqlserver.jdbc.SQLServerDriver"
    
    def test_get_jdbc_driver_unknown(self, dag_generator):
        """Test JDBC driver for unknown database (defaults to PostgreSQL)."""
        driver = dag_generator._get_jdbc_driver("unknown")
        assert driver == "org.postgresql.Driver"
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_generate_ingestion_dag(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables,
        mock_airflow_client
    ):
        """Test DAG generation."""
        # Generate DAG
        dag_id = dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@hourly"
        )
        
        # Verify DAG ID format
        assert dag_id == "ingest_test-tenant-123_datasource-456"
        
        # Verify DAG file was written
        assert mock_write_text.called
        calls = mock_write_text.call_args_list
        assert len(calls) == 2  # DAG file + config file
        
        # Verify Airflow client was called
        mock_airflow_client.trigger_dag_parse.assert_called_once()
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_generate_config_file(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables
    ):
        """Test config file generation."""
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@hourly"
        )
        
        # Get config file write call
        config_call = [
            call for call in mock_write_text.call_args_list
            if 'config.json' in str(call)
        ][0]
        
        config_content = config_call[0][0]
        config = json.loads(config_content)
        
        # Verify config structure
        assert config['tenant_id'] == "test-tenant-123"
        assert config['datasource_id'] == "datasource-456"
        assert config['datasource_type'] == "postgresql"
        assert config['connection_config']['host'] == "localhost"
        assert config['connection_config']['port'] == 5432
        assert config['connection_config']['database'] == "testdb"
        assert config['connection_config']['jdbc_driver'] == "org.postgresql.Driver"
        assert config['clickhouse_config']['database'] == "tenant_test-tenant-123"
        
        # Verify tables configuration
        assert len(config['tables']) == 2
        assert config['tables'][0]['source_table'] == "public.users"
        assert config['tables'][0]['target_table'] == "users"
        assert config['tables'][0]['mode'] == "incremental"
        assert config['tables'][0]['incremental_column'] == "updated_at"
        assert config['tables'][1]['mode'] == "full"
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_generate_dag_content(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables
    ):
        """Test DAG file content generation."""
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@daily"
        )
        
        # Get DAG file write call
        dag_call = [
            call for call in mock_write_text.call_args_list
            if '.py' in str(call) and 'config.json' not in str(call)
        ][0]
        
        dag_content = dag_call[0][0]
        
        # Verify DAG content
        assert "ingest_test-tenant-123_datasource-456" in dag_content
        assert "SparkSubmitOperator" in dag_content
        assert "@daily" in dag_content
        assert "Test PostgreSQL DB" in dag_content
        assert "spark_default" in dag_content
        assert "ingest_to_clickhouse.py" in dag_content
    
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.exists', return_value=True)
    def test_delete_dag(
        self,
        mock_exists,
        mock_unlink,
        dag_generator,
        mock_airflow_client
    ):
        """Test DAG deletion."""
        dag_id = "ingest_test-tenant-123_datasource-456"
        
        dag_generator.delete_dag(dag_id)
        
        # Verify files were deleted
        assert mock_unlink.call_count == 2  # DAG file + config file
        
        # Verify Airflow operations
        mock_airflow_client.pause_dag.assert_called_once_with(dag_id)
        mock_airflow_client.delete_dag.assert_called_once_with(dag_id)
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.exists', return_value=True)
    def test_update_ingestion_dag(
        self,
        mock_exists,
        mock_unlink,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables,
        mock_airflow_client
    ):
        """Test DAG update."""
        dag_id = dag_generator.update_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@daily"
        )
        
        # Verify old DAG was deleted
        assert mock_unlink.call_count == 2
        mock_airflow_client.pause_dag.assert_called_once()
        mock_airflow_client.delete_dag.assert_called_once()
        
        # Verify new DAG was created
        assert mock_write_text.call_count == 2
        assert dag_id == "ingest_test-tenant-123_datasource-456"
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_generate_with_custom_schedule(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables
    ):
        """Test DAG generation with custom cron schedule."""
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="0 */6 * * *"  # Every 6 hours
        )
        
        # Get DAG content
        dag_call = [
            call for call in mock_write_text.call_args_list
            if '.py' in str(call) and 'config.json' not in str(call)
        ][0]
        dag_content = dag_call[0][0]
        
        assert "0 */6 * * *" in dag_content
    
    def test_generate_with_mysql_datasource(self, dag_generator, sample_tables, mock_airflow_client):
        """Test DAG generation for MySQL datasource."""
        mysql_datasource = DataSource(
            id="mysql-123",
            tenant_id="test-tenant-123",
            name="MySQL DB",
            type="mysql",
            host="mysql.example.com",
            port=3306,
            database="mydb",
            username="mysql_user"
        )
        
        with patch('pathlib.Path.write_text'), patch('pathlib.Path.mkdir'):
            dag_generator.generate_ingestion_dag(
                datasource=mysql_datasource,
                tables=sample_tables,
                schedule="@hourly"
            )
        
        # Verify JDBC driver was correctly identified
        driver = dag_generator._get_jdbc_driver("mysql")
        assert driver == "com.mysql.cj.jdbc.Driver"
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_spark_config_generation(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables
    ):
        """Test Spark configuration in generated DAG."""
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@hourly"
        )
        
        # Get DAG content
        dag_call = [
            call for call in mock_write_text.call_args_list
            if '.py' in str(call) and 'config.json' not in str(call)
        ][0]
        dag_content = dag_call[0][0]
        
        # Verify Spark configurations
        assert "spark.executor.memory" in dag_content
        assert "spark.executor.cores" in dag_content
        assert "spark.dynamicAllocation.enabled" in dag_content
        assert "spark.dynamicAllocation.minExecutors" in dag_content
        assert "spark.dynamicAllocation.maxExecutors" in dag_content
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_airflow_parse_failure_handling(
        self,
        mock_mkdir,
        mock_write_text,
        dag_generator,
        sample_datasource,
        sample_tables,
        mock_airflow_client
    ):
        """Test graceful handling of Airflow parse trigger failure."""
        # Make trigger_dag_parse raise an exception
        mock_airflow_client.trigger_dag_parse.side_effect = Exception("Airflow API error")
        
        # Should not raise, just log warning
        dag_id = dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=sample_tables,
            schedule="@hourly"
        )
        
        assert dag_id == "ingest_test-tenant-123_datasource-456"


class TestTableConfiguration:
    """Test table configuration logic."""
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_incremental_table_config(self, mock_mkdir, mock_write_text, dag_generator, sample_datasource):
        """Test incremental table configuration."""
        tables = [
            DataSourceTable(
                source_name="public.events",
                target_name="events",
                incremental_column="event_time",
                primary_keys=["event_id"]
            )
        ]
        
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=tables,
            schedule="@hourly"
        )
        
        # Get config
        config_call = [
            call for call in mock_write_text.call_args_list
            if 'config.json' in str(call)
        ][0]
        config = json.loads(config_call[0][0])
        
        table_config = config['tables'][0]
        assert table_config['mode'] == 'incremental'
        assert table_config['incremental_column'] == 'event_time'
    
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.mkdir')
    def test_full_refresh_table_config(self, mock_mkdir, mock_write_text, dag_generator, sample_datasource):
        """Test full refresh table configuration."""
        tables = [
            DataSourceTable(
                source_name="public.static_data",
                target_name="static_data",
                incremental_column=None,  # No incremental column
                primary_keys=["id"]
            )
        ]
        
        dag_generator.generate_ingestion_dag(
            datasource=sample_datasource,
            tables=tables,
            schedule="@daily"
        )
        
        # Get config
        config_call = [
            call for call in mock_write_text.call_args_list
            if 'config.json' in str(call)
        ][0]
        config = json.loads(config_call[0][0])
        
        table_config = config['tables'][0]
        assert table_config['mode'] == 'full'
