#!/bin/bash

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv is not installed. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "Please restart the script after uv is installed."
    exit 0
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
    echo "Please restart the script after bun is installed."
    exit 0
fi

# Check if .venv directory exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    uv venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install requirements
echo "Installing dependencies..."
uv pip install -r requirements.txt

# Start the Python application
echo "Starting Python application..."
.venv/bin/python main.py &

# Navigate to frontend directory
echo "Navigating to frontend directory..."
cd fend

# Check if --build-frontend flag is passed
if [[ "$*" == *--build-frontend* ]]; then
    echo "Building frontend..."
    bun run build
fi

# Start frontend server
echo "Starting frontend server..."
bun run start --port 5353