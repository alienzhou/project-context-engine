/**
 * Constants for TypeScript Call Chain Analyzer
 */

import { AnalysisOptions } from './types';

/**
 * Maximum call chain depth to prevent infinite recursion
 */
export const MAX_CALL_DEPTH = 10;

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  maxDepth: MAX_CALL_DEPTH,
  includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.d.ts'
  ],
  includeExternalCalls: false,
  exportedOnly: false,
  includeAsync: true,
  includeMethods: true,
  includeArrowFunctions: true,
  rootDirectory: process.cwd()
};

/**
 * TypeScript file extensions
 */
export const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx'];

/**
 * JavaScript file extensions
 */
export const JAVASCRIPT_EXTENSIONS = ['.js', '.jsx'];

/**
 * All supported file extensions
 */
export const SUPPORTED_EXTENSIONS = [...TYPESCRIPT_EXTENSIONS, ...JAVASCRIPT_EXTENSIONS];

/**
 * Tree-sitter node types for function definitions
 */
export const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'constructor_definition',
  'get_method_definition',
  'set_method_definition',
  'generator_function_declaration',
  'async_function_declaration'
];

/**
 * Tree-sitter node types for function calls
 */
export const CALL_NODE_TYPES = [
  'call_expression',
  'new_expression',
  'member_expression'
];

/**
 * Tree-sitter node types for import statements
 */
export const IMPORT_NODE_TYPES = [
  'import_statement',
  'import_declaration'
];

/**
 * Tree-sitter node types for export statements
 */
export const EXPORT_NODE_TYPES = [
  'export_statement',
  'export_declaration'
];

/**
 * Common function name patterns to exclude from analysis
 */
export const EXCLUDED_FUNCTION_PATTERNS = [
  /^console\./,
  /^JSON\./,
  /^Object\./,
  /^Array\./,
  /^Math\./,
  /^Date\./,
  /^Promise\./,
  /^setTimeout$/,
  /^setInterval$/,
  /^clearTimeout$/,
  /^clearInterval$/
];

/**
 * Built-in TypeScript/JavaScript global functions to exclude
 */
export const BUILTIN_FUNCTIONS = new Set([
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'encodeURIComponent',
  'decodeURI',
  'decodeURIComponent',
  'eval',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'global',
  'process',
  'Buffer'
]);

/**
 * Maximum file size to analyze (in bytes)
 */
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Maximum number of files to analyze in a single run
 */
export const MAX_FILES_COUNT = 1000;

/**
 * Analyzer version
 */
export const ANALYZER_VERSION = '1.0.0';

/**
 * Default output file name
 */
export const DEFAULT_OUTPUT_FILE = 'call-chains.json';

/**
 * CLI command name
 */
export const CLI_COMMAND = 'ts-call-chain';

/**
 * CLI description
 */
export const CLI_DESCRIPTION = 'Analyze TypeScript function call chains across files';

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_DIRECTORY: 'Invalid directory path provided',
  NO_FILES_FOUND: 'No TypeScript/JavaScript files found in the specified directory',
  PARSE_ERROR: 'Failed to parse file',
  MAX_DEPTH_EXCEEDED: 'Maximum call chain depth exceeded',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  TOO_MANY_FILES: 'Too many files to analyze',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected',
  INVALID_OPTIONS: 'Invalid analysis options provided'
} as const;

/**
 * Log levels
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  SLOW_FILE_PARSE_MS: 1000,
  SLOW_ANALYSIS_MS: 5000,
  MEMORY_WARNING_MB: 500
} as const;