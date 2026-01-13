#!/bin/bash

# Start LiteLLM port-forward in background
echo "Starting LiteLLM port-forward..."
kubectl port-forward -n lite-llm svc/lite-helm-litellm 8080:4000 &
PORT_FORWARD_PID=$!

# Wait a moment for port-forward to establish
sleep 3

# Start docker-compose
echo "Starting Docker Compose..."
docker-compose up

# Cleanup: Kill port-forward when docker-compose stops
echo "Cleaning up port-forward..."
kill $PORT_FORWARD_PID 2>/dev/null