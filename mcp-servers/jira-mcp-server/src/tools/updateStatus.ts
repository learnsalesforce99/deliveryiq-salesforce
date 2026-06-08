import axios from 'axios';
import { JiraConfig, JiraTransition, UpdateStatusParams } from '../types.js';

export async function updateStatus(
  config: JiraConfig,
  params: UpdateStatusParams
): Promise<{ issueKey: string; newStatus: string; transitionId: string }> {
  const { baseUrl, email, apiToken } = config;
  const { issueKey, status } = params;

  const authConfig = {
    auth: { username: email, password: apiToken },
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  };

  // Step 1: Get available transitions for this issue
  const transitionsResponse = await axios.get(
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    authConfig
  );

  const transitions: JiraTransition[] = transitionsResponse.data.transitions;

  // Step 2: Find the transition that matches the requested status (case-insensitive)
  const match = transitions.find(
    (t) => t.name.toLowerCase() === status.toLowerCase() ||
           t.to.name.toLowerCase() === status.toLowerCase()
  );

  if (!match) {
    const available = transitions.map((t) => `"${t.name}" → ${t.to.name}`).join(', ');
    throw new Error(
      `Status "${status}" not found. Available transitions: ${available}`
    );
  }

  // Step 3: Perform the transition
  await axios.post(
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    { transition: { id: match.id } },
    authConfig
  );

  return { issueKey, newStatus: match.to.name, transitionId: match.id };
}

export function formatUpdateStatusResponse(result: {
  issueKey: string;
  newStatus: string;
  transitionId: string;
}): string {
  return `
**Status Updated Successfully**

**Issue:** ${result.issueKey}
**New Status:** ${result.newStatus}
**Transition ID:** ${result.transitionId}
  `.trim();
}
