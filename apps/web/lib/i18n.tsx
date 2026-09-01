'use client';

import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  translate,
  type Dictionary,
  type Locale,
} from '@starline/i18n';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'starline-locale';

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dict: getDictionary(DEFAULT_LOCALE),
  setLocale: () => undefined,
});

/**
 * Client-side locale switching — updates React state only, so the current
 * page (forms, maps, sockets) keeps its state when the language changes.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, dict: getDictionary(locale), setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/** t('driver.startTrip') / t('auth.resendIn', { s: 30 }) */
export function useT() {
  const { dict } = useContext(I18nContext);
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate(dict, key, params),
    [dict],
  );
}
