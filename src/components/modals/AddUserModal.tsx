'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    eventId: string;
}

export default function AddUserModal({ isOpen, onClose, onSuccess, eventId }: Props) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/admin/events/${eventId}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    skipAuth: true,
                    sendEmail: true,
                }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
                setEmail('');
            } else {
                const data = await res.json();
                setError(data.error || t('saveFailed', { ns: 'payment' }));
            }
        } catch {
            setError(t('saveFailed', { ns: 'payment' }));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('addPaymentUser', { ns: 'dashboard' })}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-xs md:text-sm">{error}</div>
                )}

                <div>
                    <label className="block text-gray-700 mb-1 text-sm md:text-base">{t('email', { ns: 'common' })}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                        placeholder={t('addUserEmailPlaceholder', { ns: 'dashboard' })}
                    />
                </div>

                <p className="text-xs md:text-sm text-gray-500">
                    {t('addUserDescription', { ns: 'dashboard' })}
                </p>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm md:text-base"
                    >
                        {t('cancel', { ns: 'common' })}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm md:text-base"
                    >
                        {loading ? t('sending', { ns: 'dashboard' }) : t('addAndSend', { ns: 'dashboard' })}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
