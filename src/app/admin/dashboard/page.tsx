'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EventModal from '@/components/modals/EventModal';
import AddUserModal from '@/components/modals/AddUserModal';

export default function DashboardPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [paymentUsers, setPaymentUsers] = useState<any[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent) {
            loadPaymentUsers();
        }
    }, [selectedEvent]);

    async function loadEvents(selectEventId?: string) {
        const res = await fetch('/api/admin/events');
        if (res.ok) {
            const data = await res.json();
            setEvents(data);
            if (selectEventId) {
                setSelectedEvent(selectEventId);
            } else if (data.length > 0 && !selectedEvent) {
                setSelectedEvent(data[0].id);
            }
        }
    }

    async function loadPaymentUsers() {
        const res = await fetch(`/api/admin/events/${selectedEvent}/users`);
        if (res.ok) {
            const data = await res.json();
            setPaymentUsers(data);
        }
    }

    function copyPaymentLink() {
        const event = events.find(e => e.id === selectedEvent);
        if (event) {
            const url = `${window.location.origin}/pay/${event.payment_token}`;
            navigator.clipboard.writeText(url);
            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 duration-300';
            toast.textContent = t('linkCopied', { ns: 'dashboard' });
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    const currentEvent = events.find(e => e.id === selectedEvent);

    return (
        <div className="space-y-6">
            {/* Top Controls */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <div className="flex flex-wrap items-center gap-4">
                    <select
                        className="flex-1 min-w-[200px] px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                    >
                        {events.map(event => (
                            <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsEventModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2 text-sm"
                    >
                        <span>+</span>
                        {t('addEvent', { ns: 'dashboard' })}
                    </button>
                </div>
            </div>

            {/* Payment Link Info */}
            {currentEvent && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🔗</span>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-700 mb-2">{t('paymentLink', { ns: 'dashboard' })}</p>
                            <div
                                onClick={copyPaymentLink}
                                className="flex items-center gap-2 text-sm text-gray-600 break-all font-mono bg-white/50 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/80 transition-colors group"
                            >
                                <span className="flex-1">{`${window.location.origin}/pay/${currentEvent.payment_token}`}</span>
                                <svg
                                    className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden border border-gray-200/50">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-700">{t('paymentUsers', { ns: 'dashboard' })}</h2>
                    {selectedEvent && (
                        <button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2 text-sm"
                        >
                            <span>+</span>
                            {t('addUser', { ns: 'dashboard' })}
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                    {t('table.name', { ns: 'dashboard' })}
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                    {t('table.email', { ns: 'dashboard' })}
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                    {t('table.amount', { ns: 'dashboard' })}
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                    {t('table.method', { ns: 'dashboard' })}
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                    {t('table.status', { ns: 'dashboard' })}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paymentUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-800">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4 text-gray-800 font-semibold">
                                        ¥{user.amount_due?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.payment_method || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                user.status === 'UNPAID' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {user.status === 'PAID' && '✓ '}
                                            {user.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {paymentUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <span className="text-4xl">📭</span>
                                            <p>{t('noPaymentUsers', { ns: 'dashboard' })}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onSuccess={(eventId) => loadEvents(eventId)}
            />

            <AddUserModal
                isOpen={isAddUserModalOpen}
                onClose={() => setIsAddUserModalOpen(false)}
                onSuccess={() => loadPaymentUsers()}
                eventId={selectedEvent}
            />
        </div>
    );
}
