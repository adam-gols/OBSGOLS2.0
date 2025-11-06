#!/bin/bash

# GOLS Widget - Credentials Setup Script
# This script helps set up the required credentials for the GOLS Widget

echo "🔐 GOLS Widget Credentials Setup"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Setting up credentials for GOLS Widget..."
echo ""

# Check for Python service credentials
if [ ! -f "googlesheets-creds.json" ]; then
    echo "❌ Missing: googlesheets-creds.json"
    echo "   📝 Please copy your Google Service Account JSON file to:"
    echo "      googlesheets-creds.json"
    echo ""
    echo "   💡 How to get this file:"
    echo "      1. Go to Google Cloud Console"
    echo "      2. Enable Google Sheets API"
    echo "      3. Create a Service Account"
    echo "      4. Download the JSON key file"
    echo "      5. Rename it to 'googlesheets-creds.json'"
    echo ""
    HAS_ERRORS=true
else
    echo "✅ Found: googlesheets-creds.json"
fi

# Check for TypeScript credentials
if [ ! -f "src/utils/production-credentials.ts" ]; then
    echo "❌ Missing: src/utils/production-credentials.ts"
    echo "   📝 Please create this file from the template:"
    echo "      cp src/utils/production-credentials.ts.template src/utils/production-credentials.ts"
    echo "   Then edit it with your actual credentials"
    echo ""
    HAS_ERRORS=true
else
    echo "✅ Found: src/utils/production-credentials.ts"
fi

echo ""

if [ "$HAS_ERRORS" = true ]; then
    echo "❌ Setup incomplete - please add the missing credentials"
    echo ""
    echo "📖 For detailed instructions, see:"
    echo "   - Implementation_Plan.md"
    echo "   - README.md (if available)"
    exit 1
else
    echo "✅ All credentials found!"
    echo ""
    echo "🚀 You can now run:"
    echo "   npm run dev          # Start development server"
    echo "   ./setup-python-service.sh  # Set up Python service"
    echo ""
fi
