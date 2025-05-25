import * as fs from 'node:fs';
import * as path from 'node:path';
import { readingCode } from '../reading';
import { Logger } from '../../utils/log';
import { getAIAnswer } from '../../utils/ai';
import { DIR_SUMMARY_FILENAME } from '../../utils/const';
import { traverseDirectoriesDeepToShallow } from '../../utils/directoryTraverser';

const SUPPORT_EXTS = ['.js', '.ts', '.md'];
const logger = Logger('CodeSummary');

/**
 * 判断文件内容是否为文本类型
 * @param buffer 文件内容的buffer
 * @returns 如果是文本类型返回true，否则返回false
 */
function isTextFile(buffer: Buffer): boolean {
  // 检查文件中是否包含空字节(null bytes)
  // 二进制文件通常包含大量的空字节或控制字符
  // 我们检查前8192个字节，通常足够判断文件类型
  const chunkSize = Math.min(8192, buffer.length);
  
  // 检查是否有空字节或高频率的控制字符，这些在典型文本文件中很少见
  let controlChars = 0;
  let nullBytes = 0;
  
  for (let i = 0; i < chunkSize; i++) {
    const byte = buffer[i];
    // 空字节检查
    if (byte === 0) {
      nullBytes++;
      // 如果有空字节，很可能是二进制文件
      if (nullBytes > 1) {
        return false;
      }
    }
    
    // 控制字符检查（除了常见的如换行、回车、制表符等）
    if ((byte < 32 && ![9, 10, 13].includes(byte)) || (byte >= 127 && byte <= 159)) {
      controlChars++;
      // 如果控制字符超过一定比例，可能是二进制文件
      if (controlChars > chunkSize * 0.1) {
        return false;
      }
    }
  }
  
  // 如果通过了以上检查，认为是文本文件
  return true;
}

const readdir = async (dirpath: string) => {
  const files = await fs.promises.readdir(dirpath);
  return files.filter(file => (
    !file.includes('node_modules')
    && !file.includes('dist')
    && !file.includes('test')
    && !file.includes('tests')
    && !file.includes('log')
    && !file.includes('logs')
    && !file.includes('.DS_Store')
    && !file.includes('.git')
  ));
}

export async function getAllCodeSummary(
  baseDirpath: string,
  cb: (filepath: string, content: string) => Promise<void>,
) {
  const dirs = await readdir(baseDirpath);
  const pendingFilepathList = dirs.map(dir => path.join(baseDirpath, dir));
  let currrentFilepath = pendingFilepathList.shift();
  const result: Array<{
    filepath: string;
    content: string;
  }> = [];

  while (currrentFilepath) {
    logger.info(`Processing file: ${currrentFilepath}`);
    const stat = await fs.promises.stat(currrentFilepath);
    if (stat.isDirectory()) {
      logger.info(`IS Directory: ${currrentFilepath}`);
      const subDirs = await readdir(currrentFilepath!);
      pendingFilepathList.push(...subDirs.map(dir => path.join(currrentFilepath!, dir)));
    }
    else if (SUPPORT_EXTS.includes(path.extname(currrentFilepath))) {
      logger.info(`IS File: ${currrentFilepath}`);
      const content = await fs.promises.readFile(currrentFilepath, 'utf-8');
      await cb(currrentFilepath, content);
      result.push({
        filepath: currrentFilepath,
        content,
      });
    }
    else {
      logger.warn(`File does not supported: ${currrentFilepath}`);
    }
    currrentFilepath = pendingFilepathList.shift();
  }

  return result;
}


const summarizeDir = async (dirpath: string) => {
  const dirs = await fs.promises.readdir(dirpath);
  const mdFiles: Array<{
    filepath: string;
    content: string;
  }> = [];
  for (let d of dirs) {
    if (d === DIR_SUMMARY_FILENAME || !d.endsWith('.md')) {
      continue;
    }
    const filepath = path.join(dirpath, d);
    const codeFilepath = filepath.replace(/\.md$/, '');
    const content = await fs.promises.readFile(filepath, 'utf-8');
    mdFiles.push({
      filepath: codeFilepath,
      content,
    });
  }

  if (mdFiles.length === 0) {
    return null;
  }

  const question = mdFiles.map(m => `filepath: ${m.filepath}\n\n${m.content}`).join('\n\n------------\n\n');

  const text = await getAIAnswer({
    systemPrompt: `以下代码位于${dirpath}目录下，请阅读各个代码的总结文档，给出整体的总结文档。`,
    question,
  });

  return text;
}

/**
 * 从最深层目录开始遍历并打印
 * @param targetDir 目标目录
 */
export async function processDirectoriesDeepToShallow(targetDir: string) {
  logger.info(`开始从深层向上遍历目录: ${targetDir}`);
  
  try {
    // 使用更新后的遍历函数获取目录信息
    const sortedDirs = await traverseDirectoriesDeepToShallow(targetDir);
    
    // 直接输出目录结构，从最深层到最浅层
    for (const dir of sortedDirs) {
      // 只输出目录名和完整路径，没有任何缩进或特殊格式
      logger.info(`${dir.name} (${dir.path}) - ${dir.depth}层`);
      const summary = await summarizeDir(dir.path);
      if (!summary) {
        logger.warn(`无法获取目录摘要: ${dir.path}`);
        continue;
      }
      fs.promises.writeFile(path.join(dir.path, DIR_SUMMARY_FILENAME), summary, 'utf-8');
      logger.info(`目录摘要: ${summary}}`);
    }
    logger.info('目录遍历完成');
    return sortedDirs.map(dir => dir.path);
  } catch (error) {
    logger.error(`目录遍历出错: ${error}`);
    return [];
  }
}