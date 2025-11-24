import { db } from './db';
import { randomUUID } from 'crypto';

export async function saveLineMessage(
    lineUserId: string,
    groupId: string | null,
    roomId: string | null,
    messageType: string,
    messageText: string | null,
    messageJson: string | null
) {
    try {
        await db.execute({
            sql: `INSERT INTO line_messages (id, line_user_id, group_id, room_id, message_type, message_text, message_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                randomUUID(),
                lineUserId,
                groupId,
                roomId,
                messageType,
                messageText,
                messageJson,
            ],
        });
    } catch (e) {
        console.error('Failed to save LINE message:', e);
    }
}

export async function getMessageHistory(
    groupId: string | null,
    roomId: string | null,
    days: number = 1
): Promise<string[]> {
    try {
        const sourceId = groupId || roomId;
        if (!sourceId) return [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const result = await db.execute({
            sql: `SELECT message_text, created_at
                  FROM line_messages
                  WHERE (group_id = ? OR room_id = ?)
                    AND message_type = 'text'
                    AND message_text IS NOT NULL
                    AND DATE(created_at) >= ?
                  ORDER BY created_at ASC`,
            args: [sourceId, sourceId, cutoffDateStr],
        });

        return result.rows.map((row: any) => row.message_text as string);
    } catch (e) {
        console.error('Failed to get message history:', e);
        return [];
    }
}

