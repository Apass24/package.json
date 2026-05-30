import { TrendingDown, TrendingUp, Wallet, Gauge, Percent } from 'lucide-react';
import type { SessionMetrics } from '../types/craps';
import { formatMoney, formatSignedMoney } from '../utils/labels';

interface Props {
  metrics: SessionMetrics;
  startingBankroll: number;
}

function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'good' | 'caution' | 'avoid';
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-[var(--color-good)]'
      : tone === 'caution'
        ? 'text-[var(--color-caution)]'
        : tone === 'avoid'
          ? 'text-[var(--color-avoid)]'
          : 'text-emerald-50';
  return (
    <div className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-felt-800)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-emerald-300/60">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-emerald-200/50">{sub}</div>}
    </div>
  );
}

/** Full metric grid shown in the scroll body. */
export default function MetricDashboard({ metrics, startingBankroll }: Props) {
  const netTone = metrics.net > 0 ? 'good' : metrics.net < 0 ? 'avoid' : 'neutral';
  const exposureTone =
    metrics.exposurePct > 10 ? 'avoid' : metrics.exposurePct > 7 ? 'caution' : 'good';

  return (
    <section aria-label="Session metrics" className="grid grid-cols-2 gap-2">
      <Stat
        label="Bankroll"
        value={formatMoney(metrics.currentBankroll)}
        sub={`Start ${formatMoney(startingBankroll)}`}
        icon={<Wallet className="size-3.5" aria-hidden />}
      />
      <Stat
        label="Net"
        value={formatSignedMoney(metrics.net)}
        sub={`${metrics.netPct >= 0 ? '+' : ''}${metrics.netPct.toFixed(1)}%`}
        tone={netTone}
        icon={
          metrics.net >= 0 ? (
            <TrendingUp className="size-3.5" aria-hidden />
          ) : (
            <TrendingDown className="size-3.5" aria-hidden />
          )
        }
      />
      <Stat
        label="Exposure"
        value={formatMoney(metrics.totalExposure)}
        sub={`${metrics.exposurePct.toFixed(1)}% / cap ${formatMoney(metrics.exposureCap)}`}
        tone={exposureTone}
        icon={<Gauge className="size-3.5" aria-hidden />}
      />
      <Stat
        label="Blended Edge"
        value={`${metrics.blendedHouseEdgePct.toFixed(2)}%`}
        sub="house edge on bets"
        tone={metrics.blendedHouseEdgePct > 4 ? 'avoid' : metrics.blendedHouseEdgePct > 1.5 ? 'caution' : 'good'}
        icon={<Percent className="size-3.5" aria-hidden />}
      />
      <Stat
        label="To Stop-Loss"
        value={formatMoney(metrics.distanceToStopLoss)}
        tone={metrics.distanceToStopLoss <= 0 ? 'avoid' : metrics.distanceToStopLoss < startingBankroll * 0.1 ? 'caution' : 'neutral'}
      />
      <Stat
        label="To Win Target"
        value={formatMoney(metrics.distanceToWinTarget)}
        tone={metrics.distanceToWinTarget <= 0 ? 'good' : 'neutral'}
      />
    </section>
  );
}
