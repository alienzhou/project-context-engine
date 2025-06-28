/**
 * Analyzer Application Entry Point
 */
import Logger, { LogLevel } from './utils/log';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { readingCode } from './code-analyzer/reading';
import { getAllCodeSummary, processDirectoriesDeepToShallow } from './code-analyzer/summary/index';
import { WIKI_METADATA_FILENAME } from './utils/const';
import { listProject } from './code-analyzer/structure';
import { generateAgentPromptsForWiki } from './code-analyzer/agent';
import { exsit } from './utils/fs';
import { generateRepoMap } from './code-analyzer/repomap';

const logger = Logger('main', {
  level: LogLevel.DEBUG,
  maxDays: 7,  // Keep logs for 7 days only
});

const PROJECT_BASE = path.resolve(__dirname, '..');

const REPO = 'xxx';
const PROCESSED_BASE = path.resolve(PROJECT_BASE, 'processed');

async function main() {
  const projectName = path.parse(REPO).name;
  const targetDirpath = path.join(PROCESSED_BASE, projectName);
  const wikiFilepath = path.join(targetDirpath, WIKI_METADATA_FILENAME);
  const targetAssetsDirpaht = path.join(targetDirpath, 'assets');
  const repoMapFilepath = path.join(targetDirpath, 'repomap.md');

  // Generate assets directory
  process.stdout.write('\n\n');
  logger.info(`[Step 1] Start generating assets directory: ${targetAssetsDirpaht}`);
  // remove dir
  if (await exsit(targetAssetsDirpaht)) {
    await fs.promises.rmdir(targetAssetsDirpaht, { recursive: true });
  }
  await fs.promises.mkdir(targetAssetsDirpaht, { recursive: true });
  process.stdout.write('\n\n\n');

  // Perform code summary
  process.stdout.write('\n\n');
  logger.info(`[Step 2] Start code summarization: ${REPO}`);
  await getAllCodeSummary(REPO, async (filepath, content) => {
    const relativePath = path.relative(REPO, filepath);
    const targetPath = path.join(targetAssetsDirpaht, relativePath);

    logger.info(`Processing ${filepath}, target: ${targetPath}`);
    const parsed = path.parse(targetPath);
    await fs.promises.mkdir(parsed.dir, { recursive: true });
    const desc = parsed.ext === '.md' ? content : await readingCode({
      fullText: content,
      filePath: filepath,
      signature: '',
    });

    await fs.promises.writeFile(`${targetPath}.md`, desc, 'utf-8');
  });
  process.stdout.write('\n\n\n');

  // Process directory structure
  process.stdout.write('\n\n');
  logger.info(`[Step 3] Start processing directory structure: ${targetAssetsDirpaht}`);
  await processDirectoriesDeepToShallow(targetAssetsDirpaht);
  process.stdout.write('\n\n\n');

  // Generate tree structure and find SUMMARY.md file
  process.stdout.write('\n\n');
  logger.info(`[Step 4] Start generating tree structure: ${targetAssetsDirpaht}`);
  const { text } = await listProject(targetAssetsDirpaht);
  logger.info(`Project Summary: ${text}`);
  process.stdout.write('\n\n\n');

  // Write final wiki file
  process.stdout.write('\n\n');
  logger.info(`[Step 5] Start writing final wiki file: ${wikiFilepath}`);
  fs.promises.writeFile(wikiFilepath, text, 'utf-8');

  process.stdout.write('\n\n\n');
  logger.info(`[Step 6] Create page generation prompts`);
  generateAgentPromptsForWiki(wikiFilepath);

  // New: Generate Repository Map
  process.stdout.write('\n\n');
  logger.info(`[Step 7] Start generating Repository Map: ${REPO}`);
  try {
    const repoMapResult = await generateRepoMap(REPO, {
      maxTokens: 2048, // Can be adjusted as needed
      includeTypes: true,
      includeVariables: false,
      minImportance: 0.5,
    });

    // Save repo map
    await fs.promises.writeFile(repoMapFilepath, repoMapResult.map, 'utf-8');
    logger.info(`Repository Map saved: ${repoMapFilepath}`);
    logger.info(`Statistics: ${repoMapResult.files.length} files, ${repoMapResult.totalSymbols} symbols, ${repoMapResult.estimatedTokens} tokens`);

    // Also save detailed JSON data
    const repoMapJsonPath = path.join(targetDirpath, 'repomap.json');
    await fs.promises.writeFile(repoMapJsonPath, JSON.stringify(repoMapResult, null, 2), 'utf-8');

  } catch (error) {
    logger.error('Failed to generate Repository Map:', error);
  }
  process.stdout.write('\n\n\n');
}

main();
