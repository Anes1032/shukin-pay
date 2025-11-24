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
    const [mode, setMode] = useState<'LIST' | 'ADD' | 'EDIT'>('LIST');
    const [addType, setAddType] = useState<'PAYPAY' | 'STRIPE' | 'BANK'>('PAYPAY');
    const [editingConfig, setEditingConfig] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [defaultPaymentConfigIds, setDefaultPaymentConfigIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadConfigs();
            loadDefaultPaymentConfigs();
            setMode('LIST');
            setEditingConfig(null);
            setFormData({});
        }
    }, [isOpen]);

    async function loadConfigs() {
        const res = await fetch('/api/admin/payments');
        if (res.ok) {
            const data = await res.json();
            setConfigs(data.filter((config: any) => config.type !== 'PAYPAY_MERCHANT'));
        }
    }

    async function loadDefaultPaymentConfigs() {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
            const data = await res.json();
            setDefaultPaymentConfigIds(data.defaultPaymentConfigIds || []);
        }
    }

    async function handleDefaultPaymentConfigChange(configId: string, checked: boolean) {
        const newDefaultIds = checked
            ? [...defaultPaymentConfigIds, configId]
            : defaultPaymentConfigIds.filter(id => id !== configId);
        
        setDefaultPaymentConfigIds(newDefaultIds);

        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ defaultPaymentConfigIds: newDefaultIds }),
        });

        if (!res.ok) {
            loadDefaultPaymentConfigs();
            alert(t('saveFailed', { ns: 'payment' }));
        }
    }

    async function handleDelete(id: string) {
        if (confirm(t('confirmDelete', { ns: 'common' }) || 'Delete?')) {
            await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' });
            const newDefaultIds = defaultPaymentConfigIds.filter(configId => configId !== id);
            if (newDefaultIds.length !== defaultPaymentConfigIds.length) {
                await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ defaultPaymentConfigIds: newDefaultIds }),
                });
                setDefaultPaymentConfigIds(newDefaultIds);
            }
            loadConfigs();
        }
    }

    async function handleEdit(config: any) {
        if (config.type === 'PAYPAY_MERCHANT') {
            return;
        }
        try {
            const res = await fetch(`/api/admin/payments/${config.id}`);
            if (res.ok) {
                const data = await res.json();
                setEditingConfig(data);
                setAddType(data.type);
                setFormData(data);
                setMode('EDIT');
            } else {
                alert(t('failedToLoadConfig', { ns: 'payment' }));
            }
        } catch {
            alert(t('failedToLoadConfig', { ns: 'payment' }));
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formDataObj = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formDataObj.entries());

        const payload: any = {
            type: addType,
            name: data.name,
        };

        if (addType === 'PAYPAY') {
            payload.paymentLink = data.paymentLink;
        } else if (addType === 'STRIPE') {
            payload.paymentLink = data.paymentLink;
        } else if (addType === 'BANK') {
            payload.bankName = data.bankName;
            payload.branchName = data.branchName;
            payload.accountType = data.accountType;
            payload.accountNumber = data.accountNumber;
            payload.accountHolder = data.accountHolder;
        }

        const url = mode === 'EDIT' && editingConfig
            ? `/api/admin/payments/${editingConfig.id}`
            : '/api/admin/payments';
        const method = mode === 'EDIT' ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            setMode('LIST');
            setEditingConfig(null);
            setFormData({});
            loadConfigs();
        } else {
            const errorData = await res.json().catch(() => ({}));
            alert(errorData.error || t('saveFailed', { ns: 'payment' }));
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('paymentInfoTitle', { ns: 'dashboard' })}>
            {mode === 'LIST' ? (
                <div>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800 font-medium mb-2">{t('defaultPaymentMethodsTitle', { ns: 'payment' })}</p>
                        <p className="text-xs text-blue-700">{t('defaultPaymentMethodsDescription', { ns: 'payment' })}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => { setMode('ADD'); setAddType('PAYPAY'); }}
                            className="px-3 py-2 bg-red-400 text-white rounded hover:bg-red-500 text-sm"
                        >
                            {t('addPaypay', { ns: 'payment' })}
                        </button>
                        <button
                            onClick={() => { setMode('ADD'); setAddType('STRIPE'); }}
                            className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                        >
                            {t('addStripe', { ns: 'payment' })}
                        </button>
                        <button
                            onClick={() => { setMode('ADD'); setAddType('BANK'); }}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                            {t('addBankTransfer', { ns: 'payment' })}
                        </button>
                    </div>
                    <ul className="space-y-2">
                        <li className="flex items-center justify-between p-3 border border-gray-200 rounded">
                            <div className="flex items-center gap-3 flex-1">
                                <input
                                    type="checkbox"
                                    checked={defaultPaymentConfigIds.includes('CASH')}
                                    onChange={(e) => handleDefaultPaymentConfigChange('CASH', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                    <div>
                                        <strong className="text-gray-800">{t('cashPaymentTitle', { ns: 'payment' })}</strong>
                                        <span className="text-gray-500 text-sm ml-2">(CASH)</span>
                                        {defaultPaymentConfigIds.includes('CASH') && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                {t('default', { ns: 'payment' })}
                                            </span>
                                        )}
                                    </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled
                                    className="px-3 py-1 border border-gray-300 text-gray-400 rounded cursor-not-allowed opacity-50"
                                >
                                    {t('edit', { ns: 'dashboard' })}
                                </button>
                                <button
                                    disabled
                                    className="px-3 py-1 border border-gray-300 text-gray-400 rounded cursor-not-allowed opacity-50"
                                >
                                    {t('delete', { ns: 'common' })}
                                </button>
                            </div>
                        </li>
                        {configs.map(config => (
                            <li key={config.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                                <div className="flex items-center gap-3 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={defaultPaymentConfigIds.includes(config.id as string)}
                                        onChange={(e) => handleDefaultPaymentConfigChange(config.id as string, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                <div>
                                    <strong className="text-gray-800">{config.name}</strong>
                                    <span className="text-gray-500 text-sm ml-2">({config.type})</span>
                                        {defaultPaymentConfigIds.includes(config.id as string) && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                {t('default', { ns: 'payment' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(config)}
                                        className="px-3 py-1 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 cursor-pointer"
                                    >
                                        {t('edit', { ns: 'dashboard' })}
                                    </button>
                                <button
                                    onClick={() => handleDelete(config.id as string)}
                                    className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-50"
                                >
                                    {t('delete', { ns: 'common' })}
                                </button>
                                </div>
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
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('configNamePlaceholder', { ns: 'payment' }) || ''}
                        />
                    </div>

                    {addType === 'PAYPAY' ? (
                        <>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                {t('paypayNote', { ns: 'payment' })}
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('paypayLinkLabel', { ns: 'payment' })}</label>
                                <input
                                    name="paymentLink"
                                    required
                                    type="url"
                                    value={formData.paymentLink || ''}
                                    onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                                    placeholder={t('paypayLinkPlaceholder', { ns: 'payment' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    ) : addType === 'STRIPE' ? (
                        <>
                            <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm text-indigo-800">
                                {t('stripeNote', { ns: 'payment' })}
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('stripeLinkLabel', { ns: 'payment' })}</label>
                                <input
                                    name="paymentLink"
                                    required
                                    type="url"
                                    value={formData.paymentLink || ''}
                                    onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                                    placeholder={t('stripeLinkPlaceholder', { ns: 'payment' })}
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
                                    value={formData.bankName || ''}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('branchName', { ns: 'payment' })}</label>
                                <input
                                    name="branchName"
                                    required
                                    value={formData.branchName || ''}
                                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountType', { ns: 'payment' })}</label>
                                <select
                                    name="accountType"
                                    value={formData.accountType || 'futsu'}
                                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="futsu">{t('accountTypeNormal', { ns: 'payment' })}</option>
                                    <option value="toza">{t('accountTypeCurrent', { ns: 'payment' })}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountNumber', { ns: 'payment' })}</label>
                                <input
                                    name="accountNumber"
                                    required
                                    value={formData.accountNumber || ''}
                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">{t('accountHolder', { ns: 'payment' })}</label>
                                <input
                                    name="accountHolder"
                                    required
                                    value={formData.accountHolder || ''}
                                    onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('LIST');
                                setEditingConfig(null);
                                setFormData({});
                            }}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            {t('cancel', { ns: 'common' })}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {mode === 'EDIT' ? t('update', { ns: 'payment' }) : t('save', { ns: 'common' })}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
