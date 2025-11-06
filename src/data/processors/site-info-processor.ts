/**
 * Site Info data processor for GOLS OBS Widget
 * Processes Site Info sheet data into structured format for site stream selection
 */

import { logger } from '../../utils/logger.js';
import type { SheetData } from '../../types/sheets';

export interface ProcessedSiteInfo {
  id: string;
  siteName: string;
  streamName: string;
  streamUrl: string;
  description?: string;
  isActive: boolean;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  } | undefined;
  equipment?: string[] | undefined;
  notes?: string;
}

export interface SiteInfoProcessingResult {
  siteInfoList: ProcessedSiteInfo[];
  activeSites: ProcessedSiteInfo[];
  totalSites: number;
  lastProcessed: string;
  validationErrors: string[];
}

/**
 * Site Info sheet column mapping (standard GOLS format)
 */
const SITE_INFO_COLUMNS = {
  SITE_NAME: 0,        // Column A: Site Name
  STREAM_NAME: 1,      // Column B: Stream Name  
  STREAM_URL: 2,       // Column C: Stream URL
  DESCRIPTION: 3,      // Column D: Description
  ACTIVE: 4,          // Column E: Active (TRUE/FALSE)
  LATITUDE: 5,        // Column F: Latitude (optional)
  LONGITUDE: 6,       // Column G: Longitude (optional)
  EQUIPMENT: 7,       // Column H: Equipment List (optional)
  NOTES: 8           // Column I: Notes (optional)
} as const;

/**
 * Processes Site Info sheet data into structured format
 */
export class SiteInfoProcessor {
  private validationErrors: string[] = [];

  /**
   * Process Site Info sheet data
   */
  processSheetData(sheetData: SheetData): SiteInfoProcessingResult {
    this.validationErrors = [];
    const siteInfoList: ProcessedSiteInfo[] = [];

    logger.info('Processing Site Info data', {
      module: 'SiteInfoProcessor',
      data: { 
        rowCount: sheetData.rowCount,
        columnCount: sheetData.columnCount 
      }
    });

    // Process each row
    for (let i = 0; i < sheetData.values.length; i++) {
      const row = sheetData.values[i];
      const rowNumber = i + 2; // Account for header row

      // Skip empty rows
      if (!row || row.length === 0 || !this.hasRequiredData(row)) {
        continue;
      }

      try {
        const siteInfo = this.processRow(row, rowNumber);
        if (siteInfo) {
          siteInfoList.push(siteInfo);
        }
      } catch (error) {
        const errorMsg = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.validationErrors.push(errorMsg);
        logger.warn('Site Info row processing error', {
          module: 'SiteInfoProcessor',
          data: { rowNumber, error: errorMsg }
        });
      }
    }

    // Filter active sites
    const activeSites = siteInfoList.filter(site => site.isActive);

    const result: SiteInfoProcessingResult = {
      siteInfoList,
      activeSites,
      totalSites: siteInfoList.length,
      lastProcessed: new Date().toISOString(),
      validationErrors: this.validationErrors
    };

    logger.info('Site Info processing completed', {
      module: 'SiteInfoProcessor',
      data: {
        totalSites: result.totalSites,
        activeSites: activeSites.length,
        validationErrors: this.validationErrors.length
      }
    });

    return result;
  }

  /**
   * Process a single Site Info row
   */
  private processRow(row: any[], rowNumber: number): ProcessedSiteInfo | null {
    // Extract required fields
    const siteName = this.cleanString(row[SITE_INFO_COLUMNS.SITE_NAME]);
    const streamName = this.cleanString(row[SITE_INFO_COLUMNS.STREAM_NAME]);
    const streamUrl = this.cleanString(row[SITE_INFO_COLUMNS.STREAM_URL]);

    // Validate required fields
    if (!siteName) {
      throw new Error('Site name is required');
    }
    if (!streamName) {
      throw new Error('Stream name is required');
    }

    // Generate unique ID
    const id = this.generateSiteId(siteName, streamName);

    // Parse optional fields
    const description = this.cleanString(row[SITE_INFO_COLUMNS.DESCRIPTION]);
    const isActive = this.parseBoolean(row[SITE_INFO_COLUMNS.ACTIVE]);
    const latitude = this.parseNumber(row[SITE_INFO_COLUMNS.LATITUDE]);
    const longitude = this.parseNumber(row[SITE_INFO_COLUMNS.LONGITUDE]);
    const equipmentText = this.cleanString(row[SITE_INFO_COLUMNS.EQUIPMENT]);
    const notes = this.cleanString(row[SITE_INFO_COLUMNS.NOTES]);

    // Process equipment list
    const equipment = equipmentText ? 
      equipmentText.split(',').map(item => item.trim()).filter(item => item) : 
      undefined;

    // Build coordinates object if available
    const coordinates = (latitude !== undefined && longitude !== undefined) ? 
      { latitude, longitude } : 
      undefined;

    // Validate stream URL format if provided
    if (streamUrl && !this.isValidUrl(streamUrl)) {
      logger.warn('Invalid stream URL format', {
        module: 'SiteInfoProcessor',
        data: { rowNumber, streamUrl }
      });
    }

    const siteInfo: ProcessedSiteInfo = {
      id,
      siteName,
      streamName,
      streamUrl,
      description,
      isActive,
      coordinates,
      equipment,
      notes
    };

    logger.debug('Site Info row processed', {
      module: 'SiteInfoProcessor',
      data: { 
        rowNumber, 
        id: siteInfo.id, 
        siteName: siteInfo.siteName,
        isActive: siteInfo.isActive
      }
    });

    return siteInfo;
  }

  /**
   * Check if row has required data
   */
  private hasRequiredData(row: any[]): boolean {
    return !!(row[SITE_INFO_COLUMNS.SITE_NAME] && 
             row[SITE_INFO_COLUMNS.STREAM_NAME]);
  }

  /**
   * Generate unique site ID from name and stream
   */
  private generateSiteId(siteName: string, streamName: string): string {
    const cleanSite = siteName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanStream = streamName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${cleanSite}_${cleanStream}`;
  }

  /**
   * Clean and normalize string values
   */
  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Parse boolean values from various formats
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    
    const str = String(value).toLowerCase().trim();
    return str === 'true' || 
           str === 'yes' || 
           str === '1' || 
           str === 'active' ||
           str === 'on';
  }

  /**
   * Parse numeric values safely
   */
  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(result: SiteInfoProcessingResult): {
    totalSites: number;
    activeSites: number;
    inactiveSites: number;
    sitesWithCoordinates: number;
    sitesWithEquipment: number;
    errorRate: number;
  } {
    const sitesWithCoordinates = result.siteInfoList.filter(
      site => site.coordinates?.latitude !== undefined && site.coordinates?.longitude !== undefined
    ).length;

    const sitesWithEquipment = result.siteInfoList.filter(
      site => site.equipment && site.equipment.length > 0
    ).length;

    const inactiveSites = result.totalSites - result.activeSites.length;
    const errorRate = result.validationErrors.length / (result.totalSites + result.validationErrors.length);

    return {
      totalSites: result.totalSites,
      activeSites: result.activeSites.length,
      inactiveSites,
      sitesWithCoordinates,
      sitesWithEquipment,
      errorRate
    };
  }

  /**
   * Filter sites by criteria
   */
  filterSites(
    sites: ProcessedSiteInfo[], 
    criteria: {
      activeOnly?: boolean;
      hasEquipment?: boolean;
      hasCoordinates?: boolean;
      nameContains?: string;
    }
  ): ProcessedSiteInfo[] {
    return sites.filter(site => {
      if (criteria.activeOnly && !site.isActive) return false;
      if (criteria.hasEquipment && (!site.equipment || site.equipment.length === 0)) return false;
      if (criteria.hasCoordinates && !site.coordinates) return false;
      if (criteria.nameContains) {
        const searchTerm = criteria.nameContains.toLowerCase();
        const matchesName = site.siteName.toLowerCase().includes(searchTerm);
        const matchesStream = site.streamName.toLowerCase().includes(searchTerm);
        if (!matchesName && !matchesStream) return false;
      }
      return true;
    });
  }

  /**
   * Sort sites by various criteria
   */
  sortSites(
    sites: ProcessedSiteInfo[], 
    sortBy: 'siteName' | 'streamName' | 'isActive',
    ascending = true
  ): ProcessedSiteInfo[] {
    const sorted = [...sites].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'siteName':
          comparison = a.siteName.localeCompare(b.siteName);
          break;
        case 'streamName':
          comparison = a.streamName.localeCompare(b.streamName);
          break;
        case 'isActive':
          comparison = (a.isActive === b.isActive) ? 0 : (a.isActive ? -1 : 1);
          break;
      }

      return ascending ? comparison : -comparison;
    });

    return sorted;
  }
}
