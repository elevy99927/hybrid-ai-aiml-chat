#!/bin/bash

echo "🚀 Starting Simple AIML Chatbot..."
echo ""

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend already running on http://localhost:3001"
else
    echo "❌ Backend not running. Please start it first:"
    echo "   cd src/backend && node simple-server.js"
    echo ""
    exit 1
fi

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend already running on http://localhost:3000"
else
    echo "🌐 Starting frontend..."
    cd src/frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
fi

echo ""
echo "🎉 Chat is ready!"
echo "🌐 Open your browser to: http://localhost:3000"
echo "🤖 Backend API: http://localhost:3001"
echo ""
echo "Try these messages:"
echo "  • hello"
echo "  • what is your name"
echo "  • help"
echo "  • how are you"
echo "  • what can you do"
echo ""