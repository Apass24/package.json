// Deterministic recommendation controller.
// Takes a SessionState, returns metrics + ordered recommendations.
// Pure: same input always yields the same output. No randomness, no I/O.

import type {
  Bet,
  EngineResult,
  PointNumber,
  Recommendation,
  SessionMetrics,
  SessionState,
} from '../types/craps';
import {
  HOUSE_EDGE_PCT,
  maxOddsMultiplier,
  oddsAppetite,
  roundToUnit,
} from './crapsMath';
import {
  exposureCap,
  isAtStopLoss,
  isAtWinTarget,
  isNearStopLoss,
  remainingExposureRoom,
  suggestedUnit,
  totalExposure,
} from './bankrollRules';

let recId = 0;
function makeId(prefix: string): string {
  recId += 1;
  return `${prefix}-${recId}`;
}

/** Blended house edge weighted by bet amount; 0 when nothing is at risk. */
function blendedHouseEdge(bets: Bet[]): number {
  const total = totalExposure(bets);
  if (total === 0) return 0;
  const weighted = bets.reduce(
    (sum, b) => sum + b.amount * HOUSE_EDGE_PCT[b.type],
    0,
  );
  return weighted / total;
}

function computeMetrics(state: SessionState): SessionMetrics {
  const { currentBankroll, bets, config } = state;
  const exposure = totalExposure(bets);
  const net = currentBankroll - config.startingBankroll;
  return {
    currentBankroll,
    net,
    netPct: config.startingBankroll > 0 ? (net / config.startingBankroll) * 100 : 0,
    totalExposure: exposure,
    exposureCap: exposureCap(currentBankroll),
    exposurePct: currentBankroll > 0 ? (exposure / currentBankroll) * 100 : 0,
    distanceToStopLoss: currentBankroll - config.stopLoss,
    distanceToWinTarget: config.winTarget - currentBankroll,
    blendedHouseEdgePct: blendedHouseEdge(bets),
  };
}

function hasBet(bets: Bet[], predicate: (b: Bet) => boolean): boolean {
  return bets.some(predicate);
}

/** Build recommendations. Order: walk-away > exposure > odds > line > placement. */
function buildRecommendations(state: SessionState): {
  recommendations: Recommendation[];
  shouldWalkAway: boolean;
} {
  recId = 0;
  const recs: Recommendation[] = [];
  const { currentBankroll, config, bets, phase, point } = state;
  let shouldWalkAway = false;

  // --- 1. Walk-away guidance (highest priority) ---
  if (isAtStopLoss(currentBankroll, config.stopLoss)) {
    shouldWalkAway = true;
    recs.push({
      id: makeId('walk'),
      severity: 'avoid',
      title: 'Color out and leave',
      detail: `Bankroll ($${currentBankroll}) has reached your stop-loss ($${config.stopLoss}). The session is over — walk away.`,
    });
    return { recommendations: recs, shouldWalkAway };
  }

  if (isAtWinTarget(currentBankroll, config.winTarget)) {
    shouldWalkAway = true;
    recs.push({
      id: makeId('win'),
      severity: 'good',
      title: 'Lock in your win',
      detail: `Bankroll ($${currentBankroll}) has hit your win target ($${config.winTarget}). Pocket the gains or sharply reduce exposure.`,
    });
    // Not a hard stop, but strongly advised — continue with cautionary sizing notes.
  }

  // --- 2. Stop-loss proximity sizing ---
  if (isNearStopLoss(currentBankroll, config.stopLoss)) {
    recs.push({
      id: makeId('near'),
      severity: 'caution',
      title: 'Size down to the table minimum',
      detail: `You are within ${Math.round(
        100 * 0.2,
      )}% of your stop-loss. Bet only the table minimum ($${config.tableMinimum}) until the trend reverses.`,
    });
  }

  // --- 3. Exposure cap ---
  const exposure = totalExposure(bets);
  const cap = exposureCap(currentBankroll);
  if (exposure > cap) {
    recs.push({
      id: makeId('exp'),
      severity: 'avoid',
      title: 'Reduce table exposure',
      detail: `Total at risk ($${exposure.toFixed(0)}) exceeds the 10% cap ($${cap.toFixed(
        0,
      )}). Take down or reduce bets before pressing further.`,
    });
  }

  // --- 4. Per-bet house-edge warnings ---
  for (const bet of bets) {
    const edge = HOUSE_EDGE_PCT[bet.type];
    if (edge >= 9) {
      recs.push({
        id: makeId('edge'),
        severity: 'avoid',
        title: `High house edge: ${formatBet(bet)}`,
        detail: `${formatBet(bet)} carries a ${edge}% house edge. The coach advises against it — favor line bets backed by odds.`,
      });
    } else if (edge >= 4) {
      recs.push({
        id: makeId('edge'),
        severity: 'caution',
        title: `Pricey bet: ${formatBet(bet)}`,
        detail: `${formatBet(bet)} has a ${edge}% house edge. Acceptable occasionally, but odds and place 6/8 are cheaper.`,
      });
    }
  }

  // --- 5. Phase-specific line guidance ---
  const room = remainingExposureRoom(state);
  const unit = suggestedUnit(state);

  if (phase === 'come-out') {
    const hasLine = hasBet(bets, (b) => b.type === 'pass-line' || b.type === 'dont-pass');
    if (!hasLine && room >= config.tableMinimum) {
      recs.push({
        id: makeId('line'),
        severity: 'good',
        title: 'Make a Pass Line bet',
        detail: `On the come-out, the Pass Line (1.41% edge) is your foundation. Suggested: $${unit}.`,
        suggestedAmount: unit,
      });
    }
    // Reinforce the come-out restriction.
    recs.push({
      id: makeId('rule'),
      severity: 'caution',
      title: 'Come-out: line bets only',
      detail:
        'No point is set. Stick to Pass / Don\'t Pass — place bets and odds belong after the point is established.',
    });
  } else if (phase === 'point' && point) {
    addOddsRecommendations(state, point, recs);
    addPlaceRecommendation(state, point, room, recs);
  }

  // --- 6. Healthy-state fallback ---
  if (recs.length === 0) {
    recs.push({
      id: makeId('ok'),
      severity: 'good',
      title: 'Position looks disciplined',
      detail: `Exposure is ${(exposure ? (exposure / currentBankroll) * 100 : 0).toFixed(
        1,
      )}% of bankroll, within limits. Hold your line and take fair odds where available.`,
    });
  }

  return { recommendations: recs, shouldWalkAway };
}

/** Recommend taking odds behind an existing Pass/Come bet (enforces dependency). */
function addOddsRecommendations(
  state: SessionState,
  point: PointNumber,
  recs: Recommendation[],
): void {
  const { bets, config } = state;
  const hasPassLine = hasBet(bets, (b) => b.type === 'pass-line');
  const hasPassOdds = hasBet(bets, (b) => b.type === 'pass-odds');
  const hasCome = hasBet(bets, (b) => b.type === 'come');
  const hasComeOdds = hasBet(bets, (b) => b.type === 'come-odds');

  const room = remainingExposureRoom(state);
  if (room < config.tableMinimum) return;

  const passLineBet = bets.find((b) => b.type === 'pass-line');
  if (hasPassLine && !hasPassOdds && passLineBet) {
    const mult = maxOddsMultiplier(config.oddsPolicy, point);
    const appetite = oddsAppetite(config.riskStyle);
    const target = roundToUnit(
      Math.min(passLineBet.amount * mult * appetite, room),
      config.tableMinimum,
    );
    if (target >= config.tableMinimum) {
      recs.push({
        id: makeId('odds'),
        severity: 'good',
        title: `Take odds on the ${point}`,
        detail: `Pass Line odds pay true odds (0% house edge). With ${config.oddsPolicy} allowed and your ${config.riskStyle} style, back it with about $${target}.`,
        suggestedAmount: target,
      });
    }
  }

  if (hasCome && !hasComeOdds) {
    recs.push({
      id: makeId('codds'),
      severity: 'good',
      title: 'Back your Come bet with odds',
      detail:
        'Your Come bet has a number working. Come odds are free of house edge — take them if exposure room allows.',
    });
  }
}

/** Recommend the cheapest place bet (6/8) when appropriate. */
function addPlaceRecommendation(
  state: SessionState,
  point: PointNumber,
  room: number,
  recs: Recommendation[],
): void {
  const { bets, config, currentBankroll } = state;
  if (isNearStopLoss(currentBankroll, config.stopLoss)) return; // already told to size down
  if (room < 6) return;

  const has6 = hasBet(bets, (b) => b.type === 'place-6');
  const has8 = hasBet(bets, (b) => b.type === 'place-8');
  if (has6 && has8) return;

  const targetNum = !has6 ? 6 : 8;
  // Don't double-suggest the current point if it's already covered by the line.
  if (targetNum === point && hasBet(bets, (b) => b.type === 'pass-line')) return;

  const amount = Math.min(roundToUnit(room, 6) || 6, Math.floor(room / 6) * 6);
  if (amount < 6) return;

  recs.push({
    id: makeId('place'),
    severity: 'good',
    title: `Consider Place the ${targetNum}`,
    detail: `Place 6 and 8 carry only a 1.52% edge — the best place bets. Up to $${amount} fits within your exposure cap.`,
    suggestedAmount: amount,
  });
}

function formatBet(bet: Bet): string {
  const label = bet.type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return bet.number ? `${label}` : label;
}

/** Main entry point: compute metrics and recommendations for a session. */
export function evaluateSession(state: SessionState): EngineResult {
  const metrics = computeMetrics(state);
  const { recommendations, shouldWalkAway } = buildRecommendations(state);
  return { metrics, recommendations, shouldWalkAway };
}

// ---------------------------------------------------------------------------
// Bet legality — enforced both here (logic) and in the UI.
// ---------------------------------------------------------------------------

export interface BetValidation {
  ok: boolean;
  reason?: string;
}

/**
 * Validate whether a bet may be added to the current state.
 * Enforces: come-out restrictions, odds dependencies, and exposure cap.
 */
export function validateNewBet(
  state: SessionState,
  type: Bet['type'],
  amount: number,
): BetValidation {
  if (amount <= 0) {
    return { ok: false, reason: 'Bet amount must be greater than zero.' };
  }
  if (amount < state.config.tableMinimum) {
    return {
      ok: false,
      reason: `Below the table minimum of $${state.config.tableMinimum}.`,
    };
  }

  // Come-out restriction: only line bets allowed.
  if (state.phase === 'come-out') {
    const allowed = type === 'pass-line' || type === 'dont-pass';
    if (!allowed) {
      return {
        ok: false,
        reason: 'On the come-out only Pass / Don\'t Pass bets are allowed.',
      };
    }
  }

  // Pass Odds requires an active Pass Line bet.
  if (type === 'pass-odds' && !hasBet(state.bets, (b) => b.type === 'pass-line')) {
    return { ok: false, reason: 'Pass Odds requires an active Pass Line bet.' };
  }

  // Come Odds requires an active Come bet.
  if (type === 'come-odds' && !hasBet(state.bets, (b) => b.type === 'come')) {
    return { ok: false, reason: 'Come Odds requires an active Come bet.' };
  }

  // Exposure cap (10% of current bankroll).
  if (totalExposure(state.bets) + amount > exposureCap(state.currentBankroll)) {
    return {
      ok: false,
      reason: `Exceeds the 10% exposure cap ($${exposureCap(
        state.currentBankroll,
      ).toFixed(0)}).`,
    };
  }

  return { ok: true };
}
