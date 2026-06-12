export interface JiraWebhookPayload {
  webhookEvent: string;
  issue_event_type_name?: string;
  issue: {
    id: string;
    key: string;
    fields: {
      summary: string;
      description: any; // ADF object from Jira API v3
      status: {
        name: string;
        id: string;
      };
      assignee: {
        displayName: string;
        emailAddress: string;
      } | null;
      priority: {
        name: string;
      } | null;
      issuetype: {
        name: string;
      };
      story_points?: number;
      customfield_10016?: number; // Story Points (common Jira field ID)
      customfield_10028?: number; // Story Points (alternate field ID)
      [key: string]: any;
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fieldtype: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface StoryDetails {
  issueKey: string;
  summary: string;
  description: string;
  assignee: string | null;
  storyPoints: number | null;
  hasAcceptanceCriteria: boolean;
  status: string;
}
