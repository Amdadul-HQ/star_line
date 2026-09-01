'use client';

import { useQuery } from '@tanstack/react-query';
import type { RoleDto } from '@starline/shared';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function RolesPage() {
  const t = useT();
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api<RoleDto[]>('/roles') });

  return (
    <div>
      <PageHeader title={t('admin.rolesTitle')} />
      {roles.isLoading ? (
        <LoadingBlock rows={6} />
      ) : roles.isError ? (
        <ErrorState onRetry={() => roles.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(roles.data ?? []).map((role) => (
            <Card key={role.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    {role.name}
                  </p>
                  {role.description && (
                    <p className="mt-0.5 text-xs text-ink-soft">{role.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {role.isSystem && <Badge>{t('admin.system')}</Badge>}
                  <Badge tone="blue">
                    {role.userCount ?? 0} {t('admin.users')}
                  </Badge>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-brand-600">
                  {role.permissions.length} {t('admin.permissions')}
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((code) => (
                    <span
                      key={code}
                      className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
                    >
                      {code}
                    </span>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-ink-faint">{t('common.none')}</span>
                  )}
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
