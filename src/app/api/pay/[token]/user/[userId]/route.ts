import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPaymentStatus } from '@/lib/paypay';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string; userId: string }> }
) {
    const { token, userId: paymentUserId } = await params;

    try {
        const eventResult = await db.execute({
            sql: 'SELECT id FROM events WHERE payment_token = ? AND is_active = 1',
            args: [token],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];

        const statusResult = await db.execute({
            sql: `SELECT ps.*, pu.name
                  FROM payment_status ps
                  JOIN payment_users pu ON ps.payment_user_id = pu.id
                  WHERE ps.payment_user_id = ? AND ps.event_id = ?`,
            args: [paymentUserId, event.id],
        });

        if (statusResult.rows.length === 0) {
            return NextResponse.json({
                hasExistingPayment: false,
            });
        }

        const status = statusResult.rows[0];

        if (status.payment_method) {
            let paymentInfo: Record<string, unknown> = {};

            if (status.payment_method === 'PAYPAY') {
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
                    paymentInfo = {
                        type: 'PAYPAY',
                        paymentLink: configJson.paymentLink,
                    };
                }
            } else if (status.payment_method === 'PAYPAY_MERCHANT' && status.paypay_payment_id) {
                let paymentUrl: string | undefined;

                if (status.payment_details) {
                    try {
                        const details = JSON.parse(status.payment_details as string);
                        paymentUrl = details.paymentUrl;
                    } catch {
                    }
                }

                if (!paymentUrl && status.paypay_payment_id) {
                    const configResult = await db.execute({
                        sql: `SELECT pc.config_json
                              FROM events e
                              JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                              WHERE e.id = ? AND pc.type = 'PAYPAY_MERCHANT'
                              LIMIT 1`,
                        args: [event.id],
                    });

                    if (configResult.rows.length > 0) {
                        const configJson = JSON.parse(configResult.rows[0].config_json as string);
                        const paypayStatusResult = await getPaymentStatus(
                            configJson,
                            status.paypay_payment_id as string
                        );

                        if (paypayStatusResult.status !== 'UNKNOWN' && paypayStatusResult.status !== 'ERROR') {
                            return NextResponse.json({
                                hasExistingPayment: true,
                                paymentMethod: 'PAYPAY_MERCHANT',
                                paymentId: status.paypay_payment_id,
                                status: status.status,
                                amount: status.amount_due,
                                name: status.name,
                                selectedConditions: status.selected_conditions ? JSON.parse(status.selected_conditions as string) : {},
                            });
                        }
                    }
                } else if (paymentUrl) {
                    paymentInfo = {
                        type: 'PAYPAY_MERCHANT',
                        paymentUrl: paymentUrl,
                        paymentId: status.paypay_payment_id,
                    };
                }
            } else if (status.payment_method === 'STRIPE') {
                const configResult = await db.execute({
                    sql: `SELECT pc.config_json
                          FROM events e
                          JOIN payment_configs pc ON json_extract(e.payment_config_ids, '$') LIKE '%' || pc.id || '%'
                          WHERE e.id = ? AND pc.type = 'STRIPE'
                          LIMIT 1`,
                    args: [event.id],
                });

                if (configResult.rows.length > 0) {
                    const configJson = JSON.parse(configResult.rows[0].config_json as string);
                    paymentInfo = {
                        type: 'STRIPE',
                        paymentLink: configJson.paymentLink,
                    };
                }
            } else if (status.payment_method === 'BANK') {
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
            } else if (status.payment_method === 'CASH') {
                paymentInfo = {
                    type: 'CASH',
                };
            }

            return NextResponse.json({
                hasExistingPayment: true,
                paymentMethod: status.payment_method,
                paymentInfo: paymentInfo,
                status: status.status,
                amount: status.amount_due,
                name: status.name,
                selectedConditions: status.selected_conditions ? JSON.parse(status.selected_conditions as string) : {},
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
