const { generateRepoMap } = require('./dist/code-analyzer/repomap/index.js');
const path = require('path');

async function test() {
  console.log('=== 测试 Repo Map 功能 ===\n');

  try {
    const result = await generateRepoMap('../../test-multilang', {
      maxTokens: 4096,
      includeTypes: true,
      includeVariables: false,
      minImportance: 0.05,
    });

    console.log('📊 统计信息:');
    console.log(`  - 文件数量: ${result.files.length}`);
    console.log(`  - 符号总数: ${result.totalSymbols}`);
    console.log(`  - 预估 tokens: ${result.estimatedTokens}`);
    console.log('\n📝 Repository Map:');
    console.log('='.repeat(50));
    console.log(result.map);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

test();
