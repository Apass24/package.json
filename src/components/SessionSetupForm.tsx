import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import type { OddsPolicy, RiskStyle, SessionConfig } from '../types/craps';
import { ODDS_LABELS, RISK_LABELS } from '../utils/labels';

interface Props {
  onStart: (config: SessionConfig) => void;
}

const ODDS_OPTIONS: OddsPolicy[] = ['1x', '2x', '3-4-5x', '5x', '10x'];
const RISK_OPTIONS: RiskStyle[] = ['conservative', 'balanced', 'aggressive'];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-emerald-300/60">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Initial configuration form shown when there is no active session. */
export default function SessionSetupForm({ onStart }: Props) {
  const [startingBankroll, setStartingBankroll] = useState(500);
  const [tableMinimum, setTableMinimum] = useState(10);
  const [stopLoss, setStopLoss] = useState(300);
  const [winTarget, setWinTarget] = useState(750);
  const [oddsPolicy, setOddsPolicy] = useState<OddsPolicy>('3-4-5x');
  const [riskStyle, setRiskStyle] = useState<RiskStyle>('balanced');
  const [err, setErr] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-lg bg-[var(--color-felt-700)] border border-[var(--color-edge)] px-3 h-12 text-emerald-50 tabular-nums';
  const selectClass =
    'w-full rounded-lg bg-[var(--color-felt-700)] border border-[var(--color-edge)] px-3 h-12 text-emerald-50';

  const submit = () => {
    if (startingBankroll <= 0 || tableMinimum <= 0) {
      setErr('Bankroll and table minimum must be positive.');
      return;
    }
    if (stopLoss >= startingBankroll) {
      setErr('Stop-loss must be below your starting bankroll.');
      return;
    }
    if (winTarget <= startingBankroll) {
      setErr('Win target must be above your starting bankroll.');
      return;
    }
    if (tableMinimum > startingBankroll) {
      setErr('Table minimum cannot exceed your bankroll.');
      return;
    }
    setErr(null);
    onStart({
      startingBankroll,
      tableMinimum,
      stopLoss,
      winTarget,
      oddsPolicy,
      riskStyle,
    });
  };

  return (
    <section className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-felt-800)] p-4 space-y-3">
      <h2 className="text-base font-bold text-emerald-50">Start a Session</h2>
      <p className="text-sm text-emerald-200/60">
        Set your limits up front. The coach uses them to keep your exposure and
        walk-away discipline in check.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starting Bankroll ($)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={startingBankroll}
            onChange={(e) => setStartingBankroll(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Table Minimum ($)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={tableMinimum}
            onChange={(e) => setTableMinimum(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Stop-Loss ($)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Win Target ($)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={winTarget}
            onChange={(e) => setWinTarget(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Odds Allowed">
          <select
            value={oddsPolicy}
            onChange={(e) => setOddsPolicy(e.target.value as OddsPolicy)}
            className={selectClass}
          >
            {ODDS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {ODDS_LABELS[o]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Risk Style">
          <select
            value={riskStyle}
            onChange={(e) => setRiskStyle(e.target.value as RiskStyle)}
            className={selectClass}
          >
            {RISK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {RISK_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {err && <p className="text-sm text-[var(--color-avoid)]">{err}</p>}

      <button
        type="button"
        onClick={submit}
        className="w-full rounded-lg bg-[var(--color-good)] text-black font-bold h-12 flex items-center justify-center gap-2 active:opacity-80"
      >
        <PlayCircle className="size-5" aria-hidden />
        Start Coaching
      </button>
    </section>
  );
}
