@echo off
REM Somatic Application Startup Script for Windows
REM This script handles both frontend build and Python server startup

echo 🚀 Starting Somatic Application
echo ==================================

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is required but not installed
    pause
    exit /b 1
)

REM Check for Node.js/npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js/npm is required but not installed
    pause
    exit /b 1
)

echo ✅ Dependencies OK

REM Install Python dependencies
echo 🐍 Installing Python dependencies...
cd python_server
if not exist .env (
    echo ⚠️  No .env file found. Copying from template...
    copy env_example.txt .env
    echo 📝 Please edit .env file with your configuration
)

python -m pip install -r requirements.txt
cd ..

REM Build frontend
echo 🔨 Building frontend...
call npm install
call npm run build

REM Create necessary directories
echo 📁 Creating directories...
if not exist "python_server\data" mkdir "python_server\data"
if not exist "python_server\logs" mkdir "python_server\logs"
if not exist "python_server\data\backups" mkdir "python_server\data\backups"

REM Copy frontend build to Python server
echo 📦 Copying frontend build...
if exist "dist" (
    xcopy "dist" "python_server\static" /E /I /Y >nul 2>&1
)

REM Start Python server
echo 🚀 Starting Python server...
cd python_server
python start_server.py

pause

