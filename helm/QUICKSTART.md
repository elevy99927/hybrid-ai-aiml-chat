# Kubernetes Deployment Quick Start

This guide will help you deploy the Hybrid Chatbot to Kubernetes using Helm.

## Prerequisites

1. Kubernetes cluster 
2. kubectl configured
3. Helm 3.0+ installed
4. LiteLLM proxy service 

## Configure Your Values

Create a `my-values.yaml` file:

```yaml
# my-values.yaml
backend:
  env:
    LITELLM_BASE_URL: "http://lite-helm-litellm.lite-llm.svc.cluster.local:4000"
    LITELLM_MODEL: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
  secrets:
    LITELLM_API_KEY: "sk-uNkngIaEglGI5HojaGQ4hQ" 

service:
  frontend:
    type: LoadBalancer  # or NodePort, or ClusterIP with Ingress

```

## Install the Chart

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

## Access the Application

### If using LoadBalancer:

```bash
# Get the external IP
kubectl get svc my-chatbot-frontend

# Access at http://<EXTERNAL-IP>:3010
```

### If using Port Forward (for testing):

```bash
kubectl port-forward svc/my-chatbot-frontend 3010:3010

# Access at http://localhost:3010
```

## Test the Chatbot

Open your browser and navigate to the application URL. 
Try these test messages in Hybrid mode:

1. "Hello" - Should get AIML response
2. "What is the capital of France?" - Should get AIML response
3. "Explain quantum computing" - Should fallback to LLM

## Monitoring

**TBD**