'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function PaymentInfoModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [configs, setConfigs] = useState<any[]>([]);
    const [mode, setMode] = useState<'LIST' | 'ADD'>('LIST');
    const [addType, setAddType] = useState<'PAYPAY' | 'PAYPAY_LINK' | 'BANK'>('PAYPAY');

    useEffect(() => {
        if (isOpen) {
            loadConfigs();
        }
    }, [isOpen]);

    async function loadConfigs() {
        const res = await fetch('/api/admin/payments');
        if (res.ok) {
            const data = await res.json();
            setConfigs(data);
        }
    }

    async function handleDelete(id: string) {
        if (confirm(t('confirmDelete', { ns: 'common' }) || 'Delete?')) {
            await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' });
            loadConfigs();
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        const payload = {
            type: addType,
            name: data.name,
            ...data
        };

        const res = await fetch('/api/admin/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            setMode('LIST');
            loadConfigs();
        } else {
            alert(t('saveFailed', { ns: 'payment' }));
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('paymentInfoTitle', { ns: 'dashboard' })}>
            {mode === 'LIST' ? (
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => { setMode('ADD'); setAddType('PAYPAY'); }}
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                            + PayPay (API)
                        </button>
                        <button
                            onClick={() => { setMode('ADD'); setAddType('PAYPAY_LINK'); }}
                            className="px-3 py-2 bg-red-400 text-white rounded hover:bg-red-500 text-sm"
                        >
                            + PayPay (リンク)
                        </button>
                        <button
                            onClick={() => { setMode('ADD'); setAddType('BANK'); }}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                            + 銀行振込
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {configs.map(config => (
                            <li key={config.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                                <div>
                                    <strong className="text-gray-800">{config.name}</strong>
                                    <span className="text-gray-500 text-sm ml-2">({config.type})</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(config.id as string)}
                                    className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-50"
                                >
                                    {t('delete', { ns: 'common' })}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" name="type" value={addType} />

                    <div>
                        <label className="block text-gray-700 mb-1">{t('configName', { ns: 'payment' })}</label>
                        <input
                            name="name"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configNamePlaceholder', { ns: 'payment' }) || ''}
                        />
                    </div>

                    {addType === 'PAYPAY' ? (
                        <>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('apiKey', { ns: 'payment' })}</label>
                                <input
                                    name="apiKey"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('apiSecret', { ns: 'payment' })}</label>
                                <input
                                    name="apiSecret"
                                    required
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('merchantId', { ns: 'payment' })}</label>
                                <input
                                    name="merchantId"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    ) : addType === 'PAYPAY_LINK' ? (
                        <>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                個人用PayPayの請求リンクを使用します。支払い確認は手動で行う必要があります。
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">PayPay請求リンク</label>
                                <input
                                    name="paymentLink"
                                    required
                                    type="url"
                                    placeholder="https://pay.paypay.ne.jp/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('bankName', { ns: 'payment' })}</label>
                                <input
                                    name="bankName"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('branchName', { ns: 'payment' })}</label>
                                <input
                                    name="branchName"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountType', { ns: 'payment' })}</label>
                                <select
                                    name="accountType"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="futsu">普通</option>
                                    <option value="toza">当座</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountNumber', { ns: 'payment' })}</label>
                                <input
                                    name="accountNumber"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountHolder', { ns: 'payment' })}</label>
                                <input
                                    name="accountHolder"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setMode('LIST')}
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
            )}
        </Modal>
    );
}
