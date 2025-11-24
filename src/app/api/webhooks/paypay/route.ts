import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPaymentCompleteEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { merchant_payment_id, state } = body;

        if (!merchant_payment_id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        if (state === 'COMPLETED') {
            const paidAt = new Date().toISOString();
            
            const statusResult = await db.execute({
                sql: `SELECT ps.*, pu.email, e.name as event_name, e.user_id, ps.amount_due, ps.payment_method
                      FROM payment_status ps
                      JOIN payment_users pu ON ps.payment_user_id = pu.id
                      JOIN events e ON ps.event_id = e.id
                      WHERE ps.paypay_payment_id = ?`,
                args: [merchant_payment_id],
            });

            if (statusResult.rows.length > 0) {
                const status = statusResult.rows[0];
                const previousStatus = status.status as string;

            await db.execute({
                sql: `UPDATE payment_status SET status = 'PAID', payment_details = ? WHERE paypay_payment_id = ?`,
                    args: [JSON.stringify({ paidAt, ...body }), merchant_payment_id],
                });

                if (previousStatus !== 'PAID' && status.email && status.user_id) {
                    const paymentMethodMap: Record<string, string> = {
                        'PAYPAY': 'PayPay',
                        'PAYPAY_MERCHANT': 'PayPay (加盟店)',
                        'BANK': '銀行振込',
                        'CASH': '現金支払い',
                    };
                    const paymentMethodName = paymentMethodMap[status.payment_method as string] || status.payment_method as string;
                    const paidDate = new Date(paidAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

                    await sendPaymentCompleteEmail(
                        status.user_id as string,
                        status.email as string,
                        status.event_name as string,
                        status.amount_due as number,
                        paymentMethodName,
                        paidDate
                    );
                }
            }
        } else if (state === 'FAILED' || state === 'CANCELED') {
            await db.execute({
                sql: `UPDATE payment_status SET status = 'UNPAID' WHERE paypay_payment_id = ?`,
                args: [merchant_payment_id],
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('PayPay webhook error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
