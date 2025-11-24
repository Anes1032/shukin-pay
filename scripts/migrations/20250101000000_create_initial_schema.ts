// Initial database schema migration
// Created: 2025-11-24

module.exports = {
  up: [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gmail_refresh_token TEXT,
    gmail_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS payment_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'PAYPAY', 'PAYPAY_MERCHANT', or 'BANK'
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATETIME,
    payment_config_ids TEXT, -- JSON array of config IDs
    conditions_json TEXT, -- JSON defining amount logic
    base_amount INTEGER DEFAULT 0,
    payment_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS payment_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    auth_token TEXT UNIQUE,
    is_authenticated INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS payment_status (
    id TEXT PRIMARY KEY,
    payment_user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT DEFAULT 'UNPAID',
    amount_due INTEGER,
    selected_conditions TEXT,
    payment_method TEXT,
    payment_details TEXT,
    paypay_payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_user_id) REFERENCES payment_users(id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(payment_user_id, event_id)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
  ],
  down: [
  'DROP TABLE IF EXISTS auth_tokens',
  'DROP TABLE IF EXISTS payment_status',
  'DROP TABLE IF EXISTS payment_users',
  'DROP TABLE IF EXISTS events',
  'DROP TABLE IF EXISTS payment_configs',
  'DROP TABLE IF EXISTS users'
  ]
};

