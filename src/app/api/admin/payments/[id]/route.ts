import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        await db.execute({
            sql: 'DELETE FROM payment_configs WHERE id = ? AND admin_id = ?',
            args: [id, session.id],
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete config:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
