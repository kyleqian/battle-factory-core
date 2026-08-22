# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1384 — [main worker, 2026-08-22] **new opt-in `--start-carry` soak option boots the first chained round at a carried win streak — 0:160 across 3 sweeps, ISSUES #118 filed (challengeNum 8 draft-generation throw, real 2-round-win-from-42 state)**

- **State:** master `f04c6227` + this docs commit. `npm test` 1095/1139
  files, 10231/10454 passed, build green, smoke 444/444, ratchet unchanged
  (no `src/` touch — the carry is injected entirely from already-public
  `src/engine` exports via the existing `stateFactory` seam).
- **Did:** `createStartCarryState(N)` (`tools/soak/randomRoundSoakDriver.ts`)
  drives `generateFactoryChallengeDraft` from the anchor RNG cursor with a
  synthetic carry `{factoryWinStreak: N, rentsCount: 0, battlePoints: 0,
  factorySymbolsCount: <21⇒1, 42⇒2>, playerTrainerId: anchor}` — the same
  chaining entry a real round-win handoff uses. `--start-carry 0`/omitted ==
  `createInitialState()` verbatim (stashed before/after `winning` 0:10 byte-
  identical). 4 new pins (carry 28 boot ⇒ challengeNum 4; carry 42 boot ⇒
  its OWN 7th battle is NOT the brain — gold was already earned crossing 41
  inside the round that carries 35→42, confirmed via
  `getFactoryFrontierBrainStatus`; invalid values rejected; carry 0
  identity). Sweeps (8×20-seed chunks, parallel `&`+`wait`, 16 cores):
  (a) `winning --start-carry 28` 0:60 **60/60 OK**, every seed caps at
  carry 28 (matches the goal's premise at n=60); (b) `winning --start-carry
  42` 0:60 **57/60 OK, 3 CRASH** (seeds 2/32/49, all the same signature —
  `generateInitialFactoryRentals`'s `challengeNum > 7` guard, reached when
  two round-wins from a 42 boot hit carry 56); (c) `winning-swap
  --start-carry 35` 0:40 **40/40 OK**. Filed **ISSUES #118** (needs the
  retail non-BUGFIX out-of-range table behavior, not just a raised guard).
  `docs/soak-start-carry-2026-08-22.md` has every log + repro.
- **Next:** #118 unfixed (main-lane engine change, out of this step's
  scope) — pick up with the `battle_tower.c` non-BUGFIX `#else` lookup.
  `--start-carry 7/14/21` (the mid tiers) unswept.
- **Notes:** no new papercuts.

---

## 1383 — [main worker, 2026-08-22] **new opt-in `winning-swap` soak policy exercises the Factory swap screen at real carried-streak depth for the first time — 0:120 sweep clean, 0 CRASH/HANG**

- **State:** master `7f89b708` + this docs commit. `npm test` 1095/10227
  passed, build green, smoke 444/444, ratchet unchanged (no `src/` touch).
- **Did:** `winning-swap`: identical to `winning` except it accepts every
  swap offer then scores rentals/opponent mons and swaps the worst rental
  for the best outscoring opponent mon. `winning` 0:10 byte-identical
  before/after; 5 new pins. Sweep (6×20 chunks, not 4×30 — 30-seed chunks
  exceed this tool's 600s/call cap): **120/120 OK, 0 CRASH, 0 HANG**, carry
  ≥ 28 in 5/120 — `docs/soak-winning-swap-0-120-2026-08-22.md`. Fixed 2
  stale doc comments claiming the withheld `pickWinningDraftPicks` (1380)
  was merged.
- **Next:** no crashes found, no ISSUES entries needed.
- **Notes:** no new papercuts.

---

## 1382 — [supervisor fold, 2026-08-22 15:00] **#117 FIXED + folded (`521ae499`: record-menu arrow redraw lags the cursor flip by one tick; `loss-terminal-record-cursor-off` 80/80, yes-path 133/133 re-run by the supervisor); #71 Slice C found already done (1381, stale ISSUES text); final-tree `full` 0:240 → 240/240 OK**

- **State:** master = 1381 + merge of `worker/side-20260822-141940`. Merged-
  tree checks: both terminal compares exact, pins 7/7+, smoke 444. ISSUES −#117.
  PAPERCUTS +1 (obsolete `loss-terminal-decline-continuation-off` trace,
  50/155 by design since entry 1313 — bisected across the #104 commits
  before the archive answered; not a regression).
- **Sweeps on the final engine (`adf633e9`, clean worktree):** `full` 0:240
  **240/240 OK, 0 CRASH, 0 HANG** (session start: 236/240); `winning`
  0:240 in flight (0 crashes at 30%); `full` 240:480 crash-discovery next.
- **Queue state:** every bounded ISSUES item is closed or filed for a later
  era (#109/#114 doubles, #116 user gate decision, #55/#39/#73 parked or
  #55-bounded, #71 filler). Remaining session = crash discovery + wind-down
  gates + lane folds.

---
