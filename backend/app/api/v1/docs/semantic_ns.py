"""
Semantic Layer API Namespace
=============================

Flask-RESTX namespace for semantic layer endpoint documentation.
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.platform.auth.decorators import authenticated, tenant_required, require_permission
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'semantic',
    description='Semantic layer management - dimensions, measures, and models',
    decorators=[jwt_required()]
)

# Define models
dimension_create = ns.model('DimensionCreate', {
    'name': fields.String(required=True, description='Dimension name', example='region'),
    'label': fields.String(description='Display label', example='Region'),
    'description': fields.String(description='Dimension description'),
    'type': fields.String(
        enum=['string', 'number', 'date', 'datetime', 'boolean', 'time'],
        description='Data type',
        example='string'
    ),
    'expression': fields.String(description='SQL expression'),
    'hidden': fields.Boolean(default=False, description='Hide from UI'),
})

measure_create = ns.model('MeasureCreate', {
    'name': fields.String(required=True, description='Measure name', example='total_revenue'),
    'label': fields.String(description='Display label', example='Total Revenue'),
    'description': fields.String(description='Measure description'),
    'type': fields.String(
        required=True,
        enum=['sum', 'count', 'count_distinct', 'avg', 'min', 'max', 'median'],
        description='Aggregation type',
        example='sum'
    ),
    'expression': fields.String(required=True, description='SQL expression', example='SUM(amount)'),
    'format': fields.String(description='Display format', example='$,.2f'),
    'hidden': fields.Boolean(default=False, description='Hide from UI'),
})

dimension_response = ns.model('Dimension', {
    'id': fields.String(description='Dimension UUID'),
    'name': fields.String(),
    'label': fields.String(),
    'description': fields.String(),
    'type': fields.String(),
    'expression': fields.String(),
    'hidden': fields.Boolean(),
    'created_at': fields.DateTime(),
})

measure_response = ns.model('Measure', {
    'id': fields.String(description='Measure UUID'),
    'name': fields.String(),
    'label': fields.String(),
    'description': fields.String(),
    'type': fields.String(),
    'expression': fields.String(),
    'format': fields.String(),
    'hidden': fields.Boolean(),
    'created_at': fields.DateTime(),
})

model_create = ns.model('SemanticModelCreate', {
    'name': fields.String(required=True, description='Model name', example='sales'),
    'dbt_model': fields.String(required=True, description='Reference to dbt model', example='sales_facts'),
    'label': fields.String(description='Human-readable label', example='Sales'),
    'description': fields.String(description='Model description'),
    'model_type': fields.String(
        enum=['fact', 'dimension', 'aggregate'],
        description='Model type',
        example='fact'
    ),
    'cache_enabled': fields.Boolean(default=True, description='Enable query caching'),
    'cache_ttl_seconds': fields.Integer(description='Cache TTL in seconds', example=3600),
    'tags': fields.List(fields.String, description='Tags'),
    'meta': fields.Raw(description='Additional metadata'),
})

model_response = ns.model('SemanticModel', {
    'id': fields.String(description='Model UUID'),
    'name': fields.String(),
    'label': fields.String(),
    'description': fields.String(),
    'model_type': fields.String(),
    'dbt_model': fields.String(),
    'cache_enabled': fields.Boolean(),
    'cache_ttl_seconds': fields.Integer(),
    'is_active': fields.Boolean(),
    'dimensions_count': fields.Integer(),
    'measures_count': fields.Integer(),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

model_detail = ns.model('SemanticModelDetail', {
    'id': fields.String(description='Model UUID'),
    'name': fields.String(),
    'label': fields.String(),
    'description': fields.String(),
    'model_type': fields.String(),
    'dbt_model': fields.String(),
    'cache_enabled': fields.Boolean(),
    'cache_ttl_seconds': fields.Integer(),
    'is_active': fields.Boolean(),
    'dimensions': fields.List(fields.Nested(dimension_response)),
    'measures': fields.List(fields.Nested(measure_response)),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

relationship_create = ns.model('RelationshipCreate', {
    'from_model_id': fields.String(required=True, description='Source model UUID'),
    'to_model_id': fields.String(required=True, description='Target model UUID'),
    'from_column': fields.String(required=True, description='Source join column'),
    'to_column': fields.String(required=True, description='Target join column'),
    'relationship_type': fields.String(
        required=True,
        enum=['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many'],
        description='Relationship cardinality'
    ),
    'description': fields.String(description='Relationship description'),
})

relationship_response = ns.model('Relationship', {
    'id': fields.String(),
    'from_model_id': fields.String(),
    'from_model_name': fields.String(),
    'to_model_id': fields.String(),
    'to_model_name': fields.String(),
    'from_column': fields.String(),
    'to_column': fields.String(),
    'relationship_type': fields.String(),
    'description': fields.String(),
    'created_at': fields.DateTime(),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


@ns.route('/models')
class SemanticModelList(Resource):
    @ns.doc('list_semantic_models', security='Bearer')
    @ns.param('include_inactive', 'Include inactive models', type=bool, default=False)
    @ns.param('model_type', 'Filter by type (fact, dimension, aggregate)', type=str)
    @ns.marshal_list_with(model_response)
    @ns.response(401, 'Unauthorized', error_response)
    @tenant_required
    def get(self):
        """
        List all semantic models for the current tenant.
        
        Returns a list of semantic models with dimension and measure counts.
        Use the detail endpoint for full dimension/measure definitions.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        model_type = request.args.get('model_type')
        
        models = SemanticService.list_models(
            tenant_id=tenant_id,
            include_inactive=include_inactive,
            model_type=model_type,
        )
        
        result = []
        for model in models:
            model_dict = model.to_dict()
            model_dict['dimensions_count'] = model.dimensions.count()
            model_dict['measures_count'] = model.measures.count()
            result.append(model_dict)
        
        return result
    
    @ns.doc('create_semantic_model', security='Bearer')
    @ns.expect(model_create, validate=True)
    @ns.marshal_with(model_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @tenant_required
    def post(self):
        """
        Create a new semantic model.
        
        Creates a semantic model that wraps a dbt model and allows
        defining dimensions, measures, and relationships.
        
        **Permissions Required:** `semantic:create`
        """
        from app.domains.transformation.application.semantic_service import SemanticService, SemanticServiceError
        from pydantic import ValidationError
        from app.domains.transformation.schemas.semantic_schemas import SemanticModelCreateSchema
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        try:
            data = SemanticModelCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        try:
            model = SemanticService.create_model(
                tenant_id=tenant_id,
                **data.dict(exclude_none=True),
            )
            return model.to_dict(), 201
        except SemanticServiceError as e:
            return {"error": str(e)}, 400


@ns.route('/models/<uuid:model_id>')
@ns.param('model_id', 'Semantic model UUID')
class SemanticModelDetail(Resource):
    @ns.doc('get_semantic_model', security='Bearer')
    @ns.marshal_with(model_detail)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(404, 'Model not found', error_response)
    @tenant_required
    def get(self, model_id):
        """
        Get a semantic model with full details.
        
        Returns the model including all dimensions and measures.
        """
        from app.domains.transformation.application.semantic_service import SemanticService, ModelNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        try:
            model = SemanticService.get_model(str(model_id), tenant_id)
            result = model.to_dict()
            result['dimensions'] = [d.to_dict() for d in model.dimensions]
            result['measures'] = [m.to_dict() for m in model.measures]
            return result
        except ModelNotFoundError:
            return {"error": "Model not found"}, 404
    
    @ns.doc('delete_semantic_model', security='Bearer')
    @ns.response(204, 'Model deleted')
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(404, 'Model not found', error_response)
    @tenant_required
    def delete(self, model_id):
        """
        Delete a semantic model.
        
        **Warning:** This also deletes all dimensions, measures,
        and relationships defined on this model.
        """
        from app.domains.transformation.application.semantic_service import SemanticService, ModelNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        try:
            SemanticService.delete_model(str(model_id), tenant_id)
            return '', 204
        except ModelNotFoundError:
            return {"error": "Model not found"}, 404


@ns.route('/models/<uuid:model_id>/dimensions')
@ns.param('model_id', 'Semantic model UUID')
class DimensionList(Resource):
    @ns.doc('list_dimensions', security='Bearer')
    @ns.marshal_list_with(dimension_response)
    @tenant_required
    def get(self, model_id):
        """
        List all dimensions for a semantic model.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        
        dimensions = SemanticService.list_dimensions(str(model_id))
        return [d.to_dict() for d in dimensions]
    
    @ns.doc('create_dimension', security='Bearer')
    @ns.expect(dimension_create, validate=True)
    @ns.marshal_with(dimension_response, code=201)
    @tenant_required
    def post(self, model_id):
        """
        Add a dimension to a semantic model.
        
        Dimensions represent categorical data that can be used
        to slice and filter measures.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        from app.domains.transformation.schemas.semantic_schemas import DimensionCreateSchema
        from pydantic import ValidationError
        
        try:
            data = DimensionCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        dimension = SemanticService.create_dimension(
            model_id=str(model_id),
            **data.dict(exclude_none=True),
        )
        return dimension.to_dict(), 201


@ns.route('/models/<uuid:model_id>/measures')
@ns.param('model_id', 'Semantic model UUID')
class MeasureList(Resource):
    @ns.doc('list_measures', security='Bearer')
    @ns.marshal_list_with(measure_response)
    @tenant_required
    def get(self, model_id):
        """
        List all measures for a semantic model.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        
        measures = SemanticService.list_measures(str(model_id))
        return [m.to_dict() for m in measures]
    
    @ns.doc('create_measure', security='Bearer')
    @ns.expect(measure_create, validate=True)
    @ns.marshal_with(measure_response, code=201)
    @tenant_required
    def post(self, model_id):
        """
        Add a measure to a semantic model.
        
        Measures represent aggregated numeric values (sum, count, avg, etc.)
        that can be computed across dimensions.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        from app.domains.transformation.schemas.semantic_schemas import MeasureCreateSchema
        from pydantic import ValidationError
        
        try:
            data = MeasureCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        measure = SemanticService.create_measure(
            model_id=str(model_id),
            **data.dict(exclude_none=True),
        )
        return measure.to_dict(), 201


@ns.route('/relationships')
class RelationshipList(Resource):
    @ns.doc('list_relationships', security='Bearer')
    @ns.marshal_list_with(relationship_response)
    @tenant_required
    def get(self):
        """
        List all relationships between semantic models.
        
        Relationships define how models can be joined together
        for multi-model queries.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        relationships = SemanticService.list_relationships(tenant_id)
        return [r.to_dict() for r in relationships]
    
    @ns.doc('create_relationship', security='Bearer')
    @ns.expect(relationship_create, validate=True)
    @ns.marshal_with(relationship_response, code=201)
    @tenant_required
    def post(self):
        """
        Create a relationship between two semantic models.
        
        Defines how models can be joined, enabling cross-model queries
        and automatic join path resolution.
        """
        from app.domains.transformation.application.semantic_service import SemanticService
        from app.domains.transformation.schemas.semantic_schemas import RelationshipCreateSchema
        from pydantic import ValidationError
        
        try:
            data = RelationshipCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        relationship = SemanticService.create_relationship(**data.dict())
        return relationship.to_dict(), 201
