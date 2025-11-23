const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL is not defined');
  process.exit(1);
}

const db = createClient({
  url,
  authToken,
});

const schema = [
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gmail_refresh_token TEXT,
    gmail_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS payment_configs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'PAYPAY' or 'BANK'
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATETIME,
    payment_config_ids TEXT, -- JSON array of config IDs
    conditions_json TEXT, -- JSON defining amount logic
    base_amount INTEGER DEFAULT 0,
    payment_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
  )`,
  `CREATE TABLE IF NOT EXISTS payment_users (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'UNPAID',
    amount_due INTEGER,
    selected_conditions TEXT,
    payment_method TEXT,
    payment_details TEXT,
    auth_token TEXT UNIQUE,
    is_authenticated INTEGER DEFAULT 0,
    paypay_payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

async function setup() {
  console.log('Setting up database...');
  console.log('Connect db url:', url)
  for (const query of schema) {
    try {
      await db.execute(query);
      console.log('Executed:', query.split('(')[0]);
    } catch (e) {
      console.error('Error executing query:', e);
    }
  }
  console.log('Database setup complete.');
}

setup();
