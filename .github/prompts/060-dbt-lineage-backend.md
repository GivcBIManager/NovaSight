# 060 - dbt Model Lineage Backend

## Metadata

```yaml
prompt_id: "060"
phase: "O1"
agent: "@backend"
model: "opus 4.5"
priority: P0
estimated_effort: "2 days"
dependencies: ["018", "019"]
```

## Objective

Implement the backend API for dbt model lineage extraction and traversal.

## Task Description

Create endpoints and services to extract, store, and query model dependencies (upstream/downstream refs) from the tenant's dbt project manifest.

## Requirements

### 1. Lineage Service

```python
# backend/app/domains/transformation/application/lineage_service.py
"""
LineageService — extracts and queries model dependencies from dbt manifest.

Parses manifest.json to build a dependency graph, then provides
traversal queries for upstream/downstream lineage with configurable depth.
"""

from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from app.domains.transformation.infrastructure.tenant_dbt_project import TenantDbtProjectManager


@dataclass
class LineageNode:
    """Single node in the lineage graph."""
    unique_id: str           # e.g. "model.novasight.stg_orders"
    name: str                # e.g. "stg_orders"
    resource_type: str       # model | source | seed | snapshot
    layer: Optional[str]     # staging | intermediate | marts
    materialization: str     # view | table | incremental | ephemeral
    description: Optional[str]
    tags: List[str]
    depends_on: List[str]    # unique_ids this node depends on
    referenced_by: List[str] # unique_ids that depend on this node


@dataclass
class LineageGraph:
    """Complete lineage graph for traversal."""
    nodes: Dict[str, LineageNode]
    root_id: str
    upstream: List[LineageNode]   # ancestors (dependencies)
    downstream: List[LineageNode] # descendants (dependents)
    depth_upstream: int
    depth_downstream: int


class LineageService:
    def __init__(self, project_manager: TenantDbtProjectManager):
        self.project_manager = project_manager
        self._graph_cache: Dict[str, Dict[str, LineageNode]] = {}

    def get_lineage(
        self,
        tenant_id: str,
        model_name: str,
        upstream_depth: int = 3,
        downstream_depth: int = 3,
    ) -> LineageGraph:
        """
        Get lineage graph centered on a specific model.
        
        Args:
            tenant_id: Tenant identifier
            model_name: Name of the model (without prefix)
            upstream_depth: How many levels of dependencies to traverse
            downstream_depth: How many levels of dependents to traverse
        
        Returns:
            LineageGraph with upstream and downstream nodes
        """
        graph = self._load_or_build_graph(tenant_id)
        
        # Find the root node
        root_id = self._find_node_id(graph, model_name)
        if not root_id:
            raise ValueError(f"Model '{model_name}' not found in manifest")
        
        root_node = graph[root_id]
        
        # BFS upstream (dependencies)
        upstream = self._traverse(graph, root_id, 'depends_on', upstream_depth)
        
        # BFS downstream (dependents)
        downstream = self._traverse(graph, root_id, 'referenced_by', downstream_depth)
        
        return LineageGraph(
            nodes=graph,
            root_id=root_id,
            upstream=upstream,
            downstream=downstream,
            depth_upstream=upstream_depth,
            depth_downstream=downstream_depth,
        )

    def get_impact_analysis(
        self,
        tenant_id: str,
        model_name: str,
    ) -> Dict[str, any]:
        """
        Get impact analysis for editing a model.
        
        Returns count of downstream models, tests, and exposures affected.
        """
        graph = self._load_or_build_graph(tenant_id)
        root_id = self._find_node_id(graph, model_name)
        if not root_id:
            return {"affected_models": 0, "affected_tests": 0, "affected_exposures": 0}
        
        downstream = self._traverse(graph, root_id, 'referenced_by', depth=10)
        
        models = [n for n in downstream if n.resource_type == 'model']
        tests = [n for n in downstream if n.resource_type == 'test']
        exposures = [n for n in downstream if n.resource_type == 'exposure']
        
        return {
            "affected_models": len(models),
            "affected_tests": len(tests),
            "affected_exposures": len(exposures),
            "model_names": [m.name for m in models[:10]],  # first 10
        }

    def refresh_lineage(self, tenant_id: str) -> None:
        """Force refresh of the lineage graph from manifest."""
        if tenant_id in self._graph_cache:
            del self._graph_cache[tenant_id]
        self._load_or_build_graph(tenant_id)

    def _load_or_build_graph(self, tenant_id: str) -> Dict[str, LineageNode]:
        """Load graph from cache or build from manifest."""
        if tenant_id not in self._graph_cache:
            manifest = self.project_manager.get_manifest(tenant_id)
            self._graph_cache[tenant_id] = self._build_graph(manifest)
        return self._graph_cache[tenant_id]

    def _build_graph(self, manifest: dict) -> Dict[str, LineageNode]:
        """Build lineage graph from dbt manifest.json."""
        nodes: Dict[str, LineageNode] = {}
        
        # First pass: create all nodes
        for unique_id, node_data in manifest.get('nodes', {}).items():
            nodes[unique_id] = LineageNode(
                unique_id=unique_id,
                name=node_data.get('name', ''),
                resource_type=node_data.get('resource_type', 'model'),
                layer=self._extract_layer(node_data),
                materialization=node_data.get('config', {}).get('materialized', 'view'),
                description=node_data.get('description'),
                tags=node_data.get('tags', []),
                depends_on=node_data.get('depends_on', {}).get('nodes', []),
                referenced_by=[],  # populated in second pass
            )
        
        # Add sources
        for unique_id, source_data in manifest.get('sources', {}).items():
            nodes[unique_id] = LineageNode(
                unique_id=unique_id,
                name=f"{source_data.get('source_name')}.{source_data.get('name')}",
                resource_type='source',
                layer='source',
                materialization='external',
                description=source_data.get('description'),
                tags=source_data.get('tags', []),
                depends_on=[],
                referenced_by=[],
            )
        
        # Second pass: build referenced_by (reverse edges)
        for unique_id, node in nodes.items():
            for dep_id in node.depends_on:
                if dep_id in nodes:
                    nodes[dep_id].referenced_by.append(unique_id)
        
        return nodes

    def _extract_layer(self, node_data: dict) -> Optional[str]:
        """Extract layer from node path or config."""
        path = node_data.get('path', '')
        if 'staging' in path or path.startswith('stg_'):
            return 'staging'
        if 'intermediate' in path or path.startswith('int_'):
            return 'intermediate'
        if 'marts' in path or path.startswith('dim_') or path.startswith('fct_'):
            return 'marts'
        return node_data.get('config', {}).get('meta', {}).get('layer')

    def _find_node_id(self, graph: Dict[str, LineageNode], model_name: str) -> Optional[str]:
        """Find node unique_id by model name."""
        for unique_id, node in graph.items():
            if node.name == model_name:
                return unique_id
        return None

    def _traverse(
        self,
        graph: Dict[str, LineageNode],
        start_id: str,
        direction: str,  # 'depends_on' or 'referenced_by'
        depth: int,
    ) -> List[LineageNode]:
        """BFS traversal in the specified direction."""
        visited: Set[str] = {start_id}
        result: List[LineageNode] = []
        frontier = [start_id]
        
        for _ in range(depth):
            next_frontier = []
            for node_id in frontier:
                node = graph.get(node_id)
                if not node:
                    continue
                neighbors = getattr(node, direction, [])
                for neighbor_id in neighbors:
                    if neighbor_id not in visited and neighbor_id in graph:
                        visited.add(neighbor_id)
                        result.append(graph[neighbor_id])
                        next_frontier.append(neighbor_id)
            frontier = next_frontier
            if not frontier:
                break
        
        return result
```

### 2. Lineage API Routes

```python
# backend/app/domains/transformation/api/lineage_routes.py
"""
Lineage API endpoints.

GET /api/v1/dbt/lineage/<model_name>
GET /api/v1/dbt/lineage/<model_name>/impact
POST /api/v1/dbt/lineage/refresh
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.decorators import require_tenant_context, require_roles
from app.domains.transformation.application.lineage_service import LineageService
from app.domains.transformation.infrastructure.tenant_dbt_project import get_project_manager

lineage_bp = Blueprint('lineage', __name__, url_prefix='/api/v1/dbt/lineage')


def get_lineage_service() -> LineageService:
    return LineageService(get_project_manager())


@lineage_bp.route('/<model_name>', methods=['GET'])
@jwt_required()
@require_tenant_context
@require_roles(['tenant_admin', 'data_engineer', 'analyst'])
def get_model_lineage(model_name: str):
    """
    Get lineage graph for a model.
    
    Query params:
        upstream_depth: int (default 3)
        downstream_depth: int (default 3)
    
    Returns:
        {
            "root": { ...node },
            "upstream": [ ...nodes ],
            "downstream": [ ...nodes ],
            "edges": [ { source, target } ]
        }
    """
    from flask import g
    tenant_id = g.tenant_id
    
    upstream_depth = request.args.get('upstream_depth', 3, type=int)
    downstream_depth = request.args.get('downstream_depth', 3, type=int)
    
    service = get_lineage_service()
    graph = service.get_lineage(
        tenant_id=tenant_id,
        model_name=model_name,
        upstream_depth=upstream_depth,
        downstream_depth=downstream_depth,
    )
    
    # Serialize for frontend
    root_node = graph.nodes[graph.root_id]
    
    # Build edge list for ReactFlow
    edges = []
    all_nodes = [root_node] + graph.upstream + graph.downstream
    node_ids = {n.unique_id for n in all_nodes}
    
    for node in all_nodes:
        for dep_id in node.depends_on:
            if dep_id in node_ids:
                edges.append({"source": dep_id, "target": node.unique_id})
    
    return jsonify({
        "root": _serialize_node(root_node),
        "upstream": [_serialize_node(n) for n in graph.upstream],
        "downstream": [_serialize_node(n) for n in graph.downstream],
        "edges": edges,
    })


@lineage_bp.route('/<model_name>/impact', methods=['GET'])
@jwt_required()
@require_tenant_context
@require_roles(['tenant_admin', 'data_engineer', 'analyst'])
def get_impact_analysis(model_name: str):
    """
    Get impact analysis for editing a model.
    
    Returns:
        {
            "affected_models": int,
            "affected_tests": int,
            "affected_exposures": int,
            "model_names": [str]
        }
    """
    from flask import g
    tenant_id = g.tenant_id
    
    service = get_lineage_service()
    impact = service.get_impact_analysis(tenant_id, model_name)
    
    return jsonify(impact)


@lineage_bp.route('/refresh', methods=['POST'])
@jwt_required()
@require_tenant_context
@require_roles(['tenant_admin', 'data_engineer'])
def refresh_lineage():
    """Force refresh lineage graph from latest manifest."""
    from flask import g
    tenant_id = g.tenant_id
    
    service = get_lineage_service()
    service.refresh_lineage(tenant_id)
    
    return jsonify({"status": "refreshed"})


def _serialize_node(node) -> dict:
    return {
        "id": node.unique_id,
        "name": node.name,
        "resource_type": node.resource_type,
        "layer": node.layer,
        "materialization": node.materialization,
        "description": node.description,
        "tags": node.tags,
    }
```

### 3. Register Blueprint

Add to `backend/app/domains/transformation/api/__init__.py`:

```python
from .lineage_routes import lineage_bp

def register_transformation_routes(app):
    # ... existing registrations ...
    app.register_blueprint(lineage_bp)
```

## Acceptance Criteria

- [ ] `GET /api/v1/dbt/lineage/<model_name>` returns upstream/downstream nodes and edges
- [ ] `GET /api/v1/dbt/lineage/<model_name>/impact` returns affected counts
- [ ] `POST /api/v1/dbt/lineage/refresh` clears cache and rebuilds from manifest
- [ ] Graph includes sources, models, tests, exposures
- [ ] Depth parameters limit traversal correctly
- [ ] No TypeScript/Python errors

## Testing

```bash
# Test lineage endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/v1/dbt/lineage/stg_orders?upstream_depth=2&downstream_depth=3"

# Test impact analysis
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/v1/dbt/lineage/stg_orders/impact"
```
