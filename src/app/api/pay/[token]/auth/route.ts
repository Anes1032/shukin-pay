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
            sql: 'SELECT id, user_id FROM events WHERE payment_token = ? AND is_active = 1',
            args: [token],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];

        // Check if payment_user exists by email (global, not event-specific)
        const existingUser = await db.execute({
            sql: 'SELECT id, is_authenticated FROM payment_users WHERE email = ?',
            args: [email],
        });

        let paymentUserId: string;

        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            paymentUserId = user.id as string;

            // If already authenticated globally, check if they have a status for this event
            if (user.is_authenticated) {
                // Check if payment_status exists for this event
                const statusResult = await db.execute({
                    sql: 'SELECT id FROM payment_status WHERE payment_user_id = ? AND event_id = ?',
                    args: [paymentUserId, event.id],
                });

                if (statusResult.rows.length === 0) {
                    // Create payment_status for this event
                    const statusId = randomUUID();
                    await db.execute({
                        sql: `INSERT INTO payment_status (id, payment_user_id, event_id, status)
                              VALUES (?, ?, ?, 'UNPAID')`,
                        args: [statusId, paymentUserId, event.id],
                    });
                }

                return NextResponse.json({ authenticated: true, userId: paymentUserId });
            }

            // Not authenticated, send new auth email
            const authToken = randomUUID();
            await db.execute({
                sql: 'UPDATE payment_users SET auth_token = ? WHERE id = ?',
                args: [authToken, paymentUserId],
            });

            await sendAuthEmail(event.user_id as string, email, token, authToken);

            return NextResponse.json({ authenticated: false, message: 'Verification email sent' });
        }

        // Create new payment_user
        paymentUserId = randomUUID();
        const authToken = randomUUID();

        await db.execute({
            sql: `INSERT INTO payment_users (id, email, auth_token, is_authenticated)
                  VALUES (?, ?, ?, 0)`,
            args: [paymentUserId, email, authToken],
        });

        // Create payment_status for this event
        const statusId = randomUUID();
        await db.execute({
            sql: `INSERT INTO payment_status (id, payment_user_id, event_id, status)
                  VALUES (?, ?, ?, 'UNPAID')`,
            args: [statusId, paymentUserId, event.id],
        });

        await sendAuthEmail(event.user_id as string, email, token, authToken);

        return NextResponse.json({ authenticated: false, message: 'Verification email sent' });
    } catch (e) {
        console.error('Failed to process auth:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
