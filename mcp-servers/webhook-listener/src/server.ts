import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { JiraWebhookPayload } from './types.js';
import { validateStory, formatValidationFailureComment } from './storyValidator.js';
import { triggerBuildAgent } from './claudeAgent.js';
import { postJiraComment } from './jiraClient.js';

// Load .env from the webhook-listener directory regardless of where node is invoked from
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const TRIGGER_STATUS = 'Approved'; // The Jira status that triggers the pipeline

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'DeliveryIQ Webhook Listener',
    triggerStatus: TRIGGER_STATUS,
    timestamp: new Date().toISOString(),
  });
});

// ─── Jira Webhook Handler ─────────────────────────────────────────────────────
app.post('/webhook/jira', async (req: Request, res: Response) => {
  const payload = req.body as JiraWebhookPayload;

  // Immediately acknowledge the webhook (Jira expects fast response)
  res.status(200).json({ received: true });

  try {
    const issueKey = payload?.issue?.key;
    const webhookEvent = payload?.webhookEvent;
    const newStatus = payload?.issue?.fields?.status?.name;

    console.log(`\n📨 [Webhook] Received: ${webhookEvent} for ${issueKey} → status: "${newStatus}"`);

    // ── Filter: Only process status transitions to "Approved" ──────────────
    if (!issueKey) {
      console.log('⚠️  [Webhook] No issue key in payload. Ignoring.');
      return;
    }

    // Check if this is a status change event
    const isStatusChange = webhookEvent === 'jira:issue_updated' &&
      payload.changelog?.items?.some(
        (item) => item.field === 'status' && item.toString === TRIGGER_STATUS
      );

    // Also handle direct status check (in case changelog is missing)
    const isApprovedStatus = newStatus === TRIGGER_STATUS;

    if (!isStatusChange && !isApprovedStatus) {
      console.log(`ℹ️  [Webhook] Not an "Approved" transition. Ignoring (status: "${newStatus}").`);
      return;
    }

    // If we got here via direct status check (no changelog), verify it's a transition
    if (!isStatusChange && isApprovedStatus) {
      // Only process if changelog confirms the transition
      const hasStatusChangeInChangelog = payload.changelog?.items?.some(
        (item) => item.field === 'status'
      );
      if (payload.changelog && !hasStatusChangeInChangelog) {
        console.log(`ℹ️  [Webhook] Status is Approved but no status change in changelog. Ignoring.`);
        return;
      }
    }

    console.log(`\n🚀 [Webhook] Story ${issueKey} moved to "${TRIGGER_STATUS}" — starting validation...`);

    // ── Step 1: Validate story completeness ───────────────────────────────
    const validationResult = validateStory(payload);

    if (!validationResult.isValid) {
      console.log(`❌ [Webhook] Story ${issueKey} failed validation:`);
      validationResult.missingFields.forEach((f) => console.log(`   • ${f}`));

      // Post validation failure comment to Jira
      const comment = formatValidationFailureComment(issueKey, validationResult);
      await postJiraComment(issueKey, comment);

      console.log(`💬 [Webhook] Posted validation failure comment to ${issueKey}`);
      return;
    }

    if (validationResult.warnings.length > 0) {
      console.log(`⚠️  [Webhook] Story ${issueKey} has warnings (proceeding anyway):`);
      validationResult.warnings.forEach((w) => console.log(`   • ${w}`));
    }

    console.log(`✅ [Webhook] Story ${issueKey} passed validation. Triggering Build Agent...`);

    // Post a "starting" comment to Jira
    await postJiraComment(
      issueKey,
      `🤖 DeliveryIQ Build Agent — Pipeline Starting\n\nStory ${issueKey} has been approved and passed validation. The Build Agent is now starting the automated development pipeline.\n\nPhases to execute:\n• Phase 1: Story Analysis & Estimation\n• Phase 2: Code Generation & GitHub commit\n• Phase 3: Compliance & Validation\n• Phase 4: Pull Request creation\n\nStand by for updates...`
    );

    // ── Step 2: Trigger Claude Build Agent (async — don't await in request) ─
    // Run in background so webhook response is already sent
    triggerBuildAgent(issueKey).catch((error) => {
      console.error(`❌ [Claude Agent] Pipeline failed for ${issueKey}:`, error.message);
      postJiraComment(
        issueKey,
        `🤖 DeliveryIQ Build Agent — Pipeline Error\n\nAn error occurred while running the pipeline for ${issueKey}:\n\n${error.message}\n\nPlease check the Build Agent logs and retry.`
      ).catch(console.error);
    });

  } catch (error: any) {
    console.error('❌ [Webhook] Unexpected error processing webhook:', error.message);
  }
});

// ─── Test endpoint (for local testing without Jira) ──────────────────────────
app.post('/test/trigger/:issueKey', async (req: Request, res: Response) => {
  const { issueKey } = req.params;
  console.log(`\n🧪 [Test] Manually triggering pipeline for ${issueKey}...`);

  res.json({ message: `Pipeline triggered for ${issueKey}`, issueKey });

  triggerBuildAgent(issueKey).catch((error) => {
    console.error(`❌ [Test] Pipeline failed for ${issueKey}:`, error.message);
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 DeliveryIQ Webhook Listener started`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🎯 Trigger status: "${TRIGGER_STATUS}"`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/webhook/jira  ← point Jira webhook here`);
  console.log(`  POST http://localhost:${PORT}/test/trigger/:issueKey  ← manual test`);
  console.log(`\nWaiting for Jira webhooks...\n`);
});
