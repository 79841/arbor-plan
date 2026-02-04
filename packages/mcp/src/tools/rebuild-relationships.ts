import fs from 'fs-extra';
import path from 'path';
import {
  generatePlanId,
  generateConnectionId,
  getDateTimeString,
  readYamlFile,
  writeYamlFile,
  readMarkdownFile,
  writeMarkdownFile,
  toLogicalFeaturePath,
  type Mappings,
  type LinkedPlan,
  type TargetType,
  type Connections,
  type NodeConnection,
  type Task,
  type Meta,
} from '@arbor-plan/core';

// ===== Input/Output Types =====

export interface RebuildRelationshipsInput {
  /** connections.yaml 재구축 여부 (기본: false) */
  rebuildConnections?: boolean;
  /** 잘못된 plan_ref 수정 여부 (기본: false) */
  fixInvalidPlanRefs?: boolean;
  /** 누락된 arbor_plan_id 추가 여부 (기본: false) */
  fixMissingPlanIds?: boolean;
  /** 미리보기 모드 (기본: true) */
  dryRun?: boolean;
}

export interface DiscoveredPlan {
  id: string | null;
  localPath: string;
  parentType: TargetType;
  parentPath: string;
  inMappings: boolean;
}

export interface DiscoveredTask {
  id: string;
  name: string;
  planRef: string | undefined;
  localPath: string;
  parentType: TargetType;
  parentPath: string;
}

export interface DiscoveredNode {
  type: string;
  id: string;
  path: string;
  physicalPath: string;
}

interface ScanResult {
  nodes: DiscoveredNode[];
  plans: Array<{
    id: string | null;
    localPath: string;
    parentType: TargetType;
    parentPath: string;
    fileName: string;
  }>;
  tasks: DiscoveredTask[];
}

export interface RebuildRelationshipsResult {
  success: boolean;
  summary: {
    plansScanned: number;
    tasksScanned: number;
    nodesScanned: number;
    connectionsBuilt: number;
  };
  discoveredPlans: DiscoveredPlan[];
  issues: {
    untrackedPlans: Array<{ localPath: string; suggestedId: string }>;
    missingPlans: Array<{ id: string; expectedPath: string }>;
    unlinkedButExist: Array<{ id: string; source: string; foundAt: string }>;
    missingPlanIds: Array<{ localPath: string; generatedId?: string }>;
    invalidPlanRefs: Array<{
      taskId: string;
      taskPath: string;
      invalidPlanRef: string;
      action?: 'removed' | 'kept';
    }>;
    orphanedTasks: Array<{
      taskId: string;
      taskName: string;
      missingPlanRef: string;
    }>;
  };
  changes?: {
    mappingsUpdated: boolean;
    connectionsUpdated: boolean;
    plansFixed: number;
    tasksFixed: number;
  };
  error?: { code: string; message: string };
}

// ===== Scanning Functions =====

async function scanArborDirectory(arborRoot: string): Promise<ScanResult> {
  const result: ScanResult = {
    nodes: [],
    plans: [],
    tasks: [],
  };

  for (const rootType of ['features', 'config', 'infra'] as const) {
    const rootDir = path.join(arborRoot, rootType);
    if (!(await fs.pathExists(rootDir))) continue;

    await scanNodeDirectory(arborRoot, rootDir, rootType, '', result);
  }

  return result;
}

async function scanNodeDirectory(
  arborRoot: string,
  dir: string,
  nodeType: string,
  parentLogicalPath: string,
  result: ScanResult
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip special directories
    if (['plans', 'tasks', 'bugs', 'docs', 'features'].includes(entry.name)) continue;

    const nodePath = path.join(dir, entry.name);
    const metaPath = path.join(nodePath, '_meta.yaml');

    if (!(await fs.pathExists(metaPath))) continue;

    let meta: Meta;
    try {
      meta = await readYamlFile<Meta>(metaPath);
    } catch {
      continue;
    }

    const logicalPath = parentLogicalPath
      ? `${parentLogicalPath}/${entry.name}`
      : entry.name;

    result.nodes.push({
      type: meta.type,
      id: meta.id,
      path: logicalPath,
      physicalPath: path.relative(arborRoot, nodePath),
    });

    // Scan plans
    await scanPlansDirectory(arborRoot, nodePath, meta.type as TargetType, logicalPath, result);

    // Scan tasks
    await scanTasksDirectory(arborRoot, nodePath, meta.type as TargetType, logicalPath, result);

    // Recursively scan child features (for feature nodes)
    if (meta.type === 'feature') {
      const featuresDir = path.join(nodePath, 'features');
      if (await fs.pathExists(featuresDir)) {
        await scanNodeDirectory(arborRoot, featuresDir, 'feature', logicalPath, result);
      }

      // Scan subnodes (refactor, test, security, performance)
      for (const subType of ['refactor', 'test', 'security', 'performance'] as const) {
        const subDir = path.join(nodePath, subType);
        if (await fs.pathExists(subDir)) {
          const subMeta = path.join(subDir, '_meta.yaml');
          if (await fs.pathExists(subMeta)) {
            await scanSubNodeDirectory(arborRoot, subDir, subType, logicalPath, result);
          }
        }
      }
    }
  }
}

async function scanSubNodeDirectory(
  arborRoot: string,
  dir: string,
  subType: TargetType,
  parentLogicalPath: string,
  result: ScanResult
): Promise<void> {
  const metaPath = path.join(dir, '_meta.yaml');
  if (!(await fs.pathExists(metaPath))) return;

  let meta: Meta;
  try {
    meta = await readYamlFile<Meta>(metaPath);
  } catch {
    return;
  }

  result.nodes.push({
    type: meta.type,
    id: meta.id,
    path: `${parentLogicalPath}/${subType}`,
    physicalPath: path.relative(arborRoot, dir),
  });

  // Scan plans and tasks in subnode
  await scanPlansDirectory(arborRoot, dir, subType, parentLogicalPath, result);
  await scanTasksDirectory(arborRoot, dir, subType, parentLogicalPath, result);
}

async function scanPlansDirectory(
  arborRoot: string,
  nodeDir: string,
  parentType: TargetType,
  parentLogicalPath: string,
  result: ScanResult
): Promise<void> {
  const plansDir = path.join(nodeDir, 'plans');
  if (!(await fs.pathExists(plansDir))) return;

  let planFiles: string[];
  try {
    planFiles = await fs.readdir(plansDir);
  } catch {
    return;
  }

  for (const planFile of planFiles) {
    if (!planFile.endsWith('.md')) continue;

    const planPath = path.join(plansDir, planFile);
    try {
      const { frontmatter } = await readMarkdownFile<{ arbor_plan_id?: string }>(planPath);

      result.plans.push({
        id: frontmatter.arbor_plan_id || null,
        localPath: path.relative(arborRoot, planPath),
        parentType,
        parentPath: parentLogicalPath,
        fileName: planFile,
      });
    } catch {
      // Skip files that can't be parsed
      result.plans.push({
        id: null,
        localPath: path.relative(arborRoot, planPath),
        parentType,
        parentPath: parentLogicalPath,
        fileName: planFile,
      });
    }
  }
}

async function scanTasksDirectory(
  arborRoot: string,
  nodeDir: string,
  parentType: TargetType,
  parentLogicalPath: string,
  result: ScanResult
): Promise<void> {
  const tasksDir = path.join(nodeDir, 'tasks');
  if (!(await fs.pathExists(tasksDir))) return;

  let taskFiles: string[];
  try {
    taskFiles = await fs.readdir(tasksDir);
  } catch {
    return;
  }

  for (const taskFile of taskFiles) {
    if (!taskFile.endsWith('.md')) continue;

    const taskPath = path.join(tasksDir, taskFile);
    try {
      const { frontmatter } = await readMarkdownFile<Task>(taskPath);

      result.tasks.push({
        id: frontmatter.id,
        name: frontmatter.name,
        planRef: frontmatter.plan_ref,
        localPath: path.relative(arborRoot, taskPath),
        parentType,
        parentPath: parentLogicalPath,
      });
    } catch {
      // Skip files that can't be parsed
    }
  }
}

// ===== Main Function =====

export async function rebuildRelationships(
  arborRoot: string,
  input: RebuildRelationshipsInput = {}
): Promise<RebuildRelationshipsResult> {
  const {
    rebuildConnections = false,
    fixInvalidPlanRefs = false,
    fixMissingPlanIds = false,
    dryRun = true,
  } = input;

  // Check if arbor is initialized
  const mappingsPath = path.join(arborRoot, 'mappings.yaml');
  if (!(await fs.pathExists(mappingsPath))) {
    return {
      success: false,
      summary: { plansScanned: 0, tasksScanned: 0, nodesScanned: 0, connectionsBuilt: 0 },
      discoveredPlans: [],
      issues: {
        untrackedPlans: [],
        missingPlans: [],
        unlinkedButExist: [],
        missingPlanIds: [],
        invalidPlanRefs: [],
        orphanedTasks: [],
      },
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Arbor is not initialized. Run arbor_init first.',
      },
    };
  }

  // 1. Scan Phase
  const scanResult = await scanArborDirectory(arborRoot);

  // 2. Load current mappings
  const mappings = await readYamlFile<Mappings>(mappingsPath);

  // Build sets for comparison
  const linkedLocalPaths = new Set(mappings.linked.map((l) => l.local));
  const linkedIds = new Set(mappings.linked.map((l) => l.id));
  const validPlanIds = new Set(scanResult.plans.filter((p) => p.id).map((p) => p.id as string));

  // 3. Detect issues
  const issues: RebuildRelationshipsResult['issues'] = {
    untrackedPlans: [],
    missingPlans: [],
    unlinkedButExist: [],
    missingPlanIds: [],
    invalidPlanRefs: [],
    orphanedTasks: [],
  };

  // Discovered plans with mapping status
  const discoveredPlans: DiscoveredPlan[] = scanResult.plans.map((p) => ({
    id: p.id,
    localPath: p.localPath,
    parentType: p.parentType,
    parentPath: p.parentPath,
    inMappings: linkedLocalPaths.has(p.localPath),
  }));

  // Untracked plans: exist in .arbor but not in mappings.linked
  for (const plan of scanResult.plans) {
    if (!linkedLocalPaths.has(plan.localPath)) {
      issues.untrackedPlans.push({
        localPath: plan.localPath,
        suggestedId: plan.id || generatePlanId(),
      });
    }
  }

  // Missing plans: in mappings.linked but file doesn't exist
  for (const linkedPlan of mappings.linked) {
    const fullPath = path.join(arborRoot, linkedPlan.local);
    if (!(await fs.pathExists(fullPath))) {
      issues.missingPlans.push({
        id: linkedPlan.id,
        expectedPath: linkedPlan.local,
      });
    }
  }

  // Unlinked but exist: in mappings.unlinked but actually found in .arbor
  const discoveredLocalPaths = new Set(scanResult.plans.map((p) => p.localPath));
  for (const unlinked of mappings.unlinked) {
    // Check if the unlinked plan's content might have been copied to .arbor
    // This is a heuristic based on filename matching
    const sourceFileName = path.basename(unlinked.source, '.md');
    const matchingPlan = scanResult.plans.find((p) =>
      p.fileName.includes(sourceFileName) || p.localPath.includes(sourceFileName)
    );
    if (matchingPlan) {
      issues.unlinkedButExist.push({
        id: unlinked.id,
        source: unlinked.source,
        foundAt: matchingPlan.localPath,
      });
    }
  }

  // Missing plan IDs
  for (const plan of scanResult.plans) {
    if (!plan.id) {
      issues.missingPlanIds.push({
        localPath: plan.localPath,
        generatedId: fixMissingPlanIds ? generatePlanId() : undefined,
      });
    }
  }

  // Invalid plan refs
  for (const task of scanResult.tasks) {
    if (task.planRef && !validPlanIds.has(task.planRef) && !linkedIds.has(task.planRef)) {
      issues.invalidPlanRefs.push({
        taskId: task.id,
        taskPath: task.localPath,
        invalidPlanRef: task.planRef,
        action: fixInvalidPlanRefs ? 'removed' : 'kept',
      });

      // Also mark as orphaned task
      issues.orphanedTasks.push({
        taskId: task.id,
        taskName: task.name,
        missingPlanRef: task.planRef,
      });
    }
  }

  // 4. Apply fixes if not dry run
  const changes = {
    mappingsUpdated: false,
    connectionsUpdated: false,
    plansFixed: 0,
    tasksFixed: 0,
  };

  if (!dryRun) {
    // Fix missing plan IDs
    if (fixMissingPlanIds) {
      for (const issue of issues.missingPlanIds) {
        if (issue.generatedId) {
          const fullPath = path.join(arborRoot, issue.localPath);
          try {
            const { frontmatter, content } = await readMarkdownFile<Record<string, unknown>>(fullPath);
            frontmatter.arbor_plan_id = issue.generatedId;
            await writeMarkdownFile(fullPath, frontmatter, content);
            changes.plansFixed++;
          } catch {
            // Skip on error
          }
        }
      }
    }

    // Fix invalid plan refs
    if (fixInvalidPlanRefs) {
      for (const issue of issues.invalidPlanRefs) {
        const fullPath = path.join(arborRoot, issue.taskPath);
        try {
          const { frontmatter, content } = await readMarkdownFile<Task & Record<string, unknown>>(fullPath);
          delete frontmatter.plan_ref;
          await writeMarkdownFile(fullPath, frontmatter, content);
          changes.tasksFixed++;
        } catch {
          // Skip on error
        }
      }
    }

    // Rebuild mappings
    if (issues.untrackedPlans.length > 0 || issues.missingPlans.length > 0 || issues.unlinkedButExist.length > 0) {
      // Remove missing plans from linked
      const validLinked = mappings.linked.filter((l) => {
        const fullPath = path.join(arborRoot, l.local);
        return fs.pathExistsSync(fullPath);
      });

      // Add untracked plans to linked
      for (const untracked of issues.untrackedPlans) {
        const plan = scanResult.plans.find((p) => p.localPath === untracked.localPath);
        if (plan) {
          // Check if already in linked (by local path)
          if (!validLinked.some((l) => l.local === plan.localPath)) {
            const newLinkedPlan: LinkedPlan = {
              id: plan.id || untracked.suggestedId,
              source: 'arbor_created',
              local: plan.localPath,
              target_type: plan.parentType,
              target_path: plan.parentPath,
              name: plan.fileName.replace('.md', ''),
              linked_at: getDateTimeString(),
              source_exists: false,
            };
            validLinked.push(newLinkedPlan);
          }
        }
      }

      // Remove unlinked entries that were found in .arbor
      const unlinkedToRemoveIds = new Set(issues.unlinkedButExist.map((u) => u.id));
      const validUnlinked = mappings.unlinked.filter((u) => !unlinkedToRemoveIds.has(u.id));

      // Update mappings
      mappings.linked = validLinked;
      mappings.unlinked = validUnlinked;
      await writeYamlFile(mappingsPath, mappings);
      changes.mappingsUpdated = true;
    }

    // Rebuild connections
    if (rebuildConnections) {
      const connections = buildConnections(scanResult, validPlanIds);
      const connectionsPath = path.join(arborRoot, 'connections.yaml');
      const connectionsData: Connections = {
        version: 1,
        connections,
      };
      await writeYamlFile(connectionsPath, connectionsData);
      changes.connectionsUpdated = true;
    }
  }

  return {
    success: true,
    summary: {
      plansScanned: scanResult.plans.length,
      tasksScanned: scanResult.tasks.length,
      nodesScanned: scanResult.nodes.length,
      connectionsBuilt: rebuildConnections && !dryRun
        ? buildConnections(scanResult, validPlanIds).length
        : 0,
    },
    discoveredPlans,
    issues,
    changes: dryRun ? undefined : changes,
  };
}

// ===== Connections Builder =====

function buildConnections(
  scanResult: ScanResult,
  validPlanIds: Set<string>
): NodeConnection[] {
  const connections: NodeConnection[] = [];

  // 1. Parent-child relationships between nodes
  for (const node of scanResult.nodes) {
    const pathSegments = node.path.split('/');
    if (pathSegments.length > 1) {
      const parentPath = pathSegments.slice(0, -1).join('/');
      const parentNode = scanResult.nodes.find((n) => n.path === parentPath);
      if (parentNode) {
        connections.push({
          id: generateConnectionId(),
          source_id: parentNode.id,
          source_path: parentNode.path,
          target_id: node.id,
          target_path: node.path,
          created_at: getDateTimeString(),
        });
      }
    }
  }

  // 2. Node-Plan relationships
  for (const plan of scanResult.plans) {
    if (!plan.id) continue;

    const parentNode = scanResult.nodes.find(
      (n) => n.path === plan.parentPath || n.path === `${plan.parentPath}/${plan.parentType}`
    );
    if (parentNode) {
      connections.push({
        id: generateConnectionId(),
        source_id: parentNode.id,
        source_path: parentNode.path,
        target_id: plan.id,
        target_path: plan.localPath,
        created_at: getDateTimeString(),
      });
    }
  }

  // 3. Task-Plan references
  for (const task of scanResult.tasks) {
    if (task.planRef && validPlanIds.has(task.planRef)) {
      const plan = scanResult.plans.find((p) => p.id === task.planRef);
      if (plan) {
        connections.push({
          id: generateConnectionId(),
          source_id: task.planRef,
          source_path: plan.localPath,
          target_id: task.id,
          target_path: task.localPath,
          created_at: getDateTimeString(),
        });
      }
    }
  }

  return connections;
}
