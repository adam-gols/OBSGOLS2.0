/**
 * Widget Controller - Main orchestrator for the GOLS Widget
 * Central coordination point for all widget subsystems
 */

import { logger } from '../utils/logger.js';
import { eventBus, Events, EventData } from './event-manager.js';
import { settingsManager } from './settings-manager.js';
import { serviceHealth, ServiceStatus } from './service-health.js';
import { UIManager } from '../ui/ui-manager.js';
import { EventDataManager } from '../data/event-data-manager.js';

export enum WidgetState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  LOADING = 'loading'
}

export interface WidgetStatus {
  state: WidgetState;
  initialized: boolean;
  readyServices: string[];
  errorServices: string[];
  lastStateChange: Date;
}

export class WidgetController {
  private static instance: WidgetController;
  private currentState: WidgetState = WidgetState.INITIALIZING;
  private isInitialized = false;
  private modules: Map<string, any> = new Map();
  private initializationStartTime: number;
  private eventListeners: Array<() => void> = [];
  private googleSheetsIntegration: any = null;
  private uiManager: UIManager | null = null;
  private eventDataManager: EventDataManager | null = null;

  private constructor() {
    this.initializationStartTime = performance.now();
    
    logger.debug('WidgetController created', { 
      module: 'WidgetController'
    });
    
    this.setupEventListeners();
  }

  public static getInstance(): WidgetController {
    if (!WidgetController.instance) {
      WidgetController.instance = new WidgetController();
    }
    return WidgetController.instance;
  }

  /**
   * Initialize the entire widget system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Widget already initialized', { module: 'WidgetController' });
      return;
    }

    try {
      console.log('🎛️ Widget Controller: Starting initialization...');
      logger.info('Starting widget initialization', {
        module: 'WidgetController'
      });

      this.setState(WidgetState.INITIALIZING);

      // Step 1: Initialize core systems
      console.log('🔧 Widget Controller: Initializing core services...');
      await this.initializeCoreServices();

      // Step 2: Configure from URL parameters
      console.log('🔗 Widget Controller: Configuring from URL...');
      this.configureFromURL();

      // Step 3: Initialize integrations (will be implemented in subsequent steps)
      console.log('🔌 Widget Controller: Initializing integrations...');
      await this.initializeIntegrations();

      // Step 4: Initialize UI (will be implemented in Step 4)
      console.log('🎨 Widget Controller: Initializing UI...');
      await this.initializeUI();

      // Step 5: Start health monitoring
      console.log('❤️ Widget Controller: Starting health monitoring...');
      this.startHealthMonitoring();

      // Mark as ready
      this.isInitialized = true;
      this.setState(WidgetState.READY);

      const initTime = performance.now() - this.initializationStartTime;
      
      console.log('✅ Widget Controller: Initialization completed in', initTime, 'ms');
      logger.info('Widget initialization completed', {
        module: 'WIDGET_CONTROLLER',
        action: 'INIT_COMPLETE',
        data: { 
          initializationTime: initTime,
          modules: Array.from(this.modules.keys())
        }
      });

      eventBus.emit(Events.WIDGET_INITIALIZED, {
        initializationTime: initTime,
        modules: Array.from(this.modules.keys()),
        state: this.currentState
      });

    } catch (error) {
      this.handleInitializationError(error as Error);
    }
  }

  /**
   * Initialize core services
   */
  private async initializeCoreServices(): Promise<void> {
    logger.debug('Initializing core services', {
      module: 'WIDGET_CONTROLLER',
      action: 'INIT_CORE'
    });

    // Core services are already initialized as singletons
    // Register them in the module registry
    this.registerModule('eventBus', eventBus);
    this.registerModule('settingsManager', settingsManager);
    this.registerModule('serviceHealth', serviceHealth);

    logger.info('Core services initialized', {
      module: 'WIDGET_CONTROLLER',
      action: 'CORE_READY'
    });
  }

  /**
   * Configure widget from URL parameters
   */
  private configureFromURL(): void {
    logger.debug('Configuring from URL parameters', {
      module: 'WIDGET_CONTROLLER',
      action: 'URL_CONFIG'
    });

    settingsManager.configureFromURLParams();
  }

  /**
   * Initialize integrations (placeholder for subsequent steps)
   */
  private async initializeIntegrations(): Promise<void> {
    logger.debug('Initializing integrations', {
      module: 'WidgetController'
    });

    // Initialize Google Sheets integration
    await this.initializeGoogleSheets();

    // TODO: Implement in subsequent steps
    // - OBS WebSocket (Step 5) 
    // - Singular Live (Step 6)
  }

  /**
   * Initialize Google Sheets integration
   */
  private async initializeGoogleSheets(): Promise<void> {
    try {
      // Check if we have configuration
      const googleSheetsConfig = settingsManager.getGoogleSheetsConfig();
      
      if (!googleSheetsConfig || (!googleSheetsConfig.apiKey && !googleSheetsConfig.serviceAccountKey)) {
        logger.warn('Google Sheets configuration not found, skipping initialization', {
          module: 'WidgetController'
        });
        return;
      }

      // Check environment requirements
      const isBrowser = typeof window !== 'undefined' && typeof process === 'undefined';
      
      if (isBrowser && !googleSheetsConfig.apiKey) {
        logger.warn('Browser environment requires API key for Google Sheets integration', {
          module: 'WIDGET_CONTROLLER',
          action: 'SKIP_GOOGLEAPIS',
          data: { reason: 'API key required for browser environment' }
        });
        return;
      }

      logger.info('Initializing Google Sheets integration', {
        module: 'WidgetController',
        data: { 
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          hasApiKey: !!googleSheetsConfig.apiKey,
          hasServiceAccount: !!googleSheetsConfig.serviceAccountKey,
          environment: isBrowser ? 'browser' : 'node'
        }
      });

      // Dynamic import to avoid loading googleapis in browser
      const { GoogleSheetsIntegration } = await import('../integrations/google-sheets/index.js');
      this.googleSheetsIntegration = new GoogleSheetsIntegration();
      await this.googleSheetsIntegration.initialize(googleSheetsConfig);

      // Validate sheet structures
      const validation = await this.googleSheetsIntegration.validateSheets();
      
      if (!validation.eventSheet.isValid || !validation.operationsSheet.isValid) {
        logger.warn('Google Sheets validation issues detected', {
          module: 'WidgetController',
          data: { validation }
        });
      }

      // Register with service health monitoring
      serviceHealth.addService('googleSheets', 'Google Sheets API');
      serviceHealth.updateServiceStatus('googleSheets', ServiceStatus.CONNECTED);

      this.modules.set('googleSheets', this.googleSheetsIntegration);

      // Initialize event data manager
      this.eventDataManager = new EventDataManager(eventBus);
      await this.eventDataManager.initialize(this.googleSheetsIntegration);

      logger.info('Google Sheets integration successfully initialized', {
        module: 'WidgetController'
      });

    } catch (error) {
      logger.error('Failed to initialize Google Sheets integration', {
        module: 'WidgetController',
        data: { error }
      });

      serviceHealth.updateServiceStatus('googleSheets', ServiceStatus.ERROR);
      throw error;
    }
  }

  /**
   * Initialize UI (placeholder for Step 4)
   */
  private async initializeUI(): Promise<void> {
    logger.debug('Initializing UI', {
      module: 'WIDGET_CONTROLLER',
      action: 'INIT_UI'
    });

    try {
      // Create and initialize UI Manager
      this.uiManager = new UIManager(eventBus, settingsManager, logger);
      await this.uiManager.initialize();
      
      // Register UI Manager as a module
      this.registerModule('uiManager', this.uiManager);
      
      logger.info('UI initialized successfully', {
        module: 'WIDGET_CONTROLLER',
        action: 'UI_READY'
      });
      
    } catch (error) {
      logger.error('Failed to initialize UI', {
        module: 'WIDGET_CONTROLLER',
        action: 'UI_ERROR'
      }, error as Error);
      throw error;
    }
  }

  /**
   * Start health monitoring for all services
   */
  private startHealthMonitoring(): void {
    logger.debug('Starting health monitoring', {
      module: 'WIDGET_CONTROLLER',
      action: 'START_HEALTH_MONITORING'
    });

    serviceHealth.startMonitoring();
  }

  /**
   * Set up event listeners for system coordination
   */
  private setupEventListeners(): void {
    // Listen for settings changes
    const settingsUnsubscribe = eventBus.on(Events.SETTINGS_CHANGED, (data: EventData) => {
      logger.debug('Settings changed, evaluating service reconfiguration', {
        module: 'WIDGET_CONTROLLER',
        action: 'SETTINGS_CHANGED',
        data
      });
      
      this.handleSettingsChange(data);
    });

    // Listen for service health changes
    const serviceConnectedUnsubscribe = eventBus.on(Events.SERVICE_CONNECTED, (data: EventData) => {
      logger.info(`Service connected: ${data.service}`, {
        module: 'WIDGET_CONTROLLER',
        action: 'SERVICE_CONNECTED',
        data
      });
    });

    const serviceDisconnectedUnsubscribe = eventBus.on(Events.SERVICE_DISCONNECTED, (data: EventData) => {
      logger.warn(`Service disconnected: ${data.service}`, {
        module: 'WIDGET_CONTROLLER',
        action: 'SERVICE_DISCONNECTED',
        data
      });
    });

    const serviceErrorUnsubscribe = eventBus.on(Events.SERVICE_ERROR, (data: EventData) => {
      logger.error(`Service error: ${data.service}`, {
        module: 'WIDGET_CONTROLLER',
        action: 'SERVICE_ERROR',
        data
      });
    });

    // Store unsubscribe functions for cleanup
    this.eventListeners.push(
      settingsUnsubscribe,
      serviceConnectedUnsubscribe,
      serviceDisconnectedUnsubscribe,
      serviceErrorUnsubscribe
    );
  }

  /**
   * Handle settings changes
   */
  private handleSettingsChange(data: EventData): void {
    const { section } = data;
    
    // Handle service-specific setting changes
    switch (section) {
      case 'obs':
        // TODO: Reconnect OBS if settings changed (Step 5)
        logger.debug('OBS settings changed - reconnection needed', {
          module: 'WIDGET_CONTROLLER',
          action: 'OBS_SETTINGS_CHANGED'
        });
        break;
        
      case 'singularLive':
        // TODO: Reconnect Singular Live if settings changed (Step 6)
        logger.debug('Singular Live settings changed - reconnection needed', {
          module: 'WIDGET_CONTROLLER',
          action: 'SINGULAR_SETTINGS_CHANGED'
        });
        break;
        
      case 'googleSheets':
        // TODO: Reconnect Google Sheets if settings changed (Step 3)
        logger.debug('Google Sheets settings changed - reconnection needed', {
          module: 'WIDGET_CONTROLLER',
          action: 'SHEETS_SETTINGS_CHANGED'
        });
        break;
    }
  }

  /**
   * Handle initialization errors
   */
  private handleInitializationError(error: Error): void {
    console.error('❌ Widget Controller: Initialization failed:', error);
    this.setState(WidgetState.ERROR);
    
    logger.error('Widget initialization failed', {
      module: 'WIDGET_CONTROLLER',
      action: 'INIT_FAILED'
    }, error);

    eventBus.emit(Events.WIDGET_ERROR, {
      source: 'WidgetController',
      message: 'Initialization failed',
      error: error.message,
      stack: error.stack
    });

    // Show error UI
    this.showErrorState(error);
  }

  /**
   * Show error state in UI
   */
  private showErrorState(error: Error): void {
    const container = document.getElementById('gols-widget');
    if (container) {
      container.innerHTML = `
        <div class="gols-error-state">
          <div class="gols-error-content">
            <h2 class="gols-heading-lg gols-text-red">⚠️ Widget Initialization Failed</h2>
            <p class="gols-text-md">The Game On Live Studio widget encountered an error during startup.</p>
            <details class="gols-error-details">
              <summary class="gols-text-sm gols-font-medium">Technical Details</summary>
              <pre class="gols-error-stack">${error.message}\n\n${error.stack}</pre>
            </details>
            <button class="gols-button gols-button-primary" onclick="location.reload()">
              Reload Widget
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Set widget state
   */
  private setState(newState: WidgetState): void {
    const oldState = this.currentState;
    this.currentState = newState;

    logger.debug('State changed', { 
      module: 'WidgetController',
      data: { from: oldState, to: newState }
    });

    // Update UI loading state if needed
    this.updateLoadingState();
  }

  /**
   * Update loading state in UI
   */
  private updateLoadingState(): void {
    const loadingElement = document.querySelector('.gols-loading');
    if (loadingElement) {
      if (this.currentState === WidgetState.READY) {
        loadingElement.remove();
      } else {
        loadingElement.textContent = `${this.currentState.charAt(0).toUpperCase() + this.currentState.slice(1)}...`;
      }
    }
  }

  /**
   * Register a module
   */
  public registerModule(name: string, module: any): void {
    this.modules.set(name, module);
    
    logger.debug(`Module registered: ${name}`, {
      module: 'WIDGET_CONTROLLER',
      action: 'MODULE_REGISTERED',
      data: { moduleName: name, totalModules: this.modules.size }
    });
  }

  /**
   * Get a registered module
   */
  public getModule<T = any>(name: string): T | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all registered modules
   */
  public getModules(): Map<string, any> {
    return new Map(this.modules);
  }

  /**
   * Get current widget status
   */
  public getStatus(): WidgetStatus {
    const unhealthyServices = serviceHealth.getUnhealthyServices();
    
    return {
      state: this.currentState,
      initialized: this.isInitialized,
      readyServices: Object.entries(serviceHealth.getAllServiceHealth())
        .filter(([_, health]) => health.status === ServiceStatus.CONNECTED)
        .map(([service]) => service),
      errorServices: unhealthyServices.map(({ service }) => service),
      lastStateChange: new Date()
    };
  }

  /**
   * Check if widget is ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.currentState === WidgetState.READY;
  }

  /**
   * Shutdown the widget gracefully
   */
  public async shutdown(): Promise<void> {
    logger.info('Starting widget shutdown', {
      module: 'WIDGET_CONTROLLER',
      action: 'SHUTDOWN_START'
    });

    // Stop health monitoring
    serviceHealth.stopMonitoring();
    
    // Destroy UI Manager
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }

    // Clean up event listeners
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners = [];

    // Clean up integrations
    if (this.googleSheetsIntegration) {
      // TODO: Add proper shutdown method to GoogleSheetsIntegration
      this.googleSheetsIntegration = null;
    }

    this.isInitialized = false;
    this.setState(WidgetState.INITIALIZING);

    logger.info('Widget shutdown completed', {
      module: 'WIDGET_CONTROLLER',
      action: 'SHUTDOWN_COMPLETE'
    });
  }

  /**
   * Restart the widget
   */
  public async restart(): Promise<void> {
    logger.info('Restarting widget', {
      module: 'WIDGET_CONTROLLER',
      action: 'RESTART'
    });

    await this.shutdown();
    await this.initialize();
  }

  /**
   * Get debug information
   */
  public getDebugInfo() {
    return {
      state: this.currentState,
      initialized: this.isInitialized,
      modules: Array.from(this.modules.keys()),
      eventListenerCount: this.eventListeners.length,
      initializationTime: this.isInitialized ? performance.now() - this.initializationStartTime : null,
      status: this.getStatus()
    };
  }

  /**
   * Get UI Manager instance
   */
  public getUIManager(): UIManager | null {
    return this.uiManager;
  }
}

// Export singleton instance
export const widgetController = WidgetController.getInstance();
