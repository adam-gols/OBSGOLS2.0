/**
 * Production data models for Google Sheets integration
 * Defines all TypeScript interfaces used in the GOLS OBS Widget
 */

// Re-export types from processors for convenience
export type { 
  ProcessedSiteInfo, 
  SiteInfoProcessingResult 
} from '../processors/site-info-processor';

export type { 
  ProcessedGameData, 
  ScheduleProcessingResult 
} from '../processors/schedule-processor';

// File Cabinet data models
export interface FileCabinetEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  opsSheetId: string;
  opsSheetUrl: string;
  status: 'upcoming' | 'live' | 'completed';
  lastUpdated: string;
  description?: string;
  notes?: string;
}

export interface FileCabinetData {
  events: FileCabinetEvent[];
  lastRefresh: string;
  totalEvents: number;
  activeEvents: FileCabinetEvent[];
}

// Operations Sheet data models
export interface OperationsSheetInfo {
  spreadsheetId: string;
  spreadsheetName?: string;
  lastAccessed: string;
  hasValidStructure: boolean;
  availableTabs: string[];
  permissions: {
    canRead: boolean;
    canWrite: boolean;
  };
}

export interface SiteStreamData {
  id: string;
  siteName: string;
  streamName: string;
  streamUrl?: string;
  isActive: boolean;
  description?: string;
  equipment?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface GameEventData {
  id: string;
  scheduledTime: string;
  scheduledDate: string;
  homeTeam: string;
  awayTeam: string;
  location: string;
  field?: string;
  division?: string;
  level?: string;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  actualStartTime?: string;
  autoStartTime?: string; // Calculated: scheduled - 5 minutes
  notes?: string;
  lastUpdated: string;
  
  // Navigation helpers
  isNextGame?: boolean;
  timeUntilGame?: number; // Minutes until game starts
  canRecord?: boolean; // Whether recording controls should be available
}

// Widget state models
export interface WidgetState {
  selectedEvent?: FileCabinetEvent;
  selectedSiteStream?: SiteStreamData;
  currentGame?: GameEventData;
  gameList?: GameEventData[];
  currentGameIndex?: number;
  isRecording: boolean;
  lastUpdate: string;
}

export interface ServiceHealth {
  googleSheets: {
    status: 'connected' | 'disconnected' | 'error' | 'rate_limited';
    lastCheck: string;
    errorMessage?: string;
    circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    requestsThisMinute: number;
  };
  obsWebSocket?: {
    status: 'connected' | 'disconnected' | 'error';
    lastCheck: string;
    errorMessage?: string;
    recordingStatus?: 'stopped' | 'recording' | 'paused';
  };
  singularLive?: {
    status: 'connected' | 'disconnected' | 'error' | 'disabled';
    lastCheck: string;
    errorMessage?: string;
    lastDataSent?: string;
  };
}

// Configuration models
export interface GoogleSheetsProductionConfig {
  credentials: {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
  };
  spreadsheetId: string;
  scopes: string[];
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  circuitBreaker: {
    maxFailures: number;
    resetTimeoutMs: number;
  };
  validation: {
    maxRows: number;
    maxColumns: number;
    freshnessMs: number;
  };
}

export interface WidgetSettings {
  fileCabinet: {
    autoRefreshInterval: number; // seconds
    cacheExpiry: number; // seconds
    showInactiveEvents: boolean;
  };
  operations: {
    autoRefreshInterval: number; // seconds
    cacheExpiry: number; // seconds
    autoNavigateToNextGame: boolean;
    savePromptTimeout: number; // seconds
  };
  obs: {
    host: string;
    port: number;
    password?: string;
    autoStart: boolean;
    fileNamingPattern: string;
  };
  singularLive: {
    enabled: boolean;
    endpoint?: string;
    token?: string;
    dataRefreshInterval: number; // seconds
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showDebugInfo: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

// API Response models
export interface SheetsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    source: 'cache' | 'api';
    processingTimeMs: number;
  };
}

export interface BatchReadResponse {
  ranges: {
    range: string;
    data: any[][];
    rowCount: number;
    columnCount: number;
  }[];
  totalRanges: number;
  lastUpdated: string;
}

export interface WriteOperationResult {
  range: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
  timestamp: string;
  success: boolean;
}

// Validation and error models
export interface ValidationError {
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
  rowIndex?: number;
  columnIndex?: number;
}

export interface ProcessingResult<T> {
  data: T;
  success: boolean;
  validationErrors: ValidationError[];
  warnings: string[];
  metadata: {
    totalRows: number;
    processedRows: number;
    skippedRows: number;
    processingTimeMs: number;
    lastUpdated: string;
  };
}

// Event system models
export interface WidgetEvent {
  type: string;
  source: string;
  timestamp: string;
  data?: any;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  callback: (event: WidgetEvent) => void;
  once?: boolean;
}

// Utility types
export type GoogleSheetsTabName = 
  | 'File Cabinet' 
  | 'Site Info' 
  | 'Master Schedule' 
  | 'Operations';

export type SheetColumnMap = Record<string, number | string>;

export type SortOrder = 'asc' | 'desc';

export type FilterCriteria<T> = Partial<{
  [K in keyof T]: T[K] | ((value: T[K]) => boolean);
}>;

// Constants for type safety
export const SHEET_COLUMN_INDICES = {
  FILE_CABINET: {
    EVENT_NAME: 0,
    DATE: 1,
    LOCATION: 2,
    OPS_SHEET_URL: 3,
    STATUS: 4,
    NOTES: 5,
    LAST_UPDATED: 6
  },
  SITE_INFO: {
    SITE_NAME: 0,
    STREAM_NAME: 1,
    STREAM_URL: 2,
    DESCRIPTION: 3,
    ACTIVE: 4,
    LATITUDE: 5,
    LONGITUDE: 6,
    EQUIPMENT: 7,
    NOTES: 8
  },
  MASTER_SCHEDULE: {
    GAME_ID: 0,
    SCHEDULED_TIME: 1,
    HOME_TEAM: 2,
    AWAY_TEAM: 3,
    LOCATION: 4,
    FIELD: 5,
    DIVISION: 6,
    HOME_SCORE: 7,
    AWAY_SCORE: 8,
    STATUS: 9,
    ACTUAL_START_TIME: 10,
    NOTES: 11,
    LAST_UPDATED: 12
  }
} as const;

export const WIDGET_EVENTS = {
  // Google Sheets events
  SHEETS_CONNECTED: 'sheets:connected',
  SHEETS_DISCONNECTED: 'sheets:disconnected',
  SHEETS_ERROR: 'sheets:error',
  SHEETS_DATA_UPDATED: 'sheets:data_updated',
  
  // File Cabinet events
  EVENT_SELECTED: 'filecabinet:event_selected',
  EVENT_LIST_UPDATED: 'filecabinet:list_updated',
  
  // Operations events
  OPS_SHEET_LOADED: 'ops:sheet_loaded',
  SITE_STREAM_SELECTED: 'ops:site_stream_selected',
  GAME_SELECTED: 'ops:game_selected',
  GAME_NAVIGATED: 'ops:game_navigated',
  GAME_DATA_UPDATED: 'ops:game_data_updated',
  
  // OBS events
  OBS_CONNECTED: 'obs:connected',
  OBS_DISCONNECTED: 'obs:disconnected',
  OBS_RECORDING_STARTED: 'obs:recording_started',
  OBS_RECORDING_STOPPED: 'obs:recording_stopped',
  
  // Singular Live events
  SINGULAR_CONNECTED: 'singular:connected',
  SINGULAR_DISCONNECTED: 'singular:disconnected',
  SINGULAR_DATA_SENT: 'singular:data_sent',
  
  // Widget events
  WIDGET_INITIALIZED: 'widget:initialized',
  WIDGET_ERROR: 'widget:error',
  SETTINGS_UPDATED: 'widget:settings_updated'
} as const;

// Type guards for runtime type checking
export function isFileCabinetEvent(obj: any): obj is FileCabinetEvent {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.date === 'string' &&
         typeof obj.opsSheetId === 'string' &&
         ['upcoming', 'live', 'completed'].includes(obj.status);
}

export function isGameEventData(obj: any): obj is GameEventData {
  return obj &&
         typeof obj.id === 'string' &&
         typeof obj.scheduledTime === 'string' &&
         typeof obj.homeTeam === 'string' &&
         typeof obj.awayTeam === 'string' &&
         ['upcoming', 'live', 'completed', 'cancelled'].includes(obj.status);
}

export function isSiteStreamData(obj: any): obj is SiteStreamData {
  return obj &&
         typeof obj.id === 'string' &&
         typeof obj.siteName === 'string' &&
         typeof obj.streamName === 'string' &&
         typeof obj.isActive === 'boolean';
}
