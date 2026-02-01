# Arbor - MCP Tools API Reference

> MCP Tools의 상세 스펙. 구현 시 이 문서의 스키마를 준수할 것.

## 개요

모든 Tool은 `arbor_` 접두사를 사용합니다.

| Category | Tools |
|----------|-------|
| 초기화 | arbor_init |
| 구조 노드 | arbor_create_feature, arbor_create_config, arbor_create_infra, arbor_create_refactor, arbor_create_test, arbor_create_security, arbor_create_performance |
| 작업 노드 | arbor_create_task, arbor_create_bug, arbor_create_doc |
| Plan 연결 | arbor_set_pending_context, arbor_list_unlinked, arbor_link_plan |
| 조회 | arbor_get_structure, arbor_list_tasks |

---

## 초기화

### arbor_init

프로젝트에 Arbor 구조를 초기화합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    projectName: {
      type: "string",
      description: "프로젝트 이름"
    },
    projectDescription: {
      type: "string",
      description: "프로젝트 설명 (선택)"
    }
  },
  required: ["projectName"]
}
```

**Response:**

```typescript
{
  success: boolean,
  path: string,        // ".arbor"
  message: string
}
```

**동작:**
1. `.arbor/` 디렉토리 생성
2. `manifest.yaml` 생성
3. `mappings.yaml` 생성 (빈 linked/unlinked)
4. `pending_context.yaml` 생성
5. `CLAUDE.md`에 Arbor 규칙 추가

---

## 구조 노드 생성

### arbor_create_feature

Feature 노드를 생성합니다. 중첩 가능.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "경로 (예: auth, auth/social-login)"
    },
    name: {
      type: "string",
      description: "표시 이름"
    },
    description: {
      type: "string",
      description: "설명"
    },
    status: {
      type: "string",
      enum: ["planned", "in_progress", "completed", "on_hold"],
      default: "planned"
    }
  },
  required: ["path", "name"]
}
```

**Response:**

```typescript
{
  success: boolean,
  path: string,        // "features/auth/social-login"
  meta: {
    type: "feature",
    id: string,
    name: string,
    status: string,
    created: string,
    updated: string
  }
}
```

**동작:**
1. `.arbor/features/{path}/` 디렉토리 생성
2. `_meta.yaml` 생성
3. `plans/`, `tasks/`, `bugs/`, `docs/` 하위 디렉토리 생성

---

### arbor_create_config

Config 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "경로 (예: env-setup)"
    },
    name: {
      type: "string",
      description: "표시 이름"
    },
    description: {
      type: "string"
    },
    status: {
      type: "string",
      enum: ["planned", "in_progress", "completed", "on_hold"],
      default: "planned"
    }
  },
  required: ["path", "name"]
}
```

**동작:** `.arbor/config/{path}/` 생성

---

### arbor_create_infra

Infra 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "경로 (예: ci-cd)"
    },
    name: {
      type: "string"
    },
    description: {
      type: "string"
    },
    status: {
      type: "string",
      enum: ["planned", "in_progress", "completed", "on_hold"],
      default: "planned"
    }
  },
  required: ["path", "name"]
}
```

**동작:** `.arbor/infra/{path}/` 생성

---

### arbor_create_refactor

Feature 하위에 Refactor 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    featurePath: {
      type: "string",
      description: "부모 feature 경로 (예: auth/social-login)"
    },
    name: {
      type: "string",
      description: "표시 이름"
    },
    description: {
      type: "string"
    }
  },
  required: ["featurePath", "name"]
}
```

**동작:** `.arbor/features/{featurePath}/refactor/` 생성

---

### arbor_create_test

Feature 하위에 Test 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    featurePath: {
      type: "string",
      description: "부모 feature 경로"
    },
    name: {
      type: "string"
    },
    description: {
      type: "string"
    }
  },
  required: ["featurePath", "name"]
}
```

**동작:** `.arbor/features/{featurePath}/test/` 생성

---

### arbor_create_security

Feature 하위에 Security 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    featurePath: {
      type: "string"
    },
    name: {
      type: "string"
    },
    description: {
      type: "string"
    }
  },
  required: ["featurePath", "name"]
}
```

**동작:** `.arbor/features/{featurePath}/security/` 생성

---

### arbor_create_performance

Feature 하위에 Performance 노드를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    featurePath: {
      type: "string"
    },
    name: {
      type: "string"
    },
    description: {
      type: "string"
    }
  },
  required: ["featurePath", "name"]
}
```

**동작:** `.arbor/features/{featurePath}/performance/` 생성

---

## 작업 노드 생성

### arbor_create_task

Task를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    parentType: {
      type: "string",
      enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"],
      description: "부모 노드 타입"
    },
    parentPath: {
      type: "string",
      description: "부모 노드 경로 (예: auth/social-login)"
    },
    name: {
      type: "string",
      description: "Task 이름"
    },
    description: {
      type: "string",
      description: "Task 설명 (마크다운 본문)"
    },
    status: {
      type: "string",
      enum: ["pending", "in_progress", "completed", "blocked"],
      default: "pending"
    },
    planRef: {
      type: "string",
      description: "연결할 plan ID (mappings.yaml의 id)"
    }
  },
  required: ["parentType", "parentPath", "name"]
}
```

**Response:**

```typescript
{
  success: boolean,
  path: string,
  task: {
    id: string,
    name: string,
    status: string,
    created: string
  }
}
```

**생성 파일:** `tasks/task-{id}.md`

```markdown
---
id: task-abc123
name: "토큰 갱신 로직 구현"
status: pending
plan_ref: plan-001
created: 2025-01-27
updated: 2025-01-27
---

# 토큰 갱신 로직 구현

{description}
```

---

### arbor_create_bug

Bug를 생성합니다. Feature, Config, Infra, Test 하위에 생성 가능.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    parentType: {
      type: "string",
      enum: ["feature", "config", "infra", "test"],
      description: "부모 노드 타입"
    },
    parentPath: {
      type: "string",
      description: "부모 노드 경로"
    },
    name: {
      type: "string",
      description: "Bug 이름"
    },
    description: {
      type: "string",
      description: "Bug 설명"
    },
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
    relatedTask: {
      type: "string",
      description: "관련 task ID"
    }
  },
  required: ["parentType", "parentPath", "name", "severity"]
}
```

**생성 파일:** `bugs/bug-{id}.md`

```markdown
---
id: bug-abc123
name: "토큰 만료 시 앱 크래시"
severity: critical
status: open
related_task: task-001
created: 2025-01-27
updated: 2025-01-27
---

# 토큰 만료 시 앱 크래시

{description}
```

---

### arbor_create_doc

Doc를 생성합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    parentType: {
      type: "string",
      enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"]
    },
    parentPath: {
      type: "string"
    },
    name: {
      type: "string",
      description: "문서 이름"
    },
    docType: {
      type: "string",
      enum: ["architecture", "api", "guide", "reference", "decision"],
      description: "문서 타입"
    },
    content: {
      type: "string",
      description: "마크다운 본문"
    }
  },
  required: ["parentType", "parentPath", "name", "docType"]
}
```

**생성 파일:** `docs/doc-{id}.md`

---

## Plan 연결

### arbor_set_pending_context

Plan Mode 진입 전에 연결 대상을 등록합니다. TTL은 5분.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    targetType: {
      type: "string",
      enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"],
      description: "연결할 노드 타입"
    },
    targetPath: {
      type: "string",
      description: "연결할 노드 경로 (예: auth/social-login)"
    },
    name: {
      type: "string",
      description: "Plan 이름 (선택, 파일명에 사용)"
    }
  },
  required: ["targetType", "targetPath"]
}
```

**Response:**

```typescript
{
  success: boolean,
  contextId: string,
  expiresAt: string,      // ISO datetime
  message: string
}
```

**동작:**
1. `pending_context.yaml`에 추가
2. 5분 후 자동 만료

**사용 패턴:**

```
User: "auth/social-login plan 만들어줘"

Claude:
1. arbor_set_pending_context 호출
2. Plan Mode 진입
3. plan 작성
4. Watcher가 자동 연결
```

---

### arbor_list_unlinked

자동 연결되지 않은 Plan 목록을 조회합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {}
}
```

**Response:**

```typescript
{
  unlinked: Array<{
    id: string,
    source: string,          // 원본 경로
    detected_at: string,     // ISO datetime
    preview: string          // 첫 100자
  }>
}
```

---

### arbor_link_plan

Unlinked Plan을 수동으로 연결합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    planId: {
      type: "string",
      description: "unlinked plan의 ID"
    },
    targetType: {
      type: "string",
      enum: ["feature", "config", "infra", "refactor", "test", "security", "performance"]
    },
    targetPath: {
      type: "string",
      description: "연결할 노드 경로"
    },
    name: {
      type: "string",
      description: "Plan 이름 (파일명에 사용)"
    }
  },
  required: ["planId", "targetType", "targetPath"]
}
```

**Response:**

```typescript
{
  success: boolean,
  linkedPlan: {
    id: string,
    source: string,
    local: string,
    name: string
  }
}
```

**동작:**
1. unlinked에서 해당 plan 찾기
2. 원본을 대상 경로로 복사
3. mappings.yaml의 linked에 추가
4. unlinked에서 제거

---

## 조회

### arbor_get_structure

현재 트리 구조를 조회합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "특정 경로만 조회 (선택)"
    },
    depth: {
      type: "number",
      description: "조회 깊이 (선택)"
    }
  }
}
```

**Response:**

```typescript
{
  tree: TreeNode
}

interface TreeNode {
  type: string,
  id: string,
  name: string,
  path: string,
  status?: string,
  children?: TreeNode[],
  plans?: Plan[],
  tasks?: Task[],
  bugs?: Bug[],
  docs?: Doc[]
}
```

---

### arbor_list_tasks

상태별 Task 목록을 조회합니다.

**Input Schema:**

```typescript
{
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["pending", "in_progress", "completed", "blocked"],
      description: "필터링할 상태 (선택)"
    },
    path: {
      type: "string",
      description: "특정 경로 하위만 조회 (선택)"
    }
  }
}
```

**Response:**

```typescript
{
  tasks: Array<{
    id: string,
    name: string,
    status: string,
    path: string,           // 전체 경로
    parentType: string,
    parentPath: string,
    planRef?: string,
    created: string,
    updated: string
  }>,
  counts: {
    pending: number,
    in_progress: number,
    completed: number,
    blocked: number,
    total: number
  }
}
```

---

## 에러 응답

모든 Tool은 실패 시 다음 형식으로 응답:

```typescript
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

**에러 코드:**

| Code | Description |
|------|-------------|
| `NOT_INITIALIZED` | .arbor 디렉토리가 없음 |
| `ALREADY_EXISTS` | 이미 존재하는 노드 |
| `NOT_FOUND` | 노드/Plan을 찾을 수 없음 |
| `INVALID_PATH` | 잘못된 경로 형식 |
| `INVALID_PARENT` | 부모 노드가 존재하지 않음 |
| `SCHEMA_ERROR` | 스키마 검증 실패 |
