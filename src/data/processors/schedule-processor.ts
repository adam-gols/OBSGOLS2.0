/**
 * Master Schedule data processor for GOLS OBS Widget
 * Processes Master Schedule sheet data for game navigation and management
 */

import { logger } from '../../utils/logger.js';
import type { SheetData } from '../../types/sheets';

export interface ProcessedGameData {
  id: string;
  scheduledTime: string;
  scheduledDate: string;
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
  
  // Computed fields
  autoStartTime?: string | undefined; // Scheduled time minus 5 minutes
  isNextGame?: boolean;
  timeUntilGame?: number; // Minutes until game starts
}

export interface ScheduleProcessingResult {
  games: ProcessedGameData[];
  gamesByStatus: {
    upcoming: ProcessedGameData[];
    live: ProcessedGameData[];
    completed: ProcessedGameData[];
    cancelled: ProcessedGameData[];
  };
  nextGame?: ProcessedGameData | undefined;
  currentGame?: ProcessedGameData | undefined;
  totalGames: number;
  lastProcessed: string;
  validationErrors: string[];
}

/**
 * Master Schedule sheet column mapping
 */
const SCHEDULE_COLUMNS = {
  GAME_ID: 0,           // Column A: Game ID
  SCHEDULED_TIME: 1,    // Column B: Scheduled Time
  HOME_TEAM: 2,         // Column C: Home Team
  AWAY_TEAM: 3,         // Column D: Away Team
  LOCATION: 4,          // Column E: Location
  FIELD: 5,             // Column F: Field
  DIVISION: 6,          // Column G: Division
  HOME_SCORE: 7,        // Column H: Home Score
  AWAY_SCORE: 8,        // Column I: Away Score
  STATUS: 9,            // Column J: Status
  ACTUAL_START_TIME: 10, // Column K: Actual Start Time
  NOTES: 11,            // Column L: Notes
  LAST_UPDATED: 12      // Column M: Last Updated
} as const;

/**
 * Processes Master Schedule sheet data into structured game data
 */
export class ScheduleProcessor {
  private validationErrors: string[] = [];

  /**
   * Process Master Schedule sheet data
   */
  processSheetData(sheetData: SheetData, siteStreamFilter?: string): ScheduleProcessingResult {
    this.validationErrors = [];
    const games: ProcessedGameData[] = [];

    logger.info('Processing Master Schedule data', {
      module: 'ScheduleProcessor',
      data: { 
        rowCount: sheetData.rowCount,
        columnCount: sheetData.columnCount,
        siteStreamFilter
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
        const game = this.processRow(row, rowNumber);
        if (game) {
          // Apply site stream filter if provided
          if (!siteStreamFilter || this.matchesSiteStream(game, siteStreamFilter)) {
            games.push(game);
          }
        }
      } catch (error) {
        const errorMsg = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.validationErrors.push(errorMsg);
        logger.warn('Schedule row processing error', {
          module: 'ScheduleProcessor',
          data: { rowNumber, error: errorMsg }
        });
      }
    }

    // Sort games chronologically
    games.sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });

    // Add computed fields
    this.addComputedFields(games);

    // Group games by status
    const gamesByStatus = this.groupGamesByStatus(games);

    // Find next and current games
    const nextGame = this.findNextGame(games);
    const currentGame = this.findCurrentGame(games);

    const result: ScheduleProcessingResult = {
      games,
      gamesByStatus,
      nextGame,
      currentGame,
      totalGames: games.length,
      lastProcessed: new Date().toISOString(),
      validationErrors: this.validationErrors
    };

    logger.info('Schedule processing completed', {
      module: 'ScheduleProcessor',
      data: {
        totalGames: result.totalGames,
        upcomingGames: gamesByStatus.upcoming.length,
        liveGames: gamesByStatus.live.length,
        validationErrors: this.validationErrors.length,
        nextGameId: nextGame?.id,
        currentGameId: currentGame?.id
      }
    });

    return result;
  }

  /**
   * Process a single schedule row
   */
  private processRow(row: any[], rowNumber: number): ProcessedGameData | null {
    // Extract required fields
    const gameId = this.cleanString(row[SCHEDULE_COLUMNS.GAME_ID]);
    const scheduledTime = this.cleanString(row[SCHEDULE_COLUMNS.SCHEDULED_TIME]);
    const homeTeam = this.cleanString(row[SCHEDULE_COLUMNS.HOME_TEAM]);
    const awayTeam = this.cleanString(row[SCHEDULE_COLUMNS.AWAY_TEAM]);
    const location = this.cleanString(row[SCHEDULE_COLUMNS.LOCATION]);

    // Validate required fields
    if (!gameId) {
      throw new Error('Game ID is required');
    }
    if (!scheduledTime) {
      throw new Error('Scheduled time is required');
    }
    if (!homeTeam || !awayTeam) {
      throw new Error('Both team names are required');
    }

    // Parse optional fields
    const field = this.cleanString(row[SCHEDULE_COLUMNS.FIELD]);
    const division = this.cleanString(row[SCHEDULE_COLUMNS.DIVISION]);
    const homeScore = this.parseNumber(row[SCHEDULE_COLUMNS.HOME_SCORE]);
    const awayScore = this.parseNumber(row[SCHEDULE_COLUMNS.AWAY_SCORE]);
    const status = this.parseGameStatus(row[SCHEDULE_COLUMNS.STATUS]);
    const actualStartTime = this.cleanString(row[SCHEDULE_COLUMNS.ACTUAL_START_TIME]);
    const notes = this.cleanString(row[SCHEDULE_COLUMNS.NOTES]);
    const lastUpdated = this.cleanString(row[SCHEDULE_COLUMNS.LAST_UPDATED]) || new Date().toISOString();

    // Parse and validate scheduled time
    const scheduledDate = this.extractDate(scheduledTime);
    if (!scheduledDate) {
      throw new Error(`Invalid scheduled time format: ${scheduledTime}`);
    }

    // Calculate auto start time (scheduled - 5 minutes)
    const autoStartTime = this.calculateAutoStartTime(scheduledTime);

    const game: ProcessedGameData = {
      id: gameId,
      scheduledTime,
      scheduledDate,
      homeTeam,
      awayTeam,
      location,
      field,
      division,
      homeScore,
      awayScore,
      status,
      actualStartTime,
      notes,
      lastUpdated,
      autoStartTime
    };

    logger.debug('Schedule row processed', {
      module: 'ScheduleProcessor',
      data: { 
        rowNumber, 
        gameId: game.id, 
        scheduledTime: game.scheduledTime,
        status: game.status,
        autoStartTime: game.autoStartTime
      }
    });

    return game;
  }

  /**
   * Check if row has required data
   */
  private hasRequiredData(row: any[]): boolean {
    return !!(row[SCHEDULE_COLUMNS.GAME_ID] && 
             row[SCHEDULE_COLUMNS.SCHEDULED_TIME] &&
             row[SCHEDULE_COLUMNS.HOME_TEAM] && 
             row[SCHEDULE_COLUMNS.AWAY_TEAM]);
  }

  /**
   * Check if game matches site stream filter
   */
  private matchesSiteStream(game: ProcessedGameData, siteStreamFilter: string): boolean {
    const filter = siteStreamFilter.toLowerCase();
    const locationMatch = game.location.toLowerCase().includes(filter);
    const fieldMatch = game.field?.toLowerCase().includes(filter);
    return locationMatch || !!fieldMatch;
  }

  /**
   * Add computed fields to games
   */
  private addComputedFields(games: ProcessedGameData[]): void {
    const now = new Date();

    games.forEach(game => {
      const scheduledTime = new Date(game.scheduledTime);
      game.timeUntilGame = Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60)); // Minutes
    });

    // Mark next game
    const nextGame = this.findNextGame(games);
    if (nextGame) {
      nextGame.isNextGame = true;
    }
  }

  /**
   * Group games by status
   */
  private groupGamesByStatus(games: ProcessedGameData[]): ScheduleProcessingResult['gamesByStatus'] {
    return {
      upcoming: games.filter(g => g.status === 'upcoming'),
      live: games.filter(g => g.status === 'live'),
      completed: games.filter(g => g.status === 'completed'),
      cancelled: games.filter(g => g.status === 'cancelled')
    };
  }

  /**
   * Find the next upcoming game
   */
  private findNextGame(games: ProcessedGameData[]): ProcessedGameData | undefined {
    const now = new Date();
    return games.find(game => {
      const scheduledTime = new Date(game.scheduledTime);
      return game.status === 'upcoming' && scheduledTime > now;
    });
  }

  /**
   * Find currently live game
   */
  private findCurrentGame(games: ProcessedGameData[]): ProcessedGameData | undefined {
    return games.find(game => game.status === 'live');
  }

  /**
   * Extract date from scheduled time
   */
  private extractDate(scheduledTime: string): string | null {
    try {
      const date = new Date(scheduledTime);
      if (isNaN(date.getTime())) return null;
      return date.toDateString();
    } catch {
      return null;
    }
  }

  /**
   * Calculate auto start time (scheduled - 5 minutes)
   */
  private calculateAutoStartTime(scheduledTime: string): string | undefined {
    try {
      const scheduled = new Date(scheduledTime);
      if (isNaN(scheduled.getTime())) return undefined;
      
      const autoStart = new Date(scheduled.getTime() - (5 * 60 * 1000)); // Subtract 5 minutes
      return autoStart.toISOString();
    } catch {
      return undefined;
    }
  }

  /**
   * Parse game status from text
   */
  private parseGameStatus(statusText: any): ProcessedGameData['status'] {
    const normalized = String(statusText).toLowerCase().trim();
    
    if (normalized.includes('live') || normalized.includes('active') || normalized.includes('playing')) {
      return 'live';
    } else if (normalized.includes('completed') || normalized.includes('finished') || normalized.includes('final')) {
      return 'completed';
    } else if (normalized.includes('cancelled') || normalized.includes('canceled') || normalized.includes('postponed')) {
      return 'cancelled';
    } else {
      return 'upcoming';
    }
  }

  /**
   * Clean and normalize string values
   */
  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
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
   * Navigate to next game in chronological order
   */
  navigateToNextGame(games: ProcessedGameData[], currentGameId?: string): ProcessedGameData | null {
    if (!currentGameId) {
      return this.findNextGame(games) || games[0] || null;
    }

    const currentIndex = games.findIndex(game => game.id === currentGameId);
    if (currentIndex === -1) {
      return this.findNextGame(games) || games[0] || null;
    }

    // Return next game in chronological order
    return games[currentIndex + 1] || null;
  }

  /**
   * Navigate to previous game in chronological order
   */
  navigateToPreviousGame(games: ProcessedGameData[], currentGameId?: string): ProcessedGameData | null {
    if (!currentGameId) {
      return games[games.length - 1] || null;
    }

    const currentIndex = games.findIndex(game => game.id === currentGameId);
    if (currentIndex === -1) {
      return games[games.length - 1] || null;
    }

    // Return previous game in chronological order
    return games[currentIndex - 1] || null;
  }

  /**
   * Filter games by date range
   */
  filterGamesByDateRange(
    games: ProcessedGameData[], 
    startDate: string, 
    endDate: string
  ): ProcessedGameData[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return games.filter(game => {
      const gameDate = new Date(game.scheduledTime);
      return gameDate >= start && gameDate <= end;
    });
  }

  /**
   * Get games for today
   */
  getTodaysGames(games: ProcessedGameData[]): ProcessedGameData[] {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return games.filter(game => {
      const gameTime = new Date(game.scheduledTime);
      return gameTime >= todayStart && gameTime < todayEnd;
    });
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(result: ScheduleProcessingResult): {
    totalGames: number;
    statusBreakdown: Record<string, number>;
    todaysGames: number;
    gamesWithScores: number;
    errorRate: number;
  } {
    const statusBreakdown = {
      upcoming: result.gamesByStatus.upcoming.length,
      live: result.gamesByStatus.live.length,
      completed: result.gamesByStatus.completed.length,
      cancelled: result.gamesByStatus.cancelled.length
    };

    const todaysGames = this.getTodaysGames(result.games).length;
    
    const gamesWithScores = result.games.filter(
      game => game.homeScore !== undefined && game.awayScore !== undefined
    ).length;

    const errorRate = result.validationErrors.length / (result.totalGames + result.validationErrors.length);

    return {
      totalGames: result.totalGames,
      statusBreakdown,
      todaysGames,
      gamesWithScores,
      errorRate
    };
  }
}
