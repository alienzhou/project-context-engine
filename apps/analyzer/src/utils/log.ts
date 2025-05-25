import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { format } from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * 定义日志级别
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
 * 日志配置选项接口
 */
export interface LogOptions {
  level?: LogLevel;              // 日志级别
  dirname?: string;              // 日志文件目录
  maxDays?: number;              // 日志保留最大天数
  maxSize?: string;              // 单个日志文件最大大小
  zippedArchive?: boolean;       // 是否压缩归档日志
  disableConsole?: boolean;      // 是否禁用控制台输出
  disableFile?: boolean;         // 是否禁用文件输出
}

/**
 * 默认日志配置选项
 */
const DEFAULT_LOG_OPTIONS: LogOptions = {
  level: LogLevel.INFO,
  dirname: path.join(process.cwd(), 'logs'),
  maxDays: 14,                    // 保留14天的日志
  maxSize: '20m',                 // 单个日志文件最大20MB
  zippedArchive: true,            // 压缩旧日志
  disableConsole: false,          // 默认启用控制台输出
  disableFile: false,             // 默认启用文件输出
};

/**
 * 确保日志目录存在
 * @param dirname 日志目录路径
 */
function ensureLogDirExists(dirname: string): void {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * 自定义格式化方法 - 用于文件输出
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
 * 自定义彩色格式 - 用于控制台输出
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
 * 创建特定级别的日志文件传输器
 * @param level 日志级别
 * @param module 模块名称
 * @param options 日志配置选项
 * @returns 日志文件传输器
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
 * 创建日志记录器实例
 * @param module 模块名称
 * @param options 日志配置选项
 * @returns 带有各种日志级别方法的记录器实例
 */
export function Logger(module: string, customOptions: Partial<LogOptions> = {}): winston.Logger {
  // 合并默认选项和用户提供的选项
  const options: LogOptions = { ...DEFAULT_LOG_OPTIONS, ...customOptions };
  const { level, disableConsole, disableFile } = options;
  
  // 准备传输器
  const transports: winston.transport[] = [];
  
  // 添加控制台传输器（如果未禁用）
  if (!disableConsole) {
    transports.push(
      new winston.transports.Console({
        level,
        format: consoleFormat
      })
    );
  }
  
  // 添加文件传输器（如果未禁用）
  if (!disableFile) {
    // 为不同级别创建独立的文件传输器
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
  
  // 创建日志记录器实例
  return winston.createLogger({
    level,
    defaultMeta: { module },
    transports,
    exitOnError: false,
  });
}

// 为方便导入，创建一个默认实例
export default Logger;
