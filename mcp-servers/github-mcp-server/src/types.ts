export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

// Tool parameter interfaces
export interface CreateBranchParams {
  branchName: string;
  baseBranch?: string; // defaults to 'main'
}

export interface CommitFilesParams {
  branch: string;
  message: string;
  files: Array<{
    path: string;    // e.g. "force-app/main/default/classes/AccountService.cls"
    content: string; // file content as string
  }>;
}

export interface CreatePRParams {
  title: string;
  head: string;        // source branch
  base?: string;       // target branch, defaults to 'main'
  body?: string;       // PR description / compliance report
}

export interface TriggerWorkflowParams {
  workflowId: string;  // filename e.g. "salesforce-deploy.yml"
  ref: string;         // branch or tag
  inputs?: Record<string, string>; // workflow_dispatch inputs
}

export interface GetWorkflowStatusParams {
  runId: number;
}

// Response interfaces
export interface BranchResult {
  branchName: string;
  sha: string;
  url: string;
}

export interface CommitResult {
  branch: string;
  commitSha: string;
  filesChanged: number;
  message: string;
}

export interface PRResult {
  number: number;
  title: string;
  url: string;
  state: string;
  head: string;
  base: string;
}

export interface WorkflowRunResult {
  runId: number;
  workflowName: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}
