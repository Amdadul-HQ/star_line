'use client';

import {
  ROLE_HOME_PATH,
  bdPhoneSchema,
  type LoginResponse,
  type OtpRequestResponse,
  type RoleName,
} from '@starline/shared';
import { BusFront } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/form';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { resetSocket } from '@/lib/realtime';
import { cn } from '@/lib/utils';

type Tab = 'passenger' | 'staff';

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [tab, setTab] = useState<Tab>('passenger');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // passenger state
  const [phone, setPhone] = useState('+880');
  const [otpStep, setOtpStep] = useState<OtpRequestResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // staff state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const fail = (err: unknown) => {
    setError(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'));
  };

  const finishLogin = (session: LoginResponse) => {
    setSession(session);
    resetSocket();
    router.replace(ROLE_HOME_PATH[session.user.role as RoleName] ?? '/');
  };

  const requestOtp = async () => {
    setError(null);
    const parsed = bdPhoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(t('auth.phoneHint'));
      return;
    }
    setBusy(true);
    try {
      const res = await api<OtpRequestResponse>('/auth/passenger/otp/request', {
        method: 'POST',
        body: { phone: parsed.data },
        auth: false,
      });
      setOtpStep(res);
      setResendIn(res.resendAfter);
      setOtp('');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpStep) return;
    setError(null);
    setBusy(true);
    try {
      const session = await api<LoginResponse>('/auth/passenger/otp/verify', {
        method: 'POST',
        body: { phone: otpStep.phone, otp, ...(name.trim() ? { name: name.trim() } : {}) },
        auth: false,
      });
      finishLogin(session);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const staffLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const session = await api<LoginResponse>('/auth/staff/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      finishLogin(session);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BusFront className="h-4 w-4" />
          </span>
          <span className="font-extrabold text-ink">{t('common.appName')}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <h1 className="text-xl font-bold text-ink">{t('auth.welcome')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.subtitle')}</p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['passenger', 'staff'] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setError(null);
                }}
                className={cn(
                  'rounded-lg py-2 text-sm font-semibold transition-colors',
                  tab === key ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
                )}
                aria-pressed={tab === key}
              >
                {t(key === 'passenger' ? 'auth.passengerTab' : 'auth.staffTab')}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          {tab === 'passenger' && !otpStep && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void requestOtp();
              }}
            >
              <Field label={t('auth.phoneLabel')} hint={t('auth.phoneHint')} required>
                <Input
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="+8801712345678"
                  autoFocus
                />
              </Field>
              <Button type="submit" className="w-full" size="lg" loading={busy}>
                {t('auth.sendOtp')}
              </Button>
            </form>
          )}

          {tab === 'passenger' && otpStep && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verifyOtp();
              }}
            >
              <p className="text-sm text-ink-soft">{t('auth.otpSentTo', { phone: otpStep.phone })}</p>
              {otpStep.devCode && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {t('auth.sandboxHint', { code: otpStep.devCode })}
                </p>
              )}
              <Field label={t('auth.otpLabel')} required>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center text-lg font-bold tracking-[0.5em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </Field>
              <Field label={t('auth.nameLabel')} hint={t('auth.namePlaceholder')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Button type="submit" className="w-full" size="lg" loading={busy} disabled={otp.length !== 6}>
                {t('auth.verifyOtp')}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="font-medium text-ink-soft hover:text-ink"
                  onClick={() => {
                    setOtpStep(null);
                    setError(null);
                  }}
                >
                  {t('auth.changePhone')}
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || busy}
                  onClick={() => void requestOtp()}
                  className="font-semibold text-brand-600 disabled:text-ink-faint"
                >
                  {resendIn > 0 ? t('auth.resendIn', { s: resendIn }) : t('auth.resendOtp')}
                </button>
              </div>
            </form>
          )}

          {tab === 'staff' && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void staffLogin();
              }}
            >
              <Field label={t('auth.emailLabel')} required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@starline.local"
                  autoFocus
                />
              </Field>
              <Field label={t('auth.passwordLabel')} required>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button type="submit" className="w-full" size="lg" loading={busy}>
                {t('auth.staffLoginBtn')}
              </Button>
              <p className="text-center text-xs text-ink-faint">{t('auth.staffHint')}</p>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
