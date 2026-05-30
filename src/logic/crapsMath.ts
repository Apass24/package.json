// Pure probability constants and math helpers for craps.
// No UI, no state — just deterministic functions and reference data.

import type { BetType, OddsPolicy, PointNumber, RiskStyle } from '../types/craps';

/**
 * Ways to roll each total with two dice (out of 36 combinations).
 * Used to derive point probabilities.
 */
export const WAYS_TO_ROLL: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

/** True odds payout ratio for taking odds behind a point (win:risk). */
export const TRUE_ODDS_RATIO: Record<PointNumber, [number, number]> = {
  4: [2, 1],
  5: [3, 2],
  6: [6, 5],
  8: [6, 5],
  9: [3, 2],
  10: [2, 1],
};

/**
 * House edge (%) per unit wagered for each bet type.
 * Pass/Come odds are 0% (true odds). Values are standard published figures.
 */
export const HOUSE_EDGE_PCT: Record<BetType, number> = {
  'pass-line': 1.41,
  'dont-pass': 1.36,
  come: 1.41,
  'dont-come': 1.36,
  'pass-odds': 0,
  'come-odds': 0,
  'place-6': 1.52,
  'place-8': 1.52,
  'place-5': 4.0,
  'place-9': 4.0,
  'place-4': 6.67,
  'place-10': 6.67,
  field: 2.78, // 2x on 2/12 variant; the common 5.56% is 2 & 12 paying double only
  'hardway-6': 9.09,
  'hardway-8': 9.09,
  'hardway-4': 11.11,
  'hardway-10': 11.11,
  'any-seven': 16.67,
  'any-craps': 11.11,
};

/** Probability a point repeats before a 7 (point made), given the point. */
export function pointWinProbability(point: PointNumber): number {
  const pointWays = WAYS_TO_ROLL[point];
  const sevenWays = WAYS_TO_ROLL[7];
  return pointWays / (pointWays + sevenWays);
}

/** Probability of a come-out 7 or 11 (immediate pass-line win). */
export function comeOutWinProbability(): number {
  return (WAYS_TO_ROLL[7] + WAYS_TO_ROLL[11]) / 36;
}

/** Probability of a come-out 2, 3, or 12 (immediate pass-line loss). */
export function comeOutLossProbability(): number {
  return (WAYS_TO_ROLL[2] + WAYS_TO_ROLL[3] + WAYS_TO_ROLL[12]) / 36;
}

/**
 * The maximum odds multiplier allowed for a given point under a policy.
 * 3-4-5x is the standard: 3x on 4/10, 4x on 5/9, 5x on 6/8.
 */
export function maxOddsMultiplier(policy: OddsPolicy, point: PointNumber): number {
  switch (policy) {
    case '1x':
      return 1;
    case '2x':
      return 2;
    case '5x':
      return 5;
    case '10x':
      return 10;
    case '3-4-5x':
      if (point === 4 || point === 10) return 3;
      if (point === 5 || point === 9) return 4;
      return 5; // 6 or 8
  }
}

/**
 * Risk style determines what fraction of the allowed maximum odds we suggest.
 * Conservative players take less than the max; aggressive take the full max.
 */
export function oddsAppetite(risk: RiskStyle): number {
  switch (risk) {
    case 'conservative':
      return 0.5;
    case 'balanced':
      return 0.75;
    case 'aggressive':
      return 1.0;
  }
}

/** Round a dollar amount to a table-legal multiple. */
export function roundToUnit(amount: number, unit: number): number {
  if (unit <= 0) return Math.max(0, Math.round(amount));
  return Math.max(0, Math.round(amount / unit) * unit);
}

/**
 * Place bets must be in multiples that pay cleanly. 6 & 8 must be multiples of 6,
 * 5 & 9 of 5, and 4 & 10 of the table minimum.
 */
export function placeBetIncrement(point: PointNumber, tableMinimum: number): number {
  if (point === 6 || point === 8) return 6;
  if (point === 5 || point === 9) return 5;
  return tableMinimum;
}

/** Expected loss in dollars on a bet, given its house edge. */
export function expectedLoss(amount: number, betType: BetType): number {
  return amount * (HOUSE_EDGE_PCT[betType] / 100);
}
