# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1362 — [supervisor fold, 2026-08-20] **M-B bar REACHED (sweep 1361: carry ≥ 21 by play, seed 99); swap-decline lever folded (`781c8827`); draft heuristic WITHHELD; #103 filed; ROADMAP M-B status written**

- **State:** master = sweep docs (1361) + side part-B rung 1 (`db5b2b27`,
  `winning` declines every swap; union soak file 23/23, smoke 444/444).
  Supervisor independently reran seed 99 at HEAD: `roundLost carry<=21
  depth<=25` — the milestone's acceptance seed reproduces.
- **Did:** verified the side part-B worker (26/26 pins in its worktree):
  rung 1 = 36/10/0 of 60 vs 34/10/0 baseline → folded; rung 2 (draft by
  BST+STAB-power+coverage, `e9a415a7`) = 25/9/0 → **withheld** (no evidence
  for it at n=60; branch `worker/side-20260820-113153` kept for a larger-
  sample re-measure, not orphaned by accident). Its swap-decline run exposed
  `factory-ai-check-viability: unknown last-used move 65535` (seed 36,
  carry 14 / depth 20) — re-reproduced at HEAD, filed **#103** (0xFFFF =
  MOVE_UNAVAILABLE sentinel lead). ROADMAP M-B block now carries a status
  paragraph (bar reached; step 4 queue #101/#102/#103; carry ≥ 28 stretch).
- **Next:** main: fix #101 + #103 (both small, source-cited, pinned), then
  #102 (diagnostic), then a final 0:240 re-sweep with every folded lever.
  Side (in flight): walled-matchup switch heuristic on the rung-1 base.
- **Notes:** host load ~18 on 16 cores with three supervisors live — side
  briefs now cap parallel soaks at 2. Issue numbering: the sweep worker took
  #101/#102 while the sentinel crash was drafted as #101 → renumbered #103.

---

## 1361 — [main worker, 2026-08-20] **M-B step 3 DONE: `winning` 0:240 deep sweep — first-ever carry >= 21 seed on the post-#99/#100-fix + 2a tree (depth 25, seed 99), confirmed genuine chained play; two new engine crashes filed (#101, #102), no HANG/budget issue**

- **State:** docs-only session. `docs/soak-deep-sweep-2026-08-20.{md,log}`
  (new), `ISSUES.md` (#101, #102 filed), `PROGRESS.md`/`PROGRESS-archive.md`
  (this entry; 1358/1357 archived to keep the ledger at ~3). No `src/`,
  `tools/`, or `tests/` change — both crashes found are genuine `src/engine`
  gaps, filed per the standing convention rather than fixed same-step.
- **Did:** swept `winning` seeds 0:240 (12×20-seed chunks, `--render-every 0`,
  3 batches of 4 parallel foreground processes) over the union of ISSUES #99
  (soak driver swap-offer fix), #100 (NATURE POWER string resolver), and
  M-B step 2a (type-aware fight-move choice) — the first sweep of that union.
- **Result:** **238/240 OK, 2 CRASH, 0 HANG.** carry>=7 105/240 (43.75%),
  carry>=14 33/240 (13.75%), **carry>=21 1/240 (0.4%) — seed 99**, carry>=28
  0/240. Deepest carry 21, deepest battle-depth **25** (seed 99, new
  all-time deepest) — one battle past 1359's pre-#99-fix 2a-only measure
  (24). `--verbose` on seed 99 confirms genuine chained play, not an
  artefact: 3 clean 7-battle round wins (carry 0→7→14→21), then the carry-21
  round reaches battle 5 before an honest loss re-chains to 0; challengeNum
  at carry 21 is `floor(21/7)=3`, the `CHECK_BAD_MOVE`-only AI tier
  (`factoryAiMaskSelection.ts`'s `challengeBelow4` branch) — full AI triad
  (challengeNum>=4, carry>=28) not reached. Zero HANGs anywhere; highest
  frame count was 649,579 of the 1,000,000 `winning` budget, so no budget
  question this round. Since carry>=21 *was* observed in 0:240, the brief's
  240:360 fallback extension did not apply and was not run.
- **Triage:** two new, distinct, low-frequency (1/120 each) genuine
  `[engine/tick]` crashes, neither small/engine-local enough to pin
  same-step — filed as **ISSUES #101** (seed 90: `STRINGID_PKMNTOOKAIM`,
  Lock-On/Mind Reader's only printstring, has **no** `messageLines` case at
  all, and `EFFECT_LOCK_ON` has zero execution-path references anywhere in
  `src/engine/*.ts` outside AI viability scoring — wider than #100's
  single-missing-resolver pattern) and **ISSUES #102** (seed 154:
  `Cmd_switchhandleorder` finds no decided `monToSwitchIntoId` for battler 1
  after a mid-round forced switch — root cause not narrowed: AI switch-in
  skip vs. ordering bug vs. the file's own documented unmodeled
  multi-battler case). No STOP RULE trigger.
- **Gates:** no `src/`/`tests/` change this session, so `npm run test:smoke`
  once is the finish requirement per the brief — 444/444 green (run at
  session start as the baseline check; nothing changed engine-side since).
- **Next:** M-B step 4 (triage/fix #101 and #102, or continue widening
  `winning`'s reach) — the side lane's two more `winning` levers (decline
  swaps, draft by strength) are still in flight for a second sweep to
  compare against this one's baseline numbers.
- **Notes:** no PAPERCUT this session. Time discipline: all 12 chunks
  (3 batches of 4 parallel foreground processes) landed by ~20 min; seed 99
  verbose confirmation + both crash triages by ~35 min; docs + ISSUES +
  PROGRESS by ~45 min, comfortably inside the 55-min cap.

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
