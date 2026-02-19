"""
NovaSight Dagster Resources — Database
========================================

PostgreSQL database resource using SQLAlchemy.
"""

from dagster import ConfigurableResource
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)


class DatabaseResource(ConfigurableResource):
    """
    Dagster resource for PostgreSQL database.
    
    Provides SQLAlchemy-based query execution.
    """
    
    connection_string: str

    def get_engine(self):
        """Get SQLAlchemy engine."""
        from sqlalchemy import create_engine
        return create_engine(self.connection_string)

    def get_connection(self):
        """Get database connection."""
        return self.get_engine().connect()

    def execute(self, query: str, parameters: dict = None) -> Any:
        """Execute a query."""
        from sqlalchemy import text
        
        with self.get_engine().connect() as conn:
            logger.info(f"Executing query: {query[:100]}...")
            result = conn.execute(text(query), parameters or {})
            conn.commit()
            return result

    def execute_many(self, queries: list) -> list:
        """Execute multiple queries in a transaction."""
        from sqlalchemy import text
        
        results = []
        with self.get_engine().begin() as conn:
            for query in queries:
                result = conn.execute(text(query))
                results.append(result)
        
        return results

    def read_sql(self, query: str, parameters: dict = None):
        """Read query results into a pandas DataFrame."""
        import pandas as pd
        return pd.read_sql(query, self.get_engine(), params=parameters)
