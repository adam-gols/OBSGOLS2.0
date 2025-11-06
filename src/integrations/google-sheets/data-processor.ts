import { logger } from '../../utils/logger.js';
import type { EventData, OperationData } from '../../types/sheets';

/**
 * Data transformation and processing utilities for Google Sheets data
 * Handles data normalization, validation, and format conversion
 */

export interface ProcessedEventData extends EventData {
  displayName: string;
  displayDate: string;
  displayTime: string;
  formattedScore: string;
  isUpcoming: boolean;
  isLive: boolean;
  isCompleted: boolean;
  timeUntilStart?: number | undefined;
  timeSinceEnd?: number | undefined;
}

export interface ProcessedOperationData extends OperationData {
  displayTimestamp: string;
  formattedData: string;
  isRecent: boolean;
  age: number;
}

export class GoogleSheetsDataProcessor {
  
  /**
   * Process and enhance event data for display
   */
  static processEventData(events: EventData[]): ProcessedEventData[] {
    logger.debug('Processing event data', { 
      module: 'GoogleSheetsDataProcessor',
      data: { eventCount: events.length }
    });

    return events.map(event => this.processEventItem(event));
  }

  /**
   * Process a single event item
   */
  static processEventItem(event: EventData): ProcessedEventData {
    const eventDateTime = new Date(`${event.date} ${event.time}`);
    const now = new Date();
    
    // Calculate time relationships
    const timeUntilStart = event.status === 'upcoming' ? eventDateTime.getTime() - now.getTime() : undefined;
    const timeSinceEnd = event.status === 'completed' ? now.getTime() - eventDateTime.getTime() : undefined;

    // Format display strings
    const displayName = this.formatEventDisplayName(event);
    const displayDate = this.formatEventDate(event.date);
    const displayTime = this.formatEventTime(event.time);
    const formattedScore = this.formatScore(event);

    // Status booleans
    const isUpcoming = event.status === 'upcoming';
    const isLive = event.status === 'live';
    const isCompleted = event.status === 'completed';

    const processed: ProcessedEventData = {
      ...event,
      displayName,
      displayDate,
      displayTime,
      formattedScore,
      isUpcoming,
      isLive,
      isCompleted,
      timeUntilStart,
      timeSinceEnd
    };

    logger.debug('Processed event item', { 
      module: 'GoogleSheetsDataProcessor',
      data: { 
        eventId: event.id,
        status: event.status,
        displayName
      }
    });

    return processed;
  }

  /**
   * Format event display name
   */
  private static formatEventDisplayName(event: EventData): string {
    if (event.name && event.name.trim() !== '') {
      return event.name;
    }
    
    return `${event.homeTeam} vs ${event.awayTeam}`;
  }

  /**
   * Format event date for display
   */
  private static formatEventDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format event time for display
   */
  private static formatEventTime(timeString: string): string {
    try {
      // Handle various time formats
      if (timeString.includes(':')) {
        const timeParts = timeString.split(':');
        const hours = timeParts[0];
        const minutes = timeParts[1];
        
        if (hours && minutes) {
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          
          return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      }
      
      return timeString;
    } catch {
      return timeString;
    }
  }

  /**
   * Format score display
   */
  private static formatScore(event: EventData): string {
    if (event.homeScore !== undefined && event.awayScore !== undefined) {
      return `${event.homeScore} - ${event.awayScore}`;
    }
    
    if (event.status === 'live') {
      return 'LIVE';
    }
    
    if (event.status === 'upcoming') {
      return 'vs';
    }
    
    return '-';
  }

  /**
   * Process and enhance operation data for display
   */
  static processOperationData(operations: OperationData[]): ProcessedOperationData[] {
    logger.debug('Processing operation data', { 
      module: 'GoogleSheetsDataProcessor',
      data: { operationCount: operations.length }
    });

    return operations.map(operation => this.processOperationItem(operation));
  }

  /**
   * Process a single operation item
   */
  static processOperationItem(operation: OperationData): ProcessedOperationData {
    const timestamp = new Date(operation.timestamp);
    const now = new Date();
    const age = now.getTime() - timestamp.getTime();
    
    // Format display strings
    const displayTimestamp = this.formatOperationTimestamp(operation.timestamp);
    const formattedData = this.formatOperationData(operation.data);
    const isRecent = age < 300000; // 5 minutes

    const processed: ProcessedOperationData = {
      ...operation,
      displayTimestamp,
      formattedData,
      isRecent,
      age
    };

    return processed;
  }

  /**
   * Format operation timestamp for display
   */
  private static formatOperationTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // Show relative time for recent operations
      if (diff < 60000) { // Less than 1 minute
        return 'Just now';
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else {
        // Show absolute date/time for older operations
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch {
      return timestamp;
    }
  }

  /**
   * Format operation data for display
   */
  private static formatOperationData(data: Record<string, any>): string {
    try {
      if (Object.keys(data).length === 0) {
        return '{}';
      }
      
      // Create a simplified display format
      const simplified: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.length > 50) {
          simplified[key] = value.substring(0, 50) + '...';
        } else if (typeof value === 'object' && value !== null) {
          simplified[key] = '[Object]';
        } else {
          simplified[key] = value;
        }
      }
      
      return JSON.stringify(simplified, null, 0);
    } catch {
      return String(data);
    }
  }

  /**
   * Filter events by status with additional criteria
   */
  static filterEvents(events: ProcessedEventData[], filters: {
    status?: EventData['status'];
    dateRange?: { start: Date; end: Date };
    searchTerm?: string;
    teamName?: string;
  }): ProcessedEventData[] {
    
    logger.debug('Filtering events', { 
      module: 'GoogleSheetsDataProcessor',
      data: { 
        totalEvents: events.length,
        filters
      }
    });

    let filtered = events;

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(`${event.date} ${event.time}`);
        return eventDate >= filters.dateRange!.start && eventDate <= filters.dateRange!.end;
      });
    }

    // Filter by search term (name, teams, location)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchLower) ||
        event.homeTeam.toLowerCase().includes(searchLower) ||
        event.awayTeam.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower)
      );
    }

    // Filter by team name
    if (filters.teamName) {
      const teamLower = filters.teamName.toLowerCase();
      filtered = filtered.filter(event => 
        event.homeTeam.toLowerCase().includes(teamLower) ||
        event.awayTeam.toLowerCase().includes(teamLower)
      );
    }

    logger.debug('Events filtered', { 
      module: 'GoogleSheetsDataProcessor',
      data: { 
        originalCount: events.length,
        filteredCount: filtered.length
      }
    });

    return filtered;
  }

  /**
   * Sort events by various criteria
   */
  static sortEvents(events: ProcessedEventData[], sortBy: 'date' | 'name' | 'status' | 'updated', ascending: boolean = true): ProcessedEventData[] {
    const multiplier = ascending ? 1 : -1;

    const sorted = [...events].sort((a, b) => {
      switch (sortBy) {
        case 'date': {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return (dateA.getTime() - dateB.getTime()) * multiplier;
        }
        case 'name':
          return a.displayName.localeCompare(b.displayName) * multiplier;
        case 'status': {
          const statusOrder = { 'live': 0, 'upcoming': 1, 'completed': 2, 'cancelled': 3 };
          const statusA = statusOrder[a.status] ?? 4;
          const statusB = statusOrder[b.status] ?? 4;
          return (statusA - statusB) * multiplier;
        }
        case 'updated': {
          const dateA = new Date(a.lastUpdated);
          const dateB = new Date(b.lastUpdated);
          return (dateA.getTime() - dateB.getTime()) * multiplier;
        }
        default:
          return 0;
      }
    });

    logger.debug('Events sorted', { 
      module: 'GoogleSheetsDataProcessor',
      data: { 
        sortBy,
        ascending,
        eventCount: sorted.length
      }
    });

    return sorted;
  }

  /**
   * Group events by date
   */
  static groupEventsByDate(events: ProcessedEventData[]): Record<string, ProcessedEventData[]> {
    const grouped = events.reduce((groups, event) => {
      const dateKey = event.displayDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
      return groups;
    }, {} as Record<string, ProcessedEventData[]>);

    // Sort events within each date group
    Object.keys(grouped).forEach(dateKey => {
      const events = grouped[dateKey];
      if (events) {
        grouped[dateKey] = this.sortEvents(events, 'date', true);
      }
    });

    logger.debug('Events grouped by date', { 
      module: 'GoogleSheetsDataProcessor',
      data: { 
        totalEvents: events.length,
        dateGroups: Object.keys(grouped).length
      }
    });

    return grouped;
  }

  /**
   * Get event statistics
   */
  static getEventStatistics(events: ProcessedEventData[]): {
    total: number;
    upcoming: number;
    live: number;
    completed: number;
    cancelled: number;
    todayEvents: number;
    nextEvent?: ProcessedEventData | undefined;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const stats = {
      total: events.length,
      upcoming: events.filter(e => e.status === 'upcoming').length,
      live: events.filter(e => e.status === 'live').length,
      completed: events.filter(e => e.status === 'completed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      todayEvents: events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate < tomorrow;
      }).length,
      nextEvent: events
        .filter(e => e.status === 'upcoming')
        .sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA.getTime() - dateB.getTime();
        })[0]
    };

    return stats;
  }
}
