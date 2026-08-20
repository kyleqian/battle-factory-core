# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1366 — [supervisor fold, 2026-08-20] **Carry-21 "wall" is a driver-masked engine dead end (#104: terminal record-YES/cancel never continues; soak grace cumulative + expiry reported OK) — found by supervisor probe; switch lever C2 + #104-refutation test folded (`3fa78a98`)**

- **State:** master = 1365 sweep docs + side C2 (`5b31b1ea`: `winning`
  switches only out of a true-immunity wall with a ≥50%-HP bench answer;
  38/13/2 of 60 vs 36/10/0 decline-only, 30 switches) + side refutation
  pin (`bc8acc23`, end-turn skip claim REFUTED, later battler keeps its
  tick). Union: soak file + new test 33/33, smoke 444/444. PAPERCUTS bumped
  (`fdf46ebb`: absolute-path commit on master + reset --hard by a side
  worker; pinned-line census citations, incl. the supervisor's own hit).
- **Finding:** all three deepest 0:480 seeds (125/328/409) stop at
  `roundComplete carry<=21`. Probe (scratch print at grace expiry, reverted):
  `factoryTerminal.recordChoice:"yes"`, no `declineFarewellReleaseAge`, no
  re-chain; grace 9k→90k changes only the frame count. Driver's
  `terminalGrace` is set once and never re-armed → cumulative across
  re-chains (~1k each) → expiry reported OK. Filed **#104** (engine + driver
  halves). So "carry ≥ 28 not reached" (1365) is NOT evidence about the AI
  tier; the depth instrument was capped at ~3 re-chains since M-A.
- **Next:** main: driver half of #104 (per-round grace, HANG on stall) +
  pin; side: engine half (stub continuation for YES/cancel per the RECORD
  stub-only decision) + pin; then one more 0:480 sweep on the union for the
  carry ≥ 28 tier. Withheld: draft-by-strength (`e9a415a7`) pending n≥180.
- **Notes:** lesson banked — a sweep's "deepest seed stops at X" claim needs
  the END SURFACE of those seeds inspected before it is attributed to game
  difficulty; three sweeps attributed an instrument cap to the AI.

---

## 1365 — [main worker, 2026-08-20] **M-B FINAL RE-SWEEP DONE: `winning` 0:480, 0 CRASH/0 HANG across the doubled range — 3 seeds reach the full width of the carry-21 challenge (depth 27, new deepest), carry ≥ 28 not yet reached; #90/#154/#36 all confirmed clean**

- **State:** docs-only session. `docs/soak-deep-sweep-2026-08-20-final.{md,log}`
  (new — the milestone's final acceptance artefact), `PROGRESS.md`/
  `PROGRESS-archive.md` (this entry; 1360/1362 archived to keep the ledger
  at ~3). No `src/`/`tests/`/`tools/soak/` change — the sweep found zero new
  crash/hang signatures, so there was nothing to triage or fix.
- **Did:** swept `winning` seeds 0:480 (24×20-seed chunks, `--render-every
  0`, six batches of 4 parallel foreground processes) at master HEAD
  `a97d3b19` — the completed M-B tree (step 2a, swap-decline `781c8827`,
  #99/#100/#101/#103 fixes all folded). **480/480 OK, 0 CRASH, 0 HANG** (vs.
  238/240 OK, 2 CRASH in the 0:240 sweep that found #101/#103 — both fixes
  hold at double the range). carry≥7 205/480 (42.71%), carry≥14 54/480
  (11.25%), **carry≥21 5/480 (1.04%) — seeds 125, 271, 328, 406, 409**
  (vs. 1/240 (0.4%) previously — more than double the rate). carry≥28
  0/480 — not reached.
- **Deepest:** carry 21 (5 seeds, tied), battle-depth **27** (seeds 125,
  328, 409 — beats the prior deepest of 25 by two battles: the **full
  7-battle width** of the carry-21 challenge, not just partway). Verbose-
  traced all three via each seed's `draft confirm: YES` markers (a more
  reliable round-boundary marker than the prior doc's "open menu on slot 1"
  shorthand, which doesn't fire for every seed). Seed 328 is unambiguous —
  its own final `roundComplete` directly is the carry-21 round's result: it
  **wins the entire challenge outright** (first seed ever observed to do
  so). Seeds 125 and 409 hit the same 21/27 ceiling but *lose* battle 7 of
  that round instead (inferred from the ceiling itself: a win there would
  read `factoryWinStreak=28`/depth≥28 for the remainder of that seed's run,
  which never appears in either). **Headline: carry ≥ 28 — the full
  `CHECK_BAD_MOVE` + AI-triad tier — is not reached in this sweep; the
  closest approach is exact and three-seeds-deep: battle 7, the last battle,
  of the carry-21 challenge**, won once and lost twice.
- **Named-seed check:** #101 (seed 90), #102 (seed 154), #103 (seed 36) all
  in-range and clean — `roundLost carry<=0 depth<=3`, `roundLost carry<=0
  depth<=5`, `roundComplete carry<=14 depth<=20` respectively. #102 still
  does not reproduce (consistent with 1364's diagnosis-only finding); left
  open in `ISSUES.md` as-is (out of this step's scope).
- **Gates:** docs-only change, so `npm run test:smoke` run instead of full
  `npm test` per the brief's own rule; 444/444 green (baseline check before
  the sweep and unchanged after, since nothing under `src/`/`tests/`
  changed). No `npm run build` needed.
- **Next:** M-B's own queue is now empty from this worker's side — bar
  reached and reconfirmed at 2x range, zero live crashes, #102 diagnosis-
  only and out of scope. Supervisor closes M-B per ROADMAP.md convention
  (this worker does not edit ROADMAP.md). If a future step wants to chase
  carry≥28, the 328/125/409 chain above is the exact jumping-off point —
  battle 7 of the carry-21 round is the wall to push past.
- **Notes:** no PAPERCUT. Time discipline: 24-chunk sweep (6 parallel
  batches) landed by ~minute 22; the round-chain forensics for the
  deepest-2 write-up (goal 2) took longer than planned (~15 min) working
  out that `maxCarriedWinStreak`/`maxBattleDepth` are independent
  whole-run peaks, not paired to the same instant, and that "open menu on
  slot 1" isn't a reliable round-boundary marker — landed the doc inside
  the 45-min cap but with less slack than the brief's own 32-min
  chunk-launch cutoff implied.

---

## 1364 — [main worker, 2026-08-20] **M-B step 4 triage on #102: no fix, diagnosis-only landed — repro is gone on HEAD, one strong lead found and written up, one path ruled out**

- **State:** docs-only session. `ISSUES.md` #102 rewritten (root-cause
  paragraph replaced with today's findings; entry kept open, not deleted).
  No `src/`/`tests/` change. This entry.
- **Did:** seed 154 no longer reaches the original crash frame post-#101/#103
  (RNG trajectory shifted); reran the brief's fallback `--seeds 150:160`
  (10/10 OK), then the full original `--seeds 0:240` (240/240 OK, 0 CRASH,
  0 HANG) — not currently live-reproducible. Traced
  `BattleScript_HandleFaintedMon`'s script and the TS opcode ports and
  **ruled out** the straightforward paths: `openpartyscreen`/`switchhandleorder`
  are adjacent with nothing between them and share the same
  `selectorRoles.fainted` resolution; the opponent/AI branch of
  `Cmd_openpartyscreen` (`battleScriptOpenPartyScreenOpcode.ts:201-268`)
  never halts; the same-action double-KO + player-resume shape (Destiny
  Bond-class) is already pinned green
  (`tests/battleScriptFaintedActionsOrchestration.test.ts:290-331`).
  **Strongest remaining lead** (source-confirmed, not yet tied to this exact
  crash): `runDoBattlerEndTurnEffects` (`battleEndTurnOrchestration.ts:1497+`)
  bails its *entire* per-battler loop (not just the fainted battler's own
  remaining ticks) on the first battler that faints from an end-turn tick;
  the sole end-turn resume tag `"finish-end-turn-after-faints"`
  (`factoryBattleScriptFullTurnDecision.ts:2283`) always resumes at
  `runFutureAttacksAfterFaints`, never re-entering
  `runDoBattlerEndTurnEffects` for battlers it hadn't reached yet — a real,
  untested (`grep` for its resume tag/function across `tests/*.ts` is empty)
  divergence that silently skips a later battler's own end-turn residual
  effects for that turn. This explains a missed-damage class of bug on its
  own; I could not derive a clean single hop from it to the *specific*
  "no decided monToSwitchIntoId" crash message within this session's time.
- **Neighbourhood:** `--seeds 150:160` **10/10 OK**, 0 CRASH, 0 HANG.
- **Gates:** docs-only change, so `npm run test:smoke` run instead of full
  `npm test` per the brief's own rule; 444/444 green. No `npm run build`
  needed (no `src/`/`tests/` edits).
- **Next:** (1) write a Tier-1 test staging two battlers with pending
  end-turn ticks (both poisoned, earlier-ordered one faints and pauses) to
  confirm/fix the `runDoBattlerEndTurnEffects` skip above — likely needs a
  persisted per-battler-loop resume cursor (new shared boundary shape, not a
  small patch). (2) If a live seed reproducing #102's exact message turns
  up, capture full context (battler order, fault cause/order) before
  generalizing a fix. (3) M-B step-4 queue is otherwise empty (#101/#103
  done, #102 now diagnosis-only) — next up per 1363 is the final 0:240
  `winning` re-sweep with every folded lever, unless the supervisor
  redirects.
- **Notes:** no PAPERCUT. Spent longer than the 15-min diagnose budget
  (~40 min) because the brief's live-repro path was exhausted first (its own
  fallback instruction), then the source trace went deep enough to rule out
  the obvious mechanisms and find a real secondary bug before time ran out —
  landed the docs-only deliverable rather than rush an unverified `src/` fix.

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

Older entries: see `PROGRESS-archive.md`.
