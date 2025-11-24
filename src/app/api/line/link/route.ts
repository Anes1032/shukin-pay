import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const userResult = await db.execute({
            sql: 'SELECT line_user_id FROM users WHERE id = ?',
            args: [session.id],
        });

        if (userResult.rows.length > 0 && userResult.rows[0].line_user_id) {
            return NextResponse.json({ 
                success: true, 
                linked: true,
                lineUserId: userResult.rows[0].line_user_id 
            });
        }

        const linkToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await db.execute({
            sql: 'INSERT INTO line_link_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
            args: [randomUUID(), session.id, linkToken, expiresAt.toISOString()],
        });

        const lineOfficialAccountId = process.env.LINE_OFFICIAL_ACCOUNT_ID || '';
        let lineAddUrl: string | null = null;
        
        if (lineOfficialAccountId) {
            const encodedLineId = encodeURIComponent(`${lineOfficialAccountId}`);
            lineAddUrl = `https://line.me/R/ti/p/${encodedLineId}?linkId=${encodeURIComponent(linkToken)}`;
        }

        return NextResponse.json({ 
            success: true, 
            linked: false,
            linkToken,
            lineAddUrl,
            manualLinkToken: linkToken
        });
    } catch (e) {
        console.error('Failed to generate LINE link:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

