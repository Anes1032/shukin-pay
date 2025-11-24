module.exports = {
  up: [
    `CREATE TABLE IF NOT EXISTS line_messages (
      id TEXT PRIMARY KEY,
      line_user_id TEXT NOT NULL,
      group_id TEXT,
      room_id TEXT,
      message_type TEXT NOT NULL,
      message_text TEXT,
      message_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_line_messages_group_id ON line_messages(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_line_messages_room_id ON line_messages(room_id)`,
    `CREATE INDEX IF NOT EXISTS idx_line_messages_created_at ON line_messages(created_at)`
  ],
  down: [
    'DROP INDEX IF EXISTS idx_line_messages_created_at',
    'DROP INDEX IF EXISTS idx_line_messages_room_id',
    'DROP INDEX IF EXISTS idx_line_messages_group_id',
    'DROP TABLE IF EXISTS line_messages'
  ]
};

