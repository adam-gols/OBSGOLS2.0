/**
 * Main entry point for GOLS Widget
 * Initializes the widget and handles global error catching
 */

import { log } from '@utils/logger';
import { widgetController } from '@core/widget-controller';
import '@ui/styles/main.css';

// Global error handlers
window.addEventListener('error', (event) => {
  log.critical('Global error caught', {
    module: 'MAIN',
    action: 'GLOBAL_ERROR',
    data: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  }, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  log.critical('Unhandled promise rejection', {
    module: 'MAIN',
    action: 'UNHANDLED_REJECTION',
    data: {
      reason: event.reason
    }
  });
  
  // Prevent the default console error
  event.preventDefault();
});

// OBS Browser Source detection
function detectOBSEnvironment(): boolean {
  return !!(window.obsstudio || window.obsSourceWidth || window.obsSourceHeight);
}

// Initialize widget when DOM is ready
async function initializeWidget(): Promise<void> {
  const isOBS = detectOBSEnvironment();
  
  log.info('GOLS Widget starting up', {
    module: 'MAIN',
    action: 'STARTUP',
    data: {
      isOBS,
      userAgent: navigator.userAgent,
      windowSize: { width: window.innerWidth, height: window.innerHeight },
      location: window.location.href
    }
  });

  try {
    // Show initial loading state
    const container = document.getElementById('gols-widget');
    if (container) {
      container.innerHTML = `
        <div class="gols-loading">
          <span>Initializing Game On Live Studio Widget...</span>
        </div>
      `;
    }

    // Initialize the widget controller
    await widgetController.initialize();

    log.info('GOLS Widget initialization successful', {
      module: 'MAIN',
      action: 'STARTUP_COMPLETE'
    });

  } catch (error) {
    log.critical('Failed to initialize GOLS Widget', {
      module: 'MAIN',
      action: 'STARTUP_FAILED'
    }, error as Error);

    // Show error state
    const container = document.getElementById('gols-widget');
    if (container) {
      container.innerHTML = `
        <div class="gols-error-state" style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: rgba(240, 239, 239, 0.95);
          padding: 24px;
        ">
          <div style="
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            text-align: center;
          ">
            <h2 style="
              color: #C62128;
              font-family: 'Oswald', 'Arial Black', sans-serif;
              font-size: 24px;
              margin-bottom: 16px;
            ">⚠️ Initialization Failed</h2>
            <p style="
              color: #000000;
              font-family: 'Roboto', 'Arial', sans-serif;
              margin-bottom: 16px;
            ">The Game On Live Studio widget could not start properly.</p>
            <button onclick="location.reload()" style="
              background-color: #C62128;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              font-family: 'Roboto', 'Arial', sans-serif;
              font-weight: 500;
              cursor: pointer;
            ">Reload Widget</button>
          </div>
        </div>
      `;
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  // DOM already loaded
  initializeWidget();
}

// Export for debugging in development
if (import.meta.env.DEV) {
  (window as any).GOLS_DEBUG = {
    widgetController,
    log
  };
  
  log.debug('Debug objects attached to window.GOLS_DEBUG', {
    module: 'MAIN',
    action: 'DEBUG_SETUP'
  });
}
