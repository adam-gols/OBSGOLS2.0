import { EventManager } from '../../core/event-manager';
import { SettingsManager } from '../../core/settings-manager';
import { Logger } from '../../utils/logger';

export class GameFormHandler {
  private eventManager: EventManager;
  private logger: Logger;
  
  private currentGameIndex = 0;
  private totalGames = 0;
  private games: any[] = [];

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
    this.bindEventListeners();
    this.setupEventHandlers();
  }

  private bindEventListeners(): void {
    // Navigation buttons
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;
    
    if (prevButton) {
      prevButton.addEventListener('click', this.handlePrevGame.bind(this));
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', this.handleNextGame.bind(this));
    }

    // Input field changes
    const actualStartTime = document.getElementById('actual-start-time') as HTMLInputElement;
    const team1Name = document.getElementById('team1-name') as HTMLInputElement;
    const team1Score = document.getElementById('team1-score') as HTMLInputElement;
    const team2Name = document.getElementById('team2-name') as HTMLInputElement;
    const team2Score = document.getElementById('team2-score') as HTMLInputElement;
    const gameComments = document.getElementById('game-comments') as HTMLInputElement;

    [actualStartTime, team1Name, team1Score, team2Name, team2Score, gameComments].forEach(input => {
      if (input) {
        input.addEventListener('change', this.handleInputChange.bind(this));
        input.addEventListener('blur', this.handleInputChange.bind(this));
      }
    });
  }

  private setupEventHandlers(): void {
    // Listen for game data updates
    this.eventManager.on('game:data-loaded', (data: any) => {
      this.games = data.games || [];
      this.totalGames = this.games.length;
      this.currentGameIndex = 0;
      this.loadCurrentGame();
    });

    // Listen for stream selection changes
    this.eventManager.on('stream:changed', (streamData: any) => {
      this.loadStreamGames(streamData);
    });
  }

  private handlePrevGame(): void {
    if (this.currentGameIndex > 0) {
      this.saveCurrentGame();
      this.currentGameIndex--;
      this.loadCurrentGame();
      this.eventManager.emit('game:navigation', { direction: 'prev', index: this.currentGameIndex });
    }
  }

  private handleNextGame(): void {
    this.saveCurrentGame();
    
    if (this.currentGameIndex < this.totalGames - 1) {
      this.currentGameIndex++;
      this.loadCurrentGame();
    } else {
      // Create new game or handle end of list
      this.createNewGame();
    }
    
    this.eventManager.emit('game:navigation', { direction: 'next', index: this.currentGameIndex });
  }

  private handleInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const gameData = this.getCurrentGameData();
    
    // Update the current game data based on which field changed
    switch (input.id) {
      case 'actual-start-time':
        gameData.actualStartTime = input.value;
        break;
      case 'team1-name':
        if (!gameData.team1) gameData.team1 = {};
        gameData.team1.name = input.value;
        break;
      case 'team1-score':
        if (!gameData.team1) gameData.team1 = {};
        gameData.team1.score = input.value;
        break;
      case 'team2-name':
        if (!gameData.team2) gameData.team2 = {};
        gameData.team2.name = input.value;
        break;
      case 'team2-score':
        if (!gameData.team2) gameData.team2 = {};
        gameData.team2.score = input.value;
        break;
      case 'game-comments':
        gameData.comments = input.value;
        break;
    }

    // Emit change event
    this.eventManager.emit('game:field-changed', { 
      field: input.id, 
      value: input.value,
      gameIndex: this.currentGameIndex 
    });
  }

  private saveCurrentGame(): void {
    if (this.games[this.currentGameIndex]) {
      const gameData = this.getCurrentGameData();
      this.games[this.currentGameIndex] = { ...this.games[this.currentGameIndex], ...gameData };
      
      this.eventManager.emit('game:saved', { 
        gameData: this.games[this.currentGameIndex],
        index: this.currentGameIndex 
      });
      
      this.logger.debug('Game data saved', { 
        module: 'GameForm',
        action: 'SAVE',
        data: { currentIndex: this.currentGameIndex, gameData }
      });
    }
  }

  private loadCurrentGame(): void {
    const game = this.games[this.currentGameIndex];
    
    if (game) {
      this.populateForm(game);
      this.updateNavigationButtons();
      
      this.eventManager.emit('game:loaded', { 
        gameData: game,
        index: this.currentGameIndex,
        total: this.totalGames 
      });
    }
  }

  private createNewGame(): void {
    const newGame = {
      date: new Date().toLocaleDateString(),
      location: '',
      gameNumber: (this.totalGames + 1).toString(),
      officialStartTime: '',
      division: '',
      actualStartTime: '',
      team1: { name: '', score: '0' },
      team2: { name: '', score: '0' },
      comments: ''
    };

    this.games.push(newGame);
    this.totalGames++;
    this.currentGameIndex = this.totalGames - 1;
    this.loadCurrentGame();
    
    this.eventManager.emit('game:created', { gameData: newGame, index: this.currentGameIndex });
  }

  private populateForm(gameData: any): void {
    // Update all form fields with game data
    const fields = [
      { id: 'game-date', value: gameData.date || 'MM/DD/YYYY' },
      { id: 'game-location', value: gameData.location || 'XXXXXXXXXXXXXXX' },
      { id: 'game-number', value: gameData.gameNumber || 'XXXXXXXXXXXXXXX' },
      { id: 'official-start-time', value: gameData.officialStartTime || 'XX:XX AM' },
      { id: 'game-division', value: gameData.division || 'XXXXXXXXXXXXXXX' },
      { id: 'actual-start-time', value: gameData.actualStartTime || 'XX:XX AM' },
      { id: 'team1-name', value: gameData.team1?.name || 'XXXXXXXXXXXXXXX' },
      { id: 'team1-score', value: gameData.team1?.score || 'XX.XX' },
      { id: 'team2-name', value: gameData.team2?.name || 'XXXXXXXXXXXXXXX' },
      { id: 'team2-score', value: gameData.team2?.score || 'XX.XX' },
      { id: 'game-comments', value: gameData.comments || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' }
    ];

    fields.forEach(field => {
      const element = document.getElementById(field.id) as HTMLInputElement;
      if (element) {
        element.value = field.value;
      }
    });
  }

  private updateNavigationButtons(): void {
    const prevButton = document.getElementById('prev-game') as HTMLButtonElement;
    const nextButton = document.getElementById('next-game') as HTMLButtonElement;
    
    if (prevButton) {
      prevButton.disabled = this.currentGameIndex === 0;
      prevButton.textContent = this.currentGameIndex === 0 ? 
        'FIRST GAME' : 'REVIEW PREV. GAME';
    }
    
    if (nextButton) {
      nextButton.disabled = false; // Always allow next (creates new if needed)
      nextButton.innerHTML = this.currentGameIndex === this.totalGames - 1 ?
        'SAVE & NEW GAME <i class="fas fa-plus"></i>' :
        'SAVE & NEXT GAME <i class="fas fa-chevron-right"></i>';
    }
  }

  private getCurrentGameData(): any {
    return {
      actualStartTime: (document.getElementById('actual-start-time') as HTMLInputElement)?.value || '',
      team1: {
        name: (document.getElementById('team1-name') as HTMLInputElement)?.value || '',
        score: (document.getElementById('team1-score') as HTMLInputElement)?.value || '0'
      },
      team2: {
        name: (document.getElementById('team2-name') as HTMLInputElement)?.value || '',
        score: (document.getElementById('team2-score') as HTMLInputElement)?.value || '0'
      },
      comments: (document.getElementById('game-comments') as HTMLInputElement)?.value || ''
    };
  }

  private loadStreamGames(_streamData: any): void {
    // This would typically load games from the selected stream/spreadsheet
    // For now, create sample data
    const sampleGames = [
      {
        date: '11/06/2025',
        location: 'Main Field',
        gameNumber: 'G001',
        officialStartTime: '10:00 AM',
        division: 'Division A',
        actualStartTime: '10:05 AM',
        team1: { name: 'Team Alpha', score: '2' },
        team2: { name: 'Team Beta', score: '1' },
        comments: 'Good game, weather was perfect'
      },
      {
        date: '11/06/2025',
        location: 'Field 2',
        gameNumber: 'G002',
        officialStartTime: '12:00 PM',
        division: 'Division A',
        actualStartTime: '',
        team1: { name: 'Team Gamma', score: '0' },
        team2: { name: 'Team Delta', score: '0' },
        comments: ''
      }
    ];

    this.games = sampleGames;
    this.totalGames = sampleGames.length;
    this.currentGameIndex = 0;
    this.loadCurrentGame();
  }

  // Public methods
  public getCurrentGame(): any {
    return this.games[this.currentGameIndex];
  }

  public getGameCount(): { current: number, total: number } {
    return { current: this.currentGameIndex + 1, total: this.totalGames };
  }

  public setCurrentGame(index: number): void {
    if (index >= 0 && index < this.totalGames) {
      this.saveCurrentGame();
      this.currentGameIndex = index;
      this.loadCurrentGame();
    }
  }
}
