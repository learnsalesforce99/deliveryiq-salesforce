import { SalesforceConfig, ValidateDeploymentParams, DeployResult } from '../types.js';
import { deploy, formatDeployResponse } from './deploy.js';

export async function validateDeployment(
  config: SalesforceConfig,
  params: ValidateDeploymentParams
): Promise<DeployResult> {
  // Validate is just a deploy with checkOnly = true
  return deploy(config, {
    sourceDir: params.sourceDir,
    testLevel: params.testLevel ?? 'RunLocalTests',
    testClasses: params.testClasses,
    checkOnly: true,
  });
}

export function formatValidateDeploymentResponse(result: DeployResult): string {
  return formatDeployResponse(result);
}
