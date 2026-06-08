import axios from 'axios';
import { JiraConfig, JiraComment, AddCommentParams } from '../types.js';

export async function addComment(
  config: JiraConfig,
  params: AddCommentParams
): Promise<JiraComment> {
  const { baseUrl, email, apiToken } = config;
  const { issueKey, comment } = params;

  try {
    const response = await axios.post(
      `${baseUrl}/rest/api/3/issue/${issueKey}/comment`,
      {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      },
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

    return response.data as JiraComment;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Jira API Error: ${error.response.status} - ${error.response.data.errorMessages?.join(', ') || error.response.statusText}`
      );
    }
    throw new Error(`Failed to add comment: ${error.message}`);
  }
}

export function formatCommentResponse(comment: JiraComment): string {
  return `
**Comment Added Successfully**

**ID:** ${comment.id}

**Author:** ${comment.author.displayName}

**Created:** ${new Date(comment.created).toLocaleString()}

**Comment:** ${comment.body}
  `.trim();
}
