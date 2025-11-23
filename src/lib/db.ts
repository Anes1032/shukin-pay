import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL is not defined');
}

export const db = createClient({
  url: url || 'file:local.db',
  authToken: authToken,
});
