import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import {
  GitHubConfig,
  CreateBranchParams,
  CommitFilesParams,
  CreatePRParams,
  TriggerWorkflowParams,
  GetWorkflowStatusParams,
} from './types.js';
import { createBranch, formatCreateBranchResponse } from './tools/createBranch.js';
import { commitFiles, formatCommitFilesResponse } from './tools/commitFiles.js';
import { createPR, formatCreatePRResponse } from './tools/createPR.js';
import { triggerWorkflow, formatTriggerWorkflowResponse } from './tools/triggerWorkflow.js';
import { getWorkflowStatus, formatWorkflowStatusResponse } from './tools/getWorkflowStatus.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// GitHub configuration
const githubConfig: GitHubConfig = {
  token: process.env.GITHUB_TOKEN!,
  owner: process.env.GITHUB_OWNER!,
  repo: process.env.GITHUB_REPO!,
};

// Create MCP server
const server = new Server(
  { name: 'github-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'github_create_branch',
        description: 'Create a new Git branch from a base branch (default: main). Used to create feature branches like feature/SCRUM-123.',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: {
              type: 'string',
              description: 'Name of the new branch (e.g., feature/SCRUM-123)',
            },
            baseBranch: {
              type: 'string',
              description: 'Base branch to create from (default: main)',
            },
          },
          required: ['branchName'],
        },
      },
      {
        name: 'github_commit_files',
        description: 'Commit one or more files to a GitHub branch. Used to push generated Salesforce code (Apex classes, LWC components, etc.) to a feature branch.',
        inputSchema: {
          type: 'object',
          properties: {
            branch: {
              type: 'string',
              description: 'Target branch name (e.g., feature/SCRUM-123)',
            },
            message: {
              type: 'string',
              description: 'Commit message (e.g., "feat(SCRUM-123): Add AccountService class")',
            },
            files: {
              type: 'array',
              description: 'Array of files to commit',
              items: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description: 'File path in repo (e.g., force-app/main/default/classes/AccountService.cls)',
                  },
                  content: {
                    type: 'string',
                    description: 'Full file content as a string',
                  },
                },
                required: ['path', 'content'],
              },
            },
          },
          required: ['branch', 'message', 'files'],
        },
      },
      {
        name: 'github_create_pr',
        description: 'Create a Pull Request from a feature branch into main. Include compliance report and test results in the PR body.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'PR title (e.g., "SCRUM-123: Implement account management feature")',
            },
            head: {
              type: 'string',
              description: 'Source branch (e.g., feature/SCRUM-123)',
            },
            base: {
              type: 'string',
              description: 'Target branch (default: main)',
            },
            body: {
              type: 'string',
              description: 'PR description — include story summary, compliance report, test coverage',
            },
          },
          required: ['title', 'head'],
        },
      },
      {
        name: 'github_trigger_workflow',
        description: 'Trigger a GitHub Actions workflow via workflow_dispatch. Used to kick off Salesforce deployment pipelines.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: {
              type: 'string',
              description: 'Workflow filename (e.g., salesforce-deploy.yml)',
            },
            ref: {
              type: 'string',
              description: 'Branch or tag to run the workflow on (e.g., feature/SCRUM-123)',
            },
            inputs: {
              type: 'object',
              description: 'Optional workflow_dispatch inputs (e.g., {"environment": "sandbox", "runTests": "true"})',
            },
          },
          required: ['workflowId', 'ref'],
        },
      },
      {
        name: 'github_get_workflow_status',
        description: 'Get the current status and conclusion of a GitHub Actions workflow run. Use to monitor CI/CD pipeline progress.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'number',
              description: 'The workflow run ID (returned by github_trigger_workflow or visible in GitHub Actions URL)',
            },
          },
          required: ['runId'],
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
      case 'github_create_branch': {
        const params = args as unknown as CreateBranchParams;
        const result = await createBranch(githubConfig, params);
        return { content: [{ type: 'text', text: formatCreateBranchResponse(result) }] };
      }

      case 'github_commit_files': {
        const params = args as unknown as CommitFilesParams;
        const result = await commitFiles(githubConfig, params);
        return { content: [{ type: 'text', text: formatCommitFilesResponse(result) }] };
      }

      case 'github_create_pr': {
        const params = args as unknown as CreatePRParams;
        const result = await createPR(githubConfig, params);
        return { content: [{ type: 'text', text: formatCreatePRResponse(result) }] };
      }

      case 'github_trigger_workflow': {
        const params = args as unknown as TriggerWorkflowParams;
        const result = await triggerWorkflow(githubConfig, params);
        return { content: [{ type: 'text', text: formatTriggerWorkflowResponse(result) }] };
      }

      case 'github_get_workflow_status': {
        const params = args as unknown as GetWorkflowStatusParams;
        const result = await getWorkflowStatus(githubConfig, params);
        return { content: [{ type: 'text', text: formatWorkflowStatusResponse(result) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
