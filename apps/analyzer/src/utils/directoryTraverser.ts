import * as fs from 'node:fs';
import * as path from 'node:path';
import Logger from './log';

const logger = Logger('DirectoryTraverser');

/**
 * 用于存储目录信息的接口
 */
interface DirectoryInfo {
  name: string;       // 目录名称
  path: string;       // 完整路径
  depth: number;      // 深度级别
  children?: DirectoryInfo[];
}

/**
 * 过滤不需要处理的目录
 * @param dirName 目录名称
 * @returns 是否应该处理该目录
 */
function shouldProcessDirectory(dirName: string): boolean {
  const ignoredDirs = [
    'node_modules',
    'dist',
    '.git',
    'logs',
    'test',
    'tests',
    'coverage',
    'build',
    '.next',
    '.nuxt',
    '.cache',
    '.DS_Store',
  ];

  return !ignoredDirs.some(ignored => dirName.includes(ignored));
}

/**
 * 扫描目录结构并计算每个目录的深度
 * @param dirPath 要扫描的根目录路径
 * @returns 包含目录结构和深度信息的对象
 */
export async function scanDirectoryStructure(dirPath: string, depth: number = 0): Promise<DirectoryInfo> {
  const rootDirInfo: DirectoryInfo = {
    name: path.basename(dirPath),
    path: dirPath,
    depth,
    children: [],
  };

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && shouldProcessDirectory(entry.name)) {
        const childDirPath = path.join(dirPath, entry.name);
        const childInfo = await scanDirectoryStructure(childDirPath, depth + 1);
        childInfo.depth = rootDirInfo.depth + 1;
        rootDirInfo.children?.push(childInfo);
      }
    }
    
    return rootDirInfo;
  } catch (error) {
    logger.error(`Error scanning directory ${dirPath}: ${error}`);
    return rootDirInfo;
  }
}

/**
 * 扁平化目录结构并按深度排序
 * @param dirInfo 目录信息对象
 * @returns 按深度排序的目录列表（从深到浅）
 */
export function flattenAndSortByDepth(dirInfo: DirectoryInfo): DirectoryInfo[] {
  const result: DirectoryInfo[] = [];
  
  function traverse(info: DirectoryInfo) {
    result.push(info);
    
    if (info.children && info.children.length > 0) {
      for (const child of info.children) {
        traverse(child);
      }
    }
  }
  
  traverse(dirInfo);
  
  // 按深度从大到小排序（从深层到浅层）
  return result.sort((a, b) => b.depth - a.depth);
}

/**
 * 获取目录结构中最大的深度值
 * @param dirs 目录信息数组
 * @returns 最大深度值
 */
function getMaxDepth(dirs: DirectoryInfo[]): number {
  if (dirs.length === 0) return 0;
  return Math.max(...dirs.map(dir => dir.depth));
}

/**
 * 从最深层目录开始向上遍历目录结构
 * @param targetDir 目标目录的路径
 * @returns 从深到浅排序的目录信息对象数组
 */
export async function traverseDirectoriesDeepToShallow(targetDir: string): Promise<DirectoryInfo[]> {
  logger.debug(`开始扫描目录结构: ${targetDir}`);
  
  // 1. 扫描目录结构
  const dirStructure = await scanDirectoryStructure(targetDir);
  
  // 2. 扁平化并按深度排序
  const sortedDirs = flattenAndSortByDepth(dirStructure);
  logger.debug(`扫描完成，共找到 ${sortedDirs.length} 个目录`);
  
  return sortedDirs;
}
