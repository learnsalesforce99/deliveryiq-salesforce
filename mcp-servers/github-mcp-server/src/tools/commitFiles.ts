import { Octokit } from '@octokit/rest';
import { GitHubConfig, CommitFilesParams, CommitResult } from '../types.js';

export async function commitFiles(
  config: GitHubConfig,
  params: CommitFilesParams
): Promise<CommitResult> {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;
  const { branch, message, files } = params;

  try {
    // Get the current commit SHA for the branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const latestCommitSha = refData.object.sha;

    // Get the tree SHA of the latest commit
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // Create a new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // Create the commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update the branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return {
      branch,
      commitSha: newCommit.sha,
      filesChanged: files.length,
      message,
    };
  } catch (error: any) {
    throw new Error(`Failed to commit files: ${error.message}`);
  }
}

export function formatCommitFilesResponse(result: CommitResult): string {
  return `
**Files Committed Successfully**

**Branch:** ${result.branch}
**Commit SHA:** ${result.commitSha}
**Files Changed:** ${result.filesChanged}
**Message:** ${result.message}
  `.trim();
}
