import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import tr from './tr.json';
import en from './en.json';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Use device language, fall back to Turkish
    lng: Localization.getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en',
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
