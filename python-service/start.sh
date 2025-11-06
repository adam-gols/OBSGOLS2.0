#!/bin/bash

# GOLS Python Service Startup Script
# Quick script to start the Python Google Sheets service

echo "🚀 Starting GOLS Python Google Sheets Service..."

# Check if we're in the python-service directory
if [ ! -f "app.py" ]; then
    # Try to navigate to python-service directory
    if [ -d "python-service" ]; then
        cd python-service
    else
        echo "❌ Error: Cannot find python-service directory or app.py file"
        exit 1
    fi
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Error: Virtual environment not found!"
    echo "   Please run the setup script first: ./setup-python-service.sh"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if credentials file exists
if [ ! -f "../googlesheets-creds.json" ]; then
    echo "❌ Error: googlesheets-creds.json not found in project root!"
    echo "   Please ensure the credentials file is in the project root directory."
    exit 1
fi

# Start the service
echo "🌐 Starting service on http://localhost:8080..."
python app.py
