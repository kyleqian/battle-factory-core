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
## 499 — [BOUNDED WORKER 2026-07-27 ~03:45] Thrash Rung 5 landed: ENDTURN_THRASH end-turn case (lock countdown + final-turn confusion transition) — plus a real design-doc gap in the ThrashConfuses gating condition

- **State:** tree green at **235 files / 3311 tests** (+6 tests over this
  session's own starting baseline, 235/3305 — that starting count already
  included a side-lane merge landed after entry 498 was written, not a
  discrepancy), `npm run build` clean. Census re-run **byte-identical**
  (94/214 effects, 191/355 moves, 153/276 Factory-L50, 1900/2957 weighted,
  `git status --porcelain docs/executable-frontier-census.md` empty) —
  expected and confirmed: like Rungs 2/3, this is an end-turn-tick reducer
  change, not a move-execution dispatch change, so the census (which only
  walks move scripts) has nothing new to count. `executableFrontierRatchet
  .test.ts` unmoved (6/6 green, zero new barriers — this rung wires an
  *existing* reachable case-barrier into a real reducer rather than adding
  an `unsupportedBranch` call site).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` §4/Rung 5 exactly as
  scoped. New `runThrashTick` in `battleEndTurnOrchestration.ts`, replacing
  the `:1183`-area case-barrier (`STATUS2_LOCK_CONFUSE set but
  BattleScript_ThrashConfuses is not wired`) Rung 4 made live for the first
  time: (1) decrements `STATUS2_LOCK_CONFUSE` by one turn unit (new
  `BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE_TURN_1` constant in
  `battleScriptSourceConstants.ts`, same shape as Yawn's own `_TURN_1`);
  (2) `WasUnableToUseMove` takes priority over the lock-expiry branch — this
  rung's own required first action (per the design doc's `UNVERIFIED` flag)
  found it **already fully ported** as `wasBattleScriptBattlerUnableToUseMove`
  (`battleScriptRulesContext.ts:892-906`, the exact 9-flag OR-chain, already
  exercised by `battleScriptMoveEndControllers.ts:209`) — not a gap to fill,
  same "already built, just verify" shape as Rung 4's own `gLockedMoves`
  finding; when true, the shared `cancelBattleScriptMultiTurnMoves` helper
  (already landed for Yawn/admission) clears the WHOLE lock outright, no
  confusion, regardless of counter value; (3) on the lock-expiry branch,
  extracted `applyConfusionMoveEffect`'s own state-mutation body into a new
  exported `applyConfusionStatus2Mutation` (`battleScriptHitChainOpcode.ts`)
  — same Own-Tempo/already-confused early-out + `(Random() % 4) + 2` duration
  roll + status2 write, now shared by both the move-execution CONFUSION case
  and this end-turn call site instead of duplicated; refactor is behavior-
  preserving (`applyConfusionMoveEffect`'s own existing tests all still pass
  unchanged). Ported the `hp === 0` early-out too (`SetMoveEffect`'s own
  generic gate, not primary-gated, unlike the dead Shield-Dust/Safeguard/
  Substitute checks — those three ARE dead here, cited why in-file).
- **Real citation gap found and fixed (verify-each-citation bar, same class
  as Rung 4's `jumpifstatus2` finding):** the design doc's §4 prose
  characterizes the reducer as "run `BattleScript_ThrashConfuses` via
  `runTickScript`" without naming source's own inner gate,
  `if (status2 & STATUS2_CONFUSION) BattleScriptExecute(BattleScript_
  ThrashConfuses)` (`battle_util.c:1688-1689`) — verified directly against
  source this session: the script only runs when `SetMoveEffect`'s own
  confusion branch actually wrote the bit (i.e. NOT Own Tempo, NOT hp===0).
  An Own-Tempo-holding or fainted lock-in target clears its lock **silently
  — no script, no message** — ported as an explicit `mutation.confused`
  branch, not assumed unconditional. Also verified live: source's own
  `!(status2 & STATUS2_CONFUSION)` outer gate (guarding the whole SetMoveEffect
  call) is genuinely LIVE at this call site (an opponent's own confusion
  move could pre-empt it), unlike `applyThrashMoveEffect`'s dead inner
  check — flagged explicitly rather than assumed dead by analogy.
- **Rung 4's own remainder note (WasUnableToUseMove `UNVERIFIED`) resolved:**
  confirmed already-built, cited above — no new module touched for it.
- **Tier-1 (+6, new "ENDTURN_THRASH" describe block in
  `tests/battleEndTurnOrchestration.test.ts`):** mid-lock decrement (no
  confusion, zero RNG); final-turn transition (MULTIPLETURNS clears,
  `STATUS2_CONFUSION` lands via the exact `(Random() % 4) + 2` roll, exactly
  1 RNG draw, `result.kind === "next-turn"` proving `BattleScript_
  ThrashConfuses` runs cleanly to its own `end2` — the brief's own asked-for
  pass-through test); `WasUnableToUseMove` (flinchImmobility) cancelling the
  whole lock outright even on what would've been the final turn, zero RNG;
  already-confused-from-another-source blocking the transition (MULTIPLETURNS
  still clears, existing confusion duration untouched); Own Tempo blocking
  the confusion write silently (zero RNG, no script); no-lock-bit-set no-op.
  The `hp === 0` gate is ported but **not independently Tier-1-pinned**
  (documented in-file): constructing a battler at hp===0 through the full
  `runBattleEndTurnOrchestration` harness always routes into
  `HandleFaintedMonActions`'s own switch-decision barrier
  (`GetMostSuitableMonToSwitchInto`'s unmodeled AI_CalcDmg fallback)
  regardless of Thrash state — confirmed live with a plain hp===0 probe
  fixture carrying zero Thrash state, same barrier — staging a genuine
  same-pass faint plus a real switch decision is out of proportion here.
- **Live fixture: NOT attempted — Tier-1-only**, an explicitly acceptable
  resting point per the brief. Rung 4's own TAUROS live-fixture remainder
  (lock-in bits across turns + confusion onset, read-only) is still open;
  folding it into one TAUROS fixture spanning lock-in start through
  confusion onset is the natural live-fixture followup, not attempted this
  session (time went to the citation-verification finding above instead).
- **Next:** Rung 6 (a second `ENDTURN_ITEMS2` trigger fixture, Persim Berry
  curing Thrash-fresh confusion — verification-only, zero new code per the
  design doc's own §7) is next on the ladder and explicitly NOT started per
  this step's own scope boundary — the next session's natural first brief.
  The TAUROS live-fixture remainder (Rung 4+5 combined) is also open, either
  as Rung 6's own prerequisite live-proof or a parallel pickup.
- **Notes:** no PAPERCUT. Archived entry 496 to `PROGRESS-archive.md` to
  keep this ledger at 3 entries. The `BattleScriptExecute` conditional gap
  (a real blocker the design doc's own prose glossed over) was the only real
  deviation from plan — found by tracing the source's own nested `if`
  directly rather than trusting the prose summary, fixed narrowly via the
  `mutation.confused` branch, and named here per the brief's own
  prove-or-refute bar.

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

