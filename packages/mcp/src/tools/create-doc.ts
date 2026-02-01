import fs from 'fs-extra';
import path from 'path';
import {
  generateDocId,
  getDateString,
  toArborPath,
  writeMarkdownFile,
  type DocType,
  type TargetType,
} from '@arbor-plan/core';

export interface CreateDocInput {
  parentType: TargetType;
  parentPath: string;
  name: string;
  docType: DocType;
  content?: string;
}

export interface CreateDocResult {
  success: boolean;
  path: string;
  doc: {
    id: string;
    name: string;
    type: DocType;
    created: string;
  };
  error?: { code: string; message: string };
}

export async function createDoc(
  arborRoot: string,
  input: CreateDocInput
): Promise<CreateDocResult> {
  const basePath = toArborPath(input.parentType, input.parentPath);
  const docsDir = path.join(arborRoot, basePath, 'docs');
  const today = getDateString();
  const id = generateDocId();

  const parentMeta = path.join(arborRoot, basePath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: '',
      doc: {} as CreateDocResult['doc'],
      error: {
        code: 'INVALID_PARENT',
        message: `Parent node does not exist at ${input.parentPath}`,
      },
    };
  }

  await fs.ensureDir(docsDir);

  const docPath = path.join(docsDir, `${id}.md`);
  const frontmatter = {
    id,
    name: input.name,
    type: input.docType,
    created: today,
    updated: today,
  };

  const content = input.content
    ? `# ${input.name}\n\n${input.content}`
    : `# ${input.name}`;

  await writeMarkdownFile(docPath, frontmatter, content);

  return {
    success: true,
    path: path.relative(arborRoot, docPath),
    doc: {
      id,
      name: input.name,
      type: input.docType,
      created: today,
    },
  };
}
