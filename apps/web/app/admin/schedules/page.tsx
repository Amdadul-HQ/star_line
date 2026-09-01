'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, ScheduleDto } from '@starline/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

interface RouteOption {
  id: string;
  name: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulesPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [routeFilter, setRouteFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    routeId: '',
    departureTime: '08:30',
    days: [0, 1, 2, 3, 4, 5, 6] as number[],
  });

  const schedules = useQuery({
    queryKey: ['schedules', page, routeFilter],
    queryFn: () =>
      api<Paginated<ScheduleDto>>('/schedules', {
        query: { page, pageSize: 15, ...(routeFilter ? { routeId: routeFilter } : {}) },
      }),
  });
  const routes = useQuery({
    queryKey: ['route-options'],
    queryFn: () => api<RouteOption[]>('/routes/options'),
  });

  const create = useMutation({
    mutationFn: () =>
      api<ScheduleDto>('/schedules', {
        method: 'POST',
        body: { routeId: form.routeId, departureTime: form.departureTime, daysOfWeek: form.days },
      }),
    onSuccess: () => {
      setOpen(false);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const toggleDay = (day: number) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day].sort(),
    }));

  return (
    <div>
      <PageHeader
        title={t('admin.schedulesTitle')}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value);
                setPage(1);
              }}
              className="w-52"
            >
              <option value="">
                {t('common.all')} — {t('nav.routes')}
              </option>
              {(routes.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('admin.newSchedule')}
            </Button>
          </div>
        }
      />

      <Card>
        {schedules.isLoading ? (
          <LoadingBlock rows={8} />
        ) : schedules.isError ? (
          <ErrorState onRetry={() => schedules.refetch()} />
        ) : schedules.data && schedules.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.route')}</Th>
                  <Th>{t('admin.departureTime')}</Th>
                  <Th>{t('admin.days')}</Th>
                  <Th>{t('common.status')}</Th>
                </tr>
              </THead>
              <TBody>
                {schedules.data.items.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-semibold">{s.routeName}</Td>
                    <Td className="tabular-nums">{s.departureTime}</Td>
                    <Td>
                      {s.daysOfWeek.length === 7
                        ? t('admin.everyday')
                        : s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}
                    </Td>
                    <Td>
                      <Badge tone={s.isActive ? 'green' : 'gray'}>
                        {s.isActive ? t('fleet.active') : t('fleet.inactive')}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={schedules.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('admin.newSchedule')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={create.isPending}
              disabled={!form.routeId || form.days.length === 0}
              onClick={() => create.mutate()}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('admin.route')} required>
            <Select value={form.routeId} onChange={(e) => setForm((f) => ({ ...f, routeId: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {(routes.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.departureTime')} required>
            <Input
              type="time"
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
            />
          </Field>
          <Field label={t('admin.days')}>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={
                    form.days.includes(day)
                      ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white'
                      : 'rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-slate-200'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
