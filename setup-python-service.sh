#!/bin/bash

# GOLS Python Service Setup Script
# This script sets up the Python Google Sheets service for the GOLS OBS Widget

echo "🚀 Setting up GOLS Python Google Sheets Service..."

# Check if we're in the right directory
if [ ! -f "googlesheets-creds.json" ]; then
    echo "❌ Error: googlesheets-creds.json not found!"
    echo "   Please run this script from the project root directory."
    exit 1
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
cd python-service
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Python service setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the service:"
echo "   cd python-service"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "2. The service will run on http://localhost:8080"
echo "3. Configure your OBS widget to use this URL"
echo ""
echo "💡 The widget will automatically fall back to browser API if the service is unavailable."
