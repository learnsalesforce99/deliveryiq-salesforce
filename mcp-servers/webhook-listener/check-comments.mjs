import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;

const r = await axios.get(
  `${JIRA_BASE_URL}/rest/api/3/issue/SCRUM-13/comment?maxResults=5&orderBy=-created`,
  {
    auth: { username: JIRA_EMAIL, password: JIRA_API_TOKEN },
    headers: { Accept: 'application/json' },
  }
);

console.log(`\nLatest ${r.data.comments.length} comments on SCRUM-13:\n`);
r.data.comments.reverse().forEach((c) => {
  const text = c.body?.content?.[0]?.content?.[0]?.text || '(no text)';
  console.log(`[${c.created.substring(0, 19)}] ${text.substring(0, 120)}`);
  console.log('---');
});
