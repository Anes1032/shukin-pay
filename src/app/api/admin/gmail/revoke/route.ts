import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await db.execute({
            sql: 'UPDATE admins SET gmail_refresh_token = NULL, gmail_email = NULL WHERE id = ?',
            args: [session.id],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to revoke Gmail:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
