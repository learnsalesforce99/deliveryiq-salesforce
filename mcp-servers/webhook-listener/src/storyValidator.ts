import { JiraWebhookPayload, ValidationResult } from './types.js';

/**
 * Extracts plain text from Jira ADF (Atlassian Document Format) description.
 */
function extractTextFromADF(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;

  const lines: string[] = [];

  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      lines.push(node.text);
    }
    if (node.type === 'hardBreak') {
      lines.push('\n');
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      if (node.content) node.content.forEach(walk);
      lines.push('\n');
    } else if (node.content) {
      node.content.forEach(walk);
    }
  }

  walk(adf);
  return lines.join('').trim();
}

/**
 * Checks if the description contains Acceptance Criteria.
 * Looks for common AC patterns.
 */
function hasAcceptanceCriteria(text: string): boolean {
  const acPatterns = [
    /acceptance criteria/i,
    /\bAC\s*:/i,
    /\bAC\d+/i,
    /given.*when.*then/i,
    /as a.*i want.*so that/i,
  ];
  return acPatterns.some((pattern) => pattern.test(text));
}

/**
 * Extracts story points from various Jira custom fields.
 * Jira uses different field IDs depending on the project configuration.
 */
function extractStoryPoints(fields: any): number | null {
  // Common Jira story points field IDs
  const storyPointFields = [
    'story_points',
    'customfield_10016', // Most common
    'customfield_10028', // Alternate
    'customfield_10014', // Some configurations
    'customfield_10004', // Older configurations
    'storyPoints',
  ];

  for (const field of storyPointFields) {
    if (fields[field] !== null && fields[field] !== undefined) {
      const val = Number(fields[field]);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

/**
 * Validates a Jira story for completeness before triggering the Build Agent.
 * Returns a ValidationResult with missing fields listed.
 */
export function validateStory(payload: JiraWebhookPayload): ValidationResult {
  const { fields } = payload.issue;
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // 1. Check Summary
  if (!fields.summary || fields.summary.trim().length < 5) {
    missingFields.push('📝 **Summary** — Story title is missing or too short');
  }

  // 2. Check Description
  const descriptionText = extractTextFromADF(fields.description);
  if (!descriptionText || descriptionText.trim().length < 20) {
    missingFields.push('📄 **Description** — Story description is missing or too brief. Please add what needs to be built and why.');
  }

  // 3. Check Acceptance Criteria
  if (descriptionText && !hasAcceptanceCriteria(descriptionText)) {
    missingFields.push('✅ **Acceptance Criteria** — No AC found in description. Please add "Acceptance Criteria:" section with clear pass/fail conditions.');
  }

  // 4. Check Assignee
  if (!fields.assignee) {
    missingFields.push('👤 **Assignee** — Story is not assigned to a developer. Please assign before approving.');
  }

  // 5. Check Story Points / Estimate
  const storyPoints = extractStoryPoints(fields);
  if (storyPoints === null) {
    warnings.push('📊 **Story Points** — No estimate found. Consider adding story points for sprint planning.');
  }

  // 6. Check issue type is appropriate
  const issueType = fields.issuetype?.name?.toLowerCase() || '';
  if (issueType === 'epic') {
    missingFields.push('🚫 **Issue Type** — Epics cannot be auto-built. Please break this into Stories or Tasks.');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Formats the validation failure message to post as a Jira comment.
 */
export function formatValidationFailureComment(
  issueKey: string,
  result: ValidationResult
): string {
  const lines: string[] = [
    `🤖 **DeliveryIQ Build Agent — Story Validation Failed**`,
    ``,
    `Story *${issueKey}* was moved to **Approved** but is missing required details. The Build Agent cannot start until these are resolved:`,
    ``,
    `*Missing / Incomplete Fields:*`,
  ];

  for (const field of result.missingFields) {
    lines.push(`• ${field}`);
  }

  if (result.warnings.length > 0) {
    lines.push(``);
    lines.push(`*Warnings (non-blocking):*`);
    for (const warning of result.warnings) {
      lines.push(`• ${warning}`);
    }
  }

  lines.push(``);
  lines.push(`Please update the story and move it back to **Approved** once all fields are complete.`);
  lines.push(`The Build Agent will automatically re-trigger when the story is re-approved.`);

  return lines.join('\n');
}
