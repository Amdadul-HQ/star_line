'use client';

import type { SeatDisplayState, SeatLayout } from '@starline/shared';
import { DoorOpen } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SeatMapProps {
  layout: SeatLayout;
  seatStates: Record<string, SeatDisplayState>;
  selected: string[];
  onToggle: (seatNumber: string) => void;
}

/**
 * Renders any SeatLayout grid (2+2, 2+1, custom) — nothing about the
 * arrangement is hardcoded; the bus's stored layout drives everything.
 */
export function SeatMap({ layout, seatStates, selected, onToggle }: SeatMapProps) {
  const t = useT();

  const seatClass = (state: SeatDisplayState | undefined, isSelected: boolean) =>
    cn(
      'flex h-9 w-9 items-center justify-center rounded-lg border text-[11px] font-bold transition-all sm:h-10 sm:w-10',
      isSelected
        ? 'scale-105 border-brand-600 bg-brand-600 text-white shadow-md'
        : state === 'BOOKED'
          ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
          : state === 'HELD' || state === 'MINE'
            ? 'cursor-not-allowed border-amber-200 bg-amber-100 text-amber-700'
            : 'border-slate-300 bg-white text-ink-soft hover:border-brand-400 hover:text-brand-600 hover:shadow-sm',
    );

  return (
    <div>
      <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="mb-3 rounded-lg bg-slate-100 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-ink-faint">
          {t('booking.front')}
        </p>
        <div className="space-y-1.5">
          {layout.grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1.5">
              {row.map((cell, cellIdx) => {
                if (cell.kind === 'SEAT' && cell.seatNumber) {
                  const state = seatStates[cell.seatNumber];
                  const isSelected = selected.includes(cell.seatNumber);
                  const disabled = !isSelected && state !== undefined && state !== 'AVAILABLE';
                  return (
                    <button
                      key={cellIdx}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(cell.seatNumber!)}
                      className={seatClass(state, isSelected)}
                      aria-pressed={isSelected}
                      aria-label={`${t('booking.seatLabel')} ${cell.seatNumber}`}
                    >
                      {cell.seatNumber}
                    </button>
                  );
                }
                if (cell.kind === 'DRIVER') {
                  return (
                    <span
                      key={cellIdx}
                      className="flex h-9 w-9 items-center justify-center text-lg sm:h-10 sm:w-10"
                      title={t('admin.driver')}
                    >
                      🛞
                    </span>
                  );
                }
                if (cell.kind === 'DOOR') {
                  return (
                    <span
                      key={cellIdx}
                      className="flex h-9 w-9 items-center justify-center text-ink-faint sm:h-10 sm:w-10"
                    >
                      <DoorOpen className="h-4 w-4" />
                    </span>
                  );
                }
                // AISLE / EMPTY spacer
                return <span key={cellIdx} className="h-9 w-9 sm:h-10 sm:w-10" />;
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border border-slate-300 bg-white" />
          {t('booking.legendAvailable')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-brand-600" />
          {t('booking.legendSelected')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-slate-200" />
          {t('booking.legendBooked')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-amber-100" />
          {t('booking.legendHeld')}
        </span>
      </div>
    </div>
  );
}
