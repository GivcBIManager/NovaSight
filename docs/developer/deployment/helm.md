# Helm Deployment

This guide covers deploying NovaSight using the official Helm chart.

## Prerequisites

- Kubernetes cluster (1.28+)
- Helm 3.12+
- kubectl configured
- Container registry access

## Quick Start

```bash
# Add the NovaSight Helm repository
helm repo add novasight https://charts.novasight.io
helm repo update

# Install with default values
helm install novasight novasight/novasight \
  --namespace novasight \
  --create-namespace

# Install with custom values
helm install novasight novasight/novasight \
  --namespace novasight \
  --create-namespace \
  -f values-production.yaml
```

## Chart Structure

```
helm/novasight/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── pdb.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── ingress.yaml
│   └── NOTES.txt
└── charts/                  # Sub-charts
    ├── postgresql/
    ├── clickhouse/
    └── redis/
```

## Values Configuration

### Default values.yaml

```yaml
# values.yaml - Default configuration

# Global settings
global:
  imageRegistry: ""
  imagePullSecrets: []
  storageClass: ""

# Backend configuration
backend:
  enabled: true
  replicaCount: 3
  
  image:
    repository: novasight/backend
    tag: ""  # Defaults to Chart appVersion
    pullPolicy: IfNotPresent
  
  service:
    type: ClusterIP
    port: 80
    targetPort: 5000
  
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  
  podDisruptionBudget:
    enabled: true
    minAvailable: 2
  
  env:
    FLASK_ENV: production
    LOG_LEVEL: INFO
  
  secrets:
    secretKey: ""  # Required: Generate with `openssl rand -hex 32`
    jwtSecretKey: ""  # Required: Generate with `openssl rand -hex 32`

# Frontend configuration
frontend:
  enabled: true
  replicaCount: 3
  
  image:
    repository: novasight/frontend
    tag: ""
    pullPolicy: IfNotPresent
  
  service:
    type: ClusterIP
    port: 80
  
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  
  env:
    VITE_API_URL: "https://api.novasight.io"

# Worker configuration
worker:
  enabled: true
  replicaCount: 3
  
  image:
    repository: novasight/backend
    tag: ""
    pullPolicy: IfNotPresent
  
  command: ["celery", "-A", "app.celery", "worker"]
  
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
  
  hosts:
    - host: novasight.io
      paths:
        - path: /
          pathType: Prefix
          service: frontend
    - host: api.novasight.io
      paths:
        - path: /
          pathType: Prefix
          service: backend
  
  tls:
    - secretName: novasight-tls
      hosts:
        - novasight.io
        - api.novasight.io

# PostgreSQL configuration
postgresql:
  enabled: true
  auth:
    username: novasight
    password: ""  # Required
    database: novasight
  primary:
    persistence:
      enabled: true
      size: 100Gi
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 4000m
        memory: 8Gi

# ClickHouse configuration
clickhouse:
  enabled: true
  auth:
    username: default
    password: ""  # Required
  persistence:
    enabled: true
    size: 500Gi
  resources:
    requests:
      cpu: 2000m
      memory: 8Gi
    limits:
      cpu: 8000m
      memory: 32Gi

# Redis configuration
redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: true
    password: ""  # Required
  master:
    persistence:
      enabled: true
      size: 10Gi
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi

# Ollama configuration
ollama:
  enabled: true
  replicaCount: 1
  
  image:
    repository: ollama/ollama
    tag: latest
  
  model: codellama:13b
  
  resources:
    requests:
      cpu: 4000m
      memory: 16Gi
    limits:
      cpu: 8000m
      memory: 32Gi
      nvidia.com/gpu: 1  # GPU support
  
  persistence:
    enabled: true
    size: 50Gi

# Monitoring
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
  
  grafanaDashboards:
    enabled: true

# Network Policies
networkPolicies:
  enabled: true
```

### Production Values

```yaml
# values-production.yaml - Production overrides

backend:
  replicaCount: 5
  
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 8Gi
  
  autoscaling:
    minReplicas: 5
    maxReplicas: 50
  
  secrets:
    secretKey: "<your-secret-key>"
    jwtSecretKey: "<your-jwt-secret>"

frontend:
  replicaCount: 5

worker:
  replicaCount: 5

ingress:
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
  
  hosts:
    - host: app.yourcompany.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
    - host: api.yourcompany.com
      paths:
        - path: /
          pathType: Prefix
          service: backend
  
  tls:
    - secretName: yourcompany-tls
      hosts:
        - app.yourcompany.com
        - api.yourcompany.com

postgresql:
  auth:
    password: "<strong-password>"
  primary:
    persistence:
      size: 500Gi
    resources:
      limits:
        cpu: 8000m
        memory: 16Gi

clickhouse:
  auth:
    password: "<strong-password>"
  persistence:
    size: 2Ti
  resources:
    limits:
      cpu: 16000m
      memory: 64Gi
  cluster:
    enabled: true
    shards: 3
    replicas: 2

redis:
  architecture: replication
  auth:
    password: "<strong-password>"
  replica:
    replicaCount: 3

ollama:
  replicaCount: 2
  resources:
    limits:
      nvidia.com/gpu: 2
```

## Installation Commands

### Basic Installation

```bash
# Install with inline values
helm install novasight novasight/novasight \
  --namespace novasight \
  --create-namespace \
  --set backend.secrets.secretKey=$(openssl rand -hex 32) \
  --set backend.secrets.jwtSecretKey=$(openssl rand -hex 32) \
  --set postgresql.auth.password=$(openssl rand -base64 24) \
  --set clickhouse.auth.password=$(openssl rand -base64 24) \
  --set redis.auth.password=$(openssl rand -base64 24)
```

### Production Installation

```bash
# Install with values file
helm install novasight novasight/novasight \
  --namespace novasight \
  --create-namespace \
  -f values-production.yaml \
  --wait \
  --timeout 10m
```

### Upgrade

```bash
# Upgrade with new values
helm upgrade novasight novasight/novasight \
  --namespace novasight \
  -f values-production.yaml \
  --wait

# Upgrade with new image tag
helm upgrade novasight novasight/novasight \
  --namespace novasight \
  --set backend.image.tag=v1.3.0 \
  --set frontend.image.tag=v1.3.0
```

### Rollback

```bash
# View history
helm history novasight -n novasight

# Rollback to previous version
helm rollback novasight -n novasight

# Rollback to specific revision
helm rollback novasight 2 -n novasight
```

## Verification

```bash
# Check release status
helm status novasight -n novasight

# List all resources
helm get manifest novasight -n novasight | kubectl get -f -

# Check pods
kubectl get pods -n novasight

# Check services
kubectl get svc -n novasight

# Check ingress
kubectl get ingress -n novasight

# View logs
kubectl logs -f deployment/novasight-backend -n novasight
```

## Post-Installation

### Run Migrations

```bash
kubectl exec -it deployment/novasight-backend -n novasight -- flask db upgrade
```

### Create Admin User

```bash
kubectl exec -it deployment/novasight-backend -n novasight -- flask seed admin
```

### Pull Ollama Model

```bash
kubectl exec -it deployment/novasight-ollama -n novasight -- ollama pull codellama:13b
```

## Customization

### Using External Databases

```yaml
# Disable internal databases
postgresql:
  enabled: false

clickhouse:
  enabled: false

redis:
  enabled: false

# Configure external connections
backend:
  env:
    DATABASE_URL: "postgresql://user:pass@external-postgres:5432/novasight"
    CLICKHOUSE_URL: "clickhouse://user:pass@external-clickhouse:8123/default"
    REDIS_URL: "redis://:pass@external-redis:6379/0"
```

### Using External Secrets

```yaml
backend:
  existingSecret: my-external-secrets
  existingSecretKeys:
    secretKey: SECRET_KEY
    jwtSecretKey: JWT_SECRET_KEY
```

## Uninstall

```bash
# Uninstall release
helm uninstall novasight -n novasight

# Delete namespace (WARNING: deletes all data)
kubectl delete namespace novasight

# Keep PVCs (data)
helm uninstall novasight -n novasight --keep-history
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Pods pending | Check node resources, PVC provisioning |
| Database connection failed | Verify secrets, network policies |
| Ingress not working | Check ingress controller, TLS secrets |
| OOM killed | Increase memory limits |

### Debug Commands

```bash
# Get pod events
kubectl describe pod <pod-name> -n novasight

# Get helm release info
helm get all novasight -n novasight

# Check values used
helm get values novasight -n novasight

# Render templates locally
helm template novasight novasight/novasight -f values-production.yaml
```

---

*Last updated: January 2026*
