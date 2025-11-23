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
    const [conditions, setConditions] = useState<Condition[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadPaymentConfigs();
        }
    }, [isOpen]);

    async function loadPaymentConfigs() {
        const res = await fetch('/api/admin/payments');
        if (res.ok) {
            const data = await res.json();
            setPaymentConfigs(data);
        }
    }

    function addCondition(type: 'checkbox' | 'radio') {
        const newCondition: Condition = {
            id: `cond_${Date.now()}`,
            type,
            label: '',
            options: [{ id: `opt_${Date.now()}`, label: '', priceModifier: 0 }],
        };
        setConditions([...conditions, newCondition]);
    }

    function updateCondition(condId: string, field: string, value: any) {
        setConditions(conditions.map(cond =>
            cond.id === condId ? { ...cond, [field]: value } : cond
        ));
    }

    function addOption(condId: string) {
        setConditions(conditions.map(cond =>
            cond.id === condId
                ? {
                    ...cond,
                    options: [...cond.options, { id: `opt_${Date.now()}`, label: '', priceModifier: 0 }],
                }
                : cond
        ));
    }

    function updateOption(condId: string, optId: string, field: string, value: any) {
        setConditions(conditions.map(cond =>
            cond.id === condId
                ? {
                    ...cond,
                    options: cond.options.map(opt =>
                        opt.id === optId ? { ...opt, [field]: value } : opt
                    ),
                }
                : cond
        ));
    }

    function removeOption(condId: string, optId: string) {
        setConditions(conditions.map(cond =>
            cond.id === condId
                ? { ...cond, options: cond.options.filter(opt => opt.id !== optId) }
                : cond
        ));
    }

    function removeCondition(condId: string) {
        setConditions(conditions.filter(cond => cond.id !== condId));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const res = await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                date,
                baseAmount,
                conditions,
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
            setConditions([]);
            setSelectedPaymentConfigs([]);
        } else {
            alert('Failed to create event');
        }
    }

    function togglePaymentConfig(id: string) {
        setSelectedPaymentConfigs(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="イベント作成">
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">イベント名</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 2025年新年会"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">開催日</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 mb-1 font-semibold">基本金額（円）</label>
                    <input
                        type="number"
                        value={baseAmount}
                        onChange={(e) => setBaseAmount(parseInt(e.target.value) || 0)}
                        required
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3000"
                    />
                </div>

                {/* Payment Methods */}
                <div>
                    <label className="block text-gray-700 mb-2 font-semibold">決済方法</label>
                    <div className="space-y-2 border border-gray-300 rounded p-3">
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
                        {paymentConfigs.length === 0 && (
                            <p className="text-gray-500 text-sm">決済情報を先に登録してください</p>
                        )}
                    </div>
                </div>

                {/* Conditions */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-700 font-semibold">金額条件</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => addCondition('radio')}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                + ラジオボタン
                            </button>
                            <button
                                type="button"
                                onClick={() => addCondition('checkbox')}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                + チェックボックス
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {conditions.map((cond, condIdx) => (
                            <div key={cond.id} className="border border-gray-300 rounded p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-600">
                                        {cond.type === 'radio' ? 'ラジオボタン' : 'チェックボックス'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeCondition(cond.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        削除
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={cond.label}
                                    onChange={(e) => updateCondition(cond.id, 'label', e.target.value)}
                                    placeholder="条件のラベル（例: 性別、参加日数）"
                                    className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <div className="space-y-2">
                                    {cond.options.map((opt) => (
                                        <div key={opt.id} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={opt.label}
                                                onChange={(e) => updateOption(cond.id, opt.id, 'label', e.target.value)}
                                                placeholder="選択肢（例: 男性、女性）"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="number"
                                                value={opt.priceModifier}
                                                onChange={(e) => updateOption(cond.id, opt.id, 'priceModifier', parseInt(e.target.value) || 0)}
                                                placeholder="±金額"
                                                className="w-28 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            {cond.options.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(cond.id, opt.id)}
                                                    className="px-3 py-2 text-red-600 hover:text-red-800"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addOption(cond.id)}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        + 選択肢を追加
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        作成
                    </button>
                </div>
            </form>
        </Modal>
    );
}
