# Kubernetes Deployment

This guide covers deploying NovaSight using raw Kubernetes manifests.

## Prerequisites

- Kubernetes cluster (1.28+)
- kubectl configured
- Container registry with NovaSight images
- TLS certificates (cert-manager recommended)

## Manifest Structure

```
k8s/
├── base/                    # Base manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── postgres/
│   ├── clickhouse/
│   ├── redis/
│   └── ingress.yaml
│
└── overlays/               # Environment-specific overrides
    ├── development/
    ├── staging/
    └── production/
```

## Base Manifests

### Namespace

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: novasight
  labels:
    app.kubernetes.io/name: novasight
    app.kubernetes.io/part-of: novasight
```

### ConfigMap

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: novasight-config
  namespace: novasight
data:
  FLASK_ENV: "production"
  LOG_LEVEL: "INFO"
  CLICKHOUSE_HOST: "clickhouse"
  CLICKHOUSE_PORT: "8123"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  POSTGRES_HOST: "postgres"
  POSTGRES_PORT: "5432"
  OLLAMA_HOST: "ollama"
  OLLAMA_PORT: "11434"
  OLLAMA_MODEL: "codellama:13b"
```

### Secrets

```yaml
# k8s/base/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: novasight-secrets
  namespace: novasight
type: Opaque
stringData:
  SECRET_KEY: "<generate-32-char-random-string>"
  JWT_SECRET_KEY: "<generate-32-char-random-string>"
  DATABASE_URL: "postgresql://novasight:password@postgres:5432/novasight"
  REDIS_URL: "redis://:password@redis:6379/0"
  CLICKHOUSE_PASSWORD: "password"
```

### Backend Deployment

```yaml
# k8s/base/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: novasight-backend
  namespace: novasight
  labels:
    app: novasight-backend
    app.kubernetes.io/name: novasight
    app.kubernetes.io/component: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: novasight-backend
  template:
    metadata:
      labels:
        app: novasight-backend
    spec:
      containers:
        - name: backend
          image: novasight/backend:latest
          ports:
            - containerPort: 5000
              name: http
          envFrom:
            - configMapRef:
                name: novasight-config
            - secretRef:
                name: novasight-secrets
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          volumeMounts:
            - name: templates
              mountPath: /app/templates
              readOnly: true
      volumes:
        - name: templates
          configMap:
            name: novasight-templates
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

### Backend Service

```yaml
# k8s/base/backend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: novasight-backend
  namespace: novasight
  labels:
    app: novasight-backend
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 5000
      protocol: TCP
      name: http
  selector:
    app: novasight-backend
```

### Backend HPA

```yaml
# k8s/base/backend/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: novasight-backend
  namespace: novasight
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

### Frontend Deployment

```yaml
# k8s/base/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: novasight-frontend
  namespace: novasight
  labels:
    app: novasight-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: novasight-frontend
  template:
    metadata:
      labels:
        app: novasight-frontend
    spec:
      containers:
        - name: frontend
          image: novasight/frontend:latest
          ports:
            - containerPort: 80
              name: http
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Ingress

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: novasight-ingress
  namespace: novasight
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
spec:
  tls:
    - hosts:
        - novasight.io
        - "*.novasight.io"
      secretName: novasight-tls
  rules:
    - host: novasight.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: novasight-frontend
                port:
                  number: 80
    - host: api.novasight.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: novasight-backend
                port:
                  number: 80
```

## Using Kustomize

### Base Kustomization

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: novasight

resources:
  - namespace.yaml
  - configmap.yaml
  - secrets.yaml
  - backend/deployment.yaml
  - backend/service.yaml
  - backend/hpa.yaml
  - frontend/deployment.yaml
  - frontend/service.yaml
  - ingress.yaml

commonLabels:
  app.kubernetes.io/name: novasight
  app.kubernetes.io/managed-by: kustomize
```

### Production Overlay

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namePrefix: prod-

patches:
  - path: backend-resources.yaml
  - path: frontend-resources.yaml

images:
  - name: novasight/backend
    newTag: v1.2.3
  - name: novasight/frontend
    newTag: v1.2.3

configMapGenerator:
  - name: novasight-config
    behavior: merge
    literals:
      - LOG_LEVEL=WARNING

secretGenerator:
  - name: novasight-secrets
    behavior: merge
    files:
      - secrets/database-url
      - secrets/secret-key
```

## Deployment Commands

```bash
# Apply base manifests
kubectl apply -k k8s/base/

# Apply production overlay
kubectl apply -k k8s/overlays/production/

# Check status
kubectl get all -n novasight

# Watch rollout
kubectl rollout status deployment/novasight-backend -n novasight

# Rollback if needed
kubectl rollout undo deployment/novasight-backend -n novasight
```

## Network Policies

```yaml
# k8s/base/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: novasight
spec:
  podSelector:
    matchLabels:
      app: novasight-backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: novasight-frontend
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 5000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
        - podSelector:
            matchLabels:
              app: clickhouse
        - podSelector:
            matchLabels:
              app: redis
        - podSelector:
            matchLabels:
              app: ollama
```

## Pod Disruption Budget

```yaml
# k8s/base/backend/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: novasight-backend-pdb
  namespace: novasight
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: novasight-backend
```

## Next Steps

- [Helm Deployment](helm.md) - For easier configuration management
- [Monitoring Setup](monitoring.md) - Add observability

---

*Last updated: January 2026*
