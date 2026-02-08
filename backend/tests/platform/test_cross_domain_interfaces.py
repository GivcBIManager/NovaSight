"""
Cross-Domain Interface Integration Tests
============================================

Verifies that each cross-domain interface contract (ABC/Protocol)
is correctly implemented by its concrete class and that the public
API is complete and consistent.

Tests cover:
- IIdentity Protocol compliance
- IAccessChecker ABC compliance
- ITenantResolver / ITenantSchemaManager ABC compliance
- IConnectionProvider / ISchemaProvider ABC compliance
- ISemanticLayerProvider ABC compliance
"""

import pytest
import inspect
from abc import ABC

from app.platform.auth.interfaces import IIdentity, IIdentityResolver, IAccessChecker
from app.platform.tenant.interfaces import ITenantResolver, ITenantSchemaManager
from app.domains.datasources.domain.interfaces import IConnectionProvider, ISchemaProvider
from app.domains.transformation.domain.interfaces import ISemanticLayerProvider


# ── Helpers ─────────────────────────────────────────────────────────

def _get_abstract_methods(cls):
    """Return set of abstract method names on an ABC."""
    return {
        name
        for name, _ in inspect.getmembers(cls, predicate=inspect.isfunction)
        if getattr(getattr(cls, name, None), "__isabstractmethod__", False)
    }


def _get_public_methods(cls):
    """Return set of non-dunder, non-private method names."""
    return {
        name
        for name in dir(cls)
        if not name.startswith("_") and callable(getattr(cls, name, None))
    }


# ── IIdentity Protocol ─────────────────────────────────────────────

class TestIIdentityProtocol:
    """Verify Identity dataclass satisfies IIdentity Protocol."""

    def test_identity_isinstance_check(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="test@test.com", tenant_id="t1",
            roles=["viewer"], permissions=["dashboards.view"],
        )
        assert isinstance(identity, IIdentity)

    def test_identity_has_all_protocol_attributes(self):
        from app.platform.auth.identity import Identity

        required = ["user_id", "email", "tenant_id", "roles", "permissions"]
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=[], permissions=[],
        )
        for attr in required:
            assert hasattr(identity, attr), f"Missing attribute: {attr}"

    def test_identity_has_protocol_methods(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=[], permissions=[],
        )
        assert hasattr(identity, "is_super_admin")
        assert hasattr(identity, "is_tenant_admin")
        assert hasattr(identity, "has_role")
        assert hasattr(identity, "has_permission")


# ── IAccessChecker ABC ─────────────────────────────────────────────

class TestIAccessCheckerInterface:
    """Verify AccessChecker implements all IAccessChecker abstract methods."""

    def test_all_abstract_methods_implemented(self):
        from app.platform.auth.access_checker import AccessChecker

        abstract_methods = _get_abstract_methods(IAccessChecker)
        for method in abstract_methods:
            assert hasattr(AccessChecker, method), f"Missing: {method}"
            impl = getattr(AccessChecker, method)
            assert not getattr(impl, "__isabstractmethod__", False), (
                f"{method} still abstract"
            )

    def test_can_instantiate(self):
        from app.platform.auth.access_checker import AccessChecker

        checker = AccessChecker()
        assert isinstance(checker, IAccessChecker)

    def test_abstract_methods_match(self):
        expected = {"check_roles", "check_permission",
                    "check_any_permission", "check_all_permissions"}
        actual = _get_abstract_methods(IAccessChecker)
        assert actual == expected


# ── ITenantResolver ABC ────────────────────────────────────────────

class TestITenantResolverInterface:
    """Verify TenantResolver implements all ITenantResolver abstract methods."""

    def test_all_abstract_methods_implemented(self):
        from app.platform.tenant.resolver import TenantResolver

        abstract_methods = _get_abstract_methods(ITenantResolver)
        for method in abstract_methods:
            assert hasattr(TenantResolver, method), f"Missing: {method}"

    def test_can_instantiate(self):
        from app.platform.tenant.resolver import TenantResolver

        resolver = TenantResolver()
        assert isinstance(resolver, ITenantResolver)

    def test_abstract_methods_match(self):
        expected = {"get_current_tenant_id", "get_current_tenant", "require_tenant_id"}
        actual = _get_abstract_methods(ITenantResolver)
        assert actual == expected


# ── ITenantSchemaManager ABC ───────────────────────────────────────

class TestITenantSchemaManagerInterface:
    """Verify TenantSchemaManager implements all ITenantSchemaManager abstract methods."""

    def test_all_abstract_methods_implemented(self):
        from app.platform.tenant.resolver import TenantSchemaManager

        abstract_methods = _get_abstract_methods(ITenantSchemaManager)
        for method in abstract_methods:
            assert hasattr(TenantSchemaManager, method), f"Missing: {method}"

    def test_can_instantiate(self):
        from app.platform.tenant.resolver import TenantSchemaManager

        mgr = TenantSchemaManager()
        assert isinstance(mgr, ITenantSchemaManager)

    def test_abstract_methods_match(self):
        expected = {"get_schema_name", "create_schema", "drop_schema",
                    "schema_exists", "list_schemas"}
        actual = _get_abstract_methods(ITenantSchemaManager)
        assert actual == expected


# ── IConnectionProvider ABC ────────────────────────────────────────

class TestIConnectionProviderInterface:
    """Verify ConnectionService implements IConnectionProvider."""

    def test_all_abstract_methods_implemented(self):
        from app.domains.datasources.application.connection_service import ConnectionService

        abstract_methods = _get_abstract_methods(IConnectionProvider)
        for method in abstract_methods:
            assert hasattr(ConnectionService, method), f"Missing: {method}"

    def test_is_subclass(self):
        from app.domains.datasources.application.connection_service import ConnectionService

        assert issubclass(ConnectionService, IConnectionProvider)

    def test_abstract_methods_match(self):
        expected = {"get_connection", "list_connections", "test_connection"}
        actual = _get_abstract_methods(IConnectionProvider)
        assert actual == expected


# ── ISchemaProvider ABC ────────────────────────────────────────────

class TestISchemaProviderInterface:
    """Verify ConnectionService implements ISchemaProvider."""

    def test_all_abstract_methods_implemented(self):
        from app.domains.datasources.application.connection_service import ConnectionService

        abstract_methods = _get_abstract_methods(ISchemaProvider)
        for method in abstract_methods:
            assert hasattr(ConnectionService, method), f"Missing: {method}"

    def test_is_subclass(self):
        from app.domains.datasources.application.connection_service import ConnectionService

        assert issubclass(ConnectionService, ISchemaProvider)

    def test_abstract_methods_match(self):
        expected = {"get_schema", "get_tables", "get_columns"}
        actual = _get_abstract_methods(ISchemaProvider)
        assert actual == expected


# ── ISemanticLayerProvider ABC ─────────────────────────────────────

class TestISemanticLayerProviderInterface:
    """Verify SemanticService implements ISemanticLayerProvider."""

    def test_all_abstract_methods_implemented(self):
        from app.domains.transformation.application.semantic_service import SemanticService

        abstract_methods = _get_abstract_methods(ISemanticLayerProvider)
        for method in abstract_methods:
            assert hasattr(SemanticService, method), f"Missing: {method}"

    def test_is_subclass(self):
        from app.domains.transformation.application.semantic_service import SemanticService

        assert issubclass(SemanticService, ISemanticLayerProvider)

    def test_abstract_methods_match(self):
        expected = {
            "get_model", "get_model_by_name", "list_models",
            "list_dimensions", "list_measures", "execute_query",
        }
        actual = _get_abstract_methods(ISemanticLayerProvider)
        assert actual == expected


# ── Cross-interface consistency ────────────────────────────────────

class TestInterfaceConsistency:
    """Verify all interfaces follow consistent patterns."""

    INTERFACES = [
        IAccessChecker,
        ITenantResolver,
        ITenantSchemaManager,
        IConnectionProvider,
        ISchemaProvider,
        ISemanticLayerProvider,
    ]

    @pytest.mark.parametrize("interface", INTERFACES)
    def test_interface_is_abc(self, interface):
        """All interfaces should be ABC subclasses."""
        assert issubclass(interface, ABC)

    @pytest.mark.parametrize("interface", INTERFACES)
    def test_interface_has_abstract_methods(self, interface):
        """All interfaces should define at least one abstract method."""
        methods = _get_abstract_methods(interface)
        assert len(methods) > 0, f"{interface.__name__} has no abstract methods"

    def test_iidentity_is_protocol(self):
        """IIdentity should be a runtime-checkable Protocol, not an ABC."""
        assert not issubclass(IIdentity, ABC)
        # runtime_checkable check
        from app.platform.auth.identity import Identity
        assert isinstance(
            Identity(user_id="u", email="e", tenant_id="t"),
            IIdentity,
        )
