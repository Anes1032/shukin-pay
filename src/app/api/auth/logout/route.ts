import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
    try {
        await clearSession();
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Logout error:', e);
        return NextResponse.json({ error: 'An error occurred during logout' }, { status: 500 });
    }
}
