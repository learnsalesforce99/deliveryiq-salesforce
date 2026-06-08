import axios from 'axios';
import { JiraConfig, JiraIssue, GetStoryParams } from '../types.js';

/**
 * Extracts plain text from a Jira ADF (Atlassian Document Format) description object.
 * Jira API v3 returns description as a nested JSON object, not a plain string.
 */
function extractTextFromADF(adf: any): string {
  if (!adf) return 'No description provided';
  if (typeof adf === 'string') return adf;

  const lines: string[] = [];

  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      lines.push(node.text);
    }
    if (node.type === 'hardBreak') {
      lines.push('\n');
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      if (node.content) node.content.forEach(walk);
      lines.push('\n');
    } else if (node.content) {
      node.content.forEach(walk);
    }
  }

  walk(adf);
  return lines.join('').trim() || 'No description provided';
}

export async function getStory(
  config: JiraConfig,
  params: GetStoryParams
): Promise<JiraIssue> {
  const { baseUrl, email, apiToken } = config;
  const { issueKey } = params;

  try {
    const response = await axios.get(
      `${baseUrl}/rest/api/3/issue/${issueKey}`,
      {
        auth: {
          username: email,
          password: apiToken,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data as JiraIssue;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Jira API Error: ${error.response.status} - ${error.response.data.errorMessages?.join(', ') || error.response.statusText}`
      );
    }
    throw new Error(`Failed to fetch story: ${error.message}`);
  }
}

export function formatStoryResponse(issue: JiraIssue): string {
  return `
**Story: ${issue.key}**

**Summary:** ${issue.fields.summary}

**Description:** 
${extractTextFromADF(issue.fields.description)}

**Status:** ${issue.fields.status.name}

**Priority:** ${issue.fields.priority?.name || 'Not set'}

**Assignee:** ${issue.fields.assignee?.displayName || 'Unassigned'}

**Type:** ${issue.fields.issuetype.name}

**Created:** ${new Date(issue.fields.created).toLocaleString()}

**Updated:** ${new Date(issue.fields.updated).toLocaleString()}
  `.trim();
}
