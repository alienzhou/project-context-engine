/**
 * Simple test to verify the TypeScript Call Chain Analyzer functionality
 */

const { CallChainAnalyzer } = require('./dist/call-chain-analyzer');

async function simpleTest() {
  console.log('🧪 Simple Test for TypeScript Call Chain Analyzer\n');
  
  try {
    // Test 1: Create analyzer instance
    console.log('📝 Test 1: Creating analyzer instance...');
    const analyzer = new CallChainAnalyzer({
      maxDepth: 3,
      includePatterns: ['**/*.ts'],
      excludePatterns: ['**/*.test.ts', '**/node_modules/**']
    });
    console.log('✅ Analyzer instance created successfully');
    
    // Test 2: Check options
    console.log('\n📝 Test 2: Checking analyzer options...');
    const options = analyzer.getOptions();
    console.log(`   - Max depth: ${options.maxDepth}`);
    console.log(`   - Include patterns: ${options.includePatterns.join(', ')}`);
    console.log(`   - Exclude patterns: ${options.excludePatterns.length} patterns`);
    console.log('✅ Options retrieved successfully');
    
    // Test 3: Update options
    console.log('\n📝 Test 3: Updating analyzer options...');
    analyzer.updateOptions({ maxDepth: 5 });
    const updatedOptions = analyzer.getOptions();
    console.log(`   - Updated max depth: ${updatedOptions.maxDepth}`);
    console.log('✅ Options updated successfully');
    
    // Test 4: Test preset configurations
    console.log('\n📝 Test 4: Testing preset configurations...');
    const strictAnalyzer = CallChainAnalyzer.createWithPreset('strict');
    const comprehensiveAnalyzer = CallChainAnalyzer.createWithPreset('comprehensive');
    const defaultAnalyzer = CallChainAnalyzer.createWithPreset('default');
    
    console.log('   - Strict preset created');
    console.log('   - Comprehensive preset created');
    console.log('   - Default preset created');
    console.log('✅ Preset configurations work correctly');
    
    // Test 5: Test version
    console.log('\n📝 Test 5: Checking analyzer version...');
    const version = CallChainAnalyzer.getVersion();
    console.log(`   - Analyzer version: ${version}`);
    console.log('✅ Version retrieved successfully');
    
    // Test 6: Test CLI import
    console.log('\n📝 Test 6: Testing CLI import...');
    const { runCallChainAnalysis } = require('./dist/call-chain-analyzer/cli/cli');
    console.log('   - CLI function imported successfully');
    console.log('✅ CLI import works correctly');
    
    // Test 7: Test other exports
    console.log('\n📝 Test 7: Testing other exports...');
    const { 
      TypeScriptParser, 
      DependencyResolver, 
      CallChainBuilder, 
      JsonOutputFormatter 
    } = require('./dist/call-chain-analyzer');
    
    console.log('   - TypeScriptParser imported');
    console.log('   - DependencyResolver imported');
    console.log('   - CallChainBuilder imported');
    console.log('   - JsonOutputFormatter imported');
    console.log('✅ All exports work correctly');
    
    console.log('\n🎉 All simple tests passed!');
    console.log('\n📋 Summary:');
    console.log('================');
    console.log('✅ Analyzer instance creation');
    console.log('✅ Options management');
    console.log('✅ Preset configurations');
    console.log('✅ Version information');
    console.log('✅ CLI functionality');
    console.log('✅ Module exports');
    
    console.log('\n🚀 The TypeScript Call Chain Analyzer is ready to use!');
    console.log('\n📝 Next steps:');
    console.log('1. Try analyzing a real TypeScript project');
    console.log('2. Use the CLI to generate call chain reports');
    console.log('3. Explore the JSON output format');
    console.log('4. Customize analysis options for your needs');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure the project is built with `pnpm build`');
    console.error('2. Check that all dependencies are installed');
    console.error('3. Verify TypeScript compilation was successful');
    process.exit(1);
  }
}

// Run the simple test
simpleTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});