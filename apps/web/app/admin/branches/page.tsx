'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BranchDto, Paginated } from '@starline/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';

interface ManagerOption {
  id: string;
  name: string;
  branchName: string | null;
}

const emptyForm = {
  name: '',
  code: '',
  address: '',
  district: '',
  division: '',
  phone: '',
  managerId: '',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

export default function BranchesPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const branches = useQuery({
    queryKey: ['branches', page],
    queryFn: () => api<Paginated<BranchDto>>('/branches', { query: { page } }),
  });
  const managers = useQuery({
    queryKey: ['user-options', 'BRANCH_MANAGER'],
    queryFn: () => api<ManagerOption[]>('/users/options', { query: { role: 'BRANCH_MANAGER' } }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (branch: BranchDto) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      district: branch.district,
      division: branch.division,
      phone: branch.phone,
      managerId: branch.managerId ?? '',
      status: branch.status,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, managerId: form.managerId || null };
      return editing
        ? api<BranchDto>(`/branches/${editing.id}`, { method: 'PATCH', body })
        : api<BranchDto>('/branches', { method: 'POST', body });
    },
    onSuccess: () => {
      setOpen(false);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title={t('admin.branchesTitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('admin.newBranch')}
          </Button>
        }
      />

      <Card>
        {branches.isLoading ? (
          <LoadingBlock rows={6} />
        ) : branches.isError ? (
          <ErrorState onRetry={() => branches.refetch()} />
        ) : branches.data && branches.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.branchName')}</Th>
                  <Th>{t('admin.branchCode')}</Th>
                  <Th>{t('admin.district')}</Th>
                  <Th>{t('admin.division')}</Th>
                  <Th>{t('admin.phone')}</Th>
                  <Th>{t('admin.manager')}</Th>
                  <Th>{t('nav.buses')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {branches.data.items.map((branch) => (
                  <Tr key={branch.id}>
                    <Td className="font-bold">{branch.name}</Td>
                    <Td className="text-ink-soft">{branch.code}</Td>
                    <Td>{branch.district}</Td>
                    <Td>{branch.division}</Td>
                    <Td className="tabular-nums">{branch.phone}</Td>
                    <Td>{branch.managerName ?? t('common.unassigned')}</Td>
                    <Td className="tabular-nums">{branch.busCount ?? 0}</Td>
                    <Td>
                      <StatusBadge group="branch" value={branch.status} />
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(branch)}>
                        {t('common.edit')}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={branches.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editBranch') : t('admin.newBranch')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.branchName')} required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label={t('admin.branchCode')} required>
            <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="DHK" />
          </Field>
          <Field label={t('admin.address')} required className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label={t('admin.district')} required>
            <Input value={form.district} onChange={(e) => set('district', e.target.value)} />
          </Field>
          <Field label={t('admin.division')} required>
            <Input value={form.division} onChange={(e) => set('division', e.target.value)} />
          </Field>
          <Field label={t('admin.phone')} required>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label={t('admin.manager')}>
            <Select value={form.managerId} onChange={(e) => set('managerId', e.target.value)}>
              <option value="">{t('common.unassigned')}</option>
              {(managers.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
              <option value="ACTIVE">{t('status.branch.ACTIVE')}</option>
              <option value="INACTIVE">{t('status.branch.INACTIVE')}</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
