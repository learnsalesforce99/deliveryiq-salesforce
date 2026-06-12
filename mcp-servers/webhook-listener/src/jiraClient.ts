import axios from 'axios';

/**
 * Posts a comment to a Jira issue using the Jira REST API.
 */
export async function postJiraComment(issueKey: string, comment: string): Promise<void> {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error('Missing Jira configuration: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
  }

  await axios.post(
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
      auth: { username: email, password: apiToken },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );
}
