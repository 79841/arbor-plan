# Arbor

Claude Code Plan 파일을 트리 구조로 시각화하는 도구

## 프로젝트 정보

- **npm Scope:** @arbor-plan
- **Monorepo:** pnpm workspace
- **패키지:** core, mcp, visualizer, cli

## 문서

상세 내용은 .claude/docs/ 참조:

- `.claude/docs/PRD.md` - 제품 요구사항, 사용자 스토리
- `.claude/docs/DESIGN.md` - 기술 설계, 구현 상세
- `.claude/docs/ARCHITECTURE.md` - 아키텍처 요약 (빠른 참조)
- `.claude/docs/API.md` - MCP Tools API 레퍼런스

## 패키지 구조

```
packages/
├── core/        # @arbor-plan/core - 타입, 파서, 스키마 (Zod)
├── mcp/         # @arbor-plan/mcp - MCP Server, Watcher, AutoLinker
├── visualizer/  # @arbor-plan/visualizer - React + Express + WebSocket
└── cli/         # @arbor-plan/cli - CLI 도구 (serve, tree, status)
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x |
| Package Manager | pnpm 9+ |
| Validation | Zod |
| Tree View | @xyflow/react |
| Icons | lucide-react |
| File Watch | chokidar |
| YAML | yaml |

## 코딩 규칙

1. 모든 스키마는 Zod로 정의 (`packages/core/src/schema/`)
2. 파일 경로 처리는 `@arbor-plan/core`의 유틸 함수 사용
3. ID 생성은 `nanoid` 사용
4. YAML 파싱은 `yaml` 패키지, Frontmatter는 `gray-matter` 사용
5. 아이콘은 `lucide-react`만 사용

## 데이터 디렉토리

```
.arbor/
├── manifest.yaml          # 프로젝트 메타
├── mappings.yaml          # Plan 맵핑 (원본 ↔ 복사본)
├── pending_context.yaml   # 자동 연결 대기 (TTL 5분)
├── features/              # Feature 노드들
├── config/                # Config 노드들
└── infra/                 # Infra 노드들
```

## 노드 타입

**구조 노드 (컨테이너):**
- project, feature, config, infra
- refactor, test, security, performance (feature 하위)

**작업 노드 (리프):**
- plan (Claude Code Plan Mode 생성, 원본 형식 유지)
- task (상태: pending, in_progress, completed, blocked)
- bug (심각도: low, medium, high, critical)
- doc (타입: architecture, api, guide, reference, decision)

## MCP Tools 네이밍

모든 Tool은 `arbor_` 접두사 사용:

- `arbor_init` - 초기화
- `arbor_create_feature` - Feature 생성
- `arbor_create_task` - Task 생성
- `arbor_set_pending_context` - Plan Mode 연결 준비
- `arbor_link_plan` - 수동 Plan 연결

전체 목록: `.claude/docs/API.md` 참조

## 자동 연결 흐름

```
arbor_set_pending_context() → Plan Mode → Watcher 감지 → 자동 연결
```

1. `arbor_set_pending_context` 호출 시 pending_context.yaml에 기록
2. Plan Mode에서 plan 생성 (~/.claude/plans/)
3. Watcher가 감지 → pending context 확인 → 자동 연결
4. 원본을 .arbor/로 복사, mappings.yaml 업데이트

## 작업 시 참고사항

- 새 기능 구현 전: `.claude/docs/PRD.md`의 기능 요구사항 확인
- API 구현 시: `.claude/docs/API.md`의 스키마 준수
- 구조 변경 시: `.claude/docs/DESIGN.md` 및 `.claude/docs/ARCHITECTURE.md` 업데이트

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
