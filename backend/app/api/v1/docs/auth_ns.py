"""
Authentication API Namespace
=============================

Flask-RESTX namespace for authentication endpoint documentation.
"""

from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from pydantic import ValidationError as PydanticValidationError
from app.services.auth_service import AuthService
from app.services.token_service import token_blacklist
from app.schemas.auth_schemas import LoginRequest, RegisterRequest
from app.errors import ValidationError, AuthenticationError
from app.extensions import limiter
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'auth',
    description='Authentication and authorization operations',
    decorators=[]
)

# Define models for this namespace
login_request = ns.model('LoginRequest', {
    'email': fields.String(
        required=True,
        description='User email address',
        example='user@example.com'
    ),
    'password': fields.String(
        required=True,
        description='User password',
        example='SecurePassword123!'
    ),
    'tenant_slug': fields.String(
        description='Optional tenant slug for multi-tenant login',
        example='acme-corp'
    ),
})

register_request = ns.model('RegisterRequest', {
    'email': fields.String(required=True, example='newuser@example.com'),
    'password': fields.String(required=True, example='SecurePassword123!'),
    'name': fields.String(required=True, example='John Doe'),
    'tenant_slug': fields.String(required=True, example='acme-corp'),
})

user_brief = ns.model('UserBrief', {
    'id': fields.String(example='550e8400-e29b-41d4-a716-446655440000'),
    'email': fields.String(example='user@example.com'),
    'name': fields.String(example='John Doe'),
    'tenant_id': fields.String(),
    'roles': fields.List(fields.String, example=['analyst', 'viewer']),
})

login_response = ns.model('LoginResponse', {
    'access_token': fields.String(description='JWT access token'),
    'refresh_token': fields.String(description='JWT refresh token'),
    'token_type': fields.String(example='Bearer'),
    'user': fields.Nested(user_brief),
})

token_response = ns.model('TokenResponse', {
    'access_token': fields.String(description='JWT access token'),
    'token_type': fields.String(example='Bearer'),
})

register_response = ns.model('RegisterResponse', {
    'message': fields.String(example='User registered successfully'),
    'user': fields.Nested(user_brief),
})

change_password_request = ns.model('ChangePasswordRequest', {
    'current_password': fields.String(required=True),
    'new_password': fields.String(required=True),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


@ns.route('/register')
class Register(Resource):
    @ns.doc('register_user')
    @ns.expect(register_request, validate=True)
    @ns.marshal_with(register_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(409, 'User Already Exists', error_response)
    @limiter.limit("5 per minute")
    def post(self):
        """
        Register a new user.
        
        Creates a new user account in the specified tenant.
        The tenant must already exist.
        
        **Password Requirements:**
        - Minimum 12 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - At least one special character
        """
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
            tenant_slug=register_req.tenant_slug
        )
        
        if error:
            raise ValidationError(error)
        
        logger.info(f"New user registered: {user.email}")
        
        return {
            "message": "User registered successfully",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "tenant_id": str(user.tenant_id),
            }
        }, 201


@ns.route('/login')
class Login(Resource):
    @ns.doc('login_user')
    @ns.expect(login_request, validate=True)
    @ns.marshal_with(login_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Invalid Credentials', error_response)
    @limiter.limit("5 per minute")
    def post(self):
        """
        Authenticate user and obtain JWT tokens.
        
        Returns an access token (15 min expiry) and refresh token (7 days expiry).
        Use the access token in the Authorization header for subsequent requests.
        
        **Example:**
        ```bash
        curl -X POST /api/v1/auth/login \\
          -H "Content-Type: application/json" \\
          -d '{"email": "user@example.com", "password": "your-password"}'
        ```
        """
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
            tenant_slug=login_req.tenant_slug
        )
        
        if error:
            raise AuthenticationError(error)
        
        identity = {
            "user_id": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "roles": [role.name for role in user.roles] if hasattr(user, 'roles') and user.roles else [],
        }
        
        access_token = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        
        logger.info(f"User {login_req.email} logged in successfully")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "tenant_id": str(user.tenant_id),
                "roles": [role.name for role in user.roles] if hasattr(user, 'roles') and user.roles else [],
            }
        }


@ns.route('/refresh')
class Refresh(Resource):
    @ns.doc('refresh_token', security='Bearer')
    @ns.marshal_with(token_response)
    @ns.response(401, 'Invalid or Expired Token', error_response)
    @jwt_required(refresh=True)
    def post(self):
        """
        Refresh the access token.
        
        Use this endpoint to get a new access token using a valid refresh token.
        Include the refresh token in the Authorization header.
        
        **Note:** Refresh tokens have a 7-day expiry.
        """
        identity = get_jwt_identity()
        access_token = create_access_token(identity=identity)
        
        return {
            "access_token": access_token,
            "token_type": "Bearer",
        }


@ns.route('/me')
class CurrentUser(Resource):
    @ns.doc('get_current_user', security='Bearer')
    @ns.marshal_with(user_brief)
    @ns.response(401, 'Unauthorized', error_response)
    @jwt_required()
    def get(self):
        """
        Get current authenticated user information.
        
        Returns the user profile from the current JWT token.
        """
        identity = get_jwt_identity()
        
        return {
            "id": identity.get("user_id"),
            "email": identity.get("email"),
            "tenant_id": identity.get("tenant_id"),
            "roles": identity.get("roles", []),
        }


@ns.route('/logout')
class Logout(Resource):
    @ns.doc('logout_user', security='Bearer')
    @ns.response(200, 'Successfully logged out')
    @ns.response(401, 'Unauthorized', error_response)
    @jwt_required()
    def post(self):
        """
        Logout current user.
        
        Blacklists the current JWT token, preventing further use.
        The user will need to login again to get new tokens.
        """
        identity = get_jwt_identity()
        jwt_data = get_jwt()
        jti = jwt_data.get("jti")
        
        exp = jwt_data.get("exp", 0)
        import time
        expires_in = max(0, exp - int(time.time()))
        
        if jti:
            token_blacklist.add(jti, expires_in)
        
        logger.info(f"User {identity.get('email')} logged out")
        
        return {"message": "Successfully logged out"}


@ns.route('/change-password')
class ChangePassword(Resource):
    @ns.doc('change_password', security='Bearer')
    @ns.expect(change_password_request, validate=True)
    @ns.response(200, 'Password changed successfully')
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @jwt_required(fresh=True)
    def post(self):
        """
        Change current user's password.
        
        Requires a **fresh token** (obtained from recent login, not refresh).
        
        **Password Requirements:**
        - Minimum 12 characters
        - At least one uppercase letter
        - At least one lowercase letter  
        - At least one number
        - At least one special character
        - Cannot be same as current password
        """
        data = request.get_json()
        
        if not data:
            raise ValidationError("Request body required")
        
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not current_password or not new_password:
            raise ValidationError("Current password and new password are required")
        
        identity = get_jwt_identity()
        user_id = identity.get("user_id")
        
        auth_service = AuthService()
        user = auth_service.validate_token_identity(identity)
        
        if not user:
            raise AuthenticationError("User not found")
        
        success, error = auth_service.change_password(user, current_password, new_password)
        
        if not success:
            raise ValidationError(error)
        
        logger.info(f"Password changed for user {identity.get('email')}")
        
        return {"message": "Password changed successfully"}
