import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { merchant_payment_id, state } = body;

        if (!merchant_payment_id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        if (state === 'COMPLETED') {
            await db.execute({
                sql: `UPDATE payment_users SET status = 'PAID', payment_details = ? WHERE paypay_payment_id = ?`,
                args: [JSON.stringify({ paidAt: new Date().toISOString(), ...body }), merchant_payment_id],
            });
        } else if (state === 'FAILED' || state === 'CANCELED') {
            await db.execute({
                sql: `UPDATE payment_users SET status = 'UNPAID' WHERE paypay_payment_id = ?`,
                args: [merchant_payment_id],
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('PayPay webhook error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
