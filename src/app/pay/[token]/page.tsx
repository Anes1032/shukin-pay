'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

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

type PaymentStep = 'email' | 'emailSent' | 'payment' | 'result';

interface PaymentInfo {
    type: string;
    paymentUrl?: string;
    paymentLink?: string;
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountHolder?: string;
}

export default function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const { t } = useTranslation();

    const [step, setStep] = useState<PaymentStep>('email');
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [name, setName] = useState('');
    const [selectedConditions, setSelectedConditions] = useState<Record<string, string | string[]>>({});
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [finalAmount, setFinalAmount] = useState(0);

    useEffect(() => {
        fetchEvent();

        const storedUserId = sessionStorage.getItem(`pay_${token}_userId`);
        if (storedUserId) {
            setUserId(storedUserId);
            checkExistingPayment(storedUserId);
            sessionStorage.removeItem(`pay_${token}_userId`);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('token');
        if (authToken) {
            verifyAuth(authToken);
        }
    }, [token]);

    const fetchEvent = async () => {
        try {
            const res = await fetch(`/api/pay/${token}`);
            if (!res.ok) {
                setError(t('eventNotFound', { ns: 'pay' }));
                setLoading(false);
                return;
            }
            const data = await res.json();
            setEvent(data);
        } catch {
            setError(t('failedToLoadEvent', { ns: 'pay' }));
        } finally {
            setLoading(false);
        }
    };

    const verifyAuth = async (authToken: string) => {
        try {
            const res = await fetch(`/api/pay/${token}/verify?token=${authToken}`);
            const data = await res.json();
            if (data.success) {
                setUserId(data.userId);
                await checkExistingPayment(data.userId);
                router.replace(`/pay/${token}`);
            }
        } catch {
            setError(t('verificationFailed', { ns: 'pay' }));
        }
    };

    const checkExistingPayment = async (userIdToCheck: string) => {
        try {
            const res = await fetch(`/api/pay/${token}/user/${userIdToCheck}`);
            if (!res.ok) {
                setStep('payment');
                return;
            }
            const data = await res.json();

            if (data.hasExistingPayment) {
                setPaymentInfo(data.paymentInfo || {
                    type: data.paymentMethod,
                    paymentUrl: data.paymentUrl,
                    paymentId: data.paymentId,
                });
                setFinalAmount(data.amount || 0);
                setName(data.name || '');
                setSelectedConditions(data.selectedConditions || {});
                setStep('result');
            } else {
                setStep('payment');
            }
        } catch {
            setStep('payment');
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/pay/${token}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (data.authenticated) {
                setUserId(data.userId);
                await checkExistingPayment(data.userId);
            } else {
                setStep('emailSent');
            }
        } catch {
            setError(t('failedToProcessEmail', { ns: 'pay' }));
        } finally {
            setSubmitting(false);
        }
    };

    const calculateTotal = () => {
        if (!event) return 0;
        
        let total = event.baseAmount || 0;
        
        if (event.conditions.length === 0) {
            return total;
        }

        for (const condition of event.conditions) {
            const selected = selectedConditions[condition.id];
            
            if (!selected) {
                continue;
            }

            if (condition.type === 'radio') {
                const option = condition.options.find(o => o.value === selected || (o as any).id === selected);
                if (option) {
                    total += option.priceModifier;
                }
            } else if (condition.type === 'checkbox' && Array.isArray(selected)) {
                for (const val of selected) {
                    const option = condition.options.find(o => o.value === val || (o as any).id === val);
                    if (option) {
                        total += option.priceModifier;
                    }
                }
            }
        }

        return total;
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

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !selectedPaymentMethod) {
            setError(t('fillRequiredFields', { ns: 'pay' }));
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const selectedMethod = event?.paymentMethods.find(m => m.id === selectedPaymentMethod);
            const res = await fetch(`/api/pay/${token}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    name,
                    selectedConditions,
                    paymentMethod: selectedMethod?.type,
                    paymentConfigId: selectedMethod?.type === 'CASH' ? null : selectedPaymentMethod,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPaymentInfo(data.paymentInfo);
                setFinalAmount(data.amount);
                setStep('result');
            } else {
                setError(data.error || t('paymentFailed', { ns: 'pay' }));
            }
        } catch {
            setError(t('failedToProcessPayment', { ns: 'pay' }));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
                        <p className="text-gray-600 font-medium">{t('loading', { ns: 'pay' })}</p>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <p className="text-red-600 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
                        <h1 className="text-white text-2xl font-bold">{event?.name}</h1>
                        {event?.date && (
                            <p className="text-blue-100 text-sm mt-2 flex items-center gap-2">
                                <span>📅</span>
                                {new Date(event.date).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        )}
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                {error}
                            </div>
                        )}

                        {step === 'email' && (
                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">📧</span>
                                    </div>
                                    <p className="text-gray-700 font-medium mb-2">{t('emailAuth', { ns: 'pay' })}</p>
                                    <p className="text-gray-600 text-sm">
                                        {t('emailAuthDescription', { ns: 'pay' })}
                                    </p>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('emailPlaceholder', { ns: 'pay' })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            {t('processing', { ns: 'pay' })}
                                        </span>
                                    ) : t('next', { ns: 'pay' })}
                                </button>
                            </form>
                        )}

                        {step === 'emailSent' && (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">✉️</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('emailSentTitle', { ns: 'pay' })}</h2>
                                <p className="text-gray-600 mb-2">
                                    <span className="font-medium text-blue-600">{email}</span> {t('sentTo', { ns: 'pay' })}
                                </p>
                                <p className="text-gray-600 mb-6">
                                    {t('emailSentDescription', { ns: 'pay' })}
                                </p>
                                <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                                    {t('checkSpamFolder', { ns: 'pay' })}
                                </div>
                            </div>
                        )}

                        {step === 'payment' && event && (
                            <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('name', { ns: 'pay' })} <span className="text-red-500">{t('required', { ns: 'pay' })}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('namePlaceholder', { ns: 'pay' })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                {event.conditions.map((condition) => (
                                    <div key={condition.id}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            {condition.name}
                                        </label>
                                        <div className="space-y-2">
                                            {condition.options.map((option) => {
                                                const optionValue = option.value || (option as any).id;
                                                return (
                                                <label
                                                    key={optionValue}
                                                    className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
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
                                                        className="w-5 h-5 mr-3 text-blue-600 focus:ring-blue-500"
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        {t('paymentMethod', { ns: 'pay' })} <span className="text-red-500">{t('required', { ns: 'pay' })}</span>
                                    </label>
                                    <div className="space-y-2">
                                        {event.paymentMethods.map((method) => (
                                            <label
                                                key={method.id}
                                                className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={method.id}
                                                    checked={selectedPaymentMethod === method.id}
                                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                    className="w-5 h-5 mr-3 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="flex-1 font-medium text-gray-700">{method.name}</span>
                                                <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                                                    {method.type === 'PAYPAY' ? t('paypayLabel', { ns: 'pay' }) : 
                                                     method.type === 'PAYPAY_MERCHANT' ? t('paypayMerchantLabel', { ns: 'pay' }) : 
                                                     method.type === 'STRIPE' ? t('stripeLabel', { ns: 'pay' }) : 
                                                     method.type === 'CASH' ? t('cashLabel', { ns: 'pay' }) : 
                                                     t('bankTransferLabel', { ns: 'pay' })}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-700">{t('paymentAmount', { ns: 'pay' })}</span>
                                        <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            ¥{calculateTotal().toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || calculateTotal() === 0}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                                >
                                    {submitting ? t('processing', { ns: 'pay' }) : t('proceedToPayment', { ns: 'pay' })}
                                </button>
                            </form>
                        )}

                        {step === 'result' && paymentInfo && (
                            <div className="text-center space-y-6">
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
                                    <p className="text-sm text-gray-600 mb-2">{t('paymentAmount', { ns: 'pay' })}</p>
                                    <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        ¥{finalAmount.toLocaleString()}
                                    </p>
                                </div>

                                {paymentInfo.type === 'PAYPAY' && paymentInfo.paymentLink && (
                                    <div>
                                        <p className="text-gray-600 mb-4">
                                            {t('paypayInstructions', { ns: 'pay' })}
                                        </p>
                                        <a
                                            href={paymentInfo.paymentLink}
                                            className="inline-block w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t('paypayButton', { ns: 'pay' })}
                                        </a>
                                    </div>
                                )}

                                {paymentInfo.type === 'PAYPAY_MERCHANT' && paymentInfo.paymentUrl && (
                                    <div>
                                        <p className="text-gray-600 mb-4">
                                            {t('paypayMerchantInstructions', { ns: 'pay' })}
                                        </p>
                                        <a
                                            href={paymentInfo.paymentUrl}
                                            className="inline-block w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t('paypayButton', { ns: 'pay' })}
                                        </a>
                                    </div>
                                )}

                                {paymentInfo.type === 'STRIPE' && paymentInfo.paymentLink && (
                                    <div>
                                        <p className="text-gray-600 mb-4">
                                            {t('stripeInstructions', { ns: 'pay' })}
                                        </p>
                                        <a
                                            href={paymentInfo.paymentLink}
                                            className="inline-block w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t('stripeButton', { ns: 'pay' })}
                                        </a>
                                    </div>
                                )}

                                {paymentInfo.type === 'CASH' && (
                                    <div>
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
                                            <div className="flex items-center justify-center mb-2">
                                                <span className="text-4xl">💰</span>
                                            </div>
                                            <p className="text-gray-700 text-center font-medium">
                                                {t('cashInstructions', { ns: 'pay' })}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {paymentInfo.type === 'BANK' && (
                                    <div className="text-left">
                                        <p className="text-gray-600 text-center mb-6">
                                            {t('bankInstructions', { ns: 'pay' })}
                                        </p>
                                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 space-y-4 border border-gray-200">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600 font-medium">{t('bankName', { ns: 'pay' })}</span>
                                                <span className="font-bold text-gray-800">{paymentInfo.bankName}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600 font-medium">{t('branchName', { ns: 'pay' })}</span>
                                                <span className="font-bold text-gray-800">{paymentInfo.branchName}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600 font-medium">{t('accountType', { ns: 'pay' })}</span>
                                                <span className="font-bold text-gray-800">{paymentInfo.accountType}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600 font-medium">{t('accountNumber', { ns: 'pay' })}</span>
                                                <span className="font-bold text-gray-800">{paymentInfo.accountNumber}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-gray-600 font-medium">{t('accountHolder', { ns: 'pay' })}</span>
                                                <span className="font-bold text-gray-800">{paymentInfo.accountHolder}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        setStep('payment');
                                        setPaymentInfo(null);
                                    }}
                                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                >
                                    {t('backToPayment', { ns: 'pay' })}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>{t('copyright', { ns: 'pay' })}</p>
                </div>
            </div>
        </div>
    );
}
