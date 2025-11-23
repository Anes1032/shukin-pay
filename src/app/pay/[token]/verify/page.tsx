'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function VerifyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');

    const token = params.token as string;
    const authToken = searchParams.get('token');

    useEffect(() => {
        if (!authToken) {
            setStatus('error');
            setErrorMessage(t('authTokenNotFound', { ns: 'pay' }));
            return;
        }

        async function verify() {
            try {
                const res = await fetch(`/api/pay/${token}/verify?token=${authToken}`);
                const data = await res.json();

                if (res.ok && data.success) {
                    setStatus('success');
                    // Store userId in sessionStorage for the payment page
                    sessionStorage.setItem(`pay_${token}_userId`, data.userId);
                    // Redirect to payment page after short delay
                    setTimeout(() => {
                        router.push(`/pay/${token}`);
                    }, 1500);
                } else {
                    setStatus('error');
                    setErrorMessage(data.error || t('verificationFailed', { ns: 'pay' }));
                }
            } catch {
                setStatus('error');
                setErrorMessage(t('errorOccurred', { ns: 'pay' }));
            }
        }

        verify();
    }, [token, authToken, router, t]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h1 className="text-xl font-semibold text-gray-800">{t('verifying', { ns: 'pay' })}</h1>
                        <p className="text-gray-600 mt-2">{t('pleaseWait', { ns: 'pay' })}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-gray-800">{t('verifySuccess', { ns: 'pay' })}</h1>
                        <p className="text-gray-600 mt-2">{t('redirecting', { ns: 'pay' })}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-gray-800">{t('verifyError', { ns: 'pay' })}</h1>
                        <p className="text-red-600 mt-2">{errorMessage}</p>
                    </>
                )}
            </div>
        </div>
    );
}
