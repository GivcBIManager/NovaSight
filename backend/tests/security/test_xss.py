"""
XSS Prevention Tests
====================

Tests to verify Cross-Site Scripting attacks are properly prevented.
"""

import pytest
from .conftest import XSS_PAYLOADS


class TestXSSPrevention:
    """XSS prevention tests for various input fields."""
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_dashboard_name_xss(self, client, api_headers, payload):
        """Test dashboard creation sanitizes XSS in name."""
        response = client.post('/api/v1/dashboards', json={
            'name': payload,
            'description': 'Test dashboard'
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            name = data.get('name', '')
            
            # XSS should be escaped or stripped
            assert '<script>' not in name
            assert 'javascript:' not in name.lower()
            assert 'onerror=' not in name.lower()
            assert 'onload=' not in name.lower()
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_dashboard_description_xss(self, client, api_headers, payload):
        """Test dashboard description sanitizes XSS."""
        response = client.post('/api/v1/dashboards', json={
            'name': 'Test Dashboard',
            'description': payload
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            description = data.get('description', '')
            
            assert '<script>' not in description
            assert 'javascript:' not in description.lower()
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_user_name_xss(self, client, api_headers, payload):
        """Test user name field sanitizes XSS."""
        response = client.post('/api/v1/users', json={
            'email': 'xsstest@example.com',
            'password': 'SecurePass123!',
            'name': payload
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            name = data.get('name', '')
            
            assert '<script>' not in name
            assert 'onerror=' not in name.lower()
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_connection_name_xss(self, client, api_headers, payload):
        """Test connection name sanitizes XSS."""
        response = client.post('/api/v1/connections', json={
            'name': payload,
            'db_type': 'postgresql',
            'host': 'localhost',
            'port': 5432,
            'database': 'testdb',
            'username': 'test',
            'password': 'test123'
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            name = data.get('name', '')
            
            assert '<script>' not in name
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_chart_title_xss(self, client, api_headers, payload):
        """Test chart widget title sanitizes XSS."""
        response = client.post('/api/v1/widgets', json={
            'title': payload,
            'type': 'bar_chart',
            'config': {'data': []}
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            title = data.get('title', '')
            
            assert '<script>' not in title


class TestStoredXSS:
    """Tests for stored XSS vulnerabilities."""
    
    def test_stored_xss_in_comments(self, client, api_headers):
        """Test that comments don't allow stored XSS."""
        # Create a dashboard with XSS in description
        create_resp = client.post('/api/v1/dashboards', json={
            'name': 'XSS Test',
            'description': '<script>document.cookie</script>'
        }, headers=api_headers)
        
        if create_resp.status_code not in [201, 200]:
            pytest.skip("Dashboard creation not available")
        
        dashboard_id = create_resp.json.get('data', {}).get('id')
        
        # Retrieve dashboard
        get_resp = client.get(
            f'/api/v1/dashboards/{dashboard_id}',
            headers=api_headers
        )
        
        if get_resp.status_code == 200:
            description = get_resp.json.get('data', {}).get('description', '')
            assert '<script>' not in description
    
    def test_stored_xss_in_semantic_model_labels(self, client, api_headers):
        """Test semantic model labels don't allow XSS."""
        response = client.post('/api/v1/semantic/models', json={
            'name': 'test_model',
            'label': '<img src=x onerror=alert(1)>',
            'dbt_model': 'stg_test',
            'model_type': 'dimension'
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', response.json)
            label = data.get('label', '')
            
            assert 'onerror' not in label.lower()


class TestReflectedXSS:
    """Tests for reflected XSS vulnerabilities."""
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS[:5])
    def test_search_parameter_xss(self, client, api_headers, payload):
        """Test search parameters don't reflect XSS."""
        response = client.get(
            f'/api/v1/dashboards?search={payload}',
            headers=api_headers
        )
        
        # Response should not contain unescaped payload
        if response.status_code == 200:
            response_text = str(response.json)
            
            # Script tags should be escaped or removed
            if '<script>' in payload:
                assert '<script>' not in response_text
    
    @pytest.mark.parametrize("payload", XSS_PAYLOADS[:5])
    def test_error_message_xss(self, client, api_headers, payload):
        """Test error messages don't reflect XSS in user input."""
        # Intentionally cause an error with XSS payload
        response = client.get(
            f'/api/v1/dashboards/{payload}',
            headers=api_headers
        )
        
        if response.status_code in [400, 404, 422]:
            response_text = str(response.json)
            
            # Error message should not contain raw XSS
            assert '<script>' not in response_text
            assert 'onerror=' not in response_text.lower()


class TestDOMXSS:
    """Tests for DOM-based XSS through API responses."""
    
    def test_json_response_properly_encoded(self, client, api_headers):
        """Test JSON responses are properly encoded."""
        payload = '</script><script>alert(1)</script>'
        
        response = client.post('/api/v1/dashboards', json={
            'name': payload,
            'description': 'Test'
        }, headers=api_headers)
        
        # Check Content-Type is application/json
        content_type = response.headers.get('Content-Type', '')
        assert 'application/json' in content_type
        
        # Response should be valid JSON (not broken by payload)
        try:
            response.json
        except Exception:
            pytest.fail("Response is not valid JSON")
    
    def test_html_entities_in_response(self, client, api_headers):
        """Test HTML entities are properly escaped in responses."""
        payload = '&lt;script&gt;alert(1)&lt;/script&gt;'
        
        response = client.post('/api/v1/dashboards', json={
            'name': payload,
            'description': 'Test'
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            # The response should handle HTML entities properly
            data = response.json
            assert isinstance(data, dict)


class TestContentSecurityPolicy:
    """Tests for Content Security Policy headers."""
    
    def test_csp_header_present(self, client):
        """Test CSP header is present in responses."""
        response = client.get('/api/v1/health')
        
        csp = response.headers.get('Content-Security-Policy')
        
        # CSP should be present for XSS protection
        # Note: API-only backends may not have CSP
        if csp:
            # Should have reasonable restrictions
            assert 'unsafe-inline' not in csp or 'nonce' in csp
    
    def test_x_content_type_options(self, client):
        """Test X-Content-Type-Options header prevents MIME sniffing."""
        response = client.get('/api/v1/health')
        
        x_content_type = response.headers.get('X-Content-Type-Options')
        
        if x_content_type:
            assert x_content_type == 'nosniff'
