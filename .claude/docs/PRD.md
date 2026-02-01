# Arbor - Product Requirements Document

> Claude Code Plan 파일을 트리 구조로 시각화하는 도구

**Project:** Arbor  
**npm Scope:** @arbor-plan  
**Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Draft  
**Author:** Dylan

---

## 1. 개요

### 1.1 배경

Claude Code의 Plan Mode는 개발 작업을 체계적으로 계획할 수 있는 강력한 기능이다. 그러나 현재 몇 가지 한계가 있다:

- **파일 관리의 어려움**: Plan 파일이 `~/.claude/plans/`에 flat하게 저장되어 프로젝트별, 기능별 구분이 어렵다
- **30일 자동 삭제**: 오래된 plan 파일이 자동 삭제되어 히스토리 추적이 불가능하다
- **전체 현황 파악 불가**: 프로젝트의 plan, task, bug를 한눈에 볼 수 없다
- **작업 상태 추적 부재**: 어떤 작업이 완료되었고, 진행 중인지 파악하기 어렵다

### 1.2 문제 정의

| 문제 | 영향 |
|------|------|
| Plan 파일이 프로젝트와 분리됨 | 컨텍스트 스위칭 비용 증가 |
| 계층 구조 없음 | 기능 간 관계 파악 불가 |
| 자동 삭제 | 히스토리 및 의사결정 기록 손실 |
| 시각화 부재 | 프로젝트 전체 현황 파악 불가 |
| 상태 관리 부재 | 진행 상황 추적 어려움 |

### 1.3 솔루션 개요

**Arbor**는 Claude Code Plan 파일을 프로젝트 내에서 체계적으로 관리하고, 트리 구조로 시각화하는 도구이다.

---

## 2. 목표

### 2.1 비즈니스 목표

- Claude Code 사용자의 프로젝트 관리 효율성 향상
- Plan 파일의 체계적 보존 및 관리
- 개발 작업 흐름의 가시성 확보

### 2.2 사용자 목표

- 프로젝트의 모든 plan, task, bug를 한눈에 파악
- 작업 상태(완료/진행중/대기)를 명확히 구분
- Plan 파일을 기능별로 체계적으로 정리
- Claude Code Plan Mode와 자연스럽게 통합

### 2.3 성공 지표 (KPIs)

| 지표 | 목표 |
|------|------|
| Plan 파일 연결 성공률 | > 90% (자동 연결) |
| Visualizer 로딩 시간 | < 2초 |
| 실시간 동기화 지연 | < 500ms |

---

## 3. 사용자

### 3.1 목표 사용자

**Primary:** Claude Code를 사용하는 개발자
- Plan Mode를 적극적으로 활용
- 중규모 이상의 프로젝트 진행
- 체계적인 작업 관리 필요

**Secondary:** 팀 리드 / 프로젝트 매니저
- 프로젝트 진행 현황 파악 필요
- 작업 상태 모니터링

### 3.2 사용자 페르소나

**Dylan (개발자)**
- React Native + NestJS 프로젝트 진행 중
- Claude Code Plan Mode로 기능 단위 계획 수립
- 여러 기능을 동시에 개발하며 컨텍스트 관리 필요
- "어떤 기능의 어떤 작업이 남았는지 한눈에 보고 싶다"

---

## 4. 사용자 스토리

### 4.1 프로젝트 초기화

```
AS A 개발자
I WANT TO 프로젝트에 Arbor를 초기화하고 싶다
SO THAT plan 파일을 체계적으로 관리할 수 있다

Acceptance Criteria:
- Claude에게 "arbor 초기화해줘"라고 말하면 .arbor/ 디렉토리가 생성된다
- manifest.yaml에 프로젝트 정보가 저장된다
- CLAUDE.md에 Arbor 사용 규칙이 추가된다
```

### 4.2 Feature 생성

```
AS A 개발자
I WANT TO 기능 단위(feature)를 생성하고 싶다
SO THAT plan과 task를 기능별로 그룹화할 수 있다

Acceptance Criteria:
- "auth/social-login feature 만들어줘"라고 말하면 feature가 생성된다
- feature는 중첩될 수 있다 (auth > social-login > google)
- feature에 plan, task, bug, doc을 추가할 수 있다
```

### 4.3 Plan 자동 연결

```
AS A 개발자
I WANT TO Claude Code Plan Mode에서 생성한 plan이 자동으로 feature에 연결되길 원한다
SO THAT 수동 작업 없이 plan을 관리할 수 있다

Acceptance Criteria:
- "auth/social-login plan 만들어줘"라고 말하면 pending context가 등록된다
- Plan Mode에서 plan 생성 후 자동으로 해당 feature에 연결된다
- 원본 파일이 .arbor/로 복사되어 보존된다
- 연결 정보가 mappings.yaml에 기록된다
```

### 4.4 트리 시각화

```
AS A 개발자
I WANT TO 프로젝트의 모든 plan, task, bug를 트리 형태로 보고 싶다
SO THAT 전체 현황을 한눈에 파악할 수 있다

Acceptance Criteria:
- "arbor serve"로 웹 Visualizer를 실행할 수 있다
- 트리 형태로 project > feature > plan > task 구조가 표시된다
- 노드 클릭 시 상세 정보가 우측 패널에 표시된다
- 파일 변경 시 실시간으로 트리가 업데이트된다
```

### 4.5 작업 상태 필터링

```
AS A 개발자
I WANT TO 상태별로 task를 필터링하고 싶다
SO THAT 진행 중인 작업에 집중할 수 있다

Acceptance Criteria:
- Pending / In Progress / Completed / Blocked 상태로 필터링할 수 있다
- 각 상태별 개수가 표시된다
- 필터 적용 시 트리에서 해당 상태의 task만 강조된다
```

### 4.6 미연결 Plan 처리

```
AS A 개발자
I WANT TO 자동 연결되지 않은 plan을 수동으로 연결하고 싶다
SO THAT 모든 plan이 트리에 포함될 수 있다

Acceptance Criteria:
- Visualizer에 "Unlinked Plans" 섹션이 표시된다
- 미연결 plan의 미리보기와 생성 시간이 표시된다
- 클릭하여 원하는 feature에 연결할 수 있다
```

---

## 5. 기능 요구사항

### 5.1 MCP Server

| ID | 기능 | 우선순위 | 설명 |
|----|------|----------|------|
| F-MCP-01 | 프로젝트 초기화 | Must | .arbor/ 구조 생성 및 CLAUDE.md 업데이트 |
| F-MCP-02 | Feature 생성 | Must | 중첩 가능한 feature 노드 생성 |
| F-MCP-03 | Config/Infra 생성 | Should | 설정 및 인프라 노드 생성 |
| F-MCP-04 | Plan 생성 | Must | plan 문서 직접 생성 |
| F-MCP-05 | Task 생성 | Must | 상태 관리 가능한 task 생성 |
| F-MCP-06 | Bug 생성 | Should | 심각도별 bug 생성 |
| F-MCP-07 | Doc 생성 | Could | 문서 노드 생성 |
| F-MCP-08 | Pending Context 등록 | Must | Plan Mode 연결을 위한 context 등록 |
| F-MCP-09 | 수동 Plan 연결 | Must | 미연결 plan 수동 연결 |
| F-MCP-10 | 트리 구조 조회 | Should | 현재 트리 구조 반환 |
| F-MCP-11 | 상태별 Task 조회 | Should | 필터링된 task 목록 반환 |

### 5.2 File Watcher

| ID | 기능 | 우선순위 | 설명 |
|----|------|----------|------|
| F-WAT-01 | Claude Plans 감시 | Must | ~/.claude/plans/ 디렉토리 감시 |
| F-WAT-02 | 자동 연결 | Must | Pending context 기반 자동 연결 |
| F-WAT-03 | 파일 복사 | Must | 원본 plan을 .arbor/로 복사 |
| F-WAT-04 | Unlinked 추가 | Must | 연결 실패 시 unlinked에 추가 |
| F-WAT-05 | 실시간 알림 | Should | WebSocket으로 변경 사항 브로드캐스트 |

### 5.3 Visualizer

| ID | 기능 | 우선순위 | 설명 |
|----|------|----------|------|
| F-VIS-01 | 트리 뷰 | Must | React Flow 기반 트리 시각화 |
| F-VIS-02 | 상세 패널 | Must | 노드 클릭 시 상세 정보 표시 |
| F-VIS-03 | 마크다운 렌더링 | Must | plan/doc 내용 마크다운 렌더링 |
| F-VIS-04 | 상태 필터 | Should | 상태별 필터링 UI |
| F-VIS-05 | Unlinked Plans | Must | 미연결 plan 목록 및 연결 UI |
| F-VIS-06 | 실시간 동기화 | Must | WebSocket 기반 실시간 업데이트 |
| F-VIS-07 | 줌/팬 | Should | 트리 뷰 줌인/아웃, 패닝 |

### 5.4 CLI

| ID | 기능 | 우선순위 | 설명 |
|----|------|----------|------|
| F-CLI-01 | arbor serve | Must | Visualizer 웹서버 실행 |
| F-CLI-02 | arbor tree | Should | CLI에서 트리 구조 출력 |
| F-CLI-03 | arbor status | Should | 상태별 task 개수 출력 |
| F-CLI-04 | arbor unlinked | Could | 미연결 plan 목록 출력 |

---

## 6. 비기능 요구사항

### 6.1 성능

| 요구사항 | 기준 |
|----------|------|
| Visualizer 초기 로딩 | < 2초 |
| 실시간 동기화 지연 | < 500ms |
| 트리 렌더링 (100개 노드) | < 100ms |
| 파일 감시 응답 | < 1초 |

### 6.2 호환성

| 요구사항 | 기준 |
|----------|------|
| Node.js | 20.x 이상 |
| OS | macOS, Linux, Windows |
| 브라우저 | Chrome, Safari, Firefox (최신 2버전) |

### 6.3 사용성

| 요구사항 | 기준 |
|----------|------|
| 설치 | npm 단일 명령어로 설치 가능 |
| 초기화 | Claude 대화로 초기화 가능 |
| 문서화 | README 및 사용 가이드 제공 |

---

## 7. 데이터 구조

### 7.1 노드 타입

#### 구조 노드 (컨테이너)

| 타입 | 위치 | 하위 포함 가능 |
|------|------|---------------|
| project | 최상위 | feature, config, infra |
| feature | project 또는 feature | feature, plan, task, bug, doc, refactor, test, security, performance |
| config | project | config, plan, task, bug, doc |
| infra | project | infra, plan, task, bug, doc |
| refactor | feature | plan, task, bug, doc |
| test | feature | plan, task, bug, doc |
| security | feature | plan, task, bug, doc |
| performance | feature | plan, task, bug, doc |

#### 작업 노드 (리프)

| 타입 | 상태/속성 |
|------|----------|
| plan | Claude Code Plan Mode 생성, 원본 형식 유지 |
| task | pending, in_progress, completed, blocked |
| bug | low, medium, high, critical (severity) |
| doc | architecture, api, guide, reference, decision |

### 7.2 파일 구조

```
.arbor/
├── manifest.yaml          # 프로젝트 메타
├── mappings.yaml          # plan 맵핑 (원본 ↔ 복사본)
├── pending_context.yaml   # 자동 연결 대기
├── features/              # feature 노드들
├── config/                # config 노드들
└── infra/                 # infra 노드들
```

---

## 8. 범위

### 8.1 In Scope (v1.0)

- MCP Server (Tools, Watcher, Auto Linker)
- Web Visualizer (트리 뷰, 상세 패널, 상태 필터)
- CLI (serve, tree, status)
- Plan 자동 연결 및 복사
- 실시간 동기화

### 8.2 Out of Scope (v1.0)

- VS Code Extension
- 팀 협업 기능
- 클라우드 동기화
- Plan 파일 직접 편집
- 권한 관리
- 다국어 지원

### 8.3 Future Considerations (v2.0+)

- VS Code Extension 통합
- 검색 기능
- 태그 기반 필터링
- Plan 템플릿
- 통계 대시보드

---

## 9. 릴리스 계획

### Phase 1: Core (2주)

- @arbor-plan/core 패키지
- @arbor-plan/mcp 패키지
- 기본 MCP Tools
- File Watcher
- Auto Linker

### Phase 2: Visualizer (2주)

- @arbor-plan/visualizer 패키지
- @arbor-plan/cli 패키지
- 트리 뷰
- 상세 패널
- 실시간 동기화

### Phase 3: Polish (1주)

- 상태 필터링
- Unlinked Plans UI
- 문서화
- npm 배포

---

## 10. 위험 및 의존성

### 10.1 위험

| 위험 | 영향 | 완화 방안 |
|------|------|----------|
| Claude Code Plan Mode 변경 | 높음 | 파일 형식 변경 감지 및 어댑터 패턴 적용 |
| ~/.claude/plans/ 경로 변경 | 높음 | 설정으로 경로 오버라이드 지원 |
| 대용량 프로젝트 성능 | 중간 | 가상 스크롤, 레이지 로딩 적용 |

### 10.2 의존성

| 의존성 | 유형 |
|--------|------|
| Claude Code Plan Mode | 외부 - Anthropic |
| MCP Protocol | 외부 - Anthropic |
| React Flow | 라이브러리 |
| chokidar | 라이브러리 |

---

## 11. 부록

### 11.1 용어 정의

| 용어 | 정의 |
|------|------|
| Plan Mode | Claude Code의 계획 수립 모드 |
| MCP | Model Context Protocol |
| Pending Context | Plan Mode 진입 전 등록하는 연결 대상 정보 |
| Unlinked Plan | 자동 연결되지 않은 plan 파일 |

### 11.2 참고 자료

- Claude Code Documentation
- MCP Protocol Specification
- React Flow Documentation

---

**문서 끝**
