import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reads the Build Agent system prompt from the markdown file.
 */
function loadSystemPrompt(): string {
  try {
    // dist/claudeAgent.js → ../../build-agent-prompt.md
    const promptPath = resolve(__dirname, '..', '..', 'build-agent-prompt.md');
    return fs.readFileSync(promptPath, 'utf-8');
  } catch {
    // Fallback inline prompt if file not found
    return `You are the DeliveryIQ Build Agent, an AI-powered Salesforce development automation system.
You orchestrate the complete development lifecycle from Jira story intake to Salesforce deployment.
When given a Jira issue key, execute the full pipeline: analyze story, generate code, create GitHub branch, commit files, validate, create PR, and update Jira status.`;
  }
}

/**
 * Triggers the DeliveryIQ Build Agent via Claude API for a given Jira issue key.
 * Streams the response and logs progress to console.
 */
export async function triggerBuildAgent(issueKey: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = loadSystemPrompt();

  const userMessage = `Run the full DeliveryIQ pipeline for Jira story ${issueKey}.

Follow the Standard Workflow exactly:
- Phase 1: Story Analysis & Estimation
- Phase 2: Code Generation & GitHub commit
- Phase 3: Compliance & Validation
- Phase 4: Pull Request creation

Report your progress at each step. Post updates to Jira as you go.`;

  console.log(`\n🤖 [Claude Agent] Starting Build Agent for ${issueKey}...`);
  console.log(`📡 [Claude Agent] Calling Claude API with streaming...`);

  try {
    const stream = await client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Stream and log the response
    process.stdout.write(`\n[${issueKey}] Claude: `);
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        process.stdout.write(chunk.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    console.log(`\n\n✅ [Claude Agent] Pipeline completed for ${issueKey}`);
    console.log(`📊 [Claude Agent] Tokens used: ${finalMessage.usage.input_tokens} input, ${finalMessage.usage.output_tokens} output`);

  } catch (error: any) {
    console.error(`❌ [Claude Agent] Error running pipeline for ${issueKey}:`, error.message);
    throw error;
  }
}
