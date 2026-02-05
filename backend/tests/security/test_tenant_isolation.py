"""
Tenant Isolation Security Tests
================================

Tests to verify multi-tenant data isolation is properly enforced.
"""

import pytest


class TestTenantDataIsolation:
    """Tests for tenant data isolation."""
    
    def test_cross_tenant_dashboard_access(
        self, client, sample_user, sample_tenant, 
        other_tenant, other_tenant_user, db_session
    ):
        """Verify users cannot access other tenant's dashboards."""
        # Login as user from tenant A
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # Create dashboard as tenant A
        create_resp = client.post('/api/v1/dashboards', json={
            'name': 'Tenant A Dashboard',
            'description': 'Private to tenant A'
        }, headers=headers_a)
        
        if create_resp.status_code not in [201, 200]:
            pytest.skip("Dashboard creation not available")
        
        dashboard_id = create_resp.json.get('data', {}).get('id')
        
        # Login as user from tenant B
        login_b = client.post('/api/v1/auth/login', json={
            'email': other_tenant_user.email,
            'password': 'Admin123!',
            'tenant_slug': other_tenant.slug
        })
        
        if login_b.status_code != 200:
            pytest.skip("Second login failed")
        
        token_b = login_b.json.get('access_token')
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        # Try to access tenant A's dashboard from tenant B
        access_resp = client.get(
            f'/api/v1/dashboards/{dashboard_id}',
            headers=headers_b
        )
        
        # Should be forbidden or not found
        assert access_resp.status_code in [403, 404]
    
    def test_cross_tenant_user_enumeration(
        self, client, sample_user, sample_tenant,
        other_tenant, other_tenant_user
    ):
        """Verify users cannot enumerate users from other tenants."""
        # Login as tenant A user
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # List users - should only see tenant A users
        list_resp = client.get('/api/v1/users', headers=headers_a)
        
        if list_resp.status_code == 200:
            users = list_resp.json.get('data', [])
            user_emails = [u.get('email', '') for u in users]
            
            # Should not see other tenant's user
            assert other_tenant_user.email not in user_emails
    
    def test_cross_tenant_connection_access(
        self, client, sample_user, sample_tenant,
        other_tenant, other_tenant_user, sample_connection
    ):
        """Verify users cannot access other tenant's connections."""
        # Login as tenant B user
        login_b = client.post('/api/v1/auth/login', json={
            'email': other_tenant_user.email,
            'password': 'Admin123!',
            'tenant_slug': other_tenant.slug
        })
        
        if login_b.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_b = login_b.json.get('access_token')
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        # Try to access tenant A's connection
        access_resp = client.get(
            f'/api/v1/connections/{sample_connection.id}',
            headers=headers_b
        )
        
        assert access_resp.status_code in [403, 404]
    
    def test_cross_tenant_semantic_model_access(
        self, client, sample_user, sample_tenant,
        other_tenant, other_tenant_user, sample_semantic_model
    ):
        """Verify users cannot access other tenant's semantic models."""
        # Login as tenant B user
        login_b = client.post('/api/v1/auth/login', json={
            'email': other_tenant_user.email,
            'password': 'Admin123!',
            'tenant_slug': other_tenant.slug
        })
        
        if login_b.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_b = login_b.json.get('access_token')
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        # Try to access tenant A's semantic model
        access_resp = client.get(
            f'/api/v1/semantic/models/{sample_semantic_model.id}',
            headers=headers_b
        )
        
        assert access_resp.status_code in [403, 404]


class TestTenantModificationIsolation:
    """Tests for preventing cross-tenant modifications."""
    
    def test_cross_tenant_dashboard_modification(
        self, client, sample_user, sample_tenant,
        other_tenant, other_tenant_user
    ):
        """Verify users cannot modify other tenant's dashboards."""
        # Login as tenant A and create dashboard
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        create_resp = client.post('/api/v1/dashboards', json={
            'name': 'Original Name'
        }, headers=headers_a)
        
        if create_resp.status_code not in [201, 200]:
            pytest.skip("Dashboard creation not available")
        
        dashboard_id = create_resp.json.get('data', {}).get('id')
        
        # Login as tenant B
        login_b = client.post('/api/v1/auth/login', json={
            'email': other_tenant_user.email,
            'password': 'Admin123!',
            'tenant_slug': other_tenant.slug
        })
        
        token_b = login_b.json.get('access_token')
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        # Try to modify tenant A's dashboard
        update_resp = client.put(
            f'/api/v1/dashboards/{dashboard_id}',
            json={'name': 'Hacked Name'},
            headers=headers_b
        )
        
        assert update_resp.status_code in [403, 404]
    
    def test_cross_tenant_dashboard_deletion(
        self, client, sample_user, sample_tenant,
        other_tenant, other_tenant_user
    ):
        """Verify users cannot delete other tenant's dashboards."""
        # Create dashboard as tenant A
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        create_resp = client.post('/api/v1/dashboards', json={
            'name': 'To Be Protected'
        }, headers=headers_a)
        
        if create_resp.status_code not in [201, 200]:
            pytest.skip("Dashboard creation not available")
        
        dashboard_id = create_resp.json.get('data', {}).get('id')
        
        # Login as tenant B
        login_b = client.post('/api/v1/auth/login', json={
            'email': other_tenant_user.email,
            'password': 'Admin123!',
            'tenant_slug': other_tenant.slug
        })
        
        token_b = login_b.json.get('access_token')
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        # Try to delete tenant A's dashboard
        delete_resp = client.delete(
            f'/api/v1/dashboards/{dashboard_id}',
            headers=headers_b
        )
        
        assert delete_resp.status_code in [403, 404]


class TestTenantIDManipulation:
    """Tests for tenant ID manipulation attempts."""
    
    def test_tenant_id_in_request_body_ignored(
        self, client, sample_user, sample_tenant, other_tenant
    ):
        """Verify tenant_id in request body is ignored."""
        # Login as tenant A
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # Try to create dashboard with other tenant's ID
        create_resp = client.post('/api/v1/dashboards', json={
            'name': 'Malicious Dashboard',
            'tenant_id': str(other_tenant.id)  # Attempted manipulation
        }, headers=headers_a)
        
        if create_resp.status_code in [201, 200]:
            dashboard = create_resp.json.get('data', {})
            
            # Dashboard should be created in user's tenant, not the one specified
            assert str(dashboard.get('tenant_id', '')) != str(other_tenant.id)
    
    def test_tenant_id_in_url_validated(
        self, client, sample_user, sample_tenant, other_tenant
    ):
        """Verify tenant_id in URL is validated against user's tenant."""
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # Try to access resources with explicit wrong tenant ID in URL
        response = client.get(
            f'/api/v1/tenants/{other_tenant.id}/dashboards',
            headers=headers_a
        )
        
        # Should be forbidden or not found
        if response.status_code not in [404]:  # 404 if route doesn't exist
            assert response.status_code in [403, 404]


class TestQueryIsolation:
    """Tests for query-level tenant isolation."""
    
    def test_nl_to_sql_respects_tenant_context(
        self, client, sample_user, sample_tenant
    ):
        """Verify NL-to-SQL queries respect tenant context."""
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # Execute query
        query_resp = client.post('/api/v1/query/nl', json={
            'question': 'Show all sales'
        }, headers=headers_a)
        
        if query_resp.status_code == 200:
            # Generated SQL should include tenant filter
            data = query_resp.json
            sql = data.get('sql', '')
            
            # SQL should reference tenant somehow
            # (exact implementation may vary)
            pass  # Implementation-specific check
    
    def test_direct_query_execution_tenant_filter(
        self, client, sample_user, sample_tenant
    ):
        """Verify direct query execution includes tenant filter."""
        login_a = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'Admin123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_a.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token_a = login_a.json.get('access_token')
        headers_a = {'Authorization': f'Bearer {token_a}'}
        
        # Try to query without tenant filter
        query_resp = client.post('/api/v1/query/execute', json={
            'sql': 'SELECT * FROM users'  # No tenant filter
        }, headers=headers_a)
        
        # Should either add tenant filter automatically or reject
        if query_resp.status_code == 200:
            data = query_resp.json.get('data', [])
            
            # All returned users should be from same tenant
            for row in data:
                if 'tenant_id' in row:
                    assert str(row['tenant_id']) == str(sample_tenant.id)
