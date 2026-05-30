import { describe, expect, it } from 'vitest';
import type { SessionState } from '../types/craps';
import { evaluateSession, validateNewBet } from './recommendationEngine';
import {
  exposureCap,
  isNearStopLoss,
  suggestedUnit,
  totalExposure,
} from './bankrollRules';
import { maxOddsMultiplier, pointWinProbability } from './crapsMath';

function baseState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    config: {
      startingBankroll: 1000,
      tableMinimum: 10,
      stopLoss: 700,
      winTarget: 1400,
      oddsPolicy: '3-4-5x',
      riskStyle: 'balanced',
    },
    currentBankroll: 1000,
    phase: 'come-out',
    point: null,
    bets: [],
    ...overrides,
  };
}

describe('crapsMath', () => {
  it('computes point win probabilities from ways to roll', () => {
    expect(pointWinProbability(6)).toBeCloseTo(5 / 11, 5);
    expect(pointWinProbability(4)).toBeCloseTo(3 / 9, 5);
  });

  it('applies the 3-4-5x odds policy correctly', () => {
    expect(maxOddsMultiplier('3-4-5x', 4)).toBe(3);
    expect(maxOddsMultiplier('3-4-5x', 5)).toBe(4);
    expect(maxOddsMultiplier('3-4-5x', 6)).toBe(5);
    expect(maxOddsMultiplier('2x', 10)).toBe(2);
  });
});

describe('bankrollRules', () => {
  it('caps exposure at 10% of current bankroll', () => {
    expect(exposureCap(1000)).toBe(100);
  });

  it('detects stop-loss proximity band', () => {
    // stopLoss 700, proximity 20% -> threshold ~840
    expect(isNearStopLoss(820, 700)).toBe(true);
    expect(isNearStopLoss(900, 700)).toBe(false);
    expect(isNearStopLoss(690, 700)).toBe(false); // already at/below stop-loss
  });

  it('forces table minimum sizing near stop-loss', () => {
    const state = baseState({ currentBankroll: 820 });
    expect(suggestedUnit(state)).toBe(state.config.tableMinimum);
  });
});

describe('validateNewBet', () => {
  it('blocks non-line bets on the come-out', () => {
    const state = baseState();
    expect(validateNewBet(state, 'place-6', 12).ok).toBe(false);
    expect(validateNewBet(state, 'pass-line', 10).ok).toBe(true);
  });

  it('requires a pass line bet before pass odds', () => {
    const state = baseState({ phase: 'point', point: 6 });
    expect(validateNewBet(state, 'pass-odds', 10).ok).toBe(false);
    state.bets.push({ id: 'a', type: 'pass-line', amount: 10 });
    expect(validateNewBet(state, 'pass-odds', 10).ok).toBe(true);
  });

  it('requires a come bet before come odds', () => {
    const state = baseState({ phase: 'point', point: 8 });
    expect(validateNewBet(state, 'come-odds', 10).ok).toBe(false);
    state.bets.push({ id: 'c', type: 'come', amount: 10 });
    expect(validateNewBet(state, 'come-odds', 10).ok).toBe(true);
  });

  it('enforces the 10% exposure cap', () => {
    const state = baseState({ phase: 'point', point: 6 });
    // cap is 100; a 120 bet must fail
    expect(validateNewBet(state, 'pass-odds', 120).ok).toBe(false);
  });

  it('rejects sub-minimum bets', () => {
    const state = baseState();
    expect(validateNewBet(state, 'pass-line', 5).ok).toBe(false);
  });
});

describe('evaluateSession', () => {
  it('recommends walking away at stop-loss', () => {
    const state = baseState({ currentBankroll: 700 });
    const result = evaluateSession(state);
    expect(result.shouldWalkAway).toBe(true);
    expect(result.recommendations[0].severity).toBe('avoid');
  });

  it('recommends locking in at win target', () => {
    const state = baseState({ currentBankroll: 1400 });
    const result = evaluateSession(state);
    expect(result.shouldWalkAway).toBe(true);
    expect(result.recommendations.some((r) => r.title.includes('Lock in'))).toBe(true);
  });

  it('suggests a pass line bet on an empty come-out', () => {
    const state = baseState();
    const result = evaluateSession(state);
    expect(result.recommendations.some((r) => r.title.includes('Pass Line'))).toBe(true);
  });

  it('suggests taking odds with a pass line bet on a point', () => {
    const state = baseState({
      phase: 'point',
      point: 6,
      bets: [{ id: 'p', type: 'pass-line', amount: 10 }],
    });
    const result = evaluateSession(state);
    expect(result.recommendations.some((r) => r.title.includes('Take odds'))).toBe(true);
  });

  it('warns on high-edge bets', () => {
    const state = baseState({
      phase: 'point',
      point: 6,
      bets: [{ id: 'h', type: 'any-seven', amount: 10 }],
    });
    const result = evaluateSession(state);
    expect(result.recommendations.some((r) => r.severity === 'avoid')).toBe(true);
  });

  it('computes blended house edge weighted by amount', () => {
    const state = baseState({
      phase: 'point',
      point: 6,
      bets: [
        { id: 'a', type: 'pass-line', amount: 10 },
        { id: 'b', type: 'pass-odds', amount: 10 },
      ],
    });
    const result = evaluateSession(state);
    // (10*1.41 + 10*0) / 20 = 0.705
    expect(result.metrics.blendedHouseEdgePct).toBeCloseTo(0.705, 3);
    expect(totalExposure(state.bets)).toBe(20);
  });

  it('flags over-cap exposure as avoid', () => {
    // cap = 10% of 1000 = 100; place a 150 bet directly into state
    const state = baseState({
      phase: 'point',
      point: 8,
      bets: [{ id: 'x', type: 'pass-line', amount: 150 }],
    });
    const result = evaluateSession(state);
    expect(
      result.recommendations.some(
        (r) => r.severity === 'avoid' && /exposure/i.test(r.title),
      ),
    ).toBe(true);
  });

  it('forces minimum sizing in the stop-loss proximity band', () => {
    // stopLoss 700, threshold 840; 800 is in-band
    const state = baseState({ currentBankroll: 800 });
    const result = evaluateSession(state);
    expect(
      result.recommendations.some((r) => /size down/i.test(r.title)),
    ).toBe(true);
  });

  it('does not double-stop: at stop-loss it returns a single walk-away rec', () => {
    const state = baseState({ currentBankroll: 650 });
    const result = evaluateSession(state);
    expect(result.recommendations).toHaveLength(1);
    expect(result.shouldWalkAway).toBe(true);
  });

  it('gives a healthy-state recommendation when nothing else applies', () => {
    const state = baseState({
      phase: 'point',
      point: 4,
      bets: [
        { id: 'a', type: 'pass-line', amount: 10 },
        { id: 'b', type: 'pass-odds', amount: 30 },
        { id: 'c', type: 'place-6', amount: 12 },
        { id: 'd', type: 'place-8', amount: 12 },
      ],
    });
    const result = evaluateSession(state);
    // No avoid/caution items expected for this disciplined, in-cap position.
    expect(result.recommendations.every((r) => r.severity !== 'avoid')).toBe(true);
  });

  it('reports negative net and percentage when down', () => {
    const state = baseState({ currentBankroll: 850 });
    const result = evaluateSession(state);
    expect(result.metrics.net).toBe(-150);
    expect(result.metrics.netPct).toBeCloseTo(-15, 5);
  });
});

describe('validateNewBet edge cases', () => {
  it('rejects zero and negative amounts', () => {
    const state = baseState();
    expect(validateNewBet(state, 'pass-line', 0).ok).toBe(false);
    expect(validateNewBet(state, 'pass-line', -10).ok).toBe(false);
  });

  it('blocks dont-pass on come-out only when below minimum, allows at minimum', () => {
    const state = baseState();
    expect(validateNewBet(state, 'dont-pass', 10).ok).toBe(true);
    expect(validateNewBet(state, 'dont-pass', 9).ok).toBe(false);
  });
});
