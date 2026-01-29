"""
NovaSight Encryption Utilities
==============================

AES-256 encryption for sensitive data using Fernet.

Note: For new code, prefer using the EncryptionService from
app.services.encryption_service which provides additional features
like version prefixing for key rotation and tenant isolation.

This module provides backward-compatible functions that are used
by legacy code in the application.
"""

import os
import base64
from cryptography.fernet import Fernet
from flask import current_app
from typing import Optional
import logging

logger = logging.getLogger(__name__)


# Re-export from new encryption service for convenience
from app.services.encryption_service import (
    EncryptionService,
    KeyRotationService,
    EncryptionError,
    DecryptionError,
    KeyNotConfiguredError,
    get_encryption_service
)

# Re-export encrypted column types
from app.utils.encrypted_types import (
    EncryptedString,
    EncryptedJSON,
    EncryptedText
)


def get_encryption_key() -> bytes:
    """
    Get the encryption key from configuration.
    
    Returns:
        bytes: The Fernet-compatible encryption key.
    
    Raises:
        ValueError: If no encryption key is configured.
    """
    key = current_app.config.get("CREDENTIAL_ENCRYPTION_KEY")
    
    if not key:
        # In development, generate a key if not set
        if current_app.debug:
            key = Fernet.generate_key().decode()
            logger.warning("Using auto-generated encryption key. Set CREDENTIAL_ENCRYPTION_KEY in production!")
        else:
            raise ValueError("CREDENTIAL_ENCRYPTION_KEY must be set in production")
    
    # Ensure key is properly formatted
    if isinstance(key, str):
        key = key.encode()
    
    return key


def encrypt_credential(plaintext: str) -> str:
    """
    Encrypt a credential string using Fernet (AES-256).
    
    Args:
        plaintext: The credential to encrypt.
    
    Returns:
        str: Base64-encoded encrypted credential.
    """
    if not plaintext:
        return ""
    
    key = get_encryption_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(plaintext.encode())
    return encrypted.decode()


def decrypt_credential(ciphertext: str) -> str:
    """
    Decrypt a credential string using Fernet (AES-256).
    
    Args:
        ciphertext: The base64-encoded encrypted credential.
    
    Returns:
        str: The decrypted plaintext credential.
    
    Raises:
        cryptography.fernet.InvalidToken: If decryption fails.
    """
    if not ciphertext:
        return ""
    
    key = get_encryption_key()
    fernet = Fernet(key)
    decrypted = fernet.decrypt(ciphertext.encode())
    return decrypted.decode()


def generate_encryption_key() -> str:
    """
    Generate a new Fernet-compatible encryption key.
    
    Returns:
        str: A new base64-encoded encryption key.
    """
    return Fernet.generate_key().decode()


def rotate_encryption_key(
    old_key: str, 
    new_key: str, 
    ciphertext: str
) -> str:
    """
    Re-encrypt data with a new key (for key rotation).
    
    Args:
        old_key: The current encryption key.
        new_key: The new encryption key.
        ciphertext: The data encrypted with old_key.
    
    Returns:
        str: The data re-encrypted with new_key.
    """
    # Decrypt with old key
    old_fernet = Fernet(old_key.encode())
    plaintext = old_fernet.decrypt(ciphertext.encode())
    
    # Re-encrypt with new key
    new_fernet = Fernet(new_key.encode())
    new_ciphertext = new_fernet.encrypt(plaintext)
    
    return new_ciphertext.decode()
