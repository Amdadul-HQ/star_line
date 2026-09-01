'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, TripDto } from '@starline/shared';
import { Plus, UserCog } from 'lucide-react';
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
import { formatTime } from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n';

interface Option {
  id: string;
  name: string;
}
interface BusOption {
  id: string;
  busNumber: string;
}
interface RouteOption {
  id: string;
  name: string;
}

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export default function TripsPage() {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTrip, setAssignTrip] = useState<TripDto | null>(null);

  const [createForm, setCreateForm] = useState({
    routeId: '',
    serviceDate: todayStr(),
    departureTime: '08:30',
    fareBdt: '' as string,
  });
  const [assignForm, setAssignForm] = useState({
    busId: '',
    driverId: '',
    supervisorId: '',
    helperId: '',
  });

  const trips = useQuery({
    queryKey: ['trips', date, page],
    queryFn: () => api<Paginated<TripDto>>('/trips', { query: { date, page, pageSize: 15 } }),
  });
  const routeOptions = useQuery({
    queryKey: ['route-options'],
    queryFn: () => api<RouteOption[]>('/routes/options'),
  });
  const busOptions = useQuery({
    queryKey: ['bus-options'],
    queryFn: () => api<BusOption[]>('/buses/options'),
  });
  const driverOptions = useQuery({
    queryKey: ['user-options', 'DRIVER'],
    queryFn: () => api<Option[]>('/users/options', { query: { role: 'DRIVER' } }),
  });
  const supervisorOptions = useQuery({
    queryKey: ['user-options', 'SUPERVISOR'],
    queryFn: () => api<Option[]>('/users/options', { query: { role: 'SUPERVISOR' } }),
  });
  const helperOptions = useQuery({
    queryKey: ['user-options', 'HELPER'],
    queryFn: () => api<Option[]>('/users/options', { query: { role: 'HELPER' } }),
  });

  const fail = (err: unknown) =>
    toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error');

  const create = useMutation({
    mutationFn: () =>
      api<TripDto>('/trips', {
        method: 'POST',
        body: {
          routeId: createForm.routeId,
          serviceDate: createForm.serviceDate,
          departureTime: createForm.departureTime,
          ...(createForm.fareBdt ? { fareBdt: Number(createForm.fareBdt) } : {}),
        },
      }),
    onSuccess: () => {
      setCreateOpen(false);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: fail,
  });

  const assign = useMutation({
    mutationFn: () =>
      api<TripDto>(`/trips/${assignTrip!.id}/assign`, {
        method: 'PATCH',
        body: {
          busId: assignForm.busId || null,
          driverId: assignForm.driverId || null,
          supervisorId: assignForm.supervisorId || null,
          helperId: assignForm.helperId || null,
        },
      }),
    onSuccess: () => {
      setAssignTrip(null);
      toast.push(t('common.save'));
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: fail,
  });

  const openAssign = (trip: TripDto) => {
    setAssignTrip(trip);
    setAssignForm({
      busId: trip.busId ?? '',
      driverId: trip.driverId ?? '',
      supervisorId: trip.supervisorId ?? '',
      helperId: trip.helperId ?? '',
    });
  };

  return (
    <div>
      <PageHeader
        title={t('admin.tripsTitle')}
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('admin.newTrip')}
            </Button>
          </div>
        }
      />

      <Card>
        {trips.isLoading ? (
          <LoadingBlock rows={8} />
        ) : trips.isError ? (
          <ErrorState onRetry={() => trips.refetch()} />
        ) : trips.data && trips.data.items.length > 0 ? (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>{t('admin.route')}</Th>
                  <Th>{t('admin.departure')}</Th>
                  <Th>{t('admin.bus')}</Th>
                  <Th>{t('admin.driver')}</Th>
                  <Th>{t('admin.supervisor')}</Th>
                  <Th>{t('admin.booked')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {trips.data.items.map((trip) => (
                  <Tr key={trip.id}>
                    <Td className="font-semibold">{trip.routeName}</Td>
                    <Td>{formatTime(trip.departureAt, locale)}</Td>
                    <Td>{trip.busNumber ?? t('common.unassigned')}</Td>
                    <Td>{trip.driverName ?? t('common.unassigned')}</Td>
                    <Td>{trip.supervisorName ?? t('common.unassigned')}</Td>
                    <Td className="tabular-nums">
                      {trip.bookedSeats ?? 0}/{trip.seatCapacity ?? '—'}
                    </Td>
                    <Td>
                      <StatusBadge group="trip" value={trip.status} />
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => openAssign(trip)}>
                        <UserCog className="h-3.5 w-3.5" />
                        {t('admin.assign')}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={trips.data.totalPages} onPage={setPage} />
          </>
        ) : (
          <EmptyState />
        )}
      </Card>

      {/* --------------------------------------------------------- create */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.newTrip')}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={create.isPending} disabled={!createForm.routeId} onClick={() => create.mutate()}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.route')} required className="sm:col-span-2">
            <Select
              value={createForm.routeId}
              onChange={(e) => setCreateForm((f) => ({ ...f, routeId: e.target.value }))}
            >
              <option value="" disabled>
                —
              </option>
              {(routeOptions.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.serviceDate')} required>
            <Input
              type="date"
              value={createForm.serviceDate}
              onChange={(e) => setCreateForm((f) => ({ ...f, serviceDate: e.target.value }))}
            />
          </Field>
          <Field label={t('admin.departureTime')} required>
            <Input
              type="time"
              value={createForm.departureTime}
              onChange={(e) => setCreateForm((f) => ({ ...f, departureTime: e.target.value }))}
            />
          </Field>
          <Field label={`${t('admin.fare')} (৳)`} hint={t('common.optional')}>
            <Input
              type="number"
              value={createForm.fareBdt}
              onChange={(e) => setCreateForm((f) => ({ ...f, fareBdt: e.target.value }))}
            />
          </Field>
        </div>
      </Dialog>

      {/* --------------------------------------------------------- assign */}
      <Dialog
        open={!!assignTrip}
        onClose={() => setAssignTrip(null)}
        title={`${t('admin.assignTitle')} — ${assignTrip?.routeName ?? ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignTrip(null)}>
              {t('common.cancel')}
            </Button>
            <Button loading={assign.isPending} onClick={() => assign.mutate()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-soft">
          {t('admin.assignHint')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.bus')}>
            <Select
              value={assignForm.busId}
              onChange={(e) => setAssignForm((f) => ({ ...f, busId: e.target.value }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {(busOptions.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.driver')}>
            <Select
              value={assignForm.driverId}
              onChange={(e) => setAssignForm((f) => ({ ...f, driverId: e.target.value }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {(driverOptions.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.supervisor')}>
            <Select
              value={assignForm.supervisorId}
              onChange={(e) => setAssignForm((f) => ({ ...f, supervisorId: e.target.value }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {(supervisorOptions.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('admin.helper')}>
            <Select
              value={assignForm.helperId}
              onChange={(e) => setAssignForm((f) => ({ ...f, helperId: e.target.value }))}
            >
              <option value="">{t('common.unassigned')}</option>
              {(helperOptions.data ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
