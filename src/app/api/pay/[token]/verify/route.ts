import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

        const userResult = await db.execute({
            sql: 'SELECT id FROM payment_users WHERE event_id = ? AND auth_token = ?',
            args: [event.id, authToken],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
        }

        const user = userResult.rows[0];

        await db.execute({
            sql: 'UPDATE payment_users SET is_authenticated = 1 WHERE id = ?',
            args: [user.id],
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (e) {
        console.error('Failed to verify:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
