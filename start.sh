#!/bin/bash

# Somatic Application Startup Script
# This script handles both frontend build and Python server startup

set -e

echo "🚀 Starting Somatic Application"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."

if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Node.js/npm is required but not installed"
    exit 1
fi

echo "✅ Dependencies OK"

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd python_server
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from template..."
    cp env_example.txt .env
    echo "📝 Please edit .env file with your configuration"
fi

python3 -m pip install -r requirements.txt
cd ..

# Build frontend
echo "🔨 Building frontend..."
npm install
npm run build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p python_server/data
mkdir -p python_server/logs
mkdir -p python_server/data/backups

# Copy frontend build to Python server
echo "📦 Copying frontend build..."
if [ -d "dist" ]; then
    cp -r dist python_server/static 2>/dev/null || true
fi

# Start Python server
echo "🚀 Starting Python server..."
cd python_server
python3 start_server.py

