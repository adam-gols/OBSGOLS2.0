/**
 * Debug Panel Component - Development debugging interface
 * Provides real-time monitoring and control for development
 */

import { log } from '@utils/logger';
import { eventBus, Events } from '@core/event-manager';
import { settingsManager } from '@core/settings-manager';
import { serviceHealth } from '@core/service-health';
import { widgetController } from '@core/widget-controller';

export class DebugPanel {
  private element: HTMLElement | null = null;
  private isVisible = false;
  private updateInterval?: NodeJS.Timeout;

  constructor() {
    if (!import.meta.env.DEV) {
      return; // Only available in development
    }

    this.createElement();
    this.setupEventListeners();
    this.startAutoUpdate();

    log.debug('DebugPanel initialized', { module: 'DEBUG_PANEL' });
  }

  /**
   * Create debug panel element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'gols-debug-panel';
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 80vh;
      background: rgba(15, 28, 65, 0.95);
      color: white;
      border: 1px solid #C62128;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Roboto', monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      transform: translateX(${this.isVisible ? '0' : '360px'});
      transition: transform 0.3s ease-in-out;
      backdrop-filter: blur(4px);
    `;

    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '🐛';
    toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      background: #C62128;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10001;
      font-size: 16px;
      transition: transform 0.2s ease;
    `;

    toggleButton.addEventListener('click', () => this.toggle());
    toggleButton.addEventListener('mouseenter', () => {
      toggleButton.style.transform = 'scale(1.1)';
    });
    toggleButton.addEventListener('mouseleave', () => {
      toggleButton.style.transform = 'scale(1)';
    });

    document.body.appendChild(toggleButton);
    document.body.appendChild(this.element);

    this.updateContent();
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    eventBus.on(Events.SETTINGS_CHANGED, () => this.updateContent());
    eventBus.on(Events.SERVICE_CONNECTED, () => this.updateContent());
    eventBus.on(Events.SERVICE_DISCONNECTED, () => this.updateContent());
    eventBus.on(Events.WIDGET_INITIALIZED, () => this.updateContent());
  }

  /**
   * Start auto-update for real-time monitoring
   */
  private startAutoUpdate(): void {
    this.updateInterval = setInterval(() => {
      if (this.isVisible) {
        this.updateContent();
      }
    }, 2000); // Update every 2 seconds when visible
  }

  /**
   * Toggle panel visibility
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.element) {
      this.element.style.transform = `translateX(${this.isVisible ? '0' : '360px'})`;
    }

    if (this.isVisible) {
      this.updateContent();
    }
  }

  /**
   * Update panel content
   */
  private updateContent(): void {
    if (!this.element || !this.isVisible) return;

    const widgetStatus = widgetController.getStatus();
    const healthSummary = serviceHealth.getHealthSummary();
    const settings = settingsManager.getSettings();
    const eventDebug = eventBus.getDebugInfo();

    this.element.innerHTML = `
      <div style="border-bottom: 1px solid #C62128; padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #C62128; font-size: 14px;">🎮 GOLS Debug Panel</h3>
        <div style="font-size: 10px; color: #C7C9C7;">Real-time Development Monitor</div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #4DC7E4; font-size: 12px;">Widget Status</h4>
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
          <div>State: <span style="color: ${widgetStatus.state === 'ready' ? '#37605F' : '#C62128'}">${widgetStatus.state.toUpperCase()}</span></div>
          <div>Initialized: <span style="color: ${widgetStatus.initialized ? '#37605F' : '#C62128'}">${widgetStatus.initialized ? 'YES' : 'NO'}</span></div>
          <div>Modules: ${widgetController.getModules().size}</div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #4DC7E4; font-size: 12px;">Service Health</h4>
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
          <div>Overall: <span style="color: ${healthSummary.overallHealthy ? '#37605F' : '#C62128'}">${healthSummary.healthPercentage}%</span></div>
          <div>Connected: ${healthSummary.connectedServices}/${healthSummary.totalServices}</div>
          ${Object.entries(serviceHealth.getAllServiceHealth()).map(([service, health]) => 
            `<div>${service}: <span style="color: ${health.status === 'connected' ? '#37605F' : '#C62128'}">${health.status.toUpperCase()}</span></div>`
          ).join('')}
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #4DC7E4; font-size: 12px;">Event Bus</h4>
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
          <div>Events: ${eventDebug.registeredEvents.length}</div>
          <div>Recent: ${eventDebug.recentEvents.length}</div>
          <details style="margin-top: 4px;">
            <summary style="cursor: pointer; color: #C7C9C7;">Recent Events</summary>
            <div style="max-height: 100px; overflow-y: auto; margin-top: 4px; font-size: 10px;">
              ${eventDebug.recentEvents.slice(-5).map(evt => 
                `<div style="margin: 2px 0; color: #C7C9C7;">${evt.event}</div>`
              ).join('')}
            </div>
          </details>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #4DC7E4; font-size: 12px;">Settings</h4>
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
          <div>Version: ${settings.version}</div>
          <div>Debug Mode: <span style="color: ${settings.ui.debugMode ? '#37605F' : '#C62128'}">${settings.ui.debugMode ? 'ON' : 'OFF'}</span></div>
          <div>Theme: ${settings.ui.theme}</div>
          <details style="margin-top: 4px;">
            <summary style="cursor: pointer; color: #C7C9C7;">Session State</summary>
            <div style="margin-top: 4px; font-size: 10px;">
              <div>Event: ${settings.session.lastSelectedEvent || 'None'}</div>
              <div>Site Stream: ${settings.session.lastSelectedSiteStream || 'None'}</div>
            </div>
          </details>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #4DC7E4; font-size: 12px;">Actions</h4>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button onclick="window.GOLS_DEBUG.log.clear()" style="
            background: #37605F; color: white; border: none; padding: 4px 8px; 
            border-radius: 3px; font-size: 10px; cursor: pointer;
          ">Clear Log</button>
          <button onclick="console.table(window.GOLS_DEBUG.widgetController.getDebugInfo())" style="
            background: #C62128; color: white; border: none; padding: 4px 8px; 
            border-radius: 3px; font-size: 10px; cursor: pointer;
          ">Debug Info</button>
          <button onclick="location.reload()" style="
            background: #0F1C41; color: white; border: none; padding: 4px 8px; 
            border-radius: 3px; font-size: 10px; cursor: pointer;
          ">Reload</button>
        </div>
      </div>

      <div style="font-size: 10px; color: #C7C9C7; text-align: center;">
        Last Update: ${new Date().toLocaleTimeString()}
      </div>
    `;
  }

  /**
   * Destroy the debug panel
   */
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.element) {
      this.element.remove();
    }
  }
}

// Auto-initialize in development
if (import.meta.env.DEV) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DebugPanel());
  } else {
    new DebugPanel();
  }
}
