'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Condition {
    id: string;
    name: string;
    type: 'radio' | 'checkbox';
    options: { value: string; label: string; priceModifier: number }[];
}

interface PaymentMethod {
    id: string;
    type: string;
    name: string;
}

interface EventData {
    id: string;
    name: string;
    date: string;
    baseAmount: number;
    conditions: Condition[];
    paymentMethods: PaymentMethod[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    eventId: string;
    userId: string;
    initialData?: {
        name: string;
        email: string;
        amount_due: number;
        payment_method: string;
        status: string;
        selected_conditions?: string;
        payment_config_id?: string;
    };
}

export default function PaymentUserModal({ isOpen, onClose, onSuccess, eventId, userId, initialData }: Props) {
    const { t } = useTranslation();
    const [event, setEvent] = useState<EventData | null>(null);
    const [name, setName] = useState('');
    const [selectedConditions, setSelectedConditions] = useState<Record<string, string | string[]>>({});
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [status, setStatus] = useState('UNPAID');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadEvent();
        }
    }, [isOpen, eventId]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setStatus(initialData.status || 'UNPAID');
            if (initialData.selected_conditions) {
                try {
                    const parsed = JSON.parse(initialData.selected_conditions);
                    setSelectedConditions(parsed || {});
                } catch {
                    setSelectedConditions({});
                }
            }
            if (initialData.payment_config_id) {
                setSelectedPaymentMethod(initialData.payment_config_id);
            }
        }
    }, [initialData]);

    async function loadEvent() {
        try {
            const res = await fetch(`/api/admin/events/${eventId}`);
            if (res.ok) {
                const data = await res.json();
                setEvent(data);
            }
        } catch {
            setError(t('failedToLoadEvent', { ns: 'dashboard' }));
        }
    }

    const calculateTotal = () => {
        if (!event) return 0;
        
        if (event.conditions.length === 0) {
            return event.baseAmount || 0;
        }
        
        const condition = event.conditions[0];
        const selected = selectedConditions[condition.id];
        
        if (!selected) {
            return event.baseAmount || 0;
        }

        if (condition.type === 'radio') {
            const option = condition.options.find(o => o.value === selected || (o as any).id === selected);
            if (option) {
                return option.priceModifier;
            }
            return event.baseAmount || 0;
        } else if (condition.type === 'checkbox' && Array.isArray(selected)) {
            let total = 0;
            for (const val of selected) {
                const option = condition.options.find(o => o.value === val || (o as any).id === val);
                if (option) total += option.priceModifier;
            }
            return total;
        }

        return event.baseAmount || 0;
    };

    const handleConditionChange = (conditionId: string, value: string, type: 'radio' | 'checkbox') => {
        if (type === 'radio') {
            setSelectedConditions(prev => ({ ...prev, [conditionId]: value }));
        } else {
            setSelectedConditions(prev => {
                const current = (prev[conditionId] as string[]) || [];
                if (current.includes(value)) {
                    return { ...prev, [conditionId]: current.filter(v => v !== value) };
                }
                return { ...prev, [conditionId]: [...current, value] };
            });
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !selectedPaymentMethod) {
            setError(t('fillRequiredFields', { ns: 'pay' }));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const totalAmount = calculateTotal();
            const paymentMethodType = event?.paymentMethods.find(m => m.id === selectedPaymentMethod)?.type || null;

            const res = await fetch(`/api/admin/events/${eventId}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    amountDue: totalAmount,
                    paymentMethod: paymentMethodType,
                    status,
                    selectedConditions,
                    paymentConfigId: selectedPaymentMethod,
                }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || t('updateFailed', { ns: 'dashboard' }));
            }
        } catch {
            setError(t('updateFailed', { ns: 'dashboard' }));
        } finally {
            setLoading(false);
        }
    }

    const isPaid = initialData?.status === 'PAID';
    const canEdit = !isPaid;

    if (!event) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={t('editPaymentUser', { ns: 'dashboard' })}>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editPaymentUser', { ns: 'dashboard' })}>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-xs md:text-sm">{error}</div>
                )}

                {isPaid && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs md:text-sm text-yellow-800">
                        {t('cannotEditPaidUser', { ns: 'dashboard' })}
                    </div>
                )}

                <div>
                    <label className="block text-gray-700 mb-1 text-sm md:text-base">{t('table.name', { ns: 'dashboard' })}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!canEdit}
                        required
                        placeholder={t('namePlaceholder', { ns: 'pay' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm md:text-base"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 text-sm md:text-base">{t('table.email', { ns: 'dashboard' })}</label>
                    <input
                        type="email"
                        value={initialData?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-sm md:text-base"
                    />
                    <p className="text-gray-500 text-xs mt-1">{t('emailCannotBeChanged', { ns: 'dashboard' })}</p>
                </div>

                {event.conditions.map((condition) => (
                    <div key={condition.id}>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                            {condition.name}
                        </label>
                        <div className="space-y-2">
                            {condition.options.map((option) => {
                                const optionValue = option.value || (option as any).id;
                                return (
                                    <label
                                        key={optionValue}
                                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                            canEdit 
                                                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50' 
                                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <input
                                            type={condition.type}
                                            name={condition.id}
                                            value={optionValue}
                                            checked={
                                                condition.type === 'radio'
                                                    ? selectedConditions[condition.id] === optionValue
                                                    : ((selectedConditions[condition.id] as string[]) || []).includes(optionValue)
                                            }
                                            onChange={() => handleConditionChange(condition.id, optionValue, condition.type)}
                                            disabled={!canEdit}
                                            className="w-4 h-4 mr-3 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                        />
                                        <span className="flex-1 font-medium text-gray-700">{option.label}</span>
                                        {option.priceModifier !== 0 && (
                                            <span className={`font-bold ${option.priceModifier > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {condition.type === 'checkbox' && option.priceModifier > 0 ? '+' : ''}{option.priceModifier.toLocaleString()}{t('yen', { ns: 'pay' })}
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                        {t('paymentMethod', { ns: 'pay' })} <span className="text-red-500">{t('required', { ns: 'pay' })}</span>
                    </label>
                    <div className="space-y-2">
                        {event.paymentMethods.map((method) => (
                            <label
                                key={method.id}
                                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    canEdit
                                        ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={method.id}
                                    checked={selectedPaymentMethod === method.id}
                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                    disabled={!canEdit}
                                    className="w-4 h-4 mr-3 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                                />
                                <span className="flex-1 font-medium text-gray-700">{method.name}</span>
                                <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                                    {method.type === 'PAYPAY' ? t('paypayLabel', { ns: 'pay' }) : method.type === 'PAYPAY_MERCHANT' ? t('paypayMerchantLabel', { ns: 'pay' }) : method.type === 'STRIPE' ? t('stripeLabel', { ns: 'pay' }) : t('bankTransferLabel', { ns: 'pay' })}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 md:p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                        <span className="text-sm md:text-lg font-semibold text-gray-700">{t('paymentAmount', { ns: 'pay' })}</span>
                        <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            ¥{calculateTotal().toLocaleString()}
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 text-sm md:text-base">{t('table.status', { ns: 'dashboard' })}</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                        <option value="UNPAID">{t('status.unpaid', { ns: 'dashboard' })}</option>
                        <option value="PENDING">{t('status.pending', { ns: 'dashboard' })}</option>
                        <option value="PAID">{t('status.paid', { ns: 'dashboard' })}</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm md:text-base"
                    >
                        {t('cancel', { ns: 'common' })}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !canEdit || calculateTotal() === 0}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                        {loading ? t('saving', { ns: 'dashboard' }) : t('save', { ns: 'common' })}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

