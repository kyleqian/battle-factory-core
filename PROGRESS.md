# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

---
## 498 — [BOUNDED WORKER 2026-07-27 ~03:05] Thrash Rung 4 landed: CONFUSEIFREPEATINGATTACKENDS + MOVE_EFFECT_THRASH lock-in start — plus a real jumpifstatus2 gap the design doc's own citation table missed

- **State:** tree green at **234 files / 3300 tests** (+1 file/+7 tests over
  entry 497's 233/3293), `npm run build` clean. `executableFrontierRatchet
  .test.ts` unmoved (6/6 green, **zero new barriers** — the new opcode file
  has no `unsupportedBranch` call at all, same shape as Rung 1's
  `battleScriptSetyawnOpcode.ts`; widening `JUMPIFSTATUS2_VALUES`'s Map
  doesn't add a call site either). Census: **94/214 effects (+1), 191/355
  moves (+3), 153/276 Factory-L50 unweighted (+2), 1900/2957 weighted (+6)**
  — `EFFECT_RAMPAGE` flips `blocked-on-opcodes` → `executable`; smaller than
  the design doc's own raw-catalog estimate (9 entries, 2+2+5 unweighted)
  because that count wasn't rental-tier-filtered, same shape as Rung 1's own
  raw-vs-weighted correction (entry 494).
- **UNVERIFIED item resolved (this rung's own required first action,
  design doc §3):** `gLockedMoves[battler]`/forced-repeat-move selection is
  **NOT modeled anywhere in this engine, and deliberately stays that way.**
  Grepped `battleScriptActionAdmission.ts`'s existing `STATUS2_MULTIPLETURNS`
  references first, per the brief — all of them are Bide's own counter/
  clearing-owner tracking (`:3163-3379`) or the no-PP-block check
  (`:3696-3710`); none reads `gLockedMoves` or re-derives which move a
  battler uses. Source's real reader is `HandleAction_UseMove`
  (`battle_util.c:79-135`), the per-battler "which move does this turn
  execute" dispatcher that runs once per action, *before*
  `Cmd_attackcanceler`/this engine's Battle Script machine ever starts —
  grepped for it directly (`HandleAction_UseMove`, `gChosenMoveByBattler`,
  `noValidMoves`, `encoredMove`) across `src/`: zero hits outside doc-comment
  citations. Confirmed architecturally, not just by absence: every call site
  that starts a move's execution anywhere in this codebase
  (`factoryBattleScriptFullTurnDecision.ts:568-599`'s `buildActionContext`/
  `runMoveAction`, every Tier-1/battle-lab fixture) takes the move id as a
  **given external input**, never derives it internally — there is no
  ported `HandleAction_UseMove` equivalent for `gLockedMoves` to plug into
  at any layer. Landed the same way `runYawnTick` (Rung 2) omitted
  `UproarWakeUpCheck` and `applySetMoveEffect`'s own `MOVE_EFFECT_SLEEP`/
  `MOVE_EFFECT_FREEZE` cases already omit `CancelMultiTurnMoves`: cited,
  proven-unobservable state writes are skipped, not ported as dead fields.
  Not a Rung 4b split — there was no subsystem-sized gap to split, only a
  one-line write with no reader anywhere in scope.
- **Real citation gap found and fixed (verify-each-citation bar, not a
  planned deliverable):** the design doc's §3 script enumeration marked
  `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_
  EffectRampage2` as `[registered]` — true only for the bare *opcode*;
  `Cmd_jumpifstatus2`'s operand-VALUE narrowing (`battleScriptStatbuffchangeOpcode.ts`'s
  `JUMPIFSTATUS2_VALUES` map) covered only `STATUS2_SUBSTITUTE`/
  `STATUS2_CONFUSION`, not `STATUS2_MULTIPLETURNS` — confirmed live: a
  from-`BattleScript_EffectRampage` pass-through test halted on
  `unsupported-branch` at this exact instruction, on the very first
  Thrash-family use, before `confuseifrepeatingattackends` was ever
  reached. Widened the Map with `STATUS2_MULTIPLETURNS` (same (a)-real,
  same-shape widening as the existing CONFUSION entry) — real, reachable,
  load-bearing for every Thrash/Outrage/Petal Dance use, not (b) material.
  Zero ratchet impact (widening the Map isn't a new `unsupportedBranch` call
  site). Fixed two now-stale pre-existing tests that depended on the old
  gap: `battleScriptStatbuffchangeOpcode.test.ts`'s barrier test (picked
  "first non-SUBSTITUTE jumpifstatus2 site" as its halt example, which was
  exactly this Rampage instruction — repointed to an explicit still-
  unsupported set) and `battleScriptRulesContext.test.ts`'s 109-handler
  inventory test (now 110, `+140`).
- **Did:** new `battleScriptConfuseifrepeatingattackendsOpcode.ts`
  (`Cmd_confuseifrepeatingattackends`, `battle_script_commands.c:7131-7136`,
  zero operands, no jump target — stages `moveEffectByte = MOVE_EFFECT_THRASH
  |MOVE_EFFECT_AFFECTS_USER` only when the attacker isn't already
  `STATUS2_LOCK_CONFUSE`'d, else leaves it untouched, always advances),
  registered under `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` (opcodeId 140) in
  `battleScriptRulesContext.ts`. New `applyThrashMoveEffect` case in
  `battleScriptHitChainOpcode.ts`'s `applySetMoveEffect` (`MOVE_EFFECT_THRASH`
  = 53, widened into `SET_MOVE_EFFECT_SUPPORTED_BYTES`): single early-out on
  `STATUS2_LOCK_CONFUSE` already set (source's own inner `if` is dead here —
  `sStatusFlagsForMoveEffects[MOVE_EFFECT_THRASH] == STATUS2_LOCK_CONFUSE`
  means the shared family-B early-out already excludes it, verified by
  direct read of `:2523-2524`, same single-early-out shape as
  `applyFlinchMoveEffect`/`applyWrapMoveEffect`), else sets
  `STATUS2_MULTIPLETURNS | STATUS2_LOCK_CONFUSE_TURN((Random()&1)+2)` and
  **advances (no script call)** — unlike every status1-family case and
  `MOVE_EFFECT_CONFUSION`, `SetMoveEffect`'s own THRASH case just `break`s.
- **Tier-1 (+7, new `tests/battleScriptConfuseifrepeatingattackendsOpcode
  .test.ts`):** direct opcode tests (stages the byte when unlocked, leaves
  it untouched when locked, zero RNG either way); `applySetMoveEffect` case
  tests via the established `stepAtSetEffectWithChance`-style direct-PC-patch
  convention (Wrap's own precedent) — not-locked path draws exactly 2 RNG
  calls (seteffectwithchance's own unconditional percentChance roll,
  MOVE_THRASH's `secondaryEffectChance=100` still calls `Random()` per house
  convention, plus the nested duration draw), turns land in [2,3], attacker
  only (target untouched, confirming `MOVE_EFFECT_AFFECTS_USER` routing);
  already-locked path draws exactly 1 (seteffectwithchance's own roll only,
  no nested draw). Plus the pass-through test the brief asked for: real
  script wiring from `BattleScript_EffectRampage` through attackcanceler/
  accuracycheck/attackstring/(jumpifstatus2)/ppreduce/confuseifrepeatingatt
  ackends into `BattleScript_HitFromCritCalc`, both fresh (ppreduce runs,
  byte staged) and already-mid-lock (jumpifstatus2 skips straight to
  `BattleScript_EffectRampage2`, ppreduce does NOT re-run) — the **lock-in
  START runs to completion**, per this rung's own scope (the confusion END
  is Rung 5, not attempted). Stops at `BattleScript_HitFromCritCalc`'s own
  entry rather than running through real damage calc, matching this
  codebase's established convention (`battleScriptHitChainOpcode.test.ts`'s
  own `stepAtOpcode` comment: "critcalc/damagecalc/typecalc all recompute
  battleMoveDamage from the battlers' raw stats, which a focused
  single-opcode test does not want to also have to set up realistically").
- **Live fixture: NOT attempted this session — Tier-1-only.** Per the
  brief's own time-split guidance, landing the opcode+case+citation-gap-fix
  with tests green is the deepest committable resting point; a real TAUROS
  (`MOVE_THRASH`, Factory-L50 carrier per the design doc's own table)
  live-fixture observation of the lock-in bits landing is the clean
  remainder for whoever picks this back up (either finishing Rung 4's own
  live corroboration, or folding it into Rung 5's own TAUROS fixture per
  §7's Rung 5 pass-through test description, which already plans to extend
  "Rung 4's TAUROS fixture").
- **Next:** Rung 5 (`ENDTURN_THRASH` — wiring the already-scaffolded
  case-barrier at `battleEndTurnOrchestration.ts` into a real reducer,
  extracting/reusing `applyConfusionMoveEffect`'s state-mutation logic and
  calling `BattleScript_ThrashConfuses` via `runTickScript`, **never**
  `BattleScript_MoveEffectConfusion` per §4's load-bearing discard finding)
  is next per the design doc's own ladder — explicitly out of scope for
  this step and not started. Landing Rung 4 makes `ENDTURN_THRASH`'s
  case-barrier live for the first time (any battler with `STATUS2_LOCK_
  CONFUSE` now reaches its next end-turn pass) — this is the ratchet
  working as intended (loud, named barrier) if some future fixture reaches
  it before Rung 5 lands, not a regression. `WasUnableToUseMove`
  (`battle_util.c:890-902`) is Rung 5's own first UNVERIFIED action per the
  design doc, unstarted here.
- **Notes:** no PAPERCUT. Archived entry 495 to `PROGRESS-archive.md` to
  keep this ledger at 3 entries. The `jumpifstatus2` gap (a real blocker
  the design doc's own census missed, same shape as Rung 1's accuracycheck
  gap) was the only real deviation from plan — found by verifying the
  citation live rather than trusting the table, fixed narrowly, and named
  here per the brief's own prove-or-refute bar.

---
## 497 — [BOUNDED WORKER 2026-07-27 ~02:40] `turn3-rockslide.json` wired from kernel semantic events — closes the entire Grovyle ROCK_SLIDE HP chain (turns 1/3/4/5 all staged now)

- **State:** tree green at **233 files / 3293 tests** (unchanged — this step
  is pure wiring, no new tests; matches the count already banked at the
  `docs/presentation-seam-scout.md` §10 prep-scout commit, `e5465e4`),
  `npm run build` clean. `executableFrontierRatchet.test.ts` unmoved (6/6
  green, no new barrier — this step touches zero opcodes).
- **Did:** executed §10.3's ordered wiring plan exactly, in `battleScene.ts`
  only (the staging module `turn3RockSlidePresentationStaging.ts` and its
  test landed with §10, unwired — consumed here, not rebuilt): (1) imported
  `resolveTurn3RockSlideHpEndpoints` and hoisted a module-level
  `TURN3_ROCKSLIDE_HP` constant (mirroring `TURN4_ROCKSLIDE_HP`'s own
  pattern); `drawTurn3RockSlideAttack` (`:6707`) and
  `drawTurn3RockSlideTurnEndSettledMenu` (`:6744`) now read
  `TURN3_ROCKSLIDE_HP.from`/`.to` instead of the direct
  `anchorOpponentAfterTurn2Hp`/`anchorOpponentAfterTurn3Hp` literal reads;
  (2) `drawTurn3RockSlideWindow`'s attack-text branch now reads the
  already-resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2` constants instead of the
  raw `ROCK_SLIDE_LINE1`/`ROCK_SLIDE_LINE2` literals — the fourth and final
  ROCK_SLIDE call site to make this swap (turns 1/5 already had; turn 4 never
  needed to). (3) Left `anchorPlayerAfterTurn3Hp`'s steady overlay (Onix's own
  HP, not a drain endpoint of this window) as a literal, per §10.3 step 3's
  own "narrow to what's actually unblocked" instruction — named, not
  silently skipped. No new rendering branches; choreography helpers
  (`rockSlideBg3Y`/`rockSlideRockState`/etc.) untouched, byte-for-byte, per
  §10.2's own "zero code changes needed" finding.
- **Acceptance (§10.4's bar, all re-run this session from this lane's
  Battle-Scene-OFF oracle, `127.0.0.1:8014`):** `turn3-rockslide.json`
  **256/256** (both swaps landed clean on the first try — no bisection
  needed), re-run twice for determinism, both 256/256. Named adjacent
  regression sweep, all at their recorded counts, unchanged:
  `turn3-endeavor.json` 192/192, `turn1-rockslide.json` 256/256,
  `turn4-rockslide.json` 250/250, `turn5-rockslide.json` 256/256,
  `turn5-faint.json` 110/110, `turn4-doubleteam.json` 250/250,
  `turn4-menu.json` 44/44. `npm test` (233/3293) and `npm run build` both
  green. Only `src/engine/battleScene.ts` touched (`git status --porcelain`
  confirms); no docs/presentation-seam-scout.md edits (owned by this round's
  side scout, per the step brief).
- **Next:** the Grovyle ROCK_SLIDE HP chain (turns 1/3/4/5) is now fully
  kernel-staged end to end — ISSUES #39's window-by-window retirement path
  has one complete, closed arc as a template. Per §10's own "candidates
  weighed" table, the next cheapest unconverted window is `turn3-endeavor.json`
  (ONE new staged hit chain, 101->88, reusing `turn5EndeavorPresentationStaging
  .ts`'s already-proven MOVE_ENDEAVOR pattern — same zero-new-code shape this
  step just used) or `turn4-doubleteam.json`'s STAT_ROSE banner, now
  possibly unblocked by this week's fresh `stat-stage-change` production
  emission-site finding (§10's own intro note) but NOT yet verified live —
  a future prep-scout's job, not assumed here. Yawn/Thrash rungs 4-6 remain
  the other MAIN-lane program track (entry 496's own Next), independent of
  this presentation-seam work.
- **Notes:** no PAPERCUT. Archived entry 494 to `PROGRESS-archive.md` to keep
  this ledger at 3 entries. Both §10.3 swaps were exactly as clean as the
  scout claimed — no divergence to bisect, no literal left un-swapped beyond
  the one §10.3 itself named as a residual (`anchorPlayerAfterTurn3Hp`).

---
## 496 — [BOUNDED WORKER 2026-07-27 ~02:10] Yawn Rung 3 landed: ENDTURN_ITEMS2 registered with real moveTurn gating — the item the whole Yawn track was roadmapped to unblock (entries 460-464) is now live

- **State:** tree green at **232 files / 3286 tests** (+4 over entry 495's
  3282), `npm run build` clean. Census re-run **byte-identical** (93/214
  effects, 188/355 moves, 151/276 Factory-L50, 1894/2957 weighted, all 32
  checks pass, `git status --porcelain docs/executable-frontier-census.md`
  empty) — expected and confirmed: like Rung 2, this is an end-turn-tick
  reducer change, not a move-execution dispatch change, so the census (which
  only walks move scripts) has nothing new to count.
  `executableFrontierRatchet.test.ts` unmoved (6/6 green, no new barrier —
  zero new opcodes, per the design doc's own "zero additional opcode work"
  finding, now proven true in practice not just analytically).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` §5/Rung 3 exactly as
  scoped, re-verifying every row of §5's gate table against the raw C
  switch (`battle_util.c:3257-3625`) rather than trusting the table blind —
  confirmed both `ENDTURN_ITEMS1` and `ENDTURN_ITEMS2` call the exact SAME
  `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, moveTurn)` caseID
  (`battle_util.c:1500-1505`), only the boolean differs (the design doc's
  own prose didn't name the caseID explicitly; a first-draft test docstring
  mislabeled it `ITEMEFFECT_MOVE_END` — a different, unrelated caseID used
  elsewhere — caught during this session's own re-verification and fixed).
  `runItemsTick` (`battleEndTurnOrchestration.ts:818`) now takes a
  `moveTurn: boolean` fourth parameter; per §5's table, four rows
  short-circuit to `"advance"` when `moveTurn` is true — `HOLD_EFFECT_
  LEFTOVERS`, the Liechi/Salac/Petaya stat-up berries, and the `RESTORE_HP`/
  `RESTORE_PP`/`UNREACHABLE_AT_FACTORY_L50` case-barriers (source's own case
  does nothing at all at ITEMS2, so a barrier there would be spurious) —
  White Herb and the 8 zero-RNG cure branches stay unconditional (no gate in
  source). The `:992`-area `// ENDTURN_ITEMS2: ... no-op.` comment is
  replaced with the real second call site (`moveTurn=true`), positioned
  right after `ENDTURN_YAWN` per the real `turnEffectsTracker` enum order.
- **Tier-1 (+4, `tests/battleEndTurnOrchestration.test.ts`, new "(g)
  ENDTURN_ITEMS2" describe block):** three no-double-fire regression tests,
  one per gated row class, each constructed so the row's fire condition is
  **false at ITEMS1 but would turn true by ITEMS2** via an intervening burn
  tick (the one modeled mid-tick HP mutator), proving the gate suppresses it
  even then — not just when the condition was already false throughout:
  **"Leftovers heals exactly once per tick"** (100/160 HP, heals to 110 —
  NOT 120, which an ungated second ITEMS2 heal would produce); **"Liechi
  Berry does NOT fire at ITEMS2 even though burn drops HP below its
  threshold mid-tick"** (30 HP > 25-threshold at ITEMS1, burn deals 12 →
  18 HP <=25 by ITEMS2, ATK stage stays 6, item uneaten); **"Sitrus Berry's
  RESTORE_HP case-barrier does NOT fire at ITEMS2"** (55 HP > 50-threshold
  at ITEMS1, burn deals 12 → 43 HP <=50 by ITEMS2, result stays "next-turn"
  not "case-barrier"). Named in-file: `RESTORE_PP`/`UNREACHABLE_AT_
  FACTORY_L50` share the identical `!moveTurn &&` gate shape (verified by
  direct code read) but have no modeled mid-tick PP/possession mutator to
  exercise the same live before/after transition — not silently skipped,
  explicitly called out as structurally unexercisable this rung. Plus the
  brief's own called-for **REAL TRIGGER test**: a Chesto-Berry holder with
  `STATUS3_YAWN_TURN_1` — Yawn's own transition writes the sleep bit, then
  the SAME tick's `ENDTURN_ITEMS2` cures it before the sleep status is ever
  "felt" (final `status1===0`, item consumed, exactly 1 RNG draw — Yawn's
  own sleep-turn roll, the cure itself costs none), reusing Rung 2's staged
  lifecycle as the vehicle per the brief.
- **Live fixture (`tools/battle-lab/mechanic-yawn-endturn-items2-chesto-
  off.json`, extends Rung 2's GULPIN-vs-MAGIKARP fixture with MAGIKARP now
  holding a Chesto Berry, item 134):** confirms the engine's real-trigger
  test against the ROM itself, not just analytically. Trajectory (frames
  from a dense binary search, `/tmp` scratch captures, final curated list
  banked in the fixture): **status1 0 → 5 at frame 1260** (`ENDTURN_YAWN`'s
  sleep transition, "Foe MAGIKARP fell asleep!", matches Rung 2's own
  ledger) → **status1 5 → 0 between frames 1308-1310** (the C-side
  `status1 &= ~STATUS1_SLEEP` write happens as `BattleScript_
  BerryCureSlpEnd2` starts, BEFORE its own message text even changes on
  screen — the message still reads "fell asleep" through 1310) → **item
  134 → 0 between frames 1462-1464** (screenshot: "Foe MAGIKARP's CHESTO
  BERRY woke it from its sleep!", the script's own `removeitem` opcode
  running ~150 frames after the C-side status write, same
  status-clears-before-item-consumes delay pattern independently confirmed
  against the ALREADY-BANKED `mechanic-endturn-items1-cure-par-off.json`
  fixture, frames 613 vs 751). All within the SAME end-turn pass — no
  further player input occurred after MAGIKARP's own turn-2 action, and the
  whole Yawn→sleep→Chesto-cure sequence resolved automatically. This is the
  design doc §5's own worked example, now live-proven both ways (engine
  Tier-1 test + ROM oracle trace agree on final state).
- **Next:** Rung 3 (ITEMS2, this step) closes the critical path 1→2→3 to
  `ENDTURN_ITEMS2`. Rungs 4-6 (Thrash-family: `CONFUSEIFREPEATINGATTACKENDS`
  + `MOVE_EFFECT_THRASH` move-execution, then `ENDTURN_THRASH`, then a
  second `ENDTURN_ITEMS2` fixture via Persim Berry) are independent,
  lower-priority follow-ups per the design doc's own §7 ladder — explicitly
  out of scope for this step, next MAIN-lane program item if session time
  allows. Rung 4's own first action (reading `battleScriptActionAdmission.ts`
  for `gLockedMoves`/forced-repeat-move wiring) is un-started.
- **Notes:** no PAPERCUT. Ratchet/census both unmoved, as expected and
  confirmed (named above). Landed comfortably inside the ~40-minute
  first-half guidance (moveTurn threading + gates + no-double-fire tests),
  leaving the remainder for the live fixture (the harder half, per entry
  495's own precedent of binary-searching transition frames) — both halves
  finished inside the overall cap, so no remainder needs naming beyond
  Rungs 4-6 above.

