module.exports = {
  up: [
    `ALTER TABLE users ADD COLUMN default_payment_config_ids TEXT DEFAULT '[]'`
  ],
  down: [
    `ALTER TABLE users DROP COLUMN default_payment_config_ids`
  ]
};

