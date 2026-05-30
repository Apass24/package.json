// Core domain types for Craps Table Coach.
// This file contains ONLY types, enums, and interfaces — no logic.

/** The six possible point numbers in craps. */
export type PointNumber = 4 | 5 | 6 | 8 | 9 | 10;

/** Table phase. Come-out is before a point is established. */
export type TablePhase = 'come-out' | 'point';

/** Risk appetite drives sizing aggressiveness and odds multipliers. */
export type RiskStyle = 'conservative' | 'balanced' | 'aggressive';

/**
 * Maximum odds the table allows. "3-4-5x" is the most common modern rule
 * (3x on 4/10, 4x on 5/9, 5x on 6/8). The numeric variants are flat multiples.
 */
export type OddsPolicy = '1x' | '2x' | '3-4-5x' | '5x' | '10x';

/** Every bet type the coach reasons about. */
export type BetType =
  | 'pass-line'
  | 'dont-pass'
  | 'come'
  | 'dont-come'
  | 'pass-odds'
  | 'come-odds'
  | 'place-6'
  | 'place-8'
  | 'place-5'
  | 'place-9'
  | 'place-4'
  | 'place-10'
  | 'field'
  | 'hardway-6'
  | 'hardway-8'
  | 'hardway-4'
  | 'hardway-10'
  | 'any-seven'
  | 'any-craps';

/** Bets that may only be placed during the come-out roll. */
export const COME_OUT_ONLY_BETS: readonly BetType[] = ['pass-line', 'dont-pass'];

/** A single active wager on the table. */
export interface Bet {
  id: string;
  type: BetType;
  amount: number;
  /** For come/place/odds bets tied to a specific number. */
  number?: PointNumber;
}

/** Recommendation severity, used for color coding. */
export type Severity = 'good' | 'caution' | 'avoid';

/** A single discrete recommendation produced by the engine. */
export interface Recommendation {
  id: string;
  severity: Severity;
  /** Short headline, e.g. "Take full odds on the 6". */
  title: string;
  /** One-line rationale grounded in math / rules. */
  detail: string;
  /** Optional suggested dollar amount tied to the recommendation. */
  suggestedAmount?: number;
}

/** Everything the user configures for a session. */
export interface SessionConfig {
  /** Bankroll the player is willing to risk this session. */
  startingBankroll: number;
  /** Table minimum bet. */
  tableMinimum: number;
  /** Walk-away floor. Session should end at or below this. */
  stopLoss: number;
  /** Walk-away ceiling. Lock in gains at or above this. */
  winTarget: number;
  oddsPolicy: OddsPolicy;
  riskStyle: RiskStyle;
}

/** Live, mutable state of the current session. */
export interface SessionState {
  config: SessionConfig;
  /** Current bankroll (changes as the user records wins/losses). */
  currentBankroll: number;
  phase: TablePhase;
  /** The established point, or null during come-out. */
  point: PointNumber | null;
  /** All active bets on the table. */
  bets: Bet[];
}

/** A completed session, stored in history. */
export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  startingBankroll: number;
  endingBankroll: number;
  net: number;
  oddsPolicy: OddsPolicy;
  riskStyle: RiskStyle;
}

/** Aggregate metrics shown on the dashboard. */
export interface SessionMetrics {
  currentBankroll: number;
  net: number;
  netPct: number;
  totalExposure: number;
  exposurePct: number;
  exposureCap: number;
  distanceToStopLoss: number;
  distanceToWinTarget: number;
  /** Blended house edge across all active bets (weighted by amount). */
  blendedHouseEdgePct: number;
}

/** The full engine output for a given state. */
export interface EngineResult {
  metrics: SessionMetrics;
  recommendations: Recommendation[];
  /** True when the engine recommends ending the session. */
  shouldWalkAway: boolean;
}

/** The shape we persist to localStorage. */
export interface PersistedData {
  version: number;
  session: SessionState | null;
  history: SessionRecord[];
}
