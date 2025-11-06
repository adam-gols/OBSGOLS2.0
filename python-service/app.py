#!/usr/bin/env python3
"""
GOLS Google Sheets Service
A local HTTP service that handles Google Sheets operations for the GOLS OBS Widget.
This service runs locally and provides REST API endpoints for the TypeScript frontend.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from flask import Flask, jsonify, request
from flask_cors import CORS
import gspread
from google.oauth2.service_account import Credentials

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for the OBS widget

# Google Sheets configuration
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
]

# File Cabinet spreadsheet ID (hardcoded for production)
FILE_CABINET_SPREADSHEET_ID = "1yIMVWLxVRwsTnUlRNuIKIhesgrL9rvTZheq7-U-zNM0"

class GoogleSheetsService:
    def __init__(self):
        self.client = None
        self.file_cabinet = None
        try:
            self._initialize_client()
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            logger.warn("Service will continue without File Cabinet access")
    
    def _initialize_client(self):
        """Initialize the Google Sheets client with service account credentials."""
        try:
            # Load service account credentials
            creds_path = os.path.join(os.path.dirname(__file__), '..', 'googlesheets-creds.json')
            
            if not os.path.exists(creds_path):
                raise FileNotFoundError(f"Service account credentials not found at {creds_path}")
            
            credentials = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
            self.client = gspread.authorize(credentials)
            
            # Try to open the File Cabinet spreadsheet (but don't fail if it's not accessible)
            try:
                self.file_cabinet = self.client.open_by_key(FILE_CABINET_SPREADSHEET_ID)
                logger.info("Successfully initialized Google Sheets client with File Cabinet access")
            except Exception as e:
                logger.warn(f"Could not access File Cabinet spreadsheet: {e}")
                logger.warn("Service will continue without File Cabinet access")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            raise

    def _ensure_client(self):
        """Ensure the client is initialized."""
        if self.client is None:
            raise Exception("Google Sheets client not initialized")

    def get_events_list(self) -> List[Dict[str, Any]]:
        """Get the list of events from the File Cabinet."""
        try:
            self._ensure_client()
            
            if self.file_cabinet is None:
                # Try to open the File Cabinet again
                try:
                    self.file_cabinet = self.client.open_by_key(FILE_CABINET_SPREADSHEET_ID)
                except Exception as e:
                    raise Exception(f"Cannot access File Cabinet spreadsheet: {e}")
            
            # Get the "Events" worksheet specifically 
            worksheet = self.file_cabinet.worksheet('Events')
            
            # Get all values
            values = worksheet.get_all_values()
            
            if not values:
                return []
            
            # Assume first row contains headers
            headers = values[0]
            events = []
            
            for row in values[1:]:  # Skip header row
                if len(row) >= len(headers):
                    event = {}
                    for i, header in enumerate(headers):
                        event[header] = row[i] if i < len(row) else ""
                    
                    # Extract the event name and OPS sheet ID from URL
                    event_name = event.get('EVENT', '')
                    ops_sheet_url = event.get('OPS SHEET LINK', '')
                    
                    # Extract spreadsheet ID from the Google Sheets URL
                    ops_sheet_id = ''
                    if ops_sheet_url:
                        import re
                        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', ops_sheet_url)
                        if match:
                            ops_sheet_id = match.group(1)
                    
                    # Only include events with non-empty required fields
                    if event_name and ops_sheet_id:
                        events.append({
                            'name': event_name,
                            'ops_sheet_id': ops_sheet_id,
                            'ops_sheet_url': ops_sheet_url,
                            'date': '',  # No date in this format
                            'location': '',  # No location in this format
                            'raw_data': event
                        })
            
            logger.info(f"Retrieved {len(events)} events from File Cabinet")
            return events
            
        except Exception as e:
            logger.error(f"Error getting events list: {e}")
            raise

    def get_operations_data(self, ops_sheet_id: str) -> Dict[str, Any]:
        """Get data from an operations sheet."""
        try:
            self._ensure_client()
            
            # Open the operations spreadsheet
            ops_spreadsheet = self.client.open_by_key(ops_sheet_id)
            
            result = {
                'site_info': [],
                'master_schedule': []
            }
            
            # Get Site Info data
            try:
                site_info_sheet = ops_spreadsheet.worksheet('Site Info')
                site_info_values = site_info_sheet.get_all_values()
                
                if site_info_values:
                    headers = site_info_values[0]
                    for row in site_info_values[1:]:
                        if len(row) >= len(headers):
                            site_info = {}
                            for i, header in enumerate(headers):
                                site_info[header] = row[i] if i < len(row) else ""
                            result['site_info'].append(site_info)
                            
            except gspread.WorksheetNotFound:
                logger.warning(f"Site Info sheet not found in {ops_sheet_id}")
            
            # Get Master Schedule data
            try:
                schedule_sheet = ops_spreadsheet.worksheet('Master Schedule')
                schedule_values = schedule_sheet.get_all_values()
                
                if schedule_values:
                    headers = schedule_values[0]
                    for row in schedule_values[1:]:
                        if len(row) >= len(headers):
                            schedule_item = {}
                            for i, header in enumerate(headers):
                                schedule_item[header] = row[i] if i < len(row) else ""
                            result['master_schedule'].append(schedule_item)
                            
            except gspread.WorksheetNotFound:
                logger.warning(f"Master Schedule sheet not found in {ops_sheet_id}")
            
            logger.info(f"Retrieved operations data: {len(result['site_info'])} site info, {len(result['master_schedule'])} schedule items")
            return result
            
        except Exception as e:
            logger.error(f"Error getting operations data for {ops_sheet_id}: {e}")
            raise

    def update_actual_start_time(self, ops_sheet_id: str, row_index: int, start_time: str) -> bool:
        """Update the actual start time for a game in the Master Schedule."""
        try:
            self._ensure_client()
            
            ops_spreadsheet = self.client.open_by_key(ops_sheet_id)
            schedule_sheet = ops_spreadsheet.worksheet('Master Schedule')
            
            # Get headers to find the "ACTUAL START TIME" column
            headers = schedule_sheet.row_values(1)
            
            actual_start_col = None
            for i, header in enumerate(headers):
                if 'ACTUAL START TIME' in header.upper():
                    actual_start_col = i + 1  # gspread uses 1-based indexing
                    break
            
            if actual_start_col is None:
                logger.error("ACTUAL START TIME column not found")
                return False
            
            # Update the cell (row_index is 0-based, but we need 1-based for gspread, +1 for header)
            cell_row = row_index + 2
            schedule_sheet.update_cell(cell_row, actual_start_col, start_time)
            
            logger.info(f"Updated actual start time for row {row_index} to {start_time}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating actual start time: {e}")
            return False

# Initialize the service
sheets_service = GoogleSheetsService()

# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'GOLS Google Sheets Service',
        'version': '1.0.0'
    })

@app.route('/events', methods=['GET'])
def get_events():
    """Get the list of events from the File Cabinet."""
    try:
        events = sheets_service.get_events_list()
        return jsonify({
            'success': True,
            'data': events,
            'count': len(events)
        })
    except Exception as e:
        logger.error(f"Error in /events endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/operations/<ops_sheet_id>', methods=['GET'])
def get_operations(ops_sheet_id: str):
    """Get operations data (Site Info and Master Schedule) for a specific event."""
    try:
        data = sheets_service.get_operations_data(ops_sheet_id)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        logger.error(f"Error in /operations endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/operations/<ops_sheet_id>/start-time', methods=['POST'])
def update_start_time(ops_sheet_id: str):
    """Update the actual start time for a game."""
    try:
        data = request.get_json()
        
        if not data or 'row_index' not in data or 'start_time' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: row_index, start_time'
            }), 400
        
        success = sheets_service.update_actual_start_time(
            ops_sheet_id, 
            data['row_index'], 
            data['start_time']
        )
        
        return jsonify({
            'success': success,
            'message': 'Start time updated successfully' if success else 'Failed to update start time'
        })
        
    except Exception as e:
        logger.error(f"Error in /start-time endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/debug/file-cabinet', methods=['GET'])
def debug_file_cabinet():
    """Debug endpoint to inspect File Cabinet structure."""
    try:
        worksheets = []
        for worksheet in sheets_service.file_cabinet.worksheets():
            try:
                values = worksheet.get_all_values()
                worksheets.append({
                    'title': worksheet.title,
                    'id': worksheet.id,
                    'row_count': len(values),
                    'col_count': len(values[0]) if values else 0,
                    'first_5_rows': values[:5] if values else []
                })
            except Exception as e:
                worksheets.append({
                    'title': worksheet.title,
                    'id': worksheet.id,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'data': {
                'spreadsheet_title': sheets_service.file_cabinet.title,
                'spreadsheet_id': FILE_CABINET_SPREADSHEET_ID,
                'worksheets': worksheets
            }
        })
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting GOLS Google Sheets Service...")
    print("📋 Available endpoints:")
    print("   GET  /health - Health check")
    print("   GET  /events - Get events list from File Cabinet")
    print("   GET  /operations/<ops_sheet_id> - Get operations data")
    print("   POST /operations/<ops_sheet_id>/start-time - Update actual start time")
    print("   GET  /debug/file-cabinet - Debug File Cabinet structure")
    print("\n🌐 Service running on http://localhost:8081")
    print("💡 Use this URL in your OBS widget configuration")
    
    app.run(host='0.0.0.0', port=8081, debug=True)
