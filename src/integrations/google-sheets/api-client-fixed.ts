import { google } from 'googleapis';
import { logger } from '../../utils/logger.js';
import { GOOGLE_SHEETS_CONFIG } from '../../utils/constants.js';
import type { SheetData, GoogleSheetsConfig } from '../../types/sheets';

/**
 * Google Sheets API client for GOLS OBS Widget
 * Handles authentication, sheet operations, and data retrieval
 */
export class GoogleSheetsApiClient {
  private sheets: any = null;
  private auth: any = null;
  private isAuthenticated = false;
  private config: GoogleSheetsConfig | null = null;

  constructor() {
    logger.debug('Initializing Google Sheets API client', { module: 'GoogleSheetsApiClient' });
  }

  /**
   * Initialize and authenticate with Google Sheets API
   */
  async initialize(config: GoogleSheetsConfig): Promise<void> {
    try {
      logger.info('Initializing Google Sheets API', { 
        module: 'GoogleSheetsApiClient',
        data: { spreadsheetId: config.spreadsheetId }
      });

      this.config = config;

      // Initialize auth based on configuration
      if (config.serviceAccountKey) {
        await this.initializeServiceAccount(config.serviceAccountKey);
      } else if (config.apiKey) {
        await this.initializeApiKey(config.apiKey);
      } else {
        throw new Error('No valid authentication method provided');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isAuthenticated = true;

      logger.info('Successfully initialized Google Sheets API', { module: 'GoogleSheetsApiClient' });
    } catch (error) {
      logger.error('Failed to initialize Google Sheets API', { 
        module: 'GoogleSheetsApiClient',
        data: { error }
      });
      throw new Error(`Google Sheets initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize service account authentication
   */
  private async initializeServiceAccount(serviceAccountKey: string): Promise<void> {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [GOOGLE_SHEETS_CONFIG.SCOPES.READONLY, GOOGLE_SHEETS_CONFIG.SCOPES.READWRITE]
      });

      logger.debug('Service account authentication initialized', { module: 'GoogleSheetsApiClient' });
    } catch (error) {
      logger.error('Service account initialization failed', { 
        module: 'GoogleSheetsApiClient',
        data: { error }
      });
      throw new Error('Invalid service account credentials');
    }
  }

  /**
   * Initialize API key authentication (read-only)
   */
  private async initializeApiKey(apiKey: string): Promise<void> {
    try {
      this.auth = apiKey;
      logger.debug('API key authentication initialized', { module: 'GoogleSheetsApiClient' });
    } catch (error) {
      logger.error('API key initialization failed', { 
        module: 'GoogleSheetsApiClient',
        data: { error }
      });
      throw new Error('Invalid API key');
    }
  }

  /**
   * Check if client is authenticated and ready
   */
  isReady(): boolean {
    return this.isAuthenticated && this.sheets !== null && this.config !== null;
  }

  /**
   * Get data from a specific sheet range
   */
  async getSheetData(sheetName: string, range?: string): Promise<SheetData> {
    if (!this.isReady()) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      
      logger.debug('Fetching sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.config!.spreadsheetId,
          range: fullRange 
        }
      });

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config!.spreadsheetId,
        range: fullRange,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      const values = response.data.values || [];
      
      logger.info('Successfully fetched sheet data', { 
        module: 'GoogleSheetsApiClient',
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
        module: 'GoogleSheetsApiClient',
        data: { 
          range: `${sheetName}!${range || 'All'}`,
          error 
        }
      });
      throw new Error(`Failed to fetch sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update data in a specific sheet range
   */
  async updateSheetData(sheetName: string, range: string, values: any[][]): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Google Sheets client not initialized');
    }

    if (typeof this.auth === 'string') {
      throw new Error('Write operations require service account authentication');
    }

    try {
      const fullRange = `${sheetName}!${range}`;
      
      logger.debug('Updating sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.config!.spreadsheetId,
          range: fullRange,
          valueCount: values.length
        }
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config!.spreadsheetId,
        range: fullRange,
        valueInputOption: 'RAW',
        resource: {
          values
        }
      });

      logger.info('Successfully updated sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          range: fullRange,
          rowsUpdated: values.length
        }
      });
    } catch (error) {
      logger.error('Failed to update sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          range: `${sheetName}!${range}`,
          error 
        }
      });
      throw new Error(`Failed to update sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Append data to a sheet
   */
  async appendSheetData(sheetName: string, values: any[][]): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Google Sheets client not initialized');
    }

    if (typeof this.auth === 'string') {
      throw new Error('Write operations require service account authentication');
    }

    try {
      logger.debug('Appending sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.config!.spreadsheetId,
          sheetName,
          valueCount: values.length
        }
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config!.spreadsheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values
        }
      });

      logger.info('Successfully appended sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          sheetName,
          rowsAppended: values.length
        }
      });
    } catch (error) {
      logger.error('Failed to append sheet data', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          sheetName,
          error 
        }
      });
      throw new Error(`Failed to append sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sheet metadata and properties
   */
  async getSheetMetadata(): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      logger.debug('Fetching sheet metadata', { 
        module: 'GoogleSheetsApiClient',
        data: { 
          spreadsheetId: this.config!.spreadsheetId
        }
      });

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config!.spreadsheetId,
        includeGridData: false
      });

      logger.info('Successfully fetched sheet metadata', {
        module: 'GoogleSheetsApiClient',
        data: {
          title: response.data.properties?.title,
          sheetCount: response.data.sheets?.length || 0
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch sheet metadata', { 
        module: 'GoogleSheetsApiClient',
        data: { error }
      });
      throw new Error(`Failed to fetch sheet metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getSheetMetadata();
      logger.info('Connection test successful', { module: 'GoogleSheetsApiClient' });
      return true;
    } catch (error) {
      logger.error('Connection test failed', { 
        module: 'GoogleSheetsApiClient',
        data: { error }
      });
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.sheets = null;
    this.auth = null;
    this.isAuthenticated = false;
    this.config = null;
    logger.info('Disconnected from Google Sheets API', { module: 'GoogleSheetsApiClient' });
  }
}
