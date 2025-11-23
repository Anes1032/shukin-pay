import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId } = await params;

    try {
        const body = await request.json();
        const { status, name, amountDue, paymentMethod, paymentDetails, selectedConditions } = body;

        const updates: string[] = [];
        const args: (string | number | null)[] = [];

        if (status !== undefined) {
            updates.push('status = ?');
            args.push(status);
        }
        if (name !== undefined) {
            updates.push('name = ?');
            args.push(name);
        }
        if (amountDue !== undefined) {
            updates.push('amount_due = ?');
            args.push(amountDue);
        }
        if (paymentMethod !== undefined) {
            updates.push('payment_method = ?');
            args.push(paymentMethod);
        }
        if (paymentDetails !== undefined) {
            updates.push('payment_details = ?');
            args.push(JSON.stringify(paymentDetails));
        }
        if (selectedConditions !== undefined) {
            updates.push('selected_conditions = ?');
            args.push(JSON.stringify(selectedConditions));
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        args.push(userId);

        await db.execute({
            sql: `UPDATE payment_users SET ${updates.join(', ')} WHERE id = ?`,
            args,
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to update payment user:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId } = await params;

    try {
        await db.execute({
            sql: 'DELETE FROM payment_users WHERE id = ?',
            args: [userId],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete payment user:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
