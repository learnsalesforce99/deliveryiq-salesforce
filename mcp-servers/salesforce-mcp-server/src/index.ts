import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import {
  SalesforceConfig,
  RetrieveMetadataParams,
  ValidateDeploymentParams,
  RunTestsParams,
  DeployParams,
  QueryParams,
} from './types.js';
import { retrieveMetadata, formatRetrieveMetadataResponse } from './tools/retrieveMetadata.js';
import { validateDeployment, formatValidateDeploymentResponse } from './tools/validateDeployment.js';
import { runTests, formatRunTestsResponse } from './tools/runTests.js';
import { deploy, formatDeployResponse } from './tools/deploy.js';
import { query, formatQueryResponse } from './tools/query.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SF_TARGET_ORG'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Salesforce configuration — uses sf CLI stored auth (no password needed)
const sfConfig: SalesforceConfig = {
  targetOrg: process.env.SF_TARGET_ORG!,
  apiVersion: process.env.SF_API_VERSION ?? '59.0',
};

// Create MCP server
const server = new Server(
  { name: 'salesforce-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sf_retrieve_metadata',
        description: 'List metadata components from the Salesforce org (ApexClass, LightningComponentBundle, Flow, etc.). Used to get context of existing code before generating new components.',
        inputSchema: {
          type: 'object',
          properties: {
            metadataTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metadata types to retrieve (e.g., ["ApexClass", "LightningComponentBundle", "Flow"])',
            },
            names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: specific component names to filter. If omitted, returns all.',
            },
          },
          required: ['metadataTypes'],
        },
      },
      {
        name: 'sf_validate_deployment',
        description: 'Validate (check-only deploy) Salesforce metadata without actually deploying. Runs tests and checks for errors. Use before actual deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceDir: {
              type: 'string',
              description: 'Source directory to validate (default: force-app/main/default)',
            },
            testLevel: {
              type: 'string',
              enum: ['NoTestRun', 'RunLocalTests', 'RunAllTestsInOrg', 'RunSpecifiedTests'],
              description: 'Test level to run during validation (default: RunLocalTests)',
            },
            testClasses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific test classes to run (required when testLevel is RunSpecifiedTests)',
            },
          },
          required: [],
        },
      },
      {
        name: 'sf_run_tests',
        description: 'Run Apex test classes in the Salesforce org and return results with code coverage.',
        inputSchema: {
          type: 'object',
          properties: {
            testClasses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Apex test class names to run (e.g., ["AccountServiceTest", "AccountControllerTest"])',
            },
            codeCoverage: {
              type: 'boolean',
              description: 'Whether to collect code coverage data (default: true)',
            },
          },
          required: ['testClasses'],
        },
      },
      {
        name: 'sf_deploy',
        description: 'Deploy Salesforce metadata to the target org. Runs tests as part of deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceDir: {
              type: 'string',
              description: 'Source directory to deploy (default: force-app/main/default)',
            },
            testLevel: {
              type: 'string',
              enum: ['NoTestRun', 'RunLocalTests', 'RunAllTestsInOrg', 'RunSpecifiedTests'],
              description: 'Test level (default: RunLocalTests)',
            },
            testClasses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific test classes (for RunSpecifiedTests)',
            },
            checkOnly: {
              type: 'boolean',
              description: 'If true, validates without deploying (default: false)',
            },
          },
          required: [],
        },
      },
      {
        name: 'sf_query',
        description: 'Execute a SOQL query against the Salesforce org and return results.',
        inputSchema: {
          type: 'object',
          properties: {
            soql: {
              type: 'string',
              description: 'SOQL query string (e.g., "SELECT Id, Name FROM Account LIMIT 10")',
            },
            maxRecords: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100)',
            },
          },
          required: ['soql'],
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
      case 'sf_retrieve_metadata': {
        const params = args as unknown as RetrieveMetadataParams;
        const result = await retrieveMetadata(sfConfig, params);
        return { content: [{ type: 'text', text: formatRetrieveMetadataResponse(result) }] };
      }

      case 'sf_validate_deployment': {
        const params = args as unknown as ValidateDeploymentParams;
        const result = await validateDeployment(sfConfig, params);
        return { content: [{ type: 'text', text: formatValidateDeploymentResponse(result) }] };
      }

      case 'sf_run_tests': {
        const params = args as unknown as RunTestsParams;
        const result = await runTests(sfConfig, params);
        return { content: [{ type: 'text', text: formatRunTestsResponse(result) }] };
      }

      case 'sf_deploy': {
        const params = args as unknown as DeployParams;
        const result = await deploy(sfConfig, params);
        return { content: [{ type: 'text', text: formatDeployResponse(result) }] };
      }

      case 'sf_query': {
        const params = args as unknown as QueryParams;
        const result = await query(sfConfig, params);
        return { content: [{ type: 'text', text: formatQueryResponse(params.soql, result) }] };
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
  console.error('Salesforce MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
