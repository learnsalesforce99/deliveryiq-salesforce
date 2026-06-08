import { execSync } from 'child_process';
import { SalesforceConfig, RunTestsParams, TestResult } from '../types.js';

export async function runTests(
  config: SalesforceConfig,
  params: RunTestsParams
): Promise<TestResult> {
  const { testClasses, codeCoverage = true } = params;

  try {
    const testsArg = testClasses.join(',');
    const coverageFlag = codeCoverage ? '--code-coverage' : '';
    const cmd = `sf apex run test --target-org ${config.targetOrg} --tests ${testsArg} ${coverageFlag} --result-format json --wait 10`;

    const output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
    const result = JSON.parse(output);
    const summary = result.result?.summary ?? {};
    const failures = result.result?.tests
      ?.filter((t: any) => t.Outcome === 'Fail')
      .map((t: any) => ({
        name: t.FullName,
        message: t.Message,
        stackTrace: t.StackTrace ?? '',
      })) ?? [];

    return {
      testClassName: testClasses.join(', '),
      outcome: summary.outcome ?? 'Unknown',
      numTestsRun: summary.testsRan ?? 0,
      numFailures: summary.failing ?? 0,
      totalTime: summary.testTotalTime ?? 0,
      failures,
    };
  } catch (error: any) {
    try {
      const parsed = JSON.parse(error.stdout || '{}');
      throw new Error(parsed.message || error.message);
    } catch {
      throw new Error(`Test run failed: ${error.message}`);
    }
  }
}

export function formatRunTestsResponse(result: TestResult): string {
  const outcomeEmoji = result.numFailures === 0 ? '✅' : '❌';

  let output = `
**Apex Test Results ${outcomeEmoji}**

**Classes Tested:** ${result.testClassName}
**Outcome:** ${result.outcome}
**Tests Run:** ${result.numTestsRun}
**Failures:** ${result.numFailures}
**Total Time:** ${result.totalTime}ms
  `.trim();

  if (result.failures && result.failures.length > 0) {
    output += '\n\n**Failures:**';
    for (const f of result.failures) {
      output += `\n\n❌ **${f.name}**\n${f.message}\n${f.stackTrace}`;
    }
  }

  return output;
}
