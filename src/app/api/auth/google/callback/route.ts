import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return NextResponse.redirect(new URL('/dashboard?error=missing_params', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        await db.execute({
            sql: 'UPDATE users SET gmail_refresh_token = ?, gmail_email = ? WHERE id = ?',
            args: [tokens.refresh_token || null, email || null, state],
        });

        return NextResponse.redirect(new URL('/dashboard?gmail=connected', request.url));
    } catch (e) {
        console.error('Gmail OAuth callback failed:', e);
        return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url));
    }
}
