"""
NovaSight Connector Registry
============================

Registry for managing data source connectors.
"""

from typing import Dict, Type, List
import logging

from app.connectors.base import BaseConnector, ConnectionConfig

logger = logging.getLogger(__name__)


class ConnectorRegistry:
    """
    Registry for data source connectors.
    
    Provides a centralized way to register and retrieve connector classes.
    """
    
    _connectors: Dict[str, Type[BaseConnector]] = {}
    
    @classmethod
    def register(cls, connector_class: Type[BaseConnector]) -> Type[BaseConnector]:
        """
        Register a connector class.
        
        Args:
            connector_class: Connector class to register
        
        Returns:
            The registered connector class (for decorator use)
        
        Raises:
            ValueError: If connector type is invalid or already registered
        """
        connector_type = connector_class.connector_type
        
        if not connector_type or connector_type == "base":
            raise ValueError(f"Invalid connector type: {connector_type}")
        
        if connector_type in cls._connectors:
            logger.warning(f"Connector {connector_type} already registered, overwriting")
        
        cls._connectors[connector_type] = connector_class
        logger.info(f"Registered connector: {connector_type}")
        
        return connector_class
    
    @classmethod
    def get(cls, connector_type: str) -> Type[BaseConnector]:
        """
        Get connector class by type.
        
        Args:
            connector_type: Type of connector to retrieve
        
        Returns:
            Connector class
        
        Raises:
            ValueError: If connector type is not registered
        """
        if connector_type not in cls._connectors:
            available = ", ".join(cls._connectors.keys())
            raise ValueError(
                f"Unknown connector type: {connector_type}. "
                f"Available connectors: {available}"
            )
        
        return cls._connectors[connector_type]
    
    @classmethod
    def list_connectors(cls) -> List[str]:
        """
        List all registered connector types.
        
        Returns:
            List of connector type names
        """
        return sorted(cls._connectors.keys())
    
    @classmethod
    def get_connector_info(cls, connector_type: str) -> Dict:
        """
        Get information about a connector.
        
        Args:
            connector_type: Type of connector
        
        Returns:
            Dictionary with connector metadata
        """
        connector_class = cls.get(connector_type)
        
        return {
            'type': connector_class.connector_type,
            'default_port': connector_class.default_port,
            'supports_ssl': connector_class.supports_ssl,
            'supported_auth_methods': connector_class.supported_auth_methods,
            'class_name': connector_class.__name__,
        }
    
    @classmethod
    def create_connector(
        cls,
        connector_type: str,
        config: ConnectionConfig
    ) -> BaseConnector:
        """
        Create a connector instance.
        
        Args:
            connector_type: Type of connector to create
            config: Connection configuration
        
        Returns:
            Connector instance
        """
        connector_class = cls.get(connector_type)
        return connector_class(config)


# Import and auto-register connectors
from app.connectors.postgresql import PostgreSQLConnector
from app.connectors.mysql import MySQLConnector

ConnectorRegistry.register(PostgreSQLConnector)
ConnectorRegistry.register(MySQLConnector)

logger.info(f"Registered {len(ConnectorRegistry.list_connectors())} connectors: {', '.join(ConnectorRegistry.list_connectors())}")
