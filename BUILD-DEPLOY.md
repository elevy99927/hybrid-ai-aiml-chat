# Kubernetes Chatbot - Build & Deploy Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for containerization)
- Kubernetes cluster (for deployment)

### 1. Local Development Setup

```bash
# Clone and setup
git clone <your-repo>
cd kubernetes-chatbot

# Install dependencies
cd src/backend && npm install
cd ../frontend && npm install
```

### 2. Run Locally

```bash
# Terminal 1 - Start Backend (port 3001)
cd src/backend
npm run dev

# Terminal 2 - Start Frontend (port 3000)
cd src/frontend  
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

## 🐳 Docker Build & Run

### 1. Build Docker Images

```bash
# Build Backend Image
docker build -t elevy99927/kubernetes-chatbot-backend:latest -f src/backend/Dockerfile src/backend

# Build Frontend Image  
docker build -t elevy99927/kubernetes-chatbot-frontend:latest -f src/frontend/Dockerfile src/frontend
```

### 2. Run with Docker Compose

```bash
# Start both services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Push to DockerHub

```bash
# Login to DockerHub
docker login

# Push images
docker push elevy99927/kubernetes-chatbot-backend:latest
docker push elevy99927/kubernetes-chatbot-frontend:latest
```

---

## ☸️ Kubernetes Deployment

### 1. Deploy with Helm

```bash
# Add Helm repository (if using external charts)
helm repo add kubernetes-chatbot ./helm/kubernetes-chatbot
helm repo update

# Install/Upgrade
helm upgrade --install kubernetes-chatbot ./helm/kubernetes-chatbot \
  --namespace chatbot \
  --create-namespace \
  --set image.repository=elevy99927 \
  --set image.tag=latest

# Check deployment
kubectl get pods -n chatbot
kubectl get services -n chatbot
```

### 2. Manual Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get all -n chatbot
```

### 3. Access Application

```bash
# Port forward for testing
kubectl port-forward -n chatbot svc/frontend-service 3000:80
kubectl port-forward -n chatbot svc/backend-service 3001:3001

# Or access via Ingress (if configured)
# http://your-domain.com
```

---

## 🔧 Build Commands Reference

### Backend Commands
```bash
cd src/backend

# Development
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint

# Docker
docker build -t backend .
docker run -p 3001:3001 backend
```

### Frontend Commands  
```bash
cd src/frontend

# Development
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run ESLint

# Docker
docker build -t frontend .
docker run -p 3000:80 frontend
```

---

## 🚀 CI/CD Pipeline (GitHub Actions)

### Automatic Deployment
The project includes GitHub Actions workflow that automatically:

1. **On Push to Main:**
   - Runs tests
   - Builds Docker images
   - Pushes to DockerHub (elevy99927)
   - Updates Helm charts
   - Deploys to Kubernetes

### Manual Trigger
```bash
# Trigger deployment manually
gh workflow run deploy.yml
```

---

## 🔍 Monitoring & Debugging

### Health Checks
```bash
# Backend health
curl http://localhost:3001/health

# Kubernetes health
kubectl get pods -n chatbot
kubectl describe pod <pod-name> -n chatbot
```

### Logs
```bash
# Local logs
npm run dev  # Shows logs in terminal

# Docker logs
docker logs <container-id>

# Kubernetes logs
kubectl logs -f deployment/backend-deployment -n chatbot
kubectl logs -f deployment/frontend-deployment -n chatbot
```

### Debug Mode
```bash
# Backend debug mode
DEBUG=* npm run dev

# Frontend debug mode
npm run dev -- --debug
```

---

## 📦 Production Deployment Checklist

### Before Deployment:
- [ ] Update version numbers in package.json
- [ ] Run all tests: `npm test`
- [ ] Build successfully: `npm run build`
- [ ] Update Docker image tags
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Configure ingress/load balancer
- [ ] Set up SSL certificates

### Environment Variables:
```bash
# Backend (.env)
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
LITELLM_URL=http://litellm-service:8000
AIML_CONFIG_PATH=/etc/aiml

# Frontend (.env)
VITE_API_URL=http://backend-service:3001
VITE_APP_TITLE=Kubernetes Chatbot
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **Port conflicts:**
   ```bash
   # Kill processes on ports
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Docker build fails:**
   ```bash
   # Clean Docker cache
   docker system prune -a
   ```

3. **Kubernetes pods not starting:**
   ```bash
   # Check events
   kubectl get events -n chatbot --sort-by='.lastTimestamp'
   
   # Check pod details
   kubectl describe pod <pod-name> -n chatbot
   ```

4. **AIML patterns not loading:**
   ```bash
   # Check ConfigMap
   kubectl get configmap aiml-patterns -n chatbot -o yaml
   
   # Verify mount
   kubectl exec -it <backend-pod> -n chatbot -- ls -la /etc/aiml
   ```

---

## 📊 Performance Optimization

### Production Optimizations:
- Enable gzip compression
- Use CDN for static assets
- Configure resource limits in Kubernetes
- Set up horizontal pod autoscaling (HPA)
- Use persistent volumes for logs
- Configure health checks and readiness probes

### Scaling:
```bash
# Scale deployments
kubectl scale deployment backend-deployment --replicas=3 -n chatbot
kubectl scale deployment frontend-deployment --replicas=2 -n chatbot

# Auto-scaling (HPA already configured in Helm chart)
kubectl get hpa -n chatbot
```