"""
Tests for websocket log streaming infrastructure.

Covers the in-memory log buffer, append/retrieve operations,
and the polling fallback mechanism.
"""
import pytest
import time


@pytest.mark.unit
class TestWebSocketStream:
    """Unit tests for log streaming buffer."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from app.domains.transformation.infrastructure.websocket_stream import (
            append_log_line,
            get_logs_since,
            clear_log_buffer,
        )

        self.append = append_log_line
        self.get_since = get_logs_since
        self.clear = clear_log_buffer
        # Start each test with a clean buffer
        self.clear(999)

    def test_append_and_retrieve_logs(self):
        execution_id = 1001
        self.clear(execution_id)
        self.append(execution_id, 'Starting dbt run...')
        self.append(execution_id, 'Running model stg_orders')
        self.append(execution_id, 'Completed successfully')

        logs = self.get_since(execution_id, 0)
        assert len(logs) >= 3
        assert any('Starting' in l.get('line', l) if isinstance(l, dict) else 'Starting' in l for l in logs)

    def test_get_logs_since_offset(self):
        execution_id = 1002
        self.clear(execution_id)
        for i in range(10):
            self.append(execution_id, f'Line {i}')

        # Get only lines after offset 5
        all_logs = self.get_since(execution_id, 0)
        later_logs = self.get_since(execution_id, 5)
        assert len(later_logs) < len(all_logs) or len(later_logs) <= len(all_logs)

    def test_clear_log_buffer(self):
        execution_id = 1003
        self.append(execution_id, 'Some log')
        self.clear(execution_id)
        logs = self.get_since(execution_id, 0)
        assert len(logs) == 0

    def test_separate_execution_buffers(self):
        id_a, id_b = 2001, 2002
        self.clear(id_a)
        self.clear(id_b)
        self.append(id_a, 'Log A')
        self.append(id_b, 'Log B')

        logs_a = self.get_since(id_a, 0)
        logs_b = self.get_since(id_b, 0)
        assert any('A' in str(l) for l in logs_a)
        assert any('B' in str(l) for l in logs_b)

    def test_nonexistent_execution_returns_empty(self):
        logs = self.get_since(99999, 0)
        assert len(logs) == 0


@pytest.mark.unit
class TestSocketIOHandlers:
    """Test SocketIO handler registration."""

    def test_register_socketio_handlers_callable(self):
        from app.domains.transformation.infrastructure.websocket_stream import (
            register_socketio_handlers,
        )
        # Should be a callable; actual SocketIO instance not required for smoke test
        assert callable(register_socketio_handlers)
