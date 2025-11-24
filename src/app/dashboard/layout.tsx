'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';
import PaymentInfoModal from '@/components/modals/PaymentInfoModal';
import PasswordModal from '@/components/modals/PasswordModal';
import GmailModal from '@/components/modals/GmailModal';
import LineModal from '@/components/modals/LineModal';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    }

    return (
        <I18nProvider>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
                <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all">
                            {t('shukinPay', { ns: 'common' })}
                        </Link>
                        <div ref={menuRef} className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex flex-col gap-1.5 p-2.5 hover:bg-gray-100 rounded-lg transition-all"
                                aria-label={t('menu', { ns: 'admin' })}
                            >
                                <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                                <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                                <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl py-2 z-50 border border-gray-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-3"
                                        onClick={() => { setIsPaymentModalOpen(true); setIsMenuOpen(false); }}
                                    >
                                        <span className="text-xl">💳</span>
                                        {t('paymentInfo', { ns: 'admin' })}
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-3"
                                        onClick={() => { setIsGmailModalOpen(true); setIsMenuOpen(false); }}
                                    >
                                        <span className="text-xl">📧</span>
                                        {t('gmailAuth', { ns: 'admin' })}
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-3"
                                        onClick={() => { setIsLineModalOpen(true); setIsMenuOpen(false); }}
                                    >
                                        <span className="text-xl">💬</span>
                                        {t('lineAuth', { ns: 'admin' })}
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-3"
                                        onClick={() => { setIsPasswordModalOpen(true); setIsMenuOpen(false); }}
                                    >
                                        <span className="text-xl">🔒</span>
                                        {t('changePassword', { ns: 'admin' })}
                                    </button>
                                    <div className="border-t border-gray-200 my-2"></div>
                                    <button
                                        className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3"
                                        onClick={handleLogout}
                                    >
                                        <span className="text-xl">🚪</span>
                                        {t('logout', { ns: 'common' })}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>

                <PaymentInfoModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                />

                <PasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />

                <GmailModal
                    isOpen={isGmailModalOpen}
                    onClose={() => setIsGmailModalOpen(false)}
                />

                <LineModal
                    isOpen={isLineModalOpen}
                    onClose={() => setIsLineModalOpen(false)}
                />
            </div>
        </I18nProvider>
    );
}
