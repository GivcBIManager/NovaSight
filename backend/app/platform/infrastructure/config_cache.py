"""
NovaSight Platform — Infrastructure Configuration Cache
=========================================================

Redis-backed cache for infrastructure configurations with
pub/sub support for real-time propagation of changes.

Usage:
    from app.platform.infrastructure import InfrastructureConfigCache
    
    cache = InfrastructureConfigCache()
    
    # Get cached config (or fetch from DB)
    config = cache.get_config("clickhouse", tenant_id="tenant-123")
    
    # Invalidate after update
    cache.invalidate("clickhouse", tenant_id="tenant-123")
    
    # Publish change event (for workers/Dagster)
    cache.publish_change("clickhouse", tenant_id="tenant-123")
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Callable, List
from functools import wraps

logger = logging.getLogger(__name__)

# Redis key prefixes
CONFIG_CACHE_PREFIX = "novasight:infra:config:"
CONFIG_CHANNEL_PREFIX = "novasight:infra:change:"

# Cache TTL in seconds (5 minutes)
CONFIG_CACHE_TTL = 300


class InfrastructureConfigCache:
    """
    Redis-backed cache for infrastructure configurations.
    
    Features:
    - Automatic caching with TTL
    - Pub/sub for real-time change propagation
    - Tenant-specific and global config support
    - Thread-safe operations
    """
    
    def __init__(self, redis_client=None):
        """
        Initialize the cache.
        
        Args:
            redis_client: Optional Redis client. If not provided,
                         uses the app's redis_client from extensions.
        """
        self._redis = redis_client
        self._subscribers: Dict[str, List[Callable]] = {}
    
    @property
    def redis(self):
        """Get Redis client (lazy load from extensions)."""
        if self._redis is None:
            from app.extensions import redis_client
            self._redis = redis_client.client
        return self._redis
    
    def _cache_key(self, service_type: str, tenant_id: Optional[str] = None) -> str:
        """Generate cache key for a config."""
        if tenant_id:
            return f"{CONFIG_CACHE_PREFIX}{service_type}:tenant:{tenant_id}"
        return f"{CONFIG_CACHE_PREFIX}{service_type}:global"
    
    def _channel_key(self, service_type: str, tenant_id: Optional[str] = None) -> str:
        """Generate pub/sub channel key."""
        if tenant_id:
            return f"{CONFIG_CHANNEL_PREFIX}{service_type}:tenant:{tenant_id}"
        return f"{CONFIG_CHANNEL_PREFIX}{service_type}:global"
    
    # ─── Caching ──────────────────────────────────────────────
    
    def get_config(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
        fetch_if_missing: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """
        Get configuration from cache.
        
        Args:
            service_type: Infrastructure type (clickhouse, spark, etc.)
            tenant_id: Optional tenant ID for tenant-specific config
            fetch_if_missing: If True, fetch from DB if not cached
        
        Returns:
            Configuration dict or None
        """
        if not self.redis:
            # Fall back to direct DB access if Redis unavailable
            if fetch_if_missing:
                return self._fetch_from_db(service_type, tenant_id)
            return None
        
        cache_key = self._cache_key(service_type, tenant_id)
        
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.debug("Cache hit: %s", cache_key)
                return json.loads(cached)
        except Exception as e:
            logger.warning("Redis get failed: %s", e)
        
        # Cache miss - fetch from DB
        if fetch_if_missing:
            config = self._fetch_from_db(service_type, tenant_id)
            if config:
                self.set_config(service_type, config, tenant_id)
            return config
        
        return None
    
    def set_config(
        self,
        service_type: str,
        config: Dict[str, Any],
        tenant_id: Optional[str] = None,
        ttl: int = CONFIG_CACHE_TTL,
    ) -> bool:
        """
        Cache a configuration.
        
        Args:
            service_type: Infrastructure type
            config: Configuration dict to cache
            tenant_id: Optional tenant ID
            ttl: Cache TTL in seconds
        
        Returns:
            True if cached successfully
        """
        if not self.redis:
            return False
        
        cache_key = self._cache_key(service_type, tenant_id)
        
        try:
            self.redis.setex(
                cache_key,
                ttl,
                json.dumps(config, default=str),
            )
            logger.debug("Cached config: %s", cache_key)
            return True
        except Exception as e:
            logger.warning("Redis set failed: %s", e)
            return False
    
    def invalidate(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
    ) -> bool:
        """
        Invalidate cached configuration.
        
        Args:
            service_type: Infrastructure type
            tenant_id: Optional tenant ID
        
        Returns:
            True if invalidated successfully
        """
        if not self.redis:
            return False
        
        cache_key = self._cache_key(service_type, tenant_id)
        
        try:
            self.redis.delete(cache_key)
            logger.info("Invalidated cache: %s", cache_key)
            return True
        except Exception as e:
            logger.warning("Redis delete failed: %s", e)
            return False
    
    def invalidate_all(self, service_type: Optional[str] = None) -> int:
        """
        Invalidate all cached configs (or all for a service type).
        
        Returns:
            Number of keys invalidated
        """
        if not self.redis:
            return 0
        
        pattern = f"{CONFIG_CACHE_PREFIX}{service_type or '*'}:*"
        
        try:
            keys = list(self.redis.scan_iter(pattern))
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info("Invalidated %d cache entries", deleted)
                return deleted
            return 0
        except Exception as e:
            logger.warning("Redis scan/delete failed: %s", e)
            return 0
    
    # ─── Pub/Sub ──────────────────────────────────────────────
    
    def publish_change(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
        action: str = "updated",
        config_id: Optional[str] = None,
    ) -> int:
        """
        Publish a configuration change event.
        
        Args:
            service_type: Infrastructure type
            tenant_id: Optional tenant ID
            action: Change action (created, updated, deleted, activated)
            config_id: Optional config ID that changed
        
        Returns:
            Number of subscribers that received the message
        """
        if not self.redis:
            return 0
        
        # Publish to specific channel
        channel = self._channel_key(service_type, tenant_id)
        message = json.dumps({
            "service_type": service_type,
            "tenant_id": tenant_id,
            "action": action,
            "config_id": config_id,
            "timestamp": datetime.utcnow().isoformat(),
        })
        
        try:
            # Publish to specific channel
            count = self.redis.publish(channel, message)
            
            # Also publish to global channel for service type
            global_channel = f"{CONFIG_CHANNEL_PREFIX}{service_type}:all"
            self.redis.publish(global_channel, message)
            
            logger.info(
                "Published config change: %s (action=%s, subscribers=%d)",
                channel, action, count,
            )
            return count
        except Exception as e:
            logger.warning("Redis publish failed: %s", e)
            return 0
    
    def subscribe(
        self,
        callback: Callable[[Dict[str, Any]], None],
        service_type: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> str:
        """
        Subscribe to configuration change events.
        
        Args:
            callback: Function to call on config change
            service_type: Optional filter by service type
            tenant_id: Optional filter by tenant
        
        Returns:
            Subscription ID for unsubscribe
        """
        import uuid
        
        sub_id = str(uuid.uuid4())
        
        if service_type:
            if tenant_id:
                channel = self._channel_key(service_type, tenant_id)
            else:
                channel = f"{CONFIG_CHANNEL_PREFIX}{service_type}:all"
        else:
            channel = f"{CONFIG_CHANNEL_PREFIX}*"
        
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        
        self._subscribers[channel].append((sub_id, callback))
        
        return sub_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """Remove a subscription."""
        for channel, subs in self._subscribers.items():
            for idx, (sub_id, _) in enumerate(subs):
                if sub_id == subscription_id:
                    del subs[idx]
                    return True
        return False
    
    # ─── Internal ─────────────────────────────────────────────
    
    def _fetch_from_db(
        self,
        service_type: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Fetch configuration from database."""
        try:
            from app.domains.tenants.infrastructure.config_service import (
                InfrastructureConfigService,
            )
            
            service = InfrastructureConfigService()
            config = service.get_active_config(service_type, tenant_id)
            
            if config:
                return config.to_dict()
            
            # ClickHouse is per-tenant only - no fallback to defaults
            # Return None so the provider can raise appropriate error
            if service_type == "clickhouse" and tenant_id:
                logger.warning(
                    "No ClickHouse config found for tenant %s - no fallback",
                    tenant_id,
                )
                return None
            
            # For other services (Spark, Airflow, Ollama), return default settings
            settings = service.get_effective_settings(service_type, tenant_id)
            return {
                "service_type": service_type,
                "name": f"Default {service_type.title()}",
                "host": settings.get("host", "localhost"),
                "port": settings.get("port", 8080),
                "settings": settings,
                "is_system_default": True,
                "tenant_id": tenant_id,
            }
        except Exception as e:
            logger.error("Failed to fetch config from DB: %s", e)
            return None


# ─── Decorator for cache-aware functions ──────────────────────

def cached_config(service_type: str, tenant_id_param: str = "tenant_id"):
    """
    Decorator to automatically use cached infrastructure config.
    
    Usage:
        @cached_config("clickhouse")
        def get_clickhouse_client(config: Dict[str, Any]):
            return ClickHouseClient(host=config["host"], ...)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = InfrastructureConfigCache()
            tenant_id = kwargs.get(tenant_id_param)
            
            config = cache.get_config(service_type, tenant_id)
            if config is None:
                raise ValueError(
                    f"No {service_type} configuration found"
                    f"{f' for tenant {tenant_id}' if tenant_id else ''}"
                )
            
            return func(config, *args, **kwargs)
        return wrapper
    return decorator


# ─── Global cache instance ────────────────────────────────────

_config_cache: Optional[InfrastructureConfigCache] = None


def get_config_cache() -> InfrastructureConfigCache:
    """Get the global config cache instance."""
    global _config_cache
    if _config_cache is None:
        _config_cache = InfrastructureConfigCache()
    return _config_cache
