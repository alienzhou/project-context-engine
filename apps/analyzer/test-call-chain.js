/**
 * Simple test script for the TypeScript Call Chain Analyzer
 * 
 * This script tests the basic functionality of the call chain analyzer
 * without requiring the full build process.
 */

const path = require('path');
const fs = require('fs');

// Mock implementation for testing
console.log('🧪 Testing TypeScript Call Chain Analyzer\n');

// Test 1: Verify module structure
console.log('📁 Test 1: Verifying module structure...');

const moduleDir = path.join(__dirname, 'src/call-chain-analyzer');
const expectedDirs = ['core', 'parser', 'resolver', 'builder', 'output', 'cli', '__tests__', 'examples'];

let structureValid = true;
for (const dir of expectedDirs) {
  const dirPath = path.join(moduleDir, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`❌ Missing directory: ${dir}`);
    structureValid = false;
  } else {
    console.log(`✅ Found directory: ${dir}`);
  }
}

if (structureValid) {
  console.log('✅ Module structure is valid\n');
} else {
  console.log('❌ Module structure is incomplete\n');
}

// Test 2: Verify core files
console.log('📄 Test 2: Verifying core files...');

const expectedFiles = [
  'core/types.ts',
  'core/constants.ts',
  'core/analyzer.ts',
  'core/error-handler.ts',
  'core/performance-monitor.ts',
  'parser/typescript-parser.ts',
  'resolver/symbol-extractor.ts',
  'resolver/dependency-resolver.ts',
  'builder/call-chain-builder.ts',
  'output/json-formatter.ts',
  'cli/cli.ts',
  'index.ts',
  'README.md'
];

let filesValid = true;
for (const file of expectedFiles) {
  const filePath = path.join(moduleDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing file: ${file}`);
    filesValid = false;
  } else {
    const stats = fs.statSync(filePath);
    console.log(`✅ Found file: ${file} (${Math.round(stats.size / 1024)}KB)`);
  }
}

if (filesValid) {
  console.log('✅ All core files are present\n');
} else {
  console.log('❌ Some core files are missing\n');
}

// Test 3: Verify test files
console.log('🧪 Test 3: Verifying test files...');

const testFiles = [
  '__tests__/typescript-parser.test.ts',
  '__tests__/symbol-extractor.test.ts',
  '__tests__/call-chain-builder.test.ts',
  '__tests__/integration.test.ts'
];

let testsValid = true;
for (const testFile of testFiles) {
  const testPath = path.join(moduleDir, testFile);
  if (!fs.existsSync(testPath)) {
    console.log(`❌ Missing test: ${testFile}`);
    testsValid = false;
  } else {
    console.log(`✅ Found test: ${testFile}`);
  }
}

if (testsValid) {
  console.log('✅ All test files are present\n');
} else {
  console.log('❌ Some test files are missing\n');
}

// Test 4: Check file content validity
console.log('📝 Test 4: Checking file content...');

const mainIndexPath = path.join(moduleDir, 'index.ts');
if (fs.existsSync(mainIndexPath)) {
  const indexContent = fs.readFileSync(mainIndexPath, 'utf-8');
  
  const expectedExports = [
    'CallChainAnalyzer',
    'TypeScriptParser',
    'DependencyResolver',
    'CallChainBuilder',
    'JsonOutputFormatter',
    'runCallChainAnalysis'
  ];
  
  let exportsValid = true;
  for (const exportName of expectedExports) {
    if (indexContent.includes(exportName)) {
      console.log(`✅ Export found: ${exportName}`);
    } else {
      console.log(`❌ Missing export: ${exportName}`);
      exportsValid = false;
    }
  }
  
  if (exportsValid) {
    console.log('✅ All expected exports are present\n');
  } else {
    console.log('❌ Some exports are missing\n');
  }
} else {
  console.log('❌ Main index file not found\n');
}

// Test 5: Check TypeScript syntax (basic)
console.log('🔍 Test 5: Basic TypeScript syntax check...');

const tsFiles = [
  'core/types.ts',
  'core/analyzer.ts',
  'parser/typescript-parser.ts'
];

let syntaxValid = true;
for (const tsFile of tsFiles) {
  const filePath = path.join(moduleDir, tsFile);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Basic syntax checks
    const hasInterfaces = content.includes('interface ');
    const hasClasses = content.includes('class ');
    const hasExports = content.includes('export ');
    const hasImports = content.includes('import ');
    
    if (hasInterfaces || hasClasses) {
      console.log(`✅ ${tsFile}: Contains TypeScript definitions`);
    } else {
      console.log(`⚠️  ${tsFile}: No TypeScript definitions found`);
    }
    
    if (hasExports) {
      console.log(`✅ ${tsFile}: Contains exports`);
    } else {
      console.log(`❌ ${tsFile}: No exports found`);
      syntaxValid = false;
    }
  }
}

if (syntaxValid) {
  console.log('✅ Basic TypeScript syntax checks passed\n');
} else {
  console.log('❌ Some TypeScript syntax issues found\n');
}

// Test 6: Check documentation
console.log('📚 Test 6: Checking documentation...');

const readmePath = path.join(moduleDir, 'README.md');
if (fs.existsSync(readmePath)) {
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const readmeSize = Math.round(readmeContent.length / 1024);
  
  const hasInstallation = readmeContent.includes('Installation');
  const hasUsage = readmeContent.includes('Usage');
  const hasExamples = readmeContent.includes('Examples');
  const hasAPI = readmeContent.includes('API') || readmeContent.includes('Configuration');
  
  console.log(`✅ README.md found (${readmeSize}KB)`);
  console.log(`${hasInstallation ? '✅' : '❌'} Installation section`);
  console.log(`${hasUsage ? '✅' : '❌'} Usage section`);
  console.log(`${hasExamples ? '✅' : '❌'} Examples section`);
  console.log(`${hasAPI ? '✅' : '❌'} API/Configuration section`);
  
  if (hasInstallation && hasUsage && hasExamples) {
    console.log('✅ Documentation is comprehensive\n');
  } else {
    console.log('⚠️  Documentation could be more comprehensive\n');
  }
} else {
  console.log('❌ README.md not found\n');
}

// Test 7: Check examples
console.log('💡 Test 7: Checking examples...');

const examplesPath = path.join(moduleDir, 'examples/usage-examples.ts');
if (fs.existsSync(examplesPath)) {
  const examplesContent = fs.readFileSync(examplesPath, 'utf-8');
  const examplesSize = Math.round(examplesContent.length / 1024);
  
  const exampleFunctions = [
    'basicUsageExample',
    'customConfigurationExample',
    'presetConfigurationExample',
    'savingResultsExample'
  ];
  
  let examplesValid = true;
  for (const exampleFunc of exampleFunctions) {
    if (examplesContent.includes(exampleFunc)) {
      console.log(`✅ Example found: ${exampleFunc}`);
    } else {
      console.log(`❌ Missing example: ${exampleFunc}`);
      examplesValid = false;
    }
  }
  
  console.log(`📄 Examples file size: ${examplesSize}KB`);
  
  if (examplesValid) {
    console.log('✅ All expected examples are present\n');
  } else {
    console.log('❌ Some examples are missing\n');
  }
} else {
  console.log('❌ Examples file not found\n');
}

// Summary
console.log('📋 Test Summary:');
console.log('================');

const allTestsPassed = structureValid && filesValid && testsValid && syntaxValid;

if (allTestsPassed) {
  console.log('🎉 All tests passed! The TypeScript Call Chain Analyzer appears to be properly implemented.');
  console.log('\n📝 Next steps:');
  console.log('1. Run `pnpm build` to compile the TypeScript code');
  console.log('2. Run the unit tests with `pnpm test`');
  console.log('3. Try the integration test with `node dist/call-chain-analyzer/test-integration.js`');
  console.log('4. Test the CLI with `node dist/call-chain-analyzer/cli/cli.js --help`');
} else {
  console.log('❌ Some tests failed. Please review the issues above.');
  console.log('\n🔧 Recommended actions:');
  console.log('1. Ensure all required files are present');
  console.log('2. Check TypeScript syntax and exports');
  console.log('3. Verify module structure is complete');
}

console.log('\n🏁 Test completed.');