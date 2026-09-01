/**
 * Dynamic seat layout engine — data model only in Phase 1.
 * A bus stores its layout as JSON matching `SeatLayout`; the booking UI
 * (Phase 2) renders any grid without hardcoding a configuration.
 */

export type SeatCellKind = 'SEAT' | 'AISLE' | 'EMPTY' | 'DOOR' | 'DRIVER';

export interface SeatCell {
  kind: SeatCellKind;
  /** Present only when kind === 'SEAT'. */
  seatNumber?: string;
}

export interface SeatLayout {
  /** Layout template name, e.g. "2+2", "2+1", "custom". */
  template: string;
  rows: number;
  cols: number;
  grid: SeatCell[][];
}

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a standard intercity layout.
 * "2+2" → [seat, seat, aisle, seat, seat]; "2+1" → [seat, seat, aisle, seat].
 */
export function generateSeatLayout(template: '2+2' | '2+1', seatRows: number): SeatLayout {
  const leftSeats = 2;
  const rightSeats = template === '2+2' ? 2 : 1;
  const cols = leftSeats + 1 + rightSeats;
  const grid: SeatCell[][] = [];

  // First row: driver cabin marker on the right, door on the left.
  const cabin: SeatCell[] = Array.from({ length: cols }, (_, c) =>
    c === 0 ? { kind: 'DOOR' } : c === cols - 1 ? { kind: 'DRIVER' } : { kind: 'EMPTY' },
  );
  grid.push(cabin);

  for (let r = 0; r < seatRows; r++) {
    const letter = ROW_LETTERS[r] ?? `R${r + 1}`;
    const row: SeatCell[] = [];
    let seatInRow = 0;
    for (let c = 0; c < cols; c++) {
      if (c === leftSeats) {
        row.push({ kind: 'AISLE' });
      } else {
        seatInRow += 1;
        row.push({ kind: 'SEAT', seatNumber: `${letter}${seatInRow}` });
      }
    }
    grid.push(row);
  }

  return { template, rows: grid.length, cols, grid };
}

export function countSeats(layout: SeatLayout): number {
  return layout.grid.flat().filter((c) => c.kind === 'SEAT').length;
}

export function listSeatNumbers(layout: SeatLayout): string[] {
  return layout.grid
    .flat()
    .filter((c): c is SeatCell & { seatNumber: string } => c.kind === 'SEAT' && !!c.seatNumber)
    .map((c) => c.seatNumber);
}
