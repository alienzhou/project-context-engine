/**
 * Performance Monitor for Call Chain Analyzer
 * 
 * This module provides performance monitoring and optimization utilities
 * to track memory usage, execution time, and identify bottlenecks.
 */

import Logger from '../../utils/log';
import { PERFORMANCE_THRESHOLDS } from './constants';

const logger = Logger('performance-monitor');

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore: number;
  memoryAfter?: number;
  memoryDelta?: number;
  metadata?: Record<string, any>;
}

/**
 * Memory usage information
 */
interface MemoryUsage {
  rss: number;        // Resident Set Size
  heapTotal: number;  // Total heap size
  heapUsed: number;   // Used heap size
  external: number;   // External memory usage
  arrayBuffers: number; // Array buffer usage
}

/**
 * Performance Monitor class for tracking analysis performance
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, PerformanceMetrics> = new Map();
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private memoryWarningThreshold: number;

  constructor(memoryWarningThreshold = PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB * 1024 * 1024) {
    this.memoryWarningThreshold = memoryWarningThreshold;
    this.startMemoryMonitoring();
  }

  /**
   * Start monitoring an operation
   */
  startOperation(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      operation: operationName,
      startTime: Date.now(),
      memoryBefore: this.getCurrentMemoryUsage().heapUsed,
      metadata
    };

    this.activeOperations.set(operationId, metric);
    logger.debug(`Started operation: ${operationName}`, { operationId, metadata });
  }

  /**
   * End monitoring an operation
   */
  endOperation(operationId: string): PerformanceMetrics | null {
    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      logger.warn(`Operation not found: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const memoryAfter = this.getCurrentMemoryUsage().heapUsed;

    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.memoryAfter = memoryAfter;
    metric.memoryDelta = memoryAfter - metric.memoryBefore;

    this.activeOperations.delete(operationId);
    this.metrics.push(metric);

    // Check for performance issues
    this.checkPerformanceThresholds(metric);

    logger.debug(`Completed operation: ${metric.operation}`, {
      operationId,
      duration: metric.duration,
      memoryDelta: this.formatBytes(metric.memoryDelta)
    });

    return metric;
  }

  /**
   * Measure execution time of a function
   */
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operationName}-${Date.now()}`;
    this.startOperation(operationId, operationName, metadata);

    try {
      const result = await operation();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  measure<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const operationId = `${operationName}-${Date.now()}`;
    this.startOperation(operationId, operationName, metadata);

    try {
      const result = operation();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      throw error;
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      logger.debug('Forcing garbage collection');
      global.gc();
    } else {
      logger.warn('Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetrics | null;
    fastestOperation: PerformanceMetrics | null;
    totalMemoryAllocated: number;
    averageMemoryUsage: number;
    currentMemoryUsage: MemoryUsage;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
        totalMemoryAllocated: 0,
        averageMemoryUsage: 0,
        currentMemoryUsage: this.getCurrentMemoryUsage()
      };
    }

    const durations = this.metrics.map(m => m.duration || 0);
    const memoryDeltas = this.metrics.map(m => m.memoryDelta || 0);

    const slowestOperation = this.metrics.reduce((prev, current) => 
      (current.duration || 0) > (prev.duration || 0) ? current : prev
    );

    const fastestOperation = this.metrics.reduce((prev, current) => 
      (current.duration || 0) < (prev.duration || 0) ? current : prev
    );

    return {
      totalOperations: this.metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowestOperation,
      fastestOperation,
      totalMemoryAllocated: memoryDeltas.reduce((a, b) => a + b, 0),
      averageMemoryUsage: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
      currentMemoryUsage: this.getCurrentMemoryUsage()
    };
  }

  /**
   * Get operations by type
   */
  getOperationsByType(operationType: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.operation === operationType);
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold = PERFORMANCE_THRESHOLDS.SLOW_ANALYSIS_MS): PerformanceMetrics[] {
    return this.metrics.filter(m => (m.duration || 0) > threshold);
  }

  /**
   * Get memory-intensive operations
   */
  getMemoryIntensiveOperations(threshold = 50 * 1024 * 1024): PerformanceMetrics[] {
    return this.metrics.filter(m => (m.memoryDelta || 0) > threshold);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
    logger.debug('Performance metrics cleared');
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const stats = this.getStatistics();
    
    logger.info('Performance Summary', {
      totalOperations: stats.totalOperations,
      averageDuration: `${Math.round(stats.averageDuration)}ms`,
      slowestOperation: stats.slowestOperation ? {
        operation: stats.slowestOperation.operation,
        duration: `${stats.slowestOperation.duration}ms`
      } : null,
      currentMemoryUsage: {
        heapUsed: this.formatBytes(stats.currentMemoryUsage.heapUsed),
        heapTotal: this.formatBytes(stats.currentMemoryUsage.heapTotal),
        rss: this.formatBytes(stats.currentMemoryUsage.rss)
      }
    });

    // Log slow operations
    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      logger.warn(`Found ${slowOps.length} slow operations`, {
        operations: slowOps.map(op => ({
          operation: op.operation,
          duration: `${op.duration}ms`
        }))
      });
    }

    // Log memory-intensive operations
    const memoryOps = this.getMemoryIntensiveOperations();
    if (memoryOps.length > 0) {
      logger.warn(`Found ${memoryOps.length} memory-intensive operations`, {
        operations: memoryOps.map(op => ({
          operation: op.operation,
          memoryDelta: this.formatBytes(op.memoryDelta || 0)
        }))
      });
    }
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const usage = this.getCurrentMemoryUsage();
      
      if (usage.heapUsed > this.memoryWarningThreshold) {
        logger.warn('High memory usage detected', {
          heapUsed: this.formatBytes(usage.heapUsed),
          heapTotal: this.formatBytes(usage.heapTotal),
          threshold: this.formatBytes(this.memoryWarningThreshold)
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkPerformanceThresholds(metric: PerformanceMetrics): void {
    if (metric.duration && metric.duration > PERFORMANCE_THRESHOLDS.SLOW_ANALYSIS_MS) {
      logger.warn('Slow operation detected', {
        operation: metric.operation,
        duration: `${metric.duration}ms`,
        threshold: `${PERFORMANCE_THRESHOLDS.SLOW_ANALYSIS_MS}ms`
      });
    }

    if (metric.memoryDelta && metric.memoryDelta > 100 * 1024 * 1024) { // 100MB
      logger.warn('High memory allocation detected', {
        operation: metric.operation,
        memoryDelta: this.formatBytes(metric.memoryDelta),
        memoryAfter: this.formatBytes(metric.memoryAfter || 0)
      });
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Math.abs(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const sign = bytes < 0 ? '-' : '';
    return `${sign}${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMemoryMonitoring();
    this.clearMetrics();
  }
}