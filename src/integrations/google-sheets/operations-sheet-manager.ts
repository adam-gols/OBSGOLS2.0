import { logger } from '../../utils/logger.js';
import { GOOGLE_SHEETS_CONFIG } from '../../utils/constants.js';
import { validateOperationData } from '../../utils/validation.js';
import type { GoogleSheetsApiClient } from './api-client.js';
import type { 
  OperationData, 
  OperationsSheetSchema, 
  SheetValidationResult
} from '../../types/sheets';

/**
 * Manages operation logs in Google Sheets
 * Handles operation tracking, audit trails, and status monitoring
 */
export class OperationsSheetManager {
  private apiClient: GoogleSheetsApiClient;
  private sheetName: string;
  private columnMapping: OperationsSheetSchema;
  private lastFetchTime: Date | null = null;
  private cachedOperations: OperationData[] = [];

  constructor(apiClient: GoogleSheetsApiClient, sheetName: string = 'Operations') {
    this.apiClient = apiClient;
    this.sheetName = sheetName;
    this.columnMapping = GOOGLE_SHEETS_CONFIG.DEFAULT_OPERATIONS_SCHEMA;
    
    logger.debug('Initialized operations sheet manager', { 
      module: 'OperationsSheetManager',
      data: { sheetName: this.sheetName }
    });
  }

  /**
   * Set custom column mapping for the operations sheet
   */
  setColumnMapping(mapping: OperationsSheetSchema): void {
    this.columnMapping = mapping;
    logger.info('Updated column mapping', { 
      module: 'OperationsSheetManager',
      data: { mapping }
    });
  }

  /**
   * Validate the operations sheet structure
   */
  async validateSheetStructure(): Promise<SheetValidationResult> {
    try {
      logger.debug('Validating sheet structure', { 
        module: 'OperationsSheetManager',
        data: { sheetName: this.sheetName }
      });

      // Get the header row
      const headerData = await this.apiClient.getSheetData(this.sheetName, '1:1');
      
      if (headerData.values.length === 0) {
        return {
          isValid: false,
          errors: ['Sheet is empty'],
          warnings: [],
          missingColumns: [],
          extraColumns: []
        };
      }

      const headers = headerData.values[0] || [];
      const requiredColumns = Object.keys(this.columnMapping);
      const missingColumns: string[] = [];
      const extraColumns: string[] = [];
      const warnings: string[] = [];

      // Check for required columns
      for (const column of requiredColumns) {
        const columnIndex = this.columnMapping[column as keyof OperationsSheetSchema];
        if (columnIndex >= headers.length || !headers[columnIndex]) {
          missingColumns.push(column);
        }
      }

      // Check for extra columns
      headers.forEach((header: string, index: number) => {
        const isKnownColumn = Object.values(this.columnMapping).includes(index);
        if (!isKnownColumn && header && header.trim() !== '') {
          extraColumns.push(header);
        }
      });

      // Generate warnings for potential issues
      if (extraColumns.length > 0) {
        warnings.push(`Found ${extraColumns.length} unrecognized columns`);
      }

      const isValid = missingColumns.length === 0;

      const result: SheetValidationResult = {
        isValid,
        errors: missingColumns.length > 0 ? [`Missing required columns: ${missingColumns.join(', ')}`] : [],
        warnings,
        missingColumns,
        extraColumns
      };

      logger.info('Sheet validation completed', { 
        module: 'OperationsSheetManager',
        data: {
          sheetName: this.sheetName,
          isValid,
          missingColumns: missingColumns.length,
          extraColumns: extraColumns.length
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate sheet structure', { 
        module: 'OperationsSheetManager',
        data: { error }
      });
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        missingColumns: [],
        extraColumns: []
      };
    }
  }

  /**
   * Log a new operation to the sheet
   */
  async logOperation(operation: Omit<OperationData, 'id' | 'timestamp'>): Promise<string> {
    try {
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      const operationData: OperationData = {
        id: operationId,
        timestamp,
        ...operation
      };

      logger.info('Logging operation', { 
        module: 'OperationsSheetManager',
        data: { operationId, operation: operationData.operation }
      });

      // Validate operation data
      const validation = validateOperationData(operationData);
      if (!validation.isValid) {
        throw new Error(`Invalid operation data: ${validation.errors.join(', ')}`);
      }

      // Transform operation to row format
      const row = this.transformOperationToRow(operationData);
      
      // Append to the sheet
      await this.apiClient.appendSheetData(this.sheetName, [row]);

      // Add to cache
      this.cachedOperations.push(operationData);

      logger.info('Successfully logged operation', { 
        module: 'OperationsSheetManager',
        data: { operationId }
      });

      return operationId;
    } catch (error) {
      logger.error('Failed to log operation', { 
        module: 'OperationsSheetManager',
        data: { error, operation }
      });
      throw new Error(`Failed to log operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an operation status
   */
  async updateOperationStatus(operationId: string, status: OperationData['status'], errorMessage?: string): Promise<void> {
    try {
      logger.info('Updating operation status', { 
        module: 'OperationsSheetManager',
        data: { operationId, status, errorMessage }
      });

      // Fetch current operations to find the row
      const operations = await this.fetchOperations(true);
      const operationIndex = operations.findIndex(op => op.id === operationId);
      
      if (operationIndex === -1) {
        throw new Error(`Operation with ID ${operationId} not found`);
      }

      const rowIndex = operationIndex + 2; // +2 for header row and 0-indexing
      const currentOperation = operations[operationIndex]!;
      const updatedOperation: OperationData = {
        ...currentOperation,
        status,
        errorMessage: errorMessage !== undefined ? errorMessage : currentOperation.errorMessage
      };

      // Validate updated operation
      const validation = validateOperationData(updatedOperation);
      if (!validation.isValid) {
        throw new Error(`Invalid operation data: ${validation.errors.join(', ')}`);
      }

      // Transform operation back to row format
      const updatedRow = this.transformOperationToRow(updatedOperation);
      
      // Update the specific row in the sheet
      const range = `${rowIndex}:${rowIndex}`;
      await this.apiClient.updateSheetData(this.sheetName, range, [updatedRow]);

      // Update cached data
      this.cachedOperations[operationIndex] = updatedOperation;

      logger.info('Successfully updated operation status', { 
        module: 'OperationsSheetManager',
        data: { operationId, status }
      });
    } catch (error) {
      logger.error('Failed to update operation status', { 
        module: 'OperationsSheetManager',
        data: { operationId, error }
      });
      throw new Error(`Failed to update operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch operations from the sheet
   */
  async fetchOperations(forceRefresh: boolean = false): Promise<OperationData[]> {
    try {
      // Check if we need to refresh
      if (!forceRefresh && this.lastFetchTime && this.cachedOperations.length > 0) {
        const timeSinceLastFetch = Date.now() - this.lastFetchTime.getTime();
        if (timeSinceLastFetch < GOOGLE_SHEETS_CONFIG.CACHE_DURATION_MS) {
          logger.debug('Returning cached operations', { 
            module: 'OperationsSheetManager',
            data: {
              operationCount: this.cachedOperations.length,
              cacheAge: timeSinceLastFetch
            }
          });
          return this.cachedOperations;
        }
      }

      logger.info('Fetching operations from sheet', { 
        module: 'OperationsSheetManager',
        data: {
          sheetName: this.sheetName,
          forceRefresh
        }
      });

      // Fetch all data (skip header row)
      const sheetData = await this.apiClient.getSheetData(this.sheetName, '2:1000');
      
      if (sheetData.values.length === 0) {
        logger.warn('No operation data found in sheet', { 
          module: 'OperationsSheetManager'
        });
        this.cachedOperations = [];
        this.lastFetchTime = new Date();
        return [];
      }

      // Transform sheet data to operation objects
      const operations: OperationData[] = [];
      
      for (let i = 0; i < sheetData.values.length; i++) {
        const row = sheetData.values[i];
        
        // Skip empty rows
        if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
          continue;
        }

        try {
          const operation = this.transformRowToOperation(row, i + 2);
          if (operation) {
            operations.push(operation);
          }
        } catch (error) {
          logger.warn('Failed to parse operation row', { 
            module: 'OperationsSheetManager',
            data: {
              rowIndex: i + 2,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }

      // Sort operations by timestamp (newest first)
      operations.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      this.cachedOperations = operations;
      this.lastFetchTime = new Date();

      logger.info('Successfully fetched and processed operations', { 
        module: 'OperationsSheetManager',
        data: {
          operationCount: operations.length,
          sheetName: this.sheetName
        }
      });

      return operations;
    } catch (error) {
      logger.error('Failed to fetch operations', { 
        module: 'OperationsSheetManager',
        data: { error }
      });
      throw new Error(`Failed to fetch operations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform a sheet row to an OperationData object
   */
  private transformRowToOperation(row: any[], rowIndex: number): OperationData | null {
    try {
      const getValue = (columnKey: keyof OperationsSheetSchema): any => {
        const columnIndex = this.columnMapping[columnKey];
        return row[columnIndex] || '';
      };

      const operation: OperationData = {
        id: getValue('id')?.toString() || `row_${rowIndex}`,
        timestamp: getValue('timestamp')?.toString() || new Date().toISOString(),
        operation: getValue('operation')?.toString() || '',
        eventId: getValue('eventId')?.toString() || undefined,
        data: this.parseData(getValue('data')),
        status: this.parseStatus(getValue('status')),
        errorMessage: getValue('errorMessage')?.toString() || undefined
      };

      // Validate the operation data
      const validation = validateOperationData(operation);
      if (!validation.isValid) {
        logger.warn('Operation validation failed', { 
          module: 'OperationsSheetManager',
          data: {
            rowIndex,
            errors: validation.errors,
            operationId: operation.id
          }
        });
        return null;
      }

      return operation;
    } catch (error) {
      logger.error('Failed to transform row to operation', { 
        module: 'OperationsSheetManager',
        data: { rowIndex, error }
      });
      return null;
    }
  }

  /**
   * Transform an OperationData object back to a sheet row
   */
  private transformOperationToRow(operation: OperationData): any[] {
    const row: any[] = [];
    const maxColumn = Math.max(...Object.values(this.columnMapping));
    
    // Initialize row with empty values
    for (let i = 0; i <= maxColumn; i++) {
      row[i] = '';
    }

    // Set values based on column mapping
    row[this.columnMapping.id] = operation.id;
    row[this.columnMapping.timestamp] = operation.timestamp;
    row[this.columnMapping.operation] = operation.operation;
    row[this.columnMapping.eventId] = operation.eventId || '';
    row[this.columnMapping.data] = JSON.stringify(operation.data);
    row[this.columnMapping.status] = operation.status;
    row[this.columnMapping.errorMessage] = operation.errorMessage || '';

    return row;
  }

  /**
   * Parse data value from sheet
   */
  private parseData(value: any): Record<string, any> {
    if (!value || value.toString().trim() === '') {
      return {};
    }
    
    try {
      return JSON.parse(value.toString());
    } catch {
      // If JSON parsing fails, return as simple key-value
      return { raw: value.toString() };
    }
  }

  /**
   * Parse status value from sheet
   */
  private parseStatus(value: any): OperationData['status'] {
    if (!value) return 'pending';
    
    const status = value.toString().toLowerCase().trim();
    switch (status) {
      case 'completed':
      case 'success':
      case 'done':
        return 'completed';
      case 'failed':
      case 'error':
      case 'failure':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get operations by status
   */
  async getOperationsByStatus(status: OperationData['status']): Promise<OperationData[]> {
    const operations = await this.fetchOperations();
    return operations.filter(op => op.status === status);
  }

  /**
   * Get operations by event ID
   */
  async getOperationsByEvent(eventId: string): Promise<OperationData[]> {
    const operations = await this.fetchOperations();
    return operations.filter(op => op.eventId === eventId);
  }

  /**
   * Get recent operations (last N operations)
   */
  async getRecentOperations(limit: number = 50): Promise<OperationData[]> {
    const operations = await this.fetchOperations();
    return operations.slice(0, limit);
  }

  /**
   * Clear cached operations
   */
  clearCache(): void {
    this.cachedOperations = [];
    this.lastFetchTime = null;
    logger.debug('Cleared operations cache', { module: 'OperationsSheetManager' });
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { isValid: boolean; age: number; operationCount: number } {
    const isValid = this.lastFetchTime !== null && this.cachedOperations.length >= 0;
    const age = this.lastFetchTime ? Date.now() - this.lastFetchTime.getTime() : 0;
    
    return {
      isValid,
      age,
      operationCount: this.cachedOperations.length
    };
  }
}
