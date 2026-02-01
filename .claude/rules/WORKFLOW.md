# 작업 프로세스 규칙

이 문서는 Claude Code가 프로젝트 작업 시 반드시 따라야 하는 프로세스를 정의합니다.

## Git Flow 브랜치 전략

### 브랜치 구조

```
main          # 프로덕션 릴리스
├── develop   # 개발 통합 브랜치
│   ├── feature/*   # 기능 개발
│   ├── bugfix/*    # 버그 수정
│   ├── refactor/*  # 리팩토링
│   └── test/*      # 테스트 추가/개선
└── hotfix/*  # 긴급 수정 (main에서 분기)
```

### 브랜치 네이밍

- `feature/{기능명}` - 새 기능 (예: `feature/social-login`)
- `bugfix/{이슈}` - 버그 수정 (예: `bugfix/fix-plan-parser`)
- `refactor/{대상}` - 리팩토링 (예: `refactor/core-utils`)
- `test/{대상}` - 테스트 추가 (예: `test/mcp-tools`)
- `hotfix/{이슈}` - 긴급 수정 (예: `hotfix/critical-error`)

## 개발 프로세스

### 1. 작업 시작

```bash
# develop 브랜치에서 최신 코드 pull
git checkout develop
git pull origin develop

# 작업 브랜치 생성
git checkout -b feature/{기능명}
```

### 2. TDD (Test-Driven Development)

**반드시 테스트 먼저 작성:**

1. **Red Phase** - 실패하는 테스트 작성
   - 구현할 기능의 예상 동작을 테스트로 정의
   - 테스트 실행하여 실패 확인 (필수)

2. **Green Phase** - 테스트 통과하는 최소 코드 작성
   - 테스트를 통과하는 가장 간단한 구현
   - 과도한 설계 금지

3. **Refactor Phase** - 코드 개선
   - 중복 제거, 가독성 향상
   - 테스트 통과 상태 유지

### 3. 코드 품질 검증

모든 커밋 전 다음 검증 필수:

```bash
# 테스트 실행
pnpm test

# 린트 검사
pnpm lint

# 타입 체크
pnpm tsc --noEmit
```

**모든 검증 통과 후에만 커밋 진행**

### 4. 커밋 규칙

#### 커밋 타이밍
- 하나의 논리적 단위가 완료될 때마다 커밋
- Red → Green → Refactor 사이클마다 커밋 권장
- 작업이 길어질 경우 중간 저장 목적의 WIP 커밋 가능

#### 커밋 메시지 형식

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Type:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `docs`: 문서
- `chore`: 빌드, 설정 등
- `style`: 포맷팅 (코드 변경 없음)

**예시:**
```
feat(core): add plan parser for YAML frontmatter

- Parse gray-matter frontmatter
- Validate with Zod schema
- Export typed Plan interface
```

### 5. Pull Request

#### PR 생성 시점
- 브랜치의 목적이 완료되었을 때
- develop 브랜치로 PR 생성

#### PR 작성 규칙

```markdown
## Summary
- 변경 사항 요약 (1-3줄)

## Changes
- 주요 변경 목록

## Test Plan
- [ ] 테스트 통과 확인
- [ ] 린트 통과 확인
- [ ] 타입 체크 통과 확인
- [ ] 수동 테스트 항목 (해당 시)

## Related
- 관련 이슈/문서 링크
```

### 6. 코드 리뷰

1. 리뷰어 피드백 확인
2. 필요한 수정 사항 반영
3. 수정 후 다시 검증 (test, lint, tsc)
4. 리뷰 승인 후 머지

### 7. 머지

- Squash and Merge 권장 (깔끔한 히스토리)
- 머지 후 로컬 브랜치 정리

```bash
git checkout develop
git pull origin develop
git branch -d feature/{기능명}
```

## 체크리스트

### 커밋 전 체크리스트
- [ ] 테스트 코드 먼저 작성했는가?
- [ ] `pnpm test` 통과?
- [ ] `pnpm lint` 통과?
- [ ] `pnpm tsc --noEmit` 통과?
- [ ] 커밋 메시지 형식 준수?

### PR 전 체크리스트
- [ ] 모든 테스트 통과?
- [ ] 코드 품질 검증 완료?
- [ ] PR 템플릿 작성?
- [ ] 관련 문서 업데이트?

### 머지 전 체크리스트
- [ ] 코드 리뷰 승인?
- [ ] 리뷰 피드백 반영?
- [ ] CI 통과?

## Claude Code 작업 시 준수사항

1. **새 작업 시작 시** - 반드시 브랜치 생성
2. **코드 작성 전** - 테스트 코드 먼저 작성 (Red case)
3. **구현 완료 후** - 테스트, 린트, 타입 체크 실행
4. **커밋 시** - 검증 통과 확인 후 커밋
5. **작업 완료 시** - develop으로 PR 생성
