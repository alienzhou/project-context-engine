import { generateRepoMap } from './index';
import * as path from 'node:path';
import * as fs from 'node:fs';
import Logger from '../../utils/log';

const logger = Logger('repo-map-cli');

export async function generateRepoMapCli(options: {
  input: string;
  output?: string;
  maxTokens?: number;
  format?: 'text' | 'json';
}) {
  const { input, output, maxTokens = 1024, format = 'text' } = options;

  try {
    logger.info(`开始生成 repo map...`);
    logger.info(`输入目录: ${input}`);
    logger.info(`最大 tokens: ${maxTokens}`);

    const result = await generateRepoMap(input, { maxTokens });

    if (format === 'json') {
      const jsonOutput = JSON.stringify(result, null, 2);
      if (output) {
        await fs.promises.writeFile(output, jsonOutput, 'utf-8');
        logger.info(`JSON 格式已保存到: ${output}`);
      } else {
        console.log(jsonOutput);
      }
    } else {
      if (output) {
        await fs.promises.writeFile(output, result.map, 'utf-8');
        logger.info(`Repo map 已保存到: ${output}`);
      } else {
        console.log('\n=== Repository Map ===\n');
        console.log(result.map);
      }
    }

    logger.info(`\n统计信息:`);
    logger.info(`- 文件数量: ${result.files.length}`);
    logger.info(`- 符号总数: ${result.totalSymbols}`);
    logger.info(`- 预估 tokens: ${result.estimatedTokens}`);

  } catch (error) {
    logger.error('生成 repo map 失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('使用方法: node cli.js <input-dir> [output-file] [max-tokens] [format]');
    console.log('  format: text (default) | json');
    process.exit(1);
  }

  const input = path.resolve(args[0]);
  const output = args[1] ? path.resolve(args[1]) : undefined;
  const maxTokens = args[2] ? parseInt(args[2]) : 1024;
  const format = (args[3] as 'text' | 'json') || 'text';

  generateRepoMapCli({ input, output, maxTokens, format })
    .then(() => {
      console.log('✅ 完成');
    })
    .catch(error => {
      console.error('❌ 失败:', error.message);
      process.exit(1);
    });
}
