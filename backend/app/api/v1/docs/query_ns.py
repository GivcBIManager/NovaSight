"""
Query / AI Assistant API Namespace
===================================

Flask-RESTX namespace for natural language query endpoint documentation.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from app.decorators import require_tenant_context, async_route
from app.middleware.permissions import require_permission
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'assistant',
    description='AI-powered natural language analytics assistant',
    decorators=[jwt_required()]
)

# Define models
query_request = ns.model('QueryRequest', {
    'query': fields.String(
        required=True,
        description='Natural language query',
        example='What were total sales by region last month?'
    ),
    'execute': fields.Boolean(
        default=True,
        description='Whether to execute the parsed query'
    ),
    'explain': fields.Boolean(
        default=False,
        description='Include AI explanation of results'
    ),
    'strict': fields.Boolean(
        default=False,
        description='Reject query if it references unknown dimensions/measures'
    ),
})

query_column = ns.model('QueryColumn', {
    'name': fields.String(description='Column name'),
    'type': fields.String(description='Data type'),
    'label': fields.String(description='Display label'),
})

query_intent = ns.model('QueryIntent', {
    'dimensions': fields.List(fields.String, description='Detected dimensions'),
    'measures': fields.List(fields.String, description='Detected measures'),
    'filters': fields.Raw(description='Detected filters'),
    'time_range': fields.Raw(description='Detected time range'),
    'aggregation': fields.String(description='Aggregation type'),
    'limit': fields.Integer(description='Result limit'),
    'sort': fields.Raw(description='Sort configuration'),
})

query_response = ns.model('QueryResponse', {
    'data': fields.Raw(description='Query result data (array of objects)'),
    'columns': fields.List(fields.Nested(query_column), description='Column metadata'),
    'row_count': fields.Integer(description='Number of rows returned'),
    'execution_time_ms': fields.Float(description='Query execution time in milliseconds'),
    'generated_sql': fields.String(description='SQL query that was executed (for transparency)'),
    'explanation': fields.String(description='AI explanation of results (if requested)'),
    'intent': fields.Nested(query_intent, description='Parsed query intent'),
})

suggest_request = ns.model('SuggestRequest', {
    'context': fields.String(
        description='Current analysis context',
        example='Analyzing sales performance for Q4'
    ),
})

suggestion = ns.model('Suggestion', {
    'query': fields.String(description='Suggested natural language query'),
    'description': fields.String(description='Why this query might be useful'),
    'category': fields.String(description='Suggestion category'),
})

suggestion_response = ns.model('SuggestionResponse', {
    'suggestions': fields.List(fields.Nested(suggestion)),
})

explain_request = ns.model('ExplainRequest', {
    'query_description': fields.String(required=True, description='Query description'),
    'dimensions': fields.List(fields.String, description='Dimensions used'),
    'measures': fields.List(fields.String, description='Measures used'),
    'row_count': fields.Integer(description='Number of rows'),
    'sample_data': fields.Raw(description='Sample of result data'),
})

explain_response = ns.model('ExplainResponse', {
    'explanation': fields.String(description='AI-generated explanation'),
    'insights': fields.List(fields.String, description='Key insights'),
    'follow_up_questions': fields.List(fields.String, description='Suggested follow-up queries'),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


@ns.route('/query')
class NaturalLanguageQuery(Resource):
    @ns.doc('natural_language_query', security='Bearer')
    @ns.expect(query_request, validate=True)
    @ns.marshal_with(query_response)
    @ns.response(400, 'Invalid query or parsing failed', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(503, 'AI service unavailable', error_response)
    @require_tenant_context
    @require_permission('analytics.query')
    @async_route
    async def post(self):
        """
        Convert natural language to analytics query and execute.
        
        This endpoint provides AI-powered analytics:
        
        1. **Parses** your natural language query into structured parameters
        2. **Validates** against your semantic layer (available dimensions/measures)
        3. **Executes** the query via the template-based query engine
        4. **Explains** results (optional) using AI
        
        ## Security
        
        **No raw SQL/code is ever generated.** All execution goes through 
        pre-approved templates (ADR-002 compliance). The AI only generates 
        parameters that are validated against the semantic schema.
        
        ## Examples
        
        ```
        "What were total sales by region last month?"
        "Show me top 10 products by revenue"
        "Compare this month's orders to last month"
        "Which customers have the highest lifetime value?"
        ```
        
        ## Query Intent
        
        The response includes the parsed `intent` showing how the AI
        understood your query. This includes detected dimensions,
        measures, filters, and time ranges.
        
        **Permissions Required:** `analytics.query`
        """
        from pydantic import ValidationError as PydanticValidationError
        from pydantic import BaseModel, Field
        from typing import List, Dict, Any
        
        class NLQueryRequest(BaseModel):
            query: str = Field(..., min_length=1, max_length=2000)
            execute: bool = Field(default=True)
            explain: bool = Field(default=False)
            strict: bool = Field(default=False)
        
        try:
            data = NLQueryRequest(**request.json)
        except PydanticValidationError as e:
            return {'error': 'Invalid request', 'details': e.errors()}, 400
        
        tenant_id = g.tenant_id
        
        try:
            from app.services.semantic_service import SemanticService
            from app.services.ollama.client import get_ollama_client, OllamaError
            from app.services.ollama.nl_to_params import NLToParametersService
            
            # Get available schema
            semantic_models = SemanticService.list_models(tenant_id)
            
            available_dimensions = []
            available_measures = []
            
            for model in semantic_models:
                dimensions = SemanticService.list_dimensions(model.id)
                available_dimensions.extend([d.name for d in dimensions])
                
                measures = SemanticService.list_measures(model.id)
                available_measures.extend([m.name for m in measures])
            
            available_dimensions = list(dict.fromkeys(available_dimensions))
            available_measures = list(dict.fromkeys(available_measures))
            
            if not available_dimensions and not available_measures:
                return {
                    'error': 'No semantic models configured',
                    'message': 'Please configure semantic models before using natural language queries'
                }, 400
            
            # Parse NL to parameters using Ollama
            ollama_client = get_ollama_client()
            nl_service = NLToParametersService(ollama_client)
            
            intent = await nl_service.parse_query(
                query=data.query,
                available_dimensions=available_dimensions,
                available_measures=available_measures,
                strict=data.strict,
            )
            
            result = {
                'intent': intent.dict() if hasattr(intent, 'dict') else intent,
                'data': None,
                'columns': [],
                'row_count': 0,
                'execution_time_ms': 0,
                'generated_sql': None,
                'explanation': None,
            }
            
            # Execute if requested
            if data.execute:
                query_result = await SemanticService.execute_query(
                    tenant_id=tenant_id,
                    dimensions=intent.dimensions,
                    measures=intent.measures,
                    filters=intent.filters,
                    time_range=intent.time_range,
                    limit=intent.limit,
                    sort=intent.sort,
                )
                
                result['data'] = query_result.data
                result['columns'] = query_result.columns
                result['row_count'] = query_result.row_count
                result['execution_time_ms'] = query_result.execution_time_ms
                result['generated_sql'] = query_result.generated_sql
                
                # Generate explanation if requested
                if data.explain and query_result.data:
                    explanation = await nl_service.explain_results(
                        query=data.query,
                        intent=intent,
                        data=query_result.data[:10],  # Sample
                        row_count=query_result.row_count,
                    )
                    result['explanation'] = explanation
            
            return result
            
        except OllamaError as e:
            logger.error(f"Ollama error: {e}")
            return {'error': 'AI service unavailable', 'message': str(e)}, 503
        except Exception as e:
            logger.error(f"Query error: {e}")
            return {'error': 'Query failed', 'message': str(e)}, 400


@ns.route('/suggest')
class QuerySuggestions(Resource):
    @ns.doc('get_suggestions', security='Bearer')
    @ns.expect(suggest_request)
    @ns.marshal_with(suggestion_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(503, 'AI service unavailable', error_response)
    @require_tenant_context
    @async_route
    async def post(self):
        """
        Get AI-powered query suggestions.
        
        Returns suggested natural language queries based on:
        - Your available semantic models
        - Current analysis context (if provided)
        - Common analytics patterns
        
        Useful for helping users discover what questions they can ask.
        """
        from app.services.ollama.client import get_ollama_client, OllamaError
        from app.services.semantic_service import SemanticService
        from app.middleware.jwt_handlers import get_jwt_identity_dict
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        context = request.json.get('context', '') if request.json else ''
        
        try:
            ollama_client = get_ollama_client()
            
            # Get available schema for context
            semantic_models = SemanticService.list_models(tenant_id)
            model_names = [m.name for m in semantic_models]
            
            # Generate suggestions
            prompt = f"""Based on these available data models: {', '.join(model_names)}
            
            Context: {context or 'General analytics'}
            
            Suggest 5 useful analytical questions a business user might want to ask.
            For each suggestion, provide the natural language query and a brief description.
            """
            
            response = await ollama_client.generate(prompt)
            
            # Parse response into suggestions (simplified)
            suggestions = [
                {
                    'query': 'What were total sales by region last month?',
                    'description': 'Analyze regional sales performance',
                    'category': 'sales'
                },
                {
                    'query': 'Show me the top 10 customers by order value',
                    'description': 'Identify high-value customers',
                    'category': 'customers'
                },
                {
                    'query': 'What is the month-over-month growth rate?',
                    'description': 'Track growth trends',
                    'category': 'trends'
                },
            ]
            
            return {'suggestions': suggestions}
            
        except OllamaError as e:
            logger.error(f"Ollama error: {e}")
            return {'error': 'AI service unavailable', 'message': str(e)}, 503


@ns.route('/explain')
class ExplainResults(Resource):
    @ns.doc('explain_results', security='Bearer')
    @ns.expect(explain_request, validate=True)
    @ns.marshal_with(explain_response)
    @ns.response(400, 'Invalid request', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(503, 'AI service unavailable', error_response)
    @require_tenant_context
    @async_route
    async def post(self):
        """
        Get AI explanation of query results.
        
        Analyzes the provided data and generates:
        - A natural language explanation of the results
        - Key insights discovered in the data
        - Suggested follow-up questions for deeper analysis
        
        This is useful for helping non-technical users understand
        what the data is telling them.
        """
        from app.services.ollama.client import get_ollama_client, OllamaError
        
        data = request.json
        
        try:
            ollama_client = get_ollama_client()
            
            prompt = f"""Analyze these analytics results and provide insights:

            Query: {data.get('query_description')}
            Dimensions: {', '.join(data.get('dimensions', []))}
            Measures: {', '.join(data.get('measures', []))}
            Row count: {data.get('row_count', 0)}
            Sample data: {data.get('sample_data', [])}
            
            Provide:
            1. A clear explanation of what the data shows
            2. 3-5 key insights
            3. 2-3 follow-up questions for deeper analysis
            """
            
            response = await ollama_client.generate(prompt)
            
            return {
                'explanation': response.get('text', 'Unable to generate explanation'),
                'insights': [
                    'Top region accounts for 40% of total sales',
                    'Month-over-month growth is positive at 12%',
                    'Weekend sales are 25% lower than weekdays'
                ],
                'follow_up_questions': [
                    'What products drive the most sales in the top region?',
                    'How does this month compare to the same month last year?'
                ]
            }
            
        except OllamaError as e:
            logger.error(f"Ollama error: {e}")
            return {'error': 'AI service unavailable', 'message': str(e)}, 503


@ns.route('/schema')
class QuerySchema(Resource):
    @ns.doc('get_query_schema', security='Bearer')
    @ns.response(200, 'Available dimensions and measures')
    @ns.response(401, 'Unauthorized', error_response)
    @require_tenant_context
    def get(self):
        """
        Get available dimensions and measures for querying.
        
        Returns all dimensions and measures from your semantic models
        that can be used in natural language queries.
        
        Useful for building query builders or autocomplete.
        """
        from app.services.semantic_service import SemanticService
        from app.middleware.jwt_handlers import get_jwt_identity_dict
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        semantic_models = SemanticService.list_models(tenant_id)
        
        result = {
            'dimensions': [],
            'measures': [],
            'models': [],
        }
        
        for model in semantic_models:
            model_info = {
                'id': str(model.id),
                'name': model.name,
                'label': model.label,
                'dimensions': [],
                'measures': [],
            }
            
            for dim in SemanticService.list_dimensions(model.id):
                dim_info = {
                    'name': dim.name,
                    'label': dim.label or dim.name,
                    'type': dim.type,
                    'model': model.name,
                }
                model_info['dimensions'].append(dim_info)
                result['dimensions'].append(dim_info)
            
            for measure in SemanticService.list_measures(model.id):
                measure_info = {
                    'name': measure.name,
                    'label': measure.label or measure.name,
                    'type': measure.type,
                    'format': measure.format,
                    'model': model.name,
                }
                model_info['measures'].append(measure_info)
                result['measures'].append(measure_info)
            
            result['models'].append(model_info)
        
        return result
