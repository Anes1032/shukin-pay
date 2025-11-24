'use client';

import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';

function PaymentCompletePageContent() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-white text-xl font-bold">{t('paymentComplete', { ns: 'pay' })}</h1>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-gray-600">
                            {t('thankYou', { ns: 'pay' })}
                        </p>
                        <p className="text-gray-500 text-sm mt-4">
                            {t('closePage', { ns: 'pay' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentCompletePage() {
    return (
        <I18nProvider>
            <PaymentCompletePageContent />
        </I18nProvider>
    );
}
