import fs from 'fs/promises';
import path from 'path';

export async function findArborRoot(startDir?: string): Promise<string | null> {
  let currentDir = startDir || process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const arborPath = path.join(currentDir, '.arbor');

    try {
      const stat = await fs.stat(arborPath);
      if (stat.isDirectory()) {
        return arborPath;
      }
    } catch {
      // Directory doesn't exist, continue searching
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
