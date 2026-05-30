// Session state controller hook. Owns the live SessionState, derives engine
// output on every change, and mirrors everything into localStorage.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Bet,
  BetType,
  EngineResult,
  PointNumber,
  SessionConfig,
  SessionRecord,
  SessionState,
} from '../types/craps';
import { evaluateSession, validateNewBet } from '../logic/recommendationEngine';
import { appendHistory, loadData, saveSession } from '../utils/localStorage';
import { COME_OUT_ONLY_BETS } from '../types/craps';

let betCounter = 0;
function nextBetId(): string {
  betCounter += 1;
  return `bet-${Date.now()}-${betCounter}`;
}

function newSession(config: SessionConfig): SessionState {
  return {
    config,
    currentBankroll: config.startingBankroll,
    phase: 'come-out',
    point: null,
    bets: [],
  };
}

export interface UseSession {
  session: SessionState | null;
  history: SessionRecord[];
  result: EngineResult | null;
  startSession: (config: SessionConfig) => void;
  endSession: () => void;
  setPoint: (point: PointNumber | null) => void;
  addBet: (type: BetType, amount: number, number?: PointNumber) => string | null;
  removeBet: (id: string) => void;
  adjustBankroll: (delta: number) => void;
  setBankroll: (value: number) => void;
  lastError: string | null;
  clearError: () => void;
}

export function useSession(): UseSession {
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const data = loadData();
    setSession(data.session);
    setHistory(data.history);
  }, []);

  // Persist the live session whenever it changes (after hydration).
  useEffect(() => {
    saveSession(session);
  }, [session]);

  const result = useMemo<EngineResult | null>(
    () => (session ? evaluateSession(session) : null),
    [session],
  );

  const startSession = useCallback((config: SessionConfig) => {
    setSession(newSession(config));
    setLastError(null);
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;
      const record: SessionRecord = {
        id: `sess-${Date.now()}`,
        startedAt: Date.now(), // not tracked precisely; recorded at end for ordering
        endedAt: Date.now(),
        startingBankroll: prev.config.startingBankroll,
        endingBankroll: prev.currentBankroll,
        net: prev.currentBankroll - prev.config.startingBankroll,
        oddsPolicy: prev.config.oddsPolicy,
        riskStyle: prev.config.riskStyle,
      };
      setHistory(appendHistory(record));
      return null;
    });
  }, []);

  const setPoint = useCallback((point: PointNumber | null) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (point === null) {
        // Returning to come-out clears point-only bets (odds, place, etc.).
        const keep = prev.bets.filter((b) => COME_OUT_ONLY_BETS.includes(b.type));
        return { ...prev, phase: 'come-out', point: null, bets: keep };
      }
      return { ...prev, phase: 'point', point };
    });
  }, []);

  const addBet = useCallback<UseSession['addBet']>((type, amount, number) => {
    let createdId: string | null = null;
    setSession((prev) => {
      if (!prev) return prev;
      const validation = validateNewBet(prev, type, amount);
      if (!validation.ok) {
        setLastError(validation.reason ?? 'Bet not allowed.');
        return prev;
      }
      const bet: Bet = { id: nextBetId(), type, amount, number };
      createdId = bet.id;
      setLastError(null);
      return { ...prev, bets: [...prev.bets, bet] };
    });
    return createdId;
  }, []);

  const removeBet = useCallback((id: string) => {
    setSession((prev) =>
      prev ? { ...prev, bets: prev.bets.filter((b) => b.id !== id) } : prev,
    );
  }, []);

  const adjustBankroll = useCallback((delta: number) => {
    setSession((prev) =>
      prev
        ? { ...prev, currentBankroll: Math.max(0, prev.currentBankroll + delta) }
        : prev,
    );
  }, []);

  const setBankroll = useCallback((value: number) => {
    setSession((prev) =>
      prev ? { ...prev, currentBankroll: Math.max(0, value) } : prev,
    );
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    session,
    history,
    result,
    startSession,
    endSession,
    setPoint,
    addBet,
    removeBet,
    adjustBankroll,
    setBankroll,
    lastError,
    clearError,
  };
}
