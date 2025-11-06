/**
 * Main Google Sheets Integration class for GOLS OBS Widget
 * Orchestrates all Google Sheets operations with production credentials
 */

import { logger } from '../../utils/logger.js';
import { EventManager } from '../../core/event-manager.js';
import { FileCabinetManager } from './file-cabinet-manager.js';
import { OperationsManager } from './operations-manager.js';
import { ScheduleProcessor } from '../../data/processors/schedule-processor.js';
import { WIDGET_EVENTS } from '../../data/models/index.js';

import type { 
  EventListItem, 
  FileCabinetData 
} from './file-cabinet-manager.js';

import type { 
  OperationsData 
} from './operations-manager.js';

import type {
  ProcessedSiteInfo,
  ProcessedGameData
} from '../../data/models/index.js';

export interface GoogleSheetsState {
  isInitialized: boolean;
  isConnected: boolean;
  lastError?: string;
  selectedEvent?: EventListItem;
  selectedSiteStream?: ProcessedSiteInfo;
  currentGame?: ProcessedGameData | undefined;
  gameList: ProcessedGameData[];
  lastUpdate: string;
}

/**
 * Main Google Sheets integration with production credentials and comprehensive functionality
 */
export class GoogleSheetsIntegration {
  private eventManager: EventManager;
  private fileCabinetManager: FileCabinetManager;
  private operationsManager: OperationsManager;
  private scheduleProcessor: ScheduleProcessor;
  
  private state: GoogleSheetsState = {
    isInitialized: false,
    isConnected: false,
    gameList: [],
    lastUpdate: new Date().toISOString()
  };

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
    this.fileCabinetManager = new FileCabinetManager();
    this.operationsManager = new OperationsManager();
    this.scheduleProcessor = new ScheduleProcessor();

    logger.info('Google Sheets Integration initialized', {
      module: 'GoogleSheetsIntegration'
    });
  }

  /**
   * Initialize all Google Sheets components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Google Sheets integration', {
        module: 'GoogleSheetsIntegration'
      });

      // Initialize File Cabinet Manager
      await this.fileCabinetManager.initialize();
      
      // Initialize Operations Manager  
      await this.operationsManager.initialize();

      this.state.isInitialized = true;
      this.state.isConnected = true;
      this.state.lastUpdate = new Date().toISOString();

      // Emit initialization event
      this.eventManager.emit(WIDGET_EVENTS.SHEETS_CONNECTED, {
        timestamp: this.state.lastUpdate,
        health: this.getHealthStatus()
      });

      logger.info('Google Sheets integration ready', {
        module: 'GoogleSheetsIntegration'
      });

    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.state.isConnected = false;

      logger.error('Failed to initialize Google Sheets integration', {
        module: 'GoogleSheetsIntegration',
        data: { error: this.state.lastError }
      });

      this.eventManager.emit(WIDGET_EVENTS.SHEETS_ERROR, {
        error: this.state.lastError,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Get list of events from File Cabinet
   */
  async getEvents(forceRefresh = false): Promise<FileCabinetData> {
    this.validateInitialized();
    
    try {
      const events = await this.fileCabinetManager.getEvents(forceRefresh);
      
      this.eventManager.emit(WIDGET_EVENTS.EVENT_LIST_UPDATED, {
        eventCount: events.totalEvents,
        timestamp: events.lastRefresh
      });

      return events;
    } catch (error) {
      logger.error('Failed to get events', {
        module: 'GoogleSheetsIntegration',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Select an event and load its operations sheet
   */
  async selectEvent(eventId: string): Promise<OperationsData> {
    this.validateInitialized();

    try {
      logger.info('Selecting event', {
        module: 'GoogleSheetsIntegration',
        data: { eventId }
      });

      // Get event details
      const event = await this.fileCabinetManager.getEventById(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      if (!event.opsSheetId) {
        throw new Error('Event has no associated operations sheet');
      }

      // Load operations sheet
      const operationsData = await this.operationsManager.loadOperationsSheet(event.opsSheetId);

      // Update state
      this.state.selectedEvent = event;
      this.state.lastUpdate = new Date().toISOString();

      // Emit event selection
      this.eventManager.emit(WIDGET_EVENTS.EVENT_SELECTED, {
        event,
        opsSheetId: event.opsSheetId,
        timestamp: this.state.lastUpdate
      });

      this.eventManager.emit(WIDGET_EVENTS.OPS_SHEET_LOADED, {
        opsSheetId: event.opsSheetId,
        siteCount: operationsData.siteInfo.length,
        gameCount: operationsData.games.length,
        timestamp: operationsData.lastUpdated
      });

      return operationsData;
    } catch (error) {
      logger.error('Failed to select event', {
        module: 'GoogleSheetsIntegration',
        data: { eventId, error }
      });
      throw error;
    }
  }

  /**
   * Select a site stream and get filtered games
   */
  async selectSiteStream(siteStreamName: string): Promise<ProcessedGameData[]> {
    this.validateInitialized();

    if (!this.state.selectedEvent?.opsSheetId) {
      throw new Error('No event selected');
    }

    try {
      logger.info('Selecting site stream', {
        module: 'GoogleSheetsIntegration',
        data: { siteStreamName, eventId: this.state.selectedEvent.id }
      });

      // Get games for this site stream
      const games = await this.operationsManager.getGamesBySiteStream(
        this.state.selectedEvent.opsSheetId, 
        siteStreamName
      );

      // Process games with schedule processor
      const gameData = { values: games.map(game => Object.values(game)), rowCount: games.length, columnCount: 13, range: '', lastUpdated: new Date().toISOString() };
      const processedResult = this.scheduleProcessor.processSheetData(gameData, siteStreamName);

      // Update state
      this.state.gameList = processedResult.games;
      this.state.currentGame = processedResult.nextGame || processedResult.games[0];
      this.state.lastUpdate = new Date().toISOString();

      // Find selected site info
      const operationsData = await this.operationsManager.loadOperationsSheet(this.state.selectedEvent.opsSheetId);
      const selectedSite = operationsData.siteInfo.find(site => 
        site.siteName.toLowerCase().includes(siteStreamName.toLowerCase()) ||
        site.streamName.toLowerCase().includes(siteStreamName.toLowerCase())
      );

      if (selectedSite) {
        const processedSite: ProcessedSiteInfo = {
          id: `${selectedSite.siteName}_${selectedSite.streamName}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
          siteName: selectedSite.siteName,
          streamName: selectedSite.streamName,
          streamUrl: selectedSite.streamUrl || '',
          isActive: selectedSite.isActive
        };
        
        if (selectedSite.description) {
          processedSite.description = selectedSite.description;
        }
        
        this.state.selectedSiteStream = processedSite;
      }

      // Emit site stream selection
      this.eventManager.emit(WIDGET_EVENTS.SITE_STREAM_SELECTED, {
        siteStreamName,
        gameCount: processedResult.games.length,
        nextGame: processedResult.nextGame?.id,
        timestamp: this.state.lastUpdate
      });

      return processedResult.games;
    } catch (error) {
      logger.error('Failed to select site stream', {
        module: 'GoogleSheetsIntegration',
        data: { siteStreamName, error }
      });
      throw error;
    }
  }

  /**
   * Navigate to next game
   */
  navigateToNextGame(): ProcessedGameData | null {
    this.validateInitialized();

    const nextGame = this.scheduleProcessor.navigateToNextGame(
      this.state.gameList, 
      this.state.currentGame?.id
    );

    if (nextGame) {
      this.state.currentGame = nextGame;
      this.state.lastUpdate = new Date().toISOString();

      this.eventManager.emit(WIDGET_EVENTS.GAME_NAVIGATED, {
        direction: 'next',
        gameId: nextGame.id,
        timestamp: this.state.lastUpdate
      });
    }

    return nextGame;
  }

  /**
   * Navigate to previous game
   */
  navigateToPreviousGame(): ProcessedGameData | null {
    this.validateInitialized();

    const prevGame = this.scheduleProcessor.navigateToPreviousGame(
      this.state.gameList, 
      this.state.currentGame?.id
    );

    if (prevGame) {
      this.state.currentGame = prevGame;
      this.state.lastUpdate = new Date().toISOString();

      this.eventManager.emit(WIDGET_EVENTS.GAME_NAVIGATED, {
        direction: 'previous',
        gameId: prevGame.id,
        timestamp: this.state.lastUpdate
      });
    }

    return prevGame;
  }

  /**
   * Update actual start time for current game
   */
  async updateGameStartTime(actualStartTime?: string): Promise<void> {
    this.validateInitialized();

    if (!this.state.currentGame) {
      throw new Error('No game selected');
    }

    const startTime = actualStartTime || new Date().toISOString();

    try {
      await this.operationsManager.updateGameStartTime(
        this.state.currentGame.id, 
        startTime
      );

      // Update local state
      this.state.currentGame.actualStartTime = startTime;
      this.state.lastUpdate = new Date().toISOString();

      this.eventManager.emit(WIDGET_EVENTS.GAME_DATA_UPDATED, {
        gameId: this.state.currentGame.id,
        field: 'actualStartTime',
        value: startTime,
        timestamp: this.state.lastUpdate
      });

      logger.info('Game start time updated', {
        module: 'GoogleSheetsIntegration',
        data: { 
          gameId: this.state.currentGame.id, 
          actualStartTime: startTime 
        }
      });
    } catch (error) {
      logger.error('Failed to update game start time', {
        module: 'GoogleSheetsIntegration',
        data: { 
          gameId: this.state.currentGame.id, 
          actualStartTime: startTime, 
          error 
        }
      });
      throw error;
    }
  }

  /**
   * Update team names for current game
   */
  async updateGameTeams(homeTeam: string, awayTeam: string): Promise<void> {
    this.validateInitialized();

    if (!this.state.currentGame) {
      throw new Error('No game selected');
    }

    try {
      await this.operationsManager.updateGameTeams(
        this.state.currentGame.id,
        homeTeam,
        awayTeam
      );

      // Update local state
      this.state.currentGame.homeTeam = homeTeam;
      this.state.currentGame.awayTeam = awayTeam;
      this.state.lastUpdate = new Date().toISOString();

      this.eventManager.emit(WIDGET_EVENTS.GAME_DATA_UPDATED, {
        gameId: this.state.currentGame.id,
        field: 'teams',
        value: { homeTeam, awayTeam },
        timestamp: this.state.lastUpdate
      });

      logger.info('Game teams updated', {
        module: 'GoogleSheetsIntegration',
        data: { 
          gameId: this.state.currentGame.id, 
          homeTeam, 
          awayTeam 
        }
      });
    } catch (error) {
      logger.error('Failed to update game teams', {
        module: 'GoogleSheetsIntegration',
        data: { 
          gameId: this.state.currentGame.id, 
          homeTeam, 
          awayTeam, 
          error 
        }
      });
      throw error;
    }
  }

  /**
   * Get current widget state
   */
  getState(): GoogleSheetsState {
    return { ...this.state };
  }

  /**
   * Get health status of all components
   */
  getHealthStatus(): {
    isHealthy: boolean;
    components: {
      fileCabinet: any;
      operations: any;
    };
    lastCheck: string;
  } {
    const fileCabinetHealth = this.fileCabinetManager.getHealthStatus();
    const operationsHealth = this.operationsManager.getHealthStatus();

    return {
      isHealthy: fileCabinetHealth.isReady && this.state.isConnected,
      components: {
        fileCabinet: fileCabinetHealth,
        operations: operationsHealth
      },
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Refresh all cached data
   */
  async refreshAllData(): Promise<void> {
    this.validateInitialized();

    try {
      logger.info('Refreshing all Google Sheets data', {
        module: 'GoogleSheetsIntegration'
      });

      // Refresh File Cabinet data
      await this.fileCabinetManager.refreshCache();

      // Refresh Operations data if sheet is loaded
      if (this.state.selectedEvent?.opsSheetId) {
        await this.operationsManager.refreshCurrentSheet();
        
        // Reload current site stream if selected
        if (this.state.selectedSiteStream) {
          await this.selectSiteStream(this.state.selectedSiteStream.streamName);
        }
      }

      this.state.lastUpdate = new Date().toISOString();

      this.eventManager.emit(WIDGET_EVENTS.SHEETS_DATA_UPDATED, {
        timestamp: this.state.lastUpdate,
        source: 'manual_refresh'
      });

      logger.info('Google Sheets data refreshed', {
        module: 'GoogleSheetsIntegration'
      });
    } catch (error) {
      logger.error('Failed to refresh Google Sheets data', {
        module: 'GoogleSheetsIntegration',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Validate that integration is initialized
   */
  private validateInitialized(): void {
    if (!this.state.isInitialized) {
      throw new Error('Google Sheets integration not initialized');
    }
    if (!this.state.isConnected) {
      throw new Error('Google Sheets integration not connected');
    }
  }
}
