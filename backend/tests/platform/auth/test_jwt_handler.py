"""
Tests for app.platform.auth.jwt_handler
==========================================

Covers JWT identity serialization/deserialization and callback registration.
"""

import pytest
import json
from unittest.mock import patch, MagicMock

from app.platform.auth.jwt_handler import (
    serialize_identity,
    deserialize_identity,
    get_jwt_identity_dict,
    register_jwt_handlers,
)


class TestSerializeIdentity:
    """Test serialize_identity() function."""

    def test_basic_serialization(self):
        identity = {"user_id": "u1", "email": "a@b.com", "tenant_id": "t1"}
        result = serialize_identity(identity)
        # Must be a JSON string
        parsed = json.loads(result)
        assert parsed["user_id"] == "u1"

    def test_deterministic_output(self):
        """Keys should be sorted for deterministic JWT sub claim."""
        identity = {"z": 1, "a": 2, "m": 3}
        result = serialize_identity(identity)
        keys = list(json.loads(result).keys())
        assert keys == sorted(keys)

    def test_empty_dict(self):
        result = serialize_identity({})
        assert json.loads(result) == {}


class TestDeserializeIdentity:
    """Test deserialize_identity() function."""

    def test_deserialize_json_string(self):
        raw = json.dumps({"user_id": "u1", "email": "a@b.com"})
        result = deserialize_identity(raw)
        assert result == {"user_id": "u1", "email": "a@b.com"}

    def test_deserialize_dict_passthrough(self):
        raw = {"user_id": "u1"}
        result = deserialize_identity(raw)
        assert result == {"user_id": "u1"}

    def test_deserialize_invalid_json_returns_empty(self):
        result = deserialize_identity("not-json")
        assert result == {}

    def test_deserialize_none_returns_empty(self):
        result = deserialize_identity(None)
        assert result == {}

    def test_deserialize_int_returns_empty(self):
        result = deserialize_identity(42)
        assert result == {}


class TestGetJwtIdentityDict:
    """Test get_jwt_identity_dict() function."""

    def test_returns_deserialized_dict(self, app):
        with app.app_context():
            mock_identity = json.dumps({"user_id": "u1", "tenant_id": "t1"})
            with patch(
                "app.platform.auth.jwt_handler._get_jwt_identity_raw",
                return_value=mock_identity,
            ):
                result = get_jwt_identity_dict()
                assert result == {"user_id": "u1", "tenant_id": "t1"}


class TestRegisterJwtHandlers:
    """Test that register_jwt_handlers wires all callbacks."""

    def test_registers_all_callbacks(self):
        mock_jwt = MagicMock()
        register_jwt_handlers(mock_jwt)

        # Should have registered all these decorators
        mock_jwt.token_in_blocklist_loader.assert_called_once()
        mock_jwt.revoked_token_loader.assert_called_once()
        mock_jwt.expired_token_loader.assert_called_once()
        mock_jwt.invalid_token_loader.assert_called_once()
        mock_jwt.unauthorized_loader.assert_called_once()
        mock_jwt.needs_fresh_token_loader.assert_called_once()
        mock_jwt.user_identity_loader.assert_called_once()
        mock_jwt.user_lookup_loader.assert_called_once()
        mock_jwt.additional_claims_loader.assert_called_once()
