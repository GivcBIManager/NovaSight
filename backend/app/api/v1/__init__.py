"""
NovaSight API v1 Blueprint
==========================

Version 1 of the NovaSight REST API.
"""

from flask import Blueprint

api_v1_bp = Blueprint("api_v1", __name__)

# Identity domain routes (canonical)
from app.domains.identity.api import auth_routes   # noqa: F401
from app.domains.identity.api import user_routes   # noqa: F401
from app.domains.identity.api import role_routes   # noqa: F401

# Tenants domain routes (canonical)
from app.domains.tenants.api import tenant_routes  # noqa: F401

# Other route modules
from app.api.v1 import connections
from app.api.v1 import dags
from app.api.v1 import pyspark_apps
from app.api.v1 import dbt
from app.api.v1 import semantic
from app.api.v1 import assistant
from app.api.v1 import dashboards
from app.api.v1 import audit

# Register admin sub-blueprint
from app.api.v1.admin import admin_bp
api_v1_bp.register_blueprint(admin_bp)

# Register backup API (admin-only endpoints)
from app.api.backup import bp as backup_bp
api_v1_bp.register_blueprint(backup_bp)
