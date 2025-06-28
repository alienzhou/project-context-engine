import { sayHello, add } from '@project-context-engine/common';
import Logger, { LogLevel } from './utils/log';
import { parseCodeFile } from './code-analyzer/parser/index';
import * as path from 'node:path';
import { readingCode } from './code-analyzer/reading';

const logger = Logger('main', {
  level: LogLevel.DEBUG,
  maxDays: 7,  // Keep logs for 7 days only
});

// Use logger
logger.info('Application starting...');
logger.info(`Using common package: ${sayHello('Analyzer')}`);
logger.info(`Calculation result: 1 + 2 = ${add(1, 2)}`);

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
    logger.info(`Parse result: ${fixture}`);
    logger.info(jsonResult + '\n\n');

    for (let codeInfo of result) {
      const codeDesc = await readingCode(codeInfo);
      logger.info(`${filePath}: ${codeDesc}\n${codeInfo.fullText}\n\n`)
    }
  }
}

main();
