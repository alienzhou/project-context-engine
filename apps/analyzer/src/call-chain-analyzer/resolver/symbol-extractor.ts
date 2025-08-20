/**
 * Symbol Extractor for Call Chain Analysis
 * 
 * This module extracts and indexes symbols (functions, classes, etc.) from
 * parsed TypeScript/JavaScript files to enable cross-file dependency resolution.
 */

import * as path from 'path';
import Logger from '../../utils/log';
import {
  FunctionDefinition,
  FunctionCall,
  FileAnalysisResult,
  SymbolIndex,
  ImportStatement,
  ExportStatement
} from '../core/types';

const logger = Logger('symbol-extractor');

/**
 * Symbol Extractor class for building symbol indexes
 */
export class SymbolExtractor {
  private symbolIndex: SymbolIndex;

  constructor() {
    this.symbolIndex = {
      byName: new Map(),
      byFile: new Map(),
      byId: new Map(),
      byClass: new Map()
    };
  }

  /**
   * Extract symbols from multiple file analysis results
   */
  extractSymbols(fileResults: FileAnalysisResult[]): SymbolIndex {
    logger.info(`Extracting symbols from ${fileResults.length} files`);

    // Reset index
    this.resetIndex();

    // Process each file
    for (const fileResult of fileResults) {
      this.processFileResult(fileResult);
    }

    // Log statistics
    this.logStatistics();

    return this.symbolIndex;
  }

  /**
   * Process a single file analysis result
   */
  private processFileResult(fileResult: FileAnalysisResult): void {
    const { filePath, functions } = fileResult;

    // Index functions by file
    this.symbolIndex.byFile.set(filePath, functions);

    // Index each function
    for (const func of functions) {
      this.indexFunction(func);
    }

    logger.debug(`Processed ${functions.length} functions from ${filePath}`);
  }

  /**
   * Index a single function definition
   */
  private indexFunction(func: FunctionDefinition): void {
    // Index by ID
    this.symbolIndex.byId.set(func.id, func);

    // Index by name
    if (!this.symbolIndex.byName.has(func.name)) {
      this.symbolIndex.byName.set(func.name, []);
    }
    this.symbolIndex.byName.get(func.name)!.push(func);

    // Index by class (if it's a method)
    if (func.className) {
      if (!this.symbolIndex.byClass.has(func.className)) {
        this.symbolIndex.byClass.set(func.className, []);
      }
      this.symbolIndex.byClass.get(func.className)!.push(func);
    }
  }

  /**
   * Find function definitions by name
   */
  findFunctionsByName(name: string): FunctionDefinition[] {
    return this.symbolIndex.byName.get(name) || [];
  }

  /**
   * Find function definition by ID
   */
  findFunctionById(id: string): FunctionDefinition | undefined {
    return this.symbolIndex.byId.get(id);
  }

  /**
   * Find functions in a specific file
   */
  findFunctionsByFile(filePath: string): FunctionDefinition[] {
    return this.symbolIndex.byFile.get(filePath) || [];
  }

  /**
   * Find methods of a specific class
   */
  findMethodsByClass(className: string): FunctionDefinition[] {
    return this.symbolIndex.byClass.get(className) || [];
  }

  /**
   * Resolve function call to its definition
   */
  resolveFunctionCall(call: FunctionCall, fileResults: FileAnalysisResult[]): FunctionDefinition | null {
    // First, try to find in the same file
    const currentFileResult = fileResults.find(f => f.filePath === call.filePath);
    if (currentFileResult) {
      const localFunction = this.findLocalFunction(call, currentFileResult);
      if (localFunction) {
        return localFunction;
      }
    }

    // Then, try to find in imported modules
    if (currentFileResult) {
      const importedFunction = this.findImportedFunction(call, currentFileResult, fileResults);
      if (importedFunction) {
        return importedFunction;
      }
    }

    // Finally, try global search by name
    const candidates = this.findFunctionsByName(call.functionName);
    if (candidates.length === 1) {
      return candidates[0];
    }

    // If multiple candidates, prefer exported functions
    const exportedCandidates = candidates.filter(f => f.isExported);
    if (exportedCandidates.length === 1) {
      return exportedCandidates[0];
    }

    logger.debug(`Could not resolve function call: ${call.functionName} in ${call.filePath}:${call.line}`);
    return null;
  }

  /**
   * Find function in the same file as the call
   */
  private findLocalFunction(call: FunctionCall, fileResult: FileAnalysisResult): FunctionDefinition | null {
    // If caller function ID is provided, find the function that contains this call
    if (call.callerFunctionId) {
      const callerFunction = this.findFunctionById(call.callerFunctionId);
      if (callerFunction) {
        // Look for the called function in the same file
        const localFunctions = fileResult.functions.filter(f => f.name === call.functionName);
        if (localFunctions.length > 0) {
          return localFunctions[0];
        }
      }
    }

    // Direct search in the same file
    const localFunctions = fileResult.functions.filter(f => f.name === call.functionName);
    return localFunctions.length > 0 ? localFunctions[0] : null;
  }

  /**
   * Find function in imported modules
   */
  private findImportedFunction(
    call: FunctionCall,
    currentFileResult: FileAnalysisResult,
    allFileResults: FileAnalysisResult[]
  ): FunctionDefinition | null {
    // Check imports for the function name
    for (const importStmt of currentFileResult.imports) {
      if (importStmt.imports.includes(call.functionName)) {
        // Resolve the import path to actual file
        const resolvedPath = this.resolveImportPath(importStmt.module, currentFileResult.filePath);
        if (resolvedPath) {
          const importedFileResult = allFileResults.find(f => f.filePath === resolvedPath);
          if (importedFileResult) {
            const exportedFunction = importedFileResult.functions.find(f => 
              f.name === call.functionName && f.isExported
            );
            if (exportedFunction) {
              return exportedFunction;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(modulePath: string, currentFilePath: string): string | null {
    try {
      // Handle relative imports
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        const currentDir = path.dirname(currentFilePath);
        const resolvedPath = path.resolve(currentDir, modulePath);
        
        // Try different extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const fullPath = resolvedPath + ext;
          // In a real implementation, you would check if file exists
          // For now, just return the path with .ts extension
          if (ext === '.ts') {
            return fullPath;
          }
        }
      }

      // Handle absolute imports (would need module resolution logic)
      // For now, return null for absolute imports
      return null;
    } catch (error) {
      logger.warn(`Error resolving import path: ${modulePath}`, { error });
      return null;
    }
  }

  /**
   * Get all exported functions from a file
   */
  getExportedFunctions(filePath: string): FunctionDefinition[] {
    const functions = this.findFunctionsByFile(filePath);
    return functions.filter(f => f.isExported);
  }

  /**
   * Get symbol index statistics
   */
  getStatistics(): {
    totalFunctions: number;
    totalFiles: number;
    functionsPerFile: number;
    exportedFunctions: number;
    classesWithMethods: number;
  } {
    const totalFunctions = this.symbolIndex.byId.size;
    const totalFiles = this.symbolIndex.byFile.size;
    const functionsPerFile = totalFiles > 0 ? totalFunctions / totalFiles : 0;
    
    let exportedFunctions = 0;
    for (const func of this.symbolIndex.byId.values()) {
      if (func.isExported) {
        exportedFunctions++;
      }
    }

    const classesWithMethods = this.symbolIndex.byClass.size;

    return {
      totalFunctions,
      totalFiles,
      functionsPerFile: Math.round(functionsPerFile * 100) / 100,
      exportedFunctions,
      classesWithMethods
    };
  }

  /**
   * Reset the symbol index
   */
  private resetIndex(): void {
    this.symbolIndex.byName.clear();
    this.symbolIndex.byFile.clear();
    this.symbolIndex.byId.clear();
    this.symbolIndex.byClass.clear();
  }

  /**
   * Log symbol extraction statistics
   */
  private logStatistics(): void {
    const stats = this.getStatistics();
    logger.info('Symbol extraction completed', {
      totalFunctions: stats.totalFunctions,
      totalFiles: stats.totalFiles,
      functionsPerFile: stats.functionsPerFile,
      exportedFunctions: stats.exportedFunctions,
      classesWithMethods: stats.classesWithMethods
    });
  }

  /**
   * Get the current symbol index
   */
  getSymbolIndex(): SymbolIndex {
    return this.symbolIndex;
  }

  /**
   * Find all functions that call a specific function
   */
  findCallers(targetFunctionId: string, allCalls: FunctionCall[]): FunctionCall[] {
    return allCalls.filter(call => call.calledFunctionId === targetFunctionId);
  }

  /**
   * Find all functions called by a specific function
   */
  findCallees(callerFunctionId: string, allCalls: FunctionCall[]): FunctionCall[] {
    return allCalls.filter(call => call.callerFunctionId === callerFunctionId);
  }

  /**
   * Check if a function is a leaf function (doesn't call other functions)
   */
  isLeafFunction(functionId: string, allCalls: FunctionCall[]): boolean {
    return !allCalls.some(call => call.callerFunctionId === functionId);
  }

  /**
   * Check if a function is a root function (not called by other functions)
   */
  isRootFunction(functionId: string, allCalls: FunctionCall[]): boolean {
    return !allCalls.some(call => call.calledFunctionId === functionId);
  }
}