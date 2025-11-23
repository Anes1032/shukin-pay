import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPaymentStatus } from '@/lib/paypay';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string; userId: string }> }
) {
    const { token, userId } = await params;

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
            sql: `SELECT id, name, status, amount_due, selected_conditions, payment_method, 
                  paypay_payment_id, payment_details
                  FROM payment_users WHERE id = ? AND event_id = ?`,
            args: [userId, event.id],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        if (user.payment_method === 'PAYPAY' && user.paypay_payment_id) {
            let paymentUrl: string | undefined;
            
            if (user.payment_details) {
                try {
                    const details = JSON.parse(user.payment_details as string);
                    paymentUrl = details.paymentUrl;
                } catch {
                }
            }

            if (!paymentUrl && user.paypay_payment_id) {
                const configResult = await db.execute({
                    sql: `SELECT pc.config_json 
                          FROM events e
                          JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                          WHERE e.id = ? AND pc.type = 'PAYPAY'
                          LIMIT 1`,
                    args: [event.id],
                });

                if (configResult.rows.length > 0) {
                    const configJson = JSON.parse(configResult.rows[0].config_json as string);
                    const statusResult = await getPaymentStatus(
                        configJson,
                        user.paypay_payment_id as string
                    );
                    
                    if (statusResult.status !== 'UNKNOWN' && statusResult.status !== 'ERROR') {
                        return NextResponse.json({
                            hasExistingPayment: true,
                            paymentMethod: 'PAYPAY',
                            paymentId: user.paypay_payment_id,
                            status: user.status,
                            amount: user.amount_due,
                            name: user.name,
                            selectedConditions: user.selected_conditions ? JSON.parse(user.selected_conditions as string) : {},
                        });
                    }
                }
            } else if (paymentUrl) {
                return NextResponse.json({
                    hasExistingPayment: true,
                    paymentMethod: 'PAYPAY',
                    paymentId: user.paypay_payment_id,
                    paymentUrl: paymentUrl,
                    status: user.status,
                    amount: user.amount_due,
                    name: user.name,
                    selectedConditions: user.selected_conditions ? JSON.parse(user.selected_conditions as string) : {},
                });
            }
        }

        if (user.payment_method && user.payment_method !== 'PAYPAY') {
            let paymentInfo: Record<string, unknown> = {};
            
            if (user.payment_method === 'PAYPAY_LINK') {
                const configResult = await db.execute({
                    sql: `SELECT pc.config_json 
                          FROM events e
                          JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                          WHERE e.id = ? AND pc.type = 'PAYPAY_LINK'
                          LIMIT 1`,
                    args: [event.id],
                });
                
                if (configResult.rows.length > 0) {
                    const configJson = JSON.parse(configResult.rows[0].config_json as string);
                    paymentInfo = {
                        type: 'PAYPAY_LINK',
                        paymentLink: configJson.paymentLink,
                    };
                }
            } else if (user.payment_method === 'BANK') {
                const configResult = await db.execute({
                    sql: `SELECT pc.config_json 
                          FROM events e
                          JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                          WHERE e.id = ? AND pc.type = 'BANK'
                          LIMIT 1`,
                    args: [event.id],
                });
                
                if (configResult.rows.length > 0) {
                    const configJson = JSON.parse(configResult.rows[0].config_json as string);
                    paymentInfo = {
                        type: 'BANK',
                        bankName: configJson.bankName,
                        branchName: configJson.branchName,
                        accountType: configJson.accountType,
                        accountNumber: configJson.accountNumber,
                        accountHolder: configJson.accountHolder,
                    };
                }
            }

            return NextResponse.json({
                hasExistingPayment: true,
                paymentMethod: user.payment_method,
                paymentInfo: paymentInfo,
                status: user.status,
                amount: user.amount_due,
                name: user.name,
                selectedConditions: user.selected_conditions ? JSON.parse(user.selected_conditions as string) : {},
            });
        }

        return NextResponse.json({
            hasExistingPayment: false,
        });
    } catch (e) {
        console.error('Failed to get user payment info:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

