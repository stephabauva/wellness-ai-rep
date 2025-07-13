type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  service?: string;
  operation?: string;
  userId?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private minLevel: LogLevel;
  
  constructor() {
    // Set minimum log level based on environment
    this.minLevel = this.isDevelopment ? 'debug' : 'info';
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.minLevel];
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toLocaleTimeString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `${timestamp} [${levelStr}]`;
    
    if (context?.service) {
      formatted += ` [${context.service}]`;
    }
    
    formatted += ` ${message}`;
    
    if (context?.duration !== undefined) {
      formatted += ` (${context.duration}ms)`;
    }
    
    return formatted;
  }
  
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }
  
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }
  
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, context);
      console.error(formatted);
      if (error && this.isDevelopment) {
        console.error(error);
      }
    }
  }
  
  // Express middleware logging
  request(method: string, path: string, statusCode: number, duration: number, responseSize?: number): void {
    // Only log slow requests (>500ms) or errors in production
    const shouldLogRequest = this.isDevelopment || duration > 500 || statusCode >= 400;
    
    // Skip logging expected health check failures for Go service
    const isGoHealthCheck = path === '/api/accelerate/health' && statusCode === 503;
    
    if (shouldLogRequest && !isGoHealthCheck) {
      let message = `${method} ${path} ${statusCode}`;
      
      if (duration > 100) {
        message += ` (${duration}ms)`;
      }
      
      if (statusCode >= 400) {
        this.warn(message, { service: 'express' });
      } else {
        this.debug(message, { service: 'express', duration });
      }
    }
  }
  
  // Database operation logging
  database(operation: string, duration?: number, affectedRows?: number): void {
    // Only log slow queries (>100ms) or in debug mode
    if (this.isDevelopment && duration && duration > 100) {
      this.warn(`Slow ${operation}`, { service: 'database', duration });
    } else if (this.isDevelopment) {
      this.debug(operation, { service: 'database', duration });
    }
  }
  
  // Memory service specific logging
  memory(operation: string, context?: { userId?: number; count?: number; duration?: number }): void {
    // Only log significant memory operations
    if (context?.duration && context.duration > 200) {
      this.warn(`Memory ${operation}`, { 
        service: 'memory', 
        duration: context.duration,
        metadata: { userId: context.userId, count: context.count }
      });
    } else if (this.isDevelopment && context?.count && context.count > 50) {
      this.debug(`Memory ${operation} (${context.count} items)`, { service: 'memory' });
    }
  }
  
  // File operations logging
  file(operation: string, filename?: string, size?: number, duration?: number): void {
    if (duration && duration > 1000) {
      this.warn(`File ${operation}${filename ? ` ${filename}` : ''}`, { 
        service: 'file', 
        duration,
        metadata: { size }
      });
    } else if (this.isDevelopment) {
      this.debug(`File ${operation}${filename ? ` ${filename}` : ''}`, { service: 'file' });
    }
  }
  
  // System startup/shutdown logging
  system(message: string, context?: LogContext): void {
    this.info(message, { service: 'system', ...context });
  }
}

export const logger = new Logger();