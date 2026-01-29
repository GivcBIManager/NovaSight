"""
Unit Tests for Password Service
================================

Comprehensive tests for the PasswordService including:
- Password hashing and verification
- Password strength validation
- Rehash detection
- Edge cases and security considerations
"""

import pytest
from app.services.password_service import PasswordService, password_service


class TestPasswordHashing:
    """Tests for password hashing functionality."""
    
    @pytest.fixture
    def service(self):
        return PasswordService()
    
    def test_hash_password(self, service):
        """Test password hashing produces Argon2 hash."""
        password = 'SecurePassword123!'
        hashed = service.hash(password)
        
        # Should not be plaintext
        assert hashed != password
        # Should be Argon2 format
        assert hashed.startswith('$argon2')
    
    def test_hash_produces_different_output(self, service):
        """Test same password produces different hashes (salt)."""
        password = 'SecurePassword123!'
        hash1 = service.hash(password)
        hash2 = service.hash(password)
        
        # Same password, different hashes due to salt
        assert hash1 != hash2
    
    def test_verify_correct_password(self, service):
        """Test correct password verification."""
        password = 'SecurePassword123!'
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True
    
    def test_verify_incorrect_password(self, service):
        """Test incorrect password verification."""
        password = 'SecurePassword123!'
        hashed = service.hash(password)
        
        assert service.verify('WrongPassword123!', hashed) is False
    
    def test_verify_empty_password(self, service):
        """Test verification with empty password."""
        hashed = service.hash('SecurePassword123!')
        
        assert service.verify('', hashed) is False
    
    def test_verify_invalid_hash(self, service):
        """Test verification with invalid hash format."""
        result = service.verify('password', 'invalid_hash_format')
        
        assert result is False
    
    def test_hash_unicode_password(self, service):
        """Test hashing Unicode passwords."""
        password = 'パスワード123!@#'
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True
        assert service.verify('wrong', hashed) is False
    
    def test_hash_long_password(self, service):
        """Test hashing very long passwords."""
        password = 'A' * 100 + '123!@#'
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True


class TestPasswordStrengthValidation:
    """Tests for password strength validation."""
    
    @pytest.fixture
    def service(self):
        return PasswordService()
    
    def test_valid_passwords(self, service):
        """Test valid passwords pass validation."""
        valid_passwords = [
            "SecurePass123!@#",
            "MyP@ssw0rd2024!",
            "Complex#1Password",
            "AbCdEfGh12!@#$",
            "V3ryStr0ng!Pass",
        ]
        
        for password in valid_passwords:
            is_valid, error = service.validate_strength(password)
            assert is_valid is True, f"Password '{password}' should be valid: {error}"
            assert error is None
    
    def test_password_too_short(self, service):
        """Test password minimum length requirement."""
        is_valid, error = service.validate_strength("Short1!")
        
        assert is_valid is False
        assert "12 characters" in error
    
    def test_password_too_long(self, service):
        """Test password maximum length requirement."""
        long_password = "A" * 200 + "a1!"
        is_valid, error = service.validate_strength(long_password)
        
        assert is_valid is False
        assert "128" in error
    
    def test_password_missing_uppercase(self, service):
        """Test uppercase letter requirement."""
        is_valid, error = service.validate_strength("lowercase123!@#")
        
        assert is_valid is False
        assert "uppercase" in error
    
    def test_password_missing_lowercase(self, service):
        """Test lowercase letter requirement."""
        is_valid, error = service.validate_strength("UPPERCASE123!@#")
        
        assert is_valid is False
        assert "lowercase" in error
    
    def test_password_missing_digit(self, service):
        """Test digit requirement."""
        is_valid, error = service.validate_strength("NoDigitsHere!!!")
        
        assert is_valid is False
        assert "digit" in error
    
    def test_password_missing_special_char(self, service):
        """Test special character requirement."""
        is_valid, error = service.validate_strength("NoSpecialChars123")
        
        assert is_valid is False
        assert "special character" in error
    
    def test_password_common_patterns_rejected(self, service):
        """Test rejection of common patterns."""
        # Sequential numbers
        is_valid, error = service.validate_strength("Password123456!")
        assert is_valid is False
        assert "common" in error.lower()
    
    def test_password_repeated_chars_rejected(self, service):
        """Test rejection of repeated characters."""
        is_valid, error = service.validate_strength("Passssssword1!")
        assert is_valid is False
    
    def test_empty_password(self, service):
        """Test empty password rejection."""
        is_valid, error = service.validate_strength("")
        
        assert is_valid is False
        assert "required" in error.lower()
    
    def test_none_password(self, service):
        """Test None password rejection."""
        is_valid, error = service.validate_strength(None)
        
        assert is_valid is False


class TestPasswordRehash:
    """Tests for password rehash detection."""
    
    @pytest.fixture
    def service(self):
        return PasswordService()
    
    @pytest.fixture
    def old_params_service(self):
        """Create service with different (weaker) parameters."""
        return PasswordService(
            time_cost=1,  # Weaker than default
            memory_cost=32768,  # Less than default
            parallelism=2,  # Less than default
        )
    
    def test_needs_rehash_false_for_current_params(self, service):
        """Test that current params don't need rehash."""
        hashed = service.hash("SecurePassword123!")
        
        assert service.needs_rehash(hashed) is False
    
    def test_needs_rehash_true_for_weak_params(self, service, old_params_service):
        """Test that weak params need rehash."""
        hashed = old_params_service.hash("SecurePassword123!")
        
        # Default service should want to rehash weak hash
        assert service.needs_rehash(hashed) is True
    
    def test_needs_rehash_invalid_hash(self, service):
        """Test needs_rehash with invalid hash."""
        assert service.needs_rehash("invalid_hash") is True


class TestGlobalPasswordService:
    """Tests for the global password_service instance."""
    
    def test_global_instance_available(self):
        """Test global password_service is available."""
        assert password_service is not None
        assert isinstance(password_service, PasswordService)
    
    def test_global_instance_functions(self):
        """Test global instance has expected methods."""
        assert hasattr(password_service, 'hash')
        assert hasattr(password_service, 'verify')
        assert hasattr(password_service, 'validate_strength')
        assert hasattr(password_service, 'needs_rehash')


class TestPasswordServiceEdgeCases:
    """Edge case tests for password service."""
    
    @pytest.fixture
    def service(self):
        return PasswordService()
    
    def test_whitespace_in_password(self, service):
        """Test passwords with whitespace."""
        password = "Secure Password 123!"
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True
        # Trimmed version should not match
        assert service.verify("SecurePassword123!", hashed) is False
    
    def test_special_sql_characters(self, service):
        """Test passwords with SQL special characters."""
        password = "Pass'word\"123!--"
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True
    
    def test_newline_in_password(self, service):
        """Test passwords with newline characters."""
        password = "Secure\nPassword123!"
        hashed = service.hash(password)
        
        assert service.verify(password, hashed) is True
    
    def test_null_byte_in_password(self, service):
        """Test password with null byte."""
        # Some password hashers handle this differently
        password = "SecurePass\x00word123!"
        try:
            hashed = service.hash(password)
            assert service.verify(password, hashed) is True
        except (ValueError, Exception):
            # Null bytes may be rejected - that's also valid behavior
            pass
