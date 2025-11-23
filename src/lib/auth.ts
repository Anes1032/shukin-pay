import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

interface SessionPayload {
    id: string;
    email: string;
}

const SECRET = process.env.NEXTAUTH_SECRET || 'secret';

export function signToken(payload: any) {
    return jwt.sign(payload, SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, SECRET);
    } catch (e) {
        return null;
    }
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const verified = verifyToken(token);
    return verified as SessionPayload | null;
}

export async function setSession(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
    });
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
}
