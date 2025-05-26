import * as fs from 'node:fs';

export async function exsit(path: string) {
  try {
    await fs.promises.access(path);
    return true;
  } catch (error) {
    return false;
  }
}