import { EventManager } from '../core/event-manager';
import { GoogleSheetsIntegration } from '../integrations/google-sheets';
import { logger } from '../utils/logger';
import type { EventData } from '../types/sheets';

export interface EventInfo {
  id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'live' | 'completed';
  games: GameInfo[];
}

export interface GameInfo {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'upcoming' | 'live' | 'completed';
  startTime: string;
  location?: string;
  streamUrl?: string | undefined;
}

/**
 * Manages event data and provides interface between UI and Google Sheets
 */
export class EventDataManager {
  private eventManager: EventManager;
  private googleSheets: GoogleSheetsIntegration | null = null;
  private events: EventInfo[] = [];
  private currentEventId: string | null = null;
  private currentGameIndex: number = 0;
  private isInitialized = false;

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
    this.setupEventListeners();
  }

  /**
   * Initialize with Google Sheets integration
   */
  async initialize(googleSheets: GoogleSheetsIntegration): Promise<void> {
    try {
      this.googleSheets = googleSheets;
      this.isInitialized = true;

      logger.info('Event data manager initialized', {
        module: 'EventDataManager'
      });

      // Load initial data
      await this.refreshEvents();

    } catch (error) {
      logger.error('Failed to initialize event data manager', {
        module: 'EventDataManager',
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.eventManager.on('event:selected', (data: { eventId: string }) => {
      this.selectEvent(data.eventId);
    });

    this.eventManager.on('game:navigate', (data: { direction: 'next' | 'prev' }) => {
      if (data.direction === 'next') {
        this.nextGame();
      } else {
        this.previousGame();
      }
    });

    this.eventManager.on('settings:saved', () => {
      // Refresh events when settings change
      this.refreshEvents();
    });

    this.eventManager.on('events:refresh', () => {
      // Handle manual refresh requests from UI
      this.refreshEvents();
    });
  }

  /**
   * Refresh events from Google Sheets
   */
  async refreshEvents(): Promise<void> {
    if (!this.googleSheets || !this.googleSheets.isReady()) {
      logger.warn('Google Sheets not available for event refresh', {
        module: 'EventDataManager'
      });
      return;
    }

    try {
      logger.info('Refreshing events from Google Sheets', {
        module: 'EventDataManager'
      });

      const eventManager = this.googleSheets.getEventManager();
      const eventData = await eventManager.fetchEvents(true); // Force refresh

      // Transform raw data to our format
      this.events = this.transformEventData(eventData);

      logger.info('Events refreshed successfully', {
        module: 'EventDataManager',
        data: { eventCount: this.events.length }
      });

      // Emit update event
      this.eventManager.emit('events:updated', { 
        events: this.events,
        currentEventId: this.currentEventId 
      });

    } catch (error) {
      logger.error('Failed to refresh events', {
        module: 'EventDataManager',
        data: { error }
      });

      // Emit error event
      this.eventManager.emit('events:error', { error });
    }
  }

  /**
   * Transform Google Sheets data to our event format
   */
  private transformEventData(eventData: EventData[]): EventInfo[] {
    const eventsMap = new Map<string, EventInfo>();

    eventData.forEach(data => {
      // Group by event name (since each row is a game)
      const eventKey = `${data.name}_${data.date}`;
      
      if (!eventsMap.has(eventKey)) {
        eventsMap.set(eventKey, {
          id: eventKey,
          name: data.name,
          date: data.date,
          status: this.determineEventStatus(data),
          games: []
        });
      }

      const event = eventsMap.get(eventKey)!;
      event.games.push({
        id: data.id,
        homeTeam: data.homeTeam,
        awayTeam: data.awayTeam,
        homeScore: data.homeScore || 0,
        awayScore: data.awayScore || 0,
        status: data.status as 'upcoming' | 'live' | 'completed',
        startTime: `${data.date} ${data.time}`,
        location: data.location,
        streamUrl: data.streamUrl
      });
    });

    return Array.from(eventsMap.values());
  }

  /**
   * Determine event status from event data
   */
  private determineEventStatus(data: EventData): 'upcoming' | 'live' | 'completed' {
    const now = new Date();
    const eventDate = new Date(`${data.date} ${data.time}`);
    
    if (eventDate > now) {
      return 'upcoming';
    } else if (data.status === 'live') {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Select an event by ID
   */
  selectEvent(eventId: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (!event) {
      logger.warn('Event not found', {
        module: 'EventDataManager',
        data: { eventId }
      });
      return;
    }

    this.currentEventId = eventId;
    this.currentGameIndex = 0;

    logger.info('Event selected', {
      module: 'EventDataManager',
      data: { 
        eventId,
        eventName: event.name,
        gameCount: event.games.length
      }
    });

    // Emit events
    this.eventManager.emit('event:changed', { 
      event,
      currentGame: event.games[0] || null,
      gameIndex: 0
    });
  }

  /**
   * Navigate to next game
   */
  nextGame(): void {
    const event = this.getCurrentEvent();
    if (!event || this.currentGameIndex >= event.games.length - 1) {
      return;
    }

    this.currentGameIndex++;
    const currentGame = event.games[this.currentGameIndex];

    if (currentGame) {
      logger.debug('Navigated to next game', {
        module: 'EventDataManager',
        data: { 
          gameIndex: this.currentGameIndex,
          gameId: currentGame.id
        }
      });

      this.eventManager.emit('game:changed', {
        event,
        currentGame,
        gameIndex: this.currentGameIndex
      });
    }
  }

  /**
   * Navigate to previous game
   */
  previousGame(): void {
    const event = this.getCurrentEvent();
    if (!event || this.currentGameIndex <= 0) {
      return;
    }

    this.currentGameIndex--;
    const currentGame = event.games[this.currentGameIndex];

    if (currentGame) {
      logger.debug('Navigated to previous game', {
        module: 'EventDataManager',
        data: { 
          gameIndex: this.currentGameIndex,
          gameId: currentGame.id
        }
      });

      this.eventManager.emit('game:changed', {
        event,
        currentGame,
        gameIndex: this.currentGameIndex
      });
    }
  }

  /**
   * Get current event
   */
  getCurrentEvent(): EventInfo | null {
    if (!this.currentEventId) {
      return null;
    }
    return this.events.find(e => e.id === this.currentEventId) || null;
  }

  /**
   * Get current game
   */
  getCurrentGame(): GameInfo | null {
    const event = this.getCurrentEvent();
    if (!event || this.currentGameIndex >= event.games.length || this.currentGameIndex < 0) {
      return null;
    }
    return event.games[this.currentGameIndex] || null;
  }

  /**
   * Get all events
   */
  getEvents(): EventInfo[] {
    return [...this.events];
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): EventInfo | null {
    return this.events.find(e => e.id === eventId) || null;
  }

  /**
   * Check if manager is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.googleSheets !== null;
  }

  /**
   * Get status information
   */
  getStatus(): {
    isInitialized: boolean;
    eventCount: number;
    currentEventId: string | null;
    currentGameIndex: number;
    hasGoogleSheets: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      eventCount: this.events.length,
      currentEventId: this.currentEventId,
      currentGameIndex: this.currentGameIndex,
      hasGoogleSheets: this.googleSheets !== null
    };
  }
}
