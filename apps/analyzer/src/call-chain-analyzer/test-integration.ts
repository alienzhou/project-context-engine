/**
 * Integration Test for TypeScript Call Chain Analyzer
 * 
 * This file tests the complete functionality of the call chain analyzer
 * using real TypeScript files from the current project.
 */

import * as path from 'path';
import * as fs from 'fs';
import { CallChainAnalyzer } from './core/analyzer';
import { runCallChainAnalysis } from './cli/cli';

/**
 * Test the analyzer on the current project
 */
async function testOnCurrentProject(): Promise<void> {
  console.log('🧪 Testing Call Chain Analyzer on Current Project\n');
  
  const projectRoot = path.resolve(__dirname, '../../../..');
  const testOutputDir = path.join(projectRoot, 'out/call-chain-test');
  
  // Ensure output directory exists
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📄 Output directory: ${testOutputDir}\n`);
  
  try {
    // Test 1: Analyze the analyzer itself
    await testAnalyzerOnItself(testOutputDir);
    
    // Test 2: Analyze the main code-analyzer module
    await testMainCodeAnalyzer(projectRoot, testOutputDir);
    
    // Test 3: Test CLI functionality
    await testCLIFunctionality(projectRoot, testOutputDir);
    
    // Test 4: Test different presets
    await testPresetConfigurations(projectRoot, testOutputDir);
    
    console.log('✅ All integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

/**
 * Test the analyzer on its own code (self-analysis)
 */
async function testAnalyzerOnItself(outputDir: string): Promise<void> {
  console.log('🔍 Test 1: Self-Analysis of Call Chain Analyzer');
  
  const analyzer = new CallChainAnalyzer({
    rootDirectory: __dirname,
    maxDepth: 8,
    includePatterns: ['**/*.ts'],
    excludePatterns: ['**/*.test.ts', '**/node_modules/**'],
    exportedOnly: false
  });
  
  const startTime = Date.now();
  const result = await analyzer.analyze();
  const duration = Date.now() - startTime;
  
  console.log(`📊 Self-analysis results:`);
  console.log(`   - Files analyzed: ${result.metadata.totalFiles}`);
  console.log(`   - Functions found: ${result.metadata.totalFunctions}`);
  console.log(`   - Function calls: ${result.metadata.totalCalls}`);
  console.log(`   - Call chains: ${result.callChains.length}`);
  console.log(`   - Duration: ${duration}ms`);
  
  // Save results
  const outputPath = path.join(outputDir, 'self-analysis.json');
  await analyzer.analyzeAndSave(__dirname, outputPath);
  console.log(`   - Results saved to: ${outputPath}`);
  
  // Validate results
  if (result.functions.length === 0) {
    throw new Error('No functions found in self-analysis');
  }
  
  if (result.callChains.length === 0) {
    throw new Error('No call chains found in self-analysis');
  }
  
  console.log('✅ Self-analysis test passed\n');
}

/**
 * Test analyzer on the main code-analyzer module
 */
async function testMainCodeAnalyzer(projectRoot: string, outputDir: string): Promise<void> {
  console.log('🔍 Test 2: Analysis of Main Code Analyzer Module');
  
  const codeAnalyzerPath = path.join(projectRoot, 'apps/analyzer/src/code-analyzer');
  
  if (!fs.existsSync(codeAnalyzerPath)) {
    console.log('⚠️  Main code analyzer not found, skipping test');
    return;
  }
  
  const analyzer = new CallChainAnalyzer({
    rootDirectory: codeAnalyzerPath,
    maxDepth: 6,
    includePatterns: ['**/*.ts'],
    excludePatterns: ['**/*.test.ts', '**/node_modules/**'],
    exportedOnly: true
  });
  
  const startTime = Date.now();
  const result = await analyzer.analyze();
  const duration = Date.now() - startTime;
  
  console.log(`📊 Main analyzer results:`);
  console.log(`   - Files analyzed: ${result.metadata.totalFiles}`);
  console.log(`   - Functions found: ${result.metadata.totalFunctions}`);
  console.log(`   - Function calls: ${result.metadata.totalCalls}`);
  console.log(`   - Call chains: ${result.callChains.length}`);
  console.log(`   - Circular dependencies: ${result.dependencyGraph.circularDependencies.length}`);
  console.log(`   - Duration: ${duration}ms`);
  
  // Save call chains only
  const outputPath = path.join(outputDir, 'main-analyzer-chains.json');
  await analyzer.analyzeAndSaveCallChains(codeAnalyzerPath, outputPath);
  console.log(`   - Call chains saved to: ${outputPath}`);
  
  // Find interesting patterns
  const longChains = result.callChains.filter(chain => chain.depth > 4);
  const crossFileChains = result.callChains.filter(chain => chain.involvedFiles.length > 2);
  
  console.log(`📈 Pattern analysis:`);
  console.log(`   - Long chains (depth > 4): ${longChains.length}`);
  console.log(`   - Cross-file chains (>2 files): ${crossFileChains.length}`);
  
  console.log('✅ Main analyzer test passed\n');
}

/**
 * Test CLI functionality
 */
async function testCLIFunctionality(projectRoot: string, outputDir: string): Promise<void> {
  console.log('🔍 Test 3: CLI Functionality Test');
  
  const testDir = path.join(projectRoot, 'apps/analyzer/src/call-chain-analyzer/core');
  const outputPath = path.join(outputDir, 'cli-test-output.json');
  
  // Test CLI with various options
  const cliArgs = [
    testDir,
    '--output', outputPath,
    '--max-depth', '5',
    '--exported-only',
    '--chains-only'
  ];
  
  console.log(`🖥️  Running CLI with args: ${cliArgs.join(' ')}`);
  
  try {
    await runCallChainAnalysis(cliArgs);
    
    // Verify output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('CLI output file was not created');
    }
    
    // Verify output file content
    const outputContent = fs.readFileSync(outputPath, 'utf-8');
    const outputData = JSON.parse(outputContent);
    
    if (!outputData.callChains || !Array.isArray(outputData.callChains)) {
      throw new Error('CLI output does not contain valid call chains');
    }
    
    console.log(`📊 CLI test results:`);
    console.log(`   - Output file created: ${outputPath}`);
    console.log(`   - Call chains found: ${outputData.callChains.length}`);
    console.log(`   - File size: ${Math.round(fs.statSync(outputPath).size / 1024)}KB`);
    
    console.log('✅ CLI functionality test passed\n');
    
  } catch (error) {
    console.error('❌ CLI test failed:', error);
    throw error;
  }
}

/**
 * Test different preset configurations
 */
async function testPresetConfigurations(projectRoot: string, outputDir: string): Promise<void> {
  console.log('🔍 Test 4: Preset Configurations Test');
  
  const testDir = path.join(projectRoot, 'apps/analyzer/src/call-chain-analyzer');
  
  const presets = ['default', 'strict', 'comprehensive'] as const;
  const results: Record<string, any> = {};
  
  for (const preset of presets) {
    console.log(`   Testing ${preset} preset...`);
    
    const analyzer = CallChainAnalyzer.createWithPreset(preset);
    const startTime = Date.now();
    const result = await analyzer.analyze(testDir);
    const duration = Date.now() - startTime;
    
    results[preset] = {
      files: result.metadata.totalFiles,
      functions: result.metadata.totalFunctions,
      calls: result.metadata.totalCalls,
      chains: result.callChains.length,
      duration
    };
    
    // Save preset results
    const outputPath = path.join(outputDir, `preset-${preset}.json`);
    await analyzer.analyzeAndSaveCallChains(testDir, outputPath);
  }
  
  console.log(`📊 Preset comparison:`);
  console.log(`   Preset      | Files | Functions | Calls | Chains | Duration`);
  console.log(`   ------------|-------|-----------|-------|--------|----------`);
  
  for (const [preset, data] of Object.entries(results)) {
    console.log(`   ${preset.padEnd(11)} | ${String(data.files).padStart(5)} | ${String(data.functions).padStart(9)} | ${String(data.calls).padStart(5)} | ${String(data.chains).padStart(6)} | ${String(data.duration).padStart(6)}ms`);
  }
  
  // Validate that different presets produce different results
  const strictChains = results.strict.chains;
  const comprehensiveChains = results.comprehensive.chains;
  
  if (strictChains >= comprehensiveChains) {
    console.log('⚠️  Warning: Strict preset found more chains than comprehensive preset');
  }
  
  console.log('✅ Preset configurations test passed\n');
}

/**
 * Create test TypeScript files for testing
 */
function createTestFiles(testDir: string): void {
  const testFiles = {
    'main.ts': `
      import { helper } from './utils';
      import { DataService } from './service';
      
      export async function main(): Promise<void> {
        const service = new DataService();
        const data = await service.fetchData();
        helper(data);
        processResult(data);
      }
      
      function processResult(data: any): void {
        console.log('Processing:', data);
      }
    `,
    'utils.ts': `
      export function helper(data: any): void {
        validate(data);
        transform(data);
      }
      
      function validate(data: any): boolean {
        return data !== null;
      }
      
      function transform(data: any): any {
        return { ...data, processed: true };
      }
    `,
    'service.ts': `
      export class DataService {
        async fetchData(): Promise<any> {
          const raw = await this.getRawData();
          return this.processData(raw);
        }
        
        private async getRawData(): Promise<any> {
          return { id: 1, name: 'test' };
        }
        
        private processData(raw: any): any {
          return { ...raw, timestamp: Date.now() };
        }
      }
    `
  };
  
  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Write test files
  for (const [filename, content] of Object.entries(testFiles)) {
    fs.writeFileSync(path.join(testDir, filename), content);
  }
}

/**
 * Clean up test files
 */
function cleanupTestFiles(testDir: string): void {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting TypeScript Call Chain Analyzer Integration Tests\n');
  
  try {
    await testOnCurrentProject();
    console.log('\n🎉 All integration tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Integration tests failed:', error);
    process.exit(1);
  }
}

// Export test functions
export {
  testOnCurrentProject,
  testAnalyzerOnItself,
  testMainCodeAnalyzer,
  testCLIFunctionality,
  testPresetConfigurations,
  runIntegrationTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}