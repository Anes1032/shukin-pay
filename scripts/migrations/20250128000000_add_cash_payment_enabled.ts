module.exports = {
  up: [
    `ALTER TABLE users ADD COLUMN cash_payment_enabled INTEGER DEFAULT 1`
  ],
  down: [
    `ALTER TABLE users DROP COLUMN cash_payment_enabled`
  ]
};
