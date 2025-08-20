/**
 * Command Line Interface for TypeScript Call Chain Analyzer
 * 
 * This module provides a CLI interface for running call chain analysis
 * from the command line with various options and configurations.
 */

import * as fs from 'fs';
import * as path from 'path';
import Logger from '../../utils/log';
import { CallChainAnalyzer } from '../core/analyzer';
import { AnalysisOptions } from '../core/types';
import { JsonOutputFormatter } from '../output/json-formatter';
import {
  CLI_COMMAND,
  CLI_DESCRIPTION,
  DEFAULT_OUTPUT_FILE,
  ERROR_MESSAGES
} from '../core/constants';

const logger = Logger('call-chain-cli');

/**
 * CLI argument interface
 */
interface CliArgs {
  directory?: string;
  output?: string;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  exportedOnly?: boolean;
  includeAsync?: boolean;
  includeMethods?: boolean;
  includeArrowFunctions?: boolean;
  includeExternalCalls?: boolean;
  preset?: 'default' | 'strict' | 'comprehensive';
  chainsOnly?: boolean;
  summary?: boolean;
  verbose?: boolean;
  help?: boolean;
  version?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '-d':
      case '--directory':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.directory = nextArg;
          i++;
        }
        break;
        
      case '-o':
      case '--output':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.output = nextArg;
          i++;
        }
        break;
        
      case '--max-depth':
        if (nextArg && !nextArg.startsWith('-')) {
          const depth = parseInt(nextArg, 10);
          if (!isNaN(depth)) {
            parsed.maxDepth = depth;
          }
          i++;
        }
        break;
        
      case '--include':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.includePatterns = nextArg.split(',');
          i++;
        }
        break;
        
      case '--exclude':
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.excludePatterns = nextArg.split(',');
          i++;
        }
        break;
        
      case '--preset':
        if (nextArg && ['default', 'strict', 'comprehensive'].includes(nextArg)) {
          parsed.preset = nextArg as 'default' | 'strict' | 'comprehensive';
          i++;
        }
        break;
        
      case '--exported-only':
        parsed.exportedOnly = true;
        break;
        
      case '--include-async':
        parsed.includeAsync = true;
        break;
        
      case '--include-methods':
        parsed.includeMethods = true;
        break;
        
      case '--include-arrow-functions':
        parsed.includeArrowFunctions = true;
        break;
        
      case '--include-external-calls':
        parsed.includeExternalCalls = true;
        break;
        
      case '--chains-only':
        parsed.chainsOnly = true;
        break;
        
      case '--summary':
        parsed.summary = true;
        break;
        
      case '-v':
      case '--verbose':
        parsed.verbose = true;
        break;
        
      case '-h':
      case '--help':
        parsed.help = true;
        break;
        
      case '--version':
        parsed.version = true;
        break;
        
      default:
        // If it's not a flag and no directory is set, treat as directory
        if (!arg.startsWith('-') && !parsed.directory) {
          parsed.directory = arg;
        }
        break;
    }
  }
  
  return parsed;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
${CLI_DESCRIPTION}

Usage: ${CLI_COMMAND} [directory] [options]

Arguments:
  directory                 Target directory to analyze (default: current directory)

Options:
  -o, --output <file>       Output file path (default: ${DEFAULT_OUTPUT_FILE})
  --max-depth <number>      Maximum call chain depth (default: 10)
  --include <patterns>      Include file patterns (comma-separated)
  --exclude <patterns>      Exclude file patterns (comma-separated)
  --preset <preset>         Use preset configuration (default|strict|comprehensive)
  
  --exported-only           Analyze only exported functions
  --include-async           Include async functions
  --include-methods         Include class methods
  --include-arrow-functions Include arrow functions
  --include-external-calls  Include external library calls
  
  --chains-only             Output only call chains (lighter output)
  --summary                 Generate summary report only
  
  -v, --verbose             Enable verbose logging
  -h, --help                Show this help message
  --version                 Show version information

Examples:
  ${CLI_COMMAND}                                    # Analyze current directory
  ${CLI_COMMAND} ./src                              # Analyze src directory
  ${CLI_COMMAND} ./src -o chains.json               # Custom output file
  ${CLI_COMMAND} ./src --max-depth 5                # Limit depth to 5
  ${CLI_COMMAND} ./src --preset strict              # Use strict preset
  ${CLI_COMMAND} ./src --exported-only --chains-only # Only exported functions, chains only

Presets:
  default       - Standard analysis with reasonable defaults
  strict        - Only exported functions, no external calls, depth 5
  comprehensive - Include everything, depth 15, external calls
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  console.log(`${CLI_COMMAND} v${CallChainAnalyzer.getVersion()}`);
}

/**
 * Convert CLI args to analysis options
 */
function createAnalysisOptions(args: CliArgs): Partial<AnalysisOptions> {
  const options: Partial<AnalysisOptions> = {};
  
  if (args.directory) {
    options.rootDirectory = path.resolve(args.directory);
  }
  
  if (args.maxDepth !== undefined) {
    options.maxDepth = args.maxDepth;
  }
  
  if (args.includePatterns) {
    options.includePatterns = args.includePatterns;
  }
  
  if (args.excludePatterns) {
    options.excludePatterns = args.excludePatterns;
  }
  
  if (args.exportedOnly !== undefined) {
    options.exportedOnly = args.exportedOnly;
  }
  
  if (args.includeAsync !== undefined) {
    options.includeAsync = args.includeAsync;
  }
  
  if (args.includeMethods !== undefined) {
    options.includeMethods = args.includeMethods;
  }
  
  if (args.includeArrowFunctions !== undefined) {
    options.includeArrowFunctions = args.includeArrowFunctions;
  }
  
  if (args.includeExternalCalls !== undefined) {
    options.includeExternalCalls = args.includeExternalCalls;
  }
  
  return options;
}

/**
 * Main CLI function
 */
export async function runCallChainAnalysis(argv: string[] = process.argv.slice(2)): Promise<void> {
  try {
    const args = parseArgs(argv);
    
    // Handle help and version
    if (args.help) {
      showHelp();
      return;
    }
    
    if (args.version) {
      showVersion();
      return;
    }
    
    // Set up logging level
    if (args.verbose) {
      // Enable debug logging if verbose
      process.env.LOG_LEVEL = 'debug';
    }
    
    // Create analyzer with preset or custom options
    let analyzer: CallChainAnalyzer;
    if (args.preset) {
      analyzer = CallChainAnalyzer.createWithPreset(args.preset);
      logger.info(`Using preset: ${args.preset}`);
    } else {
      const options = createAnalysisOptions(args);
      analyzer = new CallChainAnalyzer(options);
    }
    
    // Update options if provided
    const additionalOptions = createAnalysisOptions(args);
    if (Object.keys(additionalOptions).length > 0) {
      analyzer.updateOptions(additionalOptions);
    }
    
    // Determine target directory
    const targetDirectory = args.directory || process.cwd();
    if (!fs.existsSync(targetDirectory)) {
      throw new Error(`Directory does not exist: ${targetDirectory}`);
    }
    
    // Determine output file
    const outputFile = args.output || DEFAULT_OUTPUT_FILE;
    const outputPath = path.resolve(outputFile);
    
    logger.info(`Starting analysis of: ${targetDirectory}`);
    logger.info(`Output will be saved to: ${outputPath}`);
    
    // Run analysis
    const startTime = Date.now();
    
    if (args.summary) {
      // Generate summary report only
      const result = await analyzer.analyze(targetDirectory);
      const jsonFormatter = new JsonOutputFormatter();
      const summaryJson = jsonFormatter.createSummaryReport(result);
      fs.writeFileSync(outputPath, summaryJson, 'utf-8');
      logger.info('Summary report generated');
    } else if (args.chainsOnly) {
      // Generate call chains only
      await analyzer.analyzeAndSaveCallChains(targetDirectory, outputPath);
      logger.info('Call chains analysis completed');
    } else {
      // Full analysis
      await analyzer.analyzeAndSave(targetDirectory, outputPath);
      logger.info('Full analysis completed');
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Analysis completed in ${duration}ms`);
    
    // Display success message
    console.log(`\n✅ Analysis completed successfully!`);
    console.log(`📁 Analyzed directory: ${targetDirectory}`);
    console.log(`📄 Output saved to: ${outputPath}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
  } catch (error) {
    logger.error('CLI execution failed', { error });
    
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof Error && error.message === ERROR_MESSAGES.INVALID_DIRECTORY) {
      console.error('Please provide a valid directory path.');
    } else if (error instanceof Error && error.message === ERROR_MESSAGES.NO_FILES_FOUND) {
      console.error('No TypeScript/JavaScript files found in the specified directory.');
    }
    
    console.error('\nUse --help for usage information.');
    process.exit(1);
  }
}

/**
 * CLI entry point when run directly
 */
if (require.main === module) {
  runCallChainAnalysis().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}