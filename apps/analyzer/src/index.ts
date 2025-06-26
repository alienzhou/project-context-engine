/**
 * Analyzer 应用入口点
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
  maxDays: 7,  // 只保留7天日志
});

const PROJECT_BASE = path.resolve(__dirname, '..');

const REPO = '/Users/zhouhongxuan/program/repos/web-highlighter';
// const REPO = '/Users/zhouhongxuan/program/kuaishou/kinsight/llm-server';
const PROCESSED_BASE = path.resolve(PROJECT_BASE, 'processed');

async function main() {
  const projectName = path.parse(REPO).name;
  const targetDirpath = path.join(PROCESSED_BASE, projectName);
  const wikiFilepath = path.join(targetDirpath, WIKI_METADATA_FILENAME);
  const targetAssetsDirpaht = path.join(targetDirpath, 'assets');
  const repoMapFilepath = path.join(targetDirpath, 'repomap.md');

  // 生成 assets 目录
  process.stdout.write('\n\n');
  logger.info(`[Step 1] 开始生成 assets 目录: ${targetAssetsDirpaht}`);
  // remove dir
  if (await exsit(targetAssetsDirpaht)) {
    await fs.promises.rmdir(targetAssetsDirpaht, { recursive: true });
  }
  await fs.promises.mkdir(targetAssetsDirpaht, { recursive: true });
  process.stdout.write('\n\n\n');

  // 进行代码总结
  process.stdout.write('\n\n');
  logger.info(`[Step 2] 开始进行代码总结: ${REPO}`);
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

  // 先处理目录结构
  process.stdout.write('\n\n');
  logger.info(`[Step 3] 开始处理目录结构: ${targetAssetsDirpaht}`);
  await processDirectoriesDeepToShallow(targetAssetsDirpaht);
  process.stdout.write('\n\n\n');
  
  // 生成树形结构并查找SUMMARY.md文件
  process.stdout.write('\n\n');
  logger.info(`[Step 4] 开始生成树形结构: ${targetAssetsDirpaht}`);
  const { text } = await listProject(targetAssetsDirpaht);
  logger.info(`Project Summary: ${text}`);
  process.stdout.write('\n\n\n');

  // 写入最终wiki文件
  process.stdout.write('\n\n');
  logger.info(`[Step 5] 开始写入最终wiki文件: ${wikiFilepath}`);
  fs.promises.writeFile(wikiFilepath, text, 'utf-8');

  process.stdout.write('\n\n\n');
  logger.info(`[Step 6] 创建页面的生成词`);
  generateAgentPromptsForWiki(wikiFilepath);

  // 新增：生成 Repository Map
  process.stdout.write('\n\n');
  logger.info(`[Step 7] 开始生成 Repository Map: ${REPO}`);
  try {
    const repoMapResult = await generateRepoMap(REPO, {
      maxTokens: 2048, // 可以根据需要调整
      includeTypes: true,
      includeVariables: false,
      minImportance: 0.5,
    });
    
    // 保存 repo map
    await fs.promises.writeFile(repoMapFilepath, repoMapResult.map, 'utf-8');
    logger.info(`Repository Map 已保存: ${repoMapFilepath}`);
    logger.info(`统计: ${repoMapResult.files.length} 文件, ${repoMapResult.totalSymbols} 符号, ${repoMapResult.estimatedTokens} tokens`);
    
    // 也可以保存详细的 JSON 数据
    const repoMapJsonPath = path.join(targetDirpath, 'repomap.json');
    await fs.promises.writeFile(repoMapJsonPath, JSON.stringify(repoMapResult, null, 2), 'utf-8');
    
  } catch (error) {
    logger.error('生成 Repository Map 失败:', error);
  }
  process.stdout.write('\n\n\n');
}

main();
