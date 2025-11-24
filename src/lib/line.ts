import { Client, ClientConfig } from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const config: ClientConfig = {
    channelAccessToken,
};

export const lineClient = channelAccessToken ? new Client(config) : null;

export async function sendLineMessage(userId: string, message: string) {
    if (!lineClient) {
        console.error('LINE client not configured');
        return false;
    }

    try {
        await lineClient.pushMessage(userId, {
            type: 'text',
            text: message,
        });
        return true;
    } catch (e) {
        console.error('Failed to send LINE message:', e);
        return false;
    }
}

export async function sendLineMessageToGroup(groupId: string, message: string) {
    if (!lineClient) {
        console.error('LINE client not configured');
        return false;
    }

    try {
        await lineClient.pushMessage(groupId, {
            type: 'text',
            text: message,
        });
        return true;
    } catch (e) {
        console.error('Failed to send LINE message to group:', e);
        return false;
    }
}

export async function sendLineMessageToRoom(roomId: string, message: string) {
    if (!lineClient) {
        console.error('LINE client not configured');
        return false;
    }

    try {
        await lineClient.pushMessage(roomId, {
            type: 'text',
            text: message,
        });
        return true;
    } catch (e) {
        console.error('Failed to send LINE message to room:', e);
        return false;
    }
}

