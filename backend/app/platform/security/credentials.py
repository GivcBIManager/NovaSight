"""
NovaSight Platform – Credential Manager
=========================================

Secure credential management: auto-detection of sensitive fields,
transparent encryption / decryption, masking for safe logging, and
key-rotation helpers.

Canonical location – all other modules should import from here.
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from app.platform.security.encryption import (
    EncryptionService,
    EncryptionError,
    DecryptionError,
)

logger = logging.getLogger(__name__)


class CredentialManager:
    """
    Auto-detects sensitive fields by name and encrypts / decrypts them
    using the unified ``EncryptionService``.
    """

    SENSITIVE_FIELDS: Set[str] = {
        "password", "secret", "api_key", "apikey", "api-key",
        "token", "access_token", "refresh_token",
        "private_key", "privatekey", "private-key",
        "secret_key", "secretkey", "secret-key",
        "auth", "authorization", "credential", "credentials",
        "passphrase", "pass_phrase", "key", "cert", "certificate",
        "ssh_key", "bearer", "oauth",
    }

    NEVER_LOG_FIELDS: Set[str] = {
        "private_key", "privatekey", "ssh_key", "certificate",
    }

    def __init__(self, tenant_id: Optional[str] = None):
        self.tenant_id = tenant_id or self._tenant_from_context()
        self.encryption = EncryptionService(tenant_id=self.tenant_id)

    @staticmethod
    def _tenant_from_context() -> Optional[str]:
        try:
            from flask import g, has_request_context
            if has_request_context() and hasattr(g, "tenant") and g.tenant:
                return str(g.tenant.id)
        except ImportError:
            pass
        return None

    # ── store / retrieve ───────────────────────────────────────────

    def store_credentials(
        self,
        credentials: Dict[str, Any],
        datasource_id: Optional[str] = None,
        additional_sensitive_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        sensitive = self._resolve_sensitive(additional_sensitive_fields)
        out: Dict[str, Any] = {}
        for k, v in credentials.items():
            if v is None:
                out[k] = None
            elif self._is_sensitive(k, sensitive):
                sv = str(v) if not isinstance(v, str) else v
                out[k] = self.encryption.encrypt(sv)
                if datasource_id:
                    logger.debug("Encrypted '%s' for datasource %s", k, datasource_id)
            else:
                out[k] = v
        return out

    def retrieve_credentials(
        self,
        encrypted: Dict[str, Any],
        additional_sensitive_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        sensitive = self._resolve_sensitive(additional_sensitive_fields)
        out: Dict[str, Any] = {}
        for k, v in encrypted.items():
            if v is None:
                out[k] = None
            elif self._is_sensitive(k, sensitive) and v:
                try:
                    out[k] = self.encryption.decrypt(v)
                except DecryptionError:
                    logger.warning("Could not decrypt '%s', using raw value", k)
                    out[k] = v
            else:
                out[k] = v
        return out

    # ── masking ────────────────────────────────────────────────────

    def mask_credentials(
        self,
        credentials: Dict[str, Any],
        mask_char: str = "*",
        visible_chars: int = 0,
        additional_sensitive_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        sensitive = self._resolve_sensitive(additional_sensitive_fields)
        out: Dict[str, Any] = {}
        for k, v in credentials.items():
            if self._is_sensitive(k, sensitive):
                if k.lower() in self.NEVER_LOG_FIELDS:
                    out[k] = "[REDACTED]"
                elif v:
                    sv = str(v)
                    if visible_chars > 0 and len(sv) > visible_chars * 2:
                        out[k] = sv[:visible_chars] + mask_char * 4 + sv[-visible_chars:]
                    else:
                        out[k] = mask_char * 8
                else:
                    out[k] = ""
            else:
                out[k] = v
        return out

    # ── validation ─────────────────────────────────────────────────

    @staticmethod
    def validate_credentials(
        credentials: Dict[str, Any], required_fields: List[str]
    ) -> tuple:
        missing = [f for f in required_fields if not credentials.get(f)]
        return (len(missing) == 0, missing)

    # ── rotation ───────────────────────────────────────────────────

    def rotate_credentials(
        self,
        encrypted_credentials: Dict[str, Any],
        new_encryption_service: EncryptionService,
    ) -> Dict[str, Any]:
        decrypted = self.retrieve_credentials(encrypted_credentials)
        out: Dict[str, Any] = {}
        for k, v in decrypted.items():
            if v is None:
                out[k] = None
            elif self._is_sensitive(k, self.SENSITIVE_FIELDS):
                out[k] = new_encryption_service.encrypt(
                    str(v) if not isinstance(v, str) else v
                )
            else:
                out[k] = v
        return out

    # ── internals ──────────────────────────────────────────────────

    def _resolve_sensitive(self, extra: Optional[List[str]] = None) -> Set[str]:
        fields = self.SENSITIVE_FIELDS.copy()
        if extra:
            fields.update(f.lower() for f in extra)
        return fields

    @staticmethod
    def _is_sensitive(name: str, sensitive: Set[str]) -> bool:
        lower = name.lower()
        if lower in sensitive:
            return True
        return any(s in lower for s in sensitive)


# ─── Vault (higher-level) ──────────────────────────────────────────

class CredentialVault:
    """Vault-like interface with versioning and metadata."""

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.manager = CredentialManager(tenant_id)

    def store(
        self,
        resource_type: str,
        resource_id: str,
        credentials: Dict[str, Any],
        version: Optional[str] = None,
    ) -> Dict[str, Any]:
        encrypted = self.manager.store_credentials(credentials, datasource_id=resource_id)
        return {
            "id": str(uuid.uuid4()),
            "resource_type": resource_type,
            "resource_id": resource_id,
            "credentials": encrypted,
            "version": version or "1",
            "created_at": datetime.utcnow().isoformat(),
            "tenant_id": self.tenant_id,
        }

    def retrieve(self, stored: Dict[str, Any]) -> Dict[str, Any]:
        return self.manager.retrieve_credentials(stored.get("credentials", {}))


# ─── Factory ───────────────────────────────────────────────────────

def get_credential_manager(tenant_id: Optional[str] = None) -> CredentialManager:
    return CredentialManager(tenant_id)
