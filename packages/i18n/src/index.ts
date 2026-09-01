import en from './locales/en.json';
import bn from './locales/bn.json';

export type Locale = 'en' | 'bn';
export const LOCALES: Locale[] = ['en', 'bn'];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, bn: bn as Dictionary };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'bn';
}

export function getDictionary(locale: string | undefined | null): Dictionary {
  return isLocale(locale) ? dictionaries[locale] : dictionaries[DEFAULT_LOCALE];
}

/**
 * Resolve a dot-path key ("driver.startTrip") against a dictionary and
 * interpolate `{param}` placeholders. Falls back to the key itself so a
 * missing translation is visible but never crashes the UI.
 */
export function translate(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let cursor: unknown = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      cursor = undefined;
      break;
    }
  }
  let text = typeof cursor === 'string' ? cursor : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}
