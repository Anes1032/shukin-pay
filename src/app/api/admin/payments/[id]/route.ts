import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM payment_configs WHERE id = ? AND user_id = ?',
            args: [id, session.id],
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 });
        }

        const config = result.rows[0];
        const configJson = JSON.parse(config.config_json as string);

        return NextResponse.json({
            id: config.id,
            type: config.type,
            name: config.name,
            ...configJson,
        });
    } catch (e) {
        console.error('Failed to get config:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const existingResult = await db.execute({
            sql: 'SELECT config_json FROM payment_configs WHERE id = ? AND user_id = ?',
            args: [id, session.id],
        });

        if (existingResult.rows.length === 0) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 });
        }

        const existingConfig = JSON.parse(existingResult.rows[0].config_json as string);
        const body = await request.json();
        const { type, name, ...config } = body;

        if (config.apiSecret === '' && existingConfig.apiSecret) {
            config.apiSecret = existingConfig.apiSecret;
        }

        await db.execute({
            sql: 'UPDATE payment_configs SET type = ?, name = ?, config_json = ? WHERE id = ? AND user_id = ?',
            args: [type, name, JSON.stringify(config), id, session.id],
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to update config:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        await db.execute({
            sql: 'DELETE FROM payment_configs WHERE id = ? AND user_id = ?',
            args: [id, session.id],
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete config:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
