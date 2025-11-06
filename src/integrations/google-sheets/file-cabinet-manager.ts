/**
 * File Cabinet Manager for GOLS OBS Widget
 * Manages event listing and selection from the File Cabinet sheet
 * Uses production Google Sheets API client with embedded credentials
 */

import { logger } from '../../utils/logger.js';
import { ProductionGoogleSheetsClient } from './production-api-client.js';
import { PRODUCTION_SHEETS_CONFIG } from '../../utils/production-credentials.js';
import type { SheetData } from '../../types/sheets';

export interface EventListItem {
  id: string;
  name: string;
  date: string;
  location: string;
  opsSheetId: string;
  status: 'upcoming' | 'live' | 'completed';
  lastUpdated: string;
}

export interface FileCabinetData {
  events: EventListItem[];
  lastRefresh: string;
  totalEvents: number;
}

/**
 * File Cabinet sheet structure mapping
 * Based on standard GOLS File Cabinet format
 */
const FILE_CABINET_COLUMNS = {
  EVENT_NAME: 0,           // Column A: Event Name
  DATE: 1,                 // Column B: Date
  LOCATION: 2,             // Column C: Location
  OPS_SHEET_URL: 3,        // Column D: OPS Sheet URL
  STATUS: 4,               // Column E: Status
  NOTES: 5,                // Column F: Notes
  LAST_UPDATED: 6          // Column G: Last Updated
} as const;

/**
 * Manages File Cabinet operations with production Google Sheets integration
 */
export class FileCabinetManager {
  private client: ProductionGoogleSheetsClient;
  private cachedData: FileCabinetData | null = null;
  private lastFetchTime = 0;
  private readonly cacheExpiryMs = 60000; // 1 minute cache

  constructor() {
    this.client = new ProductionGoogleSheetsClient();
    logger.info('File Cabinet Manager initialized', {
      module: 'FileCabinetManager'
    });
  }

  /**
   * Initialize the File Cabinet manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing File Cabinet Manager', {
        module: 'FileCabinetManager'
      });

      await this.client.initialize();

      logger.info('File Cabinet Manager ready', {
        module: 'FileCabinetManager'
      });
    } catch (error) {
      logger.error('Failed to initialize File Cabinet Manager', {
        module: 'FileCabinetManager',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Get health status of the File Cabinet manager
   */
  getHealthStatus(): {
    isReady: boolean;
    clientHealth: any;
    cacheStatus: string;
    lastFetch: string;
  } {
    return {
      isReady: this.client.isReady(),
      clientHealth: this.client.getHealthStatus(),
      cacheStatus: this.cachedData ? 'populated' : 'empty',
      lastFetch: this.lastFetchTime ? new Date(this.lastFetchTime).toISOString() : 'never'
    };
  }

  /**
   * Fetch all events from the File Cabinet sheet
   * Uses caching to reduce API calls
   */
  async getEvents(forceRefresh = false): Promise<FileCabinetData> {
    const now = Date.now();
    
    // Return cached data if available and fresh
    if (!forceRefresh && 
        this.cachedData && 
        (now - this.lastFetchTime) < this.cacheExpiryMs) {
      logger.debug('Returning cached File Cabinet data', {
        module: 'FileCabinetManager',
        data: { eventCount: this.cachedData.events.length }
      });
      return this.cachedData;
    }

    try {
      logger.info('Fetching File Cabinet events', {
        module: 'FileCabinetManager',
        data: { forceRefresh }
      });

      // Read the File Cabinet sheet
      const sheetData = await this.client.readSheetData(
        PRODUCTION_SHEETS_CONFIG.FILE_CABINET_SHEET_NAME,
        'A2:G1000' // Skip header row, read up to 1000 events
      );

      // Process the raw sheet data
      const events = this.processSheetData(sheetData);

      // Update cache
      this.cachedData = {
        events,
        lastRefresh: new Date().toISOString(),
        totalEvents: events.length
      };
      this.lastFetchTime = now;

      logger.info('File Cabinet events fetched successfully', {
        module: 'FileCabinetManager',
        data: { 
          eventCount: events.length,
          cacheUpdated: true
        }
      });

      return this.cachedData;
    } catch (error) {
      logger.error('Failed to fetch File Cabinet events', {
        module: 'FileCabinetManager',
        data: { error }
      });

      // Return cached data if available, even if stale
      if (this.cachedData) {
        logger.warn('Returning stale cached data due to fetch failure', {
          module: 'FileCabinetManager'
        });
        return this.cachedData;
      }

      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<EventListItem | null> {
    const data = await this.getEvents();
    return data.events.find(event => event.id === eventId) || null;
  }

  /**
   * Get events filtered by status
   */
  async getEventsByStatus(status: EventListItem['status']): Promise<EventListItem[]> {
    const data = await this.getEvents();
    return data.events.filter(event => event.status === status);
  }

  /**
   * Search events by name or location
   */
  async searchEvents(query: string): Promise<EventListItem[]> {
    const data = await this.getEvents();
    const lowercaseQuery = query.toLowerCase();
    
    return data.events.filter(event => 
      event.name.toLowerCase().includes(lowercaseQuery) ||
      event.location.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Extract OPS sheet ID from URL
   */
  extractOpsSheetId(url: string): string {
    if (!url) return '';
    
    // Handle different Google Sheets URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/, // Standard format
      /\/d\/([a-zA-Z0-9-_]+)\/edit/,         // Short format
      /\/([a-zA-Z0-9-_]+)$/                  // ID only
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    logger.warn('Could not extract OPS sheet ID from URL', {
      module: 'FileCabinetManager',
      data: { url }
    });

    return '';
  }

  /**
   * Process raw sheet data into structured events
   */
  private processSheetData(sheetData: SheetData): EventListItem[] {
    const events: EventListItem[] = [];

    logger.debug('Processing File Cabinet sheet data', {
      module: 'FileCabinetManager',
      data: { 
        rowCount: sheetData.rowCount,
        columnCount: sheetData.columnCount
      }
    });

    for (let i = 0; i < sheetData.values.length; i++) {
      const row = sheetData.values[i];
      
      // Skip empty rows or rows without essential data
      if (!row || row.length === 0 || !row[FILE_CABINET_COLUMNS.EVENT_NAME]) {
        continue;
      }

      try {
        // Generate ID from event name and date
        const eventName = this.cleanString(row[FILE_CABINET_COLUMNS.EVENT_NAME]);
        const eventDate = this.cleanString(row[FILE_CABINET_COLUMNS.DATE]);
        const eventId = this.generateEventId(eventName, eventDate);

        // Extract OPS sheet ID from URL
        const opsSheetUrl = this.cleanString(row[FILE_CABINET_COLUMNS.OPS_SHEET_URL]);
        const opsSheetId = this.extractOpsSheetId(opsSheetUrl);

        // Determine status
        const statusText = this.cleanString(row[FILE_CABINET_COLUMNS.STATUS]);
        const status = this.parseEventStatus(statusText);

        const event: EventListItem = {
          id: eventId,
          name: eventName,
          date: eventDate,
          location: this.cleanString(row[FILE_CABINET_COLUMNS.LOCATION]),
          opsSheetId,
          status,
          lastUpdated: this.cleanString(row[FILE_CABINET_COLUMNS.LAST_UPDATED]) || new Date().toISOString()
        };

        // Validate essential fields
        if (event.name && event.date) {
          events.push(event);
        } else {
          logger.warn('Skipping invalid event row', {
            module: 'FileCabinetManager',
            data: { rowIndex: i + 2, eventName: event.name, eventDate: event.date }
          });
        }
      } catch (error) {
        logger.warn('Error processing event row', {
          module: 'FileCabinetManager',
          data: { rowIndex: i + 2, error }
        });
      }
    }

    // Sort events by date (most recent first)
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    logger.debug('File Cabinet events processed', {
      module: 'FileCabinetManager',
      data: { 
        totalEvents: events.length,
        statusBreakdown: this.getStatusBreakdown(events)
      }
    });

    return events;
  }

  /**
   * Generate a unique event ID from name and date
   */
  private generateEventId(name: string, date: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanDate = date.replace(/[^0-9]/g, '');
    return `${cleanName}_${cleanDate}`;
  }

  /**
   * Parse event status from text
   */
  private parseEventStatus(statusText: string): EventListItem['status'] {
    const normalized = statusText.toLowerCase().trim();
    
    if (normalized.includes('live') || normalized.includes('active')) {
      return 'live';
    } else if (normalized.includes('completed') || normalized.includes('finished')) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  }

  /**
   * Clean and normalize string values from sheets
   */
  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Get status breakdown for logging
   */
  private getStatusBreakdown(events: EventListItem[]): Record<string, number> {
    return events.reduce((breakdown, event) => {
      breakdown[event.status] = (breakdown[event.status] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }

  /**
   * Force refresh cached data
   */
  async refreshCache(): Promise<FileCabinetData> {
    return this.getEvents(true);
  }

  /**
   * Check if cache is expired
   */
  isCacheExpired(): boolean {
    return (Date.now() - this.lastFetchTime) >= this.cacheExpiryMs;
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.lastFetchTime = 0;
    logger.debug('File Cabinet cache cleared', {
      module: 'FileCabinetManager'
    });
  }
}
