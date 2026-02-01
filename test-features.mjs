/**
 * 통합 테스트: Feature, Bug, Refactor, Plan, Task 노드 생성 테스트
 */
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// fs-extra 호환 헬퍼 함수
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 빌드된 패키지에서 직접 import
const mcp = await import('./packages/mcp/dist/index.js');
const core = await import('./packages/core/dist/index.js');

const arborRoot = path.join(__dirname, '.arbor');

console.log('='.repeat(60));
console.log('통합 테스트: Arbor 자동화 기능');
console.log('='.repeat(60));
console.log();

// 1. Feature 노드 생성 테스트
console.log('1. Feature 노드 생성 테스트');
console.log('-'.repeat(40));

const featureResult = await mcp.createFeature(arborRoot, {
  path: 'test-auto',
  name: 'Test Auto Feature',
  description: '자동화 기능 테스트를 위한 feature',
});

console.log(`Feature 생성 결과: ${featureResult.success ? '성공' : '실패'}`);
console.log(`  - 경로: ${featureResult.path}`);
console.log(`  - ID: ${featureResult.meta.id}`);
console.log();

// 2. 하위 Feature 생성 테스트
console.log('2. 하위 Feature 생성 테스트');
console.log('-'.repeat(40));

const subFeatureResult = await mcp.createFeature(arborRoot, {
  path: 'test-auto/sub-feature',
  name: 'Sub Feature',
  description: '하위 feature 테스트',
});

console.log(`하위 Feature 생성 결과: ${subFeatureResult.success ? '성공' : '실패'}`);
console.log(`  - 경로: ${subFeatureResult.path}`);
console.log();

// 3. Bug 노드 생성 테스트 (상세 템플릿)
console.log('3. Bug 노드 생성 테스트 (상세 템플릿)');
console.log('-'.repeat(40));

const bugResult = await mcp.createBug(arborRoot, {
  parentType: 'feature',
  parentPath: 'test-auto',
  name: 'Memory Leak Bug',
  description: '테스트 버그 설명',
  severity: 'high',
  causeAnalysis: 'useEffect에서 cleanup 함수가 없어서 발생',
  solution: 'useEffect return문에 cleanup 함수 추가',
  impactScope: 'Dashboard, UserList 컴포넌트',
  stepsToReproduce: '1. Dashboard 페이지 열기\n2. 10회 반복 새로고침\n3. 메모리 사용량 확인',
});

console.log(`Bug 생성 결과: ${bugResult.success ? '성공' : '실패'}`);
console.log(`  - 경로: ${bugResult.path}`);
console.log(`  - ID: ${bugResult.bug.id}`);
console.log(`  - 심각도: ${bugResult.bug.severity}`);

// Bug 파일 내용 확인
const bugPath = path.join(arborRoot, bugResult.path);
const bugContent = await fs.readFile(bugPath, 'utf-8');
console.log(`  - 상세 템플릿 포함: ${bugContent.includes('## 원인 분석') ? '예' : '아니오'}`);
console.log();

// 4. Refactor 노드 생성 테스트 (상세 문서)
console.log('4. Refactor 노드 생성 테스트 (상세 문서)');
console.log('-'.repeat(40));

const refactorResult = await mcp.createRefactor(arborRoot, {
  featurePath: 'test-auto',
  name: 'Code Cleanup',
  description: '레거시 코드 정리',
  targetCode: 'src/components/Dashboard.tsx',
  reason: '중복 코드 제거 및 유지보수성 향상',
  approach: '공통 로직을 hooks로 추출',
  expectedOutcome: '코드 라인 수 30% 감소',
  risks: '기존 기능 영향 가능성',
});

console.log(`Refactor 생성 결과: ${refactorResult.success ? '성공' : '실패'}`);
console.log(`  - 경로: ${refactorResult.path}`);

// Refactor 문서 확인
const refactorDocPath = path.join(arborRoot, 'features', 'test-auto', 'refactor', 'docs', 'refactor-plan.md');
const refactorDocExists = await pathExists(refactorDocPath);
console.log(`  - 상세 문서 생성: ${refactorDocExists ? '예' : '아니오'}`);

if (refactorDocExists) {
  const refactorDocContent = await fs.readFile(refactorDocPath, 'utf-8');
  console.log(`  - 리팩토링 대상 포함: ${refactorDocContent.includes('src/components/Dashboard.tsx') ? '예' : '아니오'}`);
}
console.log();

// 5. Plan 생성 테스트 (Task 자동 추출)
console.log('5. Plan 생성 테스트 (Task 자동 추출)');
console.log('-'.repeat(40));

const planContent = `# 테스트 Plan

## 개요
테스트를 위한 Plan입니다.

## 작업 목록
- [ ] Task 1: API 설계
- [x] Task 2: 데이터베이스 스키마 작성
- [ ] Task 3: 프론트엔드 구현

## 추가 작업
1. 문서화 작성
2. 테스트 코드 추가
`;

const planResult = await mcp.createPlan(arborRoot, {
  parentType: 'feature',
  parentPath: 'test-auto',
  name: 'Test Plan with Tasks',
  content: planContent,
  autoExtractTasks: true,
});

console.log(`Plan 생성 결과: ${planResult.success ? '성공' : '실패'}`);
console.log(`  - 경로: ${planResult.path}`);
console.log(`  - ID: ${planResult.plan.id}`);

if (planResult.extractedTasks) {
  console.log(`  - 추출된 Task 수: ${planResult.extractedTasks.created}`);
  for (const task of planResult.extractedTasks.tasks) {
    console.log(`    - [${task.status}] ${task.name}`);
  }
}
console.log();

// 6. TreeParser로 전체 구조 확인
console.log('6. TreeParser로 전체 구조 확인');
console.log('-'.repeat(40));

const treeParser = new core.TreeParser(arborRoot);
const treeData = await treeParser.parse();

function printNode(node, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}[${node.type}] ${node.name} (${node.path || 'root'})`);

  if (node.plans && node.plans.length > 0) {
    for (const plan of node.plans) {
      console.log(`${prefix}  └─ [plan] ${plan.name}`);
      if (plan.taskStats) {
        console.log(`${prefix}      Tasks: ${plan.taskStats.total} total, ${plan.taskStats.completed} completed`);
      }
    }
  }

  if (node.tasks && node.tasks.length > 0) {
    for (const task of node.tasks) {
      console.log(`${prefix}  └─ [task] ${task.name} (${task.status})`);
    }
  }

  if (node.bugs && node.bugs.length > 0) {
    for (const bug of node.bugs) {
      console.log(`${prefix}  └─ [bug] ${bug.name} (${bug.severity})`);
    }
  }

  if (node.children) {
    for (const child of node.children) {
      printNode(child, indent + 1);
    }
  }
}

// test-auto feature만 출력
const testAutoFeature = treeData.root.children?.find(c => c.id === 'test-auto');
if (testAutoFeature) {
  console.log();
  console.log('생성된 test-auto Feature 구조:');
  printNode(testAutoFeature);
}

console.log();
console.log('='.repeat(60));
console.log('테스트 완료!');
console.log('='.repeat(60));

// 7. 정리: 테스트 feature 삭제
console.log();
console.log('테스트 데이터 정리...');
const testAutoPath = path.join(arborRoot, 'features', 'test-auto');
await fs.rm(testAutoPath, { recursive: true });
console.log('test-auto feature 삭제 완료');
