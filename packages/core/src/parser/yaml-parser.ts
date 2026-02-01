import fs from 'fs/promises';
import YAML from 'yaml';

export async function readYamlFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return YAML.parse(content) as T;
}

export async function writeYamlFile<T>(filePath: string, data: T): Promise<void> {
  const content = YAML.stringify(data);
  await fs.writeFile(filePath, content, 'utf-8');
}

export function parseYaml<T>(content: string): T {
  return YAML.parse(content) as T;
}

export function stringifyYaml<T>(data: T): string {
  return YAML.stringify(data);
}
