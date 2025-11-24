import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rs = await db.execute({
            sql: 'SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC',
            args: [session.id],
        });
        return NextResponse.json(rs.rows);
    } catch (e) {
        console.error('Failed to get events:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, date, baseAmount, conditions, paymentConfigIds } = body;

        const eventId = randomUUID();
        const paymentToken = randomUUID();

        await db.execute({
            sql: `INSERT INTO events (id, user_id, name, date, base_amount, conditions_json, payment_config_ids, payment_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                eventId,
                session.id,
                name,
                date,
                baseAmount,
                JSON.stringify(conditions),
                JSON.stringify(paymentConfigIds),
                paymentToken
            ],
        });
        return NextResponse.json({ success: true, eventId, paymentToken });
    } catch (e) {
        console.error('Failed to save event:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
