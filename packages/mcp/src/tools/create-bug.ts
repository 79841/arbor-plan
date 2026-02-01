import fs from 'fs-extra';
import path from 'path';
import {
  generateBugId,
  getDateString,
  toArborPath,
  writeMarkdownFile,
  type BugSeverity,
  type BugStatus,
  type TargetType,
} from '@arbor-plan/core';

export interface CreateBugInput {
  parentType: TargetType;
  parentPath: string;
  name: string;
  description?: string;
  severity: BugSeverity;
  status?: BugStatus;
  relatedTask?: string;
  /** 원인 분석 */
  causeAnalysis?: string;
  /** 해결 방법 */
  solution?: string;
  /** 영향 범위 */
  impactScope?: string;
  /** 재현 단계 */
  stepsToReproduce?: string;
}

export interface CreateBugResult {
  success: boolean;
  path: string;
  bug: {
    id: string;
    name: string;
    severity: BugSeverity;
    status: BugStatus;
    created: string;
  };
  error?: { code: string; message: string };
}

/**
 * Bug 상세 템플릿 생성
 */
function generateBugTemplate(input: CreateBugInput): string {
  const hasDetailedFields =
    input.causeAnalysis ||
    input.solution ||
    input.impactScope ||
    input.stepsToReproduce;

  // 기존 간단한 형식 유지 (상세 필드가 없는 경우)
  if (!hasDetailedFields) {
    return input.description
      ? `# ${input.name}\n\n${input.description}`
      : `# ${input.name}`;
  }

  // 상세 템플릿 생성
  const sections: string[] = [`# ${input.name}`];

  sections.push('');
  sections.push('## 개요');
  sections.push(input.description || '버그 설명을 작성하세요.');

  sections.push('');
  sections.push('## 재현 단계');
  sections.push(input.stepsToReproduce || '1. \n2. \n3. ');

  sections.push('');
  sections.push('## 원인 분석');
  sections.push(input.causeAnalysis || '원인 분석 내용을 작성하세요.');

  sections.push('');
  sections.push('## 해결 방법');
  sections.push(input.solution || '해결 방법을 작성하세요.');

  sections.push('');
  sections.push('## 영향 범위');
  sections.push(input.impactScope || '영향 받는 기능/컴포넌트를 나열하세요.');

  return sections.join('\n');
}

export async function createBug(
  arborRoot: string,
  input: CreateBugInput
): Promise<CreateBugResult> {
  // Bugs only allowed under feature, config, infra, test
  const allowedTypes: TargetType[] = ['feature', 'config', 'infra', 'test'];
  if (!allowedTypes.includes(input.parentType)) {
    return {
      success: false,
      path: '',
      bug: {} as CreateBugResult['bug'],
      error: {
        code: 'INVALID_PARENT',
        message: `Bugs can only be created under ${allowedTypes.join(', ')}`,
      },
    };
  }

  const basePath = toArborPath(input.parentType, input.parentPath);
  const bugsDir = path.join(arborRoot, basePath, 'bugs');
  const today = getDateString();
  const id = generateBugId();

  const parentMeta = path.join(arborRoot, basePath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: '',
      bug: {} as CreateBugResult['bug'],
      error: {
        code: 'INVALID_PARENT',
        message: `Parent node does not exist at ${input.parentPath}`,
      },
    };
  }

  await fs.ensureDir(bugsDir);

  const bugPath = path.join(bugsDir, `${id}.md`);
  const frontmatter: Record<string, string> = {
    id,
    name: input.name,
    severity: input.severity,
    status: input.status || 'open',
    created: today,
    updated: today,
  };

  if (input.relatedTask) {
    frontmatter.related_task = input.relatedTask;
  }

  const content = generateBugTemplate(input);

  await writeMarkdownFile(bugPath, frontmatter, content);

  return {
    success: true,
    path: path.relative(arborRoot, bugPath),
    bug: {
      id,
      name: input.name,
      severity: input.severity,
      status: input.status || 'open',
      created: today,
    },
  };
}
