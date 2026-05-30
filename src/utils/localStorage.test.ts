import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionRecord, SessionState } from '../types/craps';
import {
  appendHistory,
  clearAll,
  loadData,
  saveData,
  saveSession,
} from './localStorage';

// Minimal in-memory localStorage shim for the node test environment.
function installLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('window', { localStorage: mock });
  return { store, mock };
}

function sampleSession(): SessionState {
  return {
    config: {
      startingBankroll: 500,
      tableMinimum: 10,
      stopLoss: 300,
      winTarget: 750,
      oddsPolicy: '3-4-5x',
      riskStyle: 'balanced',
    },
    currentBankroll: 520,
    phase: 'point',
    point: 6,
    bets: [{ id: 'b1', type: 'pass-line', amount: 10 }],
  };
}

describe('localStorage persistence', () => {
  beforeEach(() => {
    installLocalStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns safe defaults when empty', () => {
    const data = loadData();
    expect(data.session).toBeNull();
    expect(data.history).toEqual([]);
    expect(data.version).toBe(1);
  });

  it('round-trips a saved session', () => {
    const session = sampleSession();
    saveSession(session);
    const loaded = loadData();
    expect(loaded.session).toEqual(session);
  });

  it('appends history newest-first and clears the live session', () => {
    saveSession(sampleSession());
    const record: SessionRecord = {
      id: 'r1',
      startedAt: 1,
      endedAt: 2,
      startingBankroll: 500,
      endingBankroll: 600,
      net: 100,
      oddsPolicy: '3-4-5x',
      riskStyle: 'balanced',
    };
    const history = appendHistory(record);
    expect(history[0].id).toBe('r1');
    // appendHistory wipes the live session.
    expect(loadData().session).toBeNull();
  });

  it('ignores a corrupt payload and falls back to defaults', () => {
    window.localStorage.setItem('craps-table-coach:v1', '{not valid json');
    const data = loadData();
    expect(data.session).toBeNull();
    expect(data.history).toEqual([]);
  });

  it('ignores data from a different schema version', () => {
    window.localStorage.setItem(
      'craps-table-coach:v1',
      JSON.stringify({ version: 99, session: sampleSession(), history: [] }),
    );
    expect(loadData().session).toBeNull();
  });

  it('clearAll removes persisted data', () => {
    saveData({ version: 1, session: sampleSession(), history: [] });
    clearAll();
    expect(loadData().session).toBeNull();
  });

  it('caps history at 100 entries', () => {
    const make = (i: number): SessionRecord => ({
      id: `r${i}`,
      startedAt: i,
      endedAt: i,
      startingBankroll: 500,
      endingBankroll: 500,
      net: 0,
      oddsPolicy: '3-4-5x',
      riskStyle: 'balanced',
    });
    let history: SessionRecord[] = [];
    for (let i = 0; i < 105; i += 1) history = appendHistory(make(i));
    expect(history.length).toBe(100);
    // newest is the last appended
    expect(history[0].id).toBe('r104');
  });
});
