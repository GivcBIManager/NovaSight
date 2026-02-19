"""
NovaSight Dagster Resources — ClickHouse
==========================================

ClickHouse database resource with two modes:
1. ClickHouseResource - Static config from environment/Dagster config
2. DynamicClickHouseResource - Dynamic per-tenant config from database

For multi-tenant scenarios, use DynamicClickHouseResource which
fetches tenant-specific ClickHouse configuration at runtime.
"""

from dagster import ConfigurableResource
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)


class ClickHouseResource(ConfigurableResource):
    """
    Dagster resource for ClickHouse database (static config).
    
    Provides query execution capabilities with configuration
    from environment variables or Dagster config.
    """
    
    host: str = "clickhouse"
    port: int = 9000
    database: str = "default"
    user: str = "default"
    password: Optional[str] = None

    def get_client(self):
        """Get ClickHouse client."""
        try:
            from clickhouse_driver import Client
            return Client(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password or "",
            )
        except ImportError:
            logger.warning("clickhouse-driver not installed, using HTTP client")
            return self._get_http_client()

    def _get_http_client(self):
        """Fallback HTTP client."""
        import httpx
        
        class ClickHouseHTTPClient:
            def __init__(self, host, port, database, user, password):
                self.base_url = f"http://{host}:{port}"
                self.database = database
                self.user = user
                self.password = password
            
            def execute(self, query, params=None):
                import httpx
                response = httpx.post(
                    self.base_url,
                    params={
                        "database": self.database,
                        "query": query,
                    },
                    auth=(self.user, self.password) if self.password else None,
                )
                response.raise_for_status()
                return response.text
        
        return ClickHouseHTTPClient(
            self.host, 8123, self.database, self.user, self.password
        )

    def execute(self, query: str, parameters: dict = None) -> Any:
        """Execute a query."""
        client = self.get_client()
        logger.info(f"Executing ClickHouse query: {query[:100]}...")
        return client.execute(query, parameters)

    def insert_dataframe(self, table: str, df) -> int:
        """Insert a pandas DataFrame into a table."""
        client = self.get_client()
        
        # Convert DataFrame to list of tuples
        data = [tuple(row) for row in df.values]
        columns = ", ".join(df.columns)
        
        query = f"INSERT INTO {table} ({columns}) VALUES"
        client.execute(query, data)
        
        return len(data)


class DynamicClickHouseResource(ConfigurableResource):
    """
    Dagster resource for ClickHouse with per-tenant configuration.
    
    Fetches ClickHouse connection settings from the database
    based on the tenant_id, allowing different tenants to use
    different ClickHouse instances.
    
    Configuration is automatically cached and refreshed when
    changes are made via the admin UI.
    
    Usage:
        @asset
        def my_asset(context, clickhouse: DynamicClickHouseResource):
            tenant_id = context.op_config.get("tenant_id")
            client = clickhouse.get_client_for_tenant(tenant_id)
            result = client.execute("SELECT * FROM table")
    """
    
    # Default settings (used if database config unavailable)
    fallback_host: str = "clickhouse"
    fallback_port: int = 9000
    fallback_database: str = "default"
    fallback_user: str = "default"
    
    def get_client_for_tenant(self, tenant_id: Optional[str] = None) -> Any:
        """
        Get ClickHouse client for a specific tenant.
        
        ClickHouse is per-tenant - each tenant MUST have their own
        configuration. No fallback to global or default config.
        
        Args:
            tenant_id: Tenant ID (required)
        
        Returns:
            ClickHouse client instance
        
        Raises:
            ValueError: If tenant_id not provided or no config found
        """
        if not tenant_id:
            raise ValueError(
                "No Configured Analytics Platform. "
                "Tenant ID is required for ClickHouse access."
            )
        
        try:
            from app.platform.infrastructure import InfrastructureConfigProvider
            
            provider = InfrastructureConfigProvider()
            config = provider.get_clickhouse_config(tenant_id)
            
            logger.info(
                "Using ClickHouse config '%s' for tenant %s: %s:%d",
                config.name,
                tenant_id,
                config.host,
                config.native_port,
            )
            
            return self._create_client(
                host=config.host,
                port=config.native_port,
                database=config.database,
                user=config.user,
                password=config.password,
            )
        except ValueError as e:
            # Re-raise ValueError (No Configured Analytics Platform)
            raise
        except Exception as e:
            logger.error(
                "Failed to get ClickHouse config for tenant %s: %s",
                tenant_id, e,
            )
            raise ValueError(
                "No Configured Analytics Platform. "
                "Failed to load ClickHouse configuration for this tenant."
            )
    
    def _create_client(
        self,
        host: str,
        port: int,
        database: str,
        user: str,
        password: str,
    ) -> Any:
        """Create a ClickHouse client with given config."""
        try:
            from clickhouse_driver import Client
            return Client(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password or "",
            )
        except ImportError:
            logger.warning("clickhouse-driver not installed, using HTTP client")
            return self._create_http_client(host, database, user, password)
    
    def _create_http_client(
        self,
        host: str,
        database: str,
        user: str,
        password: str,
    ) -> Any:
        """Create HTTP client fallback."""
        class ClickHouseHTTPClient:
            def __init__(self, host, database, user, password):
                self.base_url = f"http://{host}:8123"
                self.database = database
                self.user = user
                self.password = password
            
            def execute(self, query, params=None):
                import httpx
                response = httpx.post(
                    self.base_url,
                    params={"database": self.database, "query": query},
                    auth=(self.user, self.password) if self.password else None,
                )
                response.raise_for_status()
                return response.text
        
        return ClickHouseHTTPClient(host, database, user, password)
    
    def execute_for_tenant(
        self,
        query: str,
        tenant_id: Optional[str] = None,
        parameters: dict = None,
    ) -> Any:
        """Execute a query for a specific tenant."""
        client = self.get_client_for_tenant(tenant_id)
        logger.info(
            "Executing ClickHouse query for tenant %s: %s",
            tenant_id or "global",
            query[:100],
        )
        return client.execute(query, parameters)

