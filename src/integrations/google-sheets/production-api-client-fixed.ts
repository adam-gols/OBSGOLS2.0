/**
 * Production-ready Google Sheets API client for GOLS OBS Widget
 * Uses embedded static credentials for all users
 * Implements circuit breaker, rate limiting, and comprehensive error handling
 */

import { google } from 'googleapis';
import { logger } from '../../utils/logger.js';
import { 
  PRODUCTION_CONFIG, 
  validateCredentials
} from '../../utils/production-credentials.js';
import type { SheetData, SheetRange } from '../../types/sheets';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

interface RateLimitState {
  requests: number[];
  lastReset: number;
}

/**
 * Production Google Sheets API client with embedded credentials
 * Features: circuit breaker, rate limiting, automatic retry, health monitoring
 */
export class ProductionGoogleSheetsClient {
  private sheets: any = null;
  private auth: any = null;
  private isAuthenticated = false;
  private circuitBreaker: CircuitBreakerState;
  private rateLimit: RateLimitState;
  private readonly spreadsheetId: string;

  constructor() {
    logger.info('Initializing Production Google Sheets Client', { 
      module: 'ProductionGoogleSheetsClient' 
    });

    this.spreadsheetId = PRODUCTION_CONFIG.spreadsheetId;
    
    // Initialize circuit breaker
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };

    // Initialize rate limiter
    this.rateLimit = {
      requests: [],
      lastReset: Date.now()
    };
  }

  /**
   * Initialize the client with embedded production credentials
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Authenticating with embedded production credentials', {
        module: 'ProductionGoogleSheetsClient'
      });

      // Validate embedded credentials
      validateCredentials(PRODUCTION_CONFIG.credentials);

      // Initialize Google Auth with service account
      this.auth = new google.auth.GoogleAuth({
        credentials: PRODUCTION_CONFIG.credentials,
        scopes: [...PRODUCTION_CONFIG.scopes]
      });

      // Create sheets client
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isAuthenticated = true;

      logger.info('Successfully authenticated with Google Sheets API', {
        module: 'ProductionGoogleSheetsClient',
        data: { 
          spreadsheetId: this.spreadsheetId,
          clientEmail: PRODUCTION_CONFIG.credentials.client_email
        }
      });

      // Test connection with a simple metadata request
      await this.testConnection();

    } catch (error) {
      logger.error('Failed to initialize Google Sheets client', {
        module: 'ProductionGoogleSheetsClient',
        data: { error }
      });
      throw new Error(`Google Sheets initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the connection by fetching spreadsheet metadata
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.executeWithCircuitBreaker(async () => {
        return await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
          fields: 'properties.title'
        });
      });

      logger.info('Connection test successful', {
        module: 'ProductionGoogleSheetsClient',
        data: { 
          spreadsheetTitle: response.data.properties?.title,
          spreadsheetId: this.spreadsheetId
        }
      });
    } catch (error) {
      logger.error('Connection test failed', {
        module: 'ProductionGoogleSheetsClient',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Check if the client is ready for operations
   */
  isReady(): boolean {
    return this.isAuthenticated && 
           this.sheets !== null && 
           this.circuitBreaker.state !== 'OPEN';
  }

  /**
   * Get health status of the client
   */
  getHealthStatus(): {
    isReady: boolean;
    circuitBreakerState: string;
    recentFailures: number;
    rateLimitStatus: string;
  } {
    const now = Date.now();
    const recentRequests = this.rateLimit.requests.filter(
      time => now - time < PRODUCTION_CONFIG.rateLimit.windowMs
    );

    return {
      isReady: this.isReady(),
      circuitBreakerState: this.circuitBreaker.state,
      recentFailures: this.circuitBreaker.failures,
      rateLimitStatus: `${recentRequests.length}/${PRODUCTION_CONFIG.rateLimit.maxRequests} requests`
    };
  }

  /**
   * Read data from a specific sheet range
   */
  async readSheetData(sheetName: string, range?: string): Promise<SheetData> {
    this.validateReady();

    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    
    logger.debug('Reading sheet data', {
      module: 'ProductionGoogleSheetsClient',
      data: { sheetName, range: fullRange }
    });

    const response = await this.executeWithCircuitBreaker(async () => {
      return await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER'
      });
    });

    const values = response.data.values || [];
    const sheetData: SheetData = {
      range: fullRange,
      values,
      rowCount: values.length,
      columnCount: values.length > 0 ? Math.max(...values.map((row: any[]) => row.length)) : 0,
      lastUpdated: new Date().toISOString()
    };

    logger.debug('Sheet data retrieved successfully', {
      module: 'ProductionGoogleSheetsClient',
      data: { 
        range: fullRange,
        rowCount: sheetData.rowCount,
        columnCount: sheetData.columnCount
      }
    });

    return sheetData;
  }

  /**
   * Write data to a specific sheet range
   */
  async writeSheetData(sheetName: string, range: string, values: any[][]): Promise<void> {
    this.validateReady();

    const fullRange = `${sheetName}!${range}`;
    
    logger.debug('Writing sheet data', {
      module: 'ProductionGoogleSheetsClient',
      data: { 
        range: fullRange, 
        rowCount: values.length,
        columnCount: values.length > 0 ? (values[0]?.length || 0) : 0
      }
    });

    await this.executeWithCircuitBreaker(async () => {
      return await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });
    });

    logger.info('Sheet data written successfully', {
      module: 'ProductionGoogleSheetsClient',
      data: { range: fullRange }
    });
  }

  /**
   * Batch read multiple ranges efficiently
   */
  async batchReadSheetData(ranges: SheetRange[]): Promise<SheetData[]> {
    this.validateReady();

    const fullRanges = ranges.map(r => {
      if (r.startColumn && r.endColumn) {
        const rowRange = r.startRow && r.endRow ? `${r.startRow}:${r.endRow}` : '';
        return `${r.sheetName}!${r.startColumn}${rowRange}:${r.endColumn}${rowRange}`;
      }
      return r.sheetName;
    });

    logger.debug('Batch reading sheet data', {
      module: 'ProductionGoogleSheetsClient',
      data: { ranges: fullRanges }
    });

    const response = await this.executeWithCircuitBreaker(async () => {
      return await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: fullRanges,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER'
      });
    });

    const results: SheetData[] = response.data.valueRanges.map((valueRange: any, index: number) => {
      const values = valueRange.values || [];
      return {
        range: fullRanges[index],
        values,
        rowCount: values.length,
        columnCount: values.length > 0 && values[0] ? values[0].length : 0,
        lastUpdated: new Date().toISOString()
      };
    });

    logger.debug('Batch sheet data retrieved successfully', {
      module: 'ProductionGoogleSheetsClient',
      data: { rangeCount: results.length }
    });

    return results;
  }

  /**
   * Get all sheet names in the spreadsheet
   */
  async getSheetNames(): Promise<string[]> {
    this.validateReady();

    logger.debug('Fetching sheet names', {
      module: 'ProductionGoogleSheetsClient'
    });

    const response = await this.executeWithCircuitBreaker(async () => {
      return await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties.title'
      });
    });

    const sheetNames = response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];

    logger.debug('Sheet names retrieved', {
      module: 'ProductionGoogleSheetsClient',
      data: { sheetNames }
    });

    return sheetNames;
  }

  /**
   * Execute a function with circuit breaker and rate limiting
   */
  private async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit breaker state
    this.updateCircuitBreakerState();
    
    if (this.circuitBreaker.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - Google Sheets service temporarily unavailable');
    }

    // Check rate limit
    await this.enforceRateLimit();

    try {
      const result = await operation();
      
      // Success - reset circuit breaker if it was half-open
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
        logger.info('Circuit breaker reset to CLOSED', {
          module: 'ProductionGoogleSheetsClient'
        });
      }

      return result;
    } catch (error) {
      // Handle failure
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Update circuit breaker state based on time and failures
   */
  private updateCircuitBreakerState(): void {
    const now = Date.now();
    
    if (this.circuitBreaker.state === 'OPEN') {
      if (now - this.circuitBreaker.lastFailureTime > PRODUCTION_CONFIG.circuitBreaker.resetTimeoutMs) {
        this.circuitBreaker.state = 'HALF_OPEN';
        logger.info('Circuit breaker moved to HALF_OPEN', {
          module: 'ProductionGoogleSheetsClient'
        });
      }
    }
  }

  /**
   * Record a failure and update circuit breaker state
   */
  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= PRODUCTION_CONFIG.circuitBreaker.maxFailures) {
      this.circuitBreaker.state = 'OPEN';
      logger.warn('Circuit breaker opened due to repeated failures', {
        module: 'ProductionGoogleSheetsClient',
        data: { failures: this.circuitBreaker.failures }
      });
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests
    this.rateLimit.requests = this.rateLimit.requests.filter(
      time => now - time < PRODUCTION_CONFIG.rateLimit.windowMs
    );

    // Check if we're at the limit
    if (this.rateLimit.requests.length >= PRODUCTION_CONFIG.rateLimit.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimit.requests);
      const waitTime = PRODUCTION_CONFIG.rateLimit.windowMs - (now - oldestRequest);
      
      logger.warn('Rate limit exceeded, waiting', {
        module: 'ProductionGoogleSheetsClient',
        data: { waitTimeMs: waitTime }
      });

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.rateLimit.requests.push(now);
  }

  /**
   * Validate that the client is ready for operations
   */
  private validateReady(): void {
    if (!this.isReady()) {
      throw new Error('Google Sheets client is not ready - check authentication and circuit breaker state');
    }
  }
}
