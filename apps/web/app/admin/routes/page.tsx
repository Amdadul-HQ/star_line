'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, RouteDto } from '@starline/shared';
import { MapPin, Plus, Ticket, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Label, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { MapView, type MapMarker } from '@/components/map/map-view';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface StaffOption {
  id: string;
  name: string;
  branchName: string | null;
}

interface StopForm {
  name: string;
  lat: string;
  lng: string;
  isCounter: boolean;
  counterPhone: string;
  counterAddress: string;
  note: string;
  staffIds: string[];
}

const emptyStop = (): StopForm => ({
  name: '',
  lat: '',
  lng: '',
  isCounter: false,
  counterPhone: '',
  counterAddress: '',
  note: '',
  staffIds: [],
});

const emptyForm = {
  name: '',
  code: '',
  origin: '',
  destination: '',
  distanceKm: 100,
  estimatedDurationMin: 180,
  baseFareBdt: 500,
  acFareBdt: '' as string,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  stops: [emptyStop(), emptyStop()] as StopForm[],
};

export default function RoutesPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RouteDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [targetIdx, setTargetIdx] = useState(0);

  const routes = useQuery({
    queryKey: ['routes', page],
    queryFn: () => api<Paginated<RouteDto>>('/routes', { query: { page } }),
  });
  const ticketers = useQuery({
    queryKey: ['user-options', 'TICKETER'],
    queryFn: () => api<StaffOption[]>('/users/options', { query: { role: 'TICKETER' } }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setTargetIdx(0);
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
      acFareBdt: route.acFareBdt != null ? String(route.acFareBdt) : '',
      status: route.status,
      stops: route.stops.map((s) => ({
        name: s.name,
        lat: String(s.lat),
        lng: String(s.lng),
        isCounter: s.isCounter,
        counterPhone: s.counterPhone ?? '',
        counterAddress: s.counterAddress ?? '',
        note: s.note ?? '',
        staffIds: s.staff.map((u) => u.id),
      })),
    });
    setTargetIdx(0);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        code: form.code,
        origin: form.origin,
        destination: form.destination,
        distanceKm: Number(form.distanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin),
        baseFareBdt: Number(form.baseFareBdt),
        acFareBdt: form.acFareBdt ? Number(form.acFareBdt) : null,
        status: form.status,
        stops: form.stops.map((s) => ({
          name: s.name,
          lat: Number(s.lat),
          lng: Number(s.lng),
          isBoardingPoint: true,
          isCounter: s.isCounter,
          counterPhone: s.isCounter && s.counterPhone ? s.counterPhone : null,
          counterAddress: s.isCounter && s.counterAddress ? s.counterAddress : null,
          note: s.note || null,
          staffIds: s.isCounter ? s.staffIds : [],
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

  // Map click places the targeted stop, then advances to the next unplaced one.
  const placeOnMap = ({ lat, lng }: { lat: number; lng: number }) => {
    setStop(targetIdx, { lat: lat.toFixed(5), lng: lng.toFixed(5) });
    const nextUnplaced = form.stops.findIndex((s, i) => i !== targetIdx && (!s.lat || !s.lng));
    if (nextUnplaced >= 0) setTargetIdx(nextUnplaced);
  };

  const editorMarkers: MapMarker[] = useMemo(
    () =>
      form.stops
        .map((s, i) => ({ stop: s, i }))
        .filter(({ stop }) => stop.lat && stop.lng && !Number.isNaN(Number(stop.lat)))
        .map(({ stop, i }) => ({
          id: `stop-${i}`,
          lat: Number(stop.lat),
          lng: Number(stop.lng),
          label: `${i + 1} ${stop.name.split(' (')[0] || '?'}`,
          glyph: stop.isCounter ? '🎫' : '📍',
          tone: i === targetIdx ? 'live' : ('idle' as const),
        })),
    [form.stops, targetIdx],
  );
  const editorPath = useMemo(
    () =>
      form.stops
        .filter((s) => s.lat && s.lng)
        .map((s) => ({ lat: Number(s.lat), lng: Number(s.lng), name: s.name || '?' })),
    [form.stops],
  );

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
                  <Th>{t('admin.baseFare')}</Th>
                  <Th>{t('admin.acFare')}</Th>
                  <Th>{t('admin.stops')}</Th>
                  <Th>{t('admin.counters')}</Th>
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
                    <Td className="tabular-nums">৳{route.baseFareBdt}</Td>
                    <Td className="tabular-nums">
                      {route.acFareBdt != null ? `৳${route.acFareBdt}` : '—'}
                    </Td>
                    <Td>{route.stops.length}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Ticket className="h-3.5 w-3.5 text-brand-500" />
                        {route.stops.filter((s) => s.isCounter).length}
                      </span>
                    </Td>
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
        {/* ------------------------------------------------- basic fields */}
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
          <Field label={`${t('admin.nonAcFare')} (৳)`}>
            <Input type="number" value={form.baseFareBdt} onChange={(e) => set('baseFareBdt', Number(e.target.value))} />
          </Field>
          <Field label={`${t('admin.acFare')} (৳)`} hint={t('admin.acFareHint')}>
            <Input
              type="number"
              value={form.acFareBdt}
              onChange={(e) => set('acFareBdt', e.target.value)}
              placeholder="—"
            />
          </Field>
        </div>

        {/* ------------------------------------------------- map placement */}
        <div className="mt-6">
          <Label className="mb-1">{t('admin.stopsOnMap')}</Label>
          <p className="mb-2 text-xs text-ink-faint">{t('admin.mapClickHint')}</p>
          <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
            <MapView
              markers={editorMarkers}
              path={editorPath.length > 1 ? editorPath : undefined}
              fit={editorMarkers.length > 0}
              onMapClick={placeOnMap}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* ------------------------------------------------- stop rows */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">{t('admin.stops')}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setForm((f) => ({ ...f, stops: [...f.stops, emptyStop()] }));
                setTargetIdx(form.stops.length);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.addStop')}
            </Button>
          </div>

          <div className="space-y-2">
            {form.stops.map((stop, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  targetIdx === idx ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200',
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetIdx(idx)}
                    title={t('admin.placeOnMap')}
                    aria-label={`${t('admin.placeOnMap')} — ${idx + 1}`}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      targetIdx === idx
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 text-ink-faint hover:border-brand-400 hover:text-brand-600',
                    )}
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                  <span className="w-4 text-center text-xs font-bold text-ink-faint">{idx + 1}</span>
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
                    className="w-24"
                    inputMode="decimal"
                  />
                  <Input
                    placeholder={t('admin.lng')}
                    value={stop.lng}
                    onChange={(e) => setStop(idx, { lng: e.target.value })}
                    className="w-24"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() => setStop(idx, { isCounter: !stop.isCounter })}
                    title={t('admin.stopCounter')}
                    aria-pressed={stop.isCounter}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      stop.isCounter
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-ink-faint hover:border-emerald-400 hover:text-emerald-600',
                    )}
                  >
                    <Ticket className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    disabled={form.stops.length <= 2}
                    onClick={() => {
                      setForm((f) => ({ ...f, stops: f.stops.filter((_, i) => i !== idx) }));
                      setTargetIdx((cur) => Math.max(0, cur > idx ? cur - 1 : Math.min(cur, form.stops.length - 2)));
                    }}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {stop.isCounter && (
                  <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    <Field label={t('admin.counterPhone')}>
                      <Input
                        value={stop.counterPhone}
                        onChange={(e) => setStop(idx, { counterPhone: e.target.value })}
                        placeholder="+8801..."
                      />
                    </Field>
                    <Field label={t('admin.counterAddress')}>
                      <Input
                        value={stop.counterAddress}
                        onChange={(e) => setStop(idx, { counterAddress: e.target.value })}
                      />
                    </Field>
                    <Field label={t('admin.counterNote')} className="sm:col-span-2">
                      <Input value={stop.note} onChange={(e) => setStop(idx, { note: e.target.value })} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Label>{t('admin.counterStaff')}</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(ticketers.data ?? []).map((staff) => {
                          const active = stop.staffIds.includes(staff.id);
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setStop(idx, {
                                  staffIds: active
                                    ? stop.staffIds.filter((id) => id !== staff.id)
                                    : [...stop.staffIds, staff.id],
                                })
                              }
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                                active
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
                              )}
                            >
                              {staff.name}
                              {staff.branchName ? ` · ${staff.branchName}` : ''}
                            </button>
                          );
                        })}
                        {(ticketers.data ?? []).length === 0 && (
                          <span className="text-xs text-ink-faint">{t('common.none')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
