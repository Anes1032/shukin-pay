import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const result = await db.execute({
            sql: 'SELECT password_hash FROM admins WHERE id = ?',
            args: [session.id],
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const admin = result.rows[0];
        const isValid = await bcrypt.compare(currentPassword, admin.password_hash as string);

        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db.execute({
            sql: 'UPDATE admins SET password_hash = ? WHERE id = ?',
            args: [newHash, session.id],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to change password:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
