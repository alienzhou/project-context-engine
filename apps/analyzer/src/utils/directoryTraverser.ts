import * as fs from 'node:fs';
import * as path from 'node:path';
import Logger from './log';

const logger = Logger('DirectoryTraverser');

/**
 * Interface for storing directory information
 */
interface DirectoryInfo {
  name: string;       // Directory name
  path: string;       // Full path
  depth: number;      // Depth level
  children?: DirectoryInfo[];
}

/**
 * Filter directories that should not be processed
 * @param dirName Directory name
 * @returns Whether the directory should be processed
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
 * Scan directory structure and calculate depth for each directory
 * @param dirPath Root directory path to scan
 * @returns Object containing directory structure and depth information
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
 * Flatten directory structure and sort by depth
 * @param dirInfo Directory information object
 * @returns List of directories sorted by depth (deep to shallow)
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

  // Sort by depth from high to low (deep to shallow)
  return result.sort((a, b) => b.depth - a.depth);
}

/**
 * Get maximum depth value from directory structure
 * @param dirs Array of directory information
 * @returns Maximum depth value
 */
function getMaxDepth(dirs: DirectoryInfo[]): number {
  if (dirs.length === 0) return 0;
  return Math.max(...dirs.map(dir => dir.depth));
}

/**
 * Traverse directory structure from deepest to shallowest
 * @param targetDir Target directory path
 * @returns Array of directory information objects sorted from deep to shallow
 */
export async function traverseDirectoriesDeepToShallow(targetDir: string): Promise<DirectoryInfo[]> {
  logger.debug(`Starting to scan directory structure: ${targetDir}`);

  // 1. Scan directory structure
  const dirStructure = await scanDirectoryStructure(targetDir);

  // 2. Flatten and sort by depth
  const sortedDirs = flattenAndSortByDepth(dirStructure);
  logger.debug(`Scan completed, found ${sortedDirs.length} directories`);

  return sortedDirs;
}
