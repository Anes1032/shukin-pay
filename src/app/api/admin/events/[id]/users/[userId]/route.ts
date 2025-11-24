import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendPaymentCompleteEmail } from '@/lib/email';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: eventId, userId: statusId } = await params;

    try {
        const currentStatusResult = await db.execute({
            sql: 'SELECT status FROM payment_status WHERE id = ? AND event_id = ?',
            args: [statusId, eventId],
        });

        if (currentStatusResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payment status not found' }, { status: 404 });
        }

        const currentStatus = currentStatusResult.rows[0].status as string;
        if (currentStatus === 'PAID') {
            return NextResponse.json({ error: 'Cannot update payment user with PAID status' }, { status: 403 });
        }

        const body = await request.json();
        const { status, name, amountDue, paymentMethod, selectedConditions, paymentConfigId } = body;

        let paymentDetailsToUpdate: Record<string, unknown> | undefined = undefined;
        if (paymentConfigId !== undefined || body.paymentDetails !== undefined) {
            const existingStatusResult = await db.execute({
                sql: 'SELECT payment_details FROM payment_status WHERE id = ?',
                args: [statusId],
            });

            if (existingStatusResult.rows.length > 0 && existingStatusResult.rows[0].payment_details) {
                try {
                    paymentDetailsToUpdate = JSON.parse(existingStatusResult.rows[0].payment_details as string);
                } catch {
                    paymentDetailsToUpdate = {};
                }
            } else {
                paymentDetailsToUpdate = {};
            }

            if (body.paymentDetails !== undefined) {
                if (typeof body.paymentDetails === 'string') {
                    try {
                        paymentDetailsToUpdate = JSON.parse(body.paymentDetails);
                    } catch {
                        paymentDetailsToUpdate = body.paymentDetails;
                    }
                } else {
                    paymentDetailsToUpdate = body.paymentDetails;
                }
            }

            if (paymentConfigId !== undefined && paymentDetailsToUpdate !== undefined) {
                paymentDetailsToUpdate.paymentConfigId = paymentConfigId;
            }
        }

        const statusUpdates: string[] = [];
        const statusArgs: (string | number | null)[] = [];

        if (status !== undefined) {
            statusUpdates.push('status = ?');
            statusArgs.push(status);
        }
        if (amountDue !== undefined) {
            statusUpdates.push('amount_due = ?');
            statusArgs.push(amountDue);
        }
        if (paymentMethod !== undefined) {
            statusUpdates.push('payment_method = ?');
            statusArgs.push(paymentMethod);
        }
        if (paymentDetailsToUpdate !== undefined) {
            statusUpdates.push('payment_details = ?');
            statusArgs.push(JSON.stringify(paymentDetailsToUpdate));
        }
        if (selectedConditions !== undefined) {
            statusUpdates.push('selected_conditions = ?');
            statusArgs.push(JSON.stringify(selectedConditions));
        }

        if (statusUpdates.length > 0) {
            const wasPaid = currentStatus === 'PAID';
            const willBePaid = status === 'PAID';

            statusArgs.push(statusId);
            statusArgs.push(eventId);
            await db.execute({
                sql: `UPDATE payment_status SET ${statusUpdates.join(', ')} WHERE id = ? AND event_id = ?`,
                args: statusArgs,
            });

            if (!wasPaid && willBePaid) {
                const paymentUserResult = await db.execute({
                    sql: `SELECT ps.*, pu.email, e.name as event_name, e.user_id, ps.amount_due, ps.payment_method
                          FROM payment_status ps
                          JOIN payment_users pu ON ps.payment_user_id = pu.id
                          JOIN events e ON ps.event_id = e.id
                          WHERE ps.id = ?`,
                    args: [statusId],
                });

                if (paymentUserResult.rows.length > 0) {
                    const paymentUser = paymentUserResult.rows[0];
                    if (paymentUser.email && paymentUser.user_id) {
                        const paymentMethodMap: Record<string, string> = {
                            'PAYPAY': 'PayPay',
                            'PAYPAY_MERCHANT': 'PayPay (加盟店)',
                            'BANK': '銀行振込',
                            'CASH': '現金支払い',
                        };
                        const paymentMethodName = paymentMethodMap[paymentUser.payment_method as string] || paymentUser.payment_method as string;
                        const paidAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

                        await sendPaymentCompleteEmail(
                            paymentUser.user_id as string,
                            paymentUser.email as string,
                            paymentUser.event_name as string,
                            paymentUser.amount_due as number,
                            paymentMethodName,
                            paidAt
                        );
                    }
                }
            }
        }

        if (name !== undefined) {
            const statusResult = await db.execute({
                sql: 'SELECT payment_user_id FROM payment_status WHERE id = ?',
                args: [statusId],
            });

            if (statusResult.rows.length > 0) {
                await db.execute({
                    sql: 'UPDATE payment_users SET name = ? WHERE id = ?',
                    args: [name, statusResult.rows[0].payment_user_id],
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to update payment user:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: eventId, userId: statusId } = await params;

    try {
        const currentStatusResult = await db.execute({
            sql: 'SELECT status FROM payment_status WHERE id = ? AND event_id = ?',
            args: [statusId, eventId],
        });

        if (currentStatusResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payment status not found' }, { status: 404 });
        }

        const currentStatus = currentStatusResult.rows[0].status as string;
        if (currentStatus === 'PAID') {
            return NextResponse.json({ error: 'Cannot delete payment user with PAID status' }, { status: 403 });
        }

        await db.execute({
            sql: 'DELETE FROM payment_status WHERE id = ? AND event_id = ?',
            args: [statusId, eventId],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete payment status:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
