# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1363 — [main worker, 2026-08-20] **M-B step 4 triage DONE: ISSUES #101 and #103 both fixed + pinned; both soak repros now reach honest terminals; neighbourhood sweeps clean**

- **State:** `src/engine/battleResolutionPresentation.ts` (#101 fix),
  `src/engine/factoryAiCheckViability.ts` (#103 fix),
  `tests/presentationStringIssue101.test.ts` (new),
  `tests/factoryAiCheckViability.test.ts` (2 new cases),
  `tools/report/ability-item-parity-census.ts` (5-line-citation ratchet
  moved +15 to track #103's inserted comments — doc output unchanged, diffed
  byte-identical), `ISSUES.md` (#101, #103 deleted, fully fixed, no
  remainder), this entry. Commits `ed66e000` (#101), `1403f462` (#103).
- **Did — #101:** `STRINGID_PKMNTOOKAIM` (`BattleScript_EffectLockOn`,
  `data/battle_scripts_1.s:1286-1297`) had no `messageLines` case.
  Confirmed `Cmd_setalwayshitflag` is already ported
  (`battleScriptSetalwayshitflagOpcode.ts`) and its always-hit flag is
  consumed by the accuracy chain, so `EFFECT_LOCK_ON` is fully executable —
  this was a pure missing-case gap (same shape as `STRINGID_PKMNIDENTIFIED`/
  `BattleScript_EffectForesight`), not an unmodeled effect; the ISSUES
  entry's "zero references" claim was about the string only. Added the case
  (`B_ATK_NAME_WITH_PREFIX`/`B_DEF_NAME_WITH_PREFIX`, unchanged roles).
  Red-verified via `git stash`. Soak seed 90 no longer reaches the original
  crash frame at all (the intervening `781c8827`/`db5b2b27` swap-decline
  fold diverged its RNG path before that point) — pinned directly with a
  real LOCK ON turn instead; fix is unconditional regardless of seed 90's
  new trajectory.
- **Did — #103:** `runCvDefenseUp`/`runCvSpDefUp` (`AI_CV_DefenseUp`/
  `AI_CV_SpDefUp`, `data/battle_ai_scripts.s:915-942/986-1013`) threw on the
  target's last-used move id `0xFFFF` (`MOVE_UNAVAILABLE`). Traced the real
  mechanism: `gLastMoves[gBattlerTarget]` becomes `MOVE_UNAVAILABLE` when the
  target's move was *blocked* last turn (flinch/full paralysis/frozen/
  still-asleep/recharge/Truant loafing — `battle_script_commands.c:4405-
  4412`'s `!HITMARKER_OBEYS` branch), confirmed disobedience itself never
  fires in the Factory (`IsMonDisobedient` short-circuits on
  `BATTLE_TYPE_FRONTIER`) so the blocked-move paths are the only route. On
  hardware `Cmd_get_move_power_from_result` then indexes
  `gBattleMoves[0xFFFF]`, an out-of-bounds ROM read with no byte-faithful
  value pokeemerald's own source computes — degraded it the same way this
  file's other CV handlers already treat an unresolved
  `target.lastUsedMoveId` (`AI_CV_MirrorCoat`'s `?? 0` power read): power 0,
  the script's own least-consequential branch. Red-verified via `git
  stash`. Soak seed 36 now runs to `roundComplete carry<=14 depth<=20`
  (was a crash at battle 7 turn 3).
- **Neighbourhood:** `--seeds 30:40` **10/10 OK**, 0 CRASH, 0 HANG (deepest
  carry 14, depth 20); `--seeds 85:95` **10/10 OK**, 0 CRASH, 0 HANG
  (deepest carry 7, depth 13).
- **Gates:** full `npm test` **1,070 files (44 skipped) / 10,140 tests
  passed (223 skipped)**; `npm run build` green (7.48s vite stage);
  `npm run typecheck` clean at each edit; `npm run test:smoke` 444/444
  (caught the census-ratchet line shift, fixed in the same commit).
- **Next:** #102 (`Cmd_switchhandleorder` no decided `monToSwitchIntoId`,
  seed 154) is the one remaining M-B step-4 queue item — separate step per
  the brief's scope. After that, a final 0:240 `winning` re-sweep with
  every folded lever (2a, swap-decline, #99/#100/#101/#103 fixes) to
  re-measure the carry≥21/28 rate against 1361's baseline.
- **Notes:** no PAPERCUT. Time discipline: #101 investigation+fix+pin
  ~12 min, #103 investigation+fix+pin ~20 min (the ROM-mechanism trace —
  disobedience vs. blocked-move paths — took longer than expected), census
  ratchet fix ~3 min, neighbourhood+full-suite+build+docs ~15 min;
  landed inside the 50-min cap.

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

Older entries: see `PROGRESS-archive.md`.
