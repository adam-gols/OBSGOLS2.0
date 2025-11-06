/**
 * Production Google Sheets integration for GOLS OBS Widget
 * Main entry point for all Google Sheets functionality
 * 
 * Features:
 * - HTTP API client that communicates with local Python service
 * - File Cabinet management for event selection
 * - Operations sheet management for game data and write-back
 * - Site Info and Master Schedule data processing
 * - Fallback to browser API client if Python service is unavailable
 */

// Core HTTP API client (primary)
export { HTTPGoogleSheetsClient, httpSheetsClient } from './http-api-client.js';

// Fallback browser API client (primary export)
export { BrowserGoogleSheetsApiClient as BrowserGoogleSheetsAPIClient } from './browser-api-client.js';

// Legacy production client (for reference)
export { ProductionGoogleSheetsClient } from './production-api-client.js';

// Managers
export { FileCabinetManager } from './file-cabinet-manager.js';
export { OperationsManager } from './operations-manager.js';

// Data processors  
export { SiteInfoProcessor } from '../../data/processors/site-info-processor.js';
export { ScheduleProcessor } from '../../data/processors/schedule-processor.js';

// Types and interfaces
export type { 
  EventListItem, 
  FileCabinetData 
} from './file-cabinet-manager.js';

export type { 
  SiteInfo, 
  GameData, 
  OperationsData 
} from './operations-manager.js';

export type {
  ProcessedSiteInfo,
  SiteInfoProcessingResult
} from '../../data/processors/site-info-processor.js';

export type {
  ProcessedGameData,
  ScheduleProcessingResult  
} from '../../data/processors/schedule-processor.js';

// Configuration and credentials
export { 
  PRODUCTION_SHEETS_CONFIG,
  PRODUCTION_CONFIG,
  getProductionCredentials,
  validateCredentials,
  getFileCabinetUrl,
  extractSpreadsheetId
} from '../../utils/production-credentials.js';

// Legacy exports for compatibility (deprecated)
export { GoogleSheetsApiClient } from './api-client.js';
export { BrowserGoogleSheetsApiClient } from './browser-api-client.js';
export { EventSheetManager } from './event-sheet-manager.js';
export { OperationsSheetManager } from './operations-sheet-manager.js';
export { 
  GoogleSheetsDataProcessor,
  type ProcessedEventData,
  type ProcessedOperationData 
} from './data-processor.js';

// Re-export types for convenience
export type {
  GoogleSheetsConfig,
  SheetRange,
  SheetData,
  EventData,
  OperationData,
  EventSheetSchema,
  OperationsSheetSchema
} from '../../types/sheets';

import type { SheetValidationResult } from '../../types/sheets';

/**
 * Google Sheets Integration Manager
 * Orchestrates all Google Sheets operations and provides a unified interface
 * Auto-detects environment and uses appropriate client (browser vs Node.js)
 */
import { GoogleSheetsApiClient } from './api-client.js';
import { BrowserGoogleSheetsApiClient } from './browser-api-client.js';
import { EventSheetManager } from './event-sheet-manager.js';
import { OperationsSheetManager } from './operations-sheet-manager.js';
import { logger } from '../../utils/logger.js';
import type { GoogleSheetsConfig } from '../../types/sheets';

// Type for unified API client interface
type UnifiedApiClient = GoogleSheetsApiClient | BrowserGoogleSheetsApiClient;

export class GoogleSheetsIntegration {
  private apiClient: UnifiedApiClient;
  private eventManager: EventSheetManager;
  private operationsManager: OperationsSheetManager;
  private config: GoogleSheetsConfig | null = null;
  private isInitialized = false;
  private isBrowserEnvironment: boolean;

  constructor() {
    // Detect environment
    this.isBrowserEnvironment = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    // Initialize appropriate API client based on environment
    if (this.isBrowserEnvironment) {
      logger.info('Using browser-compatible Google Sheets client', { module: 'GoogleSheetsIntegration' });
      this.apiClient = new BrowserGoogleSheetsApiClient();
    } else {
      logger.info('Using Node.js Google Sheets client', { module: 'GoogleSheetsIntegration' });
      this.apiClient = new GoogleSheetsApiClient();
    }
    
    this.eventManager = new EventSheetManager(this.apiClient as any);
    this.operationsManager = new OperationsSheetManager(this.apiClient as any);

    logger.debug('Google Sheets integration initialized', { 
      module: 'GoogleSheetsIntegration',
      data: { 
        environment: this.isBrowserEnvironment ? 'browser' : 'node',
        clientType: this.isBrowserEnvironment ? 'BrowserGoogleSheetsApiClient' : 'GoogleSheetsApiClient'
      }
    });
  }

  /**
   * Initialize the Google Sheets integration
   */
  async initialize(config: GoogleSheetsConfig): Promise<void> {
    try {
      logger.info('Initializing Google Sheets integration', { 
        module: 'GoogleSheetsIntegration',
        data: { 
          spreadsheetId: config.spreadsheetId,
          hasServiceAccount: !!config.serviceAccountKey,
          hasApiKey: !!config.apiKey,
          environment: this.isBrowserEnvironment ? 'browser' : 'node'
        }
      });

      // In browser environment, force API key usage and warn about service account
      if (this.isBrowserEnvironment) {
        if (!config.apiKey) {
          throw new Error('API key is required for browser environment. Service account keys cannot be used in browsers for security reasons.');
        }
        
        if (config.serviceAccountKey) {
          logger.warn('Service account key provided in browser environment - this will be ignored for security reasons', {
            module: 'GoogleSheetsIntegration'
          });
        }
      }

      this.config = config;

      // Initialize API client
      await this.apiClient.initialize(config);

      // Set sheet names if provided
      if (config.eventSheetName) {
        this.eventManager = new EventSheetManager(this.apiClient as any, config.eventSheetName);
      }
      
      if (config.operationsSheetName) {
        this.operationsManager = new OperationsSheetManager(this.apiClient as any, config.operationsSheetName);
      }

      // Test connection (only for Node.js client that has testConnection method)
      if (!this.isBrowserEnvironment && 'testConnection' in this.apiClient) {
        const connectionTest = await (this.apiClient as GoogleSheetsApiClient).testConnection();
        if (!connectionTest) {
          throw new Error('Failed to connect to Google Sheets');
        }
      }

      this.isInitialized = true;

      logger.info('Google Sheets integration successfully initialized', { 
        module: 'GoogleSheetsIntegration'
      });

      // Log initialization operation (only if operations manager is available)
      try {
        await this.logOperation({
          operation: 'integration_initialized',
          data: {
            spreadsheetId: config.spreadsheetId,
            eventSheetName: config.eventSheetName || 'Events',
            operationsSheetName: config.operationsSheetName || 'Operations',
            environment: this.isBrowserEnvironment ? 'browser' : 'node'
          },
          status: 'completed'
        });
      } catch (logError) {
        logger.warn('Failed to log initialization operation', {
          module: 'GoogleSheetsIntegration',
          data: { error: logError }
        });
      }

    } catch (error) {
      logger.error('Failed to initialize Google Sheets integration', { 
        module: 'GoogleSheetsIntegration',
        data: { error }
      });

      // Try to log the failed operation
      try {
        await this.logOperation({
          operation: 'integration_initialize_failed',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch {
        // Silent fail on logging if sheet isn't accessible
      }

      throw new Error(`Google Sheets integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if integration is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.apiClient.isReady();
  }

  /**
   * Get the event manager
   */
  getEventManager(): EventSheetManager {
    if (!this.isReady()) {
      throw new Error('Google Sheets integration not initialized');
    }
    return this.eventManager;
  }

  /**
   * Get the operations manager
   */
  getOperationsManager(): OperationsSheetManager {
    if (!this.isReady()) {
      throw new Error('Google Sheets integration not initialized');
    }
    return this.operationsManager;
  }

  /**
   * Get the API client
   */
  getApiClient(): UnifiedApiClient {
    if (!this.isReady()) {
      throw new Error('Google Sheets integration not initialized');
    }
    return this.apiClient;
  }

  /**
   * Validate all sheet structures
   */
  async validateSheets(): Promise<{
    eventSheet: SheetValidationResult;
    operationsSheet: SheetValidationResult;
  }> {
    if (!this.isReady()) {
      throw new Error('Google Sheets integration not initialized');
    }

    logger.info('Validating sheet structures', { 
      module: 'GoogleSheetsIntegration'
    });

    const [eventValidation, operationsValidation] = await Promise.all([
      this.eventManager.validateSheetStructure(),
      this.operationsManager.validateSheetStructure()
    ]);

    const result = {
      eventSheet: eventValidation,
      operationsSheet: operationsValidation
    };

    // Log validation results
    await this.logOperation({
      operation: 'sheets_validated',
      data: {
        eventSheetValid: eventValidation.isValid,
        operationsSheetValid: operationsValidation.isValid,
        errors: {
          eventSheet: eventValidation.errors,
          operationsSheet: operationsValidation.errors
        }
      },
      status: 'completed'
    });

    return result;
  }

  /**
   * Test the connection and functionality
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      const isConnected = await this.apiClient.testConnection();
      
      try {
        await this.logOperation({
          operation: 'connection_test',
          data: { result: isConnected },
          status: isConnected ? 'completed' : 'failed'
        });
      } catch (logError) {
        logger.warn('Failed to log connection test operation', {
          module: 'GoogleSheetsIntegration',
          data: { error: logError }
        });
      }

      return isConnected;
    } catch (error) {
      logger.error('Connection test failed', { 
        module: 'GoogleSheetsIntegration',
        data: { error }
      });
      return false;
    }
  }

  /**
   * Log an operation (convenience method)
   */
  private async logOperation(operation: {
    operation: string;
    data: Record<string, any>;
    status: 'pending' | 'completed' | 'failed';
    eventId?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.operationsManager.logOperation(operation);
      }
    } catch (error) {
      // Silent fail on operation logging to prevent cascading failures
      logger.warn('Failed to log operation', { 
        module: 'GoogleSheetsIntegration',
        data: { operation: operation.operation, error }
      });
    }
  }

  /**
   * Get integration status and health information
   */
  getStatus(): {
    isInitialized: boolean;
    isReady: boolean;
    config: GoogleSheetsConfig | null;
    eventCacheStatus: { isValid: boolean; age: number; eventCount: number };
    operationsCacheStatus: { isValid: boolean; age: number; operationCount: number };
  } {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady(),
      config: this.config,
      eventCacheStatus: this.eventManager.getCacheStatus(),
      operationsCacheStatus: this.operationsManager.getCacheStatus()
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    // Disconnect API client if it has a disconnect method
    if ('disconnect' in this.apiClient) {
      this.apiClient.disconnect();
    } else if ('reset' in this.apiClient) {
      (this.apiClient as BrowserGoogleSheetsApiClient).reset();
    }
    
    this.eventManager.clearCache();
    this.operationsManager.clearCache();
    this.isInitialized = false;
    this.config = null;

    logger.info('Google Sheets integration disconnected', { 
      module: 'GoogleSheetsIntegration'
    });
  }
}
