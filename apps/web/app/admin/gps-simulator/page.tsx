'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, type SimulatorStatePayload } from '@starline/shared';
import { Pause, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { getSocket } from '@/lib/realtime';

interface BusOption {
  id: string;
  busNumber: string;
  status: string;
}
interface RouteOption {
  id: string;
  name: string;
  code: string;
}

export default function GpsSimulatorPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [speedKph, setSpeedKph] = useState(50);
  const [intervalMs, setIntervalMs] = useState(2500);
  const [sims, setSims] = useState<Map<string, SimulatorStatePayload>>(new Map());

  const buses = useQuery({
    queryKey: ['bus-options'],
    queryFn: () => api<BusOption[]>('/buses/options'),
  });
  const routes = useQuery({
    queryKey: ['route-options'],
    queryFn: () => api<RouteOption[]>('/routes/options'),
  });
  const running = useQuery({
    queryKey: ['simulations'],
    queryFn: () => api<SimulatorStatePayload[]>('/gps/simulator'),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!running.data) return;
    setSims((prev) => {
      const next = new Map<string, SimulatorStatePayload>();
      for (const sim of running.data) next.set(sim.simulationId, sim);
      // keep freshly-ended entries out; socket updates re-add active ones
      for (const [id, sim] of prev) if (next.has(id)) next.set(id, sim);
      return next;
    });
  }, [running.data]);

  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit(SOCKET_EVENTS.JOIN_ADMIN_MAP, {}, () => undefined);
    const onState = (payload: SimulatorStatePayload) => {
      setSims((prev) => {
        const next = new Map(prev);
        if (payload.status === 'ENDED') next.delete(payload.simulationId);
        else next.set(payload.simulationId, payload);
        return next;
      });
    };
    socket.on('connect', join);
    socket.on(SOCKET_EVENTS.SIMULATOR_STATE, onState);
    if (socket.connected) join();
    return () => {
      socket.off('connect', join);
      socket.off(SOCKET_EVENTS.SIMULATOR_STATE, onState);
    };
  }, []);

  const fail = (err: unknown) =>
    toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error');

  const start = useMutation({
    mutationFn: () =>
      api<SimulatorStatePayload>('/gps/simulator/start', {
        method: 'POST',
        body: { busId, routeId, speedKph, intervalMs },
      }),
    onSuccess: (sim) => {
      setSims((prev) => new Map(prev).set(sim.simulationId, sim));
      void queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
    onError: fail,
  });

  const control = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' | 'stop' }) =>
      api(`/gps/simulator/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['simulations'] }),
    onError: fail,
  });

  const simList = [...sims.values()];

  return (
    <div>
      <PageHeader title={t('admin.simulatorTitle')} subtitle={t('admin.simulatorSubtitle')} />

      <Card>
        <CardContent className="pt-5">
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              start.mutate();
            }}
          >
            <Field label={t('admin.selectBus')} required>
              <Select value={busId} onChange={(e) => setBusId(e.target.value)}>
                <option value="" disabled>
                  —
                </option>
                {(buses.data ?? []).map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.busNumber} ({bus.status})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('admin.selectRoute')} required>
              <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                <option value="" disabled>
                  —
                </option>
                {(routes.data ?? []).map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`${t('admin.speed')} (${t('common.kmh')})`}>
              <Select value={speedKph} onChange={(e) => setSpeedKph(Number(e.target.value))}>
                {[30, 40, 50, 60, 80, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('admin.interval')}>
              <Select value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))}>
                {[1500, 2500, 5000, 10000].map((ms) => (
                  <option key={ms} value={ms}>
                    {ms / 1000}s
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                loading={start.isPending}
                disabled={!busId || !routeId}
              >
                <Play className="h-4 w-4" />
                {t('admin.startSim')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>{t('admin.runningSims')}</CardTitle>
          <Link href="/admin/live-map" className="text-sm font-semibold text-brand-600">
            {t('admin.openLiveMap')} →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {simList.length === 0 ? (
            <EmptyState title={t('admin.noSimsTitle')} description={t('admin.noSimsDesc')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {simList.map((sim) => (
                <li key={sim.simulationId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-[10rem]">
                    <p className="text-sm font-bold text-ink">🚌 {sim.busNumber}</p>
                    <p className="text-xs text-ink-soft">{sim.routeName}</p>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-ink-faint">
                      <span>
                        {t('admin.progress')}: {sim.progressPct}%
                      </span>
                      <span>
                        {sim.speedKph} {t('common.kmh')}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all duration-700"
                        style={{ width: `${sim.progressPct}%` }}
                      />
                    </div>
                  </div>
                  <Badge tone={sim.status === 'ACTIVE' ? 'green' : 'amber'}>{sim.status}</Badge>
                  <div className="flex gap-1.5">
                    {sim.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => control.mutate({ id: sim.simulationId, action: 'pause' })}
                      >
                        <Pause className="h-3.5 w-3.5" />
                        {t('admin.pause')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => control.mutate({ id: sim.simulationId, action: 'resume' })}
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t('admin.resume')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => control.mutate({ id: sim.simulationId, action: 'stop' })}
                    >
                      <Square className="h-3.5 w-3.5" />
                      {t('admin.stopSim')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
