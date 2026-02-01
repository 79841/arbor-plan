# Arbor - Architecture Summary

> 빠른 참조용 아키텍처 요약. 상세 내용은 `DESIGN.md` 참조.

## 시스템 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐         ┌──────────────────────────────┐     │
│  │ Claude Code  │         │ ~/.claude/plans/xyz.md       │     │
│  │ Plan Mode    │────────▶│ (원본, 30일 후 삭제됨)        │     │
│  └──────────────┘         └──────────────────────────────┘     │
│         │                              │                        │
│         │ MCP Tool                     │ File Watcher           │
│         │ (set_pending_context)        │ (chokidar)             │
│         ▼                              ▼                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    @arbor-plan/mcp                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Tools     │  │  Watcher    │  │   AutoLinker    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Copy + Update mappings.yaml      │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       .arbor/                            │   │
│  │  manifest.yaml | mappings.yaml | features/ | config/    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ WebSocket                        │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 @arbor-plan/visualizer                   │   │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐   │   │
│  │  │  Tree View          │  │  Detail Panel           │   │   │
│  │  │  (@xyflow/react)    │  │  (react-markdown)       │   │   │
│  │  └─────────────────────┘  └─────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 패키지 의존성

```
@arbor-plan/cli
    ├── @arbor-plan/visualizer
    │       └── @arbor-plan/core
    └── @arbor-plan/core

@arbor-plan/mcp
    └── @arbor-plan/core
```

## 패키지별 역할

| 패키지 | 역할 | 주요 export |
|--------|------|-------------|
| **core** | 타입, 스키마, 파서 | TreeParser, schemas, types |
| **mcp** | MCP Server | tools, ClaudePlansWatcher, AutoLinker |
| **visualizer** | 웹 UI + 서버 | createVisualizerServer, components |
| **cli** | CLI 도구 | arbor 명령어 |

## 핵심 클래스/함수

### @arbor-plan/core

```typescript
// 트리 파싱
class TreeParser {
  constructor(arborRoot: string)
  parse(): Promise<TreeData>
  getAllTasks(tree: TreeData): Task[]
}

// 스키마 (Zod)
ManifestSchema, MappingsSchema, MetaSchema, TaskSchema, BugSchema
```

### @arbor-plan/mcp

```typescript
// 파일 감시
class ClaudePlansWatcher extends EventEmitter {
  start(): Promise<void>
  stop(): Promise<void>
  // Events: 'plan-detected', 'plan-changed', 'plan-deleted'
}

// 자동 연결
class AutoLinker {
  constructor(config: { arborRoot: string, pendingContextTTL: number })
  start(onUpdate?: callback): Promise<void>
  stop(): Promise<void>
}
```

### @arbor-plan/visualizer

```typescript
// 서버 생성
function createVisualizerServer(config: {
  port: number,
  arborRoot: string
}): { start(), stop() }
```

## 데이터 흐름

### 자동 연결 시퀀스

```
1. User: "auth/social-login plan 만들어줘"
           │
           ▼
2. Claude: arbor_set_pending_context({
             targetType: "feature",
             targetPath: "auth/social-login"
           })
           │
           ▼
3. MCP: pending_context.yaml 기록 (TTL 5분)
           │
           ▼
4. Claude: Plan Mode 진입 → ~/.claude/plans/abc.md 생성
           │
           ▼
5. Watcher: 새 파일 감지
           │
           ▼
6. AutoLinker: pending_context 확인 → 매칭
           │
           ├─▶ 원본을 .arbor/features/auth/social-login/plans/로 복사
           ├─▶ mappings.yaml 업데이트 (linked에 추가)
           └─▶ pending_context에서 제거
           │
           ▼
7. WebSocket: 'plan-linked' 이벤트 브로드캐스트
           │
           ▼
8. Visualizer: 트리 새로고침
```

### Fallback (Pending Context 없음)

```
Watcher 감지 → pending_context 없음 → mappings.yaml의 unlinked에 추가
                                              │
                                              ▼
                                    Visualizer에서 수동 연결
```

## 노드 계층 구조

```
project
├── feature (재귀 가능)
│   ├── feature (하위 기능)
│   ├── plan
│   ├── task
│   ├── bug
│   ├── doc
│   ├── refactor/ (plan, task, bug, doc)
│   ├── test/ (plan, task, bug, doc)
│   ├── security/ (plan, task, bug, doc)
│   └── performance/ (plan, task, bug, doc)
│
├── config (재귀 가능)
│   └── plan, task, bug, doc
│
└── infra (재귀 가능)
    └── plan, task, bug, doc
```

## 파일 시스템 구조

```
.arbor/
├── manifest.yaml              # 프로젝트 메타
├── mappings.yaml              # Plan 맵핑
├── pending_context.yaml       # 자동 연결 대기
│
├── features/
│   └── {feature-path}/
│       ├── _meta.yaml         # Feature 메타
│       ├── plans/             # Plan 파일들
│       ├── tasks/             # Task 파일들
│       ├── bugs/              # Bug 파일들
│       ├── docs/              # Doc 파일들
│       └── test/              # 하위 test 노드
│           ├── _meta.yaml
│           └── plans/
│
├── config/
│   └── {config-path}/
│       ├── _meta.yaml
│       └── plans/
│
└── infra/
    └── {infra-path}/
        ├── _meta.yaml
        └── plans/
```

## WebSocket 메시지

| Type | Direction | Payload | 설명 |
|------|-----------|---------|------|
| `get-tree` | Client → Server | - | 트리 요청 |
| `tree-update` | Server → Client | TreeData | 전체 트리 |
| `plan-linked` | Server → Client | LinkedPlan | Plan 연결됨 |
| `plan-unlinked` | Server → Client | { source } | Unlinked 추가됨 |
| `node-changed` | Server → Client | Node | 노드 변경됨 |

## CLI 명령어

```bash
arbor serve [--port 3000]    # Visualizer 실행
arbor tree [--status X]      # 트리 출력
arbor status                 # Task 상태 요약
arbor unlinked               # 미연결 Plan 목록
```

## MCP 설정

```json
// .claude/mcp.json
{
  "mcpServers": {
    "arbor": {
      "command": "npx",
      "args": ["@arbor-plan/mcp"],
      "env": {
        "ARBOR_ROOT": ".arbor"
      }
    }
  }
}
```
