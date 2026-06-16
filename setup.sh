#!/bin/bash

# Exit on error
set -e

# Define color codes for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting environment setup for Security Workflow Assistant...${NC}"

# Check for Python 3
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3 and try again.${NC}"
    exit 1
fi

# Check for Node and npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}Error: npm (Node.js) is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# 1. Setup Python Virtual Environment
echo -e "\n${BLUE}[1/4] Setting up Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment in 'venv/'...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}Virtual environment created.${NC}"
else
    echo -e "${GREEN}Virtual environment 'venv/' already exists.${NC}"
fi

# 2. Install backend dependencies
echo -e "\n${BLUE}[2/4] Installing backend dependencies...${NC}"
venv/bin/pip install --upgrade pip
venv/bin/pip install -r backend/requirements.txt
echo -e "${GREEN}Backend dependencies installed successfully.${NC}"

# 3. Install frontend dependencies
echo -e "\n${BLUE}[3/4] Installing frontend dependencies...${NC}"
if [ -d "frontend" ]; then
    npm install --prefix frontend
    echo -e "${GREEN}Frontend dependencies installed successfully.${NC}"
else
    echo -e "${RED}Error: 'frontend' directory not found.${NC}"
    exit 1
fi

# 4. Setup environment variables
echo -e "\n${BLUE}[4/4] Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating '.env' from '.env.example'...${NC}"
        cp .env.example .env
        echo -e "${GREEN}'.env' file created. Please update it with your actual OPENAI_API_KEY.${NC}"
    else
        echo -e "${YELLOW}Warning: '.env.example' not found. Creating empty '.env'...${NC}"
        touch .env
    fi
else
    echo -e "${GREEN}'.env' file already exists.${NC}"
fi

echo -e "\n${GREEN}Setup completed successfully!${NC}"
echo -e "To start both the frontend and backend servers, run:"
echo -e "  ${BLUE}./dev.sh${NC}"
