import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email],
        });

        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const userId = randomUUID();
        await db.execute({
            sql: 'INSERT INTO users (id, email, password_hash, default_payment_config_ids) VALUES (?, ?, ?, ?)',
            args: [userId, email, hashedPassword, JSON.stringify(['CASH'])],
        });

        // Sign token and set session
        const token = signToken({ id: userId, email });
        await setSession(token);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Signup error:', e);
        return NextResponse.json({ error: 'An error occurred during signup' }, { status: 500 });
    }
}

