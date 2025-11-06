/**
 * Operations Sheet Manager for GOLS OBS Widget
 * Manages operations sheet data including Site Info and Master Schedule
 * Provides write-back capabilities for game data updates
 */

import { logger } from '../../utils/logger.js';
import { ProductionGoogleSheetsClient } from './production-api-client.js';
import type { SheetData, SheetRange } from '../../types/sheets';

export interface SiteInfo {
  siteName: string;
  streamName: string;
  streamUrl: string;
  description?: string;
  isActive: boolean;
}

export interface GameData {
  id: string;
  scheduledTime: string;
  homeTeam: string;
  awayTeam: string;
  location: string;
  field?: string;
  division?: string;
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  actualStartTime?: string;
  notes?: string;
  lastUpdated: string;
}

export interface OperationsData {
  siteInfo: SiteInfo[];
  games: GameData[];
  selectedSiteStream: string | null;
  lastUpdated: string;
}

/**
 * Standard OPS sheet structure
 */
const OPS_SHEET_TABS = {
  SITE_INFO: 'Site Info',
  MASTER_SCHEDULE: 'Master Schedule'
} as const;

const SITE_INFO_COLUMNS = {
  SITE_NAME: 0,      // Column A
  STREAM_NAME: 1,    // Column B
  STREAM_URL: 2,     // Column C
  DESCRIPTION: 3,    // Column D
  ACTIVE: 4          // Column E
} as const;

const MASTER_SCHEDULE_COLUMNS = {
  GAME_ID: 0,           // Column A
  SCHEDULED_TIME: 1,    // Column B
  HOME_TEAM: 2,         // Column C
  AWAY_TEAM: 3,         // Column D
  LOCATION: 4,          // Column E
  FIELD: 5,             // Column F
  DIVISION: 6,          // Column G
  HOME_SCORE: 7,        // Column H
  AWAY_SCORE: 8,        // Column I
  STATUS: 9,            // Column J
  ACTUAL_START_TIME: 10, // Column K
  NOTES: 11,            // Column L
  LAST_UPDATED: 12      // Column M
} as const;

/**
 * Manages operations sheet data and write-back functionality
 */
export class OperationsManager {
  private client: ProductionGoogleSheetsClient;
  private currentOpsSheetId: string | null = null;
  private cachedData: OperationsData | null = null;
  private lastFetchTime = 0;
  private readonly cacheExpiryMs = 30000; // 30 second cache for live data

  constructor() {
    this.client = new ProductionGoogleSheetsClient();
    logger.info('Operations Manager initialized', {
      module: 'OperationsManager'
    });
  }

  /**
   * Initialize the Operations manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Operations Manager', {
        module: 'OperationsManager'
      });

      await this.client.initialize();

      logger.info('Operations Manager ready', {
        module: 'OperationsManager'
      });
    } catch (error) {
      logger.error('Failed to initialize Operations Manager', {
        module: 'OperationsManager',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Load operations data from a specific OPS sheet
   */
  async loadOperationsSheet(opsSheetId: string, forceRefresh = false): Promise<OperationsData> {
    if (!opsSheetId) {
      throw new Error('OPS sheet ID is required');
    }

    const now = Date.now();
    
    // Check if we need to refresh data
    const needsRefresh = forceRefresh || 
                        this.currentOpsSheetId !== opsSheetId ||
                        !this.cachedData ||
                        (now - this.lastFetchTime) > this.cacheExpiryMs;

    if (!needsRefresh && this.cachedData) {
      logger.debug('Returning cached operations data', {
        module: 'OperationsManager',
        data: { opsSheetId }
      });
      return this.cachedData;
    }

    try {
      logger.info('Loading operations sheet data', {
        module: 'OperationsManager',
        data: { opsSheetId, forceRefresh }
      });

      // Create a new client instance for this specific sheet
      const opsClient = new ProductionGoogleSheetsClient();
      await opsClient.initialize();

      // Override the spreadsheet ID for this operation
      (opsClient as any).spreadsheetId = opsSheetId;

      // Batch read both tabs
      const ranges: SheetRange[] = [
        {
          sheetName: OPS_SHEET_TABS.SITE_INFO,
          startColumn: 'A',
          endColumn: 'E',
          startRow: 2,
          endRow: 100
        },
        {
          sheetName: OPS_SHEET_TABS.MASTER_SCHEDULE,
          startColumn: 'A',
          endColumn: 'M',
          startRow: 2,
          endRow: 1000
        }
      ];

      const [siteInfoData, scheduleData] = await opsClient.batchReadSheetData(ranges);

      // Validate batch read results
      if (!siteInfoData || !scheduleData) {
        throw new Error('Failed to read operations sheet data');
      }

      // Process the data
      const siteInfo = this.processSiteInfoData(siteInfoData);
      const games = this.processScheduleData(scheduleData);

      // Update cache
      this.currentOpsSheetId = opsSheetId;
      this.cachedData = {
        siteInfo,
        games,
        selectedSiteStream: null,
        lastUpdated: new Date().toISOString()
      };
      this.lastFetchTime = now;

      logger.info('Operations sheet loaded successfully', {
        module: 'OperationsManager',
        data: { 
          opsSheetId,
          siteCount: siteInfo.length,
          gameCount: games.length
        }
      });

      return this.cachedData;
    } catch (error) {
      logger.error('Failed to load operations sheet', {
        module: 'OperationsManager',
        data: { opsSheetId, error }
      });

      // Return cached data if available for this sheet
      if (this.currentOpsSheetId === opsSheetId && this.cachedData) {
        logger.warn('Returning stale cached data due to load failure', {
          module: 'OperationsManager'
        });
        return this.cachedData;
      }

      throw error;
    }
  }

  /**
   * Get games filtered by site stream
   */
  async getGamesBySiteStream(opsSheetId: string, siteStreamName: string): Promise<GameData[]> {
    const data = await this.loadOperationsSheet(opsSheetId);
    
    // Update selected site stream
    this.cachedData!.selectedSiteStream = siteStreamName;

    // Filter games by location/field matching site stream
    return data.games.filter(game => {
      const locationMatch = game.location.toLowerCase().includes(siteStreamName.toLowerCase());
      const fieldMatch = game.field?.toLowerCase().includes(siteStreamName.toLowerCase());
      return locationMatch || fieldMatch;
    });
  }

  /**
   * Update actual start time for a game
   */
  async updateGameStartTime(gameId: string, actualStartTime: string): Promise<void> {
    if (!this.currentOpsSheetId) {
      throw new Error('No operations sheet loaded');
    }

    try {
      logger.info('Updating game start time', {
        module: 'OperationsManager',
        data: { gameId, actualStartTime, opsSheetId: this.currentOpsSheetId }
      });

      // Find the game in cached data to get row number
      const game = this.cachedData?.games.find(g => g.id === gameId);
      if (!game) {
        throw new Error(`Game not found: ${gameId}`);
      }

      // Calculate row number (games start at row 2, plus index)
      const gameIndex = this.cachedData!.games.indexOf(game);
      const rowNumber = gameIndex + 2;

      // Create client for this specific OPS sheet
      const opsClient = new ProductionGoogleSheetsClient();
      await opsClient.initialize();
      (opsClient as any).spreadsheetId = this.currentOpsSheetId;

      // Update the actual start time column
      await opsClient.writeSheetData(
        OPS_SHEET_TABS.MASTER_SCHEDULE,
        `K${rowNumber}:K${rowNumber}`,
        [[actualStartTime]]
      );

      // Update cached data
      game.actualStartTime = actualStartTime;
      game.lastUpdated = new Date().toISOString();

      logger.info('Game start time updated successfully', {
        module: 'OperationsManager',
        data: { gameId, actualStartTime }
      });
    } catch (error) {
      logger.error('Failed to update game start time', {
        module: 'OperationsManager',
        data: { gameId, actualStartTime, error }
      });
      throw error;
    }
  }

  /**
   * Update team names for a game
   */
  async updateGameTeams(gameId: string, homeTeam: string, awayTeam: string): Promise<void> {
    if (!this.currentOpsSheetId) {
      throw new Error('No operations sheet loaded');
    }

    try {
      logger.info('Updating game teams', {
        module: 'OperationsManager',
        data: { gameId, homeTeam, awayTeam }
      });

      const game = this.cachedData?.games.find(g => g.id === gameId);
      if (!game) {
        throw new Error(`Game not found: ${gameId}`);
      }

      const gameIndex = this.cachedData!.games.indexOf(game);
      const rowNumber = gameIndex + 2;

      const opsClient = new ProductionGoogleSheetsClient();
      await opsClient.initialize();
      (opsClient as any).spreadsheetId = this.currentOpsSheetId;

      // Update both team name columns
      await opsClient.writeSheetData(
        OPS_SHEET_TABS.MASTER_SCHEDULE,
        `C${rowNumber}:D${rowNumber}`,
        [[homeTeam, awayTeam]]
      );

      // Update cached data
      game.homeTeam = homeTeam;
      game.awayTeam = awayTeam;
      game.lastUpdated = new Date().toISOString();

      logger.info('Game teams updated successfully', {
        module: 'OperationsManager',
        data: { gameId, homeTeam, awayTeam }
      });
    } catch (error) {
      logger.error('Failed to update game teams', {
        module: 'OperationsManager',
        data: { gameId, homeTeam, awayTeam, error }
      });
      throw error;
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isReady: boolean;
    currentOpsSheet: string | null;
    cacheStatus: string;
    lastUpdate: string;
  } {
    return {
      isReady: this.client.isReady(),
      currentOpsSheet: this.currentOpsSheetId,
      cacheStatus: this.cachedData ? 'populated' : 'empty',
      lastUpdate: this.lastFetchTime ? new Date(this.lastFetchTime).toISOString() : 'never'
    };
  }

  /**
   * Process Site Info sheet data
   */
  private processSiteInfoData(sheetData: SheetData): SiteInfo[] {
    const siteInfo: SiteInfo[] = [];

    logger.debug('Processing Site Info data', {
      module: 'OperationsManager',
      data: { rowCount: sheetData.rowCount }
    });

    for (const row of sheetData.values) {
      if (!row || row.length === 0 || !row[SITE_INFO_COLUMNS.SITE_NAME]) {
        continue;
      }

      try {
        const site: SiteInfo = {
          siteName: this.cleanString(row[SITE_INFO_COLUMNS.SITE_NAME]),
          streamName: this.cleanString(row[SITE_INFO_COLUMNS.STREAM_NAME]),
          streamUrl: this.cleanString(row[SITE_INFO_COLUMNS.STREAM_URL]),
          description: this.cleanString(row[SITE_INFO_COLUMNS.DESCRIPTION]),
          isActive: this.parseBoolean(row[SITE_INFO_COLUMNS.ACTIVE])
        };

        if (site.siteName && site.streamName) {
          siteInfo.push(site);
        }
      } catch (error) {
        logger.warn('Error processing site info row', {
          module: 'OperationsManager',
          data: { error }
        });
      }
    }

    return siteInfo;
  }

  /**
   * Process Master Schedule sheet data
   */
  private processScheduleData(sheetData: SheetData): GameData[] {
    const games: GameData[] = [];

    logger.debug('Processing Master Schedule data', {
      module: 'OperationsManager',
      data: { rowCount: sheetData.rowCount }
    });

    for (const row of sheetData.values) {
      if (!row || row.length === 0 || !row[MASTER_SCHEDULE_COLUMNS.GAME_ID]) {
        continue;
      }

      try {
        const homeScore = this.parseNumber(row[MASTER_SCHEDULE_COLUMNS.HOME_SCORE]);
        const awayScore = this.parseNumber(row[MASTER_SCHEDULE_COLUMNS.AWAY_SCORE]);

        const game: GameData = {
          id: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.GAME_ID]),
          scheduledTime: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.SCHEDULED_TIME]),
          homeTeam: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.HOME_TEAM]),
          awayTeam: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.AWAY_TEAM]),
          location: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.LOCATION]),
          field: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.FIELD]),
          division: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.DIVISION]),
          homeScore,
          awayScore,
          status: this.parseGameStatus(row[MASTER_SCHEDULE_COLUMNS.STATUS]),
          actualStartTime: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.ACTUAL_START_TIME]),
          notes: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.NOTES]),
          lastUpdated: this.cleanString(row[MASTER_SCHEDULE_COLUMNS.LAST_UPDATED]) || new Date().toISOString()
        };

        if (game.id && game.scheduledTime && game.homeTeam && game.awayTeam) {
          games.push(game);
        }
      } catch (error) {
        logger.warn('Error processing game row', {
          module: 'OperationsManager',
          data: { error }
        });
      }
    }

    // Sort games by scheduled time
    games.sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });

    return games;
  }

  /**
   * Helper methods
   */
  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private parseNumber(value: any): number | undefined {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    return str === 'true' || str === 'yes' || str === '1';
  }

  private parseGameStatus(value: any): GameData['status'] {
    const status = this.cleanString(value).toLowerCase();
    
    if (status.includes('live') || status.includes('active')) {
      return 'live';
    } else if (status.includes('completed') || status.includes('finished')) {
      return 'completed';
    } else if (status.includes('cancelled')) {
      return 'cancelled';
    } else {
      return 'upcoming';
    }
  }

  /**
   * Force refresh current sheet data
   */
  async refreshCurrentSheet(): Promise<OperationsData | null> {
    if (!this.currentOpsSheetId) {
      return null;
    }
    return this.loadOperationsSheet(this.currentOpsSheetId, true);
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.currentOpsSheetId = null;
    this.lastFetchTime = 0;
    logger.debug('Operations cache cleared', {
      module: 'OperationsManager'
    });
  }
}
