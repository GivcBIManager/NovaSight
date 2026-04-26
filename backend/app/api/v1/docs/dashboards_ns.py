"""
Dashboards API Namespace
=========================

Flask-RESTX namespace for dashboard and widget endpoint documentation.
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.platform.auth.decorators import authenticated, tenant_required, require_permission
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'dashboards',
    description='Dashboard and widget management',
    decorators=[jwt_required()]
)

# Define models
grid_position = ns.model('GridPosition', {
    'x': fields.Integer(required=True, min=0, max=11, description='X position (0-11)'),
    'y': fields.Integer(required=True, min=0, description='Y position'),
    'w': fields.Integer(required=True, min=1, max=12, description='Width (1-12)'),
    'h': fields.Integer(required=True, min=1, description='Height'),
})

widget_create = ns.model('WidgetCreate', {
    'name': fields.String(required=True, description='Widget name', example='Sales by Region'),
    'widget_type': fields.String(
        required=True,
        enum=['metric_card', 'line_chart', 'bar_chart', 'pie_chart', 'table', 'heatmap', 'scatter', 'area'],
        description='Widget type'
    ),
    'semantic_model_id': fields.String(description='Semantic model UUID'),
    'dimensions': fields.List(fields.String, description='Selected dimensions'),
    'measures': fields.List(fields.String, description='Selected measures'),
    'filters': fields.Raw(description='Widget-specific filters'),
    'viz_config': fields.Raw(description='Visualization configuration'),
    'grid_position': fields.Nested(grid_position, description='Position on dashboard grid'),
})

widget_response = ns.model('Widget', {
    'id': fields.String(description='Widget UUID'),
    'dashboard_id': fields.String(description='Parent dashboard UUID'),
    'name': fields.String(),
    'widget_type': fields.String(),
    'semantic_model_id': fields.String(),
    'dimensions': fields.List(fields.String),
    'measures': fields.List(fields.String),
    'filters': fields.Raw(),
    'viz_config': fields.Raw(),
    'grid_position': fields.Raw(),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

dashboard_theme = ns.model('DashboardTheme', {
    'primary_color': fields.String(description='Primary color', example='#3B82F6'),
    'background_color': fields.String(description='Background color', example='#FFFFFF'),
    'font_family': fields.String(description='Font family', example='Inter'),
})

dashboard_create = ns.model('DashboardCreate', {
    'name': fields.String(required=True, description='Dashboard name', example='Sales Dashboard'),
    'description': fields.String(description='Dashboard description'),
    'is_public': fields.Boolean(default=False, description='Public visibility within tenant'),
    'layout': fields.Raw(description='Layout configuration'),
    'global_filters': fields.Raw(description='Global filter settings'),
    'auto_refresh': fields.Boolean(default=False, description='Enable auto-refresh'),
    'refresh_interval': fields.Integer(description='Refresh interval in seconds', example=300),
    'theme': fields.Nested(dashboard_theme),
    'tags': fields.List(fields.String, description='Dashboard tags'),
})

dashboard_update = ns.model('DashboardUpdate', {
    'name': fields.String(description='Dashboard name'),
    'description': fields.String(description='Dashboard description'),
    'is_public': fields.Boolean(description='Public visibility'),
    'layout': fields.Raw(description='Layout configuration'),
    'global_filters': fields.Raw(description='Global filter settings'),
    'auto_refresh': fields.Boolean(description='Enable auto-refresh'),
    'refresh_interval': fields.Integer(description='Refresh interval in seconds'),
    'theme': fields.Nested(dashboard_theme),
    'tags': fields.List(fields.String, description='Dashboard tags'),
})

dashboard_response = ns.model('Dashboard', {
    'id': fields.String(description='Dashboard UUID'),
    'name': fields.String(),
    'description': fields.String(),
    'is_public': fields.Boolean(),
    'layout': fields.Raw(),
    'global_filters': fields.Raw(),
    'auto_refresh': fields.Boolean(),
    'refresh_interval': fields.Integer(),
    'theme': fields.Raw(),
    'tags': fields.List(fields.String),
    'owner_id': fields.String(),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

dashboard_detail = ns.model('DashboardDetail', {
    'id': fields.String(description='Dashboard UUID'),
    'name': fields.String(),
    'description': fields.String(),
    'is_public': fields.Boolean(),
    'layout': fields.Raw(),
    'global_filters': fields.Raw(),
    'auto_refresh': fields.Boolean(),
    'refresh_interval': fields.Integer(),
    'theme': fields.Raw(),
    'tags': fields.List(fields.String),
    'owner_id': fields.String(),
    'widgets': fields.List(fields.Nested(widget_response)),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

dashboard_share = ns.model('DashboardShare', {
    'user_ids': fields.List(fields.String, description='User UUIDs to share with'),
    'role_ids': fields.List(fields.String, description='Role UUIDs to share with'),
    'permission': fields.String(
        enum=['view', 'edit'],
        description='Permission level',
        example='view'
    ),
})

layout_update = ns.model('LayoutUpdate', {
    'widgets': fields.List(fields.Raw, description='Widget positions', required=True),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


@ns.route('')
class DashboardList(Resource):
    @ns.doc('list_dashboards', security='Bearer')
    @ns.param('include_shared', 'Include shared dashboards', type=bool, default=True)
    @ns.param('include_public', 'Include public dashboards', type=bool, default=True)
    @ns.param('tags', 'Filter by tags (comma-separated)', type=str)
    @ns.param('search', 'Search in name/description', type=str)
    @ns.param('limit', 'Maximum results', type=int, default=50)
    @ns.param('offset', 'Pagination offset', type=int, default=0)
    @ns.marshal_list_with(dashboard_response)
    @ns.response(401, 'Unauthorized', error_response)
    @tenant_required
    @require_permission('dashboards.view')
    def get(self):
        """
        List all accessible dashboards.
        
        Returns dashboards the user owns, has been shared with,
        or are public within the tenant.
        
        **Permissions Required:** `dashboards.view`
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        include_shared = request.args.get('include_shared', 'true').lower() == 'true'
        include_public = request.args.get('include_public', 'true').lower() == 'true'
        tags = request.args.get('tags', '').split(',') if request.args.get('tags') else None
        search = request.args.get('search')
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        
        dashboards = DashboardService.list_for_user(
            tenant_id=tenant_id,
            user_id=user_id,
            include_shared=include_shared,
            include_public=include_public,
            tags=tags,
            search=search,
            limit=limit,
            offset=offset,
        )
        
        return [d.to_dict(include_widgets=False) for d in dashboards]
    
    @ns.doc('create_dashboard', security='Bearer')
    @ns.expect(dashboard_create, validate=True)
    @ns.marshal_with(dashboard_detail, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @tenant_required
    @require_permission('dashboards.create')
    def post(self):
        """
        Create a new dashboard.
        
        Creates an empty dashboard that can have widgets added.
        The creator becomes the owner.
        
        **Permissions Required:** `dashboards.create`
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        from app.domains.analytics.schemas.dashboard_schemas import DashboardCreateSchema
        from pydantic import ValidationError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            data = DashboardCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        dashboard = DashboardService.create(
            tenant_id=tenant_id,
            created_by=user_id,
            name=data.name,
            description=data.description,
            layout=data.layout,
            is_public=data.is_public,
            global_filters=data.global_filters,
            auto_refresh=data.auto_refresh,
            refresh_interval=data.refresh_interval,
            theme=data.theme.dict() if data.theme else None,
            tags=data.tags,
        )
        
        return dashboard.to_dict(include_widgets=True), 201


@ns.route('/<uuid:dashboard_id>')
@ns.param('dashboard_id', 'Dashboard UUID')
class DashboardDetail(Resource):
    @ns.doc('get_dashboard', security='Bearer')
    @ns.marshal_with(dashboard_detail)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Dashboard not found', error_response)
    @tenant_required
    @require_permission('dashboards.view')
    def get(self, dashboard_id):
        """
        Get dashboard with all widgets.
        
        Returns the complete dashboard configuration including
        all widget definitions and their positions.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, DashboardNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            dashboard = DashboardService.get(
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return dashboard.to_dict(include_widgets=True)
        except DashboardNotFoundError:
            return {"error": "Dashboard not found"}, 404
    
    @ns.doc('update_dashboard', security='Bearer')
    @ns.expect(dashboard_update)
    @ns.marshal_with(dashboard_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Dashboard not found', error_response)
    @tenant_required
    @require_permission('dashboards.edit')
    def patch(self, dashboard_id):
        """
        Update dashboard properties.
        
        Partial updates supported. Does not modify widgets.
        Use widget endpoints to add/update/remove widgets.
        
        **Permissions Required:** Dashboard owner or `dashboards.edit`
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, DashboardNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            dashboard = DashboardService.update(
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
                **request.json,
            )
            return dashboard.to_dict()
        except DashboardNotFoundError:
            return {"error": "Dashboard not found"}, 404
    
    @ns.doc('delete_dashboard', security='Bearer')
    @ns.response(204, 'Dashboard deleted')
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Dashboard not found', error_response)
    @tenant_required
    @require_permission('dashboards.delete')
    def delete(self, dashboard_id):
        """
        Delete a dashboard.
        
        Permanently deletes the dashboard and all its widgets.
        This action cannot be undone.
        
        **Permissions Required:** Dashboard owner or `dashboards.delete`
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, DashboardNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            DashboardService.delete(
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return '', 204
        except DashboardNotFoundError:
            return {"error": "Dashboard not found"}, 404


@ns.route('/<uuid:dashboard_id>/layout')
@ns.param('dashboard_id', 'Dashboard UUID')
class DashboardLayout(Resource):
    @ns.doc('update_layout', security='Bearer')
    @ns.expect(layout_update, validate=True)
    @ns.marshal_with(dashboard_detail)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Dashboard not found', error_response)
    @tenant_required
    @require_permission('dashboards.edit')
    def put(self, dashboard_id):
        """
        Update dashboard widget layout.
        
        Updates the position and size of all widgets in a single operation.
        Useful for drag-and-drop layout changes.
        
        Each widget in the array should have:
        - `id`: Widget UUID
        - `x`, `y`: Grid position (x: 0-11)
        - `w`, `h`: Size in grid units (w: 1-12)
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        from app.domains.analytics.schemas.dashboard_schemas import DashboardLayoutUpdateSchema
        from pydantic import ValidationError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            data = DashboardLayoutUpdateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        dashboard = DashboardService.update_layout(
            dashboard_id=str(dashboard_id),
            tenant_id=tenant_id,
            user_id=user_id,
            widgets=data.widgets,
        )
        
        return dashboard.to_dict(include_widgets=True)


@ns.route('/<uuid:dashboard_id>/share')
@ns.param('dashboard_id', 'Dashboard UUID')
class DashboardSharing(Resource):
    @ns.doc('share_dashboard', security='Bearer')
    @ns.expect(dashboard_share, validate=True)
    @ns.response(200, 'Dashboard shared successfully')
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Dashboard not found', error_response)
    @tenant_required
    @require_permission('dashboards.share')
    def post(self, dashboard_id):
        """
        Share dashboard with users or roles.
        
        Grants access to the dashboard for specified users or roles
        with the given permission level.
        
        **Permissions Required:** Dashboard owner or `dashboards.share`
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        from app.domains.analytics.schemas.dashboard_schemas import DashboardShareSchema
        from pydantic import ValidationError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            data = DashboardShareSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        DashboardService.share(
            dashboard_id=str(dashboard_id),
            tenant_id=tenant_id,
            user_id=user_id,
            user_ids=data.user_ids,
            role_ids=data.role_ids,
            permission=data.permission,
        )
        
        return {"message": "Dashboard shared successfully"}


@ns.route('/<uuid:dashboard_id>/widgets')
@ns.param('dashboard_id', 'Dashboard UUID')
class WidgetList(Resource):
    @ns.doc('list_widgets', security='Bearer')
    @ns.marshal_list_with(widget_response)
    @tenant_required
    @require_permission('dashboards.view')
    def get(self, dashboard_id):
        """
        List all widgets on a dashboard.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        widgets = DashboardService.list_widgets(
            dashboard_id=str(dashboard_id),
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        return [w.to_dict() for w in widgets]
    
    @ns.doc('create_widget', security='Bearer')
    @ns.expect(widget_create, validate=True)
    @ns.marshal_with(widget_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @tenant_required
    @require_permission('dashboards.edit')
    def post(self, dashboard_id):
        """
        Add a widget to a dashboard.
        
        Creates a new widget with the specified configuration.
        The widget will appear at the specified grid position.
        
        **Widget Types:**
        - `metric_card`: Single value with optional trend
        - `line_chart`: Time series line chart
        - `bar_chart`: Categorical bar chart
        - `pie_chart`: Proportional pie/donut chart
        - `table`: Data table with sorting/filtering
        - `heatmap`: 2D density visualization
        - `scatter`: Scatter plot
        - `area`: Stacked area chart
        """
        from app.domains.analytics.application.dashboard_service import DashboardService
        from app.domains.analytics.schemas.dashboard_schemas import WidgetCreateSchema
        from pydantic import ValidationError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            data = WidgetCreateSchema(**request.json)
        except ValidationError as e:
            return {"error": "Validation Error", "details": e.errors()}, 400
        
        widget = DashboardService.create_widget(
            dashboard_id=str(dashboard_id),
            tenant_id=tenant_id,
            user_id=user_id,
            **data.dict(exclude_none=True),
        )
        
        return widget.to_dict(), 201


@ns.route('/<uuid:dashboard_id>/widgets/<uuid:widget_id>')
@ns.param('dashboard_id', 'Dashboard UUID')
@ns.param('widget_id', 'Widget UUID')
class WidgetDetail(Resource):
    @ns.doc('get_widget', security='Bearer')
    @ns.marshal_with(widget_response)
    @ns.response(404, 'Widget not found', error_response)
    @tenant_required
    @require_permission('dashboards.view')
    def get(self, dashboard_id, widget_id):
        """
        Get widget details.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, WidgetNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            widget = DashboardService.get_widget(
                widget_id=str(widget_id),
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return widget.to_dict()
        except WidgetNotFoundError:
            return {"error": "Widget not found"}, 404
    
    @ns.doc('update_widget', security='Bearer')
    @ns.expect(widget_create)
    @ns.marshal_with(widget_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(404, 'Widget not found', error_response)
    @tenant_required
    @require_permission('dashboards.edit')
    def patch(self, dashboard_id, widget_id):
        """
        Update widget configuration.
        
        Partial updates supported. Only include fields you want to change.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, WidgetNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            widget = DashboardService.update_widget(
                widget_id=str(widget_id),
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
                **request.json,
            )
            return widget.to_dict()
        except WidgetNotFoundError:
            return {"error": "Widget not found"}, 404
    
    @ns.doc('delete_widget', security='Bearer')
    @ns.response(204, 'Widget deleted')
    @ns.response(404, 'Widget not found', error_response)
    @tenant_required
    @require_permission('dashboards.edit')
    def delete(self, dashboard_id, widget_id):
        """
        Delete a widget from a dashboard.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, WidgetNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            DashboardService.delete_widget(
                widget_id=str(widget_id),
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return '', 204
        except WidgetNotFoundError:
            return {"error": "Widget not found"}, 404


@ns.route('/<uuid:dashboard_id>/widgets/<uuid:widget_id>/data')
@ns.param('dashboard_id', 'Dashboard UUID')
@ns.param('widget_id', 'Widget UUID')
class WidgetData(Resource):
    @ns.doc('get_widget_data', security='Bearer')
    @ns.response(200, 'Widget data')
    @ns.response(404, 'Widget not found', error_response)
    @tenant_required
    @require_permission('dashboards.view')
    def get(self, dashboard_id, widget_id):
        """
        Get data for a widget.
        
        Executes the widget's query and returns the data.
        Results may be cached based on dashboard settings.
        """
        from app.domains.analytics.application.dashboard_service import DashboardService, WidgetNotFoundError
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        
        try:
            data = DashboardService.get_widget_data(
                widget_id=str(widget_id),
                dashboard_id=str(dashboard_id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            return data
        except WidgetNotFoundError:
            return {"error": "Widget not found"}, 404
