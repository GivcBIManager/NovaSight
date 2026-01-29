# NovaSight Scaling Guide

## Overview

This guide provides procedures for scaling NovaSight components to handle increased load, optimize resource utilization, and ensure high availability.

## Table of Contents

1. [Scaling Strategy](#scaling-strategy)
2. [Application Scaling](#application-scaling)
3. [Database Scaling](#database-scaling)
4. [Cache Scaling](#cache-scaling)
5. [Queue Scaling](#queue-scaling)
6. [Infrastructure Scaling](#infrastructure-scaling)
7. [Capacity Planning](#capacity-planning)

---

## Scaling Strategy

### Scaling Principles

1. **Scale horizontally first** - Add more replicas before increasing resource limits
2. **Use autoscaling** - Let HPA/VPA handle normal fluctuations
3. **Plan for 2x capacity** - Always have headroom for traffic spikes
4. **Scale databases carefully** - Database scaling has higher risk
5. **Monitor after scaling** - Verify improvements and watch for side effects

### Component Scaling Priority

| Component | Scaling Ease | Impact | Priority |
|-----------|--------------|--------|----------|
| Backend API | Easy | High | First |
| Frontend | Easy | Medium | Second |
| Celery Workers | Easy | High | Third |
| Redis | Medium | High | Fourth |
| PostgreSQL | Hard | Critical | Last |
| ClickHouse | Hard | Critical | Last |

---

## Application Scaling

### Backend API

#### Horizontal Pod Autoscaler (HPA)

```yaml
# View current HPA
kubectl get hpa backend-hpa -n novasight-prod -o yaml
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: novasight-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 5
  maxReplicas: 20
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
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

#### Manual Scaling

```bash
# Scale to specific replica count
kubectl scale deployment/backend --replicas=15 -n novasight-prod

# Verify scaling
kubectl get deployment backend -n novasight-prod

# Watch pods come up
kubectl get pods -n novasight-prod -l app=backend -w
```

#### Adjust HPA Parameters

```bash
# Increase max replicas
kubectl patch hpa backend-hpa -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/maxReplicas", "value": 30}]'

# Adjust CPU threshold
kubectl patch hpa backend-hpa -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/metrics/0/resource/target/averageUtilization", "value": 60}]'
```

#### Vertical Scaling (Increase Resources)

```bash
# Update resource limits
kubectl patch deployment backend -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "500m", "memory": "1Gi"},
    "limits": {"cpu": "2", "memory": "4Gi"}
  }}]'
```

### Frontend

```bash
# Scale frontend replicas
kubectl scale deployment/frontend --replicas=5 -n novasight-prod

# Frontend HPA (if enabled)
kubectl get hpa frontend-hpa -n novasight-prod
```

### Celery Workers

```bash
# Scale workers for increased background job load
kubectl scale deployment/celery-worker --replicas=10 -n novasight-prod

# Scale specific queue workers
kubectl scale deployment/celery-worker-queries --replicas=15 -n novasight-prod
kubectl scale deployment/celery-worker-sync --replicas=5 -n novasight-prod
```

---

## Database Scaling

### PostgreSQL

!!! warning "High Risk Operation"
    Database scaling should be planned and tested in staging first.

#### Connection Pool Scaling

```bash
# Increase PgBouncer connections
kubectl patch configmap pgbouncer-config -n novasight-prod \
  --patch '{"data":{"max_client_conn":"500","default_pool_size":"50"}}'

# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer -n novasight-prod
```

#### Vertical Scaling

```bash
# Increase PostgreSQL resources
kubectl patch statefulset postgresql -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "2", "memory": "8Gi"},
    "limits": {"cpu": "4", "memory": "16Gi"}
  }}]'
```

#### Storage Expansion

```bash
# Expand PVC (requires storage class support)
kubectl patch pvc data-postgresql-0 -n novasight-prod \
  --patch '{"spec":{"resources":{"requests":{"storage":"500Gi"}}}}'
```

#### Read Replicas

```bash
# Add PostgreSQL read replica
helm upgrade novasight ./helm/novasight \
  --set postgresql.replicaCount=2 \
  --set postgresql.readReplicas.enabled=true \
  -n novasight-prod
```

### ClickHouse

#### Add Replicas

```bash
# Scale ClickHouse replicas
helm upgrade novasight ./helm/novasight \
  --set clickhouse.replicaCount=3 \
  -n novasight-prod
```

#### Add Shards

```yaml
# For larger datasets, add shards
# Update clickhouse-config.yaml
<remote_servers>
  <novasight_cluster>
    <shard>
      <replica>
        <host>clickhouse-0</host>
        <port>9000</port>
      </replica>
    </shard>
    <shard>
      <replica>
        <host>clickhouse-1</host>
        <port>9000</port>
      </replica>
    </shard>
  </novasight_cluster>
</remote_servers>
```

#### Resource Scaling

```bash
# Increase ClickHouse resources
kubectl patch statefulset clickhouse -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "4", "memory": "16Gi"},
    "limits": {"cpu": "8", "memory": "32Gi"}
  }}]'
```

---

## Cache Scaling

### Redis

#### Horizontal Scaling (Redis Cluster)

```bash
# Scale Redis cluster
helm upgrade novasight ./helm/novasight \
  --set redis.cluster.enabled=true \
  --set redis.cluster.nodes=6 \
  -n novasight-prod
```

#### Vertical Scaling

```bash
# Increase Redis memory
kubectl patch statefulset redis -n novasight-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "500m", "memory": "4Gi"},
    "limits": {"cpu": "1", "memory": "8Gi"}
  }}]'
```

#### Adjust Max Memory

```bash
# Update Redis max memory configuration
kubectl exec -it redis-0 -n novasight-prod -- \
  redis-cli CONFIG SET maxmemory 6gb
```

---

## Queue Scaling

### Celery/Redis Queue

```bash
# Monitor queue depth
kubectl exec -it redis-0 -n novasight-prod -- \
  redis-cli LLEN celery

# Scale workers based on queue depth
if [ $(redis-cli LLEN celery) -gt 1000 ]; then
  kubectl scale deployment/celery-worker --replicas=20 -n novasight-prod
fi
```

### Airflow

```bash
# Scale Airflow workers
kubectl scale deployment/airflow-worker --replicas=5 -n novasight-prod

# Increase parallelism
kubectl patch configmap airflow-config -n novasight-prod \
  --patch '{"data":{"parallelism":"64","dag_concurrency":"32"}}'
```

---

## Infrastructure Scaling

### Kubernetes Nodes

#### Azure AKS

```bash
# Scale node pool
az aks scale \
  --resource-group novasight-rg \
  --name novasight-prod \
  --node-count 15

# Add new node pool for specific workloads
az aks nodepool add \
  --resource-group novasight-rg \
  --cluster-name novasight-prod \
  --name highcpu \
  --node-count 5 \
  --node-vm-size Standard_F16s_v2
```

#### AWS EKS

```bash
# Scale node group
eksctl scale nodegroup \
  --cluster novasight-prod \
  --name workers \
  --nodes 15

# Add new node group
eksctl create nodegroup \
  --cluster novasight-prod \
  --name highcpu \
  --node-type c5.4xlarge \
  --nodes 5
```

### Cluster Autoscaler

```yaml
# Enable cluster autoscaler
apiVersion: autoscaling.k8s.io/v1
kind: ClusterAutoscaler
metadata:
  name: novasight-autoscaler
spec:
  scaleDown:
    enabled: true
    delayAfterAdd: 10m
    delayAfterDelete: 0s
    delayAfterFailure: 3m
  resourceLimits:
    maxNodesTotal: 50
    cores:
      min: 10
      max: 500
    memory:
      min: 20Gi
      max: 1000Gi
```

---

## Capacity Planning

### Resource Baseline

| Component | Base Replicas | CPU Request | Memory Request | Max Replicas |
|-----------|---------------|-------------|----------------|--------------|
| Backend | 5 | 500m | 1Gi | 20 |
| Frontend | 3 | 200m | 512Mi | 10 |
| Celery Worker | 3 | 500m | 1Gi | 30 |
| PostgreSQL | 1 | 1 | 4Gi | 3 (replicas) |
| ClickHouse | 1 | 2 | 8Gi | 3 (replicas) |
| Redis | 1 | 500m | 2Gi | 6 (cluster) |

### Scaling Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Utilization | > 60% | > 80% | Scale up pods |
| Memory Utilization | > 70% | > 85% | Scale up pods/increase limits |
| Request Latency (P95) | > 500ms | > 1s | Scale up, check DB |
| Error Rate | > 0.5% | > 1% | Investigate, scale |
| Queue Depth | > 500 | > 1000 | Scale workers |
| DB Connections | > 70% | > 90% | Scale connection pool |

### Load Testing Before Scaling

```bash
# Run K6 load test to validate scaling
k6 run --vus 100 --duration 5m ./performance/k6/load-test.js

# Monitor during test
watch kubectl top pods -n novasight-prod
```

### Scaling Runbook Checklist

- [ ] Identify the bottleneck (CPU, memory, I/O, network)
- [ ] Check current resource utilization
- [ ] Determine appropriate scaling action
- [ ] Test in staging first (for significant changes)
- [ ] Apply scaling change
- [ ] Monitor for 15 minutes
- [ ] Verify performance improvement
- [ ] Document the change

---

## Related Documents

- [Deployment Runbook](deployment-runbook.md)
- [Incident Response](incident-response.md)
- [Performance Testing](../../performance/README.md)
