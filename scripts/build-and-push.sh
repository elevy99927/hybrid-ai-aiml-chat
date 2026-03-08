#!/bin/bash

# Build and push Docker images to Docker Hub
# Usage: ./scripts/build-and-push.sh [tag]
# Example: ./scripts/build-and-push.sh dev-32

set -e

# Configuration
DOCKER_USERNAME="elevy99927"
BACKEND_IMAGE="${DOCKER_USERNAME}/hybrid-ai-aiml-chat-backend"
FRONTEND_IMAGE="${DOCKER_USERNAME}/hybrid-ai-aiml-chat-frontend"

# Get tag from argument or use 'dev' as default
TAG="${1:-dev}"

echo "=========================================="
echo "Building and pushing Docker images"
echo "Tag: ${TAG}"
echo "=========================================="

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo "Not logged in to Docker Hub. Please run: docker login"
    exit 1
fi

# Build backend image
echo ""
echo "Building backend image..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${BACKEND_IMAGE}:${TAG}" \
    -t "${BACKEND_IMAGE}:dev" \
    --push \
    ./src/backend

echo "✅ Backend image pushed: ${BACKEND_IMAGE}:${TAG}"

# Build frontend image
echo ""
echo "Building frontend image..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${FRONTEND_IMAGE}:${TAG}" \
    -t "${FRONTEND_IMAGE}:dev" \
    --push \
    ./src/frontend

echo "✅ Frontend image pushed: ${FRONTEND_IMAGE}:${TAG}"

echo ""
echo "=========================================="
echo "✅ All images built and pushed successfully!"
echo "=========================================="
echo ""
echo "Backend images:"
echo "  - ${BACKEND_IMAGE}:${TAG}"
echo "  - ${BACKEND_IMAGE}:dev"
echo ""
echo "Frontend images:"
echo "  - ${FRONTEND_IMAGE}:${TAG}"
echo "  - ${FRONTEND_IMAGE}:dev"
echo ""
echo "To update your Helm deployment:"
echo "  helm upgrade hybrid-bot ./helm/hybrid-chatbot \\"
echo "    --set image.backend.tag=${TAG} \\"
echo "    --set image.frontend.tag=${TAG} \\"
echo "    --reuse-values"
echo ""
