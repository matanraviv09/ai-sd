#!/bin/bash

# Exit on error
set -e

# Define color codes for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Security Workflow Assistant development servers...${NC}"

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping backend and frontend servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}Cleanup complete.${NC}"
}

# Trap exit signals to run the cleanup function
trap cleanup EXIT SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting FastAPI backend on http://127.0.0.1:8000...${NC}"
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Give the backend a moment to spin up
sleep 1.5

# Start frontend
echo -e "${GREEN}Starting Vite frontend...${NC}"
npm run dev --prefix frontend &
FRONTEND_PID=$!

# Wait for background processes to finish (this keeps the script running)
wait "$BACKEND_PID" "$FRONTEND_PID"
