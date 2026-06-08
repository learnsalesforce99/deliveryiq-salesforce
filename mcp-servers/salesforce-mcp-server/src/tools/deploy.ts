import { execSync } from 'child_process';
import { SalesforceConfig, DeployParams, DeployResult } from '../types.js';

export async function deploy(
  config: SalesforceConfig,
  params: DeployParams
): Promise<DeployResult> {
  const {
    sourceDir = 'force-app/main/default',
    testLevel = 'RunLocalTests',
    testClasses = [],
    checkOnly = false,
  } = params;

  try {
    let cmd = `sf project deploy start --source-dir "${sourceDir}" --target-org ${config.targetOrg} --test-level ${testLevel} --wait 30 --json`;

    if (checkOnly) cmd += ' --dry-run';
    if (testLevel === 'RunSpecifiedTests' && testClasses.length > 0) {
      cmd += ` --tests ${testClasses.join(',')}`;
    }

    const output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
    const result = JSON.parse(output);

    return {
      id: result.result?.id ?? 'unknown',
      status: result.result?.status ?? 'unknown',
      success: result.result?.success ?? false,
      checkOnly: checkOnly,
      numberComponentsDeployed: result.result?.numberComponentsDeployed ?? 0,
      numberComponentErrors: result.result?.numberComponentErrors ?? 0,
      numberTestsCompleted: result.result?.numberTestsCompleted ?? 0,
      numberTestErrors: result.result?.numberTestErrors ?? 0,
      details: result.result?.details,
    };
  } catch (error: any) {
    try {
      const parsed = JSON.parse(error.stdout || '{}');
      throw new Error(parsed.message || error.message);
    } catch {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}

export function formatDeployResponse(result: DeployResult): string {
  const statusEmoji = result.success ? '✅' : '❌';
  const mode = result.checkOnly ? 'Validation (Check Only)' : 'Deployment';

  let output = `
**${mode} ${result.success ? 'Succeeded' : 'Failed'} ${statusEmoji}**

**Deploy ID:** ${result.id}
**Status:** ${result.status}
**Components Deployed:** ${result.numberComponentsDeployed}
**Component Errors:** ${result.numberComponentErrors}
**Tests Run:** ${result.numberTestsCompleted}
**Test Errors:** ${result.numberTestErrors}
  `.trim();

  if (result.details?.componentFailures && result.details.componentFailures.length > 0) {
    output += '\n\n**Component Failures:**';
    for (const f of result.details.componentFailures) {
      output += `\n- **${f.fullName}**: ${f.problem} (${f.problemType})`;
    }
  }

  if (result.details?.runTestResult) {
    const tr = result.details.runTestResult;
    output += `\n\n**Test Results:** ${tr.numTestsRun} run, ${tr.numFailures} failed`;
  }

  return output;
}
