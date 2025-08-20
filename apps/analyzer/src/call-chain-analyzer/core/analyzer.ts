/**
 * Main Call Chain Analyzer
 * 
 * This is the main orchestrator class that coordinates all components
 * to perform complete TypeScript call chain analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import Logger from '../../utils/log';
import {
  AnalysisResult,
  AnalysisOptions,
  FileAnalysisResult,
  AnalysisMetadata
} from './types';
import {
  DEFAULT_ANALYSIS_OPTIONS,
  ANALYZER_VERSION,
  MAX_FILES_COUNT,
  ERROR_MESSAGES
} from './constants';
import { TypeScriptParser } from '../parser/typescript-parser';
import { SymbolExtractor } from '../resolver/symbol-extractor';
import { DependencyResolver } from '../resolver/dependency-resolver';
import { CallChainBuilder } from '../builder/call-chain-builder';
import { JsonOutputFormatter } from '../output/json-formatter';
import { ErrorHandler } from './error-handler';
import { PerformanceMonitor } from './performance-monitor';

const logger = Logger('call-chain-analyzer');

/**
 * Main Call Chain Analyzer class
 */
export class CallChainAnalyzer {
  private parser: TypeScriptParser;
  private symbolExtractor: SymbolExtractor;
  private dependencyResolver: DependencyResolver;
  private jsonFormatter: JsonOutputFormatter;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private options: AnalysisOptions;

  constructor(options: Partial<AnalysisOptions> = {}) {
    this.options = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
    this.parser = new TypeScriptParser();
    this.symbolExtractor = new SymbolExtractor();
    this.jsonFormatter = new JsonOutputFormatter();
    this.errorHandler = new ErrorHandler();
    this.performanceMonitor = new PerformanceMonitor();
    
    // DependencyResolver will be initialized after symbol extraction
    this.dependencyResolver = new DependencyResolver(this.symbolExtractor);
    
    // Validate options
    this.validateOptions();
  }

  /**
   * Analyze TypeScript call chains in the specified directory
   */
  async analyze(rootDirectory?: string): Promise<AnalysisResult> {
    const startTime = new Date();
    logger.info('Starting TypeScript call chain analysis...');

    return this.performanceMonitor.measureAsync('full_analysis', async () => {
      try {
        // Use provided directory or default from options
        const targetDirectory = rootDirectory || this.options.rootDirectory;
        
        // Validate directory
        if (!fs.existsSync(targetDirectory)) {
          throw new Error(ERROR_MESSAGES.INVALID_DIRECTORY);
        }

        // Discover files
        const files = await this.performanceMonitor.measureAsync('file_discovery', 
          () => this.discoverFiles(targetDirectory),
          { targetDirectory, fileCount: 0 }
        );
        
        if (files.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_FILES_FOUND);
        }

        logger.info(`Found ${files.length} files to analyze`);

        // Parse all files
        const fileResults = await this.performanceMonitor.measureAsync('file_parsing',
          () => this.parseFiles(files),
          { fileCount: files.length }
        );
        
        // Extract symbols and build index
        const symbolIndex = this.performanceMonitor.measure('symbol_extraction',
          () => this.symbolExtractor.extractSymbols(fileResults),
          { fileCount: files.length }
        );
        
        // Resolve dependencies
        const dependencyGraph = this.performanceMonitor.measure('dependency_resolution',
          () => this.dependencyResolver.resolveDependencies(fileResults),
          { fileCount: files.length }
        );
        
        // Collect all functions and calls
        const allFunctions = fileResults.flatMap(result => result.functions);
        const allCalls = fileResults.flatMap(result => result.calls);
        
        // Build call chains
        const callChainBuilder = new CallChainBuilder(symbolIndex, allCalls, this.options);
        const callChains = this.performanceMonitor.measure('call_chain_building',
          () => callChainBuilder.buildCallChains(),
          { functionCount: allFunctions.length, callCount: allCalls.length }
        );
      
      // Create metadata
      const endTime = new Date();
      const metadata: AnalysisMetadata = {
        totalFiles: files.length,
        totalFunctions: allFunctions.length,
        totalCalls: allCalls.length,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        analyzerVersion: ANALYZER_VERSION
      };

      const result: AnalysisResult = {
        functions: allFunctions,
        calls: allCalls,
        callChains,
        dependencyGraph,
        symbolIndex,
        metadata
      };

      logger.info('Analysis completed successfully', {
        duration: metadata.duration,
        totalFiles: metadata.totalFiles,
        totalFunctions: metadata.totalFunctions,
        totalCalls: metadata.totalCalls,
        totalCallChains: callChains.length
      });

      return result;

    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'analysis' });
      this.errorHandler.logSummary();
      
      if (this.errorHandler.hasFatalErrors()) {
        const suggestions = this.errorHandler.getRecoverySuggestions();
        logger.error('Analysis failed with fatal errors', { suggestions });
        throw error;
      }
      
      // Try to recover from non-fatal errors
      if (!this.errorHandler.attemptRecovery()) {
        throw error;
      }
      
      logger.error('Analysis failed', { error });
      throw error;
    } finally {
      // Always log error summary and performance statistics
      this.errorHandler.logSummary();
      this.performanceMonitor.logSummary();
    }
    }, { rootDirectory: targetDirectory });
  }

  /**
   * Analyze and save results to JSON file
   */
  async analyzeAndSave(rootDirectory?: string, outputPath?: string): Promise<AnalysisResult> {
    const result = await this.analyze(rootDirectory);
    
    if (outputPath) {
      await this.jsonFormatter.saveToFile(result, outputPath);
    }
    
    return result;
  }

  /**
   * Analyze and save only call chains (lighter output)
   */
  async analyzeAndSaveCallChains(rootDirectory?: string, outputPath?: string): Promise<AnalysisResult> {
    const result = await this.analyze(rootDirectory);
    
    if (outputPath) {
      await this.jsonFormatter.saveCallChainsToFile(result.callChains, result.metadata, outputPath);
    }
    
    return result;
  }

  /**
   * Discover TypeScript/JavaScript files in the directory
   */
  private async discoverFiles(directory: string): Promise<string[]> {
    try {
      const patterns = this.options.includePatterns.map(pattern => 
        path.join(directory, pattern).replace(/\\/g, '/')
      );

      let files: string[] = [];
      for (const pattern of patterns) {
        const matchedFiles = await glob(pattern, {
          ignore: this.options.excludePatterns,
          absolute: true
        });
        files.push(...matchedFiles);
      }

      // Remove duplicates and filter by supported extensions
      files = [...new Set(files)].filter(file => TypeScriptParser.isSupportedFile(file));

      // Check file count limit
      if (files.length > MAX_FILES_COUNT) {
        logger.warn(`Found ${files.length} files, limiting to ${MAX_FILES_COUNT}`);
        files = files.slice(0, MAX_FILES_COUNT);
      }

      return files;
    } catch (error) {
      logger.error('Error discovering files', { error });
      throw error;
    }
  }

  /**
   * Parse all discovered files
   */
  private async parseFiles(files: string[]): Promise<FileAnalysisResult[]> {
    logger.info(`Parsing ${files.length} files...`);
    
    const results: FileAnalysisResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const result = await this.parser.parseFile(file);
        
        // Set file path in functions and calls
        result.functions.forEach(func => func.filePath = file);
        result.calls.forEach(call => call.filePath = file);
        
        results.push(result);
        successCount++;
        
        if (successCount % 10 === 0) {
          logger.debug(`Parsed ${successCount}/${files.length} files`);
        }
      } catch (error) {
        errorCount++;
        this.errorHandler.handleError(error as Error, { filePath: file, operation: 'file_parsing' });
        
        // Create empty result for failed files
        results.push({
          filePath: file,
          functions: [],
          calls: [],
          imports: [],
          exports: [],
          errors: [{
            message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            line: 0,
            column: 0,
            severity: 'error'
          }]
        });
      }
    }

    logger.info(`File parsing completed: ${successCount} successful, ${errorCount} failed`);
    return results;
  }

  /**
   * Get analysis options
   */
  getOptions(): AnalysisOptions {
    return { ...this.options };
  }

  /**
   * Update analysis options
   */
  updateOptions(newOptions: Partial<AnalysisOptions>): void {
    this.options = { ...this.options, ...newOptions };
    logger.info('Analysis options updated', newOptions);
  }

  /**
   * Validate analysis options
   */
  private validateOptions(): void {
    if (this.options.maxDepth < 1 || this.options.maxDepth > 20) {
      throw new Error('maxDepth must be between 1 and 20');
    }

    if (!fs.existsSync(this.options.rootDirectory)) {
      throw new Error(`Root directory does not exist: ${this.options.rootDirectory}`);
    }

    if (this.options.includePatterns.length === 0) {
      throw new Error('At least one include pattern must be specified');
    }
  }

  /**
   * Get analyzer version
   */
  static getVersion(): string {
    return ANALYZER_VERSION;
  }

  /**
   * Create analyzer with preset configurations
   */
  static createWithPreset(preset: 'default' | 'strict' | 'comprehensive'): CallChainAnalyzer {
    switch (preset) {
      case 'strict':
        return new CallChainAnalyzer({
          maxDepth: 5,
          exportedOnly: true,
          includeExternalCalls: false,
          excludePatterns: [
            ...DEFAULT_ANALYSIS_OPTIONS.excludePatterns,
            '**/*.test.*',
            '**/*.spec.*',
            '**/test/**',
            '**/tests/**'
          ]
        });
      
      case 'comprehensive':
        return new CallChainAnalyzer({
          maxDepth: 15,
          includeExternalCalls: true,
          includeAsync: true,
          includeMethods: true,
          includeArrowFunctions: true
        });
      
      default:
        return new CallChainAnalyzer();
    }
  }
}