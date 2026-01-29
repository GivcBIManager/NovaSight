"""
SQL Injection Prevention Tests
==============================

Tests to verify SQL injection attacks are properly prevented.
"""

import pytest
from .conftest import SQL_INJECTION_PAYLOADS, COMMAND_INJECTION_PAYLOADS


class TestSQLInjection:
    """SQL injection prevention tests."""
    
    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_query_endpoint_injection(self, client, api_headers, payload):
        """Test NL-to-SQL endpoint blocks SQL injection."""
        response = client.post('/api/v1/query/execute', json={
            'query': payload
        }, headers=api_headers)
        
        # Should either reject or sanitize, not execute maliciously
        # 500 would indicate unhandled SQL error
        assert response.status_code != 500
        
        if response.status_code == 200:
            # Should not return data from injection
            data = str(response.json)
            assert 'password' not in data.lower()
            assert 'password_hash' not in data.lower()
    
    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_search_endpoint_injection(self, client, api_headers, payload):
        """Test search endpoints handle injection attempts."""
        response = client.get(
            f'/api/v1/dashboards?search={payload}',
            headers=api_headers
        )
        
        # OK or bad request, not internal error
        assert response.status_code in [200, 400, 404, 422]
        
        # Should not expose database errors
        if response.status_code >= 400:
            data = str(response.json) if response.json else ''
            assert 'sql' not in data.lower() or 'syntax' not in data.lower()
    
    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_connection_name_injection(self, client, api_headers, payload):
        """Test data source connection creation rejects injection."""
        response = client.post('/api/v1/connections', json={
            'name': payload,
            'db_type': 'postgresql',
            'host': 'localhost',
            'port': 5432,
            'database': 'testdb',
            'username': 'test',
            'password': 'test123'
        }, headers=api_headers)
        
        # Should not cause SQL error
        assert response.status_code != 500
    
    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_user_filter_injection(self, client, api_headers, payload):
        """Test user listing with filter injection."""
        response = client.get(
            f'/api/v1/users?email={payload}',
            headers=api_headers
        )
        
        assert response.status_code in [200, 400, 404, 422]
        
        # Check no sensitive data leaked
        if response.status_code == 200:
            data = str(response.json)
            assert 'password_hash' not in data
    
    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_semantic_query_injection(self, client, api_headers, payload):
        """Test semantic layer query endpoint."""
        response = client.post('/api/v1/semantic/query', json={
            'model': 'sales_orders',
            'dimensions': [payload],
            'measures': ['total_amount'],
            'filters': []
        }, headers=api_headers)
        
        # Should validate input, not pass to SQL directly
        assert response.status_code != 500
        
        if response.status_code == 400 or response.status_code == 422:
            # Good - validation caught it
            pass
    
    def test_order_by_injection(self, client, api_headers):
        """Test ORDER BY clause injection."""
        payloads = [
            "name; DROP TABLE users --",
            "1,extractvalue(0x0a,concat(0x0a,(select database())))",
            "name ASC, (SELECT password FROM users LIMIT 1)",
        ]
        
        for payload in payloads:
            response = client.get(
                f'/api/v1/dashboards?sort={payload}',
                headers=api_headers
            )
            
            assert response.status_code != 500
    
    def test_limit_injection(self, client, api_headers):
        """Test LIMIT/OFFSET injection."""
        payloads = [
            "10; DROP TABLE users --",
            "1 UNION SELECT * FROM users --",
            "-1",
            "0x0a",
        ]
        
        for payload in payloads:
            response = client.get(
                f'/api/v1/dashboards?limit={payload}',
                headers=api_headers
            )
            
            assert response.status_code in [200, 400, 404, 422]


class TestNoSQLInjection:
    """NoSQL injection prevention tests (if applicable)."""
    
    def test_mongodb_operator_injection(self, client, api_headers):
        """Test MongoDB operator injection prevention."""
        payloads = [
            '{"$gt": ""}',
            '{"$ne": null}',
            '{"$where": "this.password"}',
            '{"$regex": ".*"}',
        ]
        
        for payload in payloads:
            response = client.post('/api/v1/query/execute', json={
                'filter': payload
            }, headers=api_headers)
            
            # Should not cause unhandled errors
            assert response.status_code != 500


class TestCommandInjection:
    """Command injection prevention tests."""
    
    @pytest.mark.parametrize("payload", COMMAND_INJECTION_PAYLOADS)
    def test_connection_host_injection(self, client, api_headers, payload):
        """Test command injection via connection host field."""
        response = client.post('/api/v1/connections', json={
            'name': 'Test Connection',
            'db_type': 'postgresql',
            'host': payload,
            'port': 5432,
            'database': 'testdb',
            'username': 'test',
            'password': 'test123'
        }, headers=api_headers)
        
        # Should validate host format
        assert response.status_code in [400, 422, 201]
        
        # If created, host should be sanitized or validated
        if response.status_code == 201:
            data = response.json
            if 'data' in data and 'host' in data['data']:
                assert '|' not in data['data']['host']
                assert ';' not in data['data']['host']
    
    @pytest.mark.parametrize("payload", COMMAND_INJECTION_PAYLOADS)
    def test_export_filename_injection(self, client, api_headers, payload):
        """Test command injection via export filename."""
        response = client.post('/api/v1/export', json={
            'dashboard_id': 'test-id',
            'format': 'pdf',
            'filename': payload
        }, headers=api_headers)
        
        # Should validate filename
        assert response.status_code in [400, 404, 422]


class TestSecondOrderInjection:
    """Second-order SQL injection tests."""
    
    def test_stored_injection_via_user_name(
        self, client, api_headers, db_session
    ):
        """Test that stored data doesn't cause injection when retrieved."""
        # Create user with malicious name
        malicious_name = "'; DROP TABLE users; --"
        
        response = client.post('/api/v1/users', json={
            'email': 'malicious@example.com',
            'password': 'SecurePass123!',
            'name': malicious_name
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            user_id = response.json.get('data', {}).get('id')
            
            # Retrieve the user - should not execute the injection
            get_resp = client.get(
                f'/api/v1/users/{user_id}',
                headers=api_headers
            )
            
            assert get_resp.status_code in [200, 404]
    
    def test_stored_injection_via_dashboard_name(
        self, client, api_headers
    ):
        """Test dashboard names don't cause second-order injection."""
        malicious_name = "Dashboard '; SELECT * FROM users WHERE '1'='1"
        
        response = client.post('/api/v1/dashboards', json={
            'name': malicious_name,
            'description': 'Test'
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            # List dashboards - should not trigger injection
            list_resp = client.get('/api/v1/dashboards', headers=api_headers)
            assert list_resp.status_code == 200
            
            # Search by name - should not trigger injection
            search_resp = client.get(
                f'/api/v1/dashboards?search={malicious_name}',
                headers=api_headers
            )
            assert search_resp.status_code in [200, 400]
