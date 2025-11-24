import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('token');

    if (!authToken) {
        return NextResponse.json({ error: 'Auth token is required' }, { status: 400 });
    }

    try {
        const eventResult = await db.execute({
            sql: 'SELECT id FROM events WHERE payment_token = ? AND is_active = 1',
            args: [token],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];

        // Find user by auth_token (global)
        const userResult = await db.execute({
            sql: 'SELECT id FROM payment_users WHERE auth_token = ?',
            args: [authToken],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
        }

        const user = userResult.rows[0];

        // Mark as authenticated globally
        await db.execute({
            sql: 'UPDATE payment_users SET is_authenticated = 1 WHERE id = ?',
            args: [user.id],
        });

        // Ensure payment_status exists for this event
        const statusResult = await db.execute({
            sql: 'SELECT id FROM payment_status WHERE payment_user_id = ? AND event_id = ?',
            args: [user.id, event.id],
        });

        let statusId: string;
        if (statusResult.rows.length === 0) {
            statusId = randomUUID();
            await db.execute({
                sql: `INSERT INTO payment_status (id, payment_user_id, event_id, status)
                      VALUES (?, ?, ?, 'UNPAID')`,
                args: [statusId, user.id, event.id],
            });
        } else {
            statusId = statusResult.rows[0].id as string;
        }

        return NextResponse.json({ success: true, userId: user.id, statusId });
    } catch (e) {
        console.error('Failed to verify:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
