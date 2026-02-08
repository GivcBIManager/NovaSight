"""
Auth Enforcement Test
======================

Every protected endpoint must return 401 when no Authorization token
is provided.  This test ensures no endpoint accidentally becomes
publicly accessible.

The list is maintained manually and should be updated when new routes
are added.  A CI-only variant could introspect Flask's URL map to
auto-discover routes, but explicit enumeration provides documentation
value and detects *missing* routes too.
"""

import pytest


# ── Endpoint registry ───────────────────────────────────────────────
# (method, path) — all protected endpoints
# Paths use dummy IDs:
#   - UUID-typed params → 00000000-0000-0000-0000-000000000001
#   - String params      → test-id

PROTECTED_ENDPOINTS = [
    # --- Auth (protected subset) ---
    ("POST", "/api/v1/auth/refresh"),
    ("GET",  "/api/v1/auth/me"),
    ("POST", "/api/v1/auth/logout"),
    ("POST", "/api/v1/auth/change-password"),

    # --- Users ---
    ("GET",    "/api/v1/users"),
    ("POST",   "/api/v1/users"),
    ("GET",    "/api/v1/users/test-id"),
    ("PATCH",  "/api/v1/users/test-id"),
    ("DELETE", "/api/v1/users/test-id"),

    # --- Roles ---
    ("GET",    "/api/v1/roles"),
    ("POST",   "/api/v1/roles"),
    ("GET",    "/api/v1/roles/test-id"),
    ("PUT",    "/api/v1/roles/test-id"),
    ("DELETE", "/api/v1/roles/test-id"),

    # --- Tenants ---
    ("GET",    "/api/v1/tenants"),
    ("POST",   "/api/v1/tenants"),
    ("GET",    "/api/v1/tenants/test-id"),
    ("PATCH",  "/api/v1/tenants/test-id"),

    # --- Connections ---
    ("GET",    "/api/v1/connections"),
    ("POST",   "/api/v1/connections"),
    ("GET",    "/api/v1/connections/test-id"),
    ("PATCH",  "/api/v1/connections/test-id"),
    ("DELETE", "/api/v1/connections/test-id"),
    ("POST",   "/api/v1/connections/test-id/test"),

    # --- DAGs ---
    ("GET",    "/api/v1/dags"),
    ("POST",   "/api/v1/dags"),
    ("GET",    "/api/v1/dags/test-id"),
    ("PUT",    "/api/v1/dags/test-id"),
    ("DELETE", "/api/v1/dags/test-id"),

    # --- Dashboards ---
    ("GET",    "/api/v1/dashboards"),
    ("POST",   "/api/v1/dashboards"),
    ("GET",    "/api/v1/dashboards/00000000-0000-0000-0000-000000000001"),
    ("PUT",    "/api/v1/dashboards/00000000-0000-0000-0000-000000000001"),
    ("DELETE", "/api/v1/dashboards/00000000-0000-0000-0000-000000000001"),

    # --- Semantic Layer ---
    ("GET",    "/api/v1/semantic/models"),
    ("POST",   "/api/v1/semantic/models"),
    ("GET",    "/api/v1/semantic/models/00000000-0000-0000-0000-000000000001"),
    ("POST",   "/api/v1/semantic/query"),

    # --- dbt ---
    ("POST",   "/api/v1/dbt/run"),
    ("POST",   "/api/v1/dbt/test"),
    ("POST",   "/api/v1/dbt/build"),

    # --- AI Assistant ---
    ("POST",   "/api/v1/assistant/query"),
    ("POST",   "/api/v1/assistant/explain"),
    ("POST",   "/api/v1/assistant/suggest"),
    ("POST",   "/api/v1/assistant/nl-to-sql"),

    # --- PySpark Apps ---
    ("GET",    "/api/v1/pyspark-apps"),
    ("POST",   "/api/v1/pyspark-apps"),
    ("GET",    "/api/v1/pyspark-apps/test-id"),

    # --- Audit ---
    ("GET",    "/api/v1/audit/logs"),
    ("POST",   "/api/v1/audit/export"),
]

PUBLIC_ENDPOINTS = [
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
]


class TestAuthEnforcement:
    """
    Every protected endpoint must return 401 without a token.
    """

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_protected_endpoint_returns_401(self, client, method, path):
        """Request without Authorization header should yield 401."""
        caller = getattr(client, method.lower())
        response = caller(
            path,
            content_type="application/json",
            # Deliberately no Authorization header
        )
        assert response.status_code == 401, (
            f"{method} {path} returned {response.status_code}, expected 401. "
            f"Body: {response.get_data(as_text=True)[:200]}"
        )

    @pytest.mark.parametrize("method,path", PUBLIC_ENDPOINTS)
    def test_public_endpoint_does_not_require_token(self, client, method, path):
        """Public endpoints should NOT return 401 (may return 400/422 for missing body)."""
        caller = getattr(client, method.lower())
        response = caller(
            path,
            content_type="application/json",
            json={},  # empty body
        )
        assert response.status_code != 401, (
            f"Public endpoint {method} {path} returned 401, "
            f"which means it incorrectly requires authentication."
        )


class TestAuthEnforcementWithExpiredToken:
    """Endpoints must reject expired/invalid tokens with 401 or 422."""

    SAMPLE_ENDPOINTS = [
        ("GET", "/api/v1/dashboards"),
        ("GET", "/api/v1/connections"),
        ("GET", "/api/v1/users"),
    ]

    @pytest.mark.parametrize("method,path", SAMPLE_ENDPOINTS)
    def test_invalid_token_returns_401(self, client, method, path):
        """A garbage token should yield 401 or 422."""
        caller = getattr(client, method.lower())
        response = caller(
            path,
            headers={"Authorization": "Bearer invalid.garbage.token"},
            content_type="application/json",
        )
        assert response.status_code in (401, 422), (
            f"{method} {path} with invalid token returned "
            f"{response.status_code}, expected 401 or 422."
        )
