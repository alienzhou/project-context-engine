import * as fs from 'node:fs';

export async function exsit(path: string) {
  try {
    await fs.promises.access(path);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 判断是否应该处理该文件/目录
 */
export function shouldProcessFile(name: string): boolean {
  const ignoredItems = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    'logs',
    '.DS_Store',
    '__pycache__',
    '.pytest_cache',
    'venv',
    'env',
  ];

  return !ignoredItems.some(item => name.includes(item));
}