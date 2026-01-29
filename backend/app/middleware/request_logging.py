"""
Request/Response Logging Middleware
===================================

Logs all HTTP requests and responses with timing and context.
Generates unique request IDs for tracing.
"""

import uuid
import time
from typing import Optional
from flask import Flask, request, g, Response
from werkzeug.exceptions import HTTPException

from app.utils.logger import get_logger

logger = get_logger('http')


class RequestLoggingMiddleware:
    """Middleware for logging HTTP requests and responses.
    
    Features:
    - Unique request ID generation
    - Request/response timing
    - Structured log output
    - Exception logging
    - Request ID in response headers
    """
    
    def __init__(self, app: Optional[Flask] = None):
        """Initialize the middleware.
        
        Args:
            app: Flask application instance (optional)
        """
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask) -> None:
        """Initialize middleware with Flask application.
        
        Args:
            app: Flask application instance
        """
        self.app = app
        
        # Register before_request handler
        app.before_request(self._before_request)
        
        # Register after_request handler
        app.after_request(self._after_request)
    
    def _before_request(self) -> None:
        """Called before each request."""
        # Generate unique request ID (8 chars for brevity)
        g.request_id = str(uuid.uuid4())[:8]
        g.start_time = time.time()
        
        # Skip logging for health checks and metrics
        if self._should_skip_logging():
            return
        
        # Extract relevant request info
        log_data = {
            'request_id': g.request_id,
            'method': request.method,
            'path': request.path,
            'remote_addr': self._get_client_ip(),
            'user_agent': request.user_agent.string[:200] if request.user_agent.string else None,
        }
        
        # Add query string if present (sanitized)
        if request.query_string:
            log_data['query_string'] = self._sanitize_query_string(
                request.query_string.decode('utf-8', errors='replace')
            )
        
        # Add content length for POST/PUT/PATCH
        if request.method in ('POST', 'PUT', 'PATCH'):
            log_data['content_length'] = request.content_length
            log_data['content_type'] = request.content_type
        
        logger.info('Request started', **log_data)
    
    def _after_request(self, response: Response) -> Response:
        """Called after each request.
        
        Args:
            response: Flask response object
            
        Returns:
            Modified response with request ID header
        """
        # Calculate request duration
        duration = time.time() - getattr(g, 'start_time', time.time())
        
        # Add request ID to response headers
        request_id = getattr(g, 'request_id', 'unknown')
        response.headers['X-Request-ID'] = request_id
        
        # Skip logging for health checks and metrics
        if self._should_skip_logging():
            return response
        
        # Determine log level based on status code
        status_code = response.status_code
        
        log_data = {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'status_code': status_code,
            'duration_ms': round(duration * 1000, 2),
            'content_length': response.content_length,
        }
        
        # Log with appropriate level
        if status_code >= 500:
            logger.error('Request failed', **log_data)
        elif status_code >= 400:
            logger.warning('Request client error', **log_data)
        else:
            logger.info('Request completed', **log_data)
        
        return response
    
    def _should_skip_logging(self) -> bool:
        """Check if request should skip logging.
        
        Returns:
            True if logging should be skipped
        """
        skip_paths = {'/health', '/health/', '/ready', '/metrics', '/favicon.ico'}
        return request.path in skip_paths
    
    def _get_client_ip(self) -> str:
        """Get real client IP considering proxies.
        
        Returns:
            Client IP address
        """
        # Check X-Forwarded-For header (set by reverse proxies)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take first IP in the chain (original client)
            return forwarded_for.split(',')[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fall back to remote_addr
        return request.remote_addr or 'unknown'
    
    def _sanitize_query_string(self, query_string: str) -> str:
        """Sanitize query string to remove sensitive parameters.
        
        Args:
            query_string: Raw query string
            
        Returns:
            Sanitized query string
        """
        if not query_string:
            return query_string
        
        sensitive_params = {'password', 'token', 'api_key', 'secret', 'auth'}
        
        parts = []
        for param in query_string.split('&'):
            if '=' in param:
                key, _ = param.split('=', 1)
                if key.lower() in sensitive_params:
                    parts.append(f'{key}=[REDACTED]')
                else:
                    parts.append(param)
            else:
                parts.append(param)
        
        return '&'.join(parts)


def setup_request_logging(app: Flask) -> RequestLoggingMiddleware:
    """Setup request/response logging for the application.
    
    Args:
        app: Flask application instance
        
    Returns:
        Configured RequestLoggingMiddleware instance
    """
    middleware = RequestLoggingMiddleware(app)
    
    # Register exception handler for unhandled exceptions
    @app.errorhandler(Exception)
    def handle_exception(e: Exception):
        """Log unhandled exceptions."""
        request_id = getattr(g, 'request_id', 'unknown')
        
        # Don't log HTTP exceptions as errors (they're handled)
        if isinstance(e, HTTPException):
            logger.warning(
                'HTTP exception',
                request_id=request_id,
                error_type=type(e).__name__,
                status_code=getattr(e, 'code', 500),
                error_message=str(getattr(e, 'description', str(e))),
            )
        else:
            logger.exception(
                'Unhandled exception',
                request_id=request_id,
                error_type=type(e).__name__,
                error_message=str(e),
            )
        
        # Re-raise to let Flask handle the response
        raise e
    
    return middleware


# Convenience function for logging slow requests
def log_slow_request(threshold_ms: float = 1000.0):
    """Decorator to log slow request handlers.
    
    Args:
        threshold_ms: Threshold in milliseconds to consider request slow
        
    Returns:
        Decorator function
    """
    def decorator(f):
        from functools import wraps
        
        @wraps(f)
        def wrapped(*args, **kwargs):
            start = time.time()
            result = f(*args, **kwargs)
            duration_ms = (time.time() - start) * 1000
            
            if duration_ms > threshold_ms:
                logger.warning(
                    'Slow request handler',
                    handler=f.__name__,
                    duration_ms=round(duration_ms, 2),
                    threshold_ms=threshold_ms,
                    request_id=getattr(g, 'request_id', 'unknown'),
                )
            
            return result
        
        return wrapped
    return decorator
