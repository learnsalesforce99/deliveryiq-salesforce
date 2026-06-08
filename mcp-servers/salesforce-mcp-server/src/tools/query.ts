import { execSync } from 'child_process';
import { SalesforceConfig, QueryParams, QueryResult } from '../types.js';

export async function query(
  config: SalesforceConfig,
  params: QueryParams
): Promise<QueryResult> {
  try {
    const soqlEscaped = params.soql.replace(/"/g, '\\"');
    const cmd = `sf data query --query "${soqlEscaped}" --target-org ${config.targetOrg} --json`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const result = JSON.parse(output);

    if (result.status !== 0) {
      throw new Error(result.message || 'Query failed');
    }

    const records = (result.result?.records ?? []).slice(0, params.maxRecords ?? 100);
    return {
      totalSize: result.result?.totalSize ?? 0,
      records: records as Record<string, unknown>[],
    };
  } catch (error: any) {
    try {
      const parsed = JSON.parse(error.stdout || '{}');
      throw new Error(parsed.message || error.message);
    } catch {
      throw new Error(`SOQL query failed: ${error.message}`);
    }
  }
}

export function formatQueryResponse(soql: string, result: QueryResult): string {
  if (result.totalSize === 0) {
    return `**Query returned 0 records.**\n\`\`\`sql\n${soql}\n\`\`\``;
  }

  const headers = Object.keys(result.records[0]).filter(k => k !== 'attributes');
  const rows = result.records.map(r =>
    headers.map(h => String((r as Record<string, unknown>)[h] ?? '')).join(' | ')
  );

  return `
**Query Results** (${result.totalSize} total, showing ${result.records.length})

\`\`\`sql
${soql}
\`\`\`

| ${headers.join(' | ')} |
| ${headers.map(() => '---').join(' | ')} |
| ${rows.join(' |\n| ')} |
  `.trim();
}
