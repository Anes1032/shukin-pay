import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lineClient } from '@/lib/line';
import { saveLineMessage, getMessageHistory } from '@/lib/line-messages';
import { createEventFromMessages } from '@/lib/llm';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_OFFICIAL_USER_ID = process.env.LINE_OFFICIAL_USER_ID || '';

function verifySignature(body: string, signature: string): boolean {
    if (!CHANNEL_SECRET) return false;
    const hash = crypto
        .createHmac('sha256', CHANNEL_SECRET)
        .update(body)
        .digest('base64');
    return hash === signature;
}

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-line-signature') || '';

        if (!verifySignature(body, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const events = JSON.parse(body).events || [];

        console.log('LINE Webhook payload:', JSON.stringify(JSON.parse(body), null, 2));

        for (const event of events) {
            if (event.type === 'follow') {
                const userId = event.source.userId;
                const linkId = event.link?.linkId || null;

                if (linkId) {
                    const tokenResult = await db.execute({
                        sql: 'SELECT user_id FROM line_link_tokens WHERE token = ? AND expires_at > datetime("now")',
                        args: [linkId],
                    });

                    if (tokenResult.rows.length > 0) {
                        const appUserId = tokenResult.rows[0].user_id as string;
                        await db.execute({
                            sql: 'UPDATE users SET line_user_id = ? WHERE id = ?',
                            args: [userId, appUserId],
                        });

                        await db.execute({
                            sql: 'DELETE FROM line_link_tokens WHERE token = ?',
                            args: [linkId],
                        });
                    }
                }
            } else if (event.type === 'message' && event.message.type === 'text') {
                const userId = event.source.userId;
                const messageText = event.message.text.trim();
                const replyToken = 'replyToken' in event ? (event as { replyToken: string }).replyToken : null;
                const groupId = event.source.type === 'group' ? (event.source as { groupId: string }).groupId : null;
                const roomId = event.source.type === 'room' ? (event.source as { roomId: string }).roomId : null;

                await saveLineMessage(
                    userId,
                    groupId || null,
                    roomId || null,
                    'text',
                    messageText,
                    JSON.stringify(event.message)
                );

                const messageWithMentions = event.message as { 
                    mention?: { 
                        mentionees?: Array<{ 
                            type?: string;
                            userId?: string;
                            index?: number;
                            length?: number;
                        }> 
                    } 
                };
                console.log('Mention check:', {
                    LINE_OFFICIAL_USER_ID,
                    mentionees: messageWithMentions.mention?.mentionees,
                    groupId,
                    roomId,
                });

                const isGroupChat = groupId !== null || roomId !== null;
                const mentionedMe = messageWithMentions.mention?.mentionees?.some(
                    (mentionees) => {
                        const isMatch = mentionees.type === 'user' && mentionees.userId === LINE_OFFICIAL_USER_ID;
                        console.log(`Mention check: type=${mentionees.type}, userId=${mentionees.userId}, LINE_OFFICIAL_USER_ID=${LINE_OFFICIAL_USER_ID}, isMatch=${isMatch}`);
                        return isMatch;
                    }
                ) || false;

                console.log('mentionedMe:', mentionedMe, 'isGroupChat:', isGroupChat);

                if (isGroupChat && !mentionedMe) {
                    console.log('Group chat without mention, skipping...');
                    continue;
                }

                let messageTextWithoutMention = messageText;
                if (messageWithMentions.mention?.mentionees) {
                    for (const mentionee of messageWithMentions.mention.mentionees) {
                        const mentionText = messageText.substring(mentionee.index || 0, (mentionee.index || 0) + (mentionee.length || 0));
                        messageTextWithoutMention = messageTextWithoutMention.replace(mentionText, '').trim();
                    }
                }

                let isLinkTokenProcessed = false;

                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const cleanedTokenText = messageTextWithoutMention.replace(/\s+/g, '').trim();
                const isPotentialToken = cleanedTokenText && uuidRegex.test(cleanedTokenText);

                if (isPotentialToken) {
                    const tokenResult = await db.execute({
                        sql: 'SELECT user_id FROM line_link_tokens WHERE token = ? AND expires_at > datetime("now")',
                        args: [cleanedTokenText],
                    });

                    if (tokenResult.rows.length > 0) {
                        isLinkTokenProcessed = true;
                        const existingUserResult = await db.execute({
                            sql: 'SELECT id FROM users WHERE line_user_id = ?',
                            args: [userId],
                        });

                        if (existingUserResult.rows.length === 0) {
                            const appUserId = tokenResult.rows[0].user_id as string;
                            await db.execute({
                                sql: 'UPDATE users SET line_user_id = ? WHERE id = ?',
                                args: [userId, appUserId],
                            });

                            await db.execute({
                                sql: 'DELETE FROM line_link_tokens WHERE token = ?',
                                args: [cleanedTokenText],
                            });

                            if (lineClient && replyToken) {
                                try {
                                    await lineClient.replyMessage(replyToken, {
                                        type: 'text',
                                        text: '連携が完了しました！',
                                    });
                                } catch (e) {
                                    console.error('Failed to send reply message:', e);
                                }
                            }
                        } else {
                            if (lineClient && replyToken) {
                                try {
                                    await lineClient.replyMessage(replyToken, {
                                        type: 'text',
                                        text: '既に連携済みです。',
                                    });
                                } catch (e) {
                                    console.error('Failed to send reply message:', e);
                                }
                            }
                        }
                    }
                }

                if (isLinkTokenProcessed) {
                    continue;
                }

                const textToCheck = isGroupChat ? messageTextWithoutMention : messageText;
                const cleanedText = textToCheck.replace(/\s+/g, '').trim();
                const isShukinOnly = cleanedText === '集金';

                console.log('Message check:', { 
                    mentionedMe, 
                    messageText, 
                    messageTextWithoutMention,
                    textToCheck,
                    cleanedText,
                    isShukinOnly,
                    isGroupChat
                });

                const shouldProcess = isGroupChat ? (mentionedMe && isShukinOnly) : isShukinOnly;

                if (shouldProcess) {
                    const userResult = await db.execute({
                        sql: 'SELECT id FROM users WHERE line_user_id = ?',
                        args: [userId],
                    });

                    if (userResult.rows.length === 0) {
                        if (lineClient && replyToken) {
                            try {
                                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                                await lineClient.replyMessage(replyToken, {
                                    type: 'text',
                                    text: `集金イベントを作成するには、アプリケーションにユーザー登録し、LINEアカウントと連携する必要があります。\n\nアプリケーションにアクセスして、LINE連携を行ってください。\n\n${appUrl}/dashboard`,
                                });
                            } catch (e) {
                                console.error('Failed to send reply message:', e);
                            }
                        }
                        continue;
                    }

                    const appUserId = userResult.rows[0].id as string;

                    try {
                        const messageHistory = await getMessageHistory(groupId, roomId, 1, userId);

                        if (messageHistory.length === 0) {
                            if (lineClient && replyToken) {
                                try {
                                    await lineClient.replyMessage(replyToken, {
                                        type: 'text',
                                        text: 'トーク履歴が見つかりませんでした。メッセージを送信してから再度お試しください。',
                                    });
                                } catch (e) {
                                    console.error('Failed to send reply message:', e);
                                }
                            }
                            continue;
                        }

                        if (lineClient && replyToken) {
                            try {
                                await lineClient.replyMessage(replyToken, {
                                    type: 'text',
                                    text: 'イベントを作成中です。少々お待ちください...',
                                });
                            } catch (e) {
                                console.error('Failed to send reply message:', e);
                            }
                        }

                        const eventData = await createEventFromMessages(messageHistory);

                        const userSettingsResult = await db.execute({
                            sql: 'SELECT default_payment_config_ids FROM users WHERE id = ?',
                            args: [appUserId],
                        });

                        const defaultPaymentConfigIds = userSettingsResult.rows.length > 0
                            ? (userSettingsResult.rows[0].default_payment_config_ids
                                ? JSON.parse(userSettingsResult.rows[0].default_payment_config_ids as string)
                                : [])
                            : [];

                        const eventId = randomUUID();
                        const paymentToken = randomUUID();

                        await db.execute({
                            sql: `INSERT INTO events (id, user_id, name, date, base_amount, conditions_json, payment_config_ids, payment_token)
                                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            args: [
                                eventId,
                                appUserId,
                                eventData.name,
                                eventData.date || null,
                                eventData.baseAmount,
                                JSON.stringify(eventData.conditions),
                                JSON.stringify(defaultPaymentConfigIds),
                                paymentToken,
                            ],
                        });

                        const lineEventId = randomUUID();
                        await db.execute({
                            sql: `INSERT INTO line_events (id, user_id, event_id, group_id, room_id, status)
                                  VALUES (?, ?, ?, ?, ?, ?)`,
                            args: [
                                lineEventId,
                                appUserId,
                                eventId,
                                groupId,
                                roomId,
                                'COMPLETED',
                            ],
                        });

                        const eventDetailLines: string[] = [];
                        eventDetailLines.push(`✅ イベント「${eventData.name}」を作成しました！`);

                        if (eventData.date) {
                            const eventDate = new Date(eventData.date);
                            const formattedDate = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`;
                            eventDetailLines.push(`\n📅 開催日: ${formattedDate}`);
                        }

                        eventDetailLines.push(`\n💰 基本参加費: ¥${eventData.baseAmount.toLocaleString()}`);

                        if (eventData.conditions && eventData.conditions.length > 0) {
                            eventDetailLines.push(`\n📋 金額条件:`);
                            for (const condition of eventData.conditions) {
                                const conditionType = condition.type === 'radio' ? '（いずれか1つ選択）' : '（複数選択可）';
                                eventDetailLines.push(`\n  ${condition.label}${conditionType}`);
                                for (const option of condition.options) {
                                    let modifierText: string;
                                    if (condition.type === 'checkbox') {
                                        modifierText = option.priceModifier >= 0 
                                            ? `+¥${option.priceModifier.toLocaleString()}`
                                            : `¥${option.priceModifier.toLocaleString()}`;
                                    } else {
                                        modifierText = `¥${option.priceModifier.toLocaleString()}`;
                                    }
                                    eventDetailLines.push(`    - ${option.label}: ${modifierText}`);
                                }
                            }
                        }

                        const paymentMethodLines: string[] = [];
                        if (defaultPaymentConfigIds.length > 0) {
                            const configsResult = await db.execute({
                                sql: `SELECT id, type, name FROM payment_configs WHERE id IN (${defaultPaymentConfigIds.map(() => '?').join(',')})`,
                                args: defaultPaymentConfigIds,
                            });

                            paymentMethodLines.push('💳 決済方法:');
                            for (const config of configsResult.rows) {
                                const configType = config.type as string;
                                const configName = config.name as string;

                                if (configType === 'PAYPAY') {
                                    paymentMethodLines.push(`  - ${configName} (PayPay)`);
                                } else if (configType === 'PAYPAY_MERCHANT') {
                                    paymentMethodLines.push(`  - ${configName} (PayPay加盟店)`);
                                } else if (configType === 'STRIPE') {
                                    paymentMethodLines.push(`  - ${configName} (Stripe)`);
                                } else if (configType === 'BANK') {
                                    paymentMethodLines.push(`  - ${configName} (銀行振込)`);
                                }
                            }
                        } else {
                            paymentMethodLines.push('💳 決済方法: 現金支払い');
                        }

                        const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pay/${paymentToken}`;
                        eventDetailLines.push(`\n${paymentMethodLines.join('\n')}`);
                        eventDetailLines.push(`\n🔗 決済リンク: ${paymentUrl}`);

                        const targetId = groupId || roomId || userId;

                        if (lineClient && targetId) {
                            try {
                                await lineClient.pushMessage(targetId, {
                                    type: 'text',
                                    text: eventDetailLines.join('\n'),
                                });
                            } catch (e) {
                                console.error('Failed to send event creation message:', e);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to create event from messages:', e);
                        const targetId = groupId || roomId || userId;
                        if (lineClient && targetId) {
                            try {
                                await lineClient.pushMessage(targetId, {
                                    type: 'text',
                                    text: 'イベントの作成に失敗しました。もう一度お試しください。',
                                });
                            } catch (err) {
                                console.error('Failed to send error message:', err);
                            }
                        }
                    }
                } else if (isGroupChat && mentionedMe) {
                    if (lineClient && replyToken) {
                        try {
                            await lineClient.replyMessage(replyToken, {
                                type: 'text',
                                text: '集金イベントを作成するには、以下のようにメンション付きで「集金」と送信してください。\n\n例: @集金Pay 集金\n\nトークルームの過去のメッセージから、イベント情報を自動で抽出して作成します。',
                            });
                        } catch (e) {
                            console.error('Failed to send usage message:', e);
                        }
                    }
                } else if (!isGroupChat && !isShukinOnly) {
                    if (lineClient && replyToken) {
                        try {
                            await lineClient.replyMessage(replyToken, {
                                type: 'text',
                                text: '集金イベントを作成するには、「集金」と送信してください。\n\n過去のメッセージから、イベント情報を自動で抽出して作成します。',
                            });
                        } catch (e) {
                            console.error('Failed to send usage message:', e);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('LINE webhook error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

