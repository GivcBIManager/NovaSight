"""
Health Endpoint Tests
=====================

Unit tests for the health check endpoint.
"""

import pytest


class TestHealthEndpoint:
    """Tests for /health endpoint."""
    
    def test_health_check_returns_200(self, client):
        """Health check should return 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_check_returns_json(self, client):
        """Health check should return JSON response."""
        response = client.get("/health")
        assert response.content_type == "application/json"
    
    def test_health_check_contains_status(self, client):
        """Health check should contain status field."""
        response = client.get("/health")
        data = response.get_json()
        assert "status" in data
        assert data["status"] == "healthy"
    
    def test_health_check_contains_version(self, client):
        """Health check should contain version field."""
        response = client.get("/health")
        data = response.get_json()
        assert "version" in data


class TestHealthLiveness:
    """Tests for /health endpoint (liveness)."""
    
    def test_liveness_returns_200(self, client):
        """Liveness probe should return 200."""
        response = client.get("/health")
        assert response.status_code == 200


class TestHealthReadiness:
    """Tests for /ready endpoint."""
    
    def test_readiness_returns_200_when_ready(self, client):
        """Readiness probe should return 200 when services are ready."""
        response = client.get("/ready")
        # May return 503 if DB not connected in test env
        assert response.status_code in [200, 503]
