import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;

console.log('JIRA_BASE_URL:', JIRA_BASE_URL);
console.log('JIRA_EMAIL:', JIRA_EMAIL);
console.log('JIRA_API_TOKEN:', JIRA_API_TOKEN ? '***loaded***' : 'MISSING');

try {
  const response = await axios.post(
    `${JIRA_BASE_URL}/rest/api/3/issue/SCRUM-13/comment`,
    {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '🤖 Test comment from DeliveryIQ webhook listener — Jira API connection verified!',
              },
            ],
          },
        ],
      },
    },
    {
      auth: { username: JIRA_EMAIL, password: JIRA_API_TOKEN },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('✅ SUCCESS! Comment posted. Status:', response.status);
} catch (error) {
  console.error('❌ ERROR:', error.response?.status, JSON.stringify(error.response?.data || error.message));
}
