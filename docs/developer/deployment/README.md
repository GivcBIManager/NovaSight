# Deployment Guide

This guide covers deploying NovaSight to production environments using Kubernetes and Helm.

## Deployment Options

| Option | Use Case | Complexity |
|--------|----------|------------|
| Docker Compose | Development, Demo | Low |
| Kubernetes (Manual) | Small deployments | Medium |
| Helm Chart | Production | Medium |
| Kubernetes + ArgoCD | Enterprise GitOps | High |

## Prerequisites

- Kubernetes cluster (1.28+)
- kubectl configured
- Helm 3.12+
- Container registry access
- Domain and TLS certificates

## Quick Links

- [Kubernetes Deployment](kubernetes.md) - Manual K8s manifests
- [Helm Deployment](helm.md) - Helm chart deployment
- [Monitoring Setup](monitoring.md) - Prometheus & Grafana

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Ingress Controller                     │   │
│  │                    (NGINX / Traefik)                      │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                    Application Layer                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Frontend   │  │   Backend    │  │   Workers    │    │   │
│  │  │   (3 pods)   │  │   (5 pods)   │  │   (3 pods)   │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  PostgreSQL  │  │  ClickHouse  │  │    Redis     │    │   │
│  │  │   (HA)       │  │   (Cluster)  │  │   (Cluster)  │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Orchestration Layer                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Airflow    │  │    Spark     │  │   Ollama     │    │   │
│  │  │   Scheduler  │  │   Workers    │  │   (GPU)      │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Production Environment Variables

```yaml
# Backend
FLASK_ENV: production
SECRET_KEY: <generate-secure-key>
DATABASE_URL: postgresql://user:pass@postgres:5432/novasight
CLICKHOUSE_URL: clickhouse://default:pass@clickhouse:8123/default
REDIS_URL: redis://:pass@redis:6379/0
JWT_SECRET_KEY: <generate-secure-key>
OLLAMA_URL: http://ollama:11434

# Frontend
VITE_API_URL: https://api.novasight.io
VITE_WS_URL: wss://api.novasight.io
```

### Secret Management

Use Kubernetes Secrets or external secret managers:

```bash
# Create secrets
kubectl create secret generic novasight-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=secret-key='...' \
  --from-literal=jwt-secret='...'
```

Or use External Secrets Operator with AWS Secrets Manager / HashiCorp Vault.

## Resource Requirements

### Minimum Production Resources

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| Frontend | 0.5 | 512Mi | - |
| Backend | 1 | 2Gi | - |
| Workers | 1 | 2Gi | - |
| PostgreSQL | 2 | 4Gi | 100Gi |
| ClickHouse | 4 | 16Gi | 500Gi |
| Redis | 0.5 | 1Gi | 10Gi |
| Airflow | 2 | 4Gi | 50Gi |
| Ollama | 4 | 16Gi | 50Gi |

### Recommended Production Resources

| Component | CPU | Memory | Storage | Replicas |
|-----------|-----|--------|---------|----------|
| Frontend | 1 | 1Gi | - | 3 |
| Backend | 2 | 4Gi | - | 5 |
| Workers | 2 | 4Gi | - | 3 |
| PostgreSQL | 4 | 8Gi | 500Gi | 3 (HA) |
| ClickHouse | 8 | 32Gi | 2Ti | 3 (Cluster) |
| Redis | 1 | 2Gi | 50Gi | 3 (Sentinel) |
| Airflow | 4 | 8Gi | 100Gi | 2 (HA) |
| Ollama | 8 + GPU | 32Gi | 100Gi | 2 |

## Deployment Steps

### 1. Prepare Cluster

```bash
# Create namespace
kubectl create namespace novasight

# Set context
kubectl config set-context --current --namespace=novasight
```

### 2. Deploy with Helm

```bash
# Add Helm repo
helm repo add novasight https://charts.novasight.io
helm repo update

# Install with custom values
helm install novasight novasight/novasight \
  -f values-production.yaml \
  --namespace novasight
```

See [Helm Deployment](helm.md) for detailed configuration.

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n novasight

# Check services
kubectl get svc -n novasight

# Check ingress
kubectl get ingress -n novasight

# View logs
kubectl logs -f deployment/novasight-backend -n novasight
```

### 4. Run Migrations

```bash
# Run database migrations
kubectl exec -it deployment/novasight-backend -- flask db upgrade

# Seed initial data (if needed)
kubectl exec -it deployment/novasight-backend -- flask seed admin
```

## High Availability

### Database HA

- **PostgreSQL**: Use Patroni or Cloud-managed (RDS, Cloud SQL)
- **ClickHouse**: Use ClickHouse Operator for clustering
- **Redis**: Use Redis Sentinel or Redis Cluster

### Application HA

- Minimum 3 replicas for stateless services
- Pod Disruption Budgets
- Anti-affinity rules

```yaml
# Pod Anti-affinity example
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: novasight-backend
          topologyKey: kubernetes.io/hostname
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: novasight-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: novasight-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Backup and Recovery

### Database Backups

```bash
# PostgreSQL backup
kubectl exec postgresql-0 -- pg_dump -U novasight novasight | gzip > backup.sql.gz

# ClickHouse backup
kubectl exec clickhouse-0 -- clickhouse-backup create daily_backup
```

### Automated Backups

See `backup/` directory for CronJob configurations.

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Pods not starting | Check `kubectl describe pod <pod>` |
| Database connection failed | Verify secrets and network policies |
| Ingress not working | Check ingress controller logs |
| Out of memory | Increase resource limits |

### Useful Commands

```bash
# Get pod logs
kubectl logs -f <pod-name>

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/bash

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Describe resource
kubectl describe pod/deployment/service <name>
```

## Next Steps

- [Kubernetes Deployment](kubernetes.md) - Detailed K8s manifests
- [Helm Deployment](helm.md) - Helm chart configuration
- [Monitoring Setup](monitoring.md) - Observability stack

---

*Last updated: January 2026*
