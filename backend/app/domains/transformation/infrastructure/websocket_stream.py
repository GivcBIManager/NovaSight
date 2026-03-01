"""
WebSocket Log Streaming for dbt Executions.

Provides real-time log streaming for dbt command executions
using Flask-SocketIO (or a polling fallback if SocketIO is not available).

Usage:
    The frontend connects to /ws/dbt/executions/{exec_id}/stream
    and receives log lines as they arrive from the dbt subprocess.

    If Flask-SocketIO is not installed, the system falls back to
    a polling endpoint at GET /api/v1/dbt/executions/{exec_id}/logs?offset=N
"""

import logging
import threading
from typing import Callable, Dict, Optional

logger = logging.getLogger(__name__)

# In-memory log buffer per execution (cleared on completion)
_execution_logs: Dict[str, list] = {}
_log_locks: Dict[str, threading.Lock] = {}


def get_log_buffer(execution_id: str) -> list:
    """Get the log buffer for an execution, creating it if needed."""
    if execution_id not in _execution_logs:
        _execution_logs[execution_id] = []
        _log_locks[execution_id] = threading.Lock()
    return _execution_logs[execution_id]


def append_log_line(execution_id: str, line: str) -> None:
    """
    Append a log line to the execution's buffer.

    If SocketIO is available, also emit to connected clients.
    """
    buf = get_log_buffer(execution_id)
    lock = _log_locks.get(execution_id, threading.Lock())
    with lock:
        buf.append(line)

    # Try to emit via SocketIO if available
    try:
        from flask_socketio import emit
        emit(
            'dbt_log',
            {'execution_id': execution_id, 'line': line, 'offset': len(buf) - 1},
            namespace='/ws/dbt',
            room=execution_id,
        )
    except ImportError:
        pass
    except Exception as e:
        logger.debug("SocketIO emit failed (expected if not configured): %s", e)


def get_logs_since(execution_id: str, offset: int = 0) -> list:
    """Get log lines since a given offset (for polling fallback)."""
    buf = get_log_buffer(execution_id)
    return buf[offset:]


def clear_log_buffer(execution_id: str) -> None:
    """Clear the log buffer for a completed execution."""
    _execution_logs.pop(execution_id, None)
    _log_locks.pop(execution_id, None)


def register_socketio_handlers(socketio) -> None:
    """
    Register SocketIO event handlers for dbt log streaming.

    Called from the app factory if Flask-SocketIO is available.
    """
    @socketio.on('connect', namespace='/ws/dbt')
    def handle_connect():
        logger.debug("Client connected to /ws/dbt")

    @socketio.on('subscribe', namespace='/ws/dbt')
    def handle_subscribe(data):
        execution_id = data.get('execution_id')
        if execution_id:
            from flask_socketio import join_room
            join_room(execution_id)
            logger.debug("Client subscribed to execution %s", execution_id)
            # Send any buffered logs
            existing = get_log_buffer(execution_id)
            for i, line in enumerate(existing):
                from flask_socketio import emit
                emit('dbt_log', {
                    'execution_id': execution_id,
                    'line': line,
                    'offset': i,
                })

    @socketio.on('unsubscribe', namespace='/ws/dbt')
    def handle_unsubscribe(data):
        execution_id = data.get('execution_id')
        if execution_id:
            from flask_socketio import leave_room
            leave_room(execution_id)

    @socketio.on('disconnect', namespace='/ws/dbt')
    def handle_disconnect():
        logger.debug("Client disconnected from /ws/dbt")
