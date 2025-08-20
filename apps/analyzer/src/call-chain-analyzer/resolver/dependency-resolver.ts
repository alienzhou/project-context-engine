/**
 * Dependency Resolver for Call Chain Analysis
 * 
 * This module resolves dependencies between files and functions to enable
 * accurate cross-file call chain analysis.
 */

import * as path from 'path';
import Logger from '../../utils/log';
import {
  FunctionDefinition,
  FunctionCall,
  FileAnalysisResult,
  DependencyGraph,
  SymbolIndex
} from '../core/types';
import { SymbolExtractor } from './symbol-extractor';

const logger = Logger('dependency-resolver');

/**
 * Dependency Resolver class for analyzing file and function dependencies
 */
export class DependencyResolver {
  private symbolExtractor: SymbolExtractor;
  private dependencyGraph: DependencyGraph;

  constructor(symbolExtractor: SymbolExtractor) {
    this.symbolExtractor = symbolExtractor;
    this.dependencyGraph = {
      dependencies: new Map(),
      dependents: new Map(),
      circularDependencies: []
    };
  }

  /**
   * Resolve all dependencies between files and functions
   */
  resolveDependencies(fileResults: FileAnalysisResult[]): DependencyGraph {
    logger.info(`Resolving dependencies for ${fileResults.length} files`);

    // Reset dependency graph
    this.resetDependencyGraph();

    // Build file-level dependencies
    this.buildFileDependencies(fileResults);

    // Resolve function call targets
    this.resolveFunctionCalls(fileResults);

    // Detect circular dependencies
    this.detectCircularDependencies();

    // Log statistics
    this.logDependencyStatistics();

    return this.dependencyGraph;
  }

  /**
   * Build file-level dependency graph based on imports
   */
  private buildFileDependencies(fileResults: FileAnalysisResult[]): void {
    for (const fileResult of fileResults) {
      const { filePath, imports } = fileResult;
      const dependencies: string[] = [];

      for (const importStmt of imports) {
        const resolvedPath = this.resolveImportPath(importStmt.module, filePath);
        if (resolvedPath && fileResults.some(f => f.filePath === resolvedPath)) {
          dependencies.push(resolvedPath);
          
          // Add to dependents map
          if (!this.dependencyGraph.dependents.has(resolvedPath)) {
            this.dependencyGraph.dependents.set(resolvedPath, []);
          }
          this.dependencyGraph.dependents.get(resolvedPath)!.push(filePath);
        }
      }

      this.dependencyGraph.dependencies.set(filePath, dependencies);
    }

    logger.debug(`Built file dependencies for ${fileResults.length} files`);
  }

  /**
   * Resolve function call targets using symbol index
   */
  private resolveFunctionCalls(fileResults: FileAnalysisResult[]): void {
    let resolvedCount = 0;
    let totalCalls = 0;

    for (const fileResult of fileResults) {
      for (const call of fileResult.calls) {
        totalCalls++;
        
        const targetFunction = this.symbolExtractor.resolveFunctionCall(call, fileResults);
        if (targetFunction) {
          call.calledFunctionId = targetFunction.id;
          resolvedCount++;
        }
      }
    }

    logger.info(`Resolved ${resolvedCount}/${totalCalls} function calls`);
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[][] = [];

    const dfs = (filePath: string, path: string[]): void => {
      if (recursionStack.has(filePath)) {
        // Found a cycle
        const cycleStart = path.indexOf(filePath);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).concat([filePath]);
          circularDeps.push(cycle);
        }
        return;
      }

      if (visited.has(filePath)) {
        return;
      }

      visited.add(filePath);
      recursionStack.add(filePath);

      const dependencies = this.dependencyGraph.dependencies.get(filePath) || [];
      for (const dep of dependencies) {
        dfs(dep, [...path, filePath]);
      }

      recursionStack.delete(filePath);
    };

    // Check each file for circular dependencies
    for (const filePath of this.dependencyGraph.dependencies.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    this.dependencyGraph.circularDependencies = circularDeps;

    if (circularDeps.length > 0) {
      logger.warn(`Found ${circularDeps.length} circular dependencies`, {
        cycles: circularDeps.map(cycle => cycle.join(' -> '))
      });
    }
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(modulePath: string, currentFilePath: string): string | null {
    try {
      // Handle relative imports
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        const currentDir = path.dirname(currentFilePath);
        let resolvedPath = path.resolve(currentDir, modulePath);
        
        // Normalize path separators
        resolvedPath = resolvedPath.replace(/\\/g, '/');
        
        // Try different extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const fullPath = resolvedPath + ext;
          // In a real implementation, you would check if file exists
          // For now, return the first valid extension
          return fullPath;
        }
        
        // Try index files
        for (const ext of extensions) {
          const indexPath = path.join(resolvedPath, 'index' + ext);
          return indexPath.replace(/\\/g, '/');
        }
      }

      // Handle absolute imports from node_modules or configured paths
      // For now, we skip these as they're typically external dependencies
      return null;
    } catch (error) {
      logger.warn(`Error resolving import path: ${modulePath}`, { error });
      return null;
    }
  }

  /**
   * Get all files that depend on a specific file
   */
  getDependents(filePath: string): string[] {
    return this.dependencyGraph.dependents.get(filePath) || [];
  }

  /**
   * Get all files that a specific file depends on
   */
  getDependencies(filePath: string): string[] {
    return this.dependencyGraph.dependencies.get(filePath) || [];
  }

  /**
   * Check if there's a dependency path between two files
   */
  hasDependencyPath(fromFile: string, toFile: string): boolean {
    const visited = new Set<string>();
    const queue = [fromFile];

    while (queue.length > 0) {
      const currentFile = queue.shift()!;
      
      if (currentFile === toFile) {
        return true;
      }

      if (visited.has(currentFile)) {
        continue;
      }

      visited.add(currentFile);
      
      const dependencies = this.getDependencies(currentFile);
      queue.push(...dependencies);
    }

    return false;
  }

  /**
   * Get the shortest dependency path between two files
   */
  getShortestDependencyPath(fromFile: string, toFile: string): string[] | null {
    const visited = new Set<string>();
    const queue: { file: string; path: string[] }[] = [{ file: fromFile, path: [fromFile] }];

    while (queue.length > 0) {
      const { file: currentFile, path } = queue.shift()!;
      
      if (currentFile === toFile) {
        return path;
      }

      if (visited.has(currentFile)) {
        continue;
      }

      visited.add(currentFile);
      
      const dependencies = this.getDependencies(currentFile);
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          queue.push({ file: dep, path: [...path, dep] });
        }
      }
    }

    return null;
  }

  /**
   * Get dependency graph statistics
   */
  getDependencyStatistics(): {
    totalFiles: number;
    totalDependencies: number;
    averageDependencies: number;
    circularDependencies: number;
    isolatedFiles: number;
  } {
    const totalFiles = this.dependencyGraph.dependencies.size;
    let totalDependencies = 0;
    let isolatedFiles = 0;

    for (const deps of this.dependencyGraph.dependencies.values()) {
      totalDependencies += deps.length;
      if (deps.length === 0) {
        isolatedFiles++;
      }
    }

    const averageDependencies = totalFiles > 0 ? totalDependencies / totalFiles : 0;
    const circularDependencies = this.dependencyGraph.circularDependencies.length;

    return {
      totalFiles,
      totalDependencies,
      averageDependencies: Math.round(averageDependencies * 100) / 100,
      circularDependencies,
      isolatedFiles
    };
  }

  /**
   * Get files sorted by dependency order (topological sort)
   */
  getTopologicalOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const temp = new Set<string>();

    const visit = (filePath: string): void => {
      if (temp.has(filePath)) {
        // Circular dependency detected, skip
        return;
      }

      if (visited.has(filePath)) {
        return;
      }

      temp.add(filePath);
      
      const dependencies = this.getDependencies(filePath);
      for (const dep of dependencies) {
        visit(dep);
      }

      temp.delete(filePath);
      visited.add(filePath);
      result.push(filePath);
    };

    // Visit all files
    for (const filePath of this.dependencyGraph.dependencies.keys()) {
      if (!visited.has(filePath)) {
        visit(filePath);
      }
    }

    return result;
  }

  /**
   * Reset the dependency graph
   */
  private resetDependencyGraph(): void {
    this.dependencyGraph.dependencies.clear();
    this.dependencyGraph.dependents.clear();
    this.dependencyGraph.circularDependencies = [];
  }

  /**
   * Log dependency resolution statistics
   */
  private logDependencyStatistics(): void {
    const stats = this.getDependencyStatistics();
    logger.info('Dependency resolution completed', {
      totalFiles: stats.totalFiles,
      totalDependencies: stats.totalDependencies,
      averageDependencies: stats.averageDependencies,
      circularDependencies: stats.circularDependencies,
      isolatedFiles: stats.isolatedFiles
    });
  }

  /**
   * Get the current dependency graph
   */
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }
}