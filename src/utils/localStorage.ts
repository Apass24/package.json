// localStorage persistence. The ONLY persistence layer in the app.
// Defensive: never throws to the UI; falls back to safe defaults.

import type { PersistedData, SessionRecord, SessionState } from '../types/craps';

const STORAGE_KEY = 'craps-table-coach:v1';
const SCHEMA_VERSION = 1;

const emptyData: PersistedData = {
  version: SCHEMA_VERSION,
  session: null,
  history: [],
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Load persisted data, returning safe defaults on any failure. */
export function loadData(): PersistedData {
  if (!isBrowser()) return { ...emptyData };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyData };
    const parsed = JSON.parse(raw) as PersistedData;
    if (typeof parsed !== 'object' || parsed === null) return { ...emptyData };
    // Forward-compatible: only trust the current schema version.
    if (parsed.version !== SCHEMA_VERSION) return { ...emptyData };
    return {
      version: SCHEMA_VERSION,
      session: parsed.session ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...emptyData };
  }
}

/** Persist the full data blob. Silently ignores quota / serialization errors. */
export function saveData(data: PersistedData): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, version: SCHEMA_VERSION }),
    );
  } catch {
    // Storage full or disabled — degrade gracefully.
  }
}

/** Convenience: persist only the live session, preserving history. */
export function saveSession(session: SessionState | null): void {
  const data = loadData();
  saveData({ ...data, session });
}

/** Convenience: append a completed session to history (newest first). */
export function appendHistory(record: SessionRecord): SessionRecord[] {
  const data = loadData();
  const history = [record, ...data.history].slice(0, 100); // keep last 100
  saveData({ ...data, history, session: null });
  return history;
}

/** Wipe everything (used by "End Session" + reset). */
export function clearAll(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
