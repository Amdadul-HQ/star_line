'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuditLogDto, Paginated } from '@starline/shared';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

export default function AuditLogsPage() {
  const t = useT();
  const { locale } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const logs = useQuery({
    queryKey: ['audit', page, search],
    queryFn: () => api<Paginated<AuditLogDto>>('/audit', { query: { page, search } }),
  });

  return (
    <div>
      <PageHeader title={t('admin.auditTitle')} />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Input
            placeholder={`${t('common.search')} (${t('admin.action')})…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
        {logs.isLoading ? (
          <LoadingBlock rows={10} />
        ) : logs.isError ? (
          <ErrorState onRetry={() => logs.refetch()} />
        ) : logs.data && logs.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.when')}</Th>
                  <Th>{t('admin.actor')}</Th>
                  <Th>{t('admin.action')}</Th>
                  <Th>{t('admin.entity')}</Th>
                  <Th>{t('admin.details')}</Th>
                </tr>
              </THead>
              <TBody>
                {logs.data.items.map((log) => (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap text-ink-soft">
                      {formatDateTime(log.createdAt, locale)}
                    </Td>
                    <Td className="font-semibold">{log.actorName ?? 'System'}</Td>
                    <Td>
                      <Badge tone="blue" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </Td>
                    <Td className="text-ink-soft">{log.entity}</Td>
                    <Td>
                      {(log.before != null || log.after != null) && (
                        <details>
                          <summary className="cursor-pointer text-xs font-semibold text-brand-600">
                            {t('common.viewAll')}
                          </summary>
                          <pre className="thin-scroll mt-1 max-w-md overflow-x-auto rounded bg-slate-50 p-2 text-[10px] leading-relaxed text-ink-soft">
                            {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={logs.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>
    </div>
  );
}
