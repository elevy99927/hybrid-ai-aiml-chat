# Hybrid Chatbot Helm Chart

A Helm chart for deploying the Hybrid AI AIML Chatbot with LLM fallback on Kubernetes.

## Features

- Backend service with AIML pattern matching and LLM fallback
- Frontend React application
- Configurable autoscaling
- Optional persistent storage for AIML brain files
- Ingress support
- Secret management for API keys

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- LiteLLM proxy service (external or in-cluster)

## Installation

### Basic Installation

```bash
helm install my-chatbot ./helm/hybrid-chatbot
```

### With Custom Values

```bash
helm install my-chatbot ./helm/hybrid-chatbot \
  --set backend.secrets.LITELLM_API_KEY="your-api-key" \
  --set backend.env.LITELLM_BASE_URL="http://your-litellm-proxy:8080"
```

### Using a Values File

```bash
helm install my-chatbot ./helm/hybrid-chatbot -f custom-values.yaml
```

## Configuration

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.backend.repository` | Backend image repository | `elevy99927/hybrid-ai-aiml-chat-backend` |
| `image.backend.tag` | Backend image tag | `latest` |
| `image.frontend.repository` | Frontend image repository | `elevy99927/hybrid-ai-aiml-chat-frontend` |
| `image.frontend.tag` | Frontend image tag | `latest` |
| `service.frontend.type` | Frontend service type | `LoadBalancer` |
| `backend.env.LITELLM_MODEL` | LLM model to use | `eu.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `backend.env.LITELLM_MAX_CONTEXT_TOKENS` | Max context tokens | `3000` |
| `backend.secrets.LITELLM_API_KEY` | LiteLLM API key | `""` |
| `autoscaling.backend.enabled` | Enable backend autoscaling | `false` |
| `persistence.enabled` | Enable persistent storage | `false` |

### Example Custom Values

```yaml
# custom-values.yaml
replicaCount: 2

image:
  backend:
    tag: "v1.0.0"
  frontend:
    tag: "v1.0.0"

service:
  frontend:
    type: ClusterIP

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: chatbot.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: chatbot-tls
      hosts:
        - chatbot.example.com

backend:
  env:
    LITELLM_BASE_URL: "http://litellm-proxy.default.svc.cluster.local:8080"
    LITELLM_MODEL: "gemini/gemini-2.0-flash-lite-001"
  secrets:
    LITELLM_API_KEY: "your-secret-api-key"

autoscaling:
  backend:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

persistence:
  enabled: true
  storageClass: "standard"
  size: 2Gi

resources:
  backend:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 2Gi
```

## Upgrading

```bash
helm upgrade my-chatbot ./helm/hybrid-chatbot -f custom-values.yaml
```

## Uninstalling

```bash
helm uninstall my-chatbot
```

## Testing

Test the chart locally:

```bash
# Lint the chart
helm lint ./helm/hybrid-chatbot

# Dry run
helm install my-chatbot ./helm/hybrid-chatbot --dry-run --debug

# Template rendering
helm template my-chatbot ./helm/hybrid-chatbot
```

## Architecture

```
┌─────────────┐
│   Ingress   │
└──────┬──────┘
       │
┌──────▼──────────┐
│    Frontend     │
│   (Port 3010)   │
└──────┬──────────┘
       │
┌──────▼──────────┐
│    Backend      │
│   (Port 3011)   │
│                 │
│  ┌───────────┐  │
│  │   AIML    │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │    LLM    │  │
│  │  Fallback │  │
│  └───────────┘  │
└─────────────────┘
       │
┌──────▼──────────┐
│  LiteLLM Proxy  │
│  (External)     │
└─────────────────┘
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/instance=my-chatbot
```

### View Logs

```bash
# Backend logs
kubectl logs -l app.kubernetes.io/component=backend

# Frontend logs
kubectl logs -l app.kubernetes.io/component=frontend
```

### Port Forward for Testing

```bash
# Frontend
kubectl port-forward svc/my-chatbot-frontend 3010:3010

# Backend
kubectl port-forward svc/my-chatbot-backend 3011:3011
```

## Support

For issues and questions, please open an issue on GitHub.
