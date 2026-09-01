'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUS_CATEGORIES,
  BUS_STATUSES,
  type BusDto,
  type Paginated,
} from '@starline/shared';
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

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

const emptyForm = {
  busNumber: '',
  registrationNumber: '',
  brand: '',
  model: '',
  category: 'AC' as (typeof BUS_CATEGORIES)[number],
  serviceType: 'Business Class',
  seatCapacity: 40,
  branchId: '',
  status: 'IDLE' as (typeof BUS_STATUSES)[number],
};

export default function BusesPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<BusDto | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const buses = useQuery({
    queryKey: ['buses', page, search],
    queryFn: () => api<Paginated<BusDto>>('/buses', { query: { page, search } }),
  });
  const branches = useQuery({
    queryKey: ['branch-options'],
    queryFn: () => api<BranchOption[]>('/branches/options'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (bus: BusDto) => {
    setEditing(bus);
    setForm({
      busNumber: bus.busNumber,
      registrationNumber: bus.registrationNumber,
      brand: bus.brand,
      model: bus.model,
      category: bus.category,
      serviceType: bus.serviceType,
      seatCapacity: bus.seatCapacity,
      branchId: bus.branchId ?? '',
      status: bus.status,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, branchId: form.branchId || null, seatCapacity: Number(form.seatCapacity) };
      return editing
        ? api<BusDto>(`/buses/${editing.id}`, { method: 'PATCH', body })
        : api<BusDto>('/buses', { method: 'POST', body });
    },
    onSuccess: () => {
      setOpen(false);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title={t('admin.busesTitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('admin.newBus')}
          </Button>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Input
            placeholder={`${t('common.search')}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
        </div>
        {buses.isLoading ? (
          <LoadingBlock rows={6} />
        ) : buses.isError ? (
          <ErrorState onRetry={() => buses.refetch()} />
        ) : buses.data && buses.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.busNumber')}</Th>
                  <Th>{t('admin.registrationNumber')}</Th>
                  <Th>{t('admin.brand')}</Th>
                  <Th>{t('admin.category')}</Th>
                  <Th>{t('admin.seatCapacity')}</Th>
                  <Th>{t('admin.branch')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {buses.data.items.map((bus) => (
                  <Tr key={bus.id}>
                    <Td className="font-bold">{bus.busNumber}</Td>
                    <Td className="text-ink-soft">{bus.registrationNumber}</Td>
                    <Td>
                      {bus.brand} {bus.model}
                    </Td>
                    <Td>{bus.category === 'AC' ? 'AC' : 'Non-AC'}</Td>
                    <Td className="tabular-nums">{bus.seatCapacity}</Td>
                    <Td>{bus.branchName ?? t('common.unassigned')}</Td>
                    <Td>
                      <StatusBadge group="bus" value={bus.status} />
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(bus)}>
                        {t('common.edit')}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={buses.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editBus') : t('admin.newBus')}
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
          <Field label={t('admin.busNumber')} required>
            <Input value={form.busNumber} onChange={(e) => set('busNumber', e.target.value.toUpperCase())} placeholder="SL-131" />
          </Field>
          <Field label={t('admin.registrationNumber')} required>
            <Input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
          </Field>
          <Field label={t('admin.brand')} required>
            <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Hino" />
          </Field>
          <Field label={t('admin.model')} required>
            <Input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="AK1J" />
          </Field>
          <Field label={t('admin.category')}>
            <Select value={form.category} onChange={(e) => set('category', e.target.value as never)}>
              {BUS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'AC' ? 'AC' : 'Non-AC'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.serviceType')} required>
            <Input value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} />
          </Field>
          <Field label={t('admin.seatCapacity')} hint="2+2 / 2+1 layout auto-generated">
            <Input
              type="number"
              min={10}
              max={80}
              value={form.seatCapacity}
              onChange={(e) => set('seatCapacity', Number(e.target.value))}
            />
          </Field>
          <Field label={t('admin.branch')}>
            <Select value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>
              <option value="">{t('common.unassigned')}</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
              {BUS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.bus.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
