import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const eventResult = await db.execute({
            sql: `SELECT e.*, pc.type as payment_type, pc.config_json, pc.name as config_name
                  FROM events e
                  LEFT JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                  WHERE e.payment_token = ? AND e.is_active = 1`,
            args: [token],
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
