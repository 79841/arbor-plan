import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
  toPhysicalFeaturePath,
  type Meta,
  type NodeType,
} from '@arbor-plan/core';

export interface CreateSubnodeInput {
  featurePath: string;
  name: string;
  description?: string;
}

export interface CreateRefactorInput extends CreateSubnodeInput {
  /** 리팩토링 대상 코드/파일 */
  targetCode?: string;
  /** 리팩토링 이유 */
  reason?: string;
  /** 접근 방식 */
  approach?: string;
  /** 기대 결과 */
  expectedOutcome?: string;
  /** 위험 요소 */
  risks?: string;
}

export interface CreateSubnodeResult {
  success: boolean;
  path: string;
  meta: Meta;
  error?: { code: string; message: string };
}

/**
 * Refactor 상세 문서 템플릿 생성
 */
function generateRefactorDoc(input: CreateRefactorInput): string {
  const sections: string[] = [`# ${input.name} 리팩토링 문서`];

  sections.push('');
  sections.push('## 개요');
  sections.push(input.description || '리팩토링 개요를 작성하세요.');

  sections.push('');
  sections.push('## 리팩토링 대상');
  sections.push(input.targetCode || '대상 코드/파일 경로를 작성하세요.');

  sections.push('');
  sections.push('## 리팩토링 이유');
  sections.push(input.reason || '리팩토링이 필요한 이유를 작성하세요.');

  sections.push('');
  sections.push('## 접근 방식');
  sections.push(input.approach || '리팩토링 접근 방식을 작성하세요.');

  sections.push('');
  sections.push('## 기대 결과');
  sections.push(input.expectedOutcome || '리팩토링 후 기대되는 결과를 작성하세요.');

  sections.push('');
  sections.push('## 위험 요소 및 대응 방안');
  sections.push(input.risks || '잠재적 위험 요소와 대응 방안을 작성하세요.');

  sections.push('');
  sections.push('## 작업 체크리스트');
  sections.push('- [ ] 리팩토링 대상 코드 분석');
  sections.push('- [ ] 테스트 케이스 확인/추가');
  sections.push('- [ ] 리팩토링 구현');
  sections.push('- [ ] 테스트 실행 및 검증');
  sections.push('- [ ] 코드 리뷰');

  return sections.join('\n');
}

async function createSubnode(
  arborRoot: string,
  nodeType: NodeType,
  input: CreateSubnodeInput | CreateRefactorInput
): Promise<CreateSubnodeResult> {
  // Convert logical path to physical path
  const physicalPath = toPhysicalFeaturePath(input.featurePath);
  const parentPath = path.join(arborRoot, 'features', physicalPath);
  const subnodePath = path.join(parentPath, nodeType);
  const today = getDateString();
  const id = slugify(input.name);

  // Check parent feature exists
  const parentMeta = path.join(parentPath, '_meta.yaml');
  if (!(await fs.pathExists(parentMeta))) {
    return {
      success: false,
      path: subnodePath,
      meta: {} as Meta,
      error: {
        code: 'INVALID_PARENT',
        message: `Parent feature does not exist at ${input.featurePath}`,
      },
    };
  }

  if (await fs.pathExists(subnodePath)) {
    return {
      success: false,
      path: subnodePath,
      meta: {} as Meta,
      error: {
        code: 'ALREADY_EXISTS',
        message: `${nodeType} already exists under ${input.featurePath}`,
      },
    };
  }

  await fs.ensureDir(subnodePath);
  await fs.ensureDir(path.join(subnodePath, 'plans'));
  await fs.ensureDir(path.join(subnodePath, 'tasks'));
  await fs.ensureDir(path.join(subnodePath, 'bugs'));
  await fs.ensureDir(path.join(subnodePath, 'docs'));

  const meta: Meta = {
    type: nodeType,
    id,
    name: input.name,
    description: input.description,
    status: 'planned',
    created: today,
    updated: today,
  };

  await writeYamlFile(path.join(subnodePath, '_meta.yaml'), meta);

  // Refactor 타입인 경우 상세 문서 자동 생성
  if (nodeType === 'refactor') {
    const refactorInput = input as CreateRefactorInput;
    const hasDetailedFields =
      refactorInput.targetCode ||
      refactorInput.reason ||
      refactorInput.approach ||
      refactorInput.expectedOutcome ||
      refactorInput.risks;

    if (hasDetailedFields) {
      const docContent = generateRefactorDoc(refactorInput);
      const docPath = path.join(subnodePath, 'docs', 'refactor-plan.md');
      await fs.writeFile(docPath, docContent, 'utf-8');
    }
  }

  return {
    success: true,
    path: `features/${input.featurePath}/${nodeType}`, // Return logical path
    meta,
  };
}

export async function createRefactor(
  arborRoot: string,
  input: CreateRefactorInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'refactor', input);
}

export async function createTest(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'test', input);
}

export async function createSecurity(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'security', input);
}

export async function createPerformance(
  arborRoot: string,
  input: CreateSubnodeInput
): Promise<CreateSubnodeResult> {
  return createSubnode(arborRoot, 'performance', input);
}
