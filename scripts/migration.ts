const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';
const envPaths = [
    path.resolve(process.cwd(), `.env.${nodeEnv}.local`),
    path.resolve(process.cwd(), `.env.${nodeEnv}`),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment from: ${path.basename(envPath)}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    dotenv.config();
    console.log('Using default environment configuration');
}

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

const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
    try {
        await db.execute({
            sql: `CREATE TABLE IF NOT EXISTS migrations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
        });
    } catch (e) {
        console.error('Error creating migrations table:', e);
        throw e;
    }
}

async function getExecutedMigrations(): Promise<string[]> {
    try {
        const result = await db.execute({
            sql: 'SELECT name FROM migrations ORDER BY executed_at',
        });
        return result.rows.map((row: any) => row.name as string);
    } catch (e) {
        return [];
    }
}

async function markMigrationExecuted(migrationName: string) {
    const migrationId = require('crypto').randomUUID();
    await db.execute({
        sql: 'INSERT INTO migrations (id, name) VALUES (?, ?)',
        args: [migrationId, migrationName],
    });
}

function loadMigrations(): Array<{ name: string; up: string[]; down: string[] }> {
    if (!fs.existsSync(migrationsDir)) {
        console.error(`Migrations directory not found: ${migrationsDir}`);
        return [];
    }

    const files = fs.readdirSync(migrationsDir)
        .filter((file: string) => file.endsWith('.ts'))
        .sort();

    return files.map((file: string) => {
        const filePath = path.join(migrationsDir, file);
        const name = file.replace('.ts', '');
        const migration = require(filePath);
        return {
            name,
            up: migration.up || [],
            down: migration.down || [],
        };
    });
}

async function runMigrations(direction: 'up' | 'down' = 'up') {
    console.log(`Running migrations (${direction})...`);
    console.log('Connect db url:', url);

    await ensureMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const migrations = loadMigrations();

    if (migrations.length === 0) {
        console.log('No migrations found.');
        return;
    }

    if (direction === 'up') {
        for (const migration of migrations) {
            if (executedMigrations.includes(migration.name)) {
                console.log(`✓ ${migration.name} (already executed)`);
                continue;
            }

            console.log(`Running migration: ${migration.name}`);
            try {
                for (const query of migration.up) {
                    await db.execute({ sql: query });
                }
                await markMigrationExecuted(migration.name);
                console.log(`✓ ${migration.name} (executed)`);
            } catch (e) {
                console.error(`✗ ${migration.name} (failed):`, e);
                throw e;
            }
        }
    } else {
        const migrationsToRollback = migrations
            .filter((m) => executedMigrations.includes(m.name))
            .reverse();

        for (const migration of migrationsToRollback) {
            console.log(`Rolling back migration: ${migration.name}`);
            try {
                for (const query of migration.down) {
                    await db.execute({ sql: query });
                }
                await db.execute({
                    sql: 'DELETE FROM migrations WHERE name = ?',
                    args: [migration.name],
                });
                console.log(`✓ ${migration.name} (rolled back)`);
            } catch (e) {
                console.error(`✗ ${migration.name} (rollback failed):`, e);
                throw e;
            }
        }
    }

    console.log('Migrations complete.');
}

const direction = process.argv[2] === 'down' ? 'down' : 'up';
runMigrations(direction).catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});

