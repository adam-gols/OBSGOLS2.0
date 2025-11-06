/**
 * Validation utilities
 * TODO: Expand in subsequent steps
 */

import type { EventData, OperationData } from '../types/sheets';

export const ValidationUtils = {
  // Placeholder for validation functions
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  isValidTime: (timeString: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  },

  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEventData(event: EventData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!event.id || event.id.trim() === '') {
    errors.push('Event ID is required');
  }

  if (!event.name || event.name.trim() === '') {
    errors.push('Event name is required');
  }

  if (!event.date || event.date.trim() === '') {
    errors.push('Event date is required');
  } else if (!ValidationUtils.isValidDate(event.date)) {
    errors.push('Event date is not valid');
  }

  if (!event.time || event.time.trim() === '') {
    errors.push('Event time is required');
  } else if (!ValidationUtils.isValidTime(event.time)) {
    warnings.push('Event time format may not be valid (expected HH:MM)');
  }

  if (!event.homeTeam || event.homeTeam.trim() === '') {
    errors.push('Home team is required');
  }

  if (!event.awayTeam || event.awayTeam.trim() === '') {
    errors.push('Away team is required');
  }

  // Optional fields validation
  if (event.streamUrl && !ValidationUtils.isValidUrl(event.streamUrl)) {
    errors.push('Stream URL is not valid');
  }

  // Score validation
  if (event.homeScore !== undefined && event.homeScore < 0) {
    errors.push('Home score cannot be negative');
  }

  if (event.awayScore !== undefined && event.awayScore < 0) {
    errors.push('Away score cannot be negative');
  }

  // Status validation
  const validStatuses = ['upcoming', 'live', 'completed', 'cancelled'];
  if (!validStatuses.includes(event.status)) {
    errors.push(`Invalid status: ${event.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateOperationData(operation: OperationData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!operation.id || operation.id.trim() === '') {
    errors.push('Operation ID is required');
  }

  if (!operation.timestamp || operation.timestamp.trim() === '') {
    errors.push('Operation timestamp is required');
  } else if (!ValidationUtils.isValidDate(operation.timestamp)) {
    errors.push('Operation timestamp is not valid');
  }

  if (!operation.operation || operation.operation.trim() === '') {
    errors.push('Operation type is required');
  }

  // Status validation
  const validStatuses = ['pending', 'completed', 'failed'];
  if (!validStatuses.includes(operation.status)) {
    errors.push(`Invalid status: ${operation.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Data validation
  if (!operation.data || typeof operation.data !== 'object') {
    errors.push('Operation data is required and must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
