import { Octokit } from '@octokit/rest';
import { GitHubConfig, CreateBranchParams, BranchResult } from '../types.js';

export async function createBranch(
  config: GitHubConfig,
  params: CreateBranchParams
): Promise<BranchResult> {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;
  const { branchName, baseBranch = 'main' } = params;

  try {
    // Get the SHA of the base branch
    const { data: baseRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    const baseSha = baseRef.object.sha;

    // Create the new branch
    const { data: newRef } = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    return {
      branchName,
      sha: newRef.object.sha,
      url: newRef.url,
    };
  } catch (error: any) {
    if (error.status === 422) {
      throw new Error(`Branch "${branchName}" already exists in ${owner}/${repo}`);
    }
    if (error.status === 404) {
      throw new Error(`Base branch "${baseBranch}" not found in ${owner}/${repo}`);
    }
    throw new Error(`Failed to create branch: ${error.message}`);
  }
}

export function formatCreateBranchResponse(result: BranchResult): string {
  return `
**Branch Created Successfully**

**Branch:** ${result.branchName}
**SHA:** ${result.sha}
**URL:** ${result.url}
  `.trim();
}
