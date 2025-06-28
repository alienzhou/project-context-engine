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
  language?: string;
}) {
  const { input, output, maxTokens = 1024, format = 'text', language } = options;

  try {
    logger.info(`开始生成 repo map...`);
    logger.info(`输入目录: ${input}`);
    logger.info(`最大 tokens: ${maxTokens}`);
    if (language) {
      logger.info(`指定语言: ${language}`);
    }

    const result = await generateRepoMap(input, { maxTokens, language });

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

// 获取支持的语言列表
function getSupportedLanguages(): string[] {
  return [
    'javascript', 'typescript', 'python', 'java', 'kotlin', 'cpp', 'c',
    'go', 'rust', 'swift', 'scala', 'csharp', 'ruby', 'php', 'lua',
    'bash', 'html', 'css', 'vue', 'json', 'yaml', 'xml'
  ];
}

// 解析命令行参数
function parseArgs(args: string[]): {
  input?: string;
  output?: string;
  maxTokens?: number;
  format?: 'text' | 'json';
  language?: string;
  help?: boolean;
} {
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--language' || arg === '-l') {
      result.language = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--max-tokens' || arg === '-t') {
      result.maxTokens = parseInt(args[++i]);
    } else if (arg === '--format' || arg === '-f') {
      result.format = args[++i];
    } else if (!result.input && !arg.startsWith('-')) {
      result.input = arg;
    }
  }

  return result;
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法: node cli.js <input-dir> [选项]

选项:
  -l, --language <lang>     指定要分析的语言 (可选)
  -o, --output <file>       输出文件路径 (可选)
  -t, --max-tokens <num>    最大 token 数量 (默认: 1024)
  -f, --format <format>     输出格式: text | json (默认: text)
  -h, --help                显示帮助信息

支持的语言:
  ${getSupportedLanguages().join(', ')}

示例:
  node cli.js ./src                           # 分析所有支持的语言
  node cli.js ./src --language python        # 只分析 Python 文件
  node cli.js ./src -l typescript -o map.md  # 只分析 TypeScript 并保存到文件
`);
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.input) {
    console.error('错误: 请指定输入目录');
    showHelp();
    process.exit(1);
  }

  // 验证语言参数
  if (options.language) {
    const supportedLanguages = getSupportedLanguages();
    if (!supportedLanguages.includes(options.language)) {
      console.error(`错误: 不支持的语言 "${options.language}"`);
      console.error(`支持的语言: ${supportedLanguages.join(', ')}`);
      process.exit(1);
    }
  }

  // 验证格式参数
  if (options.format && !['text', 'json'].includes(options.format)) {
    console.error('错误: 格式必须是 text 或 json');
    process.exit(1);
  }

  const input = path.resolve(options.input);
  const output = options.output ? path.resolve(options.output) : undefined;
  const maxTokens = options.maxTokens || 1024;
  const format = (options.format as 'text' | 'json') || 'text';
  const language = options.language;

  generateRepoMapCli({ input, output, maxTokens, format, language })
    .then(() => {
      console.log('✅ 完成');
    })
    .catch(error => {
      console.error('❌ 失败:', error.message);
      process.exit(1);
    });
}
