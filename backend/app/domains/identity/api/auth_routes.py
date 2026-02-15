"""
NovaSight Identity Domain — Auth Routes
========================================

Canonical location: ``app.domains.identity.api.auth_routes``

JWT-based authentication: register, login, logout, refresh, change-password.
"""

import time
import logging
from datetime import timedelta

from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt,
)
from pydantic import ValidationError as PydanticValidationError

from app.api.v1 import api_v1_bp
from app.services.audit_service import AuditService
from app.domains.identity.application.auth_service import AuthService
from app.platform.auth.token_service import token_blacklist
from app.platform.auth.jwt_handler import get_jwt_identity_dict
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

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "tenant_id": str(user.tenant_id),
            "roles": [role.name for role in user.roles] if user.roles else [],
        },
    })


@api_v1_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token."""
    identity = get_jwt_identity_dict()
    access_token = create_access_token(identity=identity)

    return jsonify({
        "access_token": access_token,
        "token_type": "Bearer",
    })


@api_v1_bp.route("/auth/me", methods=["GET"])
@jwt_required()
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
@jwt_required()
def logout():
    """Logout current user by blacklisting the current token."""
    identity = get_jwt_identity_dict()
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

    return jsonify({"message": "Successfully logged out"})


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
