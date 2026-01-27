"""
NovaSight Connection Pool
=========================

Connection pooling for database connectors.
"""

from typing import Dict, Optional
from queue import Queue, Empty
from threading import Lock
import logging
import time

from app.connectors.base import BaseConnector, ConnectionConfig

logger = logging.getLogger(__name__)


class ConnectionPool:
    """
    Connection pool for database connectors.
    
    Manages a pool of reusable database connections to improve performance
    and reduce connection overhead.
    """
    
    def __init__(
        self,
        connector_class: type,
        config: ConnectionConfig,
        pool_size: int = 5,
        max_overflow: int = 10,
        timeout: int = 30,
        recycle: int = 3600
    ):
        """
        Initialize connection pool.
        
        Args:
            connector_class: Connector class to use
            config: Connection configuration
            pool_size: Number of connections to maintain
            max_overflow: Maximum connections beyond pool_size
            timeout: Seconds to wait for available connection
            recycle: Seconds before recycling a connection
        """
        self.connector_class = connector_class
        self.config = config
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.timeout = timeout
        self.recycle = recycle
        
        self._pool: Queue = Queue(maxsize=pool_size)
        self._overflow_count = 0
        self._lock = Lock()
        self._connection_times: Dict[int, float] = {}
        
        # Pre-populate pool
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool."""
        for _ in range(self.pool_size):
            try:
                conn = self._create_connection()
                self._pool.put(conn)
            except Exception as e:
                logger.error(f"Failed to initialize connection: {e}")
    
    def _create_connection(self) -> BaseConnector:
        """Create a new connection."""
        conn = self.connector_class(self.config)
        conn.connect()
        self._connection_times[id(conn)] = time.time()
        return conn
    
    def _should_recycle(self, conn: BaseConnector) -> bool:
        """Check if connection should be recycled."""
        conn_id = id(conn)
        if conn_id not in self._connection_times:
            return True
        
        age = time.time() - self._connection_times[conn_id]
        return age > self.recycle
    
    def get_connection(self) -> BaseConnector:
        """
        Get a connection from the pool.
        
        Returns:
            Database connector instance
        
        Raises:
            TimeoutError: If no connection available within timeout
        """
        try:
            # Try to get from pool
            conn = self._pool.get(timeout=self.timeout)
            
            # Check if connection should be recycled
            if self._should_recycle(conn):
                logger.debug("Recycling old connection")
                try:
                    conn.disconnect()
                except Exception:
                    pass
                conn = self._create_connection()
            
            # Test connection
            try:
                conn.test_connection()
            except Exception:
                logger.warning("Connection test failed, creating new connection")
                try:
                    conn.disconnect()
                except Exception:
                    pass
                conn = self._create_connection()
            
            return conn
            
        except Empty:
            # Pool is empty, try overflow
            with self._lock:
                if self._overflow_count < self.max_overflow:
                    self._overflow_count += 1
                    logger.debug(f"Creating overflow connection ({self._overflow_count}/{self.max_overflow})")
                    return self._create_connection()
                else:
                    raise TimeoutError(
                        f"No connection available within {self.timeout} seconds. "
                        f"Pool size: {self.pool_size}, overflow: {self._overflow_count}/{self.max_overflow}"
                    )
    
    def return_connection(self, conn: BaseConnector):
        """
        Return a connection to the pool.
        
        Args:
            conn: Connection to return
        """
        try:
            # Test if connection is still valid
            conn.test_connection()
            
            # Try to return to pool
            try:
                self._pool.put_nowait(conn)
            except Exception:
                # Pool is full, this is an overflow connection
                with self._lock:
                    self._overflow_count -= 1
                logger.debug("Closing overflow connection")
                try:
                    conn.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting overflow connection: {e}")
                finally:
                    conn_id = id(conn)
                    if conn_id in self._connection_times:
                        del self._connection_times[conn_id]
        
        except Exception as e:
            # Connection is bad, discard it
            logger.warning(f"Discarding bad connection: {e}")
            try:
                conn.disconnect()
            except Exception:
                pass
            finally:
                conn_id = id(conn)
                if conn_id in self._connection_times:
                    del self._connection_times[conn_id]
            
            # Create replacement if this was a pool connection
            try:
                self._pool.put_nowait(self._create_connection())
            except Exception:
                pass
    
    def close_all(self):
        """Close all connections in the pool."""
        while not self._pool.empty():
            try:
                conn = self._pool.get_nowait()
                try:
                    conn.disconnect()
                except Exception as e:
                    logger.warning(f"Error closing connection: {e}")
            except Empty:
                break
        
        self._connection_times.clear()
        logger.info("Connection pool closed")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close_all()


class PooledConnection:
    """
    Context manager for pooled connections.
    
    Automatically returns connection to pool when done.
    """
    
    def __init__(self, pool: ConnectionPool):
        """
        Initialize pooled connection.
        
        Args:
            pool: Connection pool to use
        """
        self.pool = pool
        self.connection: Optional[BaseConnector] = None
    
    def __enter__(self) -> BaseConnector:
        """Get connection from pool."""
        self.connection = self.pool.get_connection()
        return self.connection
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Return connection to pool."""
        if self.connection:
            self.pool.return_connection(self.connection)
            self.connection = None
