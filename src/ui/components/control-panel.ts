import { EventManager } from '../../core/event-manager';
import { SettingsManager } from '../../core/settings-manager';
import { Logger } from '../../utils/logger';

export class ControlPanel {
  private eventManager: EventManager;
  private settingsManager: SettingsManager;
  private logger: Logger;
  private recordingStartTime: Date | null = null;
  private recordingTimer: number | null = null;

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
    this.logger.debug('Initializing Control Panel', {
      module: 'UI',
      action: 'INIT',
      data: { component: 'ControlPanel' }
    });
    
    this.bindEventListeners();
    // Note: Event loading is now handled by EventSelector component
    this.updateRecordingControls();
    
    // Listen for external events
    this.eventManager.on('events:loaded', this.handleEventsLoaded.bind(this));
    this.eventManager.on('recording:started', this.handleRecordingStarted.bind(this));
    this.eventManager.on('recording:stopped', this.handleRecordingStopped.bind(this));
    this.eventManager.on('obs:connection:changed', this.updateRecordingControls.bind(this));
  }

  private bindEventListeners(): void {
    // Event selector
    const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
    const refreshEvents = document.getElementById('refresh-events') as HTMLButtonElement;
    
    if (eventSelector) {
      eventSelector.addEventListener('change', this.handleEventChange.bind(this));
    }
    
    if (refreshEvents) {
      refreshEvents.addEventListener('click', this.handleRefreshEvents.bind(this));
    }

    // Stream selector
    const streamSelector = document.getElementById('stream-selector') as HTMLSelectElement;
    if (streamSelector) {
      streamSelector.addEventListener('change', this.handleStreamChange.bind(this));
    }

    // Recording controls
    const startRecording = document.getElementById('start-recording') as HTMLButtonElement;
    const stopRecording = document.getElementById('stop-recording') as HTMLButtonElement;
    
    if (startRecording) {
      startRecording.addEventListener('click', this.handleStartRecording.bind(this));
    }
    
    if (stopRecording) {
      stopRecording.addEventListener('click', this.handleStopRecording.bind(this));
    }
  }

  // NOTE: Event loading is now handled by EventSelector component
  // This method is disabled to prevent conflicts
  private async loadEvents(): Promise<void> {
    // Disabled - EventSelector handles event loading
    return;
    /*
    try {
      this.logger.debug('Loading events for selector', {
        module: 'UI',
        action: 'LOAD_EVENTS',
        data: { component: 'ControlPanel' }
      });
      this.eventManager.emit('events:request');
      
      // Show loading state
      const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
      if (eventSelector) {
        eventSelector.innerHTML = '<option value="">Loading events...</option>';
        eventSelector.disabled = true;
      }
    } catch (error) {
      this.logger.error('Failed to load events', {
        module: 'UI',
        action: 'LOAD_EVENTS_ERROR',
        data: { component: 'ControlPanel' }
      }, error as Error);
      this.showError('Failed to load events');
    }
    */
  }

  private handleEventsLoaded(_events: any[]): void {
    // Disabled - EventSelector handles event loading
    return;
    /*
    this.logger.debug('Events loaded', {
      module: 'UI',
      action: 'EVENTS_LOADED',
      data: { component: 'ControlPanel', eventCount: events.length }
    });
    this.populateEventSelector(events);
    */
  }

  // NOTE: This method is disabled - EventSelector handles dropdown population
  private populateEventSelector(_events: any[]): void {
    // Disabled - EventSelector handles event dropdown population
    return;
    /*
    const eventSelector = document.getElementById('event-selector') as HTMLSelectElement;
    if (!eventSelector) return;

    eventSelector.innerHTML = '<option value="">Select an event...</option>';
    
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id || event.name;
      option.textContent = `${event.name} - ${event.date}`;
      eventSelector.appendChild(option);
    });

    eventSelector.disabled = false;
    
    // Restore previously selected event
    const sessionState = this.settingsManager.getSessionState();
    if (sessionState.lastSelectedEvent) {
      eventSelector.value = sessionState.lastSelectedEvent;
    }
    */
  }

  private async handleEventChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const eventId = target.value;
    
    this.logger.debug('Event selected', {
      module: 'UI',
      action: 'EVENT_SELECTED',
      data: { component: 'ControlPanel', eventId }
    });
    
    try {
      // Save selection to session state
      this.settingsManager.updateSessionState({
        lastSelectedEvent: eventId
      });
      
      // Notify other components
      this.eventManager.emit('event:selected', { eventId });
      
      // Load games for this event
      if (eventId) {
        this.eventManager.emit('games:request', { eventId });
      }
    } catch (error) {
      this.logger.error('Failed to handle event selection', {
        module: 'UI',
        action: 'EVENT_SELECT_ERROR',
        data: { component: 'ControlPanel' }
      }, error as Error);
      this.showError('Failed to select event');
    }
  }

  private async handleRefreshEvents(): Promise<void> {
    const refreshButton = document.getElementById('refresh-events') as HTMLButtonElement;
    
    try {
      // Show loading state
      if (refreshButton) {
        refreshButton.disabled = true;
        const icon = refreshButton.querySelector('i');
        if (icon) {
          icon.classList.add('fa-spin');
        }
      }
      
      this.logger.debug('Refreshing events', {
        module: 'UI',
        action: 'REFRESH_EVENTS',
        data: { component: 'ControlPanel' }
      });
      await this.loadEvents();
      
    } catch (error) {
      this.logger.error('Failed to refresh events', {
        module: 'UI',
        action: 'REFRESH_EVENTS_ERROR',
        data: { component: 'ControlPanel' }
      }, error as Error);
      this.showError('Failed to refresh events');
    } finally {
      // Reset button state
      if (refreshButton) {
        refreshButton.disabled = false;
        const icon = refreshButton.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-spin');
        }
      }
    }
  }

  private handleStreamChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const streamType = target.value;
    
    this.logger.debug('Stream selected', {
      module: 'UI',
      action: 'STREAM_SELECTED',
      data: { component: 'ControlPanel', streamType }
    });
    
    // Save selection to session state
    this.settingsManager.updateSessionState({
      lastSelectedSiteStream: streamType
    });
    
    // Notify other components
    this.eventManager.emit('stream:selected', { streamType });
  }

  private async handleStartRecording(): Promise<void> {
    try {
      this.logger.debug('Starting recording', {
        module: 'UI',
        action: 'START_RECORDING',
        data: { component: 'ControlPanel' }
      });
      
      const sessionState = this.settingsManager.getSessionState();
      const eventId = sessionState.lastSelectedEvent;
      const streamType = sessionState.lastSelectedSiteStream;
      
      if (!eventId || !streamType) {
        this.showError('Please select an event and stream type before recording');
        return;
      }
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `GOLS_${eventId}_${streamType}_${timestamp}`;
      
      this.eventManager.emit('recording:start', { filename });
      
    } catch (error) {
      this.logger.error('Failed to start recording', {
        module: 'UI',
        action: 'START_RECORDING_ERROR',
        data: { component: 'ControlPanel' }
      }, error as Error);
      this.showError('Failed to start recording');
    }
  }

  private async handleStopRecording(): Promise<void> {
    try {
      this.logger.debug('Stopping recording', {
        module: 'UI',
        action: 'STOP_RECORDING',
        data: { component: 'ControlPanel' }
      });
      this.eventManager.emit('recording:stop');
      
    } catch (error) {
      this.logger.error('Failed to stop recording', {
        module: 'UI',
        action: 'STOP_RECORDING_ERROR',
        data: { component: 'ControlPanel' }
      }, error as Error);
      this.showError('Failed to stop recording');
    }
  }

  private handleRecordingStarted(): void {
    this.logger.debug('Recording started', {
      module: 'UI',
      action: 'RECORDING_STARTED',
      data: { component: 'ControlPanel' }
    });
    this.recordingStartTime = new Date();
    this.updateRecordingControls();
    this.startRecordingTimer();
  }

  private handleRecordingStopped(): void {
    this.logger.debug('Recording stopped', {
      module: 'UI', 
      action: 'RECORDING_STOPPED',
      data: { component: 'ControlPanel' }
    });
    this.recordingStartTime = null;
    this.updateRecordingControls();
    this.stopRecordingTimer();
  }

  private updateRecordingControls(): void {
    const startButton = document.getElementById('start-recording') as HTMLButtonElement;
    const stopButton = document.getElementById('stop-recording') as HTMLButtonElement;
    const recordingTime = document.getElementById('recording-time') as HTMLSpanElement;
    
    const isRecording = this.recordingStartTime !== null;
    
    if (startButton) {
      startButton.disabled = isRecording;
    }
    
    if (stopButton) {
      stopButton.disabled = !isRecording;
    }
    
    if (recordingTime && !isRecording) {
      recordingTime.textContent = '00:00:00';
    }
  }

  private startRecordingTimer(): void {
    this.stopRecordingTimer(); // Clear any existing timer
    
    this.recordingTimer = window.setInterval(() => {
      if (this.recordingStartTime) {
        const elapsed = Date.now() - this.recordingStartTime.getTime();
        const recordingTime = document.getElementById('recording-time') as HTMLSpanElement;
        
        if (recordingTime) {
          recordingTime.textContent = this.formatDuration(elapsed);
        }
      }
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [hours, minutes, remainingSeconds]
      .map(num => num.toString().padStart(2, '0'))
      .join(':');
  }

  private showError(message: string): void {
    this.eventManager.emit('notification:show', {
      type: 'error',
      message,
      duration: 5000
    });
  }

  public destroy(): void {
    this.logger.debug('Destroying Control Panel', {
      module: 'UI',
      action: 'DESTROY',
      data: { component: 'ControlPanel' }
    });
    this.stopRecordingTimer();
    
    // Remove event listeners would be handled by removing DOM elements
    // or we could store references and remove them explicitly
  }
}
