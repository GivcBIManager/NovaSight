"""
NovaSight dbt-MCP Server Adapter
================================

Adapter for communicating with the dbt-mcp server using the Model Context Protocol.
Enables semantic layer queries, model introspection, and lineage exploration.

The dbt-mcp server (https://github.com/dbt-labs/dbt-mcp) provides AI/LLM-friendly
access to dbt project metadata and semantic layer capabilities.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from threading import Lock
import time

logger = logging.getLogger(__name__)


class MCPError(Exception):
    """Base exception for MCP adapter errors."""
    pass


class MCPConnectionError(MCPError):
    """Raised when connection to MCP server fails."""
    pass


class MCPQueryError(MCPError):
    """Raised when an MCP query fails."""
    pass


class MCPTimeoutError(MCPError):
    """Raised when MCP server request times out."""
    pass


class MCPServerState(str, Enum):
    """State of the MCP server process."""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"


@dataclass
class MCPModel:
    """Represents a dbt model from MCP server."""
    name: str
    unique_id: str
    resource_type: str
    description: str = ""
    schema_name: str = ""
    database: str = ""
    materialization: str = "view"
    columns: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MCPMetric:
    """Represents a semantic layer metric from MCP server."""
    name: str
    unique_id: str
    description: str = ""
    type: str = "simple"  # simple, derived, cumulative
    type_params: Dict[str, Any] = field(default_factory=dict)
    filter: Optional[str] = None
    dimensions: List[str] = field(default_factory=list)


@dataclass
class MCPDimension:
    """Represents a semantic layer dimension from MCP server."""
    name: str
    unique_id: str
    description: str = ""
    type: str = "categorical"
    expr: Optional[str] = None
    is_partition: bool = False


@dataclass
class MCPQueryResult:
    """Result of an MCP semantic query."""
    success: bool
    data: List[Dict[str, Any]] = field(default_factory=list)
    columns: List[str] = field(default_factory=list)
    row_count: int = 0
    query_id: str = ""
    compiled_sql: str = ""
    execution_time_ms: float = 0
    error: Optional[str] = None


@dataclass
class MCPLineageNode:
    """Node in lineage graph from MCP."""
    unique_id: str
    name: str
    resource_type: str
    package_name: str = ""
    schema_name: str = ""
    database: str = ""


@dataclass
class MCPLineageGraph:
    """Lineage graph from MCP server."""
    nodes: List[MCPLineageNode] = field(default_factory=list)
    edges: List[Dict[str, str]] = field(default_factory=list)  # [{source, target}]


class DbtMCPAdapter:
    """
    Adapter for the dbt-mcp server.
    
    Manages the lifecycle of the dbt-mcp subprocess and provides methods
    to interact with the semantic layer and model metadata.
    
    Usage:
        adapter = DbtMCPAdapter(dbt_project_path='/path/to/dbt')
        await adapter.start()
        
        # Query semantic layer
        result = await adapter.query_metrics(
            metrics=['revenue'],
            dimensions=['date', 'region'],
            filters={'region': 'US'}
        )
        
        # Get model info
        model = await adapter.get_model('marts.orders')
        
        await adapter.stop()
    """
    
    # Class-level server management
    _instances: Dict[str, 'DbtMCPAdapter'] = {}
    _lock = Lock()
    
    def __init__(
        self,
        dbt_project_path: Optional[str] = None,
        profiles_dir: Optional[str] = None,
        target: str = "dev",
        timeout: float = 30.0,
    ):
        """
        Initialize the MCP adapter.
        
        Args:
            dbt_project_path: Path to dbt project. Defaults to ./dbt
            profiles_dir: Path to profiles.yml directory. Defaults to project path
            target: dbt target environment (dev, prod)
            timeout: Request timeout in seconds
        """
        if dbt_project_path:
            self.project_path = Path(dbt_project_path)
        else:
            self.project_path = Path(__file__).parent.parent.parent.parent.parent / 'dbt'
        
        self.profiles_dir = Path(profiles_dir) if profiles_dir else self.project_path
        self.target = target
        self.timeout = timeout
        
        self._process: Optional[subprocess.Popen] = None
        self._state = MCPServerState.STOPPED
        self._request_id = 0
        self._pending_requests: Dict[int, asyncio.Future] = {}
        self._reader_task: Optional[asyncio.Task] = None
        
        logger.info(
            f"DbtMCPAdapter initialized: project={self.project_path}, target={self.target}"
        )
    
    @classmethod
    def get_instance(
        cls,
        tenant_id: str,
        dbt_project_path: Optional[str] = None,
        **kwargs,
    ) -> 'DbtMCPAdapter':
        """
        Get or create an MCP adapter instance for a tenant.
        
        Args:
            tenant_id: Tenant identifier for isolation
            dbt_project_path: Path to dbt project
            **kwargs: Additional constructor arguments
        
        Returns:
            DbtMCPAdapter instance
        """
        with cls._lock:
            if tenant_id not in cls._instances:
                cls._instances[tenant_id] = cls(
                    dbt_project_path=dbt_project_path,
                    **kwargs,
                )
            return cls._instances[tenant_id]
    
    @property
    def state(self) -> MCPServerState:
        """Get current server state."""
        return self._state
    
    @property
    def is_running(self) -> bool:
        """Check if MCP server is running."""
        return self._state == MCPServerState.RUNNING and self._process is not None
    
    async def start(self) -> None:
        """
        Start the dbt-mcp server subprocess.
        
        Raises:
            MCPConnectionError: If server fails to start
        """
        if self.is_running:
            logger.debug("MCP server already running")
            return
        
        self._state = MCPServerState.STARTING
        logger.info(f"Starting dbt-mcp server for project: {self.project_path}")
        
        try:
            # Build environment with dbt configuration
            env = os.environ.copy()
            env['DBT_PROJECT_DIR'] = str(self.project_path)
            env['DBT_PROFILES_DIR'] = str(self.profiles_dir)
            env['DBT_TARGET'] = self.target
            
            # Start dbt-mcp server process
            # The server communicates via JSON-RPC over stdio
            self._process = subprocess.Popen(
                [
                    sys.executable, '-m', 'dbt_mcp',
                    '--project-dir', str(self.project_path),
                    '--profiles-dir', str(self.profiles_dir),
                    '--target', self.target,
                ],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                text=True,
                bufsize=1,  # Line buffered
            )
            
            # Start background reader for responses
            self._reader_task = asyncio.create_task(self._read_responses())
            
            # Wait for server initialization
            await self._wait_for_ready()
            
            self._state = MCPServerState.RUNNING
            logger.info("dbt-mcp server started successfully")
            
        except Exception as e:
            self._state = MCPServerState.ERROR
            logger.error(f"Failed to start dbt-mcp server: {e}")
            raise MCPConnectionError(f"Failed to start MCP server: {e}")
    
    async def stop(self) -> None:
        """Stop the dbt-mcp server subprocess."""
        if not self._process:
            return
        
        logger.info("Stopping dbt-mcp server")
        
        try:
            # Cancel reader task
            if self._reader_task:
                self._reader_task.cancel()
                try:
                    await self._reader_task
                except asyncio.CancelledError:
                    pass
            
            # Send shutdown signal
            self._process.terminate()
            
            # Wait for graceful shutdown
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            
        except Exception as e:
            logger.warning(f"Error stopping MCP server: {e}")
        finally:
            self._process = None
            self._state = MCPServerState.STOPPED
            self._pending_requests.clear()
            logger.info("dbt-mcp server stopped")
    
    async def _wait_for_ready(self, timeout: float = 10.0) -> None:
        """Wait for server to be ready to accept requests."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                # Send a simple ping/list request
                await self._send_request('tools/list', {})
                return
            except Exception:
                await asyncio.sleep(0.5)
        
        raise MCPConnectionError("MCP server did not become ready in time")
    
    async def _read_responses(self) -> None:
        """Background task to read server responses."""
        if not self._process or not self._process.stdout:
            return
        
        loop = asyncio.get_event_loop()
        
        while self._process and self._process.poll() is None:
            try:
                # Read line from stdout in executor to not block
                line = await loop.run_in_executor(
                    None,
                    self._process.stdout.readline
                )
                
                if not line:
                    continue
                
                line = line.strip()
                if not line:
                    continue
                
                # Parse JSON-RPC response
                try:
                    response = json.loads(line)
                    request_id = response.get('id')
                    
                    if request_id is not None and request_id in self._pending_requests:
                        future = self._pending_requests.pop(request_id)
                        if not future.done():
                            if 'error' in response:
                                future.set_exception(
                                    MCPQueryError(response['error'].get('message', 'Unknown error'))
                                )
                            else:
                                future.set_result(response.get('result'))
                                
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from MCP server: {line[:100]}")
                    
            except Exception as e:
                if self._state == MCPServerState.RUNNING:
                    logger.error(f"Error reading MCP response: {e}")
                break
    
    async def _send_request(
        self,
        method: str,
        params: Dict[str, Any],
    ) -> Any:
        """
        Send a JSON-RPC request to the MCP server.
        
        Args:
            method: MCP method name
            params: Method parameters
        
        Returns:
            Response result
        
        Raises:
            MCPQueryError: If request fails
            MCPTimeoutError: If request times out
        """
        if not self._process or not self._process.stdin:
            raise MCPConnectionError("MCP server not running")
        
        # Generate request ID
        self._request_id += 1
        request_id = self._request_id
        
        # Build JSON-RPC request
        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        }
        
        # Create future for response
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        self._pending_requests[request_id] = future
        
        try:
            # Send request
            request_line = json.dumps(request) + '\n'
            self._process.stdin.write(request_line)
            self._process.stdin.flush()
            
            # Wait for response with timeout
            return await asyncio.wait_for(future, timeout=self.timeout)
            
        except asyncio.TimeoutError:
            self._pending_requests.pop(request_id, None)
            raise MCPTimeoutError(f"Request timed out: {method}")
        except Exception as e:
            self._pending_requests.pop(request_id, None)
            raise MCPQueryError(f"Request failed: {e}")
    
    # =========================================================================
    # Model Operations
    # =========================================================================
    
    async def list_models(
        self,
        resource_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> List[MCPModel]:
        """
        List all models in the dbt project.
        
        Args:
            resource_type: Filter by type (model, source, seed, snapshot)
            tags: Filter by tags
        
        Returns:
            List of MCPModel instances
        """
        params = {}
        if resource_type:
            params['resource_type'] = resource_type
        if tags:
            params['tags'] = tags
        
        result = await self._send_request('dbt/list_models', params)
        
        models = []
        for item in result.get('models', []):
            models.append(MCPModel(
                name=item.get('name', ''),
                unique_id=item.get('unique_id', ''),
                resource_type=item.get('resource_type', 'model'),
                description=item.get('description', ''),
                schema_name=item.get('schema', ''),
                database=item.get('database', ''),
                materialization=item.get('config', {}).get('materialized', 'view'),
                columns=item.get('columns', {}),
                depends_on=item.get('depends_on', {}).get('nodes', []),
                tags=item.get('tags', []),
                meta=item.get('meta', {}),
            ))
        
        return models
    
    async def get_model(self, model_name: str) -> Optional[MCPModel]:
        """
        Get detailed information about a specific model.
        
        Args:
            model_name: Model name (e.g., 'marts.orders' or 'model.novasight.stg_salesforce__accounts')
        
        Returns:
            MCPModel instance or None if not found
        """
        result = await self._send_request('dbt/get_model', {'name': model_name})
        
        if not result or 'model' not in result:
            return None
        
        item = result['model']
        return MCPModel(
            name=item.get('name', ''),
            unique_id=item.get('unique_id', ''),
            resource_type=item.get('resource_type', 'model'),
            description=item.get('description', ''),
            schema_name=item.get('schema', ''),
            database=item.get('database', ''),
            materialization=item.get('config', {}).get('materialized', 'view'),
            columns=item.get('columns', {}),
            depends_on=item.get('depends_on', {}).get('nodes', []),
            tags=item.get('tags', []),
            meta=item.get('meta', {}),
        )
    
    async def get_model_sql(self, model_name: str) -> Optional[str]:
        """
        Get the compiled SQL for a model.
        
        Args:
            model_name: Model name
        
        Returns:
            Compiled SQL string or None
        """
        result = await self._send_request('dbt/get_model_sql', {'name': model_name})
        return result.get('sql')
    
    # =========================================================================
    # Semantic Layer Operations
    # =========================================================================
    
    async def list_metrics(self) -> List[MCPMetric]:
        """
        List all semantic layer metrics.
        
        Returns:
            List of MCPMetric instances
        """
        result = await self._send_request('semantic/list_metrics', {})
        
        metrics = []
        for item in result.get('metrics', []):
            metrics.append(MCPMetric(
                name=item.get('name', ''),
                unique_id=item.get('unique_id', ''),
                description=item.get('description', ''),
                type=item.get('type', 'simple'),
                type_params=item.get('type_params', {}),
                filter=item.get('filter'),
                dimensions=item.get('dimensions', []),
            ))
        
        return metrics
    
    async def list_dimensions(
        self,
        metric_name: Optional[str] = None,
    ) -> List[MCPDimension]:
        """
        List dimensions, optionally filtered by metric.
        
        Args:
            metric_name: Filter dimensions available for a specific metric
        
        Returns:
            List of MCPDimension instances
        """
        params = {}
        if metric_name:
            params['metric'] = metric_name
        
        result = await self._send_request('semantic/list_dimensions', params)
        
        dimensions = []
        for item in result.get('dimensions', []):
            dimensions.append(MCPDimension(
                name=item.get('name', ''),
                unique_id=item.get('unique_id', ''),
                description=item.get('description', ''),
                type=item.get('type', 'categorical'),
                expr=item.get('expr'),
                is_partition=item.get('is_partition', False),
            ))
        
        return dimensions
    
    async def query_metrics(
        self,
        metrics: List[str],
        dimensions: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ) -> MCPQueryResult:
        """
        Execute a semantic layer query.
        
        Args:
            metrics: List of metric names to query
            dimensions: List of dimension names to group by
            filters: Filter conditions as {dimension: value} or {dimension: [values]}
            order_by: Order by columns (prefix with '-' for descending)
            limit: Maximum rows to return
        
        Returns:
            MCPQueryResult with data and metadata
        
        Example:
            result = await adapter.query_metrics(
                metrics=['total_revenue', 'order_count'],
                dimensions=['order_date__month', 'customer_region'],
                filters={'customer_region': ['US', 'EU']},
                order_by=['-total_revenue'],
                limit=100
            )
        """
        params = {
            'metrics': metrics,
        }
        
        if dimensions:
            params['group_by'] = dimensions
        if filters:
            params['where'] = self._build_filter_clause(filters)
        if order_by:
            params['order_by'] = order_by
        if limit:
            params['limit'] = limit
        
        start_time = time.time()
        
        try:
            result = await self._send_request('semantic/query', params)
            execution_time = (time.time() - start_time) * 1000
            
            return MCPQueryResult(
                success=True,
                data=result.get('data', []),
                columns=result.get('columns', []),
                row_count=len(result.get('data', [])),
                query_id=result.get('query_id', ''),
                compiled_sql=result.get('sql', ''),
                execution_time_ms=execution_time,
            )
            
        except MCPError as e:
            return MCPQueryResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000,
            )
    
    async def compile_query(
        self,
        metrics: List[str],
        dimensions: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Compile a semantic query to SQL without executing.
        
        Args:
            metrics: Metrics to include
            dimensions: Dimensions to group by
            filters: Filter conditions
        
        Returns:
            Compiled SQL string
        """
        params = {
            'metrics': metrics,
            'compile_only': True,
        }
        
        if dimensions:
            params['group_by'] = dimensions
        if filters:
            params['where'] = self._build_filter_clause(filters)
        
        result = await self._send_request('semantic/query', params)
        return result.get('sql', '')
    
    def _build_filter_clause(self, filters: Dict[str, Any]) -> str:
        """Build SQL-like filter clause from dictionary."""
        conditions = []
        
        for key, value in filters.items():
            if isinstance(value, list):
                # IN clause
                quoted = [f"'{v}'" if isinstance(v, str) else str(v) for v in value]
                conditions.append(f"{key} IN ({', '.join(quoted)})")
            elif isinstance(value, dict):
                # Operator-based filter
                op = value.get('operator', '=')
                val = value.get('value')
                if isinstance(val, str):
                    val = f"'{val}'"
                conditions.append(f"{key} {op} {val}")
            else:
                # Simple equality
                if isinstance(value, str):
                    value = f"'{value}'"
                conditions.append(f"{key} = {value}")
        
        return ' AND '.join(conditions)
    
    # =========================================================================
    # Lineage Operations
    # =========================================================================
    
    async def get_lineage(
        self,
        model_name: str,
        upstream: bool = True,
        downstream: bool = True,
        depth: int = 10,
    ) -> MCPLineageGraph:
        """
        Get lineage graph for a model.
        
        Args:
            model_name: Model to get lineage for
            upstream: Include upstream dependencies
            downstream: Include downstream dependents
            depth: Maximum traversal depth
        
        Returns:
            MCPLineageGraph with nodes and edges
        """
        params = {
            'model': model_name,
            'upstream': upstream,
            'downstream': downstream,
            'depth': depth,
        }
        
        result = await self._send_request('dbt/get_lineage', params)
        
        nodes = []
        for item in result.get('nodes', []):
            nodes.append(MCPLineageNode(
                unique_id=item.get('unique_id', ''),
                name=item.get('name', ''),
                resource_type=item.get('resource_type', 'model'),
                package_name=item.get('package_name', ''),
                schema_name=item.get('schema', ''),
                database=item.get('database', ''),
            ))
        
        edges = result.get('edges', [])
        
        return MCPLineageGraph(nodes=nodes, edges=edges)
    
    async def get_full_dag(self) -> MCPLineageGraph:
        """
        Get the complete project DAG.
        
        Returns:
            MCPLineageGraph with all nodes and edges
        """
        result = await self._send_request('dbt/get_dag', {})
        
        nodes = []
        for item in result.get('nodes', []):
            nodes.append(MCPLineageNode(
                unique_id=item.get('unique_id', ''),
                name=item.get('name', ''),
                resource_type=item.get('resource_type', 'model'),
                package_name=item.get('package_name', ''),
                schema_name=item.get('schema', ''),
                database=item.get('database', ''),
            ))
        
        edges = result.get('edges', [])
        
        return MCPLineageGraph(nodes=nodes, edges=edges)
    
    # =========================================================================
    # Catalog / Metadata Operations
    # =========================================================================
    
    async def get_catalog(self) -> Dict[str, Any]:
        """
        Get the dbt catalog (column-level metadata).
        
        Returns:
            Catalog dictionary with tables and columns
        """
        result = await self._send_request('dbt/get_catalog', {})
        return result.get('catalog', {})
    
    async def get_column_metadata(
        self,
        model_name: str,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Get column metadata for a specific model.
        
        Args:
            model_name: Model to get columns for
        
        Returns:
            Dictionary of {column_name: {type, description, ...}}
        """
        result = await self._send_request('dbt/get_columns', {'model': model_name})
        return result.get('columns', {})
    
    # =========================================================================
    # Test Operations
    # =========================================================================
    
    async def list_tests(
        self,
        model_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List tests, optionally filtered by model.
        
        Args:
            model_name: Filter tests for a specific model
        
        Returns:
            List of test definitions
        """
        params = {}
        if model_name:
            params['model'] = model_name
        
        result = await self._send_request('dbt/list_tests', params)
        return result.get('tests', [])
    
    async def get_test_results(
        self,
        model_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get latest test results from run_results.json.
        
        Args:
            model_name: Filter results for a specific model
        
        Returns:
            List of test result dictionaries
        """
        params = {}
        if model_name:
            params['model'] = model_name
        
        result = await self._send_request('dbt/get_test_results', params)
        return result.get('results', [])


# ============================================================================
# Singleton / Factory Functions
# ============================================================================

_default_adapter: Optional[DbtMCPAdapter] = None


def get_mcp_adapter(
    tenant_id: Optional[str] = None,
    dbt_project_path: Optional[str] = None,
) -> DbtMCPAdapter:
    """
    Get an MCP adapter instance.
    
    Args:
        tenant_id: Tenant identifier for multi-tenant isolation
        dbt_project_path: Path to dbt project
    
    Returns:
        DbtMCPAdapter instance
    """
    global _default_adapter
    
    if tenant_id:
        return DbtMCPAdapter.get_instance(tenant_id, dbt_project_path)
    
    if _default_adapter is None:
        _default_adapter = DbtMCPAdapter(dbt_project_path)
    
    return _default_adapter


async def start_mcp_server(
    tenant_id: Optional[str] = None,
    dbt_project_path: Optional[str] = None,
) -> DbtMCPAdapter:
    """
    Start the MCP server and return the adapter.
    
    Args:
        tenant_id: Tenant identifier
        dbt_project_path: Path to dbt project
    
    Returns:
        Running DbtMCPAdapter instance
    """
    adapter = get_mcp_adapter(tenant_id, dbt_project_path)
    await adapter.start()
    return adapter
