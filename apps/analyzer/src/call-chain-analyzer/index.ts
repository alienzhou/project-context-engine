/**
 * TypeScript Call Chain Analyzer
 * 
 * This module provides functionality to analyze TypeScript code and extract
 * function call chains across multiple files with configurable depth limits.
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

export { CallChainAnalyzer } from './core/analyzer';
export { TypeScriptParser } from './parser/typescript-parser';
export { DependencyResolver } from './resolver/dependency-resolver';
export { CallChainBuilder } from './builder/call-chain-builder';
export { JsonOutputFormatter } from './output/json-formatter';

// Export types
export type {
  FunctionDefinition,
  FunctionCall,
  CallChain,
  AnalysisResult,
  AnalysisOptions,
  FileAnalysisResult,
  DependencyGraph,
  CallChainNode,
  SymbolIndex
} from './core/types';

// Export CLI
export { runCallChainAnalysis } from './cli/cli';

// Export constants
export { DEFAULT_ANALYSIS_OPTIONS, MAX_CALL_DEPTH } from './core/constants';

// Export utilities
export { PerformanceMonitor } from './core/performance-monitor';
export { ErrorHandler } from './core/error-handler';

// Export examples
export * from './examples/usage-examples';

// Export test integration
export { runIntegrationTests } from './test-integration';