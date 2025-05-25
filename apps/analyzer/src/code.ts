import { sayHello, add } from '@project-context-engine/common';
import Logger, { LogLevel } from './utils/log';
import { parseCodeFile } from './code-analyzer/parser/index';
import * as path from 'node:path';
import { readingCode } from './code-analyzer/reading';

const logger = Logger('main', {
  level: LogLevel.DEBUG,
  maxDays: 7,  // 只保留7天日志
});

// 使用日志记录器
logger.info('应用启动中...');
logger.info(`使用 common 包: ${sayHello('Analyzer')}`);
logger.info(`计算结果: 1 + 2 = ${add(1, 2)}`);

const PROJECT_BASE = path.resolve(__dirname, '..');

const FIXTURES_BASE_DIRATH = path.resolve(PROJECT_BASE, 'fixtures', 'ts');

const fixtures = [
  'bridge.ts',
  'fetch.ts',
];

async function main() {
  for (const fixture of fixtures) {
    const filePath = path.join(FIXTURES_BASE_DIRATH, fixture);
    const result = await parseCodeFile(filePath);
    const jsonResult = JSON.stringify(result, null, 2);
    logger.info(`解析结果: ${fixture}`);
    logger.info(jsonResult + '\n\n');

    for (let codeInfo of result) {
      const codeDesc = await readingCode(codeInfo);
      logger.info(`${filePath}: ${codeDesc}\n${codeInfo.fullText}\n\n`)
    }
  }
}

main();
