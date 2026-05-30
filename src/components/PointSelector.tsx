import type { PointNumber } from '../types/craps';

interface Props {
  point: PointNumber | null;
  onSelect: (point: PointNumber | null) => void;
}

const POINTS: PointNumber[] = [4, 5, 6, 8, 9, 10];

/** Large touch targets to set the table phase / established point. */
export default function PointSelector({ point, onSelect }: Props) {
  return (
    <section
      aria-label="Table state"
      className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-felt-800)] p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-emerald-100">Table State</h2>
        <span className="text-[11px] text-emerald-300/60">
          {point ? `Point: ${point}` : 'Come-out'}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={point === null}
          className={`col-span-1 h-14 rounded-lg font-bold text-sm transition-colors ${
            point === null
              ? 'bg-[var(--color-chip)] text-felt-950 text-black'
              : 'bg-[var(--color-felt-700)] text-emerald-100 active:bg-[var(--color-felt-600)]'
          }`}
        >
          Come-out
        </button>
        {POINTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            aria-pressed={point === p}
            className={`h-14 rounded-lg text-xl font-bold tabular-nums transition-colors ${
              point === p
                ? 'bg-[var(--color-good)] text-black'
                : 'bg-[var(--color-felt-700)] text-emerald-100 active:bg-[var(--color-felt-600)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}
