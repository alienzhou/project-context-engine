/**
 * JSON Output Formatter for Call Chain Analysis
 * 
 * This module formats call chain analysis results into structured JSON output
 * suitable for consumption by other tools and systems.
 */

import * as fs from 'fs';
import * as path from 'path';
import Logger from '../../utils/log';
import {
  AnalysisResult,
  CallChain,
  CallChainNode,
  FunctionDefinition,
  FunctionCall,
  DependencyGraph,
  SymbolIndex,
  AnalysisMetadata
} from '../core/types';
import { ANALYZER_VERSION } from '../core/constants';

const logger = Logger('json-formatter');

/**
 * Serializable versions of internal types for JSON output
 */
interface SerializableAnalysisResult {
  functions: FunctionDefinition[];
  calls: FunctionCall[];
  callChains: SerializableCallChain[];
  dependencyGraph: SerializableDependencyGraph;
  symbolIndex: SerializableSymbolIndex;
  metadata: AnalysisMetadata;
}

interface SerializableCallChain {
  id: string;
  rootFunction: FunctionDefinition;
  nodes: SerializableCallChainNode[];
  depth: number;
  totalCalls: number;
  involvedFiles: string[];
}

interface SerializableCallChainNode {
  function: FunctionDefinition;
  calls: FunctionCall[];
  children: SerializableCallChainNode[];
  depth: number;
  parentId?: string;
}

interface SerializableDependencyGraph {
  dependencies: Record<string, string[]>;
  dependents: Record<string, string[]>;
  circularDependencies: string[][];
}

interface SerializableSymbolIndex {
  byName: Record<string, FunctionDefinition[]>;
  byFile: Record<string, FunctionDefinition[]>;
  byId: Record<string, FunctionDefinition>;
  byClass: Record<string, FunctionDefinition[]>;
}

/**
 * JSON Output Formatter class
 */
export class JsonOutputFormatter {
  /**
   * Format analysis result to JSON string
   */
  formatToJson(result: AnalysisResult, pretty = true): string {
    try {
      const serializableResult = this.convertToSerializable(result);
      
      if (pretty) {
        return JSON.stringify(serializableResult, null, 2);
      } else {
        return JSON.stringify(serializableResult);
      }
    } catch (error) {
      logger.error('Error formatting result to JSON', { error });
      throw error;
    }
  }

  /**
   * Save analysis result to JSON file
   */
  async saveToFile(result: AnalysisResult, outputPath: string): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const jsonContent = this.formatToJson(result, true);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      
      logger.info(`Analysis result saved to ${outputPath}`);
      
      // Log file size
      const stats = fs.statSync(outputPath);
      logger.info(`Output file size: ${this.formatFileSize(stats.size)}`);
      
    } catch (error) {
      logger.error(`Error saving result to file: ${outputPath}`, { error });
      throw error;
    }
  }

  /**
   * Format only call chains to JSON (lighter output)
   */
  formatCallChainsToJson(callChains: CallChain[], metadata: AnalysisMetadata, pretty = true): string {
    try {
      const output = {
        callChains: callChains.map(chain => this.convertCallChainToSerializable(chain)),
        metadata,
        generatedAt: new Date().toISOString(),
        version: ANALYZER_VERSION
      };
      
      if (pretty) {
        return JSON.stringify(output, null, 2);
      } else {
        return JSON.stringify(output);
      }
    } catch (error) {
      logger.error('Error formatting call chains to JSON', { error });
      throw error;
    }
  }

  /**
   * Save only call chains to JSON file
   */
  async saveCallChainsToFile(
    callChains: CallChain[], 
    metadata: AnalysisMetadata, 
    outputPath: string
  ): Promise<void> {
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const jsonContent = this.formatCallChainsToJson(callChains, metadata, true);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      
      logger.info(`Call chains saved to ${outputPath}`);
      
      const stats = fs.statSync(outputPath);
      logger.info(`Output file size: ${this.formatFileSize(stats.size)}`);
      
    } catch (error) {
      logger.error(`Error saving call chains to file: ${outputPath}`, { error });
      throw error;
    }
  }

  /**
   * Create summary report in JSON format
   */
  createSummaryReport(result: AnalysisResult): string {
    const summary = {
      metadata: result.metadata,
      statistics: {
        totalFunctions: result.functions.length,
        totalCalls: result.calls.length,
        totalCallChains: result.callChains.length,
        totalFiles: result.symbolIndex.byFile.size,
        exportedFunctions: result.functions.filter(f => f.isExported).length,
        asyncFunctions: result.functions.filter(f => f.isAsync).length,
        classesWithMethods: result.symbolIndex.byClass.size,
        circularDependencies: result.dependencyGraph.circularDependencies.length
      },
      topCallChains: result.callChains
        .slice(0, 10)
        .map(chain => ({
          id: chain.id,
          rootFunction: chain.rootFunction.name,
          depth: chain.depth,
          totalCalls: chain.totalCalls,
          involvedFiles: chain.involvedFiles.length
        })),
      fileStatistics: this.calculateFileStatistics(result),
      generatedAt: new Date().toISOString(),
      version: ANALYZER_VERSION
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Convert analysis result to serializable format
   */
  private convertToSerializable(result: AnalysisResult): SerializableAnalysisResult {
    return {
      functions: result.functions,
      calls: result.calls,
      callChains: result.callChains.map(chain => this.convertCallChainToSerializable(chain)),
      dependencyGraph: this.convertDependencyGraphToSerializable(result.dependencyGraph),
      symbolIndex: this.convertSymbolIndexToSerializable(result.symbolIndex),
      metadata: result.metadata
    };
  }

  /**
   * Convert call chain to serializable format
   */
  private convertCallChainToSerializable(chain: CallChain): SerializableCallChain {
    return {
      id: chain.id,
      rootFunction: chain.rootFunction,
      nodes: chain.nodes.map(node => this.convertCallChainNodeToSerializable(node)),
      depth: chain.depth,
      totalCalls: chain.totalCalls,
      involvedFiles: chain.involvedFiles
    };
  }

  /**
   * Convert call chain node to serializable format
   */
  private convertCallChainNodeToSerializable(node: CallChainNode): SerializableCallChainNode {
    return {
      function: node.function,
      calls: node.calls,
      children: node.children.map(child => this.convertCallChainNodeToSerializable(child)),
      depth: node.depth,
      parentId: node.parentId
    };
  }

  /**
   * Convert dependency graph to serializable format
   */
  private convertDependencyGraphToSerializable(graph: DependencyGraph): SerializableDependencyGraph {
    const dependencies: Record<string, string[]> = {};
    const dependents: Record<string, string[]> = {};

    for (const [key, value] of graph.dependencies.entries()) {
      dependencies[key] = value;
    }

    for (const [key, value] of graph.dependents.entries()) {
      dependents[key] = value;
    }

    return {
      dependencies,
      dependents,
      circularDependencies: graph.circularDependencies
    };
  }

  /**
   * Convert symbol index to serializable format
   */
  private convertSymbolIndexToSerializable(index: SymbolIndex): SerializableSymbolIndex {
    const byName: Record<string, FunctionDefinition[]> = {};
    const byFile: Record<string, FunctionDefinition[]> = {};
    const byId: Record<string, FunctionDefinition> = {};
    const byClass: Record<string, FunctionDefinition[]> = {};

    for (const [key, value] of index.byName.entries()) {
      byName[key] = value;
    }

    for (const [key, value] of index.byFile.entries()) {
      byFile[key] = value;
    }

    for (const [key, value] of index.byId.entries()) {
      byId[key] = value;
    }

    for (const [key, value] of index.byClass.entries()) {
      byClass[key] = value;
    }

    return { byName, byFile, byId, byClass };
  }

  /**
   * Calculate file-level statistics
   */
  private calculateFileStatistics(result: AnalysisResult): Record<string, any> {
    const fileStats: Record<string, any> = {};

    for (const [filePath, functions] of result.symbolIndex.byFile.entries()) {
      const fileCalls = result.calls.filter(call => call.filePath === filePath);
      const exportedFunctions = functions.filter(f => f.isExported);
      
      fileStats[filePath] = {
        totalFunctions: functions.length,
        exportedFunctions: exportedFunctions.length,
        totalCalls: fileCalls.length,
        avgFunctionLength: this.calculateAvgFunctionLength(functions),
        hasCircularDeps: result.dependencyGraph.circularDependencies.some(cycle => 
          cycle.includes(filePath)
        )
      };
    }

    return fileStats;
  }

  /**
   * Calculate average function length in lines
   */
  private calculateAvgFunctionLength(functions: FunctionDefinition[]): number {
    if (functions.length === 0) return 0;
    
    const totalLines = functions.reduce((sum, func) => sum + (func.endLine - func.startLine + 1), 0);
    return Math.round((totalLines / functions.length) * 100) / 100;
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * Validate JSON output structure
   */
  validateOutput(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic structure validation
      const requiredFields = ['functions', 'calls', 'callChains', 'metadata'];
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          logger.error(`Missing required field: ${field}`);
          return false;
        }
      }

      // Validate arrays
      if (!Array.isArray(parsed.functions) || !Array.isArray(parsed.calls) || !Array.isArray(parsed.callChains)) {
        logger.error('Functions, calls, and callChains must be arrays');
        return false;
      }

      logger.info('JSON output validation passed');
      return true;
    } catch (error) {
      logger.error('JSON validation failed', { error });
      return false;
    }
  }
}