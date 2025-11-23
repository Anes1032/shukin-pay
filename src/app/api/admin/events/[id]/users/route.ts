import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { sendPaymentLinkEmail } from '@/lib/email';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const rs = await db.execute({
            sql: 'SELECT * FROM payment_users WHERE event_id = ? ORDER BY created_at DESC',
            args: [id],
        });
        return NextResponse.json(rs.rows);
    } catch (e) {
        console.error('Failed to get payment users:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: eventId } = await params;

    try {
        const body = await request.json();
        const { email, name, amountDue, skipAuth, sendEmail } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const existingUser = await db.execute({
            sql: 'SELECT id FROM payment_users WHERE event_id = ? AND email = ?',
            args: [eventId, email],
        });

        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const userId = randomUUID();
        const authToken = skipAuth ? null : randomUUID();

        await db.execute({
            sql: `INSERT INTO payment_users (id, event_id, email, name, amount_due, auth_token, is_authenticated)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [userId, eventId, email, name || null, amountDue || null, authToken, skipAuth ? 1 : 0],
        });

        if (sendEmail && skipAuth) {
            const eventResult = await db.execute({
                sql: 'SELECT name, payment_token, admin_id FROM events WHERE id = ?',
                args: [eventId],
            });

            if (eventResult.rows.length > 0) {
                const event = eventResult.rows[0];
                await sendPaymentLinkEmail(
                    event.admin_id as string,
                    email,
                    event.payment_token as string,
                    event.name as string
                );
            }
        }

        return NextResponse.json({ success: true, userId, authToken });
    } catch (e) {
        console.error('Failed to create payment user:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
