#!/bin/bash

# Kubernetes Chatbot Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="elevy99927"
IMAGE_TAG="${1:-latest}"
NAMESPACE="chatbot"

echo -e "${BLUE}🚀 Kubernetes Chatbot Deployment Script${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "\n${BLUE}🔍 Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_status "Docker is running"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl and try again."
    exit 1
fi
print_status "kubectl is available"

# Check if we can connect to Kubernetes cluster
if ! kubectl cluster-info > /dev/null 2>&1; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi
print_status "Connected to Kubernetes cluster"

# Build and push Docker images
echo -e "\n${BLUE}🐳 Building Docker images...${NC}"

# Build backend
echo "Building backend image..."
docker build -t ${DOCKER_REGISTRY}/kubernetes-chatbot-backend:${IMAGE_TAG} src/backend/
print_status "Backend image built"

# Build frontend
echo "Building frontend image..."
docker build -t ${DOCKER_REGISTRY}/kubernetes-chatbot-frontend:${IMAGE_TAG} src/frontend/
print_status "Frontend image built"

# Push images (optional - comment out if not pushing to registry)
read -p "Push images to DockerHub? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}📤 Pushing images to DockerHub...${NC}"
    
    # Login check
    if ! docker info | grep -q "Username:"; then
        print_warning "Not logged into DockerHub. Please run 'docker login' first."
        docker login
    fi
    
    docker push ${DOCKER_REGISTRY}/kubernetes-chatbot-backend:${IMAGE_TAG}
    print_status "Backend image pushed"
    
    docker push ${DOCKER_REGISTRY}/kubernetes-chatbot-frontend:${IMAGE_TAG}
    print_status "Frontend image pushed"
fi

# Deploy to Kubernetes
echo -e "\n${BLUE}☸️  Deploying to Kubernetes...${NC}"

# Create namespace
kubectl apply -f k8s/namespace.yaml
print_status "Namespace created/updated"

# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml
print_status "ConfigMap applied"

# Update image tags in deployments if not using latest
if [ "$IMAGE_TAG" != "latest" ]; then
    print_warning "Updating image tags to $IMAGE_TAG"
    sed -i.bak "s/:latest/:${IMAGE_TAG}/g" k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
fi

# Apply deployments
kubectl apply -f k8s/backend-deployment.yaml
print_status "Backend deployment applied"

kubectl apply -f k8s/frontend-deployment.yaml
print_status "Frontend deployment applied"

# Apply HPA
kubectl apply -f k8s/hpa.yaml
print_status "HPA applied"

# Apply ingress
kubectl apply -f k8s/ingress.yaml
print_status "Ingress applied"

# Restore original files if we modified them
if [ "$IMAGE_TAG" != "latest" ]; then
    mv k8s/backend-deployment.yaml.bak k8s/backend-deployment.yaml
    mv k8s/frontend-deployment.yaml.bak k8s/frontend-deployment.yaml
fi

# Wait for deployments to be ready
echo -e "\n${BLUE}⏳ Waiting for deployments to be ready...${NC}"

kubectl wait --for=condition=available --timeout=300s deployment/backend-deployment -n ${NAMESPACE}
print_status "Backend deployment ready"

kubectl wait --for=condition=available --timeout=300s deployment/frontend-deployment -n ${NAMESPACE}
print_status "Frontend deployment ready"

# Show deployment status
echo -e "\n${BLUE}📊 Deployment Status${NC}"
echo -e "${BLUE}==================${NC}"

kubectl get pods -n ${NAMESPACE}
echo
kubectl get services -n ${NAMESPACE}
echo
kubectl get ingress -n ${NAMESPACE}

# Show access information
echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "\n${BLUE}📋 Access Information:${NC}"
echo -e "Namespace: ${NAMESPACE}"
echo -e "Backend Service: backend-service:3001"
echo -e "Frontend Service: frontend-service:80"
echo

# Port forwarding instructions
echo -e "${BLUE}🔗 To access locally via port forwarding:${NC}"
echo -e "Frontend: kubectl port-forward -n ${NAMESPACE} svc/frontend-service 3000:80"
echo -e "Backend:  kubectl port-forward -n ${NAMESPACE} svc/backend-service 3001:3001"
echo

# Health check
echo -e "${BLUE}🏥 Health Check:${NC}"
echo "kubectl get pods -n ${NAMESPACE}"
echo "kubectl logs -f deployment/backend-deployment -n ${NAMESPACE}"
echo "kubectl logs -f deployment/frontend-deployment -n ${NAMESPACE}"

echo -e "\n${GREEN}✨ Happy chatting! ✨${NC}"