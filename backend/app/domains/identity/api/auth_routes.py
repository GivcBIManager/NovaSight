"""
NovaSight Identity Domain — Auth Routes
========================================

Canonical location: ``app.domains.identity.api.auth_routes``

JWT-based authentication: register, login, logout, refresh, change-password.
"""

import time
import logging
from datetime import timedelta

from flask import request, jsonify, current_app, make_response
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    decode_token,
)
from pydantic import ValidationError as PydanticValidationError

from app.api.v1 import api_v1_bp
from app.platform.audit.service import AuditService
from app.domains.identity.application.auth_service import AuthService
from app.platform.auth.token_service import token_blacklist
from app.platform.auth.decorators import authenticated
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.platform.auth.identity import get_current_identity
from app.domains.identity.schemas.auth_schemas import LoginRequest, RegisterRequest
from app.platform.errors.exceptions import ValidationError, AuthenticationError
from app.extensions import limiter

logger = logging.getLogger(__name__)


@api_v1_bp.route("/auth/register", methods=["POST"])
@limiter.limit("30 per minute")
def register():
    """Register a new user."""
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    try:
        register_req = RegisterRequest(**data)
    except PydanticValidationError as e:
        errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
        raise ValidationError("; ".join(errors))

    auth_service = AuthService()
    user, error = auth_service.register_user(
        email=register_req.email,
        password=register_req.password,
        name=register_req.name,
        tenant_slug=register_req.tenant_slug,
    )

    if error:
        raise ValidationError(error)

    logger.info(f"New user registered: {user.email}")
    
    # Audit log: user registration
    AuditService.log(
        action='user.created',
        resource_type='user',
        resource_id=str(user.id),
        resource_name=user.email,
        user_id=str(user.id),
        user_email=user.email,
        tenant_id=str(user.tenant_id),
        extra_data={'registration_method': 'self_register'},
    )

    return jsonify({
        "message": "User registered successfully",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "tenant_id": str(user.tenant_id),
        },
    }), 201


@api_v1_bp.route("/auth/login", methods=["POST"])
@limiter.limit("60 per minute")
def login():
    """Authenticate user and return JWT tokens."""
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    try:
        login_req = LoginRequest(**data)
    except PydanticValidationError as e:
        errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
        raise ValidationError("; ".join(errors))

    auth_service = AuthService()
    user, error = auth_service.authenticate(
        email=login_req.email,
        password=login_req.password,
        tenant_slug=login_req.tenant_slug,
    )

    if error:
        # Audit log: failed login attempt
        AuditService.log(
            action='auth.login_failed',
            resource_type='user',
            resource_name=login_req.email,
            extra_data={'tenant_slug': login_req.tenant_slug},
            success=False,
            error_message=error,
        )
        raise AuthenticationError(error)

    identity = {
        "user_id": str(user.id),
        "email": user.email,
        "tenant_id": str(user.tenant_id),
        "roles": [role.name for role in user.roles] if user.roles else [],
    }

    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)

    logger.info(f"User {login_req.email} logged in successfully")
    
    # Audit log: successful login
    AuditService.log(
        action='auth.login',
        resource_type='user',
        resource_id=str(user.id),
        resource_name=user.email,
        user_id=str(user.id),
        user_email=user.email,
        tenant_id=str(user.tenant_id),
    )

    response = make_response(jsonify({
        "access_token": access_token,
        "token_type": "Bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "tenant_id": str(user.tenant_id),
            "roles": [role.name for role in user.roles] if user.roles else [],
        },
    }))
    _set_refresh_cookie(response, refresh_token)
    return response


def _set_refresh_cookie(response, refresh_token: str):
    """Set the refresh token as an HTTP-only secure cookie."""
    is_production = not current_app.debug and not current_app.testing
    max_age = int(current_app.config.get(
        "JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30)
    ).total_seconds())
    response.set_cookie(
        "refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="Lax",
        path="/api/v1/auth",
        max_age=max_age,
    )
    return response


def _clear_refresh_cookie(response):
    """Clear the refresh token cookie."""
    is_production = not current_app.debug and not current_app.testing
    response.delete_cookie(
        "refresh_token",
        path="/api/v1/auth",
        httponly=True,
        secure=is_production,
        samesite="Lax",
    )
    return response


@api_v1_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    """Refresh access token using refresh token from HTTP-only cookie or header."""
    # Try cookie first, then Authorization header (backward compat)
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            refresh_token_value = auth_header[7:]

    if not refresh_token_value:
        raise AuthenticationError("Missing refresh token")

    try:
        token_data = decode_token(refresh_token_value)
    except Exception:
        raise AuthenticationError("Invalid or expired refresh token")

    if token_data.get("type") != "refresh":
        raise AuthenticationError("Invalid token type")

    # Check blacklist
    jti = token_data.get("jti")
    if jti and token_blacklist.is_blacklisted(jti):
        raise AuthenticationError("Token has been revoked")

    identity = token_data.get("sub", {})
    access_token = create_access_token(identity=identity)
    new_refresh_token = create_refresh_token(identity=identity)

    response = make_response(jsonify({
        "access_token": access_token,
        "token_type": "Bearer",
    }))
    _set_refresh_cookie(response, new_refresh_token)

    # Blacklist old refresh token to prevent reuse
    if jti:
        exp = token_data.get("exp", 0)
        expires_in = max(0, exp - int(time.time()))
        token_blacklist.add(jti, expires_in)

    return response


@api_v1_bp.route("/auth/me", methods=["GET"])
@authenticated
def get_current_user():
    """Get current authenticated user information."""
    identity = get_jwt_identity_dict()

    user_data = {
        "id": identity.get("user_id"),
        "email": identity.get("email"),
        "tenant_id": identity.get("tenant_id"),
        "roles": identity.get("roles", []),
    }

    try:
        from app.domains.identity.domain.models import User
        from app.extensions import db

        user = db.session.get(User, identity.get("user_id"))
        if user:
            user_data["name"] = user.name
            user_data["email"] = user.email
            if user.tenant:
                user_data["tenant_name"] = user.tenant.name
    except Exception:
        pass

    return jsonify({"user": user_data})


@api_v1_bp.route("/auth/logout", methods=["POST"])
@authenticated
def logout():
    """Logout current user by blacklisting the current token."""
    identity = get_jwt_identity_dict()
    # get_jwt() is needed here for raw JWT claims (jti, exp) used in token blacklisting
    from flask_jwt_extended import get_jwt
    jwt_data = get_jwt()
    jti = jwt_data.get("jti")

    exp = jwt_data.get("exp", 0)
    expires_in = max(0, exp - int(time.time()))

    if jti:
        token_blacklist.add(jti, expires_in)

    logger.info(f"User {identity.get('email')} logged out")
    
    # Audit log: logout
    AuditService.log(
        action='auth.logout',
        resource_type='user',
        resource_id=identity.get('user_id'),
        resource_name=identity.get('email'),
        user_id=identity.get('user_id'),
        user_email=identity.get('email'),
        tenant_id=identity.get('tenant_id'),
    )

    response = make_response(jsonify({"message": "Successfully logged out"}))
    _clear_refresh_cookie(response)
    return response


@api_v1_bp.route("/auth/logout-all", methods=["POST"])
@jwt_required(fresh=True)
def logout_all():
    """Logout from all devices by invalidating all tokens."""
    identity = get_jwt_identity_dict()
    logger.info(f"User {identity.get('email')} logged out from all devices")

    return jsonify({"message": "Successfully logged out from all devices"})


@api_v1_bp.route("/auth/change-password", methods=["POST"])
@jwt_required(fresh=True)
def change_password():
    """Change current user's password."""
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        raise ValidationError("Current password and new password are required")

    identity = get_jwt_identity_dict()

    auth_service = AuthService()
    user = auth_service.validate_token_identity(identity)

    if not user:
        raise AuthenticationError("User not found")

    success, error = auth_service.change_password(user, current_password, new_password)

    if not success:
        raise ValidationError(error)

    logger.info(f"Password changed for user {identity.get('email')}")
    
    # Audit log: password changed
    AuditService.log(
        action='auth.password_changed',
        resource_type='user',
        resource_id=identity.get('user_id'),
        resource_name=identity.get('email'),
        user_id=identity.get('user_id'),
        user_email=identity.get('email'),
        tenant_id=identity.get('tenant_id'),
    )

    return jsonify({"message": "Password changed successfully"})
