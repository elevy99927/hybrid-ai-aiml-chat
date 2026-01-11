#!/bin/bash

# Quick start script for local development
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Kubernetes Chatbot Locally${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if dependencies are installed
echo -e "\n${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "src/backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd src/backend && npm install && cd ../..
fi

if [ ! -d "src/frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd src/frontend && npm install && cd ../..
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"

# Start services
echo -e "\n${BLUE}🔧 Starting services...${NC}"

# Kill any existing processes on these ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}✅ Cleared ports 3000 and 3001${NC}"

# Start backend in background
echo -e "${YELLOW}Starting backend on port 3001...${NC}"
cd src/backend
npm run dev &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo -e "${YELLOW}Starting frontend on port 3000...${NC}"
cd src/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

# Wait for services to start
sleep 5

echo -e "\n${GREEN}🎉 Services started successfully!${NC}"
echo -e "\n${BLUE}📋 Access URLs:${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend:  ${GREEN}http://localhost:3001${NC}"
echo -e "Health:   ${GREEN}http://localhost:3001/health${NC}"

echo -e "\n${BLUE}🔍 Process IDs:${NC}"
echo -e "Backend PID: ${BACKEND_PID}"
echo -e "Frontend PID: ${FRONTEND_PID}"

echo -e "\n${YELLOW}💡 To stop services:${NC}"
echo -e "kill ${BACKEND_PID} ${FRONTEND_PID}"
echo -e "or use Ctrl+C in the terminal windows"

echo -e "\n${BLUE}📊 Testing AIML Engine:${NC}"
echo -e "curl -X POST http://localhost:3001/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"hello\"}'"

# Keep script running
echo -e "\n${GREEN}✨ Ready for development! Press Ctrl+C to stop all services.${NC}"

# Trap Ctrl+C to clean up
trap 'echo -e "\n${YELLOW}Stopping services...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Wait for user to stop
wait