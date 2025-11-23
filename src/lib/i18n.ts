'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'ja';

i18n
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => import(`@/locales/${language}/${namespace}.json`)))
    .init({
        lng: locale,
        fallbackLng: 'ja',
        ns: ['common', 'admin', 'dashboard', 'payment', 'pay'],
        defaultNS: 'common',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
