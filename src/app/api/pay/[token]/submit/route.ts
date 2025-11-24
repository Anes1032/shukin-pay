import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPayPayPayment } from '@/lib/paypay';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const body = await request.json();
        const { userId, paymentUserId, name, selectedConditions, paymentMethod, paymentConfigId } = body;
        const actualPaymentUserId = paymentUserId || userId;

        if (!actualPaymentUserId || !name || !paymentMethod) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (paymentMethod !== 'CASH' && !paymentConfigId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventResult = await db.execute({
            sql: 'SELECT id, base_amount, conditions_json FROM events WHERE payment_token = ? AND is_active = 1',
            args: [token],
        });

        if (eventResult.rows.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = eventResult.rows[0];

        const userResult = await db.execute({
            sql: 'SELECT id, is_authenticated FROM payment_users WHERE id = ?',
            args: [actualPaymentUserId],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        if (!user.is_authenticated) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        let statusResult = await db.execute({
            sql: 'SELECT id, status, payment_method, paypay_payment_id, payment_details FROM payment_status WHERE payment_user_id = ? AND event_id = ?',
            args: [actualPaymentUserId, event.id],
        });

        let statusId: string;
        if (statusResult.rows.length === 0) {
            statusId = crypto.randomUUID();
            await db.execute({
                sql: `INSERT INTO payment_status (id, payment_user_id, event_id, status) VALUES (?, ?, ?, 'UNPAID')`,
                args: [statusId, actualPaymentUserId, event.id],
            });
            statusResult = await db.execute({
                sql: 'SELECT id, status, payment_method, paypay_payment_id, payment_details FROM payment_status WHERE id = ?',
                args: [statusId],
            });
        }

        const status = statusResult.rows[0];
        statusId = status.id as string;

        if (status.status === 'PAID') {
            return NextResponse.json({ error: 'Already paid' }, { status: 400 });
        }

        let config: any = null;
        let configJson: any = null;
        
        if (paymentMethod !== 'CASH') {
        const configResult = await db.execute({
            sql: 'SELECT type, config_json FROM payment_configs WHERE id = ?',
            args: [paymentConfigId],
        });

        if (configResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payment config not found' }, { status: 404 });
        }

            config = configResult.rows[0];
            configJson = JSON.parse(config.config_json as string);
        }

        if (config && config.type === 'PAYPAY_MERCHANT' && status.payment_method === 'PAYPAY_MERCHANT' && status.paypay_payment_id) {
            let paymentUrl: string | undefined;

            if (status.payment_details) {
                try {
                    const details = JSON.parse(status.payment_details as string);
                    paymentUrl = details.paymentUrl;
                } catch {
                }
            }

            return NextResponse.json({
                success: true,
                amount: status.amount_due as number || 0,
                paymentInfo: {
                    type: 'PAYPAY_MERCHANT',
                    paymentUrl: paymentUrl,
                    paymentId: status.paypay_payment_id,
                },
                existingPayment: true,
            });
        }

        if (false) {
            let paymentUrl: string | undefined;

            if (status.payment_details) {
                try {
                    const details = JSON.parse(status.payment_details as string);
                    paymentUrl = details.paymentUrl;
                } catch {
                }
            }

            return NextResponse.json({
                success: true,
                amount: status.amount_due as number || 0,
                paymentInfo: {
                    type: 'PAYPAY',
                    paymentUrl: paymentUrl,
                    paymentId: status.paypay_payment_id,
                },
                existingPayment: true,
            });
        }

        const baseAmount = event.base_amount as number || 0;
        const conditions = JSON.parse(event.conditions_json as string || '[]');
        let totalAmount = 0;

        if (conditions.length === 0) {
            totalAmount = baseAmount;
        } else if (selectedConditions && conditions.length > 0) {
            const condition = conditions[0];
                const selectedValue = selectedConditions[condition.id];
            
                if (selectedValue !== undefined) {
                if (condition.type === 'radio') {
                    const option = condition.options.find((o: { value: string }) => o.value === selectedValue);
                    if (option && option.priceModifier !== undefined) {
                        totalAmount = option.priceModifier;
                    }
                } else if (condition.type === 'checkbox' && Array.isArray(selectedValue)) {
                        for (const val of selectedValue) {
                            const opt = condition.options.find((o: { value: string }) => o.value === val);
                        if (opt && opt.priceModifier !== undefined) {
                                totalAmount += opt.priceModifier;
                        }
                    }
                }
            }
        }

        let paymentInfo: Record<string, unknown> = {};

        await db.execute({
            sql: 'UPDATE payment_users SET name = ? WHERE id = ?',
            args: [name, actualPaymentUserId],
        });

        if (paymentMethod === 'CASH') {
            paymentInfo = {
                type: 'CASH',
            };

            await db.execute({
                sql: `UPDATE payment_status SET
                      amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [totalAmount, JSON.stringify(selectedConditions), 'CASH', statusId],
            });
        } else if (config && config.type === 'PAYPAY') {
            paymentInfo = {
                type: 'PAYPAY',
                paymentLink: configJson.paymentLink,
            };

            await db.execute({
                sql: `UPDATE payment_status SET
                      amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [totalAmount, JSON.stringify(selectedConditions), 'PAYPAY', statusId],
            });
        } else if (config && config.type === 'PAYPAY_MERCHANT') {
            const paypayResult = await createPayPayPayment(
                configJson,
                statusId,
                totalAmount,
                `Payment for event`
            );

            if (!paypayResult.success) {
                if (paypayResult.error?.includes('DUPLICATE_DYNAMIC_QR_REQUEST') ||
                    paypayResult.error?.includes('Duplicate')) {
                    const existingStatusResult = await db.execute({
                        sql: 'SELECT paypay_payment_id, payment_details FROM payment_status WHERE id = ?',
                        args: [statusId],
                    });

                    if (existingStatusResult.rows.length > 0) {
                        const existingStatus = existingStatusResult.rows[0];
                        let paymentUrl: string | undefined;

                        if (existingStatus.payment_details) {
                            try {
                                const details = JSON.parse(existingStatus.payment_details as string);
                                paymentUrl = details.paymentUrl;
                            } catch {
                            }
                        }

                        return NextResponse.json({
                            success: true,
                            amount: totalAmount,
                            paymentInfo: {
                                type: 'PAYPAY_MERCHANT',
                                paymentUrl: paymentUrl,
                                paymentId: existingStatus.paypay_payment_id,
                            },
                            existingPayment: true,
                        });
                    }
                }

                return NextResponse.json({
                    error: paypayResult.error || 'Failed to create PayPay payment'
                }, { status: 500 });
            }

            paymentInfo = {
                type: 'PAYPAY_MERCHANT',
                paymentUrl: paypayResult.paymentUrl,
                paymentId: paypayResult.paymentId,
            };

            const paymentDetails = JSON.stringify({
                paymentUrl: paypayResult.paymentUrl,
                createdAt: new Date().toISOString(),
            });

            await db.execute({
                sql: `UPDATE payment_status SET
                      amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = ?, payment_details = ?, status = 'PENDING'
                      WHERE id = ?`,
                args: [totalAmount, JSON.stringify(selectedConditions), 'PAYPAY_MERCHANT', paypayResult.paymentId || null, paymentDetails, statusId],
            });
        } else if (config && config.type === 'STRIPE') {
            paymentInfo = {
                type: 'STRIPE',
                paymentLink: configJson.paymentLink,
            };

            await db.execute({
                sql: `UPDATE payment_status SET
                      amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [totalAmount, JSON.stringify(selectedConditions), 'STRIPE', statusId],
            });
        } else if (config && config.type === 'BANK') {
            paymentInfo = {
                type: 'BANK',
                bankName: configJson.bankName,
                branchName: configJson.branchName,
                accountType: configJson.accountType,
                accountNumber: configJson.accountNumber,
                accountHolder: configJson.accountHolder,
            };

            await db.execute({
                sql: `UPDATE payment_status SET
                      amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [totalAmount, JSON.stringify(selectedConditions), 'BANK', statusId],
            });
        }

        return NextResponse.json({
            success: true,
            amount: totalAmount,
            paymentInfo,
        });
    } catch (e) {
        console.error('Failed to submit payment:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
