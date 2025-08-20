/**
 * Error Handler for Call Chain Analyzer
 * 
 * This module provides comprehensive error handling and recovery mechanisms
 * for the TypeScript call chain analysis process.
 */

import Logger from '../../utils/log';
import { ParseError } from './types';
import { ERROR_MESSAGES, PERFORMANCE_THRESHOLDS } from './constants';

const logger = Logger('error-handler');

/**
 * Custom error classes for different types of analysis errors
 */
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath?: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class ParseErrorClass extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line: number,
    public readonly column: number,
    public readonly severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class DependencyError extends Error {
  constructor(
    message: string,
    public readonly fromFile: string,
    public readonly toFile: string,
    public readonly cycle?: string[]
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly option: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error Handler class for managing analysis errors
 */
export class ErrorHandler {
  private errors: AnalysisError[] = [];
  private warnings: AnalysisError[] = [];
  private performanceIssues: string[] = [];

  /**
   * Handle a general analysis error
   */
  handleError(error: Error, context?: { filePath?: string; operation?: string }): void {
    const analysisError = this.convertToAnalysisError(error, context);
    this.errors.push(analysisError);
    
    logger.error('Analysis error occurred', {
      error: analysisError.message,
      code: analysisError.code,
      filePath: analysisError.filePath,
      operation: context?.operation
    });
  }

  /**
   * Handle a warning (non-fatal error)
   */
  handleWarning(message: string, context?: { filePath?: string; operation?: string }): void {
    const warning = new AnalysisError(
      message,
      'WARNING',
      context?.filePath
    );
    this.warnings.push(warning);
    
    logger.warn('Analysis warning', {
      message,
      filePath: context?.filePath,
      operation: context?.operation
    });
  }

  /**
   * Handle parse errors from file parsing
   */
  handleParseError(error: ParseErrorClass): void {
    const analysisError = new AnalysisError(
      error.message,
      'PARSE_ERROR',
      error.filePath,
      error.line,
      error.column
    );
    
    if (error.severity === 'error') {
      this.errors.push(analysisError);
      logger.error('Parse error', {
        message: error.message,
        filePath: error.filePath,
        line: error.line,
        column: error.column
      });
    } else {
      this.warnings.push(analysisError);
      logger.warn('Parse warning', {
        message: error.message,
        filePath: error.filePath,
        line: error.line,
        column: error.column
      });
    }
  }

  /**
   * Handle dependency resolution errors
   */
  handleDependencyError(error: DependencyError): void {
    const analysisError = new AnalysisError(
      error.message,
      'DEPENDENCY_ERROR',
      error.fromFile
    );
    
    this.errors.push(analysisError);
    
    logger.error('Dependency error', {
      message: error.message,
      fromFile: error.fromFile,
      toFile: error.toFile,
      cycle: error.cycle
    });
  }

  /**
   * Handle configuration errors
   */
  handleConfigurationError(error: ConfigurationError): void {
    const analysisError = new AnalysisError(
      error.message,
      'CONFIG_ERROR'
    );
    
    this.errors.push(analysisError);
    
    logger.error('Configuration error', {
      message: error.message,
      option: error.option
    });
  }

  /**
   * Track performance issues
   */
  trackPerformanceIssue(operation: string, duration: number, threshold: number): void {
    if (duration > threshold) {
      const issue = `${operation} took ${duration}ms (threshold: ${threshold}ms)`;
      this.performanceIssues.push(issue);
      
      logger.warn('Performance issue detected', {
        operation,
        duration,
        threshold
      });
    }
  }

  /**
   * Check if there are any fatal errors
   */
  hasFatalErrors(): boolean {
    return this.errors.some(error => this.isFatalError(error));
  }

  /**
   * Check if an error is fatal (should stop analysis)
   */
  private isFatalError(error: AnalysisError): boolean {
    const fatalCodes = [
      'CONFIG_ERROR',
      'INVALID_DIRECTORY',
      'NO_FILES_FOUND',
      'MAX_DEPTH_EXCEEDED',
      'TOO_MANY_FILES'
    ];
    
    return fatalCodes.includes(error.code);
  }

  /**
   * Convert generic error to AnalysisError
   */
  private convertToAnalysisError(error: Error, context?: { filePath?: string; operation?: string }): AnalysisError {
    let code = 'UNKNOWN_ERROR';
    
    // Determine error code based on message or type
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      code = 'FILE_NOT_FOUND';
    } else if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      code = 'PERMISSION_DENIED';
    } else if (error.message.includes('EMFILE') || error.message.includes('too many open files')) {
      code = 'TOO_MANY_FILES';
    } else if (error.message.includes('out of memory') || error.message.includes('heap')) {
      code = 'OUT_OF_MEMORY';
    } else if (error.message.includes('timeout')) {
      code = 'TIMEOUT';
    } else if (error instanceof SyntaxError) {
      code = 'SYNTAX_ERROR';
    } else if (error instanceof TypeError) {
      code = 'TYPE_ERROR';
    }
    
    return new AnalysisError(
      error.message,
      code,
      context?.filePath
    );
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    totalWarnings: number;
    fatalErrors: number;
    performanceIssues: number;
    errorsByCode: Record<string, number>;
  } {
    const errorsByCode: Record<string, number> = {};
    
    for (const error of this.errors) {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    }
    
    return {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      fatalErrors: this.errors.filter(e => this.isFatalError(e)).length,
      performanceIssues: this.performanceIssues.length,
      errorsByCode
    };
  }

  /**
   * Get all errors
   */
  getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * Get all warnings
   */
  getWarnings(): AnalysisError[] {
    return [...this.warnings];
  }

  /**
   * Get performance issues
   */
  getPerformanceIssues(): string[] {
    return [...this.performanceIssues];
  }

  /**
   * Clear all errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
    this.performanceIssues = [];
  }

  /**
   * Log error summary
   */
  logSummary(): void {
    const summary = this.getErrorSummary();
    
    if (summary.totalErrors > 0 || summary.totalWarnings > 0) {
      logger.info('Error summary', summary);
      
      if (summary.fatalErrors > 0) {
        logger.error(`${summary.fatalErrors} fatal errors detected`);
      }
      
      if (summary.performanceIssues > 0) {
        logger.warn(`${summary.performanceIssues} performance issues detected`);
      }
    } else {
      logger.info('No errors or warnings detected');
    }
  }

  /**
   * Create error recovery suggestions
   */
  getRecoverySuggestions(): string[] {
    const suggestions: string[] = [];
    const summary = this.getErrorSummary();
    
    if (summary.errorsByCode['FILE_NOT_FOUND']) {
      suggestions.push('Check that all file paths are correct and files exist');
    }
    
    if (summary.errorsByCode['PERMISSION_DENIED']) {
      suggestions.push('Ensure you have read permissions for all files and directories');
    }
    
    if (summary.errorsByCode['PARSE_ERROR']) {
      suggestions.push('Fix syntax errors in TypeScript/JavaScript files');
    }
    
    if (summary.errorsByCode['OUT_OF_MEMORY']) {
      suggestions.push('Try reducing the number of files or increasing Node.js memory limit');
    }
    
    if (summary.errorsByCode['TOO_MANY_FILES']) {
      suggestions.push('Use more specific include/exclude patterns to reduce file count');
    }
    
    if (summary.performanceIssues > 0) {
      suggestions.push('Consider using stricter analysis options to improve performance');
    }
    
    return suggestions;
  }

  /**
   * Attempt to recover from errors
   */
  attemptRecovery(): boolean {
    const summary = this.getErrorSummary();
    
    // If there are fatal errors, recovery is not possible
    if (summary.fatalErrors > 0) {
      logger.error('Cannot recover from fatal errors');
      return false;
    }
    
    // If only warnings and non-fatal errors, we can continue
    if (summary.totalErrors > 0) {
      logger.warn(`Continuing analysis despite ${summary.totalErrors} non-fatal errors`);
    }
    
    return true;
  }
}