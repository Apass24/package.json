// Human-readable labels and severity styling. Pure presentation helpers.

import type { BetType, OddsPolicy, RiskStyle, Severity } from '../types/craps';

export const BET_LABELS: Record<BetType, string> = {
  'pass-line': 'Pass Line',
  'dont-pass': "Don't Pass",
  come: 'Come',
  'dont-come': "Don't Come",
  'pass-odds': 'Pass Odds',
  'come-odds': 'Come Odds',
  'place-6': 'Place 6',
  'place-8': 'Place 8',
  'place-5': 'Place 5',
  'place-9': 'Place 9',
  'place-4': 'Place 4',
  'place-10': 'Place 10',
  field: 'Field',
  'hardway-6': 'Hard 6',
  'hardway-8': 'Hard 8',
  'hardway-4': 'Hard 4',
  'hardway-10': 'Hard 10',
  'any-seven': 'Any Seven',
  'any-craps': 'Any Craps',
};

export const RISK_LABELS: Record<RiskStyle, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
};

export const ODDS_LABELS: Record<OddsPolicy, string> = {
  '1x': '1x Odds',
  '2x': '2x Odds',
  '3-4-5x': '3-4-5x Odds',
  '5x': '5x Odds',
  '10x': '10x Odds',
};

/** Tailwind class fragments per severity for text + border + background. */
export const SEVERITY_STYLES: Record<
  Severity,
  { text: string; border: string; bg: string; dot: string }
> = {
  good: {
    text: 'text-[var(--color-good)]',
    border: 'border-[var(--color-good)]/40',
    bg: 'bg-[var(--color-good)]/10',
    dot: 'bg-[var(--color-good)]',
  },
  caution: {
    text: 'text-[var(--color-caution)]',
    border: 'border-[var(--color-caution)]/40',
    bg: 'bg-[var(--color-caution)]/10',
    dot: 'bg-[var(--color-caution)]',
  },
  avoid: {
    text: 'text-[var(--color-avoid)]',
    border: 'border-[var(--color-avoid)]/40',
    bg: 'bg-[var(--color-avoid)]/10',
    dot: 'bg-[var(--color-avoid)]',
  },
};

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString()}`;
}

export function formatSignedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString()}`;
}
