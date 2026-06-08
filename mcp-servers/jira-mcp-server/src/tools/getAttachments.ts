import axios from 'axios';
import { JiraConfig, JiraAttachment, GetAttachmentsParams } from '../types.js';

export async function getAttachments(
  config: JiraConfig,
  params: GetAttachmentsParams
): Promise<JiraAttachment[]> {
  const { baseUrl, email, apiToken } = config;
  const { issueKey } = params;

  try {
    const response = await axios.get(
      `${baseUrl}/rest/api/3/issue/${issueKey}?fields=attachment`,
      {
        auth: { username: email, password: apiToken },
        headers: { 'Accept': 'application/json' },
      }
    );

    const attachments: JiraAttachment[] = response.data.fields.attachment || [];
    return attachments;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Jira API Error: ${error.response.status} - ${error.response.data.errorMessages?.join(', ') || error.response.statusText}`
      );
    }
    throw new Error(`Failed to fetch attachments: ${error.message}`);
  }
}

export function formatAttachmentsResponse(
  issueKey: string,
  attachments: JiraAttachment[]
): string {
  if (attachments.length === 0) {
    return `**No attachments found for ${issueKey}**`;
  }

  const list = attachments
    .map(
      (a, i) => `
**${i + 1}. ${a.filename}**
- Type: ${a.mimeType}
- Size: ${(a.size / 1024).toFixed(1)} KB
- Uploaded by: ${a.author.displayName}
- Created: ${new Date(a.created).toLocaleString()}
- Download URL: ${a.content}`
    )
    .join('\n');

  return `**Attachments for ${issueKey}** (${attachments.length} total)\n${list}`;
}
