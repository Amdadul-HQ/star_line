'use client';

import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { Button } from './button';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin text-current', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200', className)} />;
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

interface StateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: StateProps) {
  const t = useT();
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-ink-faint">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{title ?? t('common.emptyTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{description ?? t('common.emptyDesc')}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-3 rounded-full bg-red-50 p-3 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{t('common.errorTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{message ?? t('common.errorDesc')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

/** Placeholder for modules whose data model exists but UI lands in a later phase. */
export function ComingSoon({ title }: { title: string }) {
  const t = useT();
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-ink">{title}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState title={t('common.comingSoonTitle')} description={t('common.comingSoonDesc')} />
      </div>
    </div>
  );
}
