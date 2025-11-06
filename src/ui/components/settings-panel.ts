import { EventManager } from '../../core/event-manager';
import { SettingsManager } from '../../core/settings-manager';
import { Logger } from '../../utils/logger';

export class SettingsPanel {
  private eventManager: EventManager;
  private settingsManager: SettingsManager;
  private logger: Logger;
  private isExpanded = false;

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
    this.logger.debug('Initializing Settings Panel', {
      module: 'UI',
      action: 'INIT',
      data: { component: 'SettingsPanel' }
    });
    
    this.bindEventListeners();
    this.loadSettings();
    this.setupAutoSave();
    
    // Listen for external events
    this.eventManager.on('settings:changed', this.handleSettingsChanged.bind(this));
  }

  private bindEventListeners(): void {
    // Toggle panel
    const toggleButton = document.getElementById('toggle-settings') as HTMLButtonElement;
    if (toggleButton) {
      toggleButton.addEventListener('click', this.handleTogglePanel.bind(this));
    }

    // Close panel
    const closeButton = document.getElementById('close-settings') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', this.handleClosePanel.bind(this));
    }

    // Close panel when clicking overlay
    const overlay = document.getElementById('settings-overlay') as HTMLDivElement;
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.handleClosePanel();
        }
      });
    }

    // Test connections
    const testSheetsButton = document.getElementById('test-sheets-connection') as HTMLButtonElement;
    const testOBSButton = document.getElementById('test-obs-connection') as HTMLButtonElement;
    const testSingularButton = document.getElementById('test-singular-connection') as HTMLButtonElement;
    
    if (testSheetsButton) {
      testSheetsButton.addEventListener('click', this.handleTestSheetsConnection.bind(this));
    }
    
    if (testOBSButton) {
      testOBSButton.addEventListener('click', this.handleTestOBSConnection.bind(this));
    }
    
    if (testSingularButton) {
      testSingularButton.addEventListener('click', this.handleTestSingularConnection.bind(this));
    }

    // Settings actions
    const resetButton = document.getElementById('reset-settings') as HTMLButtonElement;
    const saveButton = document.getElementById('save-settings') as HTMLButtonElement;
    
    if (resetButton) {
      resetButton.addEventListener('click', this.handleResetSettings.bind(this));
    }
    
    if (saveButton) {
      saveButton.addEventListener('click', this.handleSaveSettings.bind(this));
    }

    // Input change handlers
    this.bindInputChangeHandlers();
  }

  private bindInputChangeHandlers(): void {
    // Google Sheets inputs
    const sheetsUrl = document.getElementById('sheets-url') as HTMLInputElement;
    const sheetsApiKey = document.getElementById('sheets-api-key') as HTMLInputElement;
    
    if (sheetsUrl) {
      sheetsUrl.addEventListener('change', this.handleSheetsUrlChange.bind(this));
    }
    
    if (sheetsApiKey) {
      sheetsApiKey.addEventListener('change', this.handleApiKeyChange.bind(this));
    }

    // OBS inputs
    const obsHost = document.getElementById('obs-host') as HTMLInputElement;
    const obsPort = document.getElementById('obs-port') as HTMLInputElement;
    const obsPassword = document.getElementById('obs-password') as HTMLInputElement;
    
    if (obsHost) {
      obsHost.addEventListener('change', this.handleOBSHostChange.bind(this));
    }
    
    if (obsPort) {
      obsPort.addEventListener('change', this.handleOBSPortChange.bind(this));
    }
    
    if (obsPassword) {
      obsPassword.addEventListener('change', this.handleOBSPasswordChange.bind(this));
    }

    // Singular Live inputs
    const singularEndpoint = document.getElementById('singular-endpoint') as HTMLInputElement;
    const singularToken = document.getElementById('singular-token') as HTMLInputElement;
    const singularInterval = document.getElementById('singular-interval') as HTMLInputElement;
    
    if (singularEndpoint) {
      singularEndpoint.addEventListener('change', this.handleSingularEndpointChange.bind(this));
    }
    
    if (singularToken) {
      singularToken.addEventListener('change', this.handleSingularTokenChange.bind(this));
    }
    
    if (singularInterval) {
      singularInterval.addEventListener('change', this.handleSingularIntervalChange.bind(this));
    }

    // UI settings
    const debugMode = document.getElementById('debug-mode') as HTMLInputElement;
    const autoSave = document.getElementById('auto-save') as HTMLInputElement;
    
    if (debugMode) {
      debugMode.addEventListener('change', this.handleDebugModeChange.bind(this));
    }
    
    if (autoSave) {
      autoSave.addEventListener('change', this.handleAutoSaveChange.bind(this));
    }
  }

  private loadSettings(): void {
    const settings = this.settingsManager.getSettings();
    
    // Load Google Sheets settings
    const sheetsUrl = document.getElementById('sheets-url') as HTMLInputElement;
    const sheetsApiKey = document.getElementById('sheets-api-key') as HTMLInputElement;
    
    if (sheetsUrl) {
      sheetsUrl.value = settings.googleSheets.fileCabinetUrl || '';
    }
    
    if (sheetsApiKey) {
      sheetsApiKey.value = settings.googleSheets.apiKey || '';
    }

    // Load OBS settings
    const obsHost = document.getElementById('obs-host') as HTMLInputElement;
    const obsPort = document.getElementById('obs-port') as HTMLInputElement;
    const obsPassword = document.getElementById('obs-password') as HTMLInputElement;
    
    if (obsHost) {
      obsHost.value = settings.obs.host;
    }
    
    if (obsPort) {
      obsPort.value = settings.obs.port.toString();
    }
    
    if (obsPassword) {
      obsPassword.value = settings.obs.password || '';
    }

    // Load Singular Live settings
    const singularEndpoint = document.getElementById('singular-endpoint') as HTMLInputElement;
    const singularToken = document.getElementById('singular-token') as HTMLInputElement;
    const singularInterval = document.getElementById('singular-interval') as HTMLInputElement;
    
    if (singularEndpoint) {
      singularEndpoint.value = settings.singularLive.dataStreamEndpoint || '';
    }
    
    if (singularToken) {
      singularToken.value = settings.singularLive.privateToken || '';
    }
    
    if (singularInterval) {
      singularInterval.value = settings.singularLive.updateInterval.toString();
    }

    // Load UI settings
    const debugMode = document.getElementById('debug-mode') as HTMLInputElement;
    const autoSave = document.getElementById('auto-save') as HTMLInputElement;
    
    if (debugMode) {
      debugMode.checked = settings.ui.debugMode;
    }
    
    if (autoSave) {
      autoSave.checked = settings.ui.autoSave;
    }
  }

  private setupAutoSave(): void {
    // Auto-save is handled by individual input change handlers
    this.logger.debug('Auto-save setup complete', {
      module: 'UI',
      action: 'SETUP_AUTOSAVE',
      data: { component: 'SettingsPanel' }
    });
  }

  private handleTogglePanel(): void {
    this.isExpanded = !this.isExpanded;
    
    const settingsOverlay = document.getElementById('settings-overlay') as HTMLDivElement;
    
    if (settingsOverlay) {
      settingsOverlay.style.display = this.isExpanded ? 'flex' : 'none';
    }
    
    this.logger.debug('Settings panel toggled', {
      module: 'UI',
      action: 'TOGGLE_PANEL',
      data: { component: 'SettingsPanel', isExpanded: this.isExpanded }
    });
  }

  private handleClosePanel(): void {
    this.isExpanded = false;
    
    const settingsOverlay = document.getElementById('settings-overlay') as HTMLDivElement;
    
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
    }
    
    this.logger.debug('Settings panel closed', {
      module: 'UI',
      action: 'CLOSE_PANEL',
      data: { component: 'SettingsPanel' }
    });
  }

  // Google Sheets change handlers
  private handleSheetsUrlChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const url = target.value.trim();
    
    this.settingsManager.updateGoogleSheetsSettings({
      fileCabinetUrl: url
    });
    
    this.logger.debug('Google Sheets URL updated', {
      module: 'UI',
      action: 'UPDATE_SHEETS_URL',
      data: { component: 'SettingsPanel' }
    });
  }

  private handleApiKeyChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const apiKey = target.value.trim();
    
    if (apiKey) {
      this.settingsManager.updateGoogleSheetsSettings({
        apiKey: apiKey
      });
    }
    
    this.logger.debug('API key updated', {
      module: 'UI',
      action: 'API_KEY_UPDATED',
      data: { component: 'SettingsPanel', hasKey: !!apiKey }
    });
  }

  // OBS change handlers
  private handleOBSHostChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const host = target.value.trim();
    
    this.settingsManager.updateOBSSettings({
      host: host || 'localhost'
    });
  }

  private handleOBSPortChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const port = parseInt(target.value) || 4455;
    
    this.settingsManager.updateOBSSettings({
      port: port
    });
  }

  private handleOBSPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const password = target.value.trim();
    
    if (password) {
      this.settingsManager.updateOBSSettings({
        password: password
      });
    } else {
      const current = this.settingsManager.getOBSSettings();
      const updated = { ...current };
      delete updated.password;
      this.settingsManager.updateOBSSettings(updated);
    }
  }

  // Singular Live change handlers
  private handleSingularEndpointChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const endpoint = target.value.trim();
    
    if (endpoint) {
      this.settingsManager.updateSingularLiveSettings({
        dataStreamEndpoint: endpoint
      });
    } else {
      const current = this.settingsManager.getSingularLiveSettings();
      const updated = { ...current };
      delete updated.dataStreamEndpoint;
      this.settingsManager.updateSingularLiveSettings(updated);
    }
  }

  private handleSingularTokenChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const token = target.value.trim();
    
    if (token) {
      this.settingsManager.updateSingularLiveSettings({
        privateToken: token
      });
    } else {
      const current = this.settingsManager.getSingularLiveSettings();
      const updated = { ...current };
      delete updated.privateToken;
      this.settingsManager.updateSingularLiveSettings(updated);
    }
  }

  private handleSingularIntervalChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const interval = parseInt(target.value) || 5000;
    
    this.settingsManager.updateSingularLiveSettings({
      updateInterval: Math.max(500, interval) // Minimum 500ms
    });
  }

  // UI change handlers
  private handleDebugModeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const debugMode = target.checked;
    
    this.settingsManager.updateUISettings({
      debugMode: debugMode
    });
    
    // Toggle debug panel
    this.eventManager.emit('debug:toggle', { enabled: debugMode });
  }

  private handleAutoSaveChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const autoSave = target.checked;
    
    this.settingsManager.updateUISettings({
      autoSave: autoSave
    });
  }

  // Test connection handlers
  private async handleTestSheetsConnection(): Promise<void> {
    const button = document.getElementById('test-sheets-connection') as HTMLButtonElement;
    
    try {
      this.setButtonLoading(button, true);
      
      this.logger.debug('Testing Google Sheets connection', {
        module: 'UI',
        action: 'TEST_SHEETS_CONNECTION',
        data: { component: 'SettingsPanel' }
      });
      
      this.eventManager.emit('sheets:test-connection');
      
      // Listen for connection result
      const timeout = setTimeout(() => {
        this.showError('Connection test timed out');
        this.setButtonLoading(button, false);
      }, 10000);
      
      this.eventManager.once('sheets:connection-result', (result) => {
        clearTimeout(timeout);
        this.setButtonLoading(button, false);
        
        if (result.success) {
          this.showSuccess('Google Sheets connection successful');
        } else {
          this.showError(`Google Sheets connection failed: ${result.error}`);
        }
      });
      
    } catch (error) {
      this.setButtonLoading(button, false);
      this.logger.error('Failed to test sheets connection', {
        module: 'UI',
        action: 'TEST_SHEETS_ERROR',
        data: { component: 'SettingsPanel' }
      }, error as Error);
      this.showError('Failed to test connection');
    }
  }

  private async handleTestOBSConnection(): Promise<void> {
    const button = document.getElementById('test-obs-connection') as HTMLButtonElement;
    
    try {
      this.setButtonLoading(button, true);
      
      this.logger.debug('Testing OBS connection', {
        module: 'UI',
        action: 'TEST_OBS_CONNECTION',
        data: { component: 'SettingsPanel' }
      });
      
      this.eventManager.emit('obs:test-connection');
      
      // Listen for connection result
      const timeout = setTimeout(() => {
        this.showError('OBS connection test timed out');
        this.setButtonLoading(button, false);
      }, 10000);
      
      this.eventManager.once('obs:connection-result', (result) => {
        clearTimeout(timeout);
        this.setButtonLoading(button, false);
        
        if (result.success) {
          this.showSuccess('OBS connection successful');
        } else {
          this.showError(`OBS connection failed: ${result.error}`);
        }
      });
      
    } catch (error) {
      this.setButtonLoading(button, false);
      this.logger.error('Failed to test OBS connection', {
        module: 'UI',
        action: 'TEST_OBS_ERROR',
        data: { component: 'SettingsPanel' }
      }, error as Error);
      this.showError('Failed to test connection');
    }
  }

  private async handleTestSingularConnection(): Promise<void> {
    const button = document.getElementById('test-singular-connection') as HTMLButtonElement;
    
    try {
      this.setButtonLoading(button, true);
      
      this.logger.debug('Testing Singular Live connection', {
        module: 'UI',
        action: 'TEST_SINGULAR_CONNECTION',
        data: { component: 'SettingsPanel' }
      });
      
      this.eventManager.emit('singular:test-connection');
      
      // Listen for connection result
      const timeout = setTimeout(() => {
        this.showError('Singular Live connection test timed out');
        this.setButtonLoading(button, false);
      }, 10000);
      
      this.eventManager.once('singular:connection-result', (result) => {
        clearTimeout(timeout);
        this.setButtonLoading(button, false);
        
        if (result.success) {
          this.showSuccess('Singular Live connection successful');
        } else {
          this.showError(`Singular Live connection failed: ${result.error}`);
        }
      });
      
    } catch (error) {
      this.setButtonLoading(button, false);
      this.logger.error('Failed to test Singular Live connection', {
        module: 'UI',
        action: 'TEST_SINGULAR_ERROR',
        data: { component: 'SettingsPanel' }
      }, error as Error);
      this.showError('Failed to test connection');
    }
  }

  private async handleResetSettings(): Promise<void> {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }
    
    try {
      this.logger.warn('Resetting all settings to defaults', {
        module: 'UI',
        action: 'RESET_SETTINGS',
        data: { component: 'SettingsPanel' }
      });
      
      this.settingsManager.resetToDefaults();
      this.loadSettings();
      
      this.showSuccess('Settings reset to defaults');
      
    } catch (error) {
      this.logger.error('Failed to reset settings', {
        module: 'UI',
        action: 'RESET_SETTINGS_ERROR',
        data: { component: 'SettingsPanel' }
      }, error as Error);
      this.showError('Failed to reset settings');
    }
  }

  private async handleSaveSettings(): Promise<void> {
    try {
      this.logger.debug('Manually saving settings', {
        module: 'UI',
        action: 'MANUAL_SAVE',
        data: { component: 'SettingsPanel' }
      });
      
      this.settingsManager.saveSettings();
      this.showSuccess('Settings saved successfully');
      
    } catch (error) {
      this.logger.error('Failed to save settings', {
        module: 'UI',
        action: 'SAVE_SETTINGS_ERROR',
        data: { component: 'SettingsPanel' }
      }, error as Error);
      this.showError('Failed to save settings');
    }
  }

  private handleSettingsChanged(_data: any): void {
    // Reload settings display if they were changed externally
    this.loadSettings();
  }

  private setButtonLoading(button: HTMLButtonElement, loading: boolean): void {
    if (!button) return;
    
    button.disabled = loading;
    const icon = button.querySelector('i');
    
    if (loading) {
      if (icon) {
        icon.className = 'fas fa-spinner fa-spin';
      }
    } else {
      if (icon) {
        icon.className = 'fas fa-link';
      }
    }
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

  public destroy(): void {
    this.logger.debug('Destroying Settings Panel', {
      module: 'UI',
      action: 'DESTROY',
      data: { component: 'SettingsPanel' }
    });
    
    // Remove event listeners would be handled by removing DOM elements
    // or we could store references and remove them explicitly
  }
}
