import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await db.execute({
            sql: 'SELECT default_payment_config_ids FROM users WHERE id = ?',
            args: [session.id],
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = result.rows[0];
        let defaultPaymentConfigIds = user.default_payment_config_ids 
            ? JSON.parse(user.default_payment_config_ids as string)
            : [];

        if (defaultPaymentConfigIds.length === 0) {
            defaultPaymentConfigIds = ['CASH'];
        }

        return NextResponse.json({ 
            defaultPaymentConfigIds,
        });
    } catch (e) {
        console.error('Failed to get settings:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { defaultPaymentConfigIds } = body;

        if (!Array.isArray(defaultPaymentConfigIds)) {
            return NextResponse.json({ error: 'defaultPaymentConfigIds must be an array' }, { status: 400 });
        }

        await db.execute({
            sql: 'UPDATE users SET default_payment_config_ids = ? WHERE id = ?',
            args: [JSON.stringify(defaultPaymentConfigIds), session.id],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to update settings:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

