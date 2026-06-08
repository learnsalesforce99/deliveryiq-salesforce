import { Octokit } from '@octokit/rest';
import { GitHubConfig, TriggerWorkflowParams } from '../types.js';

export async function triggerWorkflow(
  config: GitHubConfig,
  params: TriggerWorkflowParams
): Promise<{ workflowId: string; ref: string; triggered: boolean }> {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;
  const { workflowId, ref, inputs = {} } = params;

  try {
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    });

    return { workflowId, ref, triggered: true };
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`Workflow "${workflowId}" not found in ${owner}/${repo}. Check the workflow filename.`);
    }
    if (error.status === 422) {
      throw new Error(`Workflow "${workflowId}" does not have workflow_dispatch trigger enabled.`);
    }
    throw new Error(`Failed to trigger workflow: ${error.message}`);
  }
}

export function formatTriggerWorkflowResponse(result: {
  workflowId: string;
  ref: string;
  triggered: boolean;
}): string {
  return `
**Workflow Triggered Successfully**

**Workflow:** ${result.workflowId}
**Branch/Ref:** ${result.ref}
**Status:** Triggered ✅

Use github_get_workflow_status with the run ID to monitor progress.
  `.trim();
}
