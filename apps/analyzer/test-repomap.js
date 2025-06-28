const { generateRepoMap } = require('./dist/code-analyzer/repomap/index.js');
const path = require('path');

// 解析命令行参数
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
使用方法: node test-repomap.js [选项]

选项:
  -l, --language <lang>     指定要测试的语言 (可选)
  -t, --max-tokens <num>    最大 token 数量 (默认: 4096)
  -h, --help                显示帮助信息

支持的语言:
  javascript, typescript, python, java, kotlin, cpp, c, go, rust, swift, 
  scala, csharp, ruby, php, lua, bash, html, css, vue, json, yaml, xml

示例:
  node test-repomap.js                    # 测试所有语言
  node test-repomap.js --language python # 只测试 Python 文件
  node test-repomap.js -l typescript     # 只测试 TypeScript 文件
`);
      process.exit(0);
    }
  }

  return options;
}

async function runTest(language, maxTokens = 4096) {
  const testName = language ? `${language.toUpperCase()} 文件` : '所有支持的语言';
  console.log(`=== 测试 Repo Map 功能 (${testName}) ===\n`);

  try {
    const result = await generateRepoMap('../../test-multilang', {
      maxTokens,
      includeTypes: true,
      includeVariables: false,
      minImportance: 0.05,
      language,
    });

    console.log('📊 统计信息:');
    console.log(`  - 文件数量: ${result.files.length}`);
    console.log(`  - 符号总数: ${result.totalSymbols}`);
    console.log(`  - 预估 tokens: ${result.estimatedTokens}`);

    if (language) {
      console.log(`  - 过滤语言: ${language}`);
      // 验证是否只包含指定语言的文件
      const fileExtensions = result.files.map(f => path.extname(f.relativePath).toLowerCase());
      const uniqueExtensions = [...new Set(fileExtensions)];
      console.log(`  - 文件扩展名: ${uniqueExtensions.join(', ')}`);
    }

    console.log('\n📝 Repository Map:');
    console.log('='.repeat(50));
    console.log(result.map);
    console.log('='.repeat(50));

    return result;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function runAllTests() {
  const options = parseArgs();

  if (options.language) {
    // 测试指定语言
    await runTest(options.language, options.maxTokens);
  } else {
    // 运行多个测试用例
    console.log('🧪 运行多个测试用例...\n');

    const testCases = [
      { language: undefined, name: '所有语言' },
      { language: 'python', name: 'Python' },
      { language: 'typescript', name: 'TypeScript' },
      { language: 'java', name: 'Java' },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        await runTest(testCase.language, options.maxTokens);
        console.log(`✅ ${testCase.name} 测试通过`);
      } catch (error) {
        console.error(`❌ ${testCase.name} 测试失败:`, error.message);
      }
    }
  }
}

runAllTests();
