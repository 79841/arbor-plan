import { describe, it, expect } from 'vitest';
import { parsePlanTasks } from '../plan-task-parser.js';

describe('parsePlanTasks', () => {
  describe('checkbox parsing', () => {
    it('should parse unchecked checkbox as pending task', () => {
      const content = `# Plan

## Tasks
- [ ] Task 1
- [ ] Task 2
`;
      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]!.name).toBe('Task 1');
      expect(result.tasks[0]!.status).toBe('pending');
      expect(result.tasks[1]!.name).toBe('Task 2');
      expect(result.tasks[1]!.status).toBe('pending');
      expect(result.totalCheckboxes).toBe(2);
      expect(result.completedCheckboxes).toBe(0);
    });

    it('should parse checked checkbox as completed task', () => {
      const content = `- [x] Completed task
- [X] Also completed`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]!.name).toBe('Completed task');
      expect(result.tasks[0]!.status).toBe('completed');
      expect(result.tasks[1]!.name).toBe('Also completed');
      expect(result.tasks[1]!.status).toBe('completed');
      expect(result.completedCheckboxes).toBe(2);
    });

    it('should handle indented checkboxes', () => {
      const content = `- [ ] Top level
  - [ ] Indented task
    - [x] Deeply indented`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[1]!.name).toBe('Indented task');
      expect(result.tasks[2]!.name).toBe('Deeply indented');
      expect(result.tasks[2]!.status).toBe('completed');
    });
  });

  describe('numbered list parsing', () => {
    it('should parse numbered lists with dot as pending tasks', () => {
      const content = `1. First task
2. Second task
3. Third task`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]!.name).toBe('First task');
      expect(result.tasks[0]!.status).toBe('pending');
      expect(result.tasks.every((t) => t.status === 'pending')).toBe(true);
      expect(result.totalNumbered).toBe(3);
    });

    it('should parse numbered lists with parenthesis', () => {
      const content = `1) Task A
2) Task B`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]!.name).toBe('Task A');
      expect(result.totalNumbered).toBe(2);
    });

    it('should handle indented numbered lists', () => {
      const content = `1. Top level
  2. Indented numbered`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[1]!.name).toBe('Indented numbered');
    });
  });

  describe('section tracking', () => {
    it('should track section names from h2 headers', () => {
      const content = `## Backend
- [ ] API 구현

## Frontend
- [ ] UI 구현`;

      const result = parsePlanTasks(content);

      expect(result.tasks[0]!.section).toBe('Backend');
      expect(result.tasks[1]!.section).toBe('Frontend');
    });

    it('should track section names from h3 headers', () => {
      const content = `### Phase 1
- [ ] Task A

### Phase 2
1. Task B`;

      const result = parsePlanTasks(content);

      expect(result.tasks[0]!.section).toBe('Phase 1');
      expect(result.tasks[1]!.section).toBe('Phase 2');
    });

    it('should use most recent section for nested tasks', () => {
      const content = `## Section A
### Subsection A1
- [ ] Task 1

## Section B
- [ ] Task 2`;

      const result = parsePlanTasks(content);

      expect(result.tasks[0]!.section).toBe('Subsection A1');
      expect(result.tasks[1]!.section).toBe('Section B');
    });
  });

  describe('line number tracking', () => {
    it('should track line numbers correctly', () => {
      const content = `# Title

## Tasks
- [ ] Task 1
- [x] Task 2
1. Task 3`;

      const result = parsePlanTasks(content);

      expect(result.tasks[0]!.lineNumber).toBe(4);
      expect(result.tasks[1]!.lineNumber).toBe(5);
      expect(result.tasks[2]!.lineNumber).toBe(6);
    });
  });

  describe('mixed content', () => {
    it('should handle mixed checkboxes and numbered lists', () => {
      const content = `# Plan

## Phase 1
- [ ] Pending checkbox
- [x] Done checkbox
1. Numbered task

## Phase 2
- [ ] Another task`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(4);
      expect(result.totalCheckboxes).toBe(3);
      expect(result.completedCheckboxes).toBe(1);
      expect(result.totalNumbered).toBe(1);
    });

    it('should ignore non-task content', () => {
      const content = `# Plan

Some regular text.

- Regular bullet point without checkbox
* Star bullet

## Tasks
- [ ] Actual task`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]!.name).toBe('Actual task');
    });

    it('should handle code blocks correctly (ignore tasks inside)', () => {
      const content = `## Tasks
- [ ] Real task

\`\`\`markdown
- [ ] Task in code block
\`\`\`

- [ ] Another real task`;

      const result = parsePlanTasks(content);

      // Should only parse tasks outside code blocks
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]!.name).toBe('Real task');
      expect(result.tasks[1]!.name).toBe('Another real task');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = parsePlanTasks('');

      expect(result.tasks).toHaveLength(0);
      expect(result.totalCheckboxes).toBe(0);
      expect(result.completedCheckboxes).toBe(0);
      expect(result.totalNumbered).toBe(0);
    });

    it('should handle content with no tasks', () => {
      const content = `# Plan

Just some text.

## Section

More text here.`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(0);
    });

    it('should trim task names', () => {
      const content = `- [ ]   Task with spaces
1.   Numbered with spaces   `;

      const result = parsePlanTasks(content);

      expect(result.tasks[0]!.name).toBe('Task with spaces');
      expect(result.tasks[1]!.name).toBe('Numbered with spaces');
    });

    it('should handle special characters in task names', () => {
      const content = `- [ ] Task with "quotes" and 'apostrophe'
- [ ] Task with: colons & ampersands
- [ ] Task with (parentheses) [brackets]`;

      const result = parsePlanTasks(content);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]!.name).toBe(`Task with "quotes" and 'apostrophe'`);
      expect(result.tasks[1]!.name).toBe('Task with: colons & ampersands');
    });
  });
});
