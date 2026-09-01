'use client';

import { useQuery } from '@tanstack/react-query';
import type { Paginated, UserDto } from '@starline/shared';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

/** Shared listing for the role-filtered people pages (drivers, passengers…). */
export function UsersTable({ role, titleKey }: { role: string; titleKey: string }) {
  const t = useT();
  const { locale } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const users = useQuery({
    queryKey: ['users', role, page, search],
    queryFn: () => api<Paginated<UserDto>>('/users', { query: { role, page, search } }),
  });

  return (
    <div>
      <PageHeader title={t(titleKey)} />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Input
            placeholder={t('admin.searchUsers')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
        {users.isLoading ? (
          <LoadingBlock rows={8} />
        ) : users.isError ? (
          <ErrorState onRetry={() => users.refetch()} />
        ) : users.data && users.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.name')}</Th>
                  <Th>{t('admin.phone')}</Th>
                  <Th>{t('admin.email')}</Th>
                  <Th>{t('admin.branch')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th>{t('admin.created')}</Th>
                </tr>
              </THead>
              <TBody>
                {users.data.items.map((user) => (
                  <Tr key={user.id}>
                    <Td className="font-semibold">
                      {user.name}
                      {user.employeeCode && (
                        <span className="ml-1.5 text-xs text-ink-faint">{user.employeeCode}</span>
                      )}
                    </Td>
                    <Td className="tabular-nums">{user.phone ?? '—'}</Td>
                    <Td>{user.email ?? '—'}</Td>
                    <Td>{user.branchName ?? '—'}</Td>
                    <Td>
                      <Badge tone={user.status === 'ACTIVE' ? 'green' : 'gray'}>{user.status}</Badge>
                    </Td>
                    <Td className="text-ink-soft">{formatDate(user.createdAt, locale)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={users.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>
    </div>
  );
}
