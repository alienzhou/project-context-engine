/**
 * Usage Examples for TypeScript Call Chain Analyzer
 * 
 * This file demonstrates various ways to use the call chain analyzer
 * programmatically and showcases different configuration options.
 */

import * as path from 'path';
import * as fs from 'fs';
import { CallChainAnalyzer } from '../core/analyzer';
import { AnalysisOptions } from '../core/types';
import { JsonOutputFormatter } from '../output/json-formatter';

/**
 * Example 1: Basic Usage
 * Analyze a directory with default settings
 */
async function basicUsageExample(): Promise<void> {
  console.log('=== Basic Usage Example ===');
  
  const analyzer = new CallChainAnalyzer();
  
  try {
    // Analyze current directory
    const result = await analyzer.analyze('./src');
    
    console.log(`Analysis completed:`);
    console.log(`- Files analyzed: ${result.metadata.totalFiles}`);
    console.log(`- Functions found: ${result.metadata.totalFunctions}`);
    console.log(`- Function calls: ${result.metadata.totalCalls}`);
    console.log(`- Call chains: ${result.callChains.length}`);
    console.log(`- Duration: ${result.metadata.duration}ms`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

/**
 * Example 2: Custom Configuration
 * Use custom analysis options for specific requirements
 */
async function customConfigurationExample(): Promise<void> {
  console.log('\n=== Custom Configuration Example ===');
  
  const customOptions: Partial<AnalysisOptions> = {
    maxDepth: 5,
    includePatterns: ['**/*.ts', '**/*.tsx'],
    excludePatterns: [
      '**/node_modules/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ],
    exportedOnly: true,
    includeAsync: true,
    includeMethods: true
  };
  
  const analyzer = new CallChainAnalyzer(customOptions);
  
  try {
    const result = await analyzer.analyze('./src');
    
    // Filter call chains by depth
    const deepChains = result.callChains.filter(chain => chain.depth >= 3);
    
    console.log(`Custom analysis results:`);
    console.log(`- Deep call chains (depth >= 3): ${deepChains.length}`);
    console.log(`- Average chain depth: ${result.callChains.reduce((sum, chain) => sum + chain.depth, 0) / result.callChains.length}`);
    
  } catch (error) {
    console.error('Custom analysis failed:', error);
  }
}

/**
 * Example 3: Preset Configurations
 * Use predefined presets for common scenarios
 */
async function presetConfigurationExample(): Promise<void> {
  console.log('\n=== Preset Configuration Example ===');
  
  // Strict preset - only exported functions, limited depth
  const strictAnalyzer = CallChainAnalyzer.createWithPreset('strict');
  
  // Comprehensive preset - include everything
  const comprehensiveAnalyzer = CallChainAnalyzer.createWithPreset('comprehensive');
  
  try {
    console.log('Running strict analysis...');
    const strictResult = await strictAnalyzer.analyze('./src');
    
    console.log('Running comprehensive analysis...');
    const comprehensiveResult = await comprehensiveAnalyzer.analyze('./src');
    
    console.log(`Comparison:`);
    console.log(`- Strict: ${strictResult.callChains.length} call chains`);
    console.log(`- Comprehensive: ${comprehensiveResult.callChains.length} call chains`);
    
  } catch (error) {
    console.error('Preset analysis failed:', error);
  }
}

/**
 * Example 4: Saving Results
 * Save analysis results to different output formats
 */
async function savingResultsExample(): Promise<void> {
  console.log('\n=== Saving Results Example ===');
  
  const analyzer = new CallChainAnalyzer();
  
  try {
    // Save complete analysis
    await analyzer.analyzeAndSave('./src', 'complete-analysis.json');
    console.log('Complete analysis saved to complete-analysis.json');
    
    // Save only call chains (lighter output)
    await analyzer.analyzeAndSaveCallChains('./src', 'call-chains-only.json');
    console.log('Call chains saved to call-chains-only.json');
    
    // Generate and save summary report
    const result = await analyzer.analyze('./src');
    const jsonFormatter = new JsonOutputFormatter();
    const summaryJson = jsonFormatter.createSummaryReport(result);
    fs.writeFileSync('summary-report.json', summaryJson);
    console.log('Summary report saved to summary-report.json');
    
  } catch (error) {
    console.error('Saving results failed:', error);
  }
}

/**
 * Example 5: Analyzing Specific Patterns
 * Focus analysis on specific code patterns or architectures
 */
async function specificPatternsExample(): Promise<void> {
  console.log('\n=== Specific Patterns Example ===');
  
  const analyzer = new CallChainAnalyzer({
    includePatterns: ['**/services/**/*.ts', '**/controllers/**/*.ts'],
    excludePatterns: ['**/*.test.ts'],
    exportedOnly: true,
    maxDepth: 8
  });
  
  try {
    const result = await analyzer.analyze('./src');
    
    // Find service-to-service call chains
    const serviceChains = result.callChains.filter(chain => 
      chain.involvedFiles.some(file => file.includes('/services/'))
    );
    
    // Find long call chains (potential code smell)
    const longChains = result.callChains.filter(chain => chain.depth > 5);
    
    // Find chains with many cross-file calls
    const crossFileChains = result.callChains.filter(chain => 
      chain.involvedFiles.length > 3
    );
    
    console.log(`Pattern analysis:`);
    console.log(`- Service call chains: ${serviceChains.length}`);
    console.log(`- Long call chains (depth > 5): ${longChains.length}`);
    console.log(`- Cross-file chains (>3 files): ${crossFileChains.length}`);
    
  } catch (error) {
    console.error('Pattern analysis failed:', error);
  }
}

/**
 * Example 6: Performance Monitoring
 * Monitor and optimize analysis performance
 */
async function performanceMonitoringExample(): Promise<void> {
  console.log('\n=== Performance Monitoring Example ===');
  
  const analyzer = new CallChainAnalyzer();
  
  try {
    const startTime = Date.now();
    const result = await analyzer.analyze('./src');
    const endTime = Date.now();
    
    // Get performance statistics (would need public getter method)
    // const performanceStats = analyzer.getPerformanceStatistics();
    
    console.log(`Performance metrics:`);
    console.log(`- Total duration: ${endTime - startTime}ms`);
    // Note: These would require public getter methods in the analyzer
    console.log(`- Analysis completed with performance monitoring`);
    
    // Check for slow operations (would need public getter method)
    // const slowOps = analyzer.getSlowOperations(1000);
    // if (slowOps.length > 0) {
    //   console.log(`- Slow operations detected: ${slowOps.length}`);
    // }
    
  } catch (error) {
    console.error('Performance monitoring failed:', error);
  }
}

/**
 * Example 7: Error Handling and Recovery
 * Handle errors gracefully and continue analysis
 */
async function errorHandlingExample(): Promise<void> {
  console.log('\n=== Error Handling Example ===');
  
  const analyzer = new CallChainAnalyzer({
    // Include patterns that might have some invalid files
    includePatterns: ['**/*.ts', '**/*.js'],
    excludePatterns: ['**/node_modules/**']
  });
  
  try {
    const result = await analyzer.analyze('./src');
    
    // Check error handler for issues (would need public getter method)
    // const errorSummary = analyzer.getErrorSummary();
    
    console.log(`Error handling results:`);
    // Note: These would require public getter methods in the analyzer
    console.log(`- Analysis completed with error handling`);
    
    // if (errorSummary.totalErrors > 0) {
    //   console.log(`- Error types:`, errorSummary.errorsByCode);
    //   
    //   // Get recovery suggestions (would need public getter method)
    //   const suggestions = analyzer.getRecoverySuggestions();
    //   if (suggestions.length > 0) {
    //     console.log(`- Recovery suggestions:`);
    //     suggestions.forEach((suggestion, index) => {
    //       console.log(`  ${index + 1}. ${suggestion}`);
    //     });
    //   }
    // }
    
  } catch (error) {
    console.error('Error handling example failed:', error);
  }
}

/**
 * Example 8: Filtering and Analysis
 * Filter and analyze specific aspects of call chains
 */
async function filteringAnalysisExample(): Promise<void> {
  console.log('\n=== Filtering and Analysis Example ===');
  
  const analyzer = new CallChainAnalyzer();
  
  try {
    const result = await analyzer.analyze('./src');
    
    // Find chains containing specific functions
    const asyncChains = result.callChains.filter(chain => 
      chain.nodes.some(node => node.function.isAsync)
    );
    
    // Find chains with external dependencies
    const externalChains = result.callChains.filter(chain =>
      chain.involvedFiles.length > 1
    );
    
    // Find potential circular dependencies
    const circularDeps = result.dependencyGraph.circularDependencies;
    
    // Analyze function complexity
    const complexFunctions = result.functions.filter(func => {
      const calls = result.calls.filter(call => call.callerFunctionId === func.id);
      return calls.length > 5; // Functions making more than 5 calls
    });
    
    console.log(`Filtering analysis:`);
    console.log(`- Async call chains: ${asyncChains.length}`);
    console.log(`- Cross-file chains: ${externalChains.length}`);
    console.log(`- Circular dependencies: ${circularDeps.length}`);
    console.log(`- Complex functions (>5 calls): ${complexFunctions.length}`);
    
    // Show top 5 most complex functions
    const sortedComplex = complexFunctions
      .map(func => ({
        name: func.name,
        file: func.filePath,
        callCount: result.calls.filter(call => call.callerFunctionId === func.id).length
      }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 5);
    
    if (sortedComplex.length > 0) {
      console.log(`\nTop complex functions:`);
      sortedComplex.forEach((func, index) => {
        console.log(`  ${index + 1}. ${func.name} (${func.callCount} calls) - ${path.basename(func.file)}`);
      });
    }
    
  } catch (error) {
    console.error('Filtering analysis failed:', error);
  }
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
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
 * Run all examples
 */
async function runAllExamples(): Promise<void> {
  console.log('TypeScript Call Chain Analyzer - Usage Examples\n');
  
  try {
    await basicUsageExample();
    await customConfigurationExample();
    await presetConfigurationExample();
    await savingResultsExample();
    await specificPatternsExample();
    await performanceMonitoringExample();
    await errorHandlingExample();
    await filteringAnalysisExample();
    
    console.log('\n=== All Examples Completed ===');
    
  } catch (error) {
    console.error('Examples execution failed:', error);
  }
}

// Export examples for individual use
export {
  basicUsageExample,
  customConfigurationExample,
  presetConfigurationExample,
  savingResultsExample,
  specificPatternsExample,
  performanceMonitoringExample,
  errorHandlingExample,
  filteringAnalysisExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}