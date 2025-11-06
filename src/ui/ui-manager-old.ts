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
    this.logger.info('Initializing UI Manager', {
      module: 'UI',
      action: 'INIT'
    });

    try {
      // Load and inject HTML template
      console.log('📄 Loading UI template...');
      await this.loadTemplate();
      
      // Initialize all UI components
      console.log('🔧 Initializing UI components...');
      this.initializeComponents();
      
      // Set up global UI event listeners
      console.log('📡 Setting up global event listeners...');
      this.setupGlobalEventListeners();
      
      // Apply initial UI state
      console.log('🎛️ Applying initial UI state...');
      this.applyInitialState();
      
      this.isInitialized = true;
      
      console.log('✅ UI Manager initialized successfully');
      this.logger.info('UI Manager initialized successfully', {
        module: 'UI',
        action: 'INIT_SUCCESS'
      });
      
      this.eventManager.emit('ui:initialized');
      
    } catch (error) {
      console.error('❌ UI Manager initialization failed:', error);
      this.logger.error('Failed to initialize UI Manager', {
        module: 'UI',
        action: 'INIT_ERROR'
      }, error as Error);
      
      this.eventManager.emit('ui:init-error', { error });
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
      <!-- Compact Header -->
      <header class="gols-compact-header">
        <div class="gols-logo">
          <span class="gols-logo-text">GOLS Widget</span>
        </div>
        <div class="gols-connection-status">
          <div class="gols-status-indicator" id="connection-status">
            <i class="fas fa-circle"></i>
            <span class="gols-status-text">Ready</span>
          </div>
        </div>
      </header>

      <!-- Compact Main Content -->
      <main class="gols-compact-main">
        <!-- Top Row: Event Selection (left) and Site Stream (right) -->
        <div class="gols-top-controls">
          <div class="gols-event-control">
            <label class="gols-compact-label">Event</label>
            <div class="gols-event-selector">
              <select id="event-selector" class="gols-compact-select">
                <option value="">Loading...</option>
              </select>
              <button id="refresh-events" class="gols-compact-button">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>

          <div class="gols-stream-control">
            <label class="gols-compact-label">Stream</label>
            <select id="stream-selector" class="gols-compact-select">
              <option value="">Select...</option>
              <option value="main">Main</option>
              <option value="secondary">Secondary</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
        </div>

        <!-- Game Section with Navigation and Details -->
        <div class="gols-game-section">
          <!-- Game Navigation and Recording Controls -->
          <div class="gols-game-controls">
            <div class="gols-game-navigation">
              <button id="prev-game" class="gols-nav-button" disabled>
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="gols-game-counter" id="game-counter">0 / 0</span>
              <button id="next-game" class="gols-nav-button" disabled>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div class="gols-recording-controls">
              <button id="start-recording" class="gols-record-button gols-record-start">
                <i class="fas fa-play"></i>
              </button>
              <button id="stop-recording" class="gols-record-button gols-record-stop" disabled>
                <i class="fas fa-stop"></i>
              </button>
              <span class="gols-recording-time" id="recording-time">00:00</span>
            </div>
          </div>

          <!-- Game Details Display -->
          <div class="gols-game-details" id="game-details">
            <div class="gols-teams-row">
              <div class="gols-team-compact">
                <span class="gols-team-name" id="home-team">Home Team</span>
                <span class="gols-team-score" id="home-score">0</span>
              </div>
              <div class="gols-vs-compact">VS</div>
              <div class="gols-team-compact">
                <span class="gols-team-name" id="away-team">Away Team</span>
                <span class="gols-team-score" id="away-score">0</span>
              </div>
            </div>
            
            <div class="gols-game-meta">
              <span class="gols-game-status" id="game-status">Upcoming</span>
              <span class="gols-game-time" id="game-time">--:--</span>
            </div>
          </div>
        </div>
      </main>

      <!-- Compact Settings Toggle -->
      <div class="gols-settings-toggle">
        <button id="toggle-settings" class="gols-settings-button">
          <i class="fas fa-cog"></i>
        </button>
      </div>

      <!-- Settings Panel (hidden by default) -->
      <div class="gols-settings-overlay" id="settings-overlay" style="display: none;">
        <div class="gols-settings-panel-compact">
          <div class="gols-settings-header">
            <h3>Settings</h3>
            <button id="close-settings" class="gols-close-button">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="gols-settings-content">
            <!-- Google Sheets Settings -->
            <div class="gols-settings-group">
              <h4>Google Sheets</h4>
              <input type="url" id="sheets-url" class="gols-input" placeholder="Spreadsheet URL">
              <input type="text" id="sheets-api-key" class="gols-input" placeholder="API Key">
              <button id="test-sheets-connection" class="gols-button">Test Connection</button>
            </div>

            <!-- OBS Settings -->
            <div class="gols-settings-group">
              <h4>OBS WebSocket</h4>
              <input type="text" id="obs-host" class="gols-input" value="localhost" placeholder="Host">
              <input type="number" id="obs-port" class="gols-input" value="4455" placeholder="Port">
              <input type="password" id="obs-password" class="gols-input" placeholder="Password">
              <button id="test-obs-connection" class="gols-button">Test Connection</button>
            </div>

            <div class="gols-settings-actions">
              <button id="save-settings" class="gols-button gols-button-primary">Save</button>
              <button id="reset-settings" class="gols-button gols-button-danger">Reset</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="gols-notifications" id="notifications-area"></div>

      <!-- Loading Overlay -->
      <div class="gols-loading-overlay" id="loading-overlay" style="display: none;">
        <div class="gols-spinner"></div>
        <span class="gols-loading-text">Loading...</span>
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

      // Initialize event selector
      this.eventSelector = new EventSelector(
        this.eventManager,
        this.settingsManager,
        this.logger
      );

      // Store reference for potential future use
      if (this.eventSelector.isReady()) {
        this.logger.debug('Event selector ready', { module: 'UI' });
      }

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

  private setupGlobalEventListeners(): void {
    // Handle connection status updates
    this.eventManager.on('connection:status', this.updateConnectionStatus.bind(this));
    
    // Handle loading states
    this.eventManager.on('loading:show', this.showLoading.bind(this));
    this.eventManager.on('loading:hide', this.hideLoading.bind(this));
    
    // Handle debug panel toggle
    this.eventManager.on('debug:toggle', this.handleDebugToggle.bind(this));
    
    // Handle errors
    this.eventManager.on('widget:error', this.handleGlobalError.bind(this));
    
    // Handle keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + D: Toggle debug panel
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        const settings = this.settingsManager.getUISettings();
        this.eventManager.emit('debug:toggle', { enabled: !settings.debugMode });
      }
      
      // Ctrl/Cmd + S: Save settings
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        this.settingsManager.saveSettings();
        if (this.notificationsManager) {
          this.notificationsManager.showSuccess('Settings saved');
        }
      }
      
      // Escape: Close any open panels
      if (event.key === 'Escape') {
        // This could be expanded to close specific panels
        this.logger.debug('Escape key pressed', {
          module: 'UI',
          action: 'KEYBOARD_ESCAPE'
        });
      }
    });
  }

  private applyInitialState(): void {
    const settings = this.settingsManager.getSettings();
    
    // Apply theme
    document.body.className = `gols-theme-${settings.ui.theme}`;
    
    // Set debug mode
    this.handleDebugToggle({ enabled: settings.ui.debugMode });
    
    // Update connection status
    this.updateConnectionStatus({
      type: 'initializing',
      message: 'Initializing connections...',
      timestamp: new Date()
    });
  }

  private updateConnectionStatus(data: { type: string; message: string; timestamp: Date }): void {
    const statusIndicator = document.getElementById('connection-status');
    if (!statusIndicator) return;

    const iconElement = statusIndicator.querySelector('i');
    const textElement = statusIndicator.querySelector('.gols-status-text') as HTMLElement;

    if (iconElement) {
      // Remove all status classes
      iconElement.className = 'fas fa-circle';
      
      // Add appropriate status class
      switch (data.type) {
        case 'connected':
          iconElement.classList.add('gols-status-connected');
          break;
        case 'disconnected':
          iconElement.classList.add('gols-status-disconnected');
          break;
        case 'error':
          iconElement.classList.add('gols-status-error');
          break;
        case 'initializing':
        default:
          iconElement.classList.add('gols-status-connecting');
          break;
      }
    }

    if (textElement) {
      textElement.textContent = data.message;
    }
  }

  private showLoading(data?: { message?: string }): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.gols-loading-text') as HTMLElement;
    
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    if (loadingText && data?.message) {
      loadingText.textContent = data.message;
    }
  }

  private hideLoading(): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  private handleDebugToggle(data: { enabled: boolean }): void {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;

    if (data.enabled) {
      debugPanel.style.display = 'block';
      document.body.classList.add('gols-debug-mode');
    } else {
      debugPanel.style.display = 'none';
      document.body.classList.remove('gols-debug-mode');
    }

    // Update settings
    this.settingsManager.updateUISettings({
      debugMode: data.enabled
    });
  }

  private handleGlobalError(data: { source: string; message: string; error?: any }): void {
    if (this.notificationsManager) {
      this.notificationsManager.showError(
        `${data.source}: ${data.message}`,
        7000 // Longer duration for errors
      );
    }
  }

  // Public methods for external access
  public getNotificationsManager(): NotificationsManager | null {
    return this.notificationsManager;
  }

  public getControlPanel(): ControlPanel | null {
    return this.controlPanel;
  }

  public getGameNavigator(): GameNavigator | null {
    return this.gameNavigator;
  }

  public getSettingsPanel(): SettingsPanel | null {
    return this.settingsPanel;
  }

  public getDebugPanel(): DebugPanel | null {
    return this.debugPanel;
  }

  public showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number): string | null {
    if (!this.notificationsManager) return null;
    
    switch (type) {
      case 'success': return this.notificationsManager.showSuccess(message, duration);
      case 'error': return this.notificationsManager.showError(message, duration);
      case 'warning': return this.notificationsManager.showWarning(message, duration);
      case 'info': return this.notificationsManager.showInfo(message, duration);
      default: return null;
    }
  }

  public jumpToGame(gameId: string): void {
    if (this.gameNavigator) {
      this.gameNavigator.jumpToGame(gameId);
    }
  }

  public getCurrentGame(): any {
    if (this.gameNavigator) {
      return this.gameNavigator.getCurrentGameData();
    }
    return null;
  }

  public destroy(): void {
    this.logger.info('Destroying UI Manager', {
      module: 'UI',
      action: 'DESTROY'
    });

    // Destroy all components
    if (this.controlPanel) {
      this.controlPanel.destroy();
      this.controlPanel = null;
    }

    if (this.gameNavigator) {
      this.gameNavigator.destroy();
      this.gameNavigator = null;
    }

    if (this.settingsPanel) {
      this.settingsPanel.destroy();
      this.settingsPanel = null;
    }

    if (this.notificationsManager) {
      this.notificationsManager.destroy();
      this.notificationsManager = null;
    }

    if (this.debugPanel) {
      this.debugPanel.destroy();
      this.debugPanel = null;
    }

    // Remove widget from DOM
    const widgetContainer = document.getElementById('gols-widget');
    if (widgetContainer) {
      widgetContainer.remove();
    }

    this.isInitialized = false;
  }
}
