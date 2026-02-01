import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import fs from 'fs-extra';

import {
  init,
  createFeature,
  createConfig,
  createInfra,
  createRefactor,
  createTest,
  createSecurity,
  createPerformance,
  createTask,
  createBug,
  createDoc,
  setPendingContext,
  listUnlinked,
  linkPlan,
  getStructure,
  listTasks,
} from './tools/index.js';
import { AutoLinker } from './linker/auto-linker.js';

export async function createMcpServer() {
  const server = new Server(
    {
      name: 'arbor',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const cwd = process.cwd();
  const arborRoot = process.env.ARBOR_ROOT
    ? path.resolve(cwd, process.env.ARBOR_ROOT)
    : path.join(cwd, '.arbor');

  // Start auto linker if arbor is initialized
  let autoLinker: AutoLinker | null = null;
  if (await fs.pathExists(arborRoot)) {
    autoLinker = new AutoLinker({ arborRoot });
    autoLinker.start((event, data) => {
      console.error(`[Arbor] ${event}:`, data);
    });
  }

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'arbor_init',
          description: '프로젝트에 Arbor 구조 초기화',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: {
                type: 'string',
                description: '프로젝트 이름',
              },
              projectDescription: {
                type: 'string',
                description: '프로젝트 설명 (선택)',
              },
            },
            required: ['projectName'],
          },
        },
        {
          name: 'arbor_create_feature',
          description: 'Feature 노드 생성 (중첩 가능)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: '경로 (예: auth/social-login)',
              },
              name: {
                type: 'string',
                description: '표시 이름',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              status: {
                type: 'string',
                enum: ['planned', 'in_progress', 'completed', 'on_hold'],
                default: 'planned',
              },
            },
            required: ['path', 'name'],
          },
        },
        {
          name: 'arbor_create_config',
          description: 'Config 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: '경로' },
              name: { type: 'string', description: '표시 이름' },
              description: { type: 'string' },
              status: {
                type: 'string',
                enum: ['planned', 'in_progress', 'completed', 'on_hold'],
              },
            },
            required: ['path', 'name'],
          },
        },
        {
          name: 'arbor_create_infra',
          description: 'Infra 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: '경로' },
              name: { type: 'string', description: '표시 이름' },
              description: { type: 'string' },
              status: {
                type: 'string',
                enum: ['planned', 'in_progress', 'completed', 'on_hold'],
              },
            },
            required: ['path', 'name'],
          },
        },
        {
          name: 'arbor_create_refactor',
          description: 'Feature 하위에 Refactor 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: {
                type: 'string',
                description: '부모 feature 경로',
              },
              name: { type: 'string', description: '표시 이름' },
              description: { type: 'string' },
            },
            required: ['featurePath', 'name'],
          },
        },
        {
          name: 'arbor_create_test',
          description: 'Feature 하위에 Test 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: { type: 'string', description: '부모 feature 경로' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['featurePath', 'name'],
          },
        },
        {
          name: 'arbor_create_security',
          description: 'Feature 하위에 Security 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['featurePath', 'name'],
          },
        },
        {
          name: 'arbor_create_performance',
          description: 'Feature 하위에 Performance 노드 생성',
          inputSchema: {
            type: 'object',
            properties: {
              featurePath: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['featurePath', 'name'],
          },
        },
        {
          name: 'arbor_create_task',
          description: 'Task 생성',
          inputSchema: {
            type: 'object',
            properties: {
              parentType: {
                type: 'string',
                enum: ['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance'],
                description: '부모 노드 타입',
              },
              parentPath: {
                type: 'string',
                description: '부모 노드 경로',
              },
              name: { type: 'string', description: 'Task 이름' },
              description: { type: 'string', description: 'Task 설명' },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'blocked'],
                default: 'pending',
              },
              planRef: { type: 'string', description: '연결할 plan ID' },
            },
            required: ['parentType', 'parentPath', 'name'],
          },
        },
        {
          name: 'arbor_create_bug',
          description: 'Bug 생성',
          inputSchema: {
            type: 'object',
            properties: {
              parentType: {
                type: 'string',
                enum: ['feature', 'config', 'infra', 'test'],
              },
              parentPath: { type: 'string' },
              name: { type: 'string', description: 'Bug 이름' },
              description: { type: 'string' },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              status: {
                type: 'string',
                enum: ['open', 'in_progress', 'resolved', 'closed'],
                default: 'open',
              },
              relatedTask: { type: 'string', description: '관련 task ID' },
            },
            required: ['parentType', 'parentPath', 'name', 'severity'],
          },
        },
        {
          name: 'arbor_create_doc',
          description: 'Doc 생성',
          inputSchema: {
            type: 'object',
            properties: {
              parentType: {
                type: 'string',
                enum: ['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance'],
              },
              parentPath: { type: 'string' },
              name: { type: 'string', description: '문서 이름' },
              docType: {
                type: 'string',
                enum: ['architecture', 'api', 'guide', 'reference', 'decision'],
              },
              content: { type: 'string', description: '마크다운 본문' },
            },
            required: ['parentType', 'parentPath', 'name', 'docType'],
          },
        },
        {
          name: 'arbor_set_pending_context',
          description: 'Plan Mode 진입 전 연결 대상 등록',
          inputSchema: {
            type: 'object',
            properties: {
              targetType: {
                type: 'string',
                enum: ['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance'],
                description: '연결할 노드 타입',
              },
              targetPath: {
                type: 'string',
                description: '연결할 노드 경로',
              },
              name: {
                type: 'string',
                description: 'Plan 이름 (선택)',
              },
            },
            required: ['targetType', 'targetPath'],
          },
        },
        {
          name: 'arbor_list_unlinked',
          description: '미연결 Plan 목록 조회',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'arbor_link_plan',
          description: 'Plan 수동 연결',
          inputSchema: {
            type: 'object',
            properties: {
              planId: { type: 'string', description: 'unlinked plan ID' },
              targetType: {
                type: 'string',
                enum: ['feature', 'config', 'infra', 'refactor', 'test', 'security', 'performance'],
              },
              targetPath: { type: 'string', description: '연결할 노드 경로' },
              name: { type: 'string', description: 'Plan 이름' },
            },
            required: ['planId', 'targetType', 'targetPath'],
          },
        },
        {
          name: 'arbor_get_structure',
          description: '트리 구조 조회',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: '특정 경로만 조회 (선택)' },
              depth: { type: 'number', description: '조회 깊이 (선택)' },
            },
          },
        },
        {
          name: 'arbor_list_tasks',
          description: '상태별 Task 목록 조회',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'blocked'],
                description: '필터링할 상태 (선택)',
              },
              path: { type: 'string', description: '특정 경로 하위만' },
            },
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'arbor_init': {
          const result = await init(cwd, args as any);
          if (result.success && !autoLinker) {
            autoLinker = new AutoLinker({ arborRoot: result.path });
            autoLinker.start((event, data) => {
              console.error(`[Arbor] ${event}:`, data);
            });
          }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_feature': {
          const result = await createFeature(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_config': {
          const result = await createConfig(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_infra': {
          const result = await createInfra(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_refactor': {
          const result = await createRefactor(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_test': {
          const result = await createTest(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_security': {
          const result = await createSecurity(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_performance': {
          const result = await createPerformance(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_task': {
          const result = await createTask(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_bug': {
          const result = await createBug(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_create_doc': {
          const result = await createDoc(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_set_pending_context': {
          const result = await setPendingContext(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_list_unlinked': {
          const result = await listUnlinked(arborRoot);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_link_plan': {
          const result = await linkPlan(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_get_structure': {
          const result = await getStructure(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'arbor_list_tasks': {
          const result = await listTasks(arborRoot, args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

export async function runServer() {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Arbor MCP server running on stdio');
}
