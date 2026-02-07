"""
NovaSight Platform – Token Service
====================================

Redis-backed token blacklist and login-attempt tracker.

Canonical location – all other modules should import from here.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TokenBlacklist:
    """
    Redis-based token blacklist for invalidating JWTs on logout.

    Tokens are stored with their JTI (JWT ID) as key and automatically
    expire when the original token would have expired.
    """

    PREFIX = "token_blacklist:"

    def __init__(self):
        self._redis = None

    @property
    def redis(self):
        if self._redis is None:
            from app.extensions import redis_client
            self._redis = redis_client.client
        return self._redis

    # ── mutators ───────────────────────────────────────────────────

    def add(self, jti: str, expires_in: int) -> bool:
        """Add *jti* to the blacklist; auto-expires after *expires_in* seconds."""
        if not self.redis:
            logger.warning("Redis not available for token blacklist")
            return False
        try:
            self.redis.setex(f"{self.PREFIX}{jti}", expires_in, "1")
            logger.debug("Token %s added to blacklist, expires in %ds", jti, expires_in)
            return True
        except Exception as e:
            logger.error("Failed to add token to blacklist: %s", e)
            return False

    def remove(self, jti: str) -> bool:
        """Remove *jti* from the blacklist."""
        if not self.redis:
            return False
        try:
            self.redis.delete(f"{self.PREFIX}{jti}")
            return True
        except Exception as e:
            logger.error("Failed to remove token from blacklist: %s", e)
            return False

    def clear_all(self) -> int:
        """Remove **all** blacklisted tokens.  Returns count cleared."""
        if not self.redis:
            return 0
        try:
            keys = self.redis.keys(f"{self.PREFIX}*")
            return self.redis.delete(*keys) if keys else 0
        except Exception as e:
            logger.error("Failed to clear token blacklist: %s", e)
            return 0

    # ── queries ────────────────────────────────────────────────────

    def is_blacklisted(self, jti: str) -> bool:
        """Return ``True`` if *jti* is blacklisted."""
        if not self.redis:
            # Fail-open when Redis is unavailable.
            return False
        try:
            return self.redis.exists(f"{self.PREFIX}{jti}") > 0
        except Exception as e:
            logger.error("Failed to check token blacklist: %s", e)
            return False


class LoginAttemptTracker:
    """Rate-limit failed logins and apply time-based lockout."""

    PREFIX = "login_attempts:"
    LOCKOUT_PREFIX = "login_lockout:"

    MAX_ATTEMPTS = 5
    ATTEMPT_WINDOW = 300       # 5 minutes
    LOCKOUT_DURATION = 900     # 15 minutes

    def __init__(self):
        self._redis = None

    @property
    def redis(self):
        if self._redis is None:
            from app.extensions import redis_client
            self._redis = redis_client.client
        return self._redis

    # ── recording ──────────────────────────────────────────────────

    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record a login attempt for *identifier* (email or IP)."""
        if not self.redis:
            return
        try:
            if success:
                self.clear_attempts(identifier)
                return
            key = f"{self.PREFIX}{identifier}"
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.ATTEMPT_WINDOW)
            pipe.execute()
            if self.get_attempts(identifier) >= self.MAX_ATTEMPTS:
                self._apply_lockout(identifier)
        except Exception as e:
            logger.error("Failed to record login attempt: %s", e)

    # ── queries ────────────────────────────────────────────────────

    def get_attempts(self, identifier: str) -> int:
        if not self.redis:
            return 0
        try:
            count = self.redis.get(f"{self.PREFIX}{identifier}")
            return int(count) if count else 0
        except Exception as e:
            logger.error("Failed to get login attempts: %s", e)
            return 0

    def is_locked_out(self, identifier: str) -> bool:
        if not self.redis:
            return False
        try:
            return self.redis.exists(f"{self.LOCKOUT_PREFIX}{identifier}") > 0
        except Exception as e:
            logger.error("Failed to check lockout status: %s", e)
            return False

    def get_lockout_remaining(self, identifier: str) -> int:
        if not self.redis:
            return 0
        try:
            ttl = self.redis.ttl(f"{self.LOCKOUT_PREFIX}{identifier}")
            return max(0, ttl)
        except Exception as e:
            logger.error("Failed to get lockout remaining: %s", e)
            return 0

    # ── mutators ───────────────────────────────────────────────────

    def _apply_lockout(self, identifier: str) -> None:
        try:
            self.redis.setex(f"{self.LOCKOUT_PREFIX}{identifier}", self.LOCKOUT_DURATION, "1")
            logger.warning("Account locked out: %s", identifier)
        except Exception as e:
            logger.error("Failed to apply lockout: %s", e)

    def clear_attempts(self, identifier: str) -> None:
        if not self.redis:
            return
        try:
            self.redis.delete(f"{self.PREFIX}{identifier}")
        except Exception as e:
            logger.error("Failed to clear attempts: %s", e)

    def clear_lockout(self, identifier: str) -> None:
        if not self.redis:
            return
        try:
            self.redis.delete(f"{self.LOCKOUT_PREFIX}{identifier}")
            self.clear_attempts(identifier)
            logger.info("Lockout cleared for: %s", identifier)
        except Exception as e:
            logger.error("Failed to clear lockout: %s", e)


# ─── Singletons ─────────────────────────────────────────────────────
token_blacklist = TokenBlacklist()
login_tracker = LoginAttemptTracker()
