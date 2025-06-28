const { generateRepoMap } = require('./dist/code-analyzer/repomap/index.js');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--language' || arg === '-l') {
      options.language = args[++i];
    } else if (arg === '--max-tokens' || arg === '-t') {
      options.maxTokens = parseInt(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node test-repomap.js [options]

Options:
  -l, --language <lang>     Specify the language to test (optional)
  -t, --max-tokens <num>    Maximum number of tokens (default: 4096)
  -h, --help               Show help information

Supported Languages:
  javascript, typescript, python, java, kotlin, cpp, c, go, rust, swift, 
  scala, csharp, ruby, php, lua, bash, html, css, vue, json, yaml, xml

Examples:
  node test-repomap.js                    # Test all languages
  node test-repomap.js --language python  # Test Python files only
  node test-repomap.js -l typescript      # Test TypeScript files only
`);
      process.exit(0);
    }
  }

  return options;
}

async function runTest(language, maxTokens = 4096) {
  const testName = language ? `${language.toUpperCase()} files` : 'all supported languages';
  console.log(`=== Testing Repo Map functionality (${testName}) ===\n`);

  try {
    const result = await generateRepoMap('../../test-multilang', {
      maxTokens,
      includeTypes: true,
      includeVariables: false,
      minImportance: 0.05,
      language,
    });

    console.log('📊 Statistics:');
    console.log(`  - Number of files: ${result.files.length}`);
    console.log(`  - Total symbols: ${result.totalSymbols}`);
    console.log(`  - Estimated tokens: ${result.estimatedTokens}`);

    if (language) {
      console.log(`  - Filtered language: ${language}`);
      // Verify that only files of the specified language are included
      const fileExtensions = result.files.map(f => path.extname(f.relativePath).toLowerCase());
      const uniqueExtensions = [...new Set(fileExtensions)];
      console.log(`  - File extensions: ${uniqueExtensions.join(', ')}`);
    }

    console.log('\n📝 Repository Map:');
    console.log('='.repeat(50));
    console.log(result.map);
    console.log('='.repeat(50));

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  const options = parseArgs();

  if (options.language) {
    // Test specified language
    await runTest(options.language, options.maxTokens);
  } else {
    // Run multiple test cases
    console.log('🧪 Running multiple test cases...\n');

    const testCases = [
      { language: undefined, name: 'All languages' },
      { language: 'python', name: 'Python' },
      { language: 'typescript', name: 'TypeScript' },
      { language: 'java', name: 'Java' },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        await runTest(testCase.language, options.maxTokens);
        console.log(`✅ ${testCase.name} test passed`);
      } catch (error) {
        console.error(`❌ ${testCase.name} test failed:`, error.message);
      }
    }
  }
}

runAllTests();
