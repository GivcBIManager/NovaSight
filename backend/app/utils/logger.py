"""
Structured Logging Utilities
============================

JSON-formatted structured logging with context support.
Provides consistent log format across all NovaSight components.
"""

import logging
import json
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from flask import request, g, has_request_context


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging.
    
    Outputs logs in JSON format for easy parsing by log aggregation
    systems like Loki, Elasticsearch, or CloudWatch.
    """
    
    # Fields that should not be logged for security
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'api_key', 'apikey',
        'authorization', 'auth', 'credential', 'private_key'
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add request context if available
        if has_request_context():
            if hasattr(g, 'request_id'):
                log_entry['request_id'] = g.request_id
            if hasattr(g, 'tenant') and g.tenant:
                log_entry['tenant_id'] = str(g.tenant.id)
            if hasattr(g, 'current_user_id') and g.current_user_id:
                log_entry['user_id'] = str(g.current_user_id)
        
        # Add extra fields (sanitized)
        # Note: 'extra' is dynamically added by ContextLogger._log()
        extra = getattr(record, 'extra', None)
        if extra:
            sanitized_extra = self._sanitize_data(extra)
            log_entry.update(sanitized_extra)
        
        # Add exception info
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'stacktrace': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry, default=str)
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive fields from log data.
        
        Args:
            data: Dictionary to sanitize
            
        Returns:
            Sanitized dictionary
        """
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in self.SENSITIVE_FIELDS):
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            else:
                sanitized[key] = value
        
        return sanitized


class ContextLogAdapter(logging.LoggerAdapter):
    """Logger adapter that adds context to log messages."""
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Process log message and add extra context.
        
        Args:
            msg: Log message
            kwargs: Keyword arguments
            
        Returns:
            Processed (message, kwargs) tuple
        """
        extra = kwargs.get('extra', {})
        if self.extra:
            extra.update(self.extra)
        kwargs['extra'] = extra
        return msg, kwargs


class ContextLogger:
    """Logger with context support.
    
    Provides structured logging with automatic context injection
    for request ID, tenant ID, and user ID.
    
    Usage:
        logger = get_logger('datasource')
        logger.info('Data source created', datasource_id='uuid', type='postgresql')
    """
    
    def __init__(self, name: str):
        """Initialize context logger.
        
        Args:
            name: Logger name (will be prefixed with 'novasight.')
        """
        self.logger = logging.getLogger(name)
    
    def _log(self, level: int, message: str, exc_info: bool = False, **kwargs):
        """Internal log method with context support.
        
        Args:
            level: Log level
            message: Log message
            exc_info: Whether to include exception info
            **kwargs: Additional context to include in log
        """
        # Create extra dict for context
        extra = {'extra': kwargs} if kwargs else {}
        self.logger.log(level, message, extra=extra, exc_info=exc_info)
    
    def debug(self, message: str, **kwargs):
        """Log debug message.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.CRITICAL, message, **kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with stack trace.
        
        Args:
            message: Log message
            **kwargs: Additional context fields
        """
        self._log(logging.ERROR, message, exc_info=True, **kwargs)
    
    def with_context(self, **context) -> 'BoundLogger':
        """Create a bound logger with additional context.
        
        Args:
            **context: Context fields to bind
            
        Returns:
            BoundLogger with bound context
        """
        return BoundLogger(self, context)


class BoundLogger:
    """Logger with bound context that's included in every log message."""
    
    def __init__(self, parent: ContextLogger, context: Dict[str, Any]):
        """Initialize bound logger.
        
        Args:
            parent: Parent context logger
            context: Context to include in all logs
        """
        self._parent = parent
        self._context = context
    
    def _merge_context(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Merge bound context with log kwargs."""
        merged = self._context.copy()
        merged.update(kwargs)
        return merged
    
    def debug(self, message: str, **kwargs):
        self._parent.debug(message, **self._merge_context(kwargs))
    
    def info(self, message: str, **kwargs):
        self._parent.info(message, **self._merge_context(kwargs))
    
    def warning(self, message: str, **kwargs):
        self._parent.warning(message, **self._merge_context(kwargs))
    
    def error(self, message: str, **kwargs):
        self._parent.error(message, **self._merge_context(kwargs))
    
    def critical(self, message: str, **kwargs):
        self._parent.critical(message, **self._merge_context(kwargs))
    
    def exception(self, message: str, **kwargs):
        self._parent.exception(message, **self._merge_context(kwargs))


def setup_logging(app) -> ContextLogger:
    """Configure logging for the application.
    
    Sets up JSON formatting for all logs and configures log levels.
    
    Args:
        app: Flask application instance
        
    Returns:
        Configured ContextLogger for the application
    """
    # Get log level from config
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    json_logs = app.config.get('JSON_LOGS', True)
    
    # Configure root logger
    root = logging.getLogger()
    root.setLevel(log_level)
    
    # Remove default handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)
    
    # Add handler with appropriate formatter
    handler = logging.StreamHandler(sys.stdout)
    
    if json_logs:
        handler.setFormatter(JSONFormatter())
    else:
        # Human-readable format for development
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
    
    root.addHandler(handler)
    
    # Suppress noisy loggers
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('alembic').setLevel(logging.WARNING)
    
    app.logger.info('Logging configured', extra={
        'extra': {'log_level': log_level, 'json_format': json_logs}
    })
    
    return ContextLogger('novasight')


def get_logger(name: str) -> ContextLogger:
    """Get a logger for a module.
    
    Args:
        name: Module name (will be prefixed with 'novasight.')
        
    Returns:
        ContextLogger instance
        
    Usage:
        logger = get_logger('datasource')
        logger.info('Data source created', datasource_id='uuid', type='postgresql')
    """
    return ContextLogger(f'novasight.{name}')


# Pre-configured loggers for common components
api_logger = get_logger('api')
db_logger = get_logger('db')
auth_logger = get_logger('auth')
query_logger = get_logger('query')
template_logger = get_logger('template')
pipeline_logger = get_logger('pipeline')
datasource_logger = get_logger('datasource')
