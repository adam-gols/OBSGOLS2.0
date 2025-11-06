import { EventManager } from '../core/event-manager';
import { SettingsManager } from '../core/settings-manager';
import { Logger } from '../utils/logger';

// Import UI components
import { ControlPanel } from './components/control-panel';
import { GameNavigator } from './components/game-navigator';
import { SettingsPanel } from './components/settings-panel';
import { NotificationsManager } from './components/notifications';
import { DebugPanel } from './components/debug-panel';
import { EventSelector } from './components/event-selector';

// Import game info styles
import './styles/game-info.css';

export class UIManager {
  private eventManager: EventManager;
  private settingsManager: SettingsManager;
  private logger: Logger;
  
  // UI Components
  private controlPanel: ControlPanel | null = null;
  private gameNavigator: GameNavigator | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private notificationsManager: NotificationsManager | null = null;
  private debugPanel: DebugPanel | null = null;
  private eventSelector: EventSelector | null = null;

  private isInitialized = false;

  constructor(
    eventManager: EventManager,
    settingsManager: SettingsManager,
    logger: Logger
  ) {
    this.eventManager = eventManager;
    this.settingsManager = settingsManager;
    this.logger = logger;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('UI Manager already initialized', {
        module: 'UI',
        action: 'INIT_DUPLICATE'
      });
      return;
    }

    console.log('🎨 Starting UI Manager initialization...');

    try {
      // Load the UI template first
      await this.loadTemplate();
      
      // Initialize all UI components
      this.initializeComponents();
      
      // Bind global event listeners
      this.bindGlobalEvents();
      
      this.isInitialized = true;
      
      this.logger.debug('UI Manager initialized successfully', {
        module: 'UI',
        action: 'INIT_SUCCESS'
      });
      
      // Emit initialization complete event
      this.eventManager.emit('ui:initialized');
      
      console.log('✅ UI Manager initialization complete');
      
    } catch (error) {
      this.logger.error('Failed to initialize UI Manager', {
        module: 'UI',
        action: 'INIT_ERROR'
      }, error as Error);
      
      throw error;
    }
  }

  private async loadTemplate(): Promise<void> {
    try {
      // Get the existing widget container
      const widgetContainer = document.getElementById('gols-widget');
      
      if (!widgetContainer) {
        throw new Error('Widget container (#gols-widget) not found in DOM');
      }
      
      // Create the template content directly
      const templateContent = this.createTemplateContent();
      
      // Replace the container content with template content
      widgetContainer.innerHTML = templateContent;
      
      this.logger.debug('UI template loaded and injected', {
        module: 'UI',
        action: 'TEMPLATE_LOADED'
      });
      
    } catch (error) {
      this.logger.error('Failed to load UI template', {
        module: 'UI',
        action: 'TEMPLATE_ERROR'
      }, error as Error);
      
      // Fallback to basic structure if template loading fails
      this.createFallbackTemplate();
    }
  }

  private createTemplateContent(): string {
    return `
      <!-- Header -->
      <header class="gols-header">
        <div class="gols-logo-section">
          <div class="gols-logo">GO<br>LS</div>
          <div class="gols-brand">GAME ON<br>LIVE STUDIO</div>
        </div>
        <div class="gols-title">GAME INFO</div>
        <button id="toggle-settings" class="gols-settings-btn">
          <i class="fas fa-cog"></i>
        </button>
      </header>

      <!-- Top Controls -->
      <section class="gols-top-controls">
        <div class="gols-control-group">
          <label class="gols-control-label">EVENT</label>
          <select id="event-selector" class="gols-dropdown">
            <option value="">Loading events...</option>
          </select>
        </div>
        <div class="gols-control-group">
          <label class="gols-control-label">STREAM</label>
          <select id="stream-selector" class="gols-dropdown">
            <option value="">Select stream...</option>
          </select>
        </div>
      </section>

      <!-- Game Info Grid -->
      <section class="gols-game-info">
        <div class="gols-info-item">
          <span class="gols-info-label">DATE:</span>
          <input type="text" class="gols-info-value" id="game-date" value="MM/DD/YYYY" readonly>
        </div>
        <div class="gols-info-item">
          <span class="gols-info-label">LOCATION:</span>
          <input type="text" class="gols-info-value" id="game-location" value="XXXXXXXXXXXXXXX" readonly>
        </div>
        <div class="gols-info-item">
          <span class="gols-info-label">GAME #:</span>
          <input type="text" class="gols-info-value" id="game-number" value="XXXXXXXXXXXXXXX" readonly>
        </div>
        <div class="gols-info-item">
          <span class="gols-info-label">OFFICIAL START TIME:</span>
          <input type="text" class="gols-info-value" id="official-start-time" value="XX:XX AM" readonly>
        </div>
        <div class="gols-info-item">
          <span class="gols-info-label">DIVISION:</span>
          <input type="text" class="gols-info-value" id="game-division" value="XXXXXXXXXXXXXXX" readonly>
        </div>
        <div class="gols-info-item">
          <span class="gols-info-label">ACTUAL START TIME:</span>
          <input type="text" class="gols-info-value highlight" id="actual-start-time" value="XX:XX AM">
        </div>
      </section>

      <!-- Teams and Scores -->
      <section class="gols-teams-section">
        <div class="gols-teams-header">
          <div class="gols-team-label">TEAM 1</div>
          <div class="gols-score-label">SCORE</div>
          <div class="gols-team-label">TEAM 2</div>
          <div class="gols-score-label">SCORE</div>
        </div>
        <div class="gols-teams-inputs">
          <input type="text" class="gols-team-input" id="team1-name" value="XXXXXXXXXXXXXXX">
          <input type="text" class="gols-score-input" id="team1-score" value="XX.XX">
          <input type="text" class="gols-team-input" id="team2-name" value="XXXXXXXXXXXXXXX">
          <input type="text" class="gols-score-input" id="team2-score" value="XX.XX">
        </div>
      </section>

      <!-- Comments -->
      <section class="gols-comments-section">
        <label class="gols-comments-label">COMMENTS:</label>
        <input type="text" class="gols-comments-input" id="game-comments" value="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX">
      </section>

      <!-- Navigation -->
      <section class="gols-navigation">
        <button id="prev-game" class="gols-nav-btn">
          <i class="fas fa-chevron-left"></i>
          REVIEW PREV. GAME
        </button>
        <button id="next-game" class="gols-nav-btn">
          SAVE & NEXT GAME
          <i class="fas fa-chevron-right"></i>
        </button>
      </section>

      <!-- Settings Panel (hidden by default) -->
      <div class="gols-settings-overlay" id="settings-overlay" style="display: none;">
        <div class="gols-settings-panel">
          <div class="gols-settings-header">
            <h3>Settings</h3>
            <button id="close-settings" class="gols-close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="gols-settings-content">
            <!-- Google Sheets Settings -->
            <div class="gols-settings-group">
              <h4>Google Sheets</h4>
              <input type="url" id="sheets-url" class="gols-settings-input" placeholder="File Cabinet Spreadsheet URL">
              <input type="text" id="sheets-api-key" class="gols-settings-input" placeholder="API Key">
              <button id="test-sheets-connection" class="gols-settings-btn">Test Connection</button>
            </div>

            <!-- OBS Settings -->
            <div class="gols-settings-group">
              <h4>OBS WebSocket</h4>
              <input type="text" id="obs-host" class="gols-settings-input" value="localhost" placeholder="Host">
              <input type="number" id="obs-port" class="gols-settings-input" value="4455" placeholder="Port">
              <input type="password" id="obs-password" class="gols-settings-input" placeholder="Password">
              <button id="test-obs-connection" class="gols-settings-btn">Test Connection</button>
            </div>

            <!-- Singular Live Settings -->
            <div class="gols-settings-group">
              <h4>Singular Live</h4>
              <input type="text" id="singular-endpoint" class="gols-settings-input" placeholder="Data Stream Endpoint">
              <input type="text" id="singular-token" class="gols-settings-input" placeholder="Private Token">
              <button id="test-singular-connection" class="gols-settings-btn">Test Connection</button>
            </div>

            <div style="margin-top: 16px; text-align: right;">
              <button id="reset-settings" class="gols-settings-btn secondary">Reset</button>
              <button id="save-settings" class="gols-settings-btn">Save</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="gols-notifications" id="notifications-area"></div>

      <!-- Loading Overlay -->
      <div class="gols-loading-overlay" id="loading-overlay" style="display: none;">
        <div class="gols-spinner"></div>
        <div class="gols-loading-text">Loading...</div>
      </div>
    `;
  }

  private createFallbackTemplate(): void {
    const widgetContainer = document.getElementById('gols-widget');
    if (!widgetContainer) return;

    widgetContainer.innerHTML = `
      <div class="gols-error-state">
        <h2>GOLS Widget</h2>
        <p>Failed to load UI template, using fallback mode.</p>
        <div id="notifications-area"></div>
      </div>
    `;

    this.logger.warn('Using fallback template due to template loading failure', {
      module: 'UI',
      action: 'FALLBACK_TEMPLATE'
    });
  }

  private initializeComponents(): void {
    this.logger.debug('Initializing UI components', {
      module: 'UI',
      action: 'INIT_COMPONENTS'
    });

    try {
      // Initialize notifications first (other components may need it)
      this.notificationsManager = new NotificationsManager(
        this.eventManager,
        this.logger
      );

      // Initialize control panel
      this.controlPanel = new ControlPanel(
        this.eventManager,
        this.settingsManager,
        this.logger
      );

      // Initialize event selector
      this.eventSelector = new EventSelector(
        this.eventManager,
        this.settingsManager,
        this.logger
      );

      // Initialize game navigator
      this.gameNavigator = new GameNavigator(
        this.eventManager,
        this.settingsManager,
        this.logger
      );

      // Initialize settings panel
      this.settingsPanel = new SettingsPanel(
        this.eventManager,
        this.settingsManager,
        this.logger
      );

      // Initialize debug panel
      this.debugPanel = new DebugPanel();

      this.logger.debug('All UI components initialized', {
        module: 'UI',
        action: 'COMPONENTS_READY'
      });

    } catch (error) {
      this.logger.error('Failed to initialize UI components', {
        module: 'UI',
        action: 'COMPONENTS_ERROR'
      }, error as Error);

      throw error;
    }
  }

  private bindGlobalEvents(): void {
    // Bind keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Settings toggle with 'S' key
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const activeElement = document.activeElement;
          // Only trigger if not typing in an input
          if (!activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
            e.preventDefault();
            this.eventManager.emit('ui:toggle-settings');
          }
        }
      }

      // Debug toggle with 'D' key
      if (e.key === 'd' || e.key === 'D') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const activeElement = document.activeElement;
          if (!activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
            e.preventDefault();
            this.eventManager.emit('ui:toggle-debug');
          }
        }
      }
    });

    // Listen for browser resize
    window.addEventListener('resize', () => {
      this.eventManager.emit('ui:resize');
    });

    // Listen for focus changes
    window.addEventListener('focus', () => {
      this.eventManager.emit('ui:focus');
    });

    window.addEventListener('blur', () => {
      this.eventManager.emit('ui:blur');
    });
  }

  public destroy(): void {
    try {
      // Destroy all components
      if (this.controlPanel) {
        this.controlPanel = null;
      }
      
      if (this.gameNavigator) {
        this.gameNavigator = null;
      }
      
      if (this.settingsPanel) {
        this.settingsPanel = null;
      }
      
      if (this.notificationsManager) {
        this.notificationsManager = null;
      }
      
      if (this.debugPanel) {
        this.debugPanel = null;
      }
      
      if (this.eventSelector) {
        this.eventSelector = null;
      }

      this.isInitialized = false;

      this.logger.debug('UI Manager destroyed', {
        module: 'UI',
        action: 'DESTROY'
      });

    } catch (error) {
      this.logger.error('Error destroying UI Manager', {
        module: 'UI',
        action: 'DESTROY_ERROR'
      }, error as Error);
    }
  }

  // Public methods for external control
  public showSettings(): void {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  public hideSettings(): void {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  public showLoading(message?: string): void {
    const overlay = document.getElementById('loading-overlay');
    const textElement = document.querySelector('.gols-loading-text') as HTMLElement;
    
    if (overlay) {
      overlay.style.display = 'flex';
    }
    
    if (textElement && message) {
      textElement.textContent = message;
    }
  }

  public hideLoading(): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  public updateGameData(gameData: any): void {
    // Update game info fields
    const dateElement = document.getElementById('game-date') as HTMLInputElement;
    const locationElement = document.getElementById('game-location') as HTMLInputElement;
    const gameNumberElement = document.getElementById('game-number') as HTMLInputElement;
    const officialStartElement = document.getElementById('official-start-time') as HTMLInputElement;
    const divisionElement = document.getElementById('game-division') as HTMLInputElement;
    const actualStartElement = document.getElementById('actual-start-time') as HTMLInputElement;
    const team1NameElement = document.getElementById('team1-name') as HTMLInputElement;
    const team1ScoreElement = document.getElementById('team1-score') as HTMLInputElement;
    const team2NameElement = document.getElementById('team2-name') as HTMLInputElement;
    const team2ScoreElement = document.getElementById('team2-score') as HTMLInputElement;
    const commentsElement = document.getElementById('game-comments') as HTMLInputElement;

    if (gameData) {
      if (dateElement) dateElement.value = gameData.date || 'MM/DD/YYYY';
      if (locationElement) locationElement.value = gameData.location || 'XXXXXXXXXXXXXXX';
      if (gameNumberElement) gameNumberElement.value = gameData.gameNumber || 'XXXXXXXXXXXXXXX';
      if (officialStartElement) officialStartElement.value = gameData.officialStartTime || 'XX:XX AM';
      if (divisionElement) divisionElement.value = gameData.division || 'XXXXXXXXXXXXXXX';
      if (actualStartElement) actualStartElement.value = gameData.actualStartTime || 'XX:XX AM';
      if (team1NameElement) team1NameElement.value = gameData.team1?.name || 'XXXXXXXXXXXXXXX';
      if (team1ScoreElement) team1ScoreElement.value = gameData.team1?.score || 'XX.XX';
      if (team2NameElement) team2NameElement.value = gameData.team2?.name || 'XXXXXXXXXXXXXXX';
      if (team2ScoreElement) team2ScoreElement.value = gameData.team2?.score || 'XX.XX';
      if (commentsElement) commentsElement.value = gameData.comments || '';
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
