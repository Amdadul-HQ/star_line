'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, RouteDto } from '@starline/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Label, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';

interface StopForm {
  name: string;
  lat: string;
  lng: string;
}

const emptyForm = {
  name: '',
  code: '',
  origin: '',
  destination: '',
  distanceKm: 100,
  estimatedDurationMin: 180,
  baseFareBdt: 500,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  stops: [
    { name: '', lat: '', lng: '' },
    { name: '', lat: '', lng: '' },
  ] as StopForm[],
};

export default function RoutesPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RouteDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const routes = useQuery({
    queryKey: ['routes', page],
    queryFn: () => api<Paginated<RouteDto>>('/routes', { query: { page } }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (route: RouteDto) => {
    setEditing(route);
    setForm({
      name: route.name,
      code: route.code,
      origin: route.origin,
      destination: route.destination,
      distanceKm: route.distanceKm,
      estimatedDurationMin: route.estimatedDurationMin,
      baseFareBdt: route.baseFareBdt,
      status: route.status,
      stops: route.stops.map((s) => ({ name: s.name, lat: String(s.lat), lng: String(s.lng) })),
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        distanceKm: Number(form.distanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin),
        baseFareBdt: Number(form.baseFareBdt),
        stops: form.stops.map((s) => ({
          name: s.name,
          lat: Number(s.lat),
          lng: Number(s.lng),
          isBoardingPoint: true,
        })),
      };
      return editing
        ? api<RouteDto>(`/routes/${editing.id}`, { method: 'PATCH', body })
        : api<RouteDto>('/routes', { method: 'POST', body });
    },
    onSuccess: () => {
      setOpen(false);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setStop = (idx: number, patch: Partial<StopForm>) =>
    setForm((f) => ({
      ...f,
      stops: f.stops.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  return (
    <div>
      <PageHeader
        title={t('admin.routesTitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('admin.newRoute')}
          </Button>
        }
      />

      <Card>
        {routes.isLoading ? (
          <LoadingBlock rows={6} />
        ) : routes.isError ? (
          <ErrorState onRetry={() => routes.refetch()} />
        ) : routes.data && routes.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.routeName')}</Th>
                  <Th>{t('admin.routeCode')}</Th>
                  <Th>{t('admin.distance')}</Th>
                  <Th>{t('admin.duration')}</Th>
                  <Th>{t('admin.baseFare')}</Th>
                  <Th>{t('admin.stops')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {routes.data.items.map((route) => (
                  <Tr key={route.id}>
                    <Td className="font-bold">{route.name}</Td>
                    <Td className="text-ink-soft">{route.code}</Td>
                    <Td className="tabular-nums">
                      {route.distanceKm} {t('common.km')}
                    </Td>
                    <Td className="tabular-nums">
                      {Math.floor(route.estimatedDurationMin / 60)}h {route.estimatedDurationMin % 60}m
                    </Td>
                    <Td className="tabular-nums">৳{route.baseFareBdt}</Td>
                    <Td>{route.stops.map((s) => s.name.split(' (')[0]).join(' → ')}</Td>
                    <Td>
                      <StatusBadge group="route" value={route.status} />
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(route)}>
                        {t('common.edit')}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={routes.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editRoute') : t('admin.newRoute')}
        wide
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
          <Field label={t('admin.routeName')} required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dhaka → Feni" />
          </Field>
          <Field label={t('admin.routeCode')} required>
            <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="DHK-FEN" />
          </Field>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
              <option value="ACTIVE">{t('status.route.ACTIVE')}</option>
              <option value="INACTIVE">{t('status.route.INACTIVE')}</option>
            </Select>
          </Field>
          <Field label={t('admin.origin')} required>
            <Input value={form.origin} onChange={(e) => set('origin', e.target.value)} />
          </Field>
          <Field label={t('admin.destination')} required>
            <Input value={form.destination} onChange={(e) => set('destination', e.target.value)} />
          </Field>
          <Field label={`${t('admin.distance')} (${t('common.km')})`}>
            <Input type="number" value={form.distanceKm} onChange={(e) => set('distanceKm', Number(e.target.value))} />
          </Field>
          <Field label={`${t('admin.duration')} (${t('common.min')})`}>
            <Input
              type="number"
              value={form.estimatedDurationMin}
              onChange={(e) => set('estimatedDurationMin', Number(e.target.value))}
            />
          </Field>
          <Field label={`${t('admin.baseFare')} (৳)`}>
            <Input type="number" value={form.baseFareBdt} onChange={(e) => set('baseFareBdt', Number(e.target.value))} />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">{t('admin.stops')}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, stops: [...f.stops, { name: '', lat: '', lng: '' }] }))}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.addStop')}
            </Button>
          </div>
          <div className="space-y-2">
            {form.stops.map((stop, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-bold text-ink-faint">{idx + 1}</span>
                <Input
                  placeholder={t('admin.stopName')}
                  value={stop.name}
                  onChange={(e) => setStop(idx, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder={t('admin.lat')}
                  value={stop.lat}
                  onChange={(e) => setStop(idx, { lat: e.target.value })}
                  className="w-28"
                  inputMode="decimal"
                />
                <Input
                  placeholder={t('admin.lng')}
                  value={stop.lng}
                  onChange={(e) => setStop(idx, { lng: e.target.value })}
                  className="w-28"
                  inputMode="decimal"
                />
                <button
                  className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  disabled={form.stops.length <= 2}
                  onClick={() => setForm((f) => ({ ...f, stops: f.stops.filter((_, i) => i !== idx) }))}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
