'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function GmailModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadStatus();
        }
    }, [isOpen]);

    async function loadStatus() {
        const res = await fetch('/api/admin/gmail/status');
        if (res.ok) {
            const data = await res.json();
            setStatus(data.connected ? 'connected' : 'disconnected');
            setEmail(data.email || '');
        } else {
            setStatus('disconnected');
        }
    }

    async function handleConnect() {
        const res = await fetch('/api/admin/gmail/auth-url');
        if (res.ok) {
            const data = await res.json();
            window.location.href = data.url;
        }
    }

    async function handleDisconnect() {
        if (confirm('Gmail認証を解除しますか？')) {
            await fetch('/api/admin/gmail/revoke', { method: 'POST' });
            loadStatus();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('gmailAuthTitle', { ns: 'dashboard' })}>
            <div className="py-2">
                {status === 'loading' ? (
                    <p className="text-gray-600">読み込み中...</p>
                ) : status === 'connected' ? (
                    <div>
                        <div className="bg-blue-50 p-4 rounded mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-600 font-semibold">✓ 接続済み</span>
                            </div>
                            {email && <span className="text-gray-600 text-sm">{email}</span>}
                        </div>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            Gmail経由でメール送信が可能です。
                        </p>
                        <button
                            onClick={handleDisconnect}
                            className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50"
                        >
                            認証を解除
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-700 mb-6 leading-relaxed">
                            Gmailアカウントを接続して、決済リンクや認証メールを送信できるようにします。
                        </p>
                        <button
                            onClick={handleConnect}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Gmailアカウントを接続
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
