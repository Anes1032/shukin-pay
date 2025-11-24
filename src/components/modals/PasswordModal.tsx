'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function PasswordModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            setError(t('passwordMismatch', { ns: 'common' }));
            return;
        }

        const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (res.ok) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
            (e.target as HTMLFormElement).reset();
        } else {
            const data = await res.json();
            setError(data.error || t('passwordChangeFailed', { ns: 'dashboard' }));
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('changePasswordTitle', { ns: 'dashboard' })}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
                )}
                {success && (
                    <div className="bg-green-50 text-green-600 p-3 rounded text-sm">{t('passwordChanged', { ns: 'dashboard' })}</div>
                )}

                <div>
                    <label className="block text-gray-700 mb-1">{t('currentPassword', { ns: 'dashboard' })}</label>
                    <input
                        name="currentPassword"
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1">{t('newPassword', { ns: 'dashboard' })}</label>
                    <input
                        name="newPassword"
                        type="password"
                        required
                        minLength={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1">{t('confirmNewPassword', { ns: 'dashboard' })}</label>
                    <input
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                        {t('cancel', { ns: 'common' })}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {t('save', { ns: 'common' })}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
