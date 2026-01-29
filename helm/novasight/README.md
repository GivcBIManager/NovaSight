# NovaSight Helm Chart

A Helm chart for deploying the NovaSight Self-Service BI Platform on Kubernetes.

## Prerequisites

- Kubernetes 1.23+
- Helm 3.0+
- PV provisioner support (for persistence)
- cert-manager (for TLS certificates)
- NGINX Ingress Controller (or compatible)

## Installation

### Add Dependencies

```bash
helm dependency update ./helm/novasight
```

### Install Chart

```bash
# Development/Default
helm install novasight ./helm/novasight -n novasight --create-namespace

# Staging
helm install novasight ./helm/novasight \
  -f ./helm/novasight/values-staging.yaml \
  -n novasight-staging --create-namespace

# Production
helm install novasight ./helm/novasight \
  -f ./helm/novasight/values-production.yaml \
  -n novasight-prod --create-namespace \
  --set backend.secrets.databaseUrl="postgresql://..." \
  --set backend.secrets.secretKey="your-secret-key" \
  --set backend.secrets.jwtSecretKey="your-jwt-secret"
```

## Configuration

See [values.yaml](values.yaml) for the full list of configurable parameters.

### Key Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.replicaCount` | Number of backend replicas | `3` |
| `backend.autoscaling.enabled` | Enable HPA for backend | `true` |
| `frontend.replicaCount` | Number of frontend replicas | `2` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts` | Ingress hostnames | `[]` |
| `postgresql.enabled` | Deploy PostgreSQL | `true` |
| `redis.enabled` | Deploy Redis | `true` |
| `clickhouse.enabled` | Deploy ClickHouse | `true` |
| `ollama.enabled` | Deploy Ollama for NL-to-SQL | `true` |

## Upgrading

```bash
helm upgrade novasight ./helm/novasight -n novasight -f values-production.yaml
```

## Uninstalling

```bash
helm uninstall novasight -n novasight
```

## License

Apache 2.0
