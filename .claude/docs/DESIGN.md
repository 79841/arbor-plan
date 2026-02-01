# Arbor - Technical Design Document

> Claude Code Plan 파일을 트리 구조로 시각화하는 도구

**Project:** Arbor  
**npm Scope:** @arbor-plan  
**Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Draft  
**Author:** Dylan

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Claude Code                                  │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐     │
│  │   Plan Mode     │───▶│  ~/.claude/plans/xyz.md             │     │
│  └─────────────────┘    └─────────────────────────────────────┘     │
│          │                              │                            │
│          │ MCP Tool                     │ File Watcher               │
│          ▼                              ▼                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      MCP Server                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │ Tools       │  │ Watcher     │  │ Auto Linker         │  │    │
│  │  │ (create,    │  │ (~/.claude/ │  │ (pending context +  │  │    │
│  │  │  link, etc) │  │  plans/)    │  │  file copy)         │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              │ File System                           │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                       .arbor/                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ manifest.yaml│  │ mappings.yaml│  │ features/        │   │    │
│  │  │              │  │ (원본↔복사본) │  │ config/          │   │    │
│  │  │              │  │              │  │ infra/           │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              │ WebSocket                             │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Visualizer                               │    │
│  │  ┌─────────────────────────────┐  ┌─────────────────────┐   │    │
│  │  │      Tree View              │  │   Detail Panel      │   │    │
│  │  │      (React Flow)           │  │   (Markdown)        │   │    │
│  │  └─────────────────────────────┘  └─────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 패키지 구조

```
arbor/
├── packages/
│   ├── core/                     # @arbor-plan/core
│   │   ├── src/
│   │   │   ├── types/            # TypeScript 타입 정의
│   │   │   │   ├── node.ts       # 노드 타입
│   │   │   │   ├── schema.ts     # 스키마 타입
│   │   │   │   └── index.ts
│   │   │   ├── parser/           # 파일 → 트리 파싱
│   │   │   │   ├── tree-parser.ts
│   │   │   │   ├── yaml-parser.ts
│   │   │   │   └── markdown-parser.ts
│   │   │   ├── schema/           # Zod 스키마 검증
│   │   │   │   ├── manifest.ts
│   │   │   │   ├── mappings.ts
│   │   │   │   ├── meta.ts
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       ├── path.ts
│   │   │       ├── id.ts
│   │   │       └── date.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp/                      # @arbor-plan/mcp
│   │   ├── src/
│   │   │   ├── tools/            # MCP Tools
│   │   │   │   ├── init.ts
│   │   │   │   ├── create-feature.ts
│   │   │   │   ├── create-task.ts
│   │   │   │   ├── set-pending-context.ts
│   │   │   │   ├── link-plan.ts
│   │   │   │   └── index.ts
│   │   │   ├── watcher/          # File Watcher
│   │   │   │   ├── claude-plans-watcher.ts
│   │   │   │   └── arbor-watcher.ts
│   │   │   ├── linker/           # Auto Linker
│   │   │   │   ├── auto-linker.ts
│   │   │   │   └── pending-context.ts
│   │   │   ├── server.ts         # MCP Server 진입점
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── visualizer/               # @arbor-plan/visualizer
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── TreeView/
│   │   │   │   │   ├── TreeCanvas.tsx
│   │   │   │   │   ├── TreeNode.tsx
│   │   │   │   │   ├── TreeEdge.tsx
│   │   │   │   │   └── NodeIcon.tsx
│   │   │   │   ├── DetailPanel/
│   │   │   │   │   ├── DetailPanel.tsx
│   │   │   │   │   ├── PlanDetail.tsx
│   │   │   │   │   ├── TaskDetail.tsx
│   │   │   │   │   └── MarkdownViewer.tsx
│   │   │   │   ├── StatusFilter/
│   │   │   │   │   └── StatusFilter.tsx
│   │   │   │   ├── UnlinkedPlans/
│   │   │   │   │   ├── UnlinkedList.tsx
│   │   │   │   │   └── LinkDialog.tsx
│   │   │   │   └── common/
│   │   │   │       ├── StatusBadge.tsx
│   │   │   │       └── SeverityBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTreeData.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useSelectedNode.ts
│   │   │   ├── server/
│   │   │   │   ├── index.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── websocket.ts
│   │   │   ├── lib/
│   │   │   │   ├── tree-layout.ts
│   │   │   │   └── colors.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── cli/                      # @arbor-plan/cli
│       ├── src/
│       │   ├── commands/
│       │   │   ├── serve.ts
│       │   │   ├── tree.ts
│       │   │   ├── status.ts
│       │   │   └── unlinked.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                  # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 2. 데이터 스키마

### 2.1 디렉토리 구조

```
.arbor/
├── manifest.yaml                    # 프로젝트 메타 정보
├── mappings.yaml                    # plan 파일 맵핑 (원본 ↔ 복사본)
├── pending_context.yaml             # 자동 연결 대기 context
│
├── features/
│   └── auth/
│       ├── _meta.yaml
│       └── social-login/
│           ├── _meta.yaml
│           ├── plans/
│           │   └── google-oauth.md      # 복사된 plan (원본 형식 유지)
│           ├── tasks/
│           │   └── task-001.md
│           ├── bugs/
│           │   └── bug-token-expire.md
│           ├── docs/
│           │   └── oauth-flow.md
│           ├── refactor/
│           │   ├── _meta.yaml
│           │   └── plans/
│           ├── test/
│           │   ├── _meta.yaml
│           │   ├── plans/
│           │   └── bugs/
│           ├── security/
│           │   └── _meta.yaml
│           └── performance/
│               └── _meta.yaml
│
├── config/
│   ├── _meta.yaml
│   └── env-setup/
│       ├── _meta.yaml
│       └── plans/
│
└── infra/
    ├── _meta.yaml
    └── ci-cd/
        ├── _meta.yaml
        └── plans/
```

### 2.2 manifest.yaml

```yaml
# .arbor/manifest.yaml
version: 1
project:
  id: travel-docent-app          # 자동 생성 또는 사용자 지정
  name: "Travel Docent App"
  description: "위치 기반 여행 오디오 가이드 앱"
  created: 2025-01-18
  updated: 2025-01-27
```

**Zod Schema:**

```typescript
// packages/core/src/schema/manifest.ts
import { z } from 'zod';

export const ManifestSchema = z.object({
  version: z.literal(1),
  project: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    created: z.string().date(),
    updated: z.string().date(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;
```

### 2.3 mappings.yaml

```yaml
# .arbor/mappings.yaml
version: 1
project_id: travel-docent-app

linked:
  - id: plan-001
    source: ~/.claude/plans/abc123.md              # 원본 경로
    local: features/auth/social-login/plans/google-oauth.md  # 복사본
    target_type: feature
    target_path: auth/social-login
    name: "Google OAuth 구현"
    linked_at: 2025-01-18T10:30:00Z
    source_exists: true                            # 원본 존재 여부

  - id: plan-002
    source: ~/.claude/plans/def456.md
    local: infra/ci-cd/plans/github-actions.md
    target_type: infra
    target_path: ci-cd
    name: "GitHub Actions 설정"
    linked_at: 2025-01-18T11:00:00Z
    source_exists: false                           # 원본 삭제됨

unlinked:
  - id: plan-003
    source: ~/.claude/plans/ghi789.md
    detected_at: 2025-01-18T14:00:00Z
    preview: "TTS 서비스 비교 분석..."              # 첫 100자
```

**Zod Schema:**

```typescript
// packages/core/src/schema/mappings.ts
import { z } from 'zod';

const LinkedPlanSchema = z.object({
  id: z.string(),
  source: z.string(),
  local: z.string(),
  target_type: z.enum(['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance']),
  target_path: z.string(),
  name: z.string(),
  linked_at: z.string().datetime(),
  source_exists: z.boolean(),
});

const UnlinkedPlanSchema = z.object({
  id: z.string(),
  source: z.string(),
  detected_at: z.string().datetime(),
  preview: z.string().max(100),
});

export const MappingsSchema = z.object({
  version: z.literal(1),
  project_id: z.string(),
  linked: z.array(LinkedPlanSchema).default([]),
  unlinked: z.array(UnlinkedPlanSchema).default([]),
});

export type Mappings = z.infer<typeof MappingsSchema>;
export type LinkedPlan = z.infer<typeof LinkedPlanSchema>;
export type UnlinkedPlan = z.infer<typeof UnlinkedPlanSchema>;
```

### 2.4 pending_context.yaml

```yaml
# .arbor/pending_context.yaml
pending:
  - id: ctx-001
    target_type: feature
    target_path: auth/social-login
    name: "Google OAuth 구현"
    created_at: 2025-01-18T10:30:00Z
    expires_at: 2025-01-18T10:35:00Z  # 5분 후 만료
```

**Zod Schema:**

```typescript
// packages/core/src/schema/pending-context.ts
import { z } from 'zod';

const PendingItemSchema = z.object({
  id: z.string(),
  target_type: z.enum(['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance']),
  target_path: z.string(),
  name: z.string().optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});

export const PendingContextSchema = z.object({
  pending: z.array(PendingItemSchema).default([]),
});

export type PendingContext = z.infer<typeof PendingContextSchema>;
export type PendingItem = z.infer<typeof PendingItemSchema>;
```

### 2.5 _meta.yaml (구조 노드)

```yaml
# 공통 메타 파일
type: feature  # feature | config | infra | refactor | test | security | performance
id: social-login
name: "소셜 로그인"
description: "Google, Apple 소셜 로그인 기능"
status: in_progress  # planned | in_progress | completed | on_hold
created: 2025-01-18
updated: 2025-01-27
```

**Zod Schema:**

```typescript
// packages/core/src/schema/meta.ts
import { z } from 'zod';

export const NodeType = z.enum([
  'feature', 'config', 'infra', 
  'refactor', 'test', 'security', 'performance'
]);

export const NodeStatus = z.enum([
  'planned', 'in_progress', 'completed', 'on_hold'
]);

export const MetaSchema = z.object({
  type: NodeType,
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: NodeStatus.default('planned'),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Meta = z.infer<typeof MetaSchema>;
```

### 2.6 Task 파일

```yaml
# tasks/task-001.md (frontmatter)
---
id: task-001
name: "토큰 갱신 로직 구현"
status: pending      # pending | in_progress | completed | blocked
plan_ref: plan-001   # 연결된 plan (mappings.yaml의 id)
created: 2025-01-18
updated: 2025-01-27
---
```

**Zod Schema:**

```typescript
// packages/core/src/schema/task.ts
import { z } from 'zod';

export const TaskStatus = z.enum([
  'pending', 'in_progress', 'completed', 'blocked'
]);

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  status: TaskStatus.default('pending'),
  plan_ref: z.string().optional(),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Task = z.infer<typeof TaskSchema>;
```

### 2.7 Bug 파일

```yaml
# bugs/bug-001.md (frontmatter)
---
id: bug-001
name: "토큰 만료 시 앱 크래시"
severity: critical   # low | medium | high | critical
status: open         # open | in_progress | resolved | closed
related_task: task-001
created: 2025-01-18
updated: 2025-01-27
---
```

**Zod Schema:**

```typescript
// packages/core/src/schema/bug.ts
import { z } from 'zod';

export const BugSeverity = z.enum(['low', 'medium', 'high', 'critical']);
export const BugStatus = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const BugSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  severity: BugSeverity.default('medium'),
  status: BugStatus.default('open'),
  related_task: z.string().optional(),
  created: z.string().date(),
  updated: z.string().date(),
});

export type Bug = z.infer<typeof BugSchema>;
```

### 2.8 Doc 파일

```yaml
# docs/doc-001.md (frontmatter)
---
id: doc-001
name: "OAuth 인증 플로우"
type: architecture   # architecture | api | guide | reference | decision
created: 2025-01-18
updated: 2025-01-27
---
```

---

## 3. MCP Tools API

### 3.1 초기화

```typescript
// arbor_init
{
  name: "arbor_init",
  description: "프로젝트에 Arbor 구조 초기화",
  inputSchema: {
    type: "object",
    properties: {
      projectName: { type: "string", description: "프로젝트 이름" },
      projectDescription: { type: "string", description: "프로젝트 설명" }
    },
    required: ["projectName"]
  }
}

// Response
{
  success: true,
  path: "/path/to/project/.arbor",
  message: "Arbor initialized successfully"
}
```

### 3.2 구조 노드 생성

```typescript
// arbor_create_feature
{
  name: "arbor_create_feature",
  description: "Feature 노드 생성 (중첩 가능)",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "경로 (예: auth/social-login)" },
      name: { type: "string", description: "표시 이름" },
      description: { type: "string", description: "설명" },
      status: { 
        type: "string", 
        enum: ["planned", "in_progress", "completed", "on_hold"],
        default: "planned"
      }
    },
    required: ["path", "name"]
  }
}

// arbor_create_config
{
  name: "arbor_create_config",
  description: "Config 노드 생성",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      status: { type: "string" }
    },
    required: ["path", "name"]
  }
}

// arbor_create_infra
{
  name: "arbor_create_infra",
  description: "Infra 노드 생성",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      status: { type: "string" }
    },
    required: ["path", "name"]
  }
}

// arbor_create_refactor (feature 하위)
{
  name: "arbor_create_refactor",
  description: "Refactor 노드 생성 (feature 하위)",
  inputSchema: {
    type: "object",
    properties: {
      featurePath: { type: "string", description: "부모 feature 경로" },
      name: { type: "string" },
      description: { type: "string" }
    },
    required: ["featurePath", "name"]
  }
}

// arbor_create_test, arbor_create_security, arbor_create_performance 동일 구조
```

### 3.3 작업 노드 생성

```typescript
// arbor_create_task
{
  name: "arbor_create_task",
  description: "Task 생성",
  inputSchema: {
    type: "object",
    properties: {
      parentType: { 
        type: "string",
        enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"]
      },
      parentPath: { type: "string", description: "부모 노드 경로" },
      name: { type: "string" },
      description: { type: "string" },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "completed", "blocked"],
        default: "pending"
      },
      planRef: { type: "string", description: "연결할 plan ID" }
    },
    required: ["parentType", "parentPath", "name"]
  }
}

// arbor_create_bug
{
  name: "arbor_create_bug",
  description: "Bug 생성",
  inputSchema: {
    type: "object",
    properties: {
      parentType: {
        type: "string",
        enum: ["feature", "config", "infra", "test"]
      },
      parentPath: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
      },
      status: {
        type: "string",
        enum: ["open", "in_progress", "resolved", "closed"],
        default: "open"
      },
      relatedTask: { type: "string" }
    },
    required: ["parentType", "parentPath", "name", "severity"]
  }
}

// arbor_create_doc
{
  name: "arbor_create_doc",
  description: "Doc 생성",
  inputSchema: {
    type: "object",
    properties: {
      parentType: { type: "string" },
      parentPath: { type: "string" },
      name: { type: "string" },
      docType: {
        type: "string",
        enum: ["architecture", "api", "guide", "reference", "decision"]
      },
      content: { type: "string", description: "마크다운 본문" }
    },
    required: ["parentType", "parentPath", "name", "docType"]
  }
}
```

### 3.4 자동 연결 관련

```typescript
// arbor_set_pending_context
{
  name: "arbor_set_pending_context",
  description: "Plan Mode 진입 전 연결 대상 등록",
  inputSchema: {
    type: "object",
    properties: {
      targetType: {
        type: "string",
        enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"]
      },
      targetPath: { type: "string" },
      name: { type: "string", description: "Plan 이름 (선택)" }
    },
    required: ["targetType", "targetPath"]
  }
}

// Response
{
  success: true,
  contextId: "ctx-001",
  expiresAt: "2025-01-18T10:35:00Z",
  message: "Pending context registered. Enter Plan Mode now."
}

// arbor_list_unlinked
{
  name: "arbor_list_unlinked",
  description: "미연결 Plan 목록 조회",
  inputSchema: {
    type: "object",
    properties: {}
  }
}

// Response
{
  unlinked: [
    {
      id: "plan-003",
      source: "~/.claude/plans/ghi789.md",
      detected_at: "2025-01-18T14:00:00Z",
      preview: "TTS 서비스 비교..."
    }
  ]
}

// arbor_link_plan
{
  name: "arbor_link_plan",
  description: "Plan 수동 연결",
  inputSchema: {
    type: "object",
    properties: {
      planId: { type: "string", description: "unlinked plan ID" },
      targetType: { type: "string" },
      targetPath: { type: "string" },
      name: { type: "string" }
    },
    required: ["planId", "targetType", "targetPath"]
  }
}
```

### 3.5 조회

```typescript
// arbor_get_structure
{
  name: "arbor_get_structure",
  description: "트리 구조 조회",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "특정 경로만 조회 (선택)" },
      depth: { type: "number", description: "조회 깊이 (선택)" }
    }
  }
}

// arbor_list_tasks
{
  name: "arbor_list_tasks",
  description: "상태별 Task 목록 조회",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "in_progress", "completed", "blocked"]
      },
      path: { type: "string", description: "특정 경로 하위만" }
    }
  }
}
```

---

## 4. File Watcher 구현

### 4.1 Claude Plans Watcher

```typescript
// packages/mcp/src/watcher/claude-plans-watcher.ts

import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

interface WatcherEvents {
  'plan-detected': (filePath: string) => void;
  'plan-changed': (filePath: string) => void;
  'plan-deleted': (filePath: string) => void;
}

export class ClaudePlansWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private claudePlansPath: string;

  constructor() {
    super();
    this.claudePlansPath = path.join(os.homedir(), '.claude', 'plans');
  }

  async start(): Promise<void> {
    // Ensure directory exists
    await fs.ensureDir(this.claudePlansPath);

    this.watcher = chokidar.watch(this.claudePlansPath, {
      ignored: /(^|[\/\\])\../,  // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.emit('plan-detected', filePath))
      .on('change', (filePath) => this.emit('plan-changed', filePath))
      .on('unlink', (filePath) => this.emit('plan-deleted', filePath));
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
```

### 4.2 Auto Linker

```typescript
// packages/mcp/src/linker/auto-linker.ts

import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { nanoid } from 'nanoid';
import { ClaudePlansWatcher } from '../watcher/claude-plans-watcher';
import { 
  PendingContext, 
  Mappings, 
  LinkedPlan 
} from '@arbor-plan/core';

interface AutoLinkerConfig {
  arborRoot: string;
  pendingContextTTL: number;  // milliseconds
}

export class AutoLinker {
  private watcher: ClaudePlansWatcher;
  private config: AutoLinkerConfig;
  private onUpdate?: (event: string, data: any) => void;

  constructor(config: AutoLinkerConfig) {
    this.config = config;
    this.watcher = new ClaudePlansWatcher();
  }

  async start(onUpdate?: (event: string, data: any) => void): Promise<void> {
    this.onUpdate = onUpdate;
    
    this.watcher.on('plan-detected', (filePath) => this.handleNewPlan(filePath));
    await this.watcher.start();
  }

  async stop(): Promise<void> {
    await this.watcher.stop();
  }

  private async handleNewPlan(sourcePath: string): Promise<void> {
    // 1. Get pending context
    const pending = await this.getLatestPendingContext();

    if (pending && !this.isExpired(pending)) {
      // 2. Auto link with pending context
      await this.linkPlan(sourcePath, {
        targetType: pending.target_type,
        targetPath: pending.target_path,
        name: pending.name
      });
      await this.removePendingContext(pending.id);
    } else {
      // 3. Add to unlinked
      await this.addToUnlinked(sourcePath);
    }
  }

  private async linkPlan(
    sourcePath: string, 
    context: { targetType: string; targetPath: string; name?: string }
  ): Promise<void> {
    const arborRoot = this.config.arborRoot;
    
    // 1. Build destination path
    const destDir = this.buildDestDir(context.targetType, context.targetPath);
    await fs.ensureDir(destDir);

    // 2. Copy file (preserve original format)
    const fileName = this.generateFileName(
      context.name || path.basename(sourcePath, '.md')
    );
    const destPath = path.join(destDir, fileName);
    await fs.copy(sourcePath, destPath);

    // 3. Update mappings.yaml
    const mappingsPath = path.join(arborRoot, 'mappings.yaml');
    const mappings = await this.loadMappings(mappingsPath);
    
    const linkedPlan: LinkedPlan = {
      id: `plan-${nanoid(8)}`,
      source: sourcePath,
      local: path.relative(arborRoot, destPath),
      target_type: context.targetType as any,
      target_path: context.targetPath,
      name: context.name || path.basename(sourcePath, '.md'),
      linked_at: new Date().toISOString(),
      source_exists: true
    };
    
    mappings.linked.push(linkedPlan);
    await fs.writeFile(mappingsPath, YAML.stringify(mappings));

    // 4. Notify visualizer
    this.onUpdate?.('plan-linked', {
      source: sourcePath,
      dest: destPath,
      plan: linkedPlan
    });
  }

  private buildDestDir(targetType: string, targetPath: string): string {
    const arborRoot = this.config.arborRoot;
    
    switch (targetType) {
      case 'feature':
        return path.join(arborRoot, 'features', targetPath, 'plans');
      case 'config':
        return path.join(arborRoot, 'config', targetPath, 'plans');
      case 'infra':
        return path.join(arborRoot, 'infra', targetPath, 'plans');
      case 'refactor':
      case 'test':
      case 'security':
      case 'performance':
        // These are under feature
        return path.join(arborRoot, 'features', targetPath, targetType, 'plans');
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
  }

  private async addToUnlinked(sourcePath: string): Promise<void> {
    const arborRoot = this.config.arborRoot;
    const mappingsPath = path.join(arborRoot, 'mappings.yaml');
    const mappings = await this.loadMappings(mappingsPath);
    
    // Read preview
    const content = await fs.readFile(sourcePath, 'utf-8');
    const preview = content.slice(0, 100).replace(/\n/g, ' ');
    
    mappings.unlinked.push({
      id: `plan-${nanoid(8)}`,
      source: sourcePath,
      detected_at: new Date().toISOString(),
      preview
    });
    
    await fs.writeFile(mappingsPath, YAML.stringify(mappings));
    
    this.onUpdate?.('plan-unlinked', { source: sourcePath });
  }

  private async getLatestPendingContext(): Promise<PendingItem | null> {
    const pendingPath = path.join(this.config.arborRoot, 'pending_context.yaml');
    
    if (!await fs.pathExists(pendingPath)) {
      return null;
    }
    
    const content = await fs.readFile(pendingPath, 'utf-8');
    const data = YAML.parse(content) as PendingContext;
    
    if (!data.pending || data.pending.length === 0) {
      return null;
    }
    
    // Return most recent
    return data.pending[data.pending.length - 1];
  }

  private isExpired(item: PendingItem): boolean {
    return new Date(item.expires_at) < new Date();
  }

  private async removePendingContext(id: string): Promise<void> {
    const pendingPath = path.join(this.config.arborRoot, 'pending_context.yaml');
    const content = await fs.readFile(pendingPath, 'utf-8');
    const data = YAML.parse(content) as PendingContext;
    
    data.pending = data.pending.filter(p => p.id !== id);
    await fs.writeFile(pendingPath, YAML.stringify(data));
  }

  private async loadMappings(mappingsPath: string): Promise<Mappings> {
    if (!await fs.pathExists(mappingsPath)) {
      return { version: 1, project_id: '', linked: [], unlinked: [] };
    }
    const content = await fs.readFile(mappingsPath, 'utf-8');
    return YAML.parse(content);
  }

  private generateFileName(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}.md`;
  }
}
```

---

## 5. Visualizer 구현

### 5.1 컴포넌트 구조

```
src/components/
├── TreeView/
│   ├── TreeCanvas.tsx       # React Flow wrapper
│   ├── TreeNode.tsx         # Custom node component
│   ├── TreeEdge.tsx         # Custom edge component
│   └── NodeIcon.tsx         # Lucide icon mapping
├── DetailPanel/
│   ├── DetailPanel.tsx      # Main panel
│   ├── PlanDetail.tsx       # Plan detail view
│   ├── TaskDetail.tsx       # Task detail view
│   ├── BugDetail.tsx        # Bug detail view
│   └── MarkdownViewer.tsx   # Markdown renderer
├── StatusFilter/
│   └── StatusFilter.tsx     # Status filter buttons
├── UnlinkedPlans/
│   ├── UnlinkedList.tsx     # Unlinked plans list
│   └── LinkDialog.tsx       # Link dialog modal
└── common/
    ├── StatusBadge.tsx      # Task status badge
    └── SeverityBadge.tsx    # Bug severity badge
```

### 5.2 Lucide 아이콘 매핑

```typescript
// src/components/TreeView/NodeIcon.tsx

import {
  FolderKanban,
  Layers,
  Settings,
  Server,
  RefreshCw,
  TestTube2,
  Shield,
  Zap,
  ClipboardList,
  FileText,
  Bug,
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
  LucideIcon,
} from 'lucide-react';

export const nodeIcons: Record<string, LucideIcon> = {
  // Structure nodes
  project: FolderKanban,
  feature: Layers,
  config: Settings,
  infra: Server,
  refactor: RefreshCw,
  test: TestTube2,
  security: Shield,
  performance: Zap,
  
  // Work nodes
  plan: ClipboardList,
  doc: FileText,
  bug: Bug,
};

export const taskIcons: Record<string, LucideIcon> = {
  pending: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
  blocked: XCircle,
};

interface NodeIconProps {
  type: string;
  status?: string;
  size?: number;
  className?: string;
}

export function NodeIcon({ type, status, size = 16, className }: NodeIconProps) {
  let Icon: LucideIcon;
  
  if (type === 'task' && status) {
    Icon = taskIcons[status] || Circle;
  } else {
    Icon = nodeIcons[type] || FileText;
  }
  
  return <Icon size={size} className={className} />;
}
```

### 5.3 색상 시스템

```typescript
// src/lib/colors.ts

export const colors = {
  // Primary (Blue)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    700: '#1d4ed8',
  },
  
  // Neutral (Gray)
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    600: '#4b5563',
    800: '#1f2937',
  },
  
  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Node colors by type
export const nodeColors = {
  // Structure nodes - neutral
  project: { bg: colors.neutral[50], border: colors.neutral[400] },
  feature: { bg: colors.neutral[50], border: colors.primary[500] },
  config: { bg: colors.neutral[100], border: colors.neutral[400] },
  infra: { bg: colors.neutral[100], border: colors.neutral[400] },
  refactor: { bg: colors.neutral[100], border: colors.neutral[400] },
  test: { bg: colors.neutral[100], border: colors.neutral[400] },
  security: { bg: colors.neutral[100], border: colors.neutral[400] },
  performance: { bg: colors.neutral[100], border: colors.neutral[400] },
  
  // Work nodes
  plan: { bg: colors.primary[50], border: colors.primary[500] },
  doc: { bg: colors.neutral[50], border: colors.neutral[400] },
  
  // Task by status
  task: {
    pending: { bg: colors.neutral[100], border: colors.neutral[400] },
    in_progress: { bg: colors.primary[50], border: colors.primary[500] },
    completed: { bg: '#dcfce7', border: colors.success },
    blocked: { bg: '#fee2e2', border: colors.error },
  },
  
  // Bug by severity
  bug: {
    low: { bg: colors.neutral[100], border: colors.neutral[400] },
    medium: { bg: '#fef9c3', border: colors.warning },
    high: { bg: '#ffedd5', border: '#f97316' },
    critical: { bg: '#fee2e2', border: colors.error },
  },
};
```

### 5.4 WebSocket 실시간 동기화

```typescript
// src/hooks/useWebSocket.ts

import { useEffect, useState, useCallback } from 'react';
import { TreeData } from '@arbor-plan/core';

interface WebSocketMessage {
  type: 'tree-update' | 'plan-linked' | 'plan-unlinked' | 'node-changed';
  data: any;
}

export function useWebSocket(url: string) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (e) => {
      setError(new Error('WebSocket connection failed'));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'tree-update':
            setTreeData(message.data);
            break;
          case 'plan-linked':
          case 'plan-unlinked':
          case 'node-changed':
            // Partial update - request full tree
            ws.send(JSON.stringify({ type: 'get-tree' }));
            break;
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    // Request initial tree
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'get-tree' }));
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const refresh = useCallback(() => {
    // Trigger re-fetch by updating treeData
    setTreeData(null);
  }, []);

  return { treeData, connected, error, refresh };
}
```

### 5.5 Server (Express + WebSocket)

```typescript
// src/server/index.ts

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { TreeParser } from '@arbor-plan/core';
import chokidar from 'chokidar';

interface ServerConfig {
  port: number;
  arborRoot: string;
}

export function createVisualizerServer(config: ServerConfig) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Serve static files
  app.use(express.static(path.join(__dirname, '../dist')));

  // API routes
  app.get('/api/tree', async (req, res) => {
    const parser = new TreeParser(config.arborRoot);
    const tree = await parser.parse();
    res.json(tree);
  });

  // WebSocket handling
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'get-tree') {
          const parser = new TreeParser(config.arborRoot);
          const tree = await parser.parse();
          ws.send(JSON.stringify({ type: 'tree-update', data: tree }));
        }
      } catch (e) {
        console.error('Failed to handle message:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Watch for file changes
  const watcher = chokidar.watch(config.arborRoot, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  watcher.on('all', async (event, filePath) => {
    // Broadcast tree update to all clients
    const parser = new TreeParser(config.arborRoot);
    const tree = await parser.parse();
    
    const message = JSON.stringify({ type: 'tree-update', data: tree });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  return {
    start: () => {
      server.listen(config.port, () => {
        console.log(`Arbor Visualizer running at http://localhost:${config.port}`);
      });
    },
    stop: () => {
      watcher.close();
      wss.close();
      server.close();
    },
  };
}
```

---

## 6. CLI 구현

### 6.1 명령어 구조

```typescript
// packages/cli/src/index.ts

#!/usr/bin/env node

import { Command } from 'commander';
import { serveCommand } from './commands/serve';
import { treeCommand } from './commands/tree';
import { statusCommand } from './commands/status';
import { unlinkedCommand } from './commands/unlinked';

const program = new Command();

program
  .name('arbor')
  .description('Claude Code Plan 파일 시각화 도구')
  .version('1.0.0');

program.addCommand(serveCommand);
program.addCommand(treeCommand);
program.addCommand(statusCommand);
program.addCommand(unlinkedCommand);

program.parse();
```

### 6.2 serve 명령어

```typescript
// packages/cli/src/commands/serve.ts

import { Command } from 'commander';
import { createVisualizerServer } from '@arbor-plan/visualizer/server';
import { findArborRoot } from '../utils/find-root';

export const serveCommand = new Command('serve')
  .description('Visualizer 웹서버 실행')
  .option('-p, --port <number>', '포트 번호', '3000')
  .action(async (options) => {
    const arborRoot = await findArborRoot();
    
    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      console.error('arbor_init을 먼저 실행해주세요.');
      process.exit(1);
    }

    const server = createVisualizerServer({
      port: parseInt(options.port),
      arborRoot,
    });

    server.start();
  });
```

### 6.3 status 명령어

```typescript
// packages/cli/src/commands/status.ts

import { Command } from 'commander';
import { TreeParser, TaskStatus } from '@arbor-plan/core';
import { findArborRoot } from '../utils/find-root';
import chalk from 'chalk';

export const statusCommand = new Command('status')
  .description('Task 상태 요약')
  .action(async () => {
    const arborRoot = await findArborRoot();
    
    if (!arborRoot) {
      console.error('Error: .arbor 디렉토리를 찾을 수 없습니다.');
      process.exit(1);
    }

    const parser = new TreeParser(arborRoot);
    const tree = await parser.parse();
    const tasks = parser.getAllTasks(tree);

    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };

    tasks.forEach((task) => {
      counts[task.status as TaskStatus]++;
    });

    console.log('\n📊 Task Status Summary\n');
    console.log(`  ${chalk.gray('○')} Pending:     ${counts.pending}`);
    console.log(`  ${chalk.blue('◉')} In Progress: ${counts.in_progress}`);
    console.log(`  ${chalk.green('✓')} Completed:   ${counts.completed}`);
    console.log(`  ${chalk.red('✕')} Blocked:     ${counts.blocked}`);
    console.log(`\n  Total: ${tasks.length}\n`);
  });
```

---

## 7. 기술 스택

### 7.1 Core

| 구분 | 기술 | 버전 |
|------|------|------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.x |
| Package Manager | pnpm | 9+ |
| Monorepo | pnpm workspace | - |
| Bundler | tsup | 8.x |

### 7.2 @arbor-plan/core

| 라이브러리 | 용도 |
|-----------|------|
| zod | 스키마 검증 |
| yaml | YAML 파싱 |
| gray-matter | Frontmatter 파싱 |
| nanoid | ID 생성 |

### 7.3 @arbor-plan/mcp

| 라이브러리 | 용도 |
|-----------|------|
| @modelcontextprotocol/sdk | MCP 프로토콜 |
| chokidar | 파일 감시 |
| fs-extra | 파일 조작 |

### 7.4 @arbor-plan/visualizer

| 라이브러리 | 용도 |
|-----------|------|
| React | UI |
| Vite | 번들링 |
| Tailwind CSS | 스타일링 |
| @xyflow/react | 트리 시각화 |
| lucide-react | 아이콘 |
| react-markdown | 마크다운 렌더링 |
| express | HTTP 서버 |
| ws | WebSocket |

### 7.5 @arbor-plan/cli

| 라이브러리 | 용도 |
|-----------|------|
| commander | CLI 프레임워크 |
| chalk | 터미널 색상 |
| ora | 스피너 |

---

## 8. MCP 설정

### 8.1 .claude/mcp.json

```json
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

### 8.2 CLAUDE.md 자동 추가 내용

```markdown
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
```

---

## 9. 배포

### 9.1 npm 패키지 구조

```
@arbor-plan/core        # 공통 모듈
@arbor-plan/mcp         # MCP Server
@arbor-plan/visualizer  # Visualizer (서버 + 클라이언트)
@arbor-plan/cli         # CLI
```

### 9.2 CLI 설치 및 사용

```bash
# 전역 설치
npm install -g @arbor-plan/cli

# 또는 npx로 직접 실행
npx @arbor-plan/cli serve
npx arbor serve  # @arbor-plan/cli가 설치된 경우
```

### 9.3 package.json (CLI)

```json
{
  "name": "@arbor-plan/cli",
  "version": "1.0.0",
  "bin": {
    "arbor": "./dist/index.js"
  },
  "dependencies": {
    "@arbor-plan/core": "workspace:*",
    "@arbor-plan/visualizer": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  }
}
```

---

**문서 끝**
