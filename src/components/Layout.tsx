import type { ReactNode } from 'react';
import { Dices, ShieldAlert } from 'lucide-react';

interface LayoutProps {
  /** Sticky content pinned to the top (bankroll + top recommendation). */
  sticky?: ReactNode;
  children: ReactNode;
}

/** App shell: branded header, sticky summary slot, scroll body, fixed disclaimer. */
export default function Layout({ sticky, children }: LayoutProps) {
  return (
    <div className="min-h-full flex flex-col bg-[var(--color-felt-950)]">
      <header className="sticky top-0 z-20 bg-[var(--color-felt-900)]/95 backdrop-blur border-b border-[var(--color-edge)]">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-2">
          <Dices className="size-6 text-[var(--color-chip)]" aria-hidden />
          <h1 className="text-lg font-bold tracking-tight">Craps Table Coach</h1>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-300/60">
            Decision support
          </span>
        </div>
        {sticky && (
          <div className="mx-auto max-w-2xl px-4 pb-3">{sticky}</div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-4 space-y-4 pb-40">
        {children}
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-20 bg-[var(--color-felt-900)]/95 backdrop-blur border-t border-[var(--color-edge)]">
        <div className="mx-auto max-w-2xl px-4 py-2 flex items-start gap-2 text-[11px] leading-snug text-amber-200/80">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" aria-hidden />
          <p>
            Decision-support only. This tool does <strong>not</strong> predict dice,
            beat the house edge, or guarantee winnings. Gamble responsibly and only
            with money you can afford to lose.
          </p>
        </div>
      </footer>
    </div>
  );
}
