import { useMemo, useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Bet, BetType, SessionState } from '../types/craps';
import { BET_LABELS, formatMoney } from '../utils/labels';
import { HOUSE_EDGE_PCT } from '../logic/crapsMath';
import { remainingExposureRoom } from '../logic/bankrollRules';

interface Props {
  session: SessionState;
  onAdd: (type: BetType, amount: number) => void;
  onRemove: (id: string) => void;
  error: string | null;
}

/** Bet types selectable in the current phase, honoring odds dependencies. */
function availableBetTypes(session: SessionState): BetType[] {
  if (session.phase === 'come-out') {
    return ['pass-line', 'dont-pass'];
  }
  const hasPassLine = session.bets.some((b) => b.type === 'pass-line');
  const hasCome = session.bets.some((b) => b.type === 'come');
  const all: BetType[] = [
    'pass-line',
    'come',
    'pass-odds',
    'come-odds',
    'place-6',
    'place-8',
    'place-5',
    'place-9',
    'place-4',
    'place-10',
    'field',
    'hardway-6',
    'hardway-8',
    'any-craps',
  ];
  return all.filter((t) => {
    if (t === 'pass-odds') return hasPassLine;
    if (t === 'come-odds') return hasCome;
    return true;
  });
}

function edgeTone(type: BetType): string {
  const e = HOUSE_EDGE_PCT[type];
  if (e >= 4) return 'text-[var(--color-avoid)]';
  if (e > 1.5) return 'text-[var(--color-caution)]';
  return 'text-[var(--color-good)]';
}

function BetRow({ bet, onRemove }: { bet: Bet; onRemove: (id: string) => void }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-[var(--color-felt-700)] px-3 py-2">
      <span className="font-medium text-emerald-50">{BET_LABELS[bet.type]}</span>
      <span className={`text-xs ${edgeTone(bet.type)}`}>
        {HOUSE_EDGE_PCT[bet.type]}%
      </span>
      <span className="ml-auto tabular-nums font-semibold">{formatMoney(bet.amount)}</span>
      <button
        type="button"
        aria-label={`Remove ${BET_LABELS[bet.type]}`}
        onClick={() => onRemove(bet.id)}
        className="text-emerald-300/60 hover:text-[var(--color-avoid)] p-1"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}

/** Manage active bets: list, remove, and add new bets with validation. */
export default function BetManager({ session, onAdd, onRemove, error }: Props) {
  const types = useMemo(() => availableBetTypes(session), [session]);
  const [type, setType] = useState<BetType>(types[0] ?? 'pass-line');
  const [amount, setAmount] = useState<number>(session.config.tableMinimum);

  const room = remainingExposureRoom(session);

  // Keep the selected type valid as phase / bets change.
  const effectiveType = types.includes(type) ? type : (types[0] ?? 'pass-line');

  const handleAdd = () => {
    onAdd(effectiveType, amount);
  };

  return (
    <section
      aria-label="Bets"
      className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-felt-800)] p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-emerald-100">Active Bets</h2>
        <span className="text-[11px] text-emerald-300/60">
          Room: {formatMoney(room)}
        </span>
      </div>

      {session.bets.length === 0 ? (
        <p className="text-sm text-emerald-200/40">No active bets.</p>
      ) : (
        <ul className="space-y-1.5">
          {session.bets.map((b) => (
            <BetRow key={b.id} bet={b} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-stretch">
        <select
          aria-label="Bet type"
          value={effectiveType}
          onChange={(e) => setType(e.target.value as BetType)}
          className="rounded-lg bg-[var(--color-felt-700)] border border-[var(--color-edge)] px-3 h-12 text-emerald-50"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {BET_LABELS[t]} ({HOUSE_EDGE_PCT[t]}%)
            </option>
          ))}
        </select>
        <input
          aria-label="Bet amount"
          type="number"
          inputMode="numeric"
          min={session.config.tableMinimum}
          step={session.config.tableMinimum}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-24 rounded-lg bg-[var(--color-felt-700)] border border-[var(--color-edge)] px-3 h-12 text-emerald-50 tabular-nums"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-[var(--color-good)] text-black font-semibold px-4 h-12 flex items-center gap-1 active:opacity-80"
        >
          <Plus className="size-5" aria-hidden />
          Add
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-avoid)]">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </section>
  );
}
