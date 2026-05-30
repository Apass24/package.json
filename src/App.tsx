import { Minus, Plus, LogOut } from 'lucide-react';
import { useSession } from './hooks/useSession';
import Layout from './components/Layout';
import SessionSetupForm from './components/SessionSetupForm';
import MetricDashboard from './components/MetricDashboard';
import RecommendationCard from './components/RecommendationCard';
import PointSelector from './components/PointSelector';
import BetManager from './components/BetManager';
import SessionHistory from './components/SessionHistory';
import { formatMoney, formatSignedMoney } from './utils/labels';

export default function App() {
  const {
    session,
    history,
    result,
    startSession,
    endSession,
    setPoint,
    addBet,
    removeBet,
    adjustBankroll,
    lastError,
  } = useSession();

  // No active session: show setup + history.
  if (!session || !result) {
    return (
      <Layout>
        <SessionSetupForm onStart={startSession} />
        <SessionHistory history={history} />
      </Layout>
    );
  }

  const { metrics, recommendations } = result;
  const topRec = recommendations[0];
  const netTone =
    metrics.net > 0
      ? 'text-[var(--color-good)]'
      : metrics.net < 0
        ? 'text-[var(--color-avoid)]'
        : 'text-emerald-100';

  // Bankroll quick-adjust uses one table unit as the step.
  const step = session.config.tableMinimum;

  const sticky = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-emerald-300/60">
            Bankroll
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none">
            {formatMoney(metrics.currentBankroll)}
          </div>
        </div>
        <div className={`text-sm font-semibold tabular-nums ${netTone}`}>
          {formatSignedMoney(metrics.net)}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Subtract ${formatMoney(step)}`}
            onClick={() => adjustBankroll(-step)}
            className="size-10 rounded-lg bg-[var(--color-felt-700)] flex items-center justify-center active:bg-[var(--color-felt-600)]"
          >
            <Minus className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Add ${formatMoney(step)}`}
            onClick={() => adjustBankroll(step)}
            className="size-10 rounded-lg bg-[var(--color-felt-700)] flex items-center justify-center active:bg-[var(--color-felt-600)]"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      {topRec && <RecommendationCard recommendation={topRec} compact />}
    </div>
  );

  return (
    <Layout sticky={sticky}>
      <MetricDashboard metrics={metrics} startingBankroll={session.config.startingBankroll} />

      <PointSelector point={session.point} onSelect={setPoint} />

      <BetManager
        session={session}
        onAdd={addBet}
        onRemove={removeBet}
        error={lastError}
      />

      <section aria-label="Recommendations" className="space-y-2">
        <h2 className="text-sm font-semibold text-emerald-100 px-1">Coach Says</h2>
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </section>

      <button
        type="button"
        onClick={endSession}
        className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-felt-800)] text-emerald-200 h-12 flex items-center justify-center gap-2 active:bg-[var(--color-felt-700)]"
      >
        <LogOut className="size-5" aria-hidden />
        End Session &amp; Save to History
      </button>

      <SessionHistory history={history} />
    </Layout>
  );
}
