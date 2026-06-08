import { execSync } from 'child_process';
import { SalesforceConfig, RetrieveMetadataParams, MetadataComponent } from '../types.js';

export async function retrieveMetadata(
  config: SalesforceConfig,
  params: RetrieveMetadataParams
): Promise<MetadataComponent[]> {
  const results: MetadataComponent[] = [];

  for (const metadataType of params.metadataTypes) {
    try {
      const cmd = `sf org list metadata --metadata-type ${metadataType} --target-org ${config.targetOrg} --json`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const result = JSON.parse(output);

      const items: any[] = result.result ?? [];
      for (const item of items) {
        if (params.names && params.names.length > 0) {
          if (!params.names.includes(item.fullName)) continue;
        }
        results.push({
          type: metadataType,
          fullName: item.fullName,
          fileName: item.fileName,
          lastModifiedDate: item.lastModifiedDate,
          lastModifiedBy: item.lastModifiedByName,
        });
      }
    } catch (err: any) {
      results.push({
        type: metadataType,
        fullName: `[Error listing ${metadataType}: ${err.message}]`,
      });
    }
  }

  return results;
}

export function formatRetrieveMetadataResponse(components: MetadataComponent[]): string {
  if (components.length === 0) {
    return '**No metadata components found.**';
  }

  const grouped: Record<string, MetadataComponent[]> = {};
  for (const c of components) {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type].push(c);
  }

  const lines = [`**Metadata Components Retrieved (${components.length} total)**\n`];
  for (const [type, items] of Object.entries(grouped)) {
    lines.push(`\n**${type}** (${items.length}):`);
    for (const item of items) {
      lines.push(`  - ${item.fullName}${item.lastModifiedBy ? ` (modified by ${item.lastModifiedBy})` : ''}`);
    }
  }
  return lines.join('\n');
}
