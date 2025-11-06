import { EventManager } from '../../core/event-manager';
import { SettingsManager } from '../../core/settings-manager';
import { Logger } from '../../utils/logger';
import type { EventInfo, GameInfo } from '../../data/event-data-manager';

export class EventSelector {
  private eventManager: EventManager;
  private logger: Logger;
  private events: EventInfo[] = [];
  private currentEvent: EventInfo | null = null;
  private currentGame: GameInfo | null = null;
  private isInitialized = false;

  constructor(
    eventManager: EventManager,
    _settingsManager: SettingsManager,
    logger: Logger
  ) {
    this.eventManager = eventManager;
    this.logger = logger;
    
    this.initialize();
  }

  private initialize(): void {
    this.logger.debug('Initializing Event Selector', {
      module: 'UI',
      action: 'INIT',
      data: { component: 'EventSelector' }
    });
    
    this.bindEventListeners();
    this.setupEventManagerListeners();
    
    // Add some sample data for testing
    this.addSampleData();
    
    this.isInitialized = true;
  }

  private addSampleData(): void {
    // Add sample events for testing
    const sampleEvents: EventInfo[] = [
      {
        id: 'sample-1',
        name: 'Basketball Tournament',
        date: '2025-11-06',
        status: 'upcoming',
        games: [
          {
            id: 'game-1',
            homeTeam: 'Lakers',
            awayTeam: 'Warriors',
            homeScore: 0,
            awayScore: 0,
            status: 'upcoming',
            startTime: '2025-11-06 19:00',
            location: 'Staples Center'
          },
          {
            id: 'game-2',
            homeTeam: 'Celtics',
            awayTeam: 'Heat',
            homeScore: 95,
            awayScore: 88,
            status: 'completed',
            startTime: '2025-11-06 16:00',
            location: 'TD Garden'
          }
        ]
      },
      {
        id: 'sample-2',
        name: 'Football Championship',
        date: '2025-11-07',
        status: 'upcoming',
        games: [
          {
            id: 'game-3',
            homeTeam: 'Chiefs',
            awayTeam: 'Patriots',
            homeScore: 0,
            awayScore: 0,
            status: 'upcoming',
            startTime: '2025-11-07 13:00',
            location: 'Arrowhead Stadium'
          }
        ]
      }
    ];

    this.events = sampleEvents;
    this.updateEventSelector();
    
    this.logger.debug('Sample data added', {
      module: 'UI',
      action: 'SAMPLE_DATA',
      data: { component: 'EventSelector', eventCount: sampleEvents.length }
    });
  }

  private bindEventListeners(): void {
    // Event selector dropdown
    const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
    if (eventSelector) {
      eventSelector.addEventListener('change', this.handleEventSelection.bind(this));
    }

    // Refresh button
    const refreshButton = document.getElementById('refresh-events') as HTMLButtonElement;
    if (refreshButton) {
      refreshButton.addEventListener('click', this.handleRefreshEvents.bind(this));
    }

    // Game navigation
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;
    
    if (prevButton) {
      prevButton.addEventListener('click', this.handlePreviousGame.bind(this));
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', this.handleNextGame.bind(this));
    }
  }

  private setupEventManagerListeners(): void {
    // Listen for events from the event data manager
    this.eventManager.on('events:updated', this.handleEventsUpdated.bind(this));
    this.eventManager.on('event:changed', this.handleEventChanged.bind(this));
    this.eventManager.on('game:changed', this.handleGameChanged.bind(this));
    this.eventManager.on('events:error', this.handleEventsError.bind(this));
  }

  private handleEventSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const eventId = target.value;

    if (!eventId) {
      this.currentEvent = null;
      this.currentGame = null;
      this.updateGameDisplay();
      return;
    }

    this.logger.debug('Event selected', {
      module: 'UI',
      action: 'EVENT_SELECTED',
      data: { component: 'EventSelector', eventId }
    });

    // Emit event selection
    this.eventManager.emit('event:selected', { eventId });
  }

  private handleRefreshEvents(): void {
    this.logger.debug('Refreshing events', {
      module: 'UI',
      action: 'REFRESH_EVENTS',
      data: { component: 'EventSelector' }
    });

    // Show loading state
    this.setRefreshButtonLoading(true);

    // Emit refresh request
    this.eventManager.emit('events:refresh');
  }

  private handlePreviousGame(): void {
    this.logger.debug('Previous game requested', {
      module: 'UI',
      action: 'PREV_GAME',
      data: { component: 'EventSelector' }
    });

    this.eventManager.emit('game:navigate', { direction: 'prev' });
  }

  private handleNextGame(): void {
    this.logger.debug('Next game requested', {
      module: 'UI',
      action: 'NEXT_GAME',
      data: { component: 'EventSelector' }
    });

    this.eventManager.emit('game:navigate', { direction: 'next' });
  }

  private handleEventsUpdated(data: { events: EventInfo[]; currentEventId: string | null }): void {
    this.logger.debug('Events updated', {
      module: 'UI',
      action: 'EVENTS_UPDATED',
      data: { component: 'EventSelector', eventCount: data.events.length }
    });

    this.events = data.events;
    this.updateEventSelector();
    this.setRefreshButtonLoading(false);
  }

  private handleEventChanged(data: { event: EventInfo; currentGame: GameInfo | null; gameIndex: number }): void {
    this.logger.debug('Event changed', {
      module: 'UI',
      action: 'EVENT_CHANGED',
      data: { 
        component: 'EventSelector', 
        eventId: data.event.id,
        gameIndex: data.gameIndex 
      }
    });

    this.currentEvent = data.event;
    this.currentGame = data.currentGame;
    this.updateGameDisplay();
    this.updateNavigationButtons(data.gameIndex, data.event.games.length);
  }

  private handleGameChanged(data: { event: EventInfo; currentGame: GameInfo; gameIndex: number }): void {
    this.logger.debug('Game changed', {
      module: 'UI',
      action: 'GAME_CHANGED',
      data: { 
        component: 'EventSelector', 
        gameId: data.currentGame.id,
        gameIndex: data.gameIndex 
      }
    });

    this.currentEvent = data.event;
    this.currentGame = data.currentGame;
    this.updateGameDisplay();
    this.updateNavigationButtons(data.gameIndex, data.event.games.length);
  }

  private handleEventsError(data: { error: any }): void {
    this.logger.error('Events error received', {
      module: 'UI',
      action: 'EVENTS_ERROR',
      data: { component: 'EventSelector', error: data.error }
    });

    this.setRefreshButtonLoading(false);
    
    // Could show error notification here
    this.eventManager.emit('notification:show', {
      type: 'error',
      message: 'Failed to load events. Please check your Google Sheets connection.',
      duration: 5000
    });
  }

  private updateEventSelector(): void {
    const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
    if (!eventSelector) return;

    // Clear existing options except the first placeholder
    while (eventSelector.children.length > 1) {
      eventSelector.removeChild(eventSelector.lastChild!);
    }

    // Add event options
    this.events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (${event.date})`;
      eventSelector.appendChild(option);
    });

    this.logger.debug('Event selector updated', {
      module: 'UI',
      action: 'SELECTOR_UPDATED',
      data: { component: 'EventSelector', optionCount: this.events.length }
    });
  }

  private updateGameDisplay(): void {
    // Update game counter
    const gameCounter = document.getElementById('game-counter') as HTMLSpanElement;
    if (gameCounter) {
      if (this.currentEvent) {
        const currentIndex = this.getCurrentGameIndex();
        gameCounter.textContent = `${currentIndex + 1} / ${this.currentEvent.games.length}`;
      } else {
        gameCounter.textContent = '0 / 0';
      }
    }

    // Update team names and scores
    if (this.currentGame) {
      this.updateElement('home-team', this.currentGame.homeTeam);
      this.updateElement('away-team', this.currentGame.awayTeam);
      this.updateElement('home-score', this.currentGame.homeScore.toString());
      this.updateElement('away-score', this.currentGame.awayScore.toString());
      this.updateElement('game-status', this.formatGameStatus(this.currentGame.status));
      this.updateElement('game-time', this.formatGameTime(this.currentGame.startTime));
    } else {
      // Clear display
      this.updateElement('home-team', 'Home Team');
      this.updateElement('away-team', 'Away Team');
      this.updateElement('home-score', '0');
      this.updateElement('away-score', '0');
      this.updateElement('game-status', 'No Game');
      this.updateElement('game-time', '--:--');
    }
  }

  private updateNavigationButtons(currentIndex: number, totalGames: number): void {
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;

    if (prevButton) {
      prevButton.disabled = currentIndex <= 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex >= totalGames - 1;
    }
  }

  private setRefreshButtonLoading(loading: boolean): void {
    const refreshButton = document.getElementById('refresh-events') as HTMLButtonElement;
    if (!refreshButton) return;

    if (loading) {
      refreshButton.disabled = true;
      const icon = refreshButton.querySelector('i');
      if (icon) {
        icon.classList.add('fa-spin');
      }
    } else {
      refreshButton.disabled = false;
      const icon = refreshButton.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-spin');
      }
    }
  }

  private updateElement(id: string, text: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  private getCurrentGameIndex(): number {
    if (!this.currentEvent || !this.currentGame) {
      return 0;
    }

    return this.currentEvent.games.findIndex(game => game.id === this.currentGame!.id);
  }

  private formatGameStatus(status: string): string {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'live':
        return 'Live';
      case 'completed':
        return 'Final';
      default:
        return status;
    }
  }

  private formatGameTime(startTime: string): string {
    try {
      const date = new Date(startTime);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '--:--';
    }
  }

  /**
   * Public API for external access
   */
  public getCurrentEvent(): EventInfo | null {
    return this.currentEvent;
  }

  public getCurrentGame(): GameInfo | null {
    return this.currentGame;
  }

  public getEvents(): EventInfo[] {
    return [...this.events];
  }

  public selectEvent(eventId: string): void {
    const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
    if (eventSelector) {
      eventSelector.value = eventId;
      this.handleEventSelection({ target: eventSelector } as any);
    }
  }

  public refreshEvents(): void {
    this.handleRefreshEvents();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}
