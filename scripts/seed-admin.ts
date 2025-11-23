const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const nodeCrypto = require('crypto');

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
    url,
    authToken,
});

async function seed() {
    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = nodeCrypto.randomUUID();

    console.log('Connect db url:', url)

    try {
        await db.execute({
            sql: 'INSERT INTO admins (id, email, password_hash) VALUES (?, ?, ?)',
            args: [id, email, hashedPassword],
        });
        console.log(`Admin created: ${email} / ${password}`);
    } catch (e) {
        if ((e as any).code === 'SQLITE_CONSTRAINT') {
            console.log('Admin already exists');
        } else {
            console.error('Error creating admin:', e);
        }
    }
}

seed();
