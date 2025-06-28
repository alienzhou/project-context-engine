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
 * Check if file content is text type
 * @param buffer File content buffer
 * @returns true if text type, false otherwise
 */
function isTextFile(buffer: Buffer): boolean {
  // Check for null bytes in file
  // Binary files typically contain many null bytes or control characters
  // We check the first 8192 bytes, usually enough to determine file type
  const chunkSize = Math.min(8192, buffer.length);

  // Check for null bytes or high frequency of control characters, which are rare in typical text files
  let controlChars = 0;
  let nullBytes = 0;

  for (let i = 0; i < chunkSize; i++) {
    const byte = buffer[i];
    // Check for null bytes
    if (byte === 0) {
      nullBytes++;
      // If there are null bytes, likely a binary file
      if (nullBytes > 1) {
        return false;
      }
    }

    // Check for control characters (except common ones like newline, carriage return, tab)
    if ((byte < 32 && ![9, 10, 13].includes(byte)) || (byte >= 127 && byte <= 159)) {
      controlChars++;
      // If control characters exceed a certain ratio, might be a binary file
      if (controlChars > chunkSize * 0.1) {
        return false;
      }
    }
  }

  // If passed above checks, consider it a text file
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
    systemPrompt: `Please read the summary documents for each code in the ${dirpath} directory and provide an overall summary document.`,
    question,
  });

  return text;
}

/**
 * Traverse directories from deepest to shallowest and print
 * @param targetDir Target directory
 */
export async function processDirectoriesDeepToShallow(targetDir: string) {
  logger.info(`Starting to traverse directories from deep to shallow: ${targetDir}`);

  try {
    // Use updated traversal function to get directory information
    const sortedDirs = await traverseDirectoriesDeepToShallow(targetDir);

    // Output directory structure directly, from deepest to shallowest
    for (const dir of sortedDirs) {
      // Only output directory name and full path, no indentation or special formatting
      logger.info(`${dir.name} (${dir.path}) - depth: ${dir.depth}`);
      const summary = await summarizeDir(dir.path);
      if (!summary) {
        logger.warn(`Cannot get directory summary: ${dir.path}`);
        continue;
      }
      fs.promises.writeFile(path.join(dir.path, DIR_SUMMARY_FILENAME), summary, 'utf-8');
      logger.info(`Directory summary: ${summary}}`);
    }
    logger.info('Directory traversal completed');
    return sortedDirs.map(dir => dir.path);
  } catch (error) {
    logger.error(`Directory traversal error: ${error}`);
    return [];
  }
}