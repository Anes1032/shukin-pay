import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await db.execute({
            sql: 'SELECT gmail_refresh_token, gmail_email FROM users WHERE id = ?',
            args: [session.id],
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ connected: false });
        }

        const user = result.rows[0];
        const connected = !!user.gmail_refresh_token;

        return NextResponse.json({
            connected,
            email: user.gmail_email || null,
        });
    } catch (e) {
        console.error('Failed to get Gmail status:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
