#!/bin/bash

# Grocery Tracker Startup Script
echo "🛒 Starting Grocery Tracker..."

# Start backend
echo "🚀 Starting backend on http://localhost:3001"
cd "$(dirname "$0")/backend"
node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 1

# Start frontend
echo "🎨 Starting frontend on http://localhost:5173"
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; echo 'Stopped.'" INT
wait
