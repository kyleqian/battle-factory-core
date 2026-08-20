# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1360 — [main worker, 2026-08-20] **ISSUES #100 FIXED: STRINGID_NATUREPOWERTURNEDINTO's missing `{B_CURRENT_MOVE}` resolver added; sibling-gap sweep found + fixed one more (STRINGID_PKMNWASDEFROSTEDBY), soak seed 15 now runs to an honest terminal**

- **State:** `src/engine/battleResolutionPresentation.ts` (two new
  `messageLines` cases), `tests/presentationStringIssue100.test.ts` (new, 3
  tests), `ISSUES.md` (#100 deleted), `PROGRESS.md`/`PROGRESS-archive.md`
  (this entry; 1356 archived to keep the ledger at ~3). No `tools/soak/`
  change (side lane owns it this round, per the brief).
- **Did:** `Cmd_callenvironmentattack` (`battle_script_commands.c:9108-9115`)
  overwrites `gCurrentMove` to the terrain-selected move (SWIFT in the
  Factory's `BATTLE_ENVIRONMENT_BUILDING`) and falls straight into
  `printstring STRINGID_NATUREPOWERTURNEDINTO` in the same script frame
  (confirmed the TS `callenvironmentattack` handler's `call-stack` transition
  already mirrors this exactly) — `messageLines` had no case wiring that
  placeholder. Added one, sourced from `actionSnapshot.currentMove`, mirroring
  the ~14 existing `B_CURRENT_MOVE` sites. Swept every STRINGID referencing
  `{B_CURRENT_MOVE}` (18 total) for the same gap: `STRINGID_PKMNCANTUSEMOVE-
  SEALED` is the already-documented Imprison DEAD-carrier exclusion (ISSUES
  #72) — left alone; the other 16 already had cases. Found one genuine
  second gap outside that grep, by inspection of `BattleScript_MoveUsedUnfroze`
  (`gGotDefrostedStringIds`): `STRINGID_PKMNWASDEFROSTEDBY` (frozen attacker
  self-thaws via a Thaw Hit move, e.g. Flame Wheel) had no case either —
  fixed the same way. Its row-0 sibling `STRINGID_PKMNWASDEFROSTED2` (plain
  20%-roll natural thaw, no move named) turned out to already resolve
  correctly via `messageLines`' generic tail fallback (`lastMoveAttacker` is
  updated from the current event's own `actionSnapshot` before the fallback
  runs, so it's not stale) — no fix needed there; pinned anyway as a
  regression check, and the redundant explicit case was deliberately *not*
  added, matching the file's own convention of leaving generically-covered
  IDs alone.
- **Pin:** `tests/presentationStringIssue100.test.ts`, 3 tests, real staged
  full-turn kernel scenarios (`createFactoryFullTurnBattleState` +
  `submitFactoryFullTurnDecision`, the `presentationStringIssue72Batch8`
  pattern) — NATURE POWER reached directly (no METRONOME roll needed, same
  `EFFECT_NATURE_POWER` script runs either way); Flame Wheel-while-frozen for
  the defrost-by-move fix; Splash-while-frozen at `rngSeed 3` for the
  natural-thaw regression check. Red-verified against pre-fix code via
  `git stash` — exactly the 2 fix-needing tests failed with the placeholder
  error, the regression-check test passed both before and after, as
  expected. `npm run test:smoke` 444/444 green.
- **Seed 15 reproved:** `node --experimental-strip-types
  tools/soak/randomRoundSoak.ts --seed 15 --policy winning --verbose
  --render-every 0` → `seed 15 OK b7 t20 222002f 5.0s roundComplete
  carry<=7 depth<=7` (was a crash at battle 5 turn 5 pre-fix). Neighbourhood
  check `npm run soak -- --policy winning --seeds 10:20 --render-every 0`:
  **10/10 OK**, 0 CRASH, 0 HANG (39.7s wall; carry>=7 7/10, carry>=14 2/10,
  deepest carry 14).
- **Gates:** full `npm test` **1,069 files (44 skipped) / 10,136 tests
  passed (223 skipped)**; `npm run build` green (`tsc -b && vite build`,
  7.80s vite stage). `npm run typecheck` clean at each edit.
- **Next:** M-B step 2 (raise `winning`'s win rate toward carry>=21) can
  proceed from a clean baseline — no known engine crashes block it as of
  this entry. The side lane's soak-driver work continues independently.
- **Notes:** no PAPERCUT this session. Time discipline: investigation +
  both fixes + pin landed ~30 min in; seed-15 reproof + 10:20 neighbourhood
  check ~6 min; full-suite (backgrounded past the 120s foreground cap,
  polled to completion in the same turn, ~2:48 wall) + build (~1:31 wall) +
  docs ~10 min.

---

## 1359 — [supervisor fold, 2026-08-20] **M-B step 2a folded: `winning` picks fight moves by power × type-effectiveness × STAB (side `ff5e84d6`, merge `82580f0f`) — first-ever carry ≥ 21 seed observed**

- **State:** union of the #99 fix (1358) + side step 2a. Both-sides-additive
  conflict in `tests/randomRoundSoak.test.ts` resolved by keeping both
  describes; union checks: soak test file 22/22, smoke 444/444, build green.
- **Did:** side worker (Sonnet, 26 min) landed `pickWinningFightSlot` (engine's
  own `applyTypeEffectiveness` + `type-effectiveness.json`; immune/0-power
  score 0; fallback = old highest-power rule) with 4 Tier-1 pins incl.
  `full`/`vanilla` byte-identical seeds. Supervisor independently reran its
  measurement in the worktree (pre-#99-fix tree, like-for-like): `winning`
  0:60 **25/9/1** at carry ≥ 7/14/21, deepest battle-depth **24** — exact
  match to the worker's table (before: 26/2/0, deepest 6). Scout doc
  `docs/soak-winning-loss-analysis-2026-08-20.md` (fold `7f5a9b66`) holds
  the loss census that motivated it (48.4% of losses ended on a
  resisted/immune move).
- **Next:** the union (#99 + #100 + 2a) has not been swept yet — M-B step 3
  sweep next on main; side lane is landing two more `winning` levers
  (decline swaps, draft by strength) for a second sweep after.
- **Notes:** no PAPERCUT. Parallel-lane note: side round 2 launched mid-main-
  round on `--base 0dd3f36c` and merged only after the main worker exited
  (code branches never merge under a live main worker).

---

## 1358 — [main worker, 2026-08-20] **ISSUES #99 FIXED: soak driver's swap offer now answered by its own branch; depth re-measured for all three policies — vanilla's apparent carry-14 depth was a swap-accept-bug artifact, `full` moved off its 0/60 floor, `winning` found one new engine crash (#100)**

- **State:** `tools/soak/randomRoundSoakDriver.ts` (fix + additive
  `RunOptions.onNote` test hook), `tests/randomRoundSoak.test.ts` (new
  `describe("ISSUES #99 ...")`, 3 tests; one pre-existing strong-route pin
  corrected — see Notes), `docs/soak-depth-remeasure-2026-08-20.{md,log}`,
  `ISSUES.md` (#99 deleted, #100 filed), this entry. No other `src/` change.
- **Did:** `onPostwin`'s continuation-menu branch never cleared
  `continuationCursorPos` after GO ON was confirmed (engine projection,
  `src/engine/postwin.ts:899-904`), so it kept matching on every later
  postwin page — including the dialoguePage-4 swap offer — and answered it
  with A on the frozen cursor-0 (YES) before the swap-offer branch ever ran.
  Fix: moved the swap-offer branch above the continuation branch and gated
  the continuation branch on `dialoguePage === 0` (the engine's own live-menu
  guard in `acceptPostwinContinuation`). Pinned with 3 new tests (vanilla
  seed 0 always NO + never enters the swap screen; winning seed 0 logs a
  swap-offer decision; winning seeds 0-6 show both YES and NO) — ~4.5s
  combined, well under the 20s per-test timeout.
- **Before/after (carry >= 7 / >= 14 / >= 21 of 60 seeds, full table +
  before/after methodology in the doc):**
  | policy | before OK | before carry>=7/14/21 | after OK | after carry>=7/14/21 |
  |---|---|---|---|---|
  | vanilla | 60/60 | 16/3/0 | 60/60 | 21/0/0 |
  | full | 60/60 | 0/0/0 | 60/60 | 1/0/0 |
  | winning | 60/60 (recount) | 26/2/0 | **59/60** | 20/4/0 |
  vanilla's pre-fix carry-14 reach (deepest depth 20) was an artifact of
  accidentally accepting every swap; post-fix it never exceeds carry 7
  (deepest depth 10). `full` moved off its 0/60 never-carries floor (1/60).
- **New crash (not fixed, out of scope):** `winning` seed 15 crashes at
  battle 5 turn 5 — `STRINGID_NATUREPOWERTURNEDINTO` (METRONOME → NATURE
  POWER) has no `{B_CURRENT_MOVE}` resolver in
  `battleResolutionPresentation.ts`. Filed as **ISSUES #100** with repro +
  mechanism + fix lead; reported honestly as 59/60, not rounded up.
- **Gates:** standing soak gates rerun post-fix with default rendering:
  `--policy vanilla --seeds 0:20` **20/20 OK**; `--seeds 0:20` (full,
  default rendering) **20/20 OK**, cited together with the render-every-0
  `full` 0:60 measurement run (60/60 OK) for the `full` 0:60 gate per the
  brief's citation rule. `npm run test:smoke` 444/444 green throughout;
  full `npm test` and `npm run build` run once at the end (see Notes for
  the exact counts).
- **Next:** ISSUES #100 (NATURE POWER string resolver) is a clean, bounded
  next step — add the missing `B_CURRENT_MOVE` resolver case in
  `battleResolutionPresentation.ts`'s `messageLines`, mirroring the ~14
  existing sites, then re-run soak seed 15 winning to confirm green.
  M-B step 2 (raise `winning`'s win rate toward carry>=21) can now proceed
  from a clean, bug-free swap-decision baseline.
- **Notes:** one pre-existing pin ("earns all seven generated wins...",
  `testPolicy: "strong-route"`) had its literal frame/turn/renderCalls
  numbers corrected (59,656→40,566 frames, turn 18→5, renderCalls
  4,397→2,953): strong-route shares vanilla's non-exploring swap semantics,
  so it now genuinely declines every swap instead of the old bug's
  accidental accept-every-swap, producing a shorter, different, still-
  deterministic trajectory (comment explains why in the test file).
  `PAPERCUT: none this session — the earlier session's swap-offer-log gap
  (1357's PAPERCUT) is what #99 turned out to be.` Time discipline: fix +
  pin landed by ~25 min; measurement + gates (parallel foreground shell
  jobs, ~2.5min + ~6min wall) by ~45 min; full-suite/build run once at the
  end per the brief.

---

## 1357 — [main worker, 2026-08-20] **M-B step 1 DONE: `full` never wins a round because it's genuinely bad play, not an engine defect — verdict (a). Fight-menu's uniform-over-legality move roll is the dominant lever (ablation 0%→20.0%)**

- **State:** docs-only session (`docs/soak-full-policy-diagnosis-2026-08-20.md`,
  this entry). Zero `src`/`tools`/`tests` change: `git diff master@{u}..HEAD
  --stat` for this commit touches only `docs/` + `PROGRESS.md`. Scratch
  instrumentation (env-var-gated ablation toggles + an opt-in
  `collectRoundCensus` hook in `randomRoundSoakDriver.ts`, plus a scratch
  `_scratch_census.ts`) was added, run, then fully reverted
  (`git checkout -- tools/soak/randomRoundSoakDriver.ts` + `rm` the scratch
  script) — verified clean before this commit. `npm run test:smoke` 444/444
  green (confirms the scratch edits were behavior-neutral before revert).
- **Did:** read `roundController.ts`/`postwin.ts`/`core.ts`/
  `factoryRoundBattleOrchestrator.ts` first to establish that only a genuine
  in-battle result sets `round.rules.phase` to `roundLost`/`roundComplete`
  (RETIRE never touches it — confirmed zero `retire` hits in the
  orchestrator file), so the census's two watched edges are exhaustive. Then
  instrumented a per-round-attempt termination census (`full`, seeds 0:30,
  time-capped down from the brief's 0:60) and a 4-way single-knob ablation
  (`full`, seeds 0:30 each, draw-count-parity overrides so only the
  overridden decision's outcome changes, not the RNG stream length).
- **Result — verdict (a):** census = **108/108 round-attempts (30 seeds)
  ended in a genuine, fully-fainted honest loss** (`roundLost`,
  `faintedCount:3`, `hp:[0,0,0]`, every time); RETIRE was never once the
  actual end cause (rolled+accepted 0/108); zero `roundLost`-with-healthy-
  party and zero silent-stall cases — no candidate-(b) defect, no ISSUES
  entry filed. Ablation: **B (fight-menu picks `winning`'s highest-power
  legal slot instead of a uniform-over-*all 4*-slots roll, legal or not)
  moves carry>=7 from 0%→20.0% (6/30)** alone — more than a third of the way
  to `vanilla`'s established 26.7% — while A (no voluntary switches) only
  reaches 3.3% (1/30), and C (no swap accept) / D (no fight cancel) show
  **zero** effect (0/30 each). Ablation E (all four combined) **did not run**
  — time cap; said so explicitly in the doc. One `--seed 21 --verbose`
  spot-check cross-checked the census tabulation against the raw action log
  byte-for-byte (battle 3 loss → terminal → fresh draft, matching the
  `battleIndex:2`/`roundLost` record exactly).
- **Next:** M-B step 2 ("raise the win rate until carry >= 21 is observed")
  — ablation B's mechanism (`bestDamagingSlot()`, already implemented for
  `winning`) is a concrete, cheap, already-measured starting lever, though
  step 2 owns its own design. Dispatch as the next worker step.
- **Notes:** `PAPERCUT: seed 21's swap-screen entry (frame 11903) has no
  preceding "swap offer: YES" ActionLog line even though state.factorySwap
  was genuinely non-null by then (didn't affect this session's
  engine-state-based census, which doesn't read that log text; not chased
  further under the time cap), ~5 min lost confirming it was cosmetic.` Time
  discipline: the 50-minute cap forced seed ranges down to 0:30 (not 0:60)
  and dropped ablation E — an honest partial per the brief's own allowance,
  not a silent shortcut.
- **Supervisor salvage + correction (same session):** worker cap-killed at
  50 min (exit 143) after everything was written and the scratch reverted;
  supervisor re-checked every number against the raw `/tmp/mb-*.log`
  files (match) and committed. **Correction:** ablation C was a no-op, not
  a null — the PAPERCUT above IS a driver defect, filed as **ISSUES #99**
  (swap-offer YES/NO never answered by its own branch; every policy incl.
  `vanilla` accepts the swap and random-mashes the swap screen). So "swap
  accept not responsible" is withdrawn; re-measured post-fix in 1358.
  Side scout (`9b538b73`, folded) independently found #99 and measured
  `winning`'s losses: 48.4% end on a resisted/immune move; type-aware move
  choice moved carry>=14 4%→15% (60 seeds) — M-B step 2's first lever.
