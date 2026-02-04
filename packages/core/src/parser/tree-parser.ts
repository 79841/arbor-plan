import fs from 'fs/promises';
import path from 'path';
import type { TreeData, TreeNode, Plan } from '../types/node.js';
import type { Meta } from '../schema/meta.js';
import type { Task } from '../schema/task.js';
import type { Bug } from '../schema/bug.js';
import type { Doc } from '../schema/doc.js';
import type { Manifest } from '../schema/manifest.js';
import type { Mappings } from '../schema/mappings.js';
import { readYamlFile } from './yaml-parser.js';
import { readMarkdownFile } from './markdown-parser.js';
import { toLogicalFeaturePath } from '../utils/path.js';
import { parsePlanTasks } from './plan-task-parser.js';

export class TreeParser {
  private arborRoot: string;

  constructor(arborRoot: string) {
    this.arborRoot = arborRoot;
  }

  async parse(): Promise<TreeData> {
    const manifest = await this.loadManifest();
    const mappings = await this.loadMappings();

    const root: TreeNode = {
      type: 'project',
      id: manifest.project.id,
      name: manifest.project.name,
      path: '',
      children: [],
    };

    // Parse features
    const featuresDir = path.join(this.arborRoot, 'features');
    if (await this.exists(featuresDir)) {
      const features = await this.parseDirectory(featuresDir, 'feature');
      root.children!.push(...features);
    }

    // Parse config
    const configDir = path.join(this.arborRoot, 'config');
    if (await this.exists(configDir)) {
      const configs = await this.parseDirectory(configDir, 'config');
      root.children!.push(...configs);
    }

    // Parse infra
    const infraDir = path.join(this.arborRoot, 'infra');
    if (await this.exists(infraDir)) {
      const infras = await this.parseDirectory(infraDir, 'infra');
      root.children!.push(...infras);
    }

    return {
      root,
      mappings: {
        linked: (mappings.linked || []).map((l) => ({
          id: l.id,
          source: l.source,
          local: l.local,
          name: l.name,
        })),
        unlinked: (mappings.unlinked || []).map((u) => ({
          id: u.id,
          source: u.source,
          preview: u.preview,
        })),
      },
    };
  }

  private async parseDirectory(
    dir: string,
    expectedType: string
  ): Promise<TreeNode[]> {
    const nodes: TreeNode[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const nodePath = path.join(dir, entry.name);
      const metaPath = path.join(nodePath, '_meta.yaml');

      if (!(await this.exists(metaPath))) continue;

      const meta = await readYamlFile<Meta>(metaPath);
      const relativePath = path.relative(
        path.join(this.arborRoot, this.getBaseDir(expectedType)),
        nodePath
      );

      const node: TreeNode = {
        type: meta.type,
        id: meta.id,
        name: meta.name,
        path: relativePath,
        status: meta.status,
        children: [],
        plans: [],
        tasks: [],
        bugs: [],
        docs: [],
      };

      // Parse plans
      const plansDir = path.join(nodePath, 'plans');
      if (await this.exists(plansDir)) {
        node.plans = await this.parsePlans(plansDir);
      }

      // Parse tasks
      const tasksDir = path.join(nodePath, 'tasks');
      if (await this.exists(tasksDir)) {
        node.tasks = await this.parseTasks(tasksDir);
      }

      // Parse bugs
      const bugsDir = path.join(nodePath, 'bugs');
      if (await this.exists(bugsDir)) {
        node.bugs = await this.parseBugs(bugsDir);
      }

      // Parse docs
      const docsDir = path.join(nodePath, 'docs');
      if (await this.exists(docsDir)) {
        node.docs = await this.parseDocs(docsDir);
      }

      // Parse child features (for feature type)
      if (meta.type === 'feature') {
        const childFeatures = await this.parseChildFeatures(nodePath);
        node.children!.push(...childFeatures);

        // Parse special subdirectories
        for (const subType of ['refactor', 'test', 'security', 'performance']) {
          const subDir = path.join(nodePath, subType);
          if (await this.exists(subDir)) {
            const subMeta = path.join(subDir, '_meta.yaml');
            if (await this.exists(subMeta)) {
              const subNodes = await this.parseSubNode(subDir, subType);
              if (subNodes) {
                node.children!.push(subNodes);
              }
            }
          }
        }
      }

      nodes.push(node);
    }

    return nodes;
  }

  private async parseChildFeatures(parentDir: string): Promise<TreeNode[]> {
    const children: TreeNode[] = [];

    // Look for features/ subdirectory (new structure)
    const featuresDir = path.join(parentDir, 'features');
    if (!(await this.exists(featuresDir))) {
      return children;
    }

    const entries = await fs.readdir(featuresDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const childPath = path.join(featuresDir, entry.name);
      const metaPath = path.join(childPath, '_meta.yaml');

      if (!(await this.exists(metaPath))) continue;

      const meta = await readYamlFile<Meta>(metaPath);
      if (meta.type !== 'feature') continue;

      const node = await this.parseFeatureNode(childPath, meta);
      children.push(node);
    }

    return children;
  }

  private async parseFeatureNode(nodePath: string, meta: Meta): Promise<TreeNode> {
    // Calculate physical relative path from features/ root
    const physicalRelativePath = path.relative(
      path.join(this.arborRoot, 'features'),
      nodePath
    );
    // Convert physical path to logical path (remove 'features' segments)
    const logicalPath = toLogicalFeaturePath(physicalRelativePath);

    const node: TreeNode = {
      type: meta.type,
      id: meta.id,
      name: meta.name,
      path: logicalPath,
      status: meta.status,
      children: [],
      plans: [],
      tasks: [],
      bugs: [],
      docs: [],
    };

    // Parse plans, tasks, bugs, docs
    const plansDir = path.join(nodePath, 'plans');
    if (await this.exists(plansDir)) {
      node.plans = await this.parsePlans(plansDir);
    }

    const tasksDir = path.join(nodePath, 'tasks');
    if (await this.exists(tasksDir)) {
      node.tasks = await this.parseTasks(tasksDir);
    }

    const bugsDir = path.join(nodePath, 'bugs');
    if (await this.exists(bugsDir)) {
      node.bugs = await this.parseBugs(bugsDir);
    }

    const docsDir = path.join(nodePath, 'docs');
    if (await this.exists(docsDir)) {
      node.docs = await this.parseDocs(docsDir);
    }

    // Parse child features recursively
    const childFeatures = await this.parseChildFeatures(nodePath);
    node.children!.push(...childFeatures);

    // Parse special subdirectories
    for (const subType of ['refactor', 'test', 'security', 'performance']) {
      const subDir = path.join(nodePath, subType);
      if (await this.exists(subDir)) {
        const subMeta = path.join(subDir, '_meta.yaml');
        if (await this.exists(subMeta)) {
          const subNodes = await this.parseSubNode(subDir, subType);
          if (subNodes) {
            node.children!.push(subNodes);
          }
        }
      }
    }

    return node;
  }

  private async parseSubNode(dir: string, type: string): Promise<TreeNode | null> {
    const metaPath = path.join(dir, '_meta.yaml');
    if (!(await this.exists(metaPath))) return null;

    const meta = await readYamlFile<Meta>(metaPath);

    const node: TreeNode = {
      type: meta.type,
      id: meta.id,
      name: meta.name,
      path: type,
      status: meta.status,
      plans: [],
      tasks: [],
      bugs: [],
      docs: [],
    };

    const plansDir = path.join(dir, 'plans');
    if (await this.exists(plansDir)) {
      node.plans = await this.parsePlans(plansDir);
    }

    const tasksDir = path.join(dir, 'tasks');
    if (await this.exists(tasksDir)) {
      node.tasks = await this.parseTasks(tasksDir);
    }

    const bugsDir = path.join(dir, 'bugs');
    if (await this.exists(bugsDir)) {
      node.bugs = await this.parseBugs(bugsDir);
    }

    const docsDir = path.join(dir, 'docs');
    if (await this.exists(docsDir)) {
      node.docs = await this.parseDocs(docsDir);
    }

    return node;
  }

  private async parsePlans(dir: string): Promise<Plan[]> {
    const plans: Plan[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const filePath = path.join(dir, entry.name);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter to get arbor_plan_id
      const { frontmatter } = await readMarkdownFile<{ arbor_plan_id?: string }>(filePath);
      const planId = frontmatter.arbor_plan_id || path.basename(entry.name, '.md');

      // Parse tasks from plan content
      const parseResult = parsePlanTasks(content);

      plans.push({
        id: planId,
        name: path.basename(entry.name, '.md'),
        path: filePath,
        content,
        linked_at: new Date().toISOString(),
        parsedTasks: parseResult.tasks.map((t) => ({
          name: t.name,
          status: t.status,
          section: t.section,
        })),
        taskStats: {
          total: parseResult.tasks.length,
          completed: parseResult.completedCheckboxes,
          pending:
            parseResult.tasks.length - parseResult.completedCheckboxes,
        },
      });
    }

    return plans;
  }

  private async parseTasks(dir: string): Promise<Task[]> {
    const tasks: Task[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const filePath = path.join(dir, entry.name);
      const { frontmatter } = await readMarkdownFile<Task>(filePath);
      tasks.push(frontmatter);
    }

    return tasks;
  }

  private async parseBugs(dir: string): Promise<Bug[]> {
    const bugs: Bug[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const filePath = path.join(dir, entry.name);
      const { frontmatter } = await readMarkdownFile<Bug>(filePath);
      bugs.push(frontmatter);
    }

    return bugs;
  }

  private async parseDocs(dir: string): Promise<Doc[]> {
    const docs: Doc[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const filePath = path.join(dir, entry.name);
      const { frontmatter } = await readMarkdownFile<Doc>(filePath);
      docs.push(frontmatter);
    }

    return docs;
  }

  private getBaseDir(type: string): string {
    switch (type) {
      case 'feature':
        return 'features';
      case 'config':
        return 'config';
      case 'infra':
        return 'infra';
      default:
        return 'features';
    }
  }

  private async loadManifest(): Promise<Manifest> {
    const manifestPath = path.join(this.arborRoot, 'manifest.yaml');
    return readYamlFile<Manifest>(manifestPath);
  }

  private async loadMappings(): Promise<Mappings> {
    const mappingsPath = path.join(this.arborRoot, 'mappings.yaml');
    if (!(await this.exists(mappingsPath))) {
      return { version: 1, project_id: '', linked: [], unlinked: [] };
    }
    return readYamlFile<Mappings>(mappingsPath);
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  getAllTasks(tree: TreeData): Task[] {
    const tasks: Task[] = [];

    const collectTasks = (node: TreeNode) => {
      if (node.tasks) {
        tasks.push(...node.tasks);
      }
      if (node.children) {
        for (const child of node.children) {
          collectTasks(child);
        }
      }
    };

    collectTasks(tree.root);
    return tasks;
  }
}
