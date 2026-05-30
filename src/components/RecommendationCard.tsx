import { CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';
import type { Recommendation } from '../types/craps';
import { SEVERITY_STYLES } from '../utils/labels';

interface Props {
  recommendation: Recommendation;
  compact?: boolean;
}

const ICONS = {
  good: CheckCircle2,
  caution: AlertTriangle,
  avoid: XOctagon,
} as const;

/** A single recommendation, color-coded by severity. */
export default function RecommendationCard({ recommendation, compact }: Props) {
  const s = SEVERITY_STYLES[recommendation.severity];
  const Icon = ICONS[recommendation.severity];
  return (
    <div
      className={`rounded-xl border ${s.border} ${s.bg} p-3 flex gap-2.5`}
      role="status"
    >
      <Icon className={`size-5 shrink-0 ${s.text}`} aria-hidden />
      <div className="min-w-0">
        <div className={`font-semibold ${s.text}`}>{recommendation.title}</div>
        {!compact && (
          <p className="text-sm text-emerald-100/80 mt-0.5">{recommendation.detail}</p>
        )}
        {recommendation.suggestedAmount != null && (
          <div className="mt-1 text-xs text-emerald-200/60">
            Suggested: ${recommendation.suggestedAmount}
          </div>
        )}
      </div>
    </div>
  );
}
