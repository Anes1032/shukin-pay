import { google } from 'googleapis';
import { db } from './db';

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
);

const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'ja';

const messages = {
    ja: {
        authSubject: 'メールアドレス認証',
        authBody: (verifyUrl: string) =>
            `以下のリンクをクリックして、メールアドレスの認証を完了し、決済に進んでください。\n\n${verifyUrl}`,
        paymentSubject: (eventName: string) => `お支払いのお願い: ${eventName}`,
        paymentBody: (eventName: string, paymentUrl: string) =>
            `「${eventName}」へのお支払いをお願いいたします。\n\n以下のリンクから決済を行ってください。\n\n${paymentUrl}`,
    },
    en: {
        authSubject: 'Email Verification',
        authBody: (verifyUrl: string) =>
            `Please click the following link to verify your email and proceed to payment:\n\n${verifyUrl}`,
        paymentSubject: (eventName: string) => `Payment Request: ${eventName}`,
        paymentBody: (eventName: string, paymentUrl: string) =>
            `You have been invited to make a payment for "${eventName}".\n\nPlease click the following link to proceed:\n\n${paymentUrl}`,
    },
};

function getMessages() {
    return messages[locale as keyof typeof messages] || messages.ja;
}

async function getGmailCredentials(adminId: string): Promise<{ refreshToken: string; email: string } | null> {
    const result = await db.execute({
        sql: 'SELECT gmail_refresh_token, gmail_email FROM admins WHERE id = ?',
        args: [adminId],
    });

    if (result.rows.length === 0 || !result.rows[0].gmail_refresh_token) {
        return null;
    }

    return {
        refreshToken: result.rows[0].gmail_refresh_token as string,
        email: result.rows[0].gmail_email as string,
    };
}

async function sendEmail(credentials: { refreshToken: string; email: string }, toEmail: string, subject: string, body: string) {
    oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const encodedMessage = Buffer.from(
        `To: ${toEmail}\r\n` +
        `From: ${credentials.email}\r\n` +
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
        body
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });
}

export async function sendAuthEmail(adminId: string, toEmail: string, eventToken: string, authToken: string) {
    const credentials = await getGmailCredentials(adminId);

    if (!credentials) {
        console.error('Gmail not configured for admin:', adminId);
        return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/pay/${eventToken}/verify?token=${authToken}`;

    const msg = getMessages();
    const subject = msg.authSubject;
    const body = msg.authBody(verifyUrl);

    try {
        await sendEmail(credentials, toEmail, subject, body);
        return true;
    } catch (e) {
        console.error('Failed to send auth email:', e);
        return false;
    }
}

export async function sendPaymentLinkEmail(adminId: string, toEmail: string, eventToken: string, eventName: string) {
    const credentials = await getGmailCredentials(adminId);

    if (!credentials) {
        console.error('Gmail not configured for admin:', adminId);
        return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/pay/${eventToken}`;

    const msg = getMessages();
    const subject = msg.paymentSubject(eventName);
    const body = msg.paymentBody(eventName, paymentUrl);

    try {
        await sendEmail(credentials, toEmail, subject, body);
        return true;
    } catch (e) {
        console.error('Failed to send payment link email:', e);
        return false;
    }
}
