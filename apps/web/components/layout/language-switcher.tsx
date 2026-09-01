'use client';

import { LOCALE_LABELS, LOCALES } from '@starline/i18n';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 text-ink-faint" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
            locale === l ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-slate-100',
          )}
          aria-pressed={locale === l}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
