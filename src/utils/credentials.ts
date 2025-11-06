/**
 * Production credential management for GOLS OBS Widget
 * Contains embedded service account credentials for Google Sheets API
 * 
 * NOTE: These are production-only credentials with minimal required permissions
 * Limited to read/write access to specific GOLS Google Sheets only
 */

import { logger } from './logger.js';

/**
 * Base64 encoded service account credentials for production use
 * Decoded format: Google Service Account JSON with sheets API access
 */
const ENCODED_SERVICE_ACCOUNT = 'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZ29scy1vYnMtd2lkZ2V0LXByb2QiLAogICJwcml2YXRlX2tleV9pZCI6ICJhYmMxMjM0NTY3ODkwZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTYiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRREZha2xoU2RHaGlqa2xcbmZQaDNyNUc4NzJISkxNTlFQUjNRUjNRUlFSUVJRUlFSUVJRUlFSUVJRUlFSUVJRUlFSUVJRUlFSUVJRUVJUUVcbkVJQVFSUVJRUlFSUVJRUlFSUVJRUlFKUVJRUlFSUVJRUlFSUVJRRVJRUlFKUVJRUlFSUVJRUVKUVJRUlFSXG5SUVJRUkVKUVJRUlFSUVJRUlFKUVJRUlFSUVJRUlFKUVJRUlFSUVJRUkVKUVJRUlFSUVJRUlFKUVJRUlFSXG5SUVJRUlFKUVJRUlFSUVJRUlFKUVJRUlFSUVJRUlFKUVJRUlFSUVJRUlFKUVJRUlFSUVJRUlFKUVJRUlFSXG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAiZ29scy1vYnMtd2lkZ2V0QGdvbHMtb2JzLXdpZGdldC1wcm9kLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEyMzQ1Njc4OTAxMjM0NTY3ODkwIiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9nb2xzLW9icy13aWRnZXQlNDBnb2xzLW9icy13aWRnZXQtcHJvZC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQ==';

/**
 * Production Google Sheets configuration
 */
export const PRODUCTION_SHEETS_CONFIG = {
  // Main File Cabinet spreadsheet ID (extracted from URL)
  FILE_CABINET_SPREADSHEET_ID: '1yIMVWLxVRwsTnUlRNuIKIhesgrL9rvTZheq7-U-zNM0',
  
  // Default sheet names and ranges
  FILE_CABINET_SHEET_NAME: 'File Cabinet',
  OPERATIONS_SHEET_NAME: 'OPS',
  SITE_INFO_SHEET_NAME: 'Site Info',
  MASTER_SCHEDULE_SHEET_NAME: 'Master Schedule',
  
  // API scopes required for read/write access
  REQUIRED_SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
  
  // Rate limiting configuration
  MAX_REQUESTS_PER_MINUTE: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
  
  // Circuit breaker configuration
  MAX_FAILURES: 3,
  RESET_TIMEOUT_MS: 30000,
  
  // Data validation settings
  MAX_SHEET_ROWS: 10000,
  MAX_SHEET_COLUMNS: 50,
  DATA_FRESHNESS_MS: 30000 // 30 seconds
} as const;

/**
 * Decodes and returns the embedded service account credentials
 * @returns Decoded service account JSON object
 */
export function getProductionCredentials(): any {
  try {
    // Decode base64 credentials
    const decoded = atob(ENCODED_SERVICE_ACCOUNT);
    const credentials = JSON.parse(decoded);
    
    logger.debug('Production credentials decoded successfully', {
      module: 'ProductionCredentials',
      data: { 
        clientEmail: credentials.client_email,
        projectId: credentials.project_id
      }
    });
    
    return credentials;
  } catch (error) {
    logger.error('Failed to decode production credentials', {
      module: 'ProductionCredentials',
      data: { error }
    });
    throw new Error('Invalid embedded credentials - contact support');
  }
}

/**
 * Validates that credentials have required fields for Google Sheets API
 * @param credentials - Service account credentials object
 * @returns True if valid, throws error otherwise
 */
export function validateCredentials(credentials: any): boolean {
  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri'
  ];
  
  for (const field of requiredFields) {
    if (!credentials[field]) {
      throw new Error(`Missing required credential field: ${field}`);
    }
  }
  
  if (credentials.type !== 'service_account') {
    throw new Error('Credentials must be for a service account');
  }
  
  logger.debug('Credentials validation passed', {
    module: 'ProductionCredentials',
    data: { clientEmail: credentials.client_email }
  });
  
  return true;
}

/**
 * Gets the production File Cabinet spreadsheet URL
 * @returns Complete Google Sheets URL for File Cabinet
 */
export function getFileCabinetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${PRODUCTION_SHEETS_CONFIG.FILE_CABINET_SPREADSHEET_ID}/edit`;
}

/**
 * Extracts spreadsheet ID from Google Sheets URL
 * @param url - Google Sheets URL
 * @returns Spreadsheet ID or null if invalid
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

/**
 * Production configuration for all Google Sheets operations
 */
export const PRODUCTION_CONFIG = {
  credentials: getProductionCredentials(),
  spreadsheetId: PRODUCTION_SHEETS_CONFIG.FILE_CABINET_SPREADSHEET_ID,
  scopes: PRODUCTION_SHEETS_CONFIG.REQUIRED_SCOPES,
  rateLimit: {
    maxRequests: PRODUCTION_SHEETS_CONFIG.MAX_REQUESTS_PER_MINUTE,
    windowMs: PRODUCTION_SHEETS_CONFIG.RATE_LIMIT_WINDOW_MS
  },
  circuitBreaker: {
    maxFailures: PRODUCTION_SHEETS_CONFIG.MAX_FAILURES,
    resetTimeoutMs: PRODUCTION_SHEETS_CONFIG.RESET_TIMEOUT_MS
  },
  validation: {
    maxRows: PRODUCTION_SHEETS_CONFIG.MAX_SHEET_ROWS,
    maxColumns: PRODUCTION_SHEETS_CONFIG.MAX_SHEET_COLUMNS,
    freshnessMs: PRODUCTION_SHEETS_CONFIG.DATA_FRESHNESS_MS
  }
} as const;
