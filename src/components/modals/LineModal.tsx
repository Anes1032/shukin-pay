'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function LineModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'loading' | 'linked' | 'unlinked'>('loading');
    const [lineAddUrl, setLineAddUrl] = useState<string | null>(null);
    const [manualLinkToken, setManualLinkToken] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStatus();
        }
    }, [isOpen]);

    async function loadStatus() {
        const res = await fetch('/api/line/link');
        if (res.ok) {
            const data = await res.json();
            setStatus(data.linked ? 'linked' : 'unlinked');
            setLineAddUrl(data.lineAddUrl || null);
            setManualLinkToken(data.manualLinkToken || null);
        } else {
            setStatus('unlinked');
        }
    }

    function copyLink() {
        if (lineAddUrl) {
            navigator.clipboard.writeText(lineAddUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        }
    }

    function copyToken() {
        if (manualLinkToken) {
            navigator.clipboard.writeText(manualLinkToken);
            setTokenCopied(true);
            setTimeout(() => setTokenCopied(false), 3000);
        }
    }

    function openLineAdd() {
        if (lineAddUrl) {
            window.open(lineAddUrl, '_blank');
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('lineLinkTitle', { ns: 'dashboard' })}>
            <div className="py-2">
                {status === 'loading' ? (
                    <p className="text-gray-600">{t('loading', { ns: 'dashboard' })}</p>
                ) : status === 'linked' ? (
                    <div>
                        <div className="bg-green-50 p-4 rounded mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-600 font-semibold">{t('lineLinked', { ns: 'dashboard' })}</span>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            {t('lineLinkedDescription', { ns: 'dashboard' })}
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-700 mb-6 leading-relaxed">
                            {t('lineLinkDescription', { ns: 'dashboard' })}
                        </p>
                        {lineAddUrl && (
                            <div className="space-y-4">
                                {manualLinkToken && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-blue-800 font-medium mb-2">
                                            {t('lineAlreadyAddedTitle', { ns: 'dashboard' })}
                                        </p>
                                        <p className="text-xs text-blue-700 mb-3">
                                            {t('lineAlreadyAddedDescription', { ns: 'dashboard' })}
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={manualLinkToken}
                                                className="flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none bg-white text-sm font-mono"
                                            />
                                            <button
                                                onClick={copyToken}
                                                className="px-4 py-2 border border-blue-300 rounded hover:bg-blue-100 text-blue-700"
                                            >
                                                {tokenCopied ? t('copied', { ns: 'dashboard' }) : t('copy', { ns: 'dashboard' })}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={openLineAdd}
                                    className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-2"
                                >
                                    <span>📱</span>
                                    {t('addLineAccount', { ns: 'dashboard' })}
                                </button>
                                <p className="text-gray-500 text-xs mt-2">
                                    {t('lineLinkNote', { ns: 'dashboard' })}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

