// Bankroll exposure and sizing rules. Pure functions, deterministic.

import type { Bet, SessionState } from '../types/craps';

/** Maximum fraction of current bankroll that may be at risk at once. */
export const MAX_EXPOSURE_FRACTION = 0.1;

/** When bankroll is within this fraction of the stop-loss, size down to minimum. */
export const STOP_LOSS_PROXIMITY = 0.2;

/** Sum of all active bet amounts currently on the table. */
export function totalExposure(bets: Bet[]): number {
  return bets.reduce((sum, b) => sum + b.amount, 0);
}

/** Dollar cap on combined exposure (10% of current bankroll). */
export function exposureCap(currentBankroll: number): number {
  return currentBankroll * MAX_EXPOSURE_FRACTION;
}

/** True if adding `amount` would push combined exposure over the cap. */
export function wouldExceedExposure(
  state: Pick<SessionState, 'currentBankroll' | 'bets'>,
  amount: number,
): boolean {
  return totalExposure(state.bets) + amount > exposureCap(state.currentBankroll);
}

/** Remaining headroom before hitting the exposure cap (never negative). */
export function remainingExposureRoom(
  state: Pick<SessionState, 'currentBankroll' | 'bets'>,
): number {
  return Math.max(0, exposureCap(state.currentBankroll) - totalExposure(state.bets));
}

/** Bankroll has reached or breached the walk-away floor. */
export function isAtStopLoss(currentBankroll: number, stopLoss: number): boolean {
  return currentBankroll <= stopLoss;
}

/** Bankroll has reached or exceeded the walk-away ceiling. */
export function isAtWinTarget(currentBankroll: number, winTarget: number): boolean {
  return currentBankroll >= winTarget;
}

/**
 * Bankroll is close to (within STOP_LOSS_PROXIMITY of) the stop-loss but
 * has not yet hit it. In this band the coach forces minimum sizing.
 */
export function isNearStopLoss(currentBankroll: number, stopLoss: number): boolean {
  if (isAtStopLoss(currentBankroll, stopLoss)) return false;
  const buffer = Math.abs(stopLoss) * STOP_LOSS_PROXIMITY || stopLoss * STOP_LOSS_PROXIMITY;
  const proximityThreshold = stopLoss + Math.max(buffer, stopLoss * STOP_LOSS_PROXIMITY);
  return currentBankroll <= proximityThreshold;
}

/**
 * Suggested base unit for a new line bet, honoring the table minimum, the
 * exposure cap, and stop-loss proximity (which forces the minimum).
 */
export function suggestedUnit(
  state: Pick<SessionState, 'currentBankroll' | 'bets' | 'config'>,
): number {
  const { tableMinimum, stopLoss, riskStyle } = state.config;

  if (
    isNearStopLoss(state.currentBankroll, stopLoss) ||
    isAtStopLoss(state.currentBankroll, stopLoss)
  ) {
    return tableMinimum;
  }

  const room = remainingExposureRoom(state);
  if (room < tableMinimum) return 0; // no room for even a minimum bet

  // Base unit scales gently with risk style but is always clamped by room.
  const riskMultiplier =
    riskStyle === 'aggressive' ? 2 : riskStyle === 'balanced' ? 1.5 : 1;
  const desired = tableMinimum * riskMultiplier;
  return Math.max(tableMinimum, Math.min(desired, room));
}
