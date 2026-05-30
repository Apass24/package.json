# CLAUDE.md

## Project
Build "Craps Table Coach," a private mobile-first web app for a single user.
It is a decision-support tool for casino craps, not a predictor and not a guarantee of winnings.

## Non-negotiables
- Client-side only.
- No authentication.
- No external APIs.
- No external database.
- Persist data only with localStorage.
- Use React, TypeScript, Tailwind CSS, and Vite.
- Use Lucide Icons.
- Use Recharts only if it adds clear value.
- Keep the disclaimer visible in the UI.

## Product intent
The app helps the user make mathematically grounded decisions based on:
- table state,
- bankroll,
- house edge,
- odds allowed,
- risk style,
- and bet exposure.

Do not build features that imply prediction, cheating, or guaranteed profit.

## Architecture
- Keep math, bankroll logic, and recommendation logic separate from UI.
- Put all craps types in `src/types/craps.ts`.
- Put probability constants and math helpers in `src/logic/crapsMath.ts`.
- Put bankroll exposure and sizing rules in `src/logic/bankrollRules.ts`.
- Put the deterministic recommendation controller in `src/logic/recommendationEngine.ts`.
- Keep components small and single-purpose.
- Favor pure functions where possible.
- Use strict TypeScript.

## UX
- Mobile-first dashboard.
- One primary view.
- Sticky bankroll and recommendation summary at the top.
- Large touch targets for point and bet selection.
- Immediate recalculation after any change.
- Dark casino-inspired theme.
- Use green for strong/safe, yellow for moderate/high variance, red for poor/avoid.

## Rules to enforce
- Pass Odds requires an active Pass Line bet.
- Come Odds requires an active Come bet.
- On come-out, only primary line bets are allowed.
- Total bet exposure must not exceed 10% of current bankroll.
- If bankroll falls within 20% of stop-loss, size down to minimum.
- If bankroll <= stopLoss, recommend color out and leave.
- If bankroll >= winTarget, recommend locking in gains or reducing exposure.

## Implementation order
1. Types and constants.
2. Logic and recommendation engine.
3. App shell and layout.
4. Inputs, dashboard, and recommendation UI.
5. localStorage persistence.
6. Session history and polish.
7. Tests and validation.

## Commands
- install: `npm install`
- dev: `npm run dev`
- build: `npm run build`
- lint: `npm run lint`
- test: `npm test`

## Working style
- Ask for a plan before writing major code.
- Prefer one milestone at a time.
- Do not expand scope without approval.
- If a rule is ambiguous, make the safest deterministic choice and note it.

## Done criteria
- App runs locally.
- TypeScript compiles cleanly.
- Rules are enforced in the UI and logic layer.
- localStorage works.
- Mobile layout is usable.
- Disclaimer is always present.
