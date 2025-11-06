/**
 * Event Manager - Event bus system for inter-module communication
 * Provides decoupled communication between widget modules
 */

import { log } from '@utils/logger';

export type EventCallback<T = any> = (data: T) => void;

export interface EventData {
  timestamp: Date;
  source?: string;
  [key: string]: any;
}

export class EventManager {
  private static instance: EventManager;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private eventHistory: Array<{ event: string; data: EventData; timestamp: Date }> = [];
  private maxHistorySize = 100;

  private constructor() {
    log.debug('EventManager initialized', { module: 'EVENT_BUS' });
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Subscribe to an event
   */
  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    log.debug(`Event listener registered for: ${event}`, {
      module: 'EVENT_BUS',
      action: 'SUBSCRIBE',
      data: { event, listenerCount: this.listeners.get(event)!.size }
    });
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  public off<T = any>(event: string, callback: EventCallback<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
      
      log.debug(`Event listener removed for: ${event}`, {
        module: 'EVENT_BUS',
        action: 'UNSUBSCRIBE',
        data: { event, remainingListeners: eventListeners.size }
      });
    }
  }

  /**
   * Emit an event to all subscribers
   */
  public emit<T = any>(event: string, data?: T): void {
    const eventData: EventData = {
      timestamp: new Date(),
      ...(typeof data === 'object' ? data : { value: data })
    };

    // Add to history
    this.addToHistory(event, eventData);
    
    // Get listeners for this event
    const eventListeners = this.listeners.get(event);
    
    if (!eventListeners || eventListeners.size === 0) {
      log.debug(`No listeners for event: ${event}`, {
        module: 'EVENT_BUS',
        action: 'EMIT_NO_LISTENERS',
        data: { event, eventData }
      });
      return;
    }

    log.debug(`Emitting event: ${event}`, {
      module: 'EVENT_BUS',
      action: 'EMIT',
      data: { event, eventData, listenerCount: eventListeners.size }
    });

    // Notify all listeners
    eventListeners.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        log.error(`Error in event listener for ${event}`, {
          module: 'EVENT_BUS',
          action: 'LISTENER_ERROR',
          data: { event, eventData }
        }, error as Error);
      }
    });
  }

  /**
   * Subscribe to an event only once
   */
  public once<T = any>(event: string, callback: EventCallback<T>): void {
    const onceCallback: EventCallback<T> = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    this.on(event, onceCallback);
  }

  /**
   * Remove all listeners for an event
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      log.debug(`All listeners removed for: ${event}`, {
        module: 'EVENT_BUS',
        action: 'REMOVE_ALL',
        data: { event }
      });
    } else {
      this.listeners.clear();
      log.debug('All event listeners removed', {
        module: 'EVENT_BUS',
        action: 'REMOVE_ALL'
      });
    }
  }

  /**
   * Get list of all registered events
   */
  public getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for an event
   */
  public getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Get recent event history
   */
  public getEventHistory(limit?: number): Array<{ event: string; data: EventData; timestamp: Date }> {
    const historyLimit = limit || this.eventHistory.length;
    return this.eventHistory.slice(-historyLimit);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: string, data: EventData): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date()
    });

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Debug information
   */
  public getDebugInfo() {
    return {
      registeredEvents: this.getRegisteredEvents(),
      listenerCounts: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([event, listeners]) => [event, listeners.size])
      ),
      recentEvents: this.getEventHistory(10)
    };
  }
}

// Export singleton instance
export const eventBus = EventManager.getInstance();

// Common event types for type safety
export const Events = {
  // System Events
  WIDGET_INITIALIZED: 'widget:initialized',
  WIDGET_READY: 'widget:ready',
  WIDGET_ERROR: 'widget:error',
  
  // Settings Events
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_LOADED: 'settings:loaded',
  SETTINGS_SAVED: 'settings:saved',
  
  // Service Health Events
  SERVICE_CONNECTED: 'service:connected',
  SERVICE_DISCONNECTED: 'service:disconnected',
  SERVICE_ERROR: 'service:error',
  
  // Google Sheets Events
  SHEETS_CONNECTED: 'sheets:connected',
  SHEETS_ERROR: 'sheets:error',
  FILE_CABINET_LOADED: 'sheets:file_cabinet_loaded',
  OPS_SHEET_LOADED: 'sheets:ops_sheet_loaded',
  
  // OBS Events
  OBS_CONNECTED: 'obs:connected',
  OBS_DISCONNECTED: 'obs:disconnected',
  RECORDING_STARTED: 'obs:recording_started',
  RECORDING_STOPPED: 'obs:recording_stopped',
  
  // Singular Live Events
  SINGULAR_CONNECTED: 'singular:connected',
  SINGULAR_DISCONNECTED: 'singular:disconnected',
  DATA_STREAM_SENT: 'singular:data_sent',
  
  // Game Navigation Events
  EVENT_SELECTED: 'game:event_selected',
  SITE_STREAM_SELECTED: 'game:site_stream_selected',
  GAME_CHANGED: 'game:changed',
  GAME_SAVED: 'game:saved',
  
  // UI Events
  UI_INITIALIZED: 'ui:initialized',
  USER_ACTION: 'ui:user_action',
  ERROR_SHOWN: 'ui:error_shown'
} as const;
