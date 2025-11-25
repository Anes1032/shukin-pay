'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';
import Link from 'next/link';

export default function LoginPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setIsPending(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/dashboard');
                router.refresh();
            } else {
                setError(data.error || t('loginFailed', { ns: 'common' }));
            }
        } catch (err) {
            setError(t('anErrorOccurred', { ns: 'common' }));
        } finally {
            setIsPending(false);
        }
    }

    return (
        <I18nProvider>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
                <div className="bg-white/80 backdrop-blur-lg p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
                    <div className="mb-6 md:mb-8 text-center">
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            {t('loginTitle', { ns: 'admin' })}
                        </h1>
                        <p className="text-gray-600 text-xs md:text-sm">{t('eventPaymentSystem', { ns: 'admin' })}</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs md:text-sm flex items-center gap-2">
                                <span className="text-red-500">⚠</span>
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-700 mb-2 font-medium text-xs md:text-sm" htmlFor="email">
                                {t('email', { ns: 'common' })}
                            </label>
                            <input
                                className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                                type="email"
                                id="email"
                                name="email"
                                required
                                placeholder="admin@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2 font-medium text-xs md:text-sm" htmlFor="password">
                                {t('password', { ns: 'common' })}
                            </label>
                            <input
                                className="w-full px-4 py-2.5 md:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                                type="password"
                                id="password"
                                name="password"
                                required
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 md:py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm md:text-base"
                            type="submit"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {t('loggingIn', { ns: 'common' })}
                                </span>
                            ) : t('login', { ns: 'common' })}
                        </button>
                        <div className="text-center text-xs md:text-sm text-gray-600">
                            <Link href="/signup" className="text-blue-600 hover:text-blue-700 hover:underline">
                                {t('dontHaveAccount', { ns: 'common' })}
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </I18nProvider>
    );
}
