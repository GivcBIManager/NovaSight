"""
NovaSight Encrypted Column Types
================================

SQLAlchemy custom types for transparent encryption/decryption of
database columns. These types automatically encrypt data before
storing and decrypt when loading, providing seamless encryption
at the ORM level.

Security Features:
- Automatic encryption on write
- Automatic decryption on read
- Transparent to application code
- Supports both strings and JSON objects
- Version-aware for key rotation support

Usage:
    from app.utils.encrypted_types import EncryptedString, EncryptedJSON
    
    class DataConnection(db.Model):
        password = db.Column(EncryptedString())
        config = db.Column(EncryptedJSON())
"""

import json
import logging
from typing import Any, Optional

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

logger = logging.getLogger(__name__)


class EncryptedString(TypeDecorator):
    """
    SQLAlchemy type for encrypted string columns.
    
    Automatically encrypts string values before storing in the database
    and decrypts when loading. Uses AES-256 encryption via the
    EncryptionService.
    
    The underlying database column type is TEXT to accommodate the
    encrypted data which is longer than the original plaintext.
    
    Attributes:
        impl: The underlying SQLAlchemy type (Text)
        cache_ok: Whether this type is safe to cache
    
    Example:
        class User(db.Model):
            ssn = db.Column(EncryptedString())
            
        # Usage is transparent:
        user.ssn = "123-45-6789"  # Encrypted automatically
        print(user.ssn)  # Decrypted automatically: "123-45-6789"
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, tenant_aware: bool = False, *args, **kwargs):
        """
        Initialize encrypted string type.
        
        Args:
            tenant_aware: If True, uses tenant-specific encryption key
                         derived from the current request context.
        """
        super().__init__(*args, **kwargs)
        self.tenant_aware = tenant_aware
        self._encryption = None
    
    def _get_encryption_service(self):
        """Get encryption service instance."""
        from app.services.encryption_service import EncryptionService
        
        tenant_id = None
        if self.tenant_aware:
            from flask import g, has_request_context
            if has_request_context() and hasattr(g, 'tenant'):
                tenant_id = str(g.tenant.id) if g.tenant else None
        
        return EncryptionService(tenant_id=tenant_id)
    
    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        """
        Encrypt value before storing in database.
        
        Args:
            value: The plaintext string value.
            dialect: The SQLAlchemy dialect.
        
        Returns:
            The encrypted string or None.
        """
        if value is None:
            return None
        
        if not value:
            return ""
        
        try:
            encryption = self._get_encryption_service()
            
            # Check if already encrypted (e.g., during updates)
            if encryption.is_encrypted(value):
                return value
            
            return encryption.encrypt(value)
        except Exception as e:
            logger.error(f"Failed to encrypt column value: {e}")
            raise
    
    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        """
        Decrypt value when loading from database.
        
        Args:
            value: The encrypted string from database.
            dialect: The SQLAlchemy dialect.
        
        Returns:
            The decrypted plaintext string or None.
        """
        if value is None:
            return None
        
        if not value:
            return ""
        
        try:
            encryption = self._get_encryption_service()
            return encryption.decrypt(value)
        except Exception as e:
            logger.error(f"Failed to decrypt column value: {e}")
            # Return the encrypted value rather than failing
            # This allows for graceful handling of key rotation issues
            return value


class EncryptedJSON(TypeDecorator):
    """
    SQLAlchemy type for encrypted JSON columns.
    
    Stores JSON objects as encrypted strings in the database.
    Automatically serializes to JSON before encrypting and
    deserializes after decrypting.
    
    The underlying database column type is TEXT to accommodate
    the encrypted JSON string.
    
    Example:
        class DataConnection(db.Model):
            connection_config = db.Column(EncryptedJSON())
            
        # Usage is transparent:
        conn.connection_config = {"host": "localhost", "port": 5432}
        print(conn.connection_config)  # {"host": "localhost", "port": 5432}
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, tenant_aware: bool = False, *args, **kwargs):
        """
        Initialize encrypted JSON type.
        
        Args:
            tenant_aware: If True, uses tenant-specific encryption key.
        """
        super().__init__(*args, **kwargs)
        self.tenant_aware = tenant_aware
    
    def _get_encryption_service(self):
        """Get encryption service instance."""
        from app.services.encryption_service import EncryptionService
        
        tenant_id = None
        if self.tenant_aware:
            from flask import g, has_request_context
            if has_request_context() and hasattr(g, 'tenant'):
                tenant_id = str(g.tenant.id) if g.tenant else None
        
        return EncryptionService(tenant_id=tenant_id)
    
    def process_bind_param(self, value: Optional[Any], dialect) -> Optional[str]:
        """
        Serialize to JSON and encrypt before storing.
        
        Args:
            value: The Python object to store (dict, list, etc.).
            dialect: The SQLAlchemy dialect.
        
        Returns:
            The encrypted JSON string or None.
        """
        if value is None:
            return None
        
        try:
            encryption = self._get_encryption_service()
            
            # Serialize to JSON string
            json_str = json.dumps(value, default=str, ensure_ascii=False)
            
            return encryption.encrypt(json_str)
        except Exception as e:
            logger.error(f"Failed to encrypt JSON column value: {e}")
            raise
    
    def process_result_value(self, value: Optional[str], dialect) -> Optional[Any]:
        """
        Decrypt and deserialize from JSON when loading.
        
        Args:
            value: The encrypted JSON string from database.
            dialect: The SQLAlchemy dialect.
        
        Returns:
            The deserialized Python object or None.
        """
        if value is None:
            return None
        
        if not value:
            return {}
        
        try:
            encryption = self._get_encryption_service()
            decrypted = encryption.decrypt(value)
            return json.loads(decrypted)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse decrypted JSON: {e}")
            return {}
        except Exception as e:
            logger.error(f"Failed to decrypt JSON column value: {e}")
            # Return empty dict rather than failing
            return {}


class EncryptedText(TypeDecorator):
    """
    SQLAlchemy type for encrypted large text columns.
    
    Similar to EncryptedString but optimized for larger text content
    like certificates, private keys, or configuration files.
    
    Example:
        class DataConnection(db.Model):
            ssl_certificate = db.Column(EncryptedText())
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, tenant_aware: bool = False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tenant_aware = tenant_aware
    
    def _get_encryption_service(self):
        """Get encryption service instance."""
        from app.services.encryption_service import EncryptionService
        
        tenant_id = None
        if self.tenant_aware:
            from flask import g, has_request_context
            if has_request_context() and hasattr(g, 'tenant'):
                tenant_id = str(g.tenant.id) if g.tenant else None
        
        return EncryptionService(tenant_id=tenant_id)
    
    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        """Encrypt large text before storing."""
        if value is None:
            return None
        
        if not value:
            return ""
        
        try:
            encryption = self._get_encryption_service()
            
            if encryption.is_encrypted(value):
                return value
            
            return encryption.encrypt(value)
        except Exception as e:
            logger.error(f"Failed to encrypt text column value: {e}")
            raise
    
    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        """Decrypt large text when loading."""
        if value is None:
            return None
        
        if not value:
            return ""
        
        try:
            encryption = self._get_encryption_service()
            return encryption.decrypt(value)
        except Exception as e:
            logger.error(f"Failed to decrypt text column value: {e}")
            return value
