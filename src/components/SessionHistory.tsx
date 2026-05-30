import { History } from 'lucide-react';
import type { SessionRecord } from '../types/craps';
import { formatMoney, formatSignedMoney, ODDS_LABELS, RISK_LABELS } from '../utils/labels';

interface Props {
  history: SessionRecord[];
}

/** Past sessions, newest first. Read-only. */
export default function SessionHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <section
      aria-label="Session history"
      className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-felt-800)] p-3"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <History className="size-4 text-emerald-300/60" aria-hidden />
        <h2 className="text-sm font-semibold text-emerald-100">Session History</h2>
      </div>
      <ul className="divide-y divide-[var(--color-edge)]">
        {history.map((r) => {
          const tone =
            r.net > 0
              ? 'text-[var(--color-good)]'
              : r.net < 0
                ? 'text-[var(--color-avoid)]'
                : 'text-emerald-100';
          return (
            <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="text-emerald-200/60 tabular-nums">
                {new Date(r.endedAt).toLocaleDateString()}
              </span>
              <span className="text-[11px] text-emerald-300/40">
                {ODDS_LABELS[r.oddsPolicy]} · {RISK_LABELS[r.riskStyle]}
              </span>
              <span className="ml-auto text-emerald-200/60 tabular-nums">
                {formatMoney(r.startingBankroll)} → {formatMoney(r.endingBankroll)}
              </span>
              <span className={`tabular-nums font-semibold w-16 text-right ${tone}`}>
                {formatSignedMoney(r.net)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
