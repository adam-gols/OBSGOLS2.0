import { logger } from '../../utils/logger.js';
import type { SheetData, GoogleSheetsConfig } from '../../types/sheets';

/**
 * Browser-compatible Google Sheets API client for GOLS OBS Widget
 * Uses fetch API with Google Sheets API v4 directly
 */
export class BrowserGoogleSheetsApiClient {
  private apiKey: string | null = null;
  private spreadsheetId: string | null = null;
  private isInitialized = false;

  constructor() {
    logger.debug('Initializing Browser Google Sheets API client', { module: 'BrowserGoogleSheetsApiClient' });
  }

  /**
   * Initialize the client with API key and spreadsheet ID
   */
  async initialize(config: GoogleSheetsConfig): Promise<void> {
    try {
      logger.info('Initializing Browser Google Sheets API', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { spreadsheetId: config.spreadsheetId }
      });

      if (!config.apiKey) {
        throw new Error('API key is required for browser-based Google Sheets access');
      }

      if (!config.spreadsheetId) {
        throw new Error('Spreadsheet ID is required');
      }

      this.apiKey = config.apiKey;
      this.spreadsheetId = this.extractSpreadsheetId(config.spreadsheetId);
      
      // Test the connection
      await this.validateConnection();
      
      this.isInitialized = true;

      logger.info('Successfully initialized Browser Google Sheets API', { module: 'BrowserGoogleSheetsApiClient' });
    } catch (error) {
      logger.error('Failed to initialize Browser Google Sheets API', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { error }
      });
      throw new Error(`Browser Google Sheets initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract spreadsheet ID from URL or return as-is if already an ID
   */
  private extractSpreadsheetId(input: string): string {
    // If it's a full URL, extract the ID
    const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    // If it's already just an ID, return it
    return input;
  }

  /**
   * Test the connection to Google Sheets API
   */
  private async validateConnection(): Promise<void> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?key=${this.apiKey}&fields=properties.title`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('Connection test successful', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { title: data.properties?.title }
      });
    } catch (error) {
      logger.error('Connection test failed', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Check if client is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && this.apiKey !== null && this.spreadsheetId !== null;
  }

  /**
   * Get data from a specific sheet range
   */
  async getSheetData(sheetName: string, range?: string): Promise<SheetData> {
    if (!this.isReady()) {
      throw new Error('Browser Google Sheets client not initialized');
    }

    try {
      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      
      logger.debug('Fetching sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.spreadsheetId,
          range: fullRange 
        }
      });

      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(fullRange)}`);
      url.searchParams.set('key', this.apiKey!);
      url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
      url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const values = data.values || [];
      
      logger.info('Successfully fetched sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          range: fullRange,
          rowCount: values.length,
          columnCount: values.length > 0 ? values[0].length : 0
        }
      });

      return {
        range: fullRange,
        values,
        rowCount: values.length,
        columnCount: values.length > 0 ? values[0].length : 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to fetch sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          range: `${sheetName}!${range || 'All'}`,
          error 
        }
      });
      throw new Error(`Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple sheet ranges in a single request
   */
  async getBatchSheetData(ranges: Array<{ sheetName: string; range?: string }>): Promise<SheetData[]> {
    if (!this.isReady()) {
      throw new Error('Browser Google Sheets client not initialized');
    }

    try {
      const fullRanges = ranges.map(r => r.range ? `${r.sheetName}!${r.range}` : r.sheetName);
      
      logger.debug('Fetching batch sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.spreadsheetId,
          ranges: fullRanges 
        }
      });

      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet`);
      url.searchParams.set('key', this.apiKey!);
      url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
      url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');
      
      // Add ranges as separate parameters
      fullRanges.forEach(range => {
        url.searchParams.append('ranges', range);
      });

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const valueRanges = data.valueRanges || [];
      
      const results: SheetData[] = valueRanges.map((valueRange: any, index: number) => {
        const values = valueRange.values || [];
        return {
          range: fullRanges[index],
          values,
          rowCount: values.length,
          columnCount: values.length > 0 ? values[0].length : 0,
          lastUpdated: new Date().toISOString()
        };
      });

      logger.info('Successfully fetched batch sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          ranges: fullRanges,
          resultCount: results.length
        }
      });

      return results;
    } catch (error) {
      logger.error('Failed to fetch batch sheet data', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          ranges: ranges.map(r => `${r.sheetName}!${r.range || 'All'}`),
          error 
        }
      });
      throw new Error(`Failed to fetch batch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sheet metadata (sheet names, properties, etc.)
   */
  async getSheetMetadata(): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Browser Google Sheets client not initialized');
    }

    try {
      logger.debug('Fetching sheet metadata', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { spreadsheetId: this.spreadsheetId }
      });

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?key=${this.apiKey}&fields=sheets.properties`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info('Successfully fetched sheet metadata', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { 
          sheetCount: data.sheets?.length || 0
        }
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch sheet metadata', { 
        module: 'BrowserGoogleSheetsApiClient',
        data: { error }
      });
      throw new Error(`Failed to fetch sheet metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): { apiKey: string | null; spreadsheetId: string | null } {
    return {
      apiKey: this.apiKey,
      spreadsheetId: this.spreadsheetId
    };
  }

  /**
   * Clear the current configuration
   */
  reset(): void {
    this.apiKey = null;
    this.spreadsheetId = null;
    this.isInitialized = false;
    
    logger.info('Browser Google Sheets API client reset', { module: 'BrowserGoogleSheetsApiClient' });
  }

  /**
   * Test connection (compatibility method)
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.validateConnection();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect (compatibility method - no-op for browser client)
   */
  disconnect(): void {
    this.reset();
  }
}
