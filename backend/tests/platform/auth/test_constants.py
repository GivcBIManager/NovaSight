"""
Tests for app.platform.auth.constants
=======================================

Covers canonical role names, permission delimiter, normalization
functions, and public endpoint constants.
"""

import pytest


class TestCanonicalRoles:
    """Test canonical role name constants."""

    def test_all_roles_defined(self):
        from app.platform.auth.constants import (
            ROLE_SUPER_ADMIN, ROLE_TENANT_ADMIN, ROLE_DATA_ENGINEER,
            ROLE_BI_DEVELOPER, ROLE_ANALYST, ROLE_VIEWER, ROLE_AUDITOR,
        )
        assert ROLE_SUPER_ADMIN == "super_admin"
        assert ROLE_TENANT_ADMIN == "tenant_admin"
        assert ROLE_DATA_ENGINEER == "data_engineer"
        assert ROLE_BI_DEVELOPER == "bi_developer"
        assert ROLE_ANALYST == "analyst"
        assert ROLE_VIEWER == "viewer"
        assert ROLE_AUDITOR == "auditor"

    def test_role_names_dict_maps_all_roles(self):
        from app.platform.auth.constants import ROLE_NAMES, ROLE_HIERARCHY

        for role in ROLE_HIERARCHY:
            assert role in ROLE_NAMES
            assert isinstance(ROLE_NAMES[role], str)

    def test_admin_roles_frozenset(self):
        from app.platform.auth.constants import ADMIN_ROLES

        assert isinstance(ADMIN_ROLES, frozenset)
        assert "super_admin" in ADMIN_ROLES
        assert "tenant_admin" in ADMIN_ROLES
        assert "viewer" not in ADMIN_ROLES

    def test_super_roles_frozenset(self):
        from app.platform.auth.constants import SUPER_ROLES

        assert isinstance(SUPER_ROLES, frozenset)
        assert "super_admin" in SUPER_ROLES
        assert "tenant_admin" not in SUPER_ROLES

    def test_role_hierarchy_order(self):
        from app.platform.auth.constants import ROLE_HIERARCHY

        assert ROLE_HIERARCHY[0] == "viewer"
        assert ROLE_HIERARCHY[-1] == "super_admin"
        assert len(ROLE_HIERARCHY) == 7


class TestPermissionDelimiter:
    """Test permission delimiter constant."""

    def test_delimiter_is_dot(self):
        from app.platform.auth.constants import PERMISSION_DELIMITER

        assert PERMISSION_DELIMITER == "."


class TestDeprecatedRoleMappings:
    """Test deprecated role mappings for backward compatibility."""

    def test_admin_maps_to_tenant_admin(self):
        from app.platform.auth.constants import DEPRECATED_ROLE_MAPPINGS

        assert DEPRECATED_ROLE_MAPPINGS["admin"] == "tenant_admin"

    def test_platform_admin_maps_to_super_admin(self):
        from app.platform.auth.constants import DEPRECATED_ROLE_MAPPINGS

        assert DEPRECATED_ROLE_MAPPINGS["platform_admin"] == "super_admin"


class TestNormalizePermission:
    """Test normalize_permission() function."""

    def test_dot_notation_unchanged(self):
        from app.platform.auth.constants import normalize_permission

        assert normalize_permission("dashboards.view") == "dashboards.view"

    def test_colon_notation_converted(self):
        from app.platform.auth.constants import normalize_permission

        assert normalize_permission("dashboards:create") == "dashboards.create"

    def test_multiple_colons_all_converted(self):
        from app.platform.auth.constants import normalize_permission

        assert normalize_permission("admin:users:delete") == "admin.users.delete"

    def test_empty_string(self):
        from app.platform.auth.constants import normalize_permission

        assert normalize_permission("") == ""


class TestNormalizeRoleName:
    """Test normalize_role_name() function."""

    def test_canonical_name_unchanged(self):
        from app.platform.auth.constants import normalize_role_name

        assert normalize_role_name("tenant_admin") == "tenant_admin"

    def test_deprecated_name_mapped(self):
        from app.platform.auth.constants import normalize_role_name

        assert normalize_role_name("admin") == "tenant_admin"
        assert normalize_role_name("platform_admin") == "super_admin"

    def test_unknown_name_returned_as_is(self):
        from app.platform.auth.constants import normalize_role_name

        assert normalize_role_name("custom_role") == "custom_role"


class TestPublicEndpoints:
    """Test public endpoint definitions."""

    def test_public_endpoints_frozenset(self):
        from app.platform.auth.constants import PUBLIC_ENDPOINTS

        assert isinstance(PUBLIC_ENDPOINTS, frozenset)
        assert "health.health_check" in PUBLIC_ENDPOINTS
        assert "api_v1.login" in PUBLIC_ENDPOINTS
        assert "api_v1.register" in PUBLIC_ENDPOINTS

    def test_public_path_prefixes(self):
        from app.platform.auth.constants import PUBLIC_PATH_PREFIXES

        assert "/health" in PUBLIC_PATH_PREFIXES
        assert "/api/v1/auth/login" in PUBLIC_PATH_PREFIXES
        assert "/api/v1/auth/register" in PUBLIC_PATH_PREFIXES
