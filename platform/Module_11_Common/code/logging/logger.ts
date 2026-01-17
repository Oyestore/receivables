import winston from 'winston';
import { config } from '../config/config.service';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

/**
 * Log context interface
 */
export interface LogContext {
  [key: string]: unknown;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  module?: string;
}

/**
 * Logger class providing structured logging capabilities
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const logConfig = config.getValue('logging');
    const logDir = logConfig.directory;

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Define console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = `\n${JSON.stringify(meta, null, 2)}`;
        }
        return `${timestamp} [${context}] ${level}: ${message}${metaStr}`;
      })
    );

    // Define transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: config.isDevelopment() ? consoleFormat : logFormat,
      })
    );

    // File transports (production and staging)
    if (!config.isDevelopment()) {
      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: logFormat,
        })
      );

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: logFormat,
        })
      );

      // HTTP log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'http.log'),
          level: 'http',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: logFormat,
        })
      );
    }

    return winston.createLogger({
      level: logConfig.level,
      format: logFormat,
      defaultMeta: { context: this.context },
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log error message
   */
  public error(message: string, meta?: LogContext | Error): void {
    if (meta instanceof Error) {
      this.logger.error(message, {
        error: meta.message,
        stack: meta.stack,
        context: this.context,
      });
    } else {
      this.logger.error(message, { ...meta, context: this.context });
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, meta?: LogContext): void {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  /**
   * Log info message
   */
  public info(message: string, meta?: LogContext): void {
    this.logger.info(message, { ...meta, context: this.context });
  }

  /**
   * Log HTTP request
   */
  public http(message: string, meta?: LogContext): void {
    this.logger.http(message, { ...meta, context: this.context });
  }

  /**
   * Log debug message
   */
  public debug(message: string, meta?: LogContext): void {
    this.logger.debug(message, { ...meta, context: this.context });
  }

  /**
   * Create child logger with additional context
   */
  public child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.context);
    childLogger.logger = this.logger.child(additionalContext);
    return childLogger;
  }

  /**
   * Log database query (for debugging)
   */
  public query(query: string, params?: unknown[], duration?: number): void {
    if (config.isDevelopment()) {
      this.debug('Database Query', {
        query,
        params,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }

  /**
   * Log API request
   */
  public request(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: LogContext
  ): void {
    this.http(`${method} ${url} ${statusCode}`, {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  /**
   * Log external API call
   */
  public externalCall(
    service: string,
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    error?: Error
  ): void {
    if (error) {
      this.error(`External API call failed: ${service}`, {
        service,
        method,
        url,
        error: error.message,
        stack: error.stack,
      });
    } else {
      this.info(`External API call: ${service}`, {
        service,
        method,
        url,
        statusCode,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }

  /**
   * Log business event
   */
  public event(eventName: string, meta?: LogContext): void {
    this.info(`Event: ${eventName}`, {
      event: eventName,
      ...meta,
    });
  }

  /**
   * Log security event
   */
  public security(message: string, meta?: LogContext): void {
    this.warn(`Security: ${message}`, {
      security: true,
      ...meta,
    });
  }

  /**
   * Log performance metric
   */
  public performance(operation: string, duration: number, meta?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  }
}

/**
 * Create logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = new Logger('Application');
