module.exports = {
  up: [
    `ALTER TABLE users ADD COLUMN line_user_id TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id) WHERE line_user_id IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS line_link_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS line_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT,
      group_id TEXT,
      room_id TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`
  ],
  down: [
    'DROP TABLE IF EXISTS line_events',
    'DROP TABLE IF EXISTS line_link_tokens',
    'DROP INDEX IF EXISTS idx_users_line_user_id',
    `ALTER TABLE users DROP COLUMN line_user_id`
  ]
};

