"""
NovaSight Infrastructure Configuration Service
===============================================

Service for managing infrastructure server configurations.
Provides CRUD operations and connection testing for ClickHouse, Spark, and Airflow.
"""

import logging
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from flask import current_app

from app.extensions import db
from app.models.infrastructure_config import (
    InfrastructureConfig,
    InfrastructureType,
    DEFAULT_INFRASTRUCTURE_CONFIGS,
)

logger = logging.getLogger(__name__)


class InfrastructureConfigError(Exception):
    """Base exception for infrastructure configuration errors."""
    pass


class InfrastructureConfigNotFoundError(InfrastructureConfigError):
    """Raised when configuration is not found."""
    pass


class InfrastructureConnectionError(InfrastructureConfigError):
    """Raised when connection test fails."""
    pass


class InfrastructureConfigService:
    """
    Service for managing infrastructure server configurations.
    
    Provides:
    - CRUD operations for infrastructure configs
    - Connection testing for each service type
    - Credential management integration
    - Default configuration fallback for dev/test
    """
    
    def __init__(self):
        self._credential_manager = None
    
    def _get_credential_manager(self, tenant_id: Optional[str] = None):
        """Get credential manager instance."""
        from app.services.credential_manager import CredentialManager
        return CredentialManager(tenant_id=tenant_id)
    
    # =========================================================
    # CRUD Operations
    # =========================================================
    
    def list_configs(
        self,
        service_type: Optional[str] = None,
        tenant_id: Optional[str] = None,
        include_global: bool = True,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        """
        List infrastructure configurations with filtering.
        
        Args:
            service_type: Filter by service type (clickhouse, spark, airflow)
            tenant_id: Filter by tenant ID
            include_global: Include global (tenant_id=None) configs
            page: Page number
            per_page: Items per page
            
        Returns:
            Paginated list of configurations
        """
        query = InfrastructureConfig.query
        
        if service_type:
            query = query.filter(InfrastructureConfig.service_type == service_type)
        
        if tenant_id:
            if include_global:
                query = query.filter(
                    db.or_(
                        InfrastructureConfig.tenant_id == tenant_id,
                        InfrastructureConfig.tenant_id.is_(None)
                    )
                )
            else:
                query = query.filter(InfrastructureConfig.tenant_id == tenant_id)
        elif not include_global:
            query = query.filter(InfrastructureConfig.tenant_id.isnot(None))
        
        query = query.order_by(
            InfrastructureConfig.service_type,
            InfrastructureConfig.is_system_default.desc(),
            InfrastructureConfig.created_at.desc()
        )
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            "items": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
        }
    
    def get_config(self, config_id: str) -> Optional[InfrastructureConfig]:
        """
        Get configuration by ID.
        
        Args:
            config_id: Configuration UUID
            
        Returns:
            Configuration object or None
        """
        try:
            return InfrastructureConfig.query.filter(
                InfrastructureConfig.id == config_id
            ).first()
        except Exception as e:
            logger.error(f"Error fetching config {config_id}: {e}")
            return None
    
    def get_active_config(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[InfrastructureConfig]:
        """
        Get the active configuration for a service type.
        
        Falls back to global config if no tenant-specific config exists.
        Falls back to system default if no active config exists.
        
        Args:
            service_type: Infrastructure service type
            tenant_id: Optional tenant ID
            
        Returns:
            Active configuration or None
        """
        return InfrastructureConfig.get_active_config(service_type, tenant_id)
    
    def get_effective_settings(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get effective configuration settings for a service.
        
        Returns stored config or default settings from environment/config.
        
        Args:
            service_type: Infrastructure service type
            tenant_id: Optional tenant ID
            
        Returns:
            Dictionary of configuration settings
        """
        config = self.get_active_config(service_type, tenant_id)
        
        if config:
            settings = {
                "host": config.host,
                "port": config.port,
                **config.settings,
            }
            
            # Retrieve credentials if available - decrypt settings that may have encrypted values
            if config.settings:
                try:
                    credential_manager = self._get_credential_manager(tenant_id)
                    decrypted_settings = credential_manager.retrieve_credentials(config.settings)
                    settings.update(decrypted_settings)
                except Exception as e:
                    logger.warning(f"Failed to retrieve credentials: {e}")
            
            return settings
        
        # Fall back to environment/config defaults
        return self._get_default_settings(service_type)
    
    def _get_default_settings(self, service_type: str) -> Dict[str, Any]:
        """Get default settings from environment or hardcoded defaults."""
        if service_type == InfrastructureType.CLICKHOUSE.value:
            return {
                "host": current_app.config.get("CLICKHOUSE_HOST", "localhost"),
                "port": current_app.config.get("CLICKHOUSE_PORT", 8123),
                "database": current_app.config.get("CLICKHOUSE_DATABASE", "novasight"),
                "user": current_app.config.get("CLICKHOUSE_USER", "default"),
                "password": current_app.config.get("CLICKHOUSE_PASSWORD", ""),
                "secure": False,
                "connect_timeout": 10,
                "send_receive_timeout": 300,
            }
        elif service_type == InfrastructureType.SPARK.value:
            return {
                "host": "localhost",
                "port": 7077,
                "master_url": "spark://localhost:7077",
                "deploy_mode": "client",
                "driver_memory": "2g",
                "executor_memory": "2g",
                "executor_cores": 2,
                "dynamic_allocation": True,
                "min_executors": 1,
                "max_executors": 10,
                "spark_home": "/opt/spark",
            }
        elif service_type == InfrastructureType.AIRFLOW.value:
            return {
                "host": "localhost",
                "port": 8080,
                "base_url": current_app.config.get("AIRFLOW_BASE_URL", "http://localhost:8080"),
                "username": current_app.config.get("AIRFLOW_USERNAME", "airflow"),
                "password": current_app.config.get("AIRFLOW_PASSWORD", "airflow"),
                "api_version": "v1",
                "dag_folder": "/opt/airflow/dags",
                "request_timeout": 30,
            }
        else:
            raise ValueError(f"Unknown service type: {service_type}")
    
    def create_config(
        self,
        service_type: str,
        name: str,
        host: str,
        port: int,
        settings: Dict[str, Any],
        tenant_id: Optional[str] = None,
        description: Optional[str] = None,
        is_active: bool = True,
        created_by: Optional[str] = None,
    ) -> InfrastructureConfig:
        """
        Create a new infrastructure configuration.
        
        Args:
            service_type: Infrastructure service type
            name: Display name
            host: Server hostname
            port: Server port
            settings: Service-specific settings
            tenant_id: Optional tenant ID for tenant-specific config
            description: Optional description
            is_active: Whether this config is active
            created_by: User ID who created this config
            
        Returns:
            Created configuration object
        """
        # Encrypt sensitive fields in settings
        credential_manager = self._get_credential_manager(tenant_id)
        encrypted_settings = credential_manager.store_credentials(settings)
        
        # If setting as active, deactivate other configs of same type/tenant
        if is_active:
            self._deactivate_other_configs(service_type, tenant_id)
        
        config = InfrastructureConfig(
            service_type=service_type,
            name=name,
            host=host,
            port=port,
            settings=encrypted_settings,
            tenant_id=tenant_id,
            description=description,
            is_active=is_active,
            is_system_default=False,
            created_by=created_by,
            updated_by=created_by,
        )
        
        db.session.add(config)
        db.session.commit()
        
        logger.info(f"Created infrastructure config: {service_type}:{name}")
        return config
    
    def update_config(
        self,
        config_id: str,
        updated_by: Optional[str] = None,
        **kwargs,
    ) -> InfrastructureConfig:
        """
        Update an existing infrastructure configuration.
        
        Args:
            config_id: Configuration UUID
            updated_by: User ID making the update
            **kwargs: Fields to update
            
        Returns:
            Updated configuration object
        """
        config = self.get_config(config_id)
        if not config:
            raise InfrastructureConfigNotFoundError(f"Config not found: {config_id}")
        
        # Don't allow modifying system defaults
        if config.is_system_default:
            raise InfrastructureConfigError("Cannot modify system default configuration")
        
        # Handle settings merge
        if 'settings' in kwargs:
            new_settings = kwargs.pop('settings')
            
            # Encrypt sensitive fields in new settings
            credential_manager = self._get_credential_manager(
                str(config.tenant_id) if config.tenant_id else None
            )
            encrypted_new_settings = credential_manager.store_credentials(new_settings)
            
            # Merge with existing settings
            merged_settings = {**config.settings, **encrypted_new_settings}
            config.settings = merged_settings
        
        # Handle is_active - deactivate others if becoming active
        if kwargs.get('is_active', False) and not config.is_active:
            self._deactivate_other_configs(config.service_type, config.tenant_id)
        
        # Update simple fields
        allowed_fields = ['name', 'description', 'host', 'port', 'is_active']
        for field in allowed_fields:
            if field in kwargs:
                setattr(config, field, kwargs[field])
        
        config.updated_by = updated_by
        config.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Updated infrastructure config: {config_id}")
        return config
    
    def delete_config(self, config_id: str) -> bool:
        """
        Delete an infrastructure configuration.
        
        Args:
            config_id: Configuration UUID
            
        Returns:
            True if deleted successfully
        """
        config = self.get_config(config_id)
        if not config:
            raise InfrastructureConfigNotFoundError(f"Config not found: {config_id}")
        
        if config.is_system_default:
            raise InfrastructureConfigError("Cannot delete system default configuration")
        
        # Credentials are stored encrypted in settings, no separate deletion needed
        
        db.session.delete(config)
        db.session.commit()
        
        logger.info(f"Deleted infrastructure config: {config_id}")
        return True
    
    def _deactivate_other_configs(
        self,
        service_type: str,
        tenant_id: Optional[str],
    ) -> None:
        """Deactivate other configurations of the same type/tenant scope."""
        query = InfrastructureConfig.query.filter(
            InfrastructureConfig.service_type == service_type,
            InfrastructureConfig.is_active == True,
        )
        
        if tenant_id:
            query = query.filter(InfrastructureConfig.tenant_id == tenant_id)
        else:
            query = query.filter(InfrastructureConfig.tenant_id.is_(None))
        
        for config in query.all():
            config.is_active = False
        
        db.session.flush()
    
    # =========================================================
    # Connection Testing
    # =========================================================
    
    def test_connection(
        self,
        config_id: Optional[str] = None,
        service_type: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[int] = None,
        settings: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Test connection to an infrastructure service.
        
        Either provide config_id to test existing config,
        or provide inline parameters to test before saving.
        
        Args:
            config_id: Existing configuration ID to test
            service_type: Service type for inline test
            host: Host for inline test
            port: Port for inline test
            settings: Settings for inline test
            
        Returns:
            Test result dictionary
        """
        if config_id:
            config = self.get_config(config_id)
            if not config:
                raise InfrastructureConfigNotFoundError(f"Config not found: {config_id}")
            
            service_type = config.service_type
            host = config.host
            port = config.port
            settings = dict(config.settings)
            
            # Decrypt credentials in settings
            try:
                credential_manager = self._get_credential_manager(
                    str(config.tenant_id) if config.tenant_id else None
                )
                settings = credential_manager.retrieve_credentials(settings)
            except Exception as e:
                logger.warning(f"Failed to decrypt credentials for test: {e}")
        
        if not all([service_type, host, port]):
            raise ValueError("service_type, host, and port are required")
        
        settings = settings or {}
        
        # Route to appropriate test method
        test_methods = {
            InfrastructureType.CLICKHOUSE.value: self._test_clickhouse,
            InfrastructureType.SPARK.value: self._test_spark,
            InfrastructureType.AIRFLOW.value: self._test_airflow,
        }
        
        # Ensure service_type is a string for dictionary lookup
        service_type_str = str(service_type) if service_type else ""
        test_method = test_methods.get(service_type_str)
        if not test_method:
            raise ValueError(f"Unknown service type: {service_type}")
        
        start_time = time.time()
        try:
            # Ensure host and port are the correct types
            host_str = str(host) if host else "localhost"
            port_int = int(port) if port else 8080
            result = test_method(host_str, port_int, settings)
            latency_ms = (time.time() - start_time) * 1000
            result['latency_ms'] = round(latency_ms, 2)
            
            # Update last test result if testing existing config
            if config_id:
                self._update_test_result(config_id, result)
            
            return result
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            result = {
                'success': False,
                'message': str(e),
                'latency_ms': round(latency_ms, 2),
            }
            
            if config_id:
                self._update_test_result(config_id, result)
            
            return result
    
    def _test_clickhouse(
        self,
        host: str,
        port: int,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Test ClickHouse connection."""
        import httpx
        
        database = settings.get('database', 'default')
        user = settings.get('user', 'default')
        password = settings.get('password', '')
        secure = settings.get('secure', False)
        timeout = settings.get('connect_timeout', 10)
        
        protocol = 'https' if secure else 'http'
        url = f"{protocol}://{host}:{port}"
        
        try:
            # Test basic connectivity with version query
            response = httpx.get(
                url,
                params={'query': 'SELECT version()'},
                auth=(user, password) if user else None,
                timeout=timeout,
            )
            response.raise_for_status()
            
            version = response.text.strip()
            
            # Test database access
            db_response = httpx.get(
                url,
                params={'query': f'SELECT 1 FROM system.databases WHERE name = \'{database}\''},
                auth=(user, password) if user else None,
                timeout=timeout,
            )
            db_exists = db_response.text.strip() == '1'
            
            return {
                'success': True,
                'message': 'Connection successful',
                'server_version': version,
                'details': {
                    'database_exists': db_exists,
                    'database': database,
                }
            }
        except httpx.HTTPStatusError as e:
            raise InfrastructureConnectionError(f"HTTP error: {e.response.status_code}")
        except httpx.ConnectError as e:
            raise InfrastructureConnectionError(f"Connection failed: {str(e)}")
        except Exception as e:
            raise InfrastructureConnectionError(f"Connection test failed: {str(e)}")
    
    def _test_spark(
        self,
        host: str,
        port: int,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Test Spark connection."""
        import httpx
        
        # Spark Master UI is typically on port 8080, API on different port
        # We'll test the REST API endpoint
        master_url = settings.get('master_url', f"spark://{host}:{port}")
        
        # Try Spark REST API (typically on port 6066 or via master web UI)
        rest_port = 6066  # Default Spark REST submission port
        ui_port = 8080    # Default Spark Master UI port
        
        try:
            # Try Master UI JSON API first
            ui_url = f"http://{host}:{ui_port}/json/"
            response = httpx.get(ui_url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return {
                'success': True,
                'message': 'Connection successful',
                'server_version': data.get('spark', 'unknown'),
                'details': {
                    'status': data.get('status', 'UNKNOWN'),
                    'workers': len(data.get('workers', [])),
                    'cores': data.get('cores', 0),
                    'memory': data.get('memory', 0),
                    'master_url': master_url,
                }
            }
        except httpx.HTTPStatusError:
            # Try basic connectivity
            try:
                response = httpx.get(f"http://{host}:{ui_port}/", timeout=10)
                return {
                    'success': True,
                    'message': 'Spark Master UI accessible',
                    'server_version': 'unknown',
                    'details': {'master_url': master_url}
                }
            except Exception:
                pass
        except httpx.ConnectError:
            pass
        except Exception:
            pass
        
        # Try direct socket connection to master port
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                return {
                    'success': True,
                    'message': 'Spark Master port is open',
                    'server_version': 'unknown',
                    'details': {'master_url': master_url}
                }
            else:
                raise InfrastructureConnectionError(f"Cannot connect to {host}:{port}")
        except socket.error as e:
            raise InfrastructureConnectionError(f"Socket error: {str(e)}")
    
    def _test_airflow(
        self,
        host: str,
        port: int,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Test Airflow connection."""
        import httpx
        
        base_url = settings.get('base_url', f"http://{host}:{port}")
        username = settings.get('username', 'airflow')
        password = settings.get('password', 'airflow')
        timeout = settings.get('request_timeout', 30)
        
        base_url = base_url.rstrip('/')
        
        try:
            # Test health endpoint first (no auth required usually)
            health_response = httpx.get(
                f"{base_url}/health",
                timeout=timeout,
            )
            
            # Test API endpoint with auth
            api_response = httpx.get(
                f"{base_url}/api/v1/health",
                auth=(username, password),
                timeout=timeout,
            )
            api_response.raise_for_status()
            
            health_data = api_response.json()
            
            # Get version info
            version_response = httpx.get(
                f"{base_url}/api/v1/version",
                auth=(username, password),
                timeout=timeout,
            )
            version = 'unknown'
            if version_response.status_code == 200:
                version = version_response.json().get('version', 'unknown')
            
            return {
                'success': True,
                'message': 'Connection successful',
                'server_version': version,
                'details': {
                    'metadatabase': health_data.get('metadatabase', {}).get('status'),
                    'scheduler': health_data.get('scheduler', {}).get('status'),
                }
            }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise InfrastructureConnectionError("Authentication failed")
            raise InfrastructureConnectionError(f"HTTP error: {e.response.status_code}")
        except httpx.ConnectError as e:
            raise InfrastructureConnectionError(f"Connection failed: {str(e)}")
        except Exception as e:
            raise InfrastructureConnectionError(f"Connection test failed: {str(e)}")
    
    def _update_test_result(
        self,
        config_id: str,
        result: Dict[str, Any],
    ) -> None:
        """Update the test result on a configuration."""
        try:
            config = self.get_config(config_id)
            if config:
                config.last_test_at = datetime.utcnow()
                config.last_test_success = result.get('success', False)
                config.last_test_message = result.get('message', '')
                db.session.commit()
        except Exception as e:
            logger.warning(f"Failed to update test result: {e}")
    
    # =========================================================
    # Initialization
    # =========================================================
    
    def initialize_defaults(self) -> None:
        """
        Initialize system default configurations.
        
        Creates default configurations for each infrastructure type
        if they don't already exist. These defaults are used for
        development and testing.
        """
        for service_type, default_config in DEFAULT_INFRASTRUCTURE_CONFIGS.items():
            existing = InfrastructureConfig.query.filter(
                InfrastructureConfig.service_type == service_type,
                InfrastructureConfig.is_system_default == True,
            ).first()
            
            if not existing:
                config = InfrastructureConfig(
                    service_type=service_type,
                    name=default_config['name'],
                    description=default_config['description'],
                    host=default_config['host'],
                    port=default_config['port'],
                    settings=default_config['settings'],
                    is_active=True,
                    is_system_default=True,
                )
                db.session.add(config)
                logger.info(f"Created default config for {service_type}")
        
        db.session.commit()
