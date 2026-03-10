#!/bin/bash

# Rebuild backend image from scratch without cache
# This removes old layers and creates a clean image

set -e

echo "=========================================="
echo "Rebuilding Backend Image (No Cache)"
echo "=========================================="

# Remove old image
echo "Removing old image..."
docker rmi elevy99927/hybrid-ai-aiml-chat-backend:latest 2>/dev/null || true

# Build without cache
echo "Building new image..."
docker build --no-cache \
  -t elevy99927/hybrid-ai-aiml-chat-backend:latest \
  src/backend/

# Show new image size
echo ""
echo "New image size:"
docker images elevy99927/hybrid-ai-aiml-chat-backend:latest

echo ""
echo "=========================================="
echo "✅ Backend image rebuilt successfully!"
echo "=========================================="
