/**
 * GOLS Widget Main Entry Point
 * Game On Live Studio OBS Widget - TypeScript + Vite Implementation
 */

import { log } from '@utils/logger';
import '@ui/styles/main.css';

// Performance timing for initialization
const startTime = performance.now();

log.group('🎮 GOLS Widget Initialization', 1);
log.info('Starting Game On Live Studio OBS Widget...', {
  module: 'MAIN',
  action: 'INITIALIZATION',
  data: {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isOBS: !!window.obsstudio,
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
});

/**
 * Main Widget Application Class
 * Central orchestrator for the entire widget system
 */
class GOLSWidget {
  private static instance: GOLSWidget;
  private isInitialized: boolean = false;
  private modules: Map<string, any> = new Map();

  private constructor() {
    log.debug('GOLSWidget instance created', { module: 'MAIN' });
  }

  public static getInstance(): GOLSWidget {
    if (!GOLSWidget.instance) {
      GOLSWidget.instance = new GOLSWidget();
    }
    return GOLSWidget.instance;
  }

  /**
   * Initialize the widget system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('Widget already initialized, skipping...', { module: 'MAIN' });
      return;
    }

    try {
      log.info('Initializing widget systems...', { module: 'MAIN', action: 'INIT_START' });

      // Check OBS environment
      this.checkOBSEnvironment();

      // Initialize core systems (will be implemented in Step 2)
      await this.initializeCoreSystems();

      // Initialize UI (will be implemented in Step 4)
      await this.initializeUI();

      // Initialize integrations (will be implemented in Steps 3, 5, 6)
      await this.initializeIntegrations();

      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      log.perf('Widget initialization completed', initTime, 'MAIN');
      log.info('🚀 GOLS Widget ready for use!', {
        module: 'MAIN',
        action: 'INIT_COMPLETE',
        data: { initializationTime: initTime }
      });

    } catch (error) {
      log.critical('Widget initialization failed', {
        module: 'MAIN',
        action: 'INIT_FAILED'
      }, error as Error);
      
      this.handleInitializationError(error as Error);
    }

    log.groupEnd();
  }

  /**
   * Check if running in OBS Browser Source environment
   */
  private checkOBSEnvironment(): void {
    const isOBS = !!window.obsstudio;
    const obsVersion = window.obsstudio?.pluginVersion;

    log.info('Environment Check', {
      module: 'MAIN',
      action: 'ENV_CHECK',
      data: {
        isOBS,
        obsVersion,
        browserEngine: this.detectBrowserEngine(),
        sourceSize: {
          width: window.obsSourceWidth || window.innerWidth,
          height: window.obsSourceHeight || window.innerHeight
        }
      }
    });

    if (!isOBS) {
      log.warn('Not running in OBS Browser Source - some features may not work', {
        module: 'MAIN',
        action: 'ENV_WARNING'
      });
    }
  }

  /**
   * Detect browser engine for compatibility checks
   */
  private detectBrowserEngine(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chromium/Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Unknown';
  }

  /**
   * Initialize core widget systems
   * This will be expanded in Step 2
   */
  private async initializeCoreSystems(): Promise<void> {
    log.debug('Core systems initialization placeholder', { module: 'MAIN' });
    // TODO: Implement in Step 2
    // - Widget Controller
    // - Event Bus
    // - Settings Manager
    // - Service Health Monitor
  }

  /**
   * Initialize user interface
   * This will be expanded in Step 4
   */
  private async initializeUI(): Promise<void> {
    log.debug('UI initialization placeholder', { module: 'MAIN' });
    // TODO: Implement in Step 4
    // - Load widget template
    // - Initialize components
    // - Apply theming
    // - Set up event listeners
  }

  /**
   * Initialize external integrations
   * This will be expanded in Steps 3, 5, 6
   */
  private async initializeIntegrations(): Promise<void> {
    log.debug('Integrations initialization placeholder', { module: 'MAIN' });
    // TODO: Implement in subsequent steps
    // - Google Sheets API (Step 3)
    // - OBS WebSocket (Step 5)
    // - Singular Live (Step 6)
  }

  /**
   * Handle initialization errors gracefully
   */
  private handleInitializationError(error: Error): void {
    // Create minimal error UI
    const container = document.getElementById('gols-widget');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: rgba(198, 33, 40, 0.1);
          color: #C62128;
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <h2 style="margin-bottom: 16px;">⚠️ Widget Initialization Failed</h2>
          <p style="margin-bottom: 12px; max-width: 400px;">
            The Game On Live Studio widget encountered an error during startup.
          </p>
          <details style="margin-top: 16px; cursor: pointer;">
            <summary style="color: #37605F; font-weight: bold;">Technical Details</summary>
            <pre style="
              background: #F0EFEF;
              padding: 12px;
              border-radius: 4px;
              margin-top: 8px;
              text-align: left;
              font-size: 12px;
              overflow: auto;
              max-height: 200px;
            ">${error.message}\n\n${error.stack}</pre>
          </details>
        </div>
      `;
    }
  }

  /**
   * Get initialized module
   */
  public getModule(name: string): any {
    return this.modules.get(name);
  }

  /**
   * Register module
   */
  public registerModule(name: string, module: any): void {
    this.modules.set(name, module);
    log.debug(`Module registered: ${name}`, { 
      module: 'MAIN', 
      action: 'MODULE_REGISTERED',
      data: { moduleName: name }
    });
  }

  /**
   * Check if widget is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Global widget instance
 */
export const widget = GOLSWidget.getInstance();

/**
 * Initialize widget when DOM is ready
 */
function initializeWidget(): void {
  log.debug('DOM ready, starting widget initialization', { module: 'MAIN' });
  widget.initialize().catch(error => {
    log.critical('Unhandled widget initialization error', { module: 'MAIN' }, error);
  });
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  // DOM already loaded
  initializeWidget();
}

// Global error handling
window.addEventListener('error', (event) => {
  log.critical('Unhandled JavaScript error', {
    module: 'MAIN',
    action: 'GLOBAL_ERROR',
    data: {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno
    }
  }, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  log.critical('Unhandled Promise rejection', {
    module: 'MAIN',
    action: 'UNHANDLED_REJECTION',
    data: {
      reason: event.reason
    }
  });
});

// Export for OBS debugging if needed
if (window.obsstudio) {
  (window as any).golsWidget = widget;
  log.debug('Widget exposed to global scope for OBS debugging', { module: 'MAIN' });
}
