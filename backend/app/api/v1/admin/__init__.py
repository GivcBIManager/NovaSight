"""
NovaSight Admin API v1 Blueprint
================================

Administration endpoints for platform-level management.
Super admin and tenant admin operations.
"""

from flask import Blueprint

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# Import and register admin route modules
from app.api.v1.admin import tenants  # noqa: F401, E402
from app.api.v1.admin import infrastructure  # noqa: F401, E402
