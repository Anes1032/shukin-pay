import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendAuthEmail } from '@/lib/email';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const eventResult = await db.execute({
            sql: 'SELECT id, admin_id FROM events WHERE payment_token = ? AND is_active = 1',
            args: [token],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];

        const existingUser = await db.execute({
            sql: 'SELECT id, is_authenticated FROM payment_users WHERE event_id = ? AND email = ?',
            args: [event.id, email],
        });

        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.is_authenticated) {
                return NextResponse.json({ authenticated: true, userId: user.id });
            }

            const authToken = randomUUID();
            await db.execute({
                sql: 'UPDATE payment_users SET auth_token = ? WHERE id = ?',
                args: [authToken, user.id],
            });

            await sendAuthEmail(event.admin_id as string, email, token, authToken);

            return NextResponse.json({ authenticated: false, message: 'Verification email sent' });
        }

        const userId = randomUUID();
        const authToken = randomUUID();

        await db.execute({
            sql: `INSERT INTO payment_users (id, event_id, email, auth_token, is_authenticated)
                  VALUES (?, ?, ?, ?, 0)`,
            args: [userId, event.id, email, authToken],
        });

        await sendAuthEmail(event.admin_id as string, email, token, authToken);

        return NextResponse.json({ authenticated: false, message: 'Verification email sent' });
    } catch (e) {
        console.error('Failed to process auth:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
