# Kubernetes Chatbot

A Kubernetes-deployed chatbot application that combines AIML-based rule matching with external AI capabilities through liteLLM integration.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Deployment**: Kubernetes with Helm charts
- **CI/CD**: GitHub Actions
- **Container Registry**: DockerHub (elevy99927)

## Project Structure

```
src/
├── frontend/          # React frontend application
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── backend/           # Node.js backend API
    ├── src/
    ├── package.json
    └── tsconfig.json
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for containerization)
- Kubernetes cluster (for deployment)

### Quick Start (Local Development)

```bash
# Option 1: Use the quick start script
chmod +x start-local.sh
./start-local.sh

# Option 2: Manual setup
# Install dependencies
cd src/backend && npm install
cd ../frontend && npm install

# Start services (in separate terminals)
cd src/backend && npm run dev    # Backend on port 3001
cd src/frontend && npm run dev   # Frontend on port 3000
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual images
docker build -t elevy99927/kubernetes-chatbot-backend:latest src/backend/
docker build -t elevy99927/kubernetes-chatbot-frontend:latest src/frontend/
```

### Kubernetes Deployment

```bash
# Option 1: Use deployment script
chmod +x deploy.sh
./deploy.sh

# Option 2: Manual deployment
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment
kubectl get pods -n chatbot
```

### Testing the AIML Engine

```bash
# Test backend health
curl http://localhost:3001/health

# Test AIML chat
curl -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello"}'

# Expected response:
# {"response":"Hi there! How can I help you today?","source":"aiml","sessionId":"..."}
```

## Features

- ✅ **Project Structure**: Organized microservice architecture
- 🚧 **AIML Engine**: Pattern matching and response generation
- 🚧 **AI Fallback**: Integration with liteLLM for unknown queries
- 🚧 **Chat Interface**: React-based web UI
- 🚧 **Admin Panel**: System monitoring and pattern management
- 🚧 **Kubernetes Deployment**: Helm charts and manifests
- 🚧 **CI/CD Pipeline**: Automated builds and deployments

## Development Commands

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Backend
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
```

## Next Steps

1. ✅ **Implement AIML Engine** (Task 2) - COMPLETE
2. 🔄 **Add AI Fallback Service** (Task 3) - Next
3. 🔄 **Build Backend API** (Task 4) - Next
4. 🔄 **Create Chat Interface** (Task 6) - Next
5. 🔄 **Add Admin Panel** (Task 7) - Next
6. ✅ **Containerize with Docker** (Task 8) - COMPLETE
7. ✅ **Create Kubernetes manifests** (Task 10) - COMPLETE
8. 🔄 **Set up CI/CD pipeline** (Task 11) - Next

## 🚀 Deployment Options

### 1. Local Development
```bash
./start-local.sh
```

### 2. Docker Compose
```bash
docker-compose up -d
```

### 3. Kubernetes
```bash
./deploy.sh
```

See [BUILD-DEPLOY.md](BUILD-DEPLOY.md) for detailed instructions.

## License

MIT