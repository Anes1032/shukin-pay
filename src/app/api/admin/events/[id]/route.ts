import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const eventResult = await db.execute({
            sql: 'SELECT * FROM events WHERE id = ? AND user_id = ?',
            args: [id, session.id],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];
        const paymentConfigIds = JSON.parse(event.payment_config_ids as string || '[]');

        const configsResult = await db.execute({
            sql: `SELECT id, type, name FROM payment_configs WHERE id IN (${paymentConfigIds.map(() => '?').join(',') || "''"})`,
            args: paymentConfigIds,
        });

        return NextResponse.json({
            id: event.id,
            name: event.name,
            date: event.date,
            baseAmount: event.base_amount,
            conditions: JSON.parse(event.conditions_json as string || '[]'),
            paymentMethods: configsResult.rows.map(c => ({
                id: c.id,
                type: c.type,
                name: c.name,
            })),
        });
    } catch (e) {
        console.error('Failed to get event:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

