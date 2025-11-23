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
        const { userId, name, selectedConditions, paymentMethod, paymentConfigId } = body;

        if (!userId || !name || !paymentMethod || !paymentConfigId) {
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
            sql: 'SELECT id, is_authenticated, status, payment_method, paypay_payment_id, payment_details FROM payment_users WHERE id = ? AND event_id = ?',
            args: [userId, event.id],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        if (!user.is_authenticated) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        if (user.status === 'PAID') {
            return NextResponse.json({ error: 'Already paid' }, { status: 400 });
        }

        const configResult = await db.execute({
            sql: 'SELECT type, config_json FROM payment_configs WHERE id = ?',
            args: [paymentConfigId],
        });

        if (configResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payment config not found' }, { status: 404 });
        }

        const config = configResult.rows[0];
        const configJson = JSON.parse(config.config_json as string);

        if (config.type === 'PAYPAY' && user.payment_method === 'PAYPAY' && user.paypay_payment_id) {
            let paymentUrl: string | undefined;
            
            if (user.payment_details) {
                try {
                    const details = JSON.parse(user.payment_details as string);
                    paymentUrl = details.paymentUrl;
                } catch {
                }
            }

            return NextResponse.json({
                success: true,
                amount: user.amount_due as number || 0,
                paymentInfo: {
                    type: 'PAYPAY',
                    paymentUrl: paymentUrl,
                    paymentId: user.paypay_payment_id,
                },
                existingPayment: true,
            });
        }

        const baseAmount = event.base_amount as number || 0;
        const conditions = JSON.parse(event.conditions_json as string || '[]');
        let totalAmount = baseAmount;

        if (selectedConditions && conditions.length > 0) {
            for (const condition of conditions) {
                const selectedValue = selectedConditions[condition.id];
                if (selectedValue !== undefined) {
                    const option = condition.options.find((o: { value: string }) => o.value === selectedValue);
                    if (option && option.priceModifier) {
                        totalAmount += option.priceModifier;
                    }
                    if (Array.isArray(selectedValue)) {
                        for (const val of selectedValue) {
                            const opt = condition.options.find((o: { value: string }) => o.value === val);
                            if (opt && opt.priceModifier) {
                                totalAmount += opt.priceModifier;
                            }
                        }
                    }
                }
            }
        }

        let paymentInfo: Record<string, unknown> = {};

        if (config.type === 'PAYPAY') {
            const paypayResult = await createPayPayPayment(
                configJson,
                userId,
                totalAmount,
                `Payment for event`
            );

            if (!paypayResult.success) {
                if (paypayResult.error?.includes('DUPLICATE_DYNAMIC_QR_REQUEST') || 
                    paypayResult.error?.includes('Duplicate')) {
                    const existingUserResult = await db.execute({
                        sql: 'SELECT paypay_payment_id, payment_details FROM payment_users WHERE id = ?',
                        args: [userId],
                    });
                    
                    if (existingUserResult.rows.length > 0) {
                        const existingUser = existingUserResult.rows[0];
                        let paymentUrl: string | undefined;
                        
                        if (existingUser.payment_details) {
                            try {
                                const details = JSON.parse(existingUser.payment_details as string);
                                paymentUrl = details.paymentUrl;
                            } catch {
                            }
                        }

                        return NextResponse.json({
                            success: true,
                            amount: totalAmount,
                            paymentInfo: {
                                type: 'PAYPAY',
                                paymentUrl: paymentUrl,
                                paymentId: existingUser.paypay_payment_id,
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
                type: 'PAYPAY',
                paymentUrl: paypayResult.paymentUrl,
                paymentId: paypayResult.paymentId,
            };

            const paymentDetails = JSON.stringify({
                paymentUrl: paypayResult.paymentUrl,
                createdAt: new Date().toISOString(),
            });

            await db.execute({
                sql: `UPDATE payment_users SET
                      name = ?, amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = ?, payment_details = ?, status = 'PENDING'
                      WHERE id = ?`,
                args: [name, totalAmount, JSON.stringify(selectedConditions), 'PAYPAY', paypayResult.paymentId, paymentDetails, userId],
            });
        } else if (config.type === 'PAYPAY_LINK') {
            paymentInfo = {
                type: 'PAYPAY_LINK',
                paymentLink: configJson.paymentLink,
            };

            await db.execute({
                sql: `UPDATE payment_users SET
                      name = ?, amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [name, totalAmount, JSON.stringify(selectedConditions), 'PAYPAY_LINK', userId],
            });
        } else if (config.type === 'BANK') {
            paymentInfo = {
                type: 'BANK',
                bankName: configJson.bankName,
                branchName: configJson.branchName,
                accountType: configJson.accountType,
                accountNumber: configJson.accountNumber,
                accountHolder: configJson.accountHolder,
            };

            await db.execute({
                sql: `UPDATE payment_users SET
                      name = ?, amount_due = ?, selected_conditions = ?,
                      payment_method = ?, paypay_payment_id = NULL, payment_details = NULL, status = 'PENDING'
                      WHERE id = ?`,
                args: [name, totalAmount, JSON.stringify(selectedConditions), 'BANK', userId],
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
