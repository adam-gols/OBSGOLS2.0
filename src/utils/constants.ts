/**
 * Constants and configuration values
 * TODO: Expand in subsequent steps
 */

export const GOLS_CONSTANTS = {
  // Google Sheets Configuration
  DEFAULT_FILE_CABINET_URL: 'https://docs.google.com/spreadsheets/d/1yIMVWLxVRwsTnUlRNuIKIhesgrL9rvTZheq7-U-zNM0/edit?usp=sharing',
  
  // OBS WebSocket Configuration
  DEFAULT_OBS_HOST: 'localhost',
  DEFAULT_OBS_PORT: 4455,
  
  // Service Health Check Configuration
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  
  // Brand Colors
  BRAND_COLORS: {
    CARDINAL_RED: '#C62128',
    BLACK: '#000000',
    PUMICE_GREY: '#C7C9C7',
    GALLERY_GREY: '#F0EFEF',
    WILLIAM_GREEN: '#37605F',
    ZODIAC_BLUE: '#0F1C41',
    PICTON_BLUE: '#4DC7E4'
  }
} as const;

export const GOOGLE_SHEETS_CONFIG = {
  SCOPES: {
    READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    READWRITE: 'https://www.googleapis.com/auth/spreadsheets'
  },
  CACHE_DURATION_MS: 60000, // 1 minute
  DEFAULT_EVENT_SCHEMA: {
    id: 0,
    name: 1,
    date: 2,
    time: 3,
    location: 4,
    homeTeam: 5,
    awayTeam: 6,
    homeScore: 7,
    awayScore: 8,
    status: 9,
    streamUrl: 10,
    notes: 11,
    lastUpdated: 12
  },
  DEFAULT_OPERATIONS_SCHEMA: {
    id: 0,
    timestamp: 1,
    operation: 2,
    eventId: 3,
    data: 4,
    status: 5,
    errorMessage: 6
  }
} as const;
