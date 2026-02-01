/**
 * Plan Task Parser
 *
 * Plan 마크다운 파일에서 체크박스와 번호 목록을 파싱하여 Task 정보를 추출합니다.
 */

export interface ParsedPlanTask {
  /** Task 이름 */
  name: string;
  /** Task 상태 (체크박스: checked면 completed, 번호 목록은 항상 pending) */
  status: 'pending' | 'completed';
  /** Task가 발견된 라인 번호 (1-based) */
  lineNumber: number;
  /** Task가 속한 섹션 제목 (## 또는 ### 헤더) */
  section?: string;
}

export interface PlanTaskParseResult {
  /** 파싱된 모든 Task 목록 */
  tasks: ParsedPlanTask[];
  /** 전체 체크박스 개수 */
  totalCheckboxes: number;
  /** 완료된 체크박스 개수 */
  completedCheckboxes: number;
  /** 전체 번호 목록 개수 */
  totalNumbered: number;
}

// 체크박스 패턴: - [ ] 또는 - [x] 또는 - [X]
const CHECKBOX_REGEX = /^[\s]*-\s*\[([ xX])\]\s+(.+)/;

// 번호 목록 패턴: 1. 또는 1)
const NUMBERED_REGEX = /^[\s]*\d+[.)]\s+(.+)/;

// 섹션 헤더 패턴: ## 또는 ###
const SECTION_REGEX = /^#{2,3}\s+(.+)/;

// 코드 블록 시작/끝 패턴
const CODE_BLOCK_REGEX = /^```/;

/**
 * Plan 마크다운 내용에서 Task 항목을 파싱합니다.
 *
 * @param content - Plan 마크다운 내용
 * @returns 파싱된 Task 목록과 통계
 *
 * @example
 * ```typescript
 * const content = `
 * ## Tasks
 * - [ ] Pending task
 * - [x] Completed task
 * 1. Numbered task
 * `;
 *
 * const result = parsePlanTasks(content);
 * // result.tasks = [
 * //   { name: 'Pending task', status: 'pending', lineNumber: 3, section: 'Tasks' },
 * //   { name: 'Completed task', status: 'completed', lineNumber: 4, section: 'Tasks' },
 * //   { name: 'Numbered task', status: 'pending', lineNumber: 5, section: 'Tasks' },
 * // ]
 * ```
 */
export function parsePlanTasks(content: string): PlanTaskParseResult {
  const tasks: ParsedPlanTask[] = [];
  const lines = content.split('\n');

  let currentSection: string | undefined;
  let totalCheckboxes = 0;
  let completedCheckboxes = 0;
  let totalNumbered = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const lineNumber = i + 1;

    // 코드 블록 토글
    if (CODE_BLOCK_REGEX.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // 코드 블록 내부는 무시
    if (inCodeBlock) {
      continue;
    }

    // 섹션 제목 추적 (## 또는 ### 형식)
    const sectionMatch = line.match(SECTION_REGEX);
    if (sectionMatch && sectionMatch[1]) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // 체크박스 파싱: - [ ] 또는 - [x]
    const checkboxMatch = line.match(CHECKBOX_REGEX);
    if (checkboxMatch && checkboxMatch[1] && checkboxMatch[2]) {
      totalCheckboxes++;
      const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
      if (isCompleted) {
        completedCheckboxes++;
      }

      tasks.push({
        name: checkboxMatch[2].trim(),
        status: isCompleted ? 'completed' : 'pending',
        lineNumber,
        section: currentSection,
      });
      continue;
    }

    // 번호 목록 파싱: 1. 또는 1)
    const numberedMatch = line.match(NUMBERED_REGEX);
    if (numberedMatch && numberedMatch[1]) {
      totalNumbered++;

      tasks.push({
        name: numberedMatch[1].trim(),
        status: 'pending',
        lineNumber,
        section: currentSection,
      });
    }
  }

  return {
    tasks,
    totalCheckboxes,
    completedCheckboxes,
    totalNumbered,
  };
}
