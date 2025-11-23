import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const rs = await db.execute({
            sql: 'SELECT * FROM admins WHERE email = ?',
            args: [email],
        });

        const user = rs.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password_hash as string);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken({ id: user.id, email: user.email });
        await setSession(token);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Login error:', e);
        return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
    }
}
