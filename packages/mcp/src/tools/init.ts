import fs from 'fs-extra';
import path from 'path';
import {
  slugify,
  getDateString,
  writeYamlFile,
} from '@arbor-plan/core';
import type { Manifest, Mappings, PendingContext } from '@arbor-plan/core';

export interface InitInput {
  projectName: string;
  projectDescription?: string;
}

export interface InitResult {
  success: boolean;
  path: string;
  message: string;
}

export async function init(
  cwd: string,
  input: InitInput
): Promise<InitResult> {
  const arborRoot = path.join(cwd, '.arbor');

  // Check if already initialized
  if (await fs.pathExists(arborRoot)) {
    return {
      success: false,
      path: arborRoot,
      message: 'Arbor is already initialized in this project.',
    };
  }

  const projectId = slugify(input.projectName);
  const today = getDateString();

  // Create directory structure
  await fs.ensureDir(arborRoot);
  await fs.ensureDir(path.join(arborRoot, 'features'));
  await fs.ensureDir(path.join(arborRoot, 'config'));
  await fs.ensureDir(path.join(arborRoot, 'infra'));

  // Create manifest.yaml
  const manifest: Manifest = {
    version: 1,
    project: {
      id: projectId,
      name: input.projectName,
      description: input.projectDescription,
      created: today,
      updated: today,
    },
  };
  await writeYamlFile(path.join(arborRoot, 'manifest.yaml'), manifest);

  // Create mappings.yaml
  const mappings: Mappings = {
    version: 1,
    project_id: projectId,
    linked: [],
    unlinked: [],
  };
  await writeYamlFile(path.join(arborRoot, 'mappings.yaml'), mappings);

  // Create pending_context.yaml
  const pendingContext: PendingContext = {
    pending: [],
  };
  await writeYamlFile(path.join(arborRoot, 'pending_context.yaml'), pendingContext);

  // Update CLAUDE.md
  await updateClaudeMd(cwd);

  return {
    success: true,
    path: arborRoot,
    message: 'Arbor initialized successfully.',
  };
}

async function updateClaudeMd(cwd: string): Promise<void> {
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const arborSection = `
## Arbor Integration

### Plan 생성 규칙
Plan을 생성할 때는 반드시 먼저 대상을 지정하세요:

**예시:**
- "auth/social-login 기능에 대한 plan을 만들어줘"
- "ci-cd 인프라 plan을 작성해줘"
- "social-login의 테스트 plan을 만들어줘"

Claude가 자동으로 context를 등록한 후 Plan Mode를 시작합니다.
생성된 plan은 자동으로 해당 위치에 복사됩니다.

### 지원 대상
- feature: 기능 (예: auth/social-login)
- config: 설정 (예: env-setup)
- infra: 인프라 (예: ci-cd)
- refactor: 리팩토링 (feature 하위)
- test: 테스트 (feature 하위)
- security: 보안 (feature 하위)
- performance: 성능 (feature 하위)
`;

  if (await fs.pathExists(claudeMdPath)) {
    const existing = await fs.readFile(claudeMdPath, 'utf-8');
    if (!existing.includes('## Arbor Integration')) {
      await fs.appendFile(claudeMdPath, arborSection);
    }
  } else {
    await fs.writeFile(claudeMdPath, `# Project Guide\n${arborSection}`);
  }
}
