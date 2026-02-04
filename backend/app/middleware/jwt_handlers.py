"""
NovaSight JWT Handlers
======================

Flask-JWT-Extended callback handlers for token validation.
"""

import json
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, get_jwt_identity as _get_jwt_identity_raw
from app.services.token_service import token_blacklist
from app.services.auth_service import AuthService
import logging

logger = logging.getLogger(__name__)


def _serialize_identity(identity: dict) -> str:
    """Serialize identity dict to JSON string for JWT sub claim."""
    return json.dumps(identity, sort_keys=True)


def _deserialize_identity(identity_str) -> dict:
    """Deserialize identity from JWT sub claim (string or dict for backwards compat)."""
    if isinstance(identity_str, dict):
        # Backwards compatibility: if already a dict, return as-is
        return identity_str
    if isinstance(identity_str, str):
        try:
            return json.loads(identity_str)
        except json.JSONDecodeError:
            logger.error(f"Failed to deserialize JWT identity: {identity_str}")
            return {}
    return {}


def get_jwt_identity_dict() -> dict:
    """
    Get the current JWT identity as a dictionary.
    
    This wraps Flask-JWT-Extended's get_jwt_identity() to handle
    the JSON string serialization we use for the 'sub' claim.
    
    Returns:
        dict: The identity dictionary from the JWT token
    """
    raw_identity = _get_jwt_identity_raw()
    return _deserialize_identity(raw_identity)


def register_jwt_handlers(jwt: JWTManager) -> None:
    """
    Register JWT callback handlers.
    
    Args:
        jwt: Flask-JWT-Extended JWTManager instance
    """
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload) -> bool:
        """
        Check if a token has been revoked (blacklisted).
        
        This callback is called for every protected endpoint to verify
        the token hasn't been logged out.
        """
        jti = jwt_payload.get("jti")
        return token_blacklist.is_blacklisted(jti)
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked token access."""
        return jsonify({
            "error": "token_revoked",
            "message": "Token has been revoked. Please log in again.",
            "status_code": 401
        }), 401
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired token access."""
        return jsonify({
            "error": "token_expired",
            "message": "Token has expired. Please refresh or log in again.",
            "status_code": 401
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid token."""
        return jsonify({
            "error": "invalid_token",
            "message": "Token is invalid or malformed.",
            "status_code": 401
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Handle missing token."""
        return jsonify({
            "error": "authorization_required",
            "message": "Authorization token is required.",
            "status_code": 401
        }), 401
    
    @jwt.needs_fresh_token_loader
    def needs_fresh_token_callback(jwt_header, jwt_payload):
        """Handle non-fresh token for sensitive operations."""
        return jsonify({
            "error": "fresh_token_required",
            "message": "Fresh token required for this operation. Please log in again.",
            "status_code": 401
        }), 401
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        """
        Callback to convert user object to identity for token.
        
        The identity must be a string (not a dict) for PyJWT verify_sub to work.
        We serialize the identity dict as a JSON string.
        
        Args:
            user: User dict or object passed to create_access_token
        
        Returns:
            JSON string identity to embed in token
        """
        if isinstance(user, dict):
            return _serialize_identity(user)
        # If it's a User model object
        identity = {
            "user_id": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "roles": [role.name for role in user.roles] if hasattr(user, 'roles') else [],
        }
        return _serialize_identity(identity)
    
    @jwt.user_lookup_loader
    def user_lookup_callback(jwt_header, jwt_payload):
        """
        Callback to load user from token identity.
        
        Returns:
            User object or None
        """
        identity_raw = jwt_payload.get("sub")
        if not identity_raw:
            return None
        
        identity = _deserialize_identity(identity_raw)
        if not identity:
            return None
        
        auth_service = AuthService()
        return auth_service.validate_token_identity(identity)
    
    @jwt.additional_claims_loader
    def add_claims_to_access_token(identity):
        """
        Add additional claims to access token.
        
        Args:
            identity: User identity (dict passed to create_access_token, before serialization)
        
        Returns:
            Additional claims to add
        """
        # Note: identity here is the original dict passed to create_access_token,
        # NOT the serialized string (serialization happens after this callback)
        if not isinstance(identity, dict):
            return {}
        
        return {
            "tenant_id": identity.get("tenant_id"),
            "roles": identity.get("roles", []),
            "permissions": identity.get("permissions", []),
        }


def init_jwt_handlers(app: Flask) -> None:
    """
    Initialize JWT handlers for Flask app.
    
    Args:
        app: Flask application instance
    """
    from app.extensions import jwt
    register_jwt_handlers(jwt)
