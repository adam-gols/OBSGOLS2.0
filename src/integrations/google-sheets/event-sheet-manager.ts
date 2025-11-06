import { logger } from '../../utils/logger.js';
import { GOOGLE_SHEETS_CONFIG } from '../../utils/constants.js';
import { validateEventData } from '../../utils/validation.js';
import type { GoogleSheetsApiClient } from './api-client.js';
import type { 
  EventData, 
  EventSheetSchema, 
  SheetValidationResult
} from '../../types/sheets';

/**
 * Manages event data from Google Sheets
 * Handles event sheet operations, validation, and data transformation
 */
export class EventSheetManager {
  private apiClient: GoogleSheetsApiClient;
  private sheetName: string;
  private columnMapping: EventSheetSchema;
  private lastFetchTime: Date | null = null;
  private cachedEvents: EventData[] = [];

  constructor(apiClient: GoogleSheetsApiClient, sheetName: string = 'Events') {
    this.apiClient = apiClient;
    this.sheetName = sheetName;
    this.columnMapping = GOOGLE_SHEETS_CONFIG.DEFAULT_EVENT_SCHEMA;
    
    logger.debug('Initialized event sheet manager', { 
      module: 'EventSheetManager',
      data: { sheetName: this.sheetName }
    });
  }

  /**
   * Set custom column mapping for the event sheet
   */
  setColumnMapping(mapping: EventSheetSchema): void {
    this.columnMapping = mapping;
    logger.info('Updated column mapping', { 
      module: 'EventSheetManager',
      data: { mapping }
    });
  }

  /**
   * Validate the event sheet structure
   */
  async validateSheetStructure(): Promise<SheetValidationResult> {
    try {
      logger.debug('Validating sheet structure', { 
        module: 'EventSheetManager',
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
        const columnIndex = this.columnMapping[column as keyof EventSheetSchema];
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
        module: 'EventSheetManager',
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
        module: 'EventSheetManager',
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
   * Fetch all events from the sheet
   */
  async fetchEvents(forceRefresh: boolean = false): Promise<EventData[]> {
    try {
      // Check if we need to refresh
      if (!forceRefresh && this.lastFetchTime && this.cachedEvents.length > 0) {
        const timeSinceLastFetch = Date.now() - this.lastFetchTime.getTime();
        if (timeSinceLastFetch < GOOGLE_SHEETS_CONFIG.CACHE_DURATION_MS) {
          logger.debug('Returning cached events', { 
            module: 'EventSheetManager',
            data: {
              eventCount: this.cachedEvents.length,
              cacheAge: timeSinceLastFetch
            }
          });
          return this.cachedEvents;
        }
      }

      logger.info('Fetching events from sheet', { 
        module: 'EventSheetManager',
        data: {
          sheetName: this.sheetName,
          forceRefresh
        }
      });

      // Fetch all data (skip header row)
      const sheetData = await this.apiClient.getSheetData(this.sheetName, '2:1000');
      
      if (sheetData.values.length === 0) {
        logger.warn('No event data found in sheet', { 
          module: 'EventSheetManager'
        });
        this.cachedEvents = [];
        this.lastFetchTime = new Date();
        return [];
      }

      // Transform sheet data to event objects
      const events: EventData[] = [];
      
      for (let i = 0; i < sheetData.values.length; i++) {
        const row = sheetData.values[i];
        
        // Skip empty rows
        if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
          continue;
        }

        try {
          const event = this.transformRowToEvent(row, i + 2); // +2 because we skipped header and 0-indexed
          if (event) {
            events.push(event);
          }
        } catch (error) {
          logger.warn('Failed to parse event row', { 
            module: 'EventSheetManager',
            data: {
              rowIndex: i + 2,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }

      // Sort events by date and time
      events.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });

      this.cachedEvents = events;
      this.lastFetchTime = new Date();

      logger.info('Successfully fetched and processed events', { 
        module: 'EventSheetManager',
        data: {
          eventCount: events.length,
          sheetName: this.sheetName
        }
      });

      return events;
    } catch (error) {
      logger.error('Failed to fetch events', { 
        module: 'EventSheetManager',
        data: { error }
      });
      throw new Error(`Failed to fetch events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform a sheet row to an EventData object
   */
  private transformRowToEvent(row: any[], rowIndex: number): EventData | null {
    try {
      const getValue = (columnKey: keyof EventSheetSchema): any => {
        const columnIndex = this.columnMapping[columnKey];
        return row[columnIndex] || '';
      };

      const event: EventData = {
        id: getValue('id')?.toString() || `row_${rowIndex}`,
        name: getValue('name')?.toString() || '',
        date: getValue('date')?.toString() || '',
        time: getValue('time')?.toString() || '',
        location: getValue('location')?.toString() || '',
        homeTeam: getValue('homeTeam')?.toString() || '',
        awayTeam: getValue('awayTeam')?.toString() || '',
        homeScore: this.parseScore(getValue('homeScore')),
        awayScore: this.parseScore(getValue('awayScore')),
        status: this.parseStatus(getValue('status')),
        streamUrl: getValue('streamUrl')?.toString() || undefined,
        notes: getValue('notes')?.toString() || undefined,
        lastUpdated: getValue('lastUpdated')?.toString() || new Date().toISOString()
      };

      // Validate the event data
      const validation = validateEventData(event);
      if (!validation.isValid) {
        logger.warn('Event validation failed', { 
          module: 'EventSheetManager',
          data: {
            rowIndex,
            errors: validation.errors,
            eventId: event.id
          }
        });
        return null;
      }

      return event;
    } catch (error) {
      logger.error('Failed to transform row to event', { 
        module: 'EventSheetManager',
        data: { rowIndex, error }
      });
      return null;
    }
  }

  /**
   * Parse score value from sheet
   */
  private parseScore(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    
    const parsed = parseInt(value.toString(), 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse status value from sheet
   */
  private parseStatus(value: any): EventData['status'] {
    if (!value) return 'upcoming';
    
    const status = value.toString().toLowerCase().trim();
    switch (status) {
      case 'live':
      case 'in progress':
      case 'active':
        return 'live';
      case 'completed':
      case 'finished':
      case 'final':
        return 'completed';
      case 'cancelled':
      case 'canceled':
      case 'postponed':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  }

  /**
   * Update an event in the sheet
   */
  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<void> {
    try {
      logger.info('Updating event', { 
        module: 'EventSheetManager',
        data: { eventId, updates }
      });

      // First, find the event row
      const events = await this.fetchEvents(true);
      const eventIndex = events.findIndex(event => event.id === eventId);
      
      if (eventIndex === -1) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      const rowIndex = eventIndex + 2; // +2 for header row and 0-indexing
      const currentEvent = events[eventIndex]!; // We know it exists from the check above
      const updatedEvent: EventData = {
        id: currentEvent.id,
        name: updates.name ?? currentEvent.name,
        date: updates.date ?? currentEvent.date,
        time: updates.time ?? currentEvent.time,
        location: updates.location ?? currentEvent.location,
        homeTeam: updates.homeTeam ?? currentEvent.homeTeam,
        awayTeam: updates.awayTeam ?? currentEvent.awayTeam,
        homeScore: updates.homeScore !== undefined ? updates.homeScore : currentEvent.homeScore,
        awayScore: updates.awayScore !== undefined ? updates.awayScore : currentEvent.awayScore,
        status: updates.status ?? currentEvent.status,
        streamUrl: updates.streamUrl !== undefined ? updates.streamUrl : currentEvent.streamUrl,
        notes: updates.notes !== undefined ? updates.notes : currentEvent.notes,
        lastUpdated: new Date().toISOString()
      };

      // Validate updated event
      const validation = validateEventData(updatedEvent);
      if (!validation.isValid) {
        throw new Error(`Invalid event data: ${validation.errors.join(', ')}`);
      }

      // Transform event back to row format
      const updatedRow = this.transformEventToRow(updatedEvent);
      
      // Update the specific row in the sheet
      const range = `${rowIndex}:${rowIndex}`;
      await this.apiClient.updateSheetData(this.sheetName, range, [updatedRow]);

      // Update cached data
      this.cachedEvents[eventIndex] = updatedEvent;

      logger.info('Successfully updated event', { 
        module: 'EventSheetManager',
        data: { eventId, rowIndex }
      });
    } catch (error) {
      logger.error('Failed to update event', { 
        module: 'EventSheetManager',
        data: { eventId, error }
      });
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform an EventData object back to a sheet row
   */
  private transformEventToRow(event: EventData): any[] {
    const row: any[] = [];
    const maxColumn = Math.max(...Object.values(this.columnMapping));
    
    // Initialize row with empty values
    for (let i = 0; i <= maxColumn; i++) {
      row[i] = '';
    }

    // Set values based on column mapping
    row[this.columnMapping.id] = event.id;
    row[this.columnMapping.name] = event.name;
    row[this.columnMapping.date] = event.date;
    row[this.columnMapping.time] = event.time;
    row[this.columnMapping.location] = event.location;
    row[this.columnMapping.homeTeam] = event.homeTeam;
    row[this.columnMapping.awayTeam] = event.awayTeam;
    row[this.columnMapping.homeScore] = event.homeScore ?? '';
    row[this.columnMapping.awayScore] = event.awayScore ?? '';
    row[this.columnMapping.status] = event.status;
    row[this.columnMapping.streamUrl] = event.streamUrl ?? '';
    row[this.columnMapping.notes] = event.notes ?? '';
    row[this.columnMapping.lastUpdated] = event.lastUpdated;

    return row;
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId: string): Promise<EventData | null> {
    const events = await this.fetchEvents();
    return events.find(event => event.id === eventId) || null;
  }

  /**
   * Get events by status
   */
  async getEventsByStatus(status: EventData['status']): Promise<EventData[]> {
    const events = await this.fetchEvents();
    return events.filter(event => event.status === status);
  }

  /**
   * Clear cached events
   */
  clearCache(): void {
    this.cachedEvents = [];
    this.lastFetchTime = null;
    logger.debug('Cleared event cache', { module: 'EventSheetManager' });
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { isValid: boolean; age: number; eventCount: number } {
    const isValid = this.lastFetchTime !== null && this.cachedEvents.length > 0;
    const age = this.lastFetchTime ? Date.now() - this.lastFetchTime.getTime() : 0;
    
    return {
      isValid,
      age,
      eventCount: this.cachedEvents.length
    };
  }
}
