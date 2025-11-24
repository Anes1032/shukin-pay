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
            sql: `SELECT ps.*, pu.email, pu.name, pu.is_authenticated,
                  CASE 
                    WHEN ps.payment_details IS NOT NULL THEN json_extract(ps.payment_details, '$.paymentConfigId')
                    ELSE NULL
                  END as payment_config_id
                  FROM payment_status ps
                  JOIN payment_users pu ON ps.payment_user_id = pu.id
                  WHERE ps.event_id = ?
                  ORDER BY ps.created_at DESC`,
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
        const { email, name, amountDue, skipAuth, sendEmail: shouldSendEmail } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if payment_status already exists for this event and email
        const existingStatus = await db.execute({
            sql: `SELECT ps.id FROM payment_status ps
                  JOIN payment_users pu ON ps.payment_user_id = pu.id
                  WHERE ps.event_id = ? AND pu.email = ?`,
            args: [eventId, email],
        });

        if (existingStatus.rows.length > 0) {
            return NextResponse.json({ error: 'User already exists for this event' }, { status: 400 });
        }

        // Check if payment_user exists by email
        let paymentUserId: string;
        const existingUser = await db.execute({
            sql: 'SELECT id, is_authenticated FROM payment_users WHERE email = ?',
            args: [email],
        });

        if (existingUser.rows.length > 0) {
            // User already exists, use existing
            paymentUserId = existingUser.rows[0].id as string;

            // Update name if provided
            if (name) {
                await db.execute({
                    sql: 'UPDATE payment_users SET name = ? WHERE id = ?',
                    args: [name, paymentUserId],
                });
            }
        } else {
            // Create new payment_user
            paymentUserId = randomUUID();
            const authToken = skipAuth ? null : randomUUID();

            await db.execute({
                sql: `INSERT INTO payment_users (id, email, name, auth_token, is_authenticated)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [paymentUserId, email, name || null, authToken, skipAuth ? 1 : 0],
            });
        }

        // Create payment_status for this event
        const statusId = randomUUID();
        await db.execute({
            sql: `INSERT INTO payment_status (id, payment_user_id, event_id, amount_due, status)
                  VALUES (?, ?, ?, ?, 'UNPAID')`,
            args: [statusId, paymentUserId, eventId, amountDue || null],
        });

        if (shouldSendEmail && skipAuth) {
            const eventResult = await db.execute({
                sql: 'SELECT name, payment_token, user_id FROM events WHERE id = ?',
                args: [eventId],
            });

            if (eventResult.rows.length > 0) {
                const event = eventResult.rows[0];
                await sendPaymentLinkEmail(
                    event.user_id as string,
                    email,
                    event.payment_token as string,
                    event.name as string
                );
            }
        }

        return NextResponse.json({ success: true, statusId, paymentUserId });
    } catch (e) {
        console.error('Failed to create payment user:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
