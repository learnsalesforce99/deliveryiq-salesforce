import { Octokit } from '@octokit/rest';
import { GitHubConfig, CreatePRParams, PRResult } from '../types.js';

export async function createPR(
  config: GitHubConfig,
  params: CreatePRParams
): Promise<PRResult> {
  const octokit = new Octokit({ auth: config.token });
  const { owner, repo } = config;
  const { title, head, base = 'main', body = '' } = params;

  try {
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });

    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      head: pr.head.ref,
      base: pr.base.ref,
    };
  } catch (error: any) {
    if (error.status === 422) {
      throw new Error(`PR already exists or branch "${head}" has no commits ahead of "${base}"`);
    }
    throw new Error(`Failed to create PR: ${error.message}`);
  }
}

export function formatCreatePRResponse(result: PRResult): string {
  return `
**Pull Request Created Successfully**

**PR #${result.number}:** ${result.title}
**URL:** ${result.url}
**State:** ${result.state}
**From:** ${result.head} → **Into:** ${result.base}
  `.trim();
}
