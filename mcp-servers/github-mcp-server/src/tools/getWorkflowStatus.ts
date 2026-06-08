import { Octokit } from '@octokit/rest';
import { GitHubConfig, GetWorkflowStatusParams, WorkflowRunResult } from '../types.js';

export async function getWorkflowStatus(
  config: GitHubConfig,
  params: GetWorkflowStatusParams
): Promise<WorkflowRunResult> {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;
  const { runId } = params;

  try {
    const { data: run } = await octokit.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });

    return {
      runId: run.id,
      workflowName: run.name ?? 'Unknown',
      status: run.status ?? 'unknown',
      conclusion: run.conclusion,
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    };
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`Workflow run ID ${runId} not found in ${owner}/${repo}`);
    }
    throw new Error(`Failed to get workflow status: ${error.message}`);
  }
}

export function formatWorkflowStatusResponse(result: WorkflowRunResult): string {
  const conclusionEmoji =
    result.conclusion === 'success' ? '✅' :
    result.conclusion === 'failure' ? '❌' :
    result.conclusion === 'cancelled' ? '⚠️' :
    result.status === 'in_progress' ? '🔄' : '⏳';

  return `
**Workflow Run Status**

**Run ID:** ${result.runId}
**Workflow:** ${result.workflowName}
**Status:** ${result.status} ${conclusionEmoji}
**Conclusion:** ${result.conclusion ?? 'In progress...'}
**URL:** ${result.url}
**Started:** ${new Date(result.createdAt).toLocaleString()}
**Last Updated:** ${new Date(result.updatedAt).toLocaleString()}
  `.trim();
}
