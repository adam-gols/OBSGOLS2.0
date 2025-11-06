/**
 * Comprehensive logging system for GOLS Widget development debugging
 * Provides extensive console output that can be stripped for production
 */

/// <reference path="../types/global.d.ts" />

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogContext {
  module: string;
  action?: string;
  data?: any;
  timestamp?: Date;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private isDevelopment: boolean = import.meta.env.DEV;

  private constructor() {
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
    if (this.isDevelopment) {
      console.log('%c🎮 GOLS Widget Logger Initialized', 'color: #C62128; font-weight: bold; font-size: 14px;');
      console.log('%c🚀 Development Mode - Extensive Logging Enabled', 'color: #37605F; font-weight: bold;');
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const moduleInfo = context?.module ? `[${context.module}]` : '';
    const actionInfo = context?.action ? `{${context.action}}` : '';
    
    return `${timestamp} ${levelName} ${moduleInfo}${actionInfo} ${message}`;
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #0F1C41; background: #F0EFEF; padding: 2px 4px; border-radius: 3px;';
      case LogLevel.INFO:
        return 'color: #37605F; font-weight: bold;';
      case LogLevel.WARN:
        return 'color: #FF8C00; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #C62128; font-weight: bold; background: #FFE6E6; padding: 2px 4px;';
      case LogLevel.CRITICAL:
        return 'color: white; background: #C62128; font-weight: bold; padding: 4px 8px; border-radius: 4px;';
      default:
        return '';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isDevelopment && level >= this.logLevel;
  }

  public debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, context);
    console.log(`%c${formattedMessage}`, this.getConsoleStyle(LogLevel.DEBUG));
    
    if (context?.data) {
      console.log('%cData:', 'color: #0F1C41; font-weight: bold;', context.data);
    }
  }

  public info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = this.formatMessage(LogLevel.INFO, message, context);
    console.log(`%c${formattedMessage}`, this.getConsoleStyle(LogLevel.INFO));
    
    if (context?.data) {
      console.log('%cData:', 'color: #37605F; font-weight: bold;', context.data);
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = this.formatMessage(LogLevel.WARN, message, context);
    console.warn(`%c${formattedMessage}`, this.getConsoleStyle(LogLevel.WARN));
    
    if (context?.data) {
      console.warn('%cData:', 'color: #FF8C00; font-weight: bold;', context.data);
    }
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
    console.error(`%c${formattedMessage}`, this.getConsoleStyle(LogLevel.ERROR));
    
    if (context?.data) {
      console.error('%cContext Data:', 'color: #C62128; font-weight: bold;', context.data);
    }
    
    if (error) {
      console.error('%cError Details:', 'color: #C62128; font-weight: bold;', error);
      console.error('%cStack Trace:', 'color: #C62128;', error.stack);
    }
  }

  public critical(message: string, context?: LogContext, error?: Error): void {
    const formattedMessage = this.formatMessage(LogLevel.CRITICAL, message, context);
    console.error(`%c${formattedMessage}`, this.getConsoleStyle(LogLevel.CRITICAL));
    
    if (context?.data) {
      console.error('%cCritical Context:', 'color: white; background: #C62128; padding: 2px 4px;', context.data);
    }
    
    if (error) {
      console.error('%cCritical Error:', 'color: white; background: #C62128; padding: 2px 4px;', error);
      console.error(error.stack);
    }
  }

  // Specialized logging methods for different modules
  public apiCall(url: string, method: string, payload?: any, module?: string): void {
    this.debug(`API Call: ${method} ${url}`, {
      module: module || 'API',
      action: 'HTTP_REQUEST',
      data: { url, method, payload }
    });
  }

  public apiResponse(url: string, status: number, data?: any, module?: string): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    const message = `API Response: ${status} ${url}`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, {
        module: module || 'API',
        action: 'HTTP_RESPONSE',
        data: { url, status, response: data }
      });
    } else {
      this.debug(message, {
        module: module || 'API',
        action: 'HTTP_RESPONSE',
        data: { url, status, response: data }
      });
    }
  }

  public stateChange(oldState: any, newState: any, module: string): void {
    this.debug(`State Change in ${module}`, {
      module,
      action: 'STATE_CHANGE',
      data: { from: oldState, to: newState }
    });
  }

  public userAction(action: string, data?: any, module?: string): void {
    this.info(`User Action: ${action}`, {
      module: module || 'UI',
      action: 'USER_INTERACTION',
      data
    });
  }

  public systemEvent(event: string, data?: any, module?: string): void {
    this.info(`System Event: ${event}`, {
      module: module || 'SYSTEM',
      action: 'SYSTEM_EVENT',
      data
    });
  }

  public performance(operation: string, duration: number, module?: string): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn(message, {
        module: module || 'PERFORMANCE',
        action: 'SLOW_OPERATION',
        data: { operation, duration }
      });
    } else {
      this.debug(message, {
        module: module || 'PERFORMANCE',
        action: 'OPERATION_TIMING',
        data: { operation, duration }
      });
    }
  }

  // Group logging for complex operations
  public group(label: string, level: LogLevel = LogLevel.INFO): void {
    if (!this.shouldLog(level)) return;
    console.group(`%c${label}`, this.getConsoleStyle(level));
  }

  public groupEnd(): void {
    if (!this.isDevelopment) return;
    console.groupEnd();
  }

  // Table logging for structured data
  public table(data: any, label?: string): void {
    if (!this.isDevelopment) return;
    if (label) {
      console.log(`%c${label}`, 'color: #37605F; font-weight: bold;');
    }
    console.table(data);
  }

  // Clear console
  public clear(): void {
    if (!this.isDevelopment) return;
    console.clear();
    console.log('%c🎮 GOLS Widget Console Cleared', 'color: #C62128; font-weight: bold;');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  critical: (message: string, context?: LogContext, error?: Error) => logger.critical(message, context, error),
  
  // Specialized methods
  api: {
    call: (url: string, method: string, payload?: any, module?: string) => logger.apiCall(url, method, payload, module),
    response: (url: string, status: number, data?: any, module?: string) => logger.apiResponse(url, status, data, module)
  },
  
  state: (oldState: any, newState: any, module: string) => logger.stateChange(oldState, newState, module),
  user: (action: string, data?: any, module?: string) => logger.userAction(action, data, module),
  system: (event: string, data?: any, module?: string) => logger.systemEvent(event, data, module),
  perf: (operation: string, duration: number, module?: string) => logger.performance(operation, duration, module),
  
  group: (label: string, level?: LogLevel) => logger.group(label, level),
  groupEnd: () => logger.groupEnd(),
  table: (data: any, label?: string) => logger.table(data, label),
  clear: () => logger.clear()
};
