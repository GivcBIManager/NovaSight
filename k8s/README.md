# NovaSight Kubernetes Manifests

This directory contains Kubernetes manifests for deploying NovaSight to production using Kustomize.

## Directory Structure

```
k8s/
├── base/                          # Base manifests (shared across environments)
│   ├── namespace.yaml             # Namespace definition
│   ├── rbac.yaml                  # ServiceAccounts, Roles, RoleBindings
│   ├── network-policies.yaml      # Network segmentation policies
│   ├── ingress.yaml               # Ingress with TLS
│   ├── kustomization.yaml         # Base kustomization
│   ├── backend/
│   │   ├── deployment.yaml        # Backend deployment
│   │   ├── service.yaml           # Backend service
│   │   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   │   ├── configmap.yaml         # Configuration
│   │   ├── secrets.yaml           # Secrets template (DO NOT USE IN PROD)
│   │   └── pdb.yaml               # Pod Disruption Budget
│   └── frontend/
│       ├── deployment.yaml        # Frontend deployment
│       ├── service.yaml           # Frontend service
│       ├── hpa.yaml               # Horizontal Pod Autoscaler
│       ├── configmap.yaml         # Configuration
│       └── pdb.yaml               # Pod Disruption Budget
├── overlays/
│   ├── staging/                   # Staging environment
│   │   ├── kustomization.yaml
│   │   ├── backend-patch.yaml
│   │   ├── frontend-patch.yaml
│   │   └── ingress-patch.yaml
│   └── production/                # Production environment
│       ├── kustomization.yaml
│       ├── backend-patch.yaml
│       ├── frontend-patch.yaml
│       └── hpa-patch.yaml
└── README.md
```

## Prerequisites

- Kubernetes cluster v1.25+
- kubectl configured with cluster access
- Kustomize v4.0+ (or kubectl with kustomize support)
- cert-manager installed (for TLS certificates)
- NGINX Ingress Controller installed
- Sealed Secrets or External Secrets Operator (for production secrets)

## Quick Start

### View Generated Manifests

```bash
# Preview staging manifests
kubectl kustomize k8s/overlays/staging

# Preview production manifests
kubectl kustomize k8s/overlays/production
```

### Deploy to Staging

```bash
# Apply staging configuration
kubectl apply -k k8s/overlays/staging

# Verify deployment
kubectl -n novasight-staging get pods
kubectl -n novasight-staging get svc
kubectl -n novasight-staging get ingress
```

### Deploy to Production

```bash
# Apply production configuration
kubectl apply -k k8s/overlays/production

# Verify deployment
kubectl -n novasight-prod get pods
kubectl -n novasight-prod get svc
kubectl -n novasight-prod get ingress
```

## Secrets Management

⚠️ **IMPORTANT**: The `secrets.yaml` file in base is a template only. Never commit real secrets to version control.

### Option 1: Sealed Secrets

```bash
# Install sealed-secrets controller
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Seal your secrets
kubeseal --format=yaml < my-secrets.yaml > sealed-secrets.yaml
```

### Option 2: External Secrets Operator

```bash
# Install external-secrets
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Configure SecretStore for AWS Secrets Manager, HashiCorp Vault, etc.
```

### Option 3: SOPS with age/GPG

```bash
# Encrypt secrets with sops
sops --encrypt --age <PUBLIC_KEY> secrets.yaml > secrets.enc.yaml
```

## Configuration

### Environment Variables

Configuration is managed through ConfigMaps. Override values in overlay kustomization files:

```yaml
configMapGenerator:
  - name: backend-config
    behavior: merge
    literals:
      - LOG_LEVEL=DEBUG
      - FEATURE_FLAG=true
```

### Resource Limits

Resource requests and limits are defined in deployments and can be patched per environment:

| Environment | Backend CPU | Backend Memory | Frontend CPU | Frontend Memory |
|-------------|-------------|----------------|--------------|-----------------|
| Staging     | 250m-1000m  | 256Mi-1Gi      | 50m-250m     | 64Mi-128Mi      |
| Production  | 1000m-4000m | 1Gi-4Gi        | 200m-1000m   | 256Mi-512Mi     |

### Scaling

HPA is configured for automatic scaling based on CPU and memory:

| Environment | Backend Min/Max | Frontend Min/Max |
|-------------|-----------------|------------------|
| Staging     | 2/10            | 1/6              |
| Production  | 5/20            | 3/10             |

## Security Features

### Pod Security

- `runAsNonRoot: true` - All containers run as non-root
- `readOnlyRootFilesystem: true` - Immutable container filesystem
- `allowPrivilegeEscalation: false` - Prevents privilege escalation
- `seccompProfile: RuntimeDefault` - Default seccomp profile

### Network Policies

Network policies enforce:
- Default deny all ingress/egress
- Frontend only receives traffic from ingress controller
- Backend receives traffic from ingress and Prometheus
- Backend can only egress to specific services (PostgreSQL, ClickHouse, Redis, Ollama, Airflow)

### RBAC

- Separate ServiceAccounts per component
- Minimal required permissions
- Namespace-scoped roles

## Monitoring

### Prometheus Metrics

Backend pods expose metrics on port 9090:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

### Health Checks

All deployments include:
- **Readiness Probe**: Determines when pod is ready to receive traffic
- **Liveness Probe**: Determines when to restart the container
- **Startup Probe**: Allows slow-starting containers

## Troubleshooting

### View Pod Logs

```bash
kubectl -n novasight-prod logs -l app.kubernetes.io/name=backend --tail=100 -f
```

### Debug Pod

```bash
kubectl -n novasight-prod run debug --rm -it --image=busybox -- sh
```

### Check HPA Status

```bash
kubectl -n novasight-prod get hpa
kubectl -n novasight-prod describe hpa backend
```

### Verify Network Policies

```bash
kubectl -n novasight-prod get networkpolicies
kubectl -n novasight-prod describe networkpolicy allow-backend-egress
```

## Rollback

```bash
# View rollout history
kubectl -n novasight-prod rollout history deployment/backend

# Rollback to previous version
kubectl -n novasight-prod rollout undo deployment/backend

# Rollback to specific revision
kubectl -n novasight-prod rollout undo deployment/backend --to-revision=2
```

## CI/CD Integration

These manifests are designed to work with GitOps tools:

- **ArgoCD**: Point to this repository, path `k8s/overlays/production`
- **Flux**: Configure HelmRelease or Kustomization resource
- **GitHub Actions**: Use `kubectl apply -k` in deployment workflow

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/)
