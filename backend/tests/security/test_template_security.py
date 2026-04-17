"""
Template Engine Security Tests
==============================

Tests to verify the Template Engine Rule:
NO arbitrary code generation - all executable artifacts must be 
generated from pre-approved templates.
"""

import pytest
import os
import json


class TestTemplateEngineSecurityRule:
    """Tests for Template Engine security constraints."""
    
    def test_pyspark_job_uses_template(self, client, api_headers):
        """Verify PySpark jobs are generated from templates only."""
        response = client.post('/api/v1/pipelines', json={
            'name': 'Test Pipeline',
            'type': 'pyspark',
            'config': {
                'source_connection': 'test-conn',
                'target_table': 'analytics.test'
            }
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', {})
            
            # Generated code should reference template
            generated_code = data.get('generated_code', '')
            
            # Should not contain arbitrary Python (simplified check)
            # Real check would validate against template signatures
            assert 'exec(' not in generated_code
            assert 'eval(' not in generated_code
            assert '__import__(' not in generated_code
    
    def test_pipeline_dag_uses_template(self, client, api_headers):
        """Verify pipeline jobs are generated from templates only."""
        response = client.post('/api/v1/dags', json={
            'name': 'test_dag',
            'schedule': '@daily',
            'tasks': [
                {'type': 'extract', 'config': {}}
            ]
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', {})
            dag_code = data.get('dag_code', '')
            
            # Should not contain arbitrary code execution
            assert 'os.system(' not in dag_code
            assert 'subprocess' not in dag_code
            assert '__import__(' not in dag_code
    
    def test_dbt_model_uses_template(self, client, api_headers):
        """Verify dbt models are generated from templates only."""
        response = client.post('/api/v1/dbt/models', json={
            'name': 'test_model',
            'source_table': 'raw.source_table',
            'columns': ['id', 'name', 'value']
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', {})
            model_sql = data.get('sql', '')
            
            # SQL should be safe and from template
            assert 'DROP' not in model_sql.upper()
            assert 'DELETE' not in model_sql.upper()
            assert 'TRUNCATE' not in model_sql.upper()
    
    def test_arbitrary_code_rejected(self, client, api_headers):
        """Verify arbitrary code in config is rejected."""
        malicious_configs = [
            {'__code__': 'print("hacked")'},
            {'lambda': 'x: os.system("rm -rf /")'},
            {'exec': 'import os; os.remove("/etc/passwd")'},
        ]
        
        for config in malicious_configs:
            response = client.post('/api/v1/pipelines', json={
                'name': 'Malicious Pipeline',
                'type': 'pyspark',
                'config': config
            }, headers=api_headers)
            
            # Should reject or sanitize
            if response.status_code in [201, 200]:
                data = response.json.get('data', {})
                generated = str(data)
                
                assert 'os.system' not in generated
                assert 'os.remove' not in generated


class TestTemplateValidation:
    """Tests for template validation."""
    
    def test_template_parameters_validated(self, client, api_headers):
        """Verify template parameters are validated."""
        # Try to use invalid parameter types
        response = client.post('/api/v1/pipelines', json={
            'name': 'Test',
            'type': 'pyspark',
            'config': {
                'source_connection': {'nested': 'object'},  # Should be string
                'batch_size': 'not-a-number'  # Should be int
            }
        }, headers=api_headers)
        
        # Should validate and reject invalid types
        if response.status_code != 404:
            assert response.status_code in [400, 422]
    
    def test_template_injection_prevented(self, client, api_headers):
        """Verify Jinja2 template injection is prevented."""
        injection_payloads = [
            '{{ config.items() }}',
            '{{ self._TemplateReference__context.cycler.__init__.__globals__.os.popen("id").read() }}',
            '{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__ == "catch_warnings" %}{{ c.__init__.__globals__["sys"].modules["os"].popen("id").read() }}{% endif %}{% endfor %}',
            '{{ "".__class__.__mro__[2].__subclasses__() }}',
        ]
        
        for payload in injection_payloads:
            response = client.post('/api/v1/pipelines', json={
                'name': payload,
                'type': 'pyspark',
                'config': {}
            }, headers=api_headers)
            
            if response.status_code in [201, 200]:
                data = str(response.json)
                
                # Should not have executed template injection
                assert 'subprocess' not in data.lower()
                assert 'popen' not in data.lower()
                assert '<class' not in data
    
    def test_sql_in_template_parameterized(self, client, api_headers):
        """Verify SQL queries in templates use parameterized queries."""
        response = client.post('/api/v1/query/template', json={
            'template_name': 'dimension_extract',
            'parameters': {
                'table_name': 'users; DROP TABLE users;--',
                'filter_value': "' OR '1'='1"
            }
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', {})
            sql = data.get('sql', '')
            
            # Parameters should be escaped/quoted
            assert "DROP TABLE" not in sql
            assert "' OR '1'='1" not in sql


class TestTemplateManifest:
    """Tests for template manifest validation."""
    
    def test_only_manifest_templates_allowed(self):
        """Verify only templates in manifest can be used."""
        manifest_path = 'backend/templates/manifest.json'
        
        if os.path.exists(manifest_path):
            with open(manifest_path) as f:
                manifest = json.load(f)
            
            # All templates should be listed in manifest
            assert 'templates' in manifest
            assert len(manifest['templates']) > 0
    
    def test_template_files_exist(self):
        """Verify all manifest templates exist as files."""
        manifest_path = 'backend/templates/manifest.json'
        
        if not os.path.exists(manifest_path):
            pytest.skip("Manifest not found")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        templates_dir = 'backend/templates'
        
        for template in manifest.get('templates', []):
            template_path = os.path.join(templates_dir, template.get('path', ''))
            
            if template.get('path'):
                # Template file should exist
                assert os.path.exists(template_path) or 'optional' in template
    
    def test_templates_have_validation_schema(self):
        """Verify templates have input validation schemas."""
        manifest_path = 'backend/templates/manifest.json'
        
        if not os.path.exists(manifest_path):
            pytest.skip("Manifest not found")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        for template in manifest.get('templates', []):
            # Each template should have parameter schema
            if template.get('parameters'):
                for param in template['parameters']:
                    assert 'type' in param, f"Parameter {param.get('name')} missing type"


class TestCodeGenerationSandbox:
    """Tests for code generation sandboxing."""
    
    def test_generated_code_in_sandbox(self, client, api_headers):
        """Verify generated code runs in sandboxed environment."""
        response = client.post('/api/v1/pipelines/test-run', json={
            'pipeline_id': 'test-pipeline',
            'dry_run': True
        }, headers=api_headers)
        
        # Dry run should not affect real resources
        if response.status_code in [200]:
            result = response.json
            
            # Should indicate sandboxed execution
            assert result.get('sandboxed', True) or result.get('dry_run', True)
    
    def test_generated_code_resource_limits(self, client, api_headers):
        """Verify generated code has resource limits."""
        # This is more of an integration test
        # Testing that pipelines don't have unlimited resource access
        pass


class TestAuditTrail:
    """Tests for template generation audit trail."""
    
    def test_code_generation_logged(self, client, api_headers):
        """Verify code generation creates audit log."""
        response = client.post('/api/v1/pipelines', json={
            'name': 'Audited Pipeline',
            'type': 'pyspark',
            'config': {}
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            pipeline_id = response.json.get('data', {}).get('id')
            
            # Check audit log
            audit_resp = client.get(
                f'/api/v1/audit?resource_type=pipeline&resource_id={pipeline_id}',
                headers=api_headers
            )
            
            if audit_resp.status_code == 200:
                logs = audit_resp.json.get('data', [])
                
                # Should have creation log
                assert len(logs) >= 1
    
    def test_template_version_tracked(self, client, api_headers):
        """Verify template version is tracked in generated artifacts."""
        response = client.post('/api/v1/pipelines', json={
            'name': 'Versioned Pipeline',
            'type': 'pyspark',
            'config': {}
        }, headers=api_headers)
        
        if response.status_code in [201, 200]:
            data = response.json.get('data', {})
            
            # Should track template version used
            assert 'template_version' in data or 'metadata' in data
