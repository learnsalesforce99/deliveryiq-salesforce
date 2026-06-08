export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: {
      name: string;
    };
    priority: {
      name: string;
    } | null;
    assignee: {
      displayName: string;
      emailAddress: string;
    } | null;
    created: string;
    updated: string;
    issuetype: {
      name: string;
    };
  };
}

export interface JiraComment {
  id: string;
  body: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
}

export interface GetStoryParams {
  issueKey: string;
}

export interface AddCommentParams {
  issueKey: string;
  comment: string;
}

export interface UpdateStatusParams {
  issueKey: string;
  status: string;
}

export interface GetAttachmentsParams {
  issueKey: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  content: string; // download URL
  author: {
    displayName: string;
  };
}
