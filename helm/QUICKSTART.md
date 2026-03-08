# Kubernetes Deployment Quick Start

This guide will help you deploy the Hybrid Chatbot to Kubernetes using Helm.

## Prerequisites

1. Kubernetes cluster (1.19+)
2. kubectl configured
3. Helm 3.0+ installed
4. LiteLLM proxy service (or external LLM API)

## Step 1: Prepare Your Environment

### Install Helm (if not already installed)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Verify Kubernetes Connection

```bash
kubectl cluster-info
kubectl get nodes
```

## Step 2: Configure Your Values

Create a `my-values.yaml` file:

```yaml
# my-values.yaml
backend:
  env:
    LITELLM_BASE_URL: "http://your-litellm-proxy:8080"
    LITELLM_MODEL: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
  secrets:
    LITELLM_API_KEY: "your-api-key-here"

service:
  frontend:
    type: LoadBalancer  # or NodePort, or ClusterIP with Ingress

# Optional: Enable autoscaling
autoscaling:
  backend:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Optional: Enable ingress
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: chatbot.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
```

## Step 3: Install the Chart

### Option A: From Local Chart

```bash
# Clone the repository
git clone https://github.com/elevy99927/hybrid-ai-aiml-chat.git
cd hybrid-ai-aiml-chat

# Install
helm install my-chatbot ./helm/hybrid-chatbot -f my-values.yaml
```

### Option B: From GitHub Release

```bash
# Add the Helm repository
helm repo add hybrid-chatbot https://elevy99927.github.io/hybrid-ai-aiml-chat/helm-charts
helm repo update

# Install
helm install my-chatbot hybrid-chatbot/hybrid-chatbot -f my-values.yaml
```

## Step 4: Verify Deployment

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/instance=my-chatbot

# Check services
kubectl get svc -l app.kubernetes.io/instance=my-chatbot

# View logs
kubectl logs -l app.kubernetes.io/component=backend --tail=50
kubectl logs -l app.kubernetes.io/component=frontend --tail=50
```

## Step 5: Access the Application

### If using LoadBalancer:

```bash
# Get the external IP
kubectl get svc my-chatbot-frontend

# Access at http://<EXTERNAL-IP>:3010
```

### If using NodePort:

```bash
# Get the node port
kubectl get svc my-chatbot-frontend

# Access at http://<NODE-IP>:<NODE-PORT>
```

### If using Port Forward (for testing):

```bash
kubectl port-forward svc/my-chatbot-frontend 3010:3010

# Access at http://localhost:3010
```

## Step 6: Test the Chatbot

Open your browser and navigate to the application URL. Try these test messages:

1. "Hello" - Should get AIML response
2. "What is the capital of France?" - Should get AIML response
3. "Explain quantum computing" - Should fallback to LLM

## Common Configurations

### Production Setup with Ingress

```yaml
replicaCount: 3

service:
  frontend:
    type: ClusterIP

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: chatbot.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: chatbot-tls
      hosts:
        - chatbot.yourdomain.com

autoscaling:
  backend:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
  frontend:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 80

resources:
  backend:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 2Gi
  frontend:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 200m
      memory: 256Mi

persistence:
  enabled: true
  storageClass: "fast-ssd"
  size: 5Gi
```

### Development Setup

```yaml
replicaCount: 1

service:
  frontend:
    type: NodePort

backend:
  env:
    DEBUG_LLMLINGUA: "true"

resources:
  backend:
    limits:
      cpu: 1000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi
  frontend:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
```

## Upgrading

```bash
# Update values
helm upgrade my-chatbot ./helm/hybrid-chatbot -f my-values.yaml

# Or with specific image tags
helm upgrade my-chatbot ./helm/hybrid-chatbot \
  --set image.backend.tag=v1.1.0 \
  --set image.frontend.tag=v1.1.0
```

## Rollback

```bash
# List releases
helm history my-chatbot

# Rollback to previous version
helm rollback my-chatbot

# Rollback to specific revision
helm rollback my-chatbot 2
```

## Uninstalling

```bash
helm uninstall my-chatbot
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

### Backend can't connect to LiteLLM

```bash
# Check backend logs
kubectl logs -l app.kubernetes.io/component=backend

# Test connectivity from pod
kubectl exec -it <backend-pod> -- curl http://your-litellm-proxy:8080
```

### Frontend can't reach backend

```bash
# Check service
kubectl get svc my-chatbot-backend

# Test from frontend pod
kubectl exec -it <frontend-pod> -- curl http://my-chatbot-backend:3011
```

## Monitoring

### View Metrics

```bash
# CPU and Memory usage
kubectl top pods -l app.kubernetes.io/instance=my-chatbot

# HPA status (if enabled)
kubectl get hpa
```

### Logs

```bash
# Stream logs
kubectl logs -f -l app.kubernetes.io/component=backend

# Last 100 lines
kubectl logs -l app.kubernetes.io/component=backend --tail=100

# Logs from all pods
kubectl logs -l app.kubernetes.io/instance=my-chatbot --all-containers=true
```

## Next Steps

1. Set up monitoring with Prometheus/Grafana
2. Configure log aggregation (ELK, Loki)
3. Set up alerts for pod failures
4. Configure backup for persistent volumes
5. Implement CI/CD pipeline for automated deployments

## Support

For issues and questions:
- GitHub Issues: https://github.com/elevy99927/hybrid-ai-aiml-chat/issues
- Documentation: See helm/hybrid-chatbot/README.md
