import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { format } from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Define log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

/**
 * Log configuration options interface
 */
export interface LogOptions {
  level?: LogLevel;              // Log level
  dirname?: string;              // Log file directory
  maxDays?: number;              // Maximum days to keep logs
  maxSize?: string;              // Maximum size of single log file
  zippedArchive?: boolean;       // Whether to compress archived logs
  disableConsole?: boolean;      // Whether to disable console output
  disableFile?: boolean;         // Whether to disable file output
}

/**
 * Default log configuration options
 */
const DEFAULT_LOG_OPTIONS: LogOptions = {
  level: LogLevel.INFO,
  dirname: path.join(process.cwd(), 'logs'),
  maxDays: 14,                    // Keep logs for 14 days
  maxSize: '20m',                 // Maximum 20MB per log file
  zippedArchive: true,            // Compress old logs
  disableConsole: false,          // Enable console output by default
  disableFile: false,             // Enable file output by default
};

/**
 * Ensure log directory exists
 * @param dirname Log directory path
 */
function ensureLogDirExists(dirname: string): void {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * Custom format method - for file output
 */
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(info => {
    const { timestamp, level, message, module, ...rest } = info;
    const extraData = Object.keys(rest).length ? JSON.stringify(rest) : '';
    return `${timestamp} [${module}] ${level.toUpperCase()}: ${message} ${extraData}`.trim();
  })
);

/**
 * Custom color format - for console output
 */
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(info => {
    const { timestamp, level, message, module, ...rest } = info;
    const metadata = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
    return `${timestamp} [${module}] ${level}: ${message} ${metadata}`.trim();
  })
);

/**
 * Create log file transport for specific level
 * @param level Log level
 * @param module Module name
 * @param options Log configuration options
 * @returns Log file transport
 */
function createFileTransport(level: LogLevel, module: string, options: LogOptions): winston.transport {
  const { dirname, maxDays, maxSize, zippedArchive } = options;
  if (dirname) {
    ensureLogDirExists(dirname);
  }

  return new winston.transports.DailyRotateFile({
    level,
    dirname,
    filename: `${module}-%DATE%-${level}`,
    extension: '.log',
    datePattern: 'YYYY-MM-DD',
    maxSize,
    maxFiles: `${maxDays}d`,
    zippedArchive,
    format: fileFormat,
  });
}

/**
 * Create logger instance
 * @param module Module name
 * @param options Log configuration options
 * @returns Logger instance with various log level methods
 */
export function Logger(module: string, customOptions: Partial<LogOptions> = {}): winston.Logger {
  // Merge default options and user-provided options
  const options: LogOptions = { ...DEFAULT_LOG_OPTIONS, ...customOptions };
  const { level, disableConsole, disableFile } = options;

  // Prepare transports
  const transports: winston.transport[] = [];

  // Add console transport (if not disabled)
  if (!disableConsole) {
    transports.push(
      new winston.transports.Console({
        level,
        format: consoleFormat
      })
    );
  }

  // Add file transports (if not disabled)
  if (!disableFile) {
    // Create separate file transports for different levels
    transports.push(createFileTransport(LogLevel.ERROR, module, options));
    transports.push(createFileTransport(LogLevel.WARN, module, options));
    transports.push(createFileTransport(LogLevel.INFO, module, options));

    if (level === LogLevel.DEBUG || level === LogLevel.VERBOSE || level === LogLevel.SILLY) {
      transports.push(createFileTransport(LogLevel.DEBUG, module, options));
    }

    if (level === LogLevel.VERBOSE || level === LogLevel.SILLY) {
      transports.push(createFileTransport(LogLevel.VERBOSE, module, options));
    }

    if (level === LogLevel.SILLY) {
      transports.push(createFileTransport(LogLevel.SILLY, module, options));
    }
  }

  // Create logger instance
  return winston.createLogger({
    level,
    defaultMeta: { module },
    transports,
    exitOnError: false,
  });
}

// Create a default instance for easy import
export default Logger;
