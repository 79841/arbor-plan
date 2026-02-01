import fs from 'fs/promises';
import matter from 'gray-matter';

export interface ParsedMarkdown<T> {
  frontmatter: T;
  content: string;
}

export async function readMarkdownFile<T>(filePath: string): Promise<ParsedMarkdown<T>> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    frontmatter: data as T,
    content: content.trim(),
  };
}

export async function writeMarkdownFile<T extends Record<string, unknown>>(
  filePath: string,
  frontmatter: T,
  content: string
): Promise<void> {
  const output = matter.stringify(content, frontmatter);
  await fs.writeFile(filePath, output, 'utf-8');
}

export function parseMarkdown<T>(raw: string): ParsedMarkdown<T> {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as T,
    content: content.trim(),
  };
}
