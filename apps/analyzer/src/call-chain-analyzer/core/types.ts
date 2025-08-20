/**
 * Core type definitions for TypeScript Call Chain Analyzer
 */

/**
 * Represents a function definition in the codebase
 */
export interface FunctionDefinition {
  /** Unique identifier for the function */
  id: string;
  /** Function name */
  name: string;
  /** File path where the function is defined */
  filePath: string;
  /** Line number where the function starts */
  startLine: number;
  /** Line number where the function ends */
  endLine: number;
  /** Function type (function, method, arrow function, etc.) */
  type: FunctionType;
  /** Whether the function is exported */
  isExported: boolean;
  /** Whether the function is async */
  isAsync: boolean;
  /** Whether the function is static (for class methods) */
  isStatic: boolean;
  /** Parameter names and types */
  parameters: Parameter[];
  /** Return type if available */
  returnType?: string;
  /** JSDoc comment if available */
  documentation?: string;
  /** Class name if this is a method */
  className?: string;
  /** Namespace or module name */
  namespace?: string;
}

/**
 * Represents a function call in the code
 */
export interface FunctionCall {
  /** Unique identifier for the call */
  id: string;
  /** Name of the called function */
  functionName: string;
  /** File path where the call occurs */
  filePath: string;
  /** Line number of the call */
  line: number;
  /** Column number of the call */
  column: number;
  /** ID of the function that makes this call */
  callerFunctionId: string;
  /** ID of the called function (if resolved) */
  calledFunctionId?: string;
  /** Call type (direct, method, constructor, etc.) */
  callType: CallType;
  /** Arguments passed to the function */
  arguments: string[];
  /** Whether this is a chained call (e.g., obj.method1().method2()) */
  isChained: boolean;
  /** Chain context if this is part of a method chain */
  chainContext?: string;
}

/**
 * Represents a complete call chain from root to leaf
 */
export interface CallChain {
  /** Unique identifier for the call chain */
  id: string;
  /** Root function that starts the chain */
  rootFunction: FunctionDefinition;
  /** All nodes in the call chain */
  nodes: CallChainNode[];
  /** Maximum depth reached in this chain */
  depth: number;
  /** Total number of function calls in the chain */
  totalCalls: number;
  /** Files involved in this call chain */
  involvedFiles: string[];
}

/**
 * Represents a node in the call chain
 */
export interface CallChainNode {
  /** Function definition at this node */
  function: FunctionDefinition;
  /** Function calls made by this function */
  calls: FunctionCall[];
  /** Child nodes (functions called by this function) */
  children: CallChainNode[];
  /** Depth level in the call chain */
  depth: number;
  /** Parent node ID */
  parentId?: string;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  /** All discovered function definitions */
  functions: FunctionDefinition[];
  /** All discovered function calls */
  calls: FunctionCall[];
  /** Constructed call chains */
  callChains: CallChain[];
  /** Dependency graph between files */
  dependencyGraph: DependencyGraph;
  /** Symbol index for quick lookups */
  symbolIndex: SymbolIndex;
  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

/**
 * Analysis configuration options
 */
export interface AnalysisOptions {
  /** Maximum call chain depth to analyze */
  maxDepth: number;
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Whether to include external library calls */
  includeExternalCalls: boolean;
  /** Whether to analyze only exported functions */
  exportedOnly: boolean;
  /** Whether to include async function analysis */
  includeAsync: boolean;
  /** Whether to include class methods */
  includeMethods: boolean;
  /** Whether to include arrow functions */
  includeArrowFunctions: boolean;
  /** Root directory for analysis */
  rootDirectory: string;
}

/**
 * Result of analyzing a single file
 */
export interface FileAnalysisResult {
  /** File path */
  filePath: string;
  /** Functions defined in this file */
  functions: FunctionDefinition[];
  /** Function calls made in this file */
  calls: FunctionCall[];
  /** Import statements */
  imports: ImportStatement[];
  /** Export statements */
  exports: ExportStatement[];
  /** Parse errors if any */
  errors: ParseError[];
}

/**
 * Dependency graph between files
 */
export interface DependencyGraph {
  /** Map of file to its dependencies */
  dependencies: Map<string, string[]>;
  /** Map of file to files that depend on it */
  dependents: Map<string, string[]>;
  /** Circular dependencies detected */
  circularDependencies: string[][];
}

/**
 * Symbol index for quick function lookups
 */
export interface SymbolIndex {
  /** Map function name to definitions */
  byName: Map<string, FunctionDefinition[]>;
  /** Map file path to functions */
  byFile: Map<string, FunctionDefinition[]>;
  /** Map function ID to definition */
  byId: Map<string, FunctionDefinition>;
  /** Map class name to methods */
  byClass: Map<string, FunctionDefinition[]>;
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  /** Total files analyzed */
  totalFiles: number;
  /** Total functions found */
  totalFunctions: number;
  /** Total function calls found */
  totalCalls: number;
  /** Analysis start time */
  startTime: Date;
  /** Analysis end time */
  endTime: Date;
  /** Analysis duration in milliseconds */
  duration: number;
  /** Version of the analyzer */
  analyzerVersion: string;
}

/**
 * Function parameter information
 */
export interface Parameter {
  /** Parameter name */
  name: string;
  /** Parameter type if available */
  type?: string;
  /** Whether parameter is optional */
  isOptional: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * Import statement information
 */
export interface ImportStatement {
  /** Module being imported */
  module: string;
  /** Imported symbols */
  imports: string[];
  /** Import type (default, named, namespace) */
  type: ImportType;
  /** Line number */
  line: number;
}

/**
 * Export statement information
 */
export interface ExportStatement {
  /** Exported symbol name */
  name: string;
  /** Export type (default, named, re-export) */
  type: ExportType;
  /** Line number */
  line: number;
  /** Source module if re-export */
  source?: string;
}

/**
 * Parse error information
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Line number where error occurred */
  line: number;
  /** Column number where error occurred */
  column: number;
  /** Error severity */
  severity: 'error' | 'warning';
}

// Enums

export enum FunctionType {
  FUNCTION = 'function',
  ARROW_FUNCTION = 'arrow_function',
  METHOD = 'method',
  CONSTRUCTOR = 'constructor',
  GETTER = 'getter',
  SETTER = 'setter',
  ASYNC_FUNCTION = 'async_function',
  GENERATOR = 'generator'
}

export enum CallType {
  DIRECT = 'direct',
  METHOD = 'method',
  CONSTRUCTOR = 'constructor',
  CHAINED = 'chained',
  CALLBACK = 'callback',
  ASYNC_AWAIT = 'async_await'
}

export enum ImportType {
  DEFAULT = 'default',
  NAMED = 'named',
  NAMESPACE = 'namespace',
  SIDE_EFFECT = 'side_effect'
}

export enum ExportType {
  DEFAULT = 'default',
  NAMED = 'named',
  RE_EXPORT = 're_export'
}