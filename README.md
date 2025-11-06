# GOLS OBS Widget

A production-ready Google Sheets integration for OBS streaming widgets, designed for Game On Live Studio tournaments.

## 🚀 Features

- **Real-time Google Sheets Integration**: Connects to File Cabinet and Operations sheets
- **Dynamic Event Loading**: Automatically populates events from Google Sheets
- **Game Navigation**: Browse and display tournament games
- **OBS Browser Source Compatible**: Optimized for OBS Studio
- **Production Ready**: Uses service account authentication (no user login required)

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.8+ (for Google Sheets service)
- Google Cloud Project with Sheets API enabled
- Google Service Account with access to your spreadsheets

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd GOLSOBSEPG2.0
npm install
```

### 2. Set Up Google Credentials

The widget requires Google Service Account credentials to access Google Sheets.

#### A. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g., "gols-sheets-reader")
   - Download the JSON key file

#### B. Share Spreadsheets with Service Account

1. Open your File Cabinet spreadsheet
2. Click "Share" 
3. Add the service account email (from the JSON file) with "Viewer" permissions
4. Repeat for all Operations spreadsheets

#### C. Set Up Credentials

```bash
# Copy your service account JSON file
cp /path/to/your/service-account.json googlesheets-creds.json

# Create TypeScript credentials from template
cp src/utils/production-credentials.ts.template src/utils/production-credentials.ts

# Edit the TypeScript credentials file with your values
# (Follow the instructions in the template file)
```

### 3. Set Up Python Service

```bash
./setup-python-service.sh
```

### 4. Configure Spreadsheet IDs

Update the spreadsheet IDs in your credentials files to match your actual Google Sheets.

### 5. Start Development

```bash
# Terminal 1: Start Python service
cd python-service
python3 app.py

# Terminal 2: Start web server
npm run dev
```

Visit http://localhost:3003 to see the widget.

## 🔒 Security Notes

### For Development
- Keep `googlesheets-creds.json` and `src/utils/production-credentials.ts` secure
- These files are in `.gitignore` and should NEVER be committed

### For Production Deployment
- Use environment variables or secure secrets management
- Consider using Google Cloud Run or similar platforms with built-in service account support
- Rotate service account keys regularly

## 📁 Project Structure

```
├── src/
│   ├── core/                 # Core widget systems
│   ├── ui/                   # UI components and managers
│   ├── integrations/         # Google Sheets integration
│   ├── utils/               # Utilities and configurations
│   └── types/               # TypeScript type definitions
├── python-service/          # Python backend for Google Sheets
├── public/                  # Static assets
├── *.template               # Template files for credentials
└── setup-*.sh              # Setup scripts
```

## 🎯 Usage in OBS

1. Add Browser Source in OBS
2. Set URL to: `http://localhost:3003`
3. Set Width: 450px, Height: 380px
4. Check "Refresh browser when scene becomes active"

## 🐛 Troubleshooting

### "Failed to load events"
- Check that Python service is running on port 8081
- Verify service account has access to spreadsheets
- Check browser console for detailed error messages

### "Service unhealthy" 
- Ensure `googlesheets-creds.json` exists and is valid
- Check Python service logs for authentication errors
- Verify spreadsheet IDs are correct

### Events not loading in dropdown
- Check that events are in the "Events" worksheet of your File Cabinet
- Verify column headers are "EVENT" and "OPS SHEET LINK"
- Ensure service account has "Viewer" permission on spreadsheets

## 📞 Support

For issues and questions, please check:
1. Browser console for JavaScript errors
2. Python service terminal for API errors  
3. Google Cloud Console for authentication issues
4. Implementation_Plan.md for detailed technical information

## 🏗️ Development

This widget uses:
- **Frontend**: TypeScript, Vite, vanilla JS (no framework)
- **Backend**: Python Flask with gspread library
- **Styling**: CSS with OBS-optimized layout
- **Integration**: HTTP API between frontend and Python service

The architecture is designed to be simple, reliable, and easy to deploy in production environments.
