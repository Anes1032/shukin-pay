'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (eventId?: string) => void;
}

interface Condition {
    id: string;
    type: 'checkbox' | 'radio';
    label: string;
    options: ConditionOption[];
}

interface ConditionOption {
    id: string;
    label: string;
    priceModifier: number;
}

export default function EventModal({ isOpen, onClose, onSuccess }: Props) {
    const { t } = useTranslation();
    const [paymentConfigs, setPaymentConfigs] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [baseAmount, setBaseAmount] = useState(0);
    const [selectedPaymentConfigs, setSelectedPaymentConfigs] = useState<string[]>([]);
    const [condition, setCondition] = useState<Condition | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadPaymentConfigs();
            setName('');
            setDate('');
            setBaseAmount(0);
            setCondition(null);
            setSelectedPaymentConfigs([]);
        }
    }, [isOpen]);

    async function loadPaymentConfigs() {
        const [configsRes, settingsRes] = await Promise.all([
            fetch('/api/admin/payments'),
            fetch('/api/admin/settings'),
        ]);

        if (configsRes.ok) {
            const configsData = await configsRes.json();
            const filteredConfigs = configsData.filter((config: any) => config.type !== 'PAYPAY_MERCHANT' && config.type !== 'STRIPE_LINK');
            setPaymentConfigs(filteredConfigs);

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                const defaultIds = settingsData.defaultPaymentConfigIds || [];
                const validDefaultIds = defaultIds.filter((id: string) =>
                    id === 'CASH' || filteredConfigs.some((config: any) => config.id === id) || id === 'STRIPE'
                );
                setSelectedPaymentConfigs(validDefaultIds);
            }
        }
    }

    function setConditionType(type: 'checkbox' | 'radio') {
        const newCondition: Condition = {
            id: `cond_${Date.now()}`,
            type,
            label: '',
            options: [{ id: `opt_${Date.now()}`, label: '', priceModifier: 0 }],
        };
        setCondition(newCondition);
    }

    function updateCondition(field: string, value: any) {
        if (!condition) return;
        setCondition({ ...condition, [field]: value });
    }

    function addOption() {
        if (!condition) return;
        setCondition({
            ...condition,
            options: [...condition.options, { id: `opt_${Date.now()}`, label: '', priceModifier: 0 }],
        });
    }

    function updateOption(optId: string, field: string, value: any) {
        if (!condition) return;
        setCondition({
            ...condition,
            options: condition.options.map(opt =>
                        opt.id === optId ? { ...opt, [field]: value } : opt
                    ),
        });
    }

    function removeOption(optId: string) {
        if (!condition || condition.options.length <= 1) return;
        setCondition({
            ...condition,
            options: condition.options.filter(opt => opt.id !== optId),
        });
    }

    function removeCondition() {
        setCondition(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const conditionsToSave = condition ? [{
            ...condition,
            options: condition.options.map(opt => ({
                value: opt.id,
                label: opt.label,
                priceModifier: opt.priceModifier
            }))
        }] : [];

        const res = await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                date,
                baseAmount,
                conditions: conditionsToSave,
                paymentConfigIds: selectedPaymentConfigs,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            onSuccess(data.eventId);
            onClose();
            setName('');
            setDate('');
            setBaseAmount(0);
            setCondition(null);
            setSelectedPaymentConfigs([]);
        } else {
            alert(t('failedToCreateEvent', { ns: 'dashboard' }));
        }
    }

    function togglePaymentConfig(id: string) {
        setSelectedPaymentConfigs(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('eventCreateTitle', { ns: 'dashboard' })}>
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">{t('eventName', { ns: 'dashboard' })}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('eventNamePlaceholder', { ns: 'dashboard' })}
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">{t('eventDate', { ns: 'dashboard' })}</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">{t('baseAmount', { ns: 'dashboard' })}</label>
                    <input
                        type="number"
                        value={baseAmount}
                        onChange={(e) => setBaseAmount(parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('baseAmountPlaceholder', { ns: 'dashboard' })}
                    />
                    <p className="text-gray-500 text-xs mt-1">{t('baseAmountDescription', { ns: 'dashboard' })}</p>
                </div>

                <div>
                    <label className="block text-gray-700 mb-2 font-semibold">{t('paymentMethod', { ns: 'dashboard' })}</label>
                    <div className="space-y-2 border border-gray-300 rounded p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedPaymentConfigs.includes('CASH')}
                                onChange={() => togglePaymentConfig('CASH')}
                                className="w-4 h-4"
                            />
                            <span className="text-gray-700">{t('cashPaymentTitle', { ns: 'payment' })} (CASH)</span>
                        </label>
                        {paymentConfigs.map(config => (
                            <label key={config.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPaymentConfigs.includes(config.id)}
                                    onChange={() => togglePaymentConfig(config.id)}
                                    className="w-4 h-4"
                                />
                                <span className="text-gray-700">{config.name} ({config.type})</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-700 font-semibold">{t('amountCondition', { ns: 'dashboard' })}</label>
                        {!condition && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                    onClick={() => setConditionType('radio')}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                    {t('addRadioButton', { ns: 'dashboard' })}
                            </button>
                            <button
                                type="button"
                                    onClick={() => setConditionType('checkbox')}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                    {t('addCheckbox', { ns: 'dashboard' })}
                            </button>
                        </div>
                        )}
                    </div>

                    {condition && (
                        <div className="border border-gray-300 rounded p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-600">
                                    {condition.type === 'radio' ? t('radioButton', { ns: 'dashboard' }) : t('checkbox', { ns: 'dashboard' })}
                                    </span>
                                    <button
                                        type="button"
                                    onClick={removeCondition}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                    {t('delete', { ns: 'common' })}
                                    </button>
                                </div>

                                <input
                                    type="text"
                                value={condition.label}
                                onChange={(e) => updateCondition('label', e.target.value)}
                                placeholder={t('conditionLabelPlaceholder', { ns: 'dashboard' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <div className="space-y-2">
                                {condition.options.map((opt) => (
                                        <div key={opt.id} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={opt.label}
                                            onChange={(e) => updateOption(opt.id, 'label', e.target.value)}
                                            placeholder={t('optionPlaceholder', { ns: 'dashboard' })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="number"
                                                value={opt.priceModifier}
                                            onChange={(e) => updateOption(opt.id, 'priceModifier', parseInt(e.target.value) || 0)}
                                            placeholder={t('amountPlaceholder', { ns: 'dashboard' })}
                                                className="w-28 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        {condition.options.length > 1 && (
                                                <button
                                                    type="button"
                                                onClick={() => removeOption(opt.id)}
                                                    className="px-3 py-2 text-red-600 hover:text-red-800"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                    onClick={addOption}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                    {t('addOption', { ns: 'dashboard' })}
                                    </button>
                            </div>
                    </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
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
                        {t('create', { ns: 'dashboard' })}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
