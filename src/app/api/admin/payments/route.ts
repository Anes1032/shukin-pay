import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rs = await db.execute({
            sql: 'SELECT * FROM payment_configs WHERE admin_id = ? ORDER BY created_at DESC',
            args: [session.id],
        });
        return NextResponse.json(rs.rows);
    } catch (e) {
        console.error('Failed to get payment configs:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { type, name, ...config } = body;

        await db.execute({
            sql: 'INSERT INTO payment_configs (id, admin_id, type, name, config_json) VALUES (?, ?, ?, ?, ?)',
            args: [randomUUID(), session.id, type, name, JSON.stringify(config)],
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to save config:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
