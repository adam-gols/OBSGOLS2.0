import { EventManager } from '../../core/event-manager';
import { SettingsManager } from '../../core/settings-manager';
import { Logger } from '../../utils/logger';

interface GameData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'live' | 'completed';
  scheduledTime?: string;
  gameDate?: string;
  location?: string;
  quarter?: string;
  timeRemaining?: string;
}

export class GameNavigator {
  private eventManager: EventManager;
  private settingsManager: SettingsManager;
  private logger: Logger;
  private games: GameData[] = [];
  private currentGameIndex = 0;

  constructor(
    eventManager: EventManager,
    settingsManager: SettingsManager,
    logger: Logger
  ) {
    this.eventManager = eventManager;
    this.settingsManager = settingsManager;
    this.logger = logger;
    
    this.initialize();
  }

  private initialize(): void {
    this.logger.debug('Initializing Game Navigator', {
      module: 'UI',
      action: 'INIT',
      data: { component: 'GameNavigator' }
    });
    
    this.bindEventListeners();
    this.restoreState();
    
    // Listen for external events
    this.eventManager.on('games:loaded', this.handleGamesLoaded.bind(this));
    this.eventManager.on('game:score:updated', this.handleScoreUpdated.bind(this));
    this.eventManager.on('game:status:changed', this.handleStatusChanged.bind(this));
  }

  private bindEventListeners(): void {
    // Navigation controls
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;
    
    if (prevButton) {
      prevButton.addEventListener('click', this.handlePreviousGame.bind(this));
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', this.handleNextGame.bind(this));
    }

    // Score editor controls
    const homeScoreInput = document.getElementById('home-score-input') as HTMLInputElement;
    const awayScoreInput = document.getElementById('away-score-input') as HTMLInputElement;
    const updateScoresButton = document.getElementById('update-scores') as HTMLButtonElement;
    
    if (homeScoreInput) {
      homeScoreInput.addEventListener('input', this.handleScoreInput.bind(this));
    }
    
    if (awayScoreInput) {
      awayScoreInput.addEventListener('input', this.handleScoreInput.bind(this));
    }
    
    if (updateScoresButton) {
      updateScoresButton.addEventListener('click', this.handleUpdateScores.bind(this));
    }
  }

  private restoreState(): void {
    const sessionState = this.settingsManager.getSessionState();
    if (sessionState.currentGameIndex !== undefined) {
      this.currentGameIndex = sessionState.currentGameIndex;
    }
  }

  private handleGamesLoaded(games: GameData[]): void {
    this.logger.debug('Games loaded', {
      module: 'UI',
      action: 'GAMES_LOADED',
      data: { component: 'GameNavigator', gameCount: games.length }
    });
    
    this.games = games;
    this.currentGameIndex = Math.min(this.currentGameIndex, games.length - 1);
    
    if (this.currentGameIndex < 0 && games.length > 0) {
      this.currentGameIndex = 0;
    }
    
    this.updateNavigationControls();
    this.displayCurrentGame();
  }

  private handlePreviousGame(): void {
    if (this.currentGameIndex > 0) {
      this.currentGameIndex--;
      this.saveCurrentIndex();
      this.displayCurrentGame();
      this.updateNavigationControls();
      
      this.logger.debug('Navigated to previous game', {
        module: 'UI',
        action: 'PREV_GAME',
        data: { component: 'GameNavigator', gameIndex: this.currentGameIndex }
      });
    }
  }

  private handleNextGame(): void {
    if (this.currentGameIndex < this.games.length - 1) {
      this.currentGameIndex++;
      this.saveCurrentIndex();
      this.displayCurrentGame();
      this.updateNavigationControls();
      
      this.logger.debug('Navigated to next game', {
        module: 'UI',
        action: 'NEXT_GAME',
        data: { component: 'GameNavigator', gameIndex: this.currentGameIndex }
      });
    }
  }

  private handleScoreInput(): void {
    // Enable/disable update button based on changes
    const homeInput = document.getElementById('home-score-input') as HTMLInputElement;
    const awayInput = document.getElementById('away-score-input') as HTMLInputElement;
    const updateButton = document.getElementById('update-scores') as HTMLButtonElement;
    
    if (homeInput && awayInput && updateButton) {
      const currentGame = this.getCurrentGame();
      const homeChanged = currentGame && parseInt(homeInput.value) !== (currentGame.homeScore || 0);
      const awayChanged = currentGame && parseInt(awayInput.value) !== (currentGame.awayScore || 0);
      
      updateButton.disabled = !homeChanged && !awayChanged;
    }
  }

  private async handleUpdateScores(): Promise<void> {
    const homeInput = document.getElementById('home-score-input') as HTMLInputElement;
    const awayInput = document.getElementById('away-score-input') as HTMLInputElement;
    const currentGame = this.getCurrentGame();
    
    if (!homeInput || !awayInput || !currentGame) {
      this.showError('Cannot update scores - invalid game or inputs');
      return;
    }
    
    try {
      const homeScore = parseInt(homeInput.value) || 0;
      const awayScore = parseInt(awayInput.value) || 0;
      
      this.logger.debug('Updating game scores', {
        module: 'UI',
        action: 'UPDATE_SCORES',
        data: { 
          component: 'GameNavigator',
          gameId: currentGame.id,
          homeScore,
          awayScore
        }
      });
      
      // Update local data
      currentGame.homeScore = homeScore;
      currentGame.awayScore = awayScore;
      
      // Notify other components
      this.eventManager.emit('game:score:update', {
        gameId: currentGame.id,
        homeScore,
        awayScore
      });
      
      // Update display
      this.displayCurrentGame();
      
      // Reset update button
      const updateButton = document.getElementById('update-scores') as HTMLButtonElement;
      if (updateButton) {
        updateButton.disabled = true;
      }
      
      this.showSuccess('Scores updated successfully');
      
    } catch (error) {
      this.logger.error('Failed to update scores', {
        module: 'UI',
        action: 'UPDATE_SCORES_ERROR',
        data: { component: 'GameNavigator' }
      }, error as Error);
      this.showError('Failed to update scores');
    }
  }

  private handleScoreUpdated(data: { gameId: string; homeScore: number; awayScore: number }): void {
    const game = this.games.find(g => g.id === data.gameId);
    if (game) {
      game.homeScore = data.homeScore;
      game.awayScore = data.awayScore;
      
      // Update display if this is the current game
      if (this.getCurrentGame()?.id === data.gameId) {
        this.displayCurrentGame();
      }
    }
  }

  private handleStatusChanged(data: { gameId: string; status: string }): void {
    const game = this.games.find(g => g.id === data.gameId);
    if (game) {
      game.status = data.status as GameData['status'];
      
      // Update display if this is the current game
      if (this.getCurrentGame()?.id === data.gameId) {
        this.displayCurrentGame();
      }
    }
  }

  private updateNavigationControls(): void {
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;
    const gameCounter = document.getElementById('game-counter') as HTMLSpanElement;
    
    if (prevButton) {
      prevButton.disabled = this.currentGameIndex <= 0;
    }
    
    if (nextButton) {
      nextButton.disabled = this.currentGameIndex >= this.games.length - 1;
    }
    
    if (gameCounter) {
      if (this.games.length > 0) {
        gameCounter.textContent = `${this.currentGameIndex + 1} / ${this.games.length}`;
      } else {
        gameCounter.textContent = '0 / 0';
      }
    }
  }

  private displayCurrentGame(): void {
    const currentGame = this.getCurrentGame();
    
    // Update current game display
    const currentGameElement = document.getElementById('current-game') as HTMLSpanElement;
    if (currentGameElement) {
      if (currentGame) {
        currentGameElement.textContent = `${currentGame.homeTeam} vs ${currentGame.awayTeam}`;
      } else {
        currentGameElement.textContent = 'No game selected';
      }
    }
    
    if (!currentGame) {
      this.hideGameDetails();
      return;
    }
    
    this.showGameDetails(currentGame);
  }

  private showGameDetails(game: GameData): void {
    // Update team names
    const homeTeamElement = document.getElementById('home-team') as HTMLSpanElement;
    const awayTeamElement = document.getElementById('away-team') as HTMLSpanElement;
    
    if (homeTeamElement) homeTeamElement.textContent = game.homeTeam;
    if (awayTeamElement) awayTeamElement.textContent = game.awayTeam;
    
    // Update scores
    const homeScoreElement = document.getElementById('home-score') as HTMLSpanElement;
    const awayScoreElement = document.getElementById('away-score') as HTMLSpanElement;
    
    if (homeScoreElement) homeScoreElement.textContent = (game.homeScore || 0).toString();
    if (awayScoreElement) awayScoreElement.textContent = (game.awayScore || 0).toString();
    
    // Update status
    const statusElement = document.getElementById('game-status') as HTMLSpanElement;
    if (statusElement) {
      statusElement.textContent = this.formatGameStatus(game.status);
      statusElement.className = `gols-game-status gols-status-${game.status}`;
    }
    
    // Update game metadata
    const timeElement = document.getElementById('game-time') as HTMLSpanElement;
    const dateElement = document.getElementById('game-date') as HTMLSpanElement;
    const locationElement = document.getElementById('game-location') as HTMLSpanElement;
    
    if (timeElement) {
      timeElement.textContent = game.scheduledTime || '--:--';
    }
    
    if (dateElement) {
      timeElement.textContent = game.gameDate || '--/--/----';
    }
    
    if (locationElement) {
      locationElement.textContent = game.location || 'Location TBD';
    }
    
    // Show/hide score editor for live games
    const scoreEditor = document.getElementById('score-editor') as HTMLDivElement;
    if (scoreEditor) {
      if (game.status === 'live') {
        scoreEditor.style.display = 'block';
        this.populateScoreEditor(game);
      } else {
        scoreEditor.style.display = 'none';
      }
    }
    
    // Show game details
    const gameDetails = document.getElementById('game-details') as HTMLDivElement;
    if (gameDetails) {
      gameDetails.style.display = 'block';
    }
  }

  private hideGameDetails(): void {
    const gameDetails = document.getElementById('game-details') as HTMLDivElement;
    if (gameDetails) {
      gameDetails.style.display = 'none';
    }
  }

  private populateScoreEditor(game: GameData): void {
    const homeInput = document.getElementById('home-score-input') as HTMLInputElement;
    const awayInput = document.getElementById('away-score-input') as HTMLInputElement;
    const updateButton = document.getElementById('update-scores') as HTMLButtonElement;
    
    if (homeInput) homeInput.value = (game.homeScore || 0).toString();
    if (awayInput) awayInput.value = (game.awayScore || 0).toString();
    if (updateButton) updateButton.disabled = true;
  }

  private formatGameStatus(status: GameData['status']): string {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'live': return 'Live';
      case 'completed': return 'Final';
      default: return status;
    }
  }

  private getCurrentGame(): GameData | null {
    if (this.currentGameIndex >= 0 && this.currentGameIndex < this.games.length) {
      return this.games[this.currentGameIndex] || null;
    }
    return null;
  }

  private saveCurrentIndex(): void {
    this.settingsManager.updateSessionState({
      currentGameIndex: this.currentGameIndex
    });
  }

  private showError(message: string): void {
    this.eventManager.emit('notification:show', {
      type: 'error',
      message,
      duration: 5000
    });
  }

  private showSuccess(message: string): void {
    this.eventManager.emit('notification:show', {
      type: 'success',
      message,
      duration: 3000
    });
  }

  public jumpToGame(gameId: string): void {
    const gameIndex = this.games.findIndex(g => g.id === gameId);
    if (gameIndex >= 0) {
      this.currentGameIndex = gameIndex;
      this.saveCurrentIndex();
      this.displayCurrentGame();
      this.updateNavigationControls();
      
      this.logger.debug('Jumped to specific game', {
        module: 'UI',
        action: 'JUMP_TO_GAME',
        data: { component: 'GameNavigator', gameId, gameIndex }
      });
    }
  }

  public getCurrentGameData(): GameData | null {
    return this.getCurrentGame();
  }

  public destroy(): void {
    this.logger.debug('Destroying Game Navigator', {
      module: 'UI',
      action: 'DESTROY',
      data: { component: 'GameNavigator' }
    });
    
    // Remove event listeners would be handled by removing DOM elements
    // or we could store references and remove them explicitly
  }
}
