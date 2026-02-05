"""
NovaSight Connection Service
============================

Data source connection management.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from app.extensions import db
from app.models.connection import DataConnection, DatabaseType, ConnectionStatus
from app.services.credential_service import CredentialService
from app.connectors import ConnectorRegistry, ConnectionConfig, ConnectorException
import logging

logger = logging.getLogger(__name__)


class ConnectionService:
    """Service for data connection management."""
    
    def __init__(self, tenant_id: str):
        """
        Initialize connection service for a specific tenant.
        
        Args:
            tenant_id: Tenant UUID
        """
        self.tenant_id = tenant_id
        self.credential_service = CredentialService(tenant_id)
    
    def list_connections(
        self,
        page: int = 1,
        per_page: int = 20,
        db_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List data connections in the tenant.
        
        Args:
            page: Page number
            per_page: Items per page
            db_type: Filter by database type
            status: Filter by status
        
        Returns:
            Paginated list of connections
        """
        query = DataConnection.query.filter(DataConnection.tenant_id == self.tenant_id)
        
        if db_type:
            try:
                db_type_enum = DatabaseType(db_type)
                query = query.filter(DataConnection.db_type == db_type_enum)
            except ValueError:
                pass
        
        if status:
            try:
                status_enum = ConnectionStatus(status)
                query = query.filter(DataConnection.status == status_enum)
            except ValueError:
                pass
        
        query = query.order_by(DataConnection.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            "items": [c.to_dict(mask_password=True) for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "pageSize": per_page,
            "totalPages": pagination.pages,
            # Keep legacy fields for backwards compatibility
            "connections": [c.to_dict(mask_password=True) for c in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            }
        }
    
    def get_connection(self, connection_id: str) -> Optional[DataConnection]:
        """
        Get connection by ID within tenant.
        
        Args:
            connection_id: Connection UUID
        
        Returns:
            DataConnection object or None
        """
        return DataConnection.query.filter(
            DataConnection.id == connection_id,
            DataConnection.tenant_id == self.tenant_id
        ).first()
    
    def create_connection(
        self,
        name: str,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: Optional[str] = None,
        extra_params: Optional[Dict[str, Any]] = None,
        created_by: str = None
    ) -> DataConnection:
        """
        Create a new data connection.
        
        Args:
            name: Connection display name
            db_type: Database type
            host: Database host
            port: Database port
            database: Database name
            username: Connection username
            password: Connection password
            ssl_mode: SSL mode
            extra_params: Additional parameters
            created_by: User ID who created the connection
        
        Returns:
            Created DataConnection object
        """
        # Check for existing connection with same name
        existing = DataConnection.query.filter(
            DataConnection.tenant_id == self.tenant_id,
            DataConnection.name == name
        ).first()
        
        if existing:
            raise ValueError(f"Connection with name '{name}' already exists")
        
        # Parse database type
        try:
            db_type_enum = DatabaseType(db_type)
        except ValueError:
            raise ValueError(f"Invalid database type: {db_type}")
        
        # Encrypt password
        encrypted_password = self.credential_service.encrypt(password)
        
        connection = DataConnection(
            tenant_id=self.tenant_id,
            name=name,
            db_type=db_type_enum,
            host=host,
            port=port,
            database=database,
            username=username,
            password_encrypted=encrypted_password,
            ssl_mode=ssl_mode,
            extra_params=extra_params or {},
            status=ConnectionStatus.ACTIVE,
            created_by=created_by,
        )
        
        db.session.add(connection)
        db.session.commit()
        
        logger.info(f"Created connection: {name} in tenant {self.tenant_id}")
        
        return connection
    
    def update_connection(
        self,
        connection_id: str,
        **kwargs
    ) -> Optional[DataConnection]:
        """
        Update connection details.
        
        Args:
            connection_id: Connection UUID
            **kwargs: Fields to update
        
        Returns:
            Updated DataConnection object or None
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return None
        
        # Handle password update separately
        if "password" in kwargs:
            password = kwargs.pop("password")
            if password:  # Only update if provided
                connection.password_encrypted = self.credential_service.encrypt(password)
        
        # Update allowed fields
        allowed_fields = [
            "name", "host", "port", "database", "schema_name",
            "username", "ssl_mode", "extra_params", "description"
        ]
        
        for field, value in kwargs.items():
            if field not in allowed_fields:
                continue
            setattr(connection, field, value)
        
        db.session.commit()
        logger.info(f"Updated connection: {connection.name}")
        
        return connection
    
    def delete_connection(self, connection_id: str) -> bool:
        """
        Delete a data connection.
        
        Args:
            connection_id: Connection UUID
        
        Returns:
            True if successful
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return False
        
        # TODO: Check for dependent ingestion jobs
        
        db.session.delete(connection)
        db.session.commit()
        
        logger.info(f"Deleted connection: {connection.name}")
        
        return True
    
    def test_connection(self, connection_id: str) -> Dict[str, Any]:
        """
        Test an existing connection.
        
        Args:
            connection_id: Connection UUID
        
        Returns:
            Test result with success status and details
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return {"success": False, "error": "Connection not found"}
        
        # Decrypt password
        password = self.credential_service.decrypt(connection.password_encrypted)
        
        return self.test_connection_params(
            db_type=connection.db_type.value,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            username=connection.username,
            password=password,
            ssl_mode=connection.ssl_mode,
        )
    
    def test_connection_params(
        self,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Test connection parameters without saving using connector framework.
        
        Args:
            db_type: Database type
            host: Database host
            port: Database port
            database: Database name
            username: Connection username
            password: Connection password
            ssl_mode: SSL mode
        
        Returns:
            Test result with success status and details
        """
        try:
            # Create connection config
            config = ConnectionConfig(
                host=host,
                port=port,
                database=database,
                username=username,
                password=password,
                ssl_mode=ssl_mode,
                ssl=bool(ssl_mode)
            )
            
            # Create connector
            connector = ConnectorRegistry.create_connector(db_type, config)
            
            # Test connection
            with connector:
                connector.test_connection()
                
                # Get additional info
                schemas = connector.get_schemas()
                
                return {
                    "success": True,
                    "message": "Connection successful",
                    "details": {
                        "database": database,
                        "schemas_count": len(schemas),
                        "schemas": schemas[:10],  # First 10 schemas
                    }
                }
                
        except ConnectorException as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Connection test failed"
            }
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Connection test failed",
                "details": {"exception_type": type(e).__name__}
            }
    
    def get_schema(
        self,
        connection_id: str,
        schema_name: Optional[str] = None,
        include_columns: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get database schema information using connector framework.
        
        Args:
            connection_id: Connection UUID
            schema_name: Filter by schema name
            include_columns: Include column details
        
        Returns:
            Schema information or None
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return None
        
        try:
            # Decrypt password
            password = self.credential_service.decrypt(connection.password_encrypted)
            
            # Create connection config
            config = ConnectionConfig(
                host=connection.host,
                port=connection.port,
                database=connection.database,
                username=connection.username,
                password=password,
                ssl_mode=connection.ssl_mode,
                ssl=bool(connection.ssl_mode),
                schema=connection.schema_name,
                extra_params=connection.extra_params
            )
            
            # Create connector
            connector = ConnectorRegistry.create_connector(
                connection.db_type.value,
                config
            )
            
            # Get schema information
            with connector:
                schemas = connector.get_schemas()
                
                tables_by_schema = {}
                
                # Filter by schema if requested
                target_schemas = [schema_name] if schema_name else schemas
                
                for schema in target_schemas:
                    if schema not in schemas:
                        continue
                        
                    tables = connector.get_tables(schema)
                    
                    # Convert to dict format
                    tables_dict = []
                    for table in tables:
                        table_dict = {
                            "name": table.name,
                            "schema": table.schema,
                            "row_count": table.row_count,
                            "comment": table.comment,
                            "table_type": table.table_type,
                        }
                        
                        # Include columns if requested
                        if include_columns and table.columns:
                            table_dict["columns"] = [
                                {
                                    "name": col.name,
                                    "data_type": col.data_type,
                                    "nullable": col.nullable,
                                    "primary_key": col.primary_key,
                                    "comment": col.comment,
                                    "max_length": col.max_length,
                                    "precision": col.precision,
                                    "scale": col.scale,
                                }
                                for col in table.columns
                            ]
                        
                        tables_dict.append(table_dict)
                    
                    tables_by_schema[schema] = tables_dict
                
                return {
                    "schemas": schemas,
                    "tables": tables_by_schema,
                }
                
        except ConnectorException as e:
            logger.error(f"Failed to get schema for connection {connection_id}: {e}")
            return {
                "schemas": [],
                "tables": {},
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Failed to get schema for connection {connection_id}: {e}")
            return {
                "schemas": [],
                "tables": {},
                "error": str(e)
            }
    
    def trigger_sync(
        self,
        connection_id: str,
        sync_config: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Trigger a data sync job for this connection.
        
        Args:
            connection_id: Connection UUID
            sync_config: Optional sync configuration (tables, incremental, etc.)
        
        Returns:
            Job ID or None if connection not found
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return None
        
        try:
            # TODO: Integrate with Airflow to trigger DAG
            # For now, create a placeholder job ID
            import uuid
            job_id = str(uuid.uuid4())
            
            logger.info(f"Triggered sync for connection {connection.name}: job_id={job_id}")
            
            # TODO: Actually trigger Airflow DAG with connection parameters
            # Example:
            # from app.services.airflow_client import AirflowClient
            # airflow = AirflowClient()
            # dag_run = airflow.trigger_dag(
            #     dag_id=f"ingest_{connection.db_type.value}",
            #     conf={
            #         "connection_id": connection_id,
            #         "sync_config": sync_config or {}
            #     }
            # )
            # job_id = dag_run["dag_run_id"]
            
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to trigger sync for connection {connection_id}: {e}")
            return None
    
    def get_connector(self, connection_id: str):
        """
        Get a connector instance for this connection.
        
        Args:
            connection_id: Connection UUID
        
        Returns:
            Connector instance (remember to use with context manager)
        
        Raises:
            ValueError: If connection not found
        """
        connection = self.get_connection(connection_id)
        if not connection:
            raise ValueError(f"Connection {connection_id} not found")
        
        # Decrypt password
        password = self.credential_service.decrypt(connection.password_encrypted)
        
        # Create connection config
        config = ConnectionConfig(
            host=connection.host,
            port=connection.port,
            database=connection.database,
            username=connection.username,
            password=password,
            ssl_mode=connection.ssl_mode,
            ssl=bool(connection.ssl_mode),
            schema=connection.schema_name,
            extra_params=connection.extra_params
        )
        
        # Create and return connector
        return ConnectorRegistry.create_connector(
            connection.db_type.value,
            config
        )
