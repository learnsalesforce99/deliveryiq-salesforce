import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { JiraConfig, GetStoryParams, AddCommentParams, UpdateStatusParams, GetAttachmentsParams } from './types.js';
import { getStory, formatStoryResponse } from './tools/getStory.js';
import { addComment, formatCommentResponse } from './tools/addComment.js';
import { updateStatus, formatUpdateStatusResponse } from './tools/updateStatus.js';
import { getAttachments, formatAttachmentsResponse } from './tools/getAttachments.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Jira configuration
const jiraConfig: JiraConfig = {
  baseUrl: process.env.JIRA_BASE_URL!,
  email: process.env.JIRA_EMAIL!,
  apiToken: process.env.JIRA_API_TOKEN!,
  projectKey: process.env.JIRA_PROJECT_KEY!,
};

// Create MCP server
const server = new Server(
  {
    name: 'jira-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'jira_get_story',
        description: 'Fetch a Jira user story by issue key (e.g., SCRUM-1). Returns complete story details including summary, description, status, priority, and assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'The Jira issue key (e.g., SCRUM-1, SCRUM-123)',
            },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue. Useful for posting progress updates, build status, or deployment information.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'The Jira issue key (e.g., SCRUM-1)',
            },
            comment: {
              type: 'string',
              description: 'The comment text to add to the issue',
            },
          },
          required: ['issueKey', 'comment'],
        },
      },
      {
        name: 'jira_update_status',
        description: 'Update the status/workflow of a Jira issue by transitioning it to a new state (e.g., "In Progress", "Done", "In Review"). Automatically finds the correct transition ID.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'The Jira issue key (e.g., SCRUM-1)',
            },
            status: {
              type: 'string',
              description: 'The target status name (e.g., "In Progress", "Done", "In Review", "Draft")',
            },
          },
          required: ['issueKey', 'status'],
        },
      },
      {
        name: 'jira_get_attachments',
        description: 'Get all attachments (files, PDFs, images, documents) attached to a Jira issue. Returns filename, type, size, and download URL for each attachment.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: 'The Jira issue key (e.g., SCRUM-1)',
            },
          },
          required: ['issueKey'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'jira_get_story': {
        const params = args as unknown as GetStoryParams;
        const issue = await getStory(jiraConfig, params);
        const formattedResponse = formatStoryResponse(issue);
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
      }

      case 'jira_add_comment': {
        const params = args as unknown as AddCommentParams;
        const comment = await addComment(jiraConfig, params);
        const formattedResponse = formatCommentResponse(comment);
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
      }

      case 'jira_update_status': {
        const params = args as unknown as UpdateStatusParams;
        const result = await updateStatus(jiraConfig, params);
        const formattedResponse = formatUpdateStatusResponse(result);
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
      }

      case 'jira_get_attachments': {
        const params = args as unknown as GetAttachmentsParams;
        const attachments = await getAttachments(jiraConfig, params);
        const formattedResponse = formatAttachmentsResponse(params.issueKey, attachments);
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
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
  console.error('Jira MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
