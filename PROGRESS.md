# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 438 — [SUPERVISOR WIND-DOWN 2026-07-24 ~20:40] session summary

- **State:** tree committed and green at **182 files / 2180 tests**, build
  green, single main worktree, no unmerged branches, both oracles current
  (freshness gate PASS at session start). **No DEFERRED entries — nothing
  blocks the next `run-supervisor.sh`.**
- **Session (11 worker steps across 3 lanes + 2 supervisor folds, all
  verified green, zero trace regressions):**
  - **Main (3 steps):** S10 step (ii) closed — RUNG 4 registered
    `seteffectwithchance` + `tryfaintmon` (45 opcodes) with the
    evidence-backed correction that terminal `battleOutcome` belongs to
    `Cmd_checkteamslost`, not `tryfaintmon` (ISSUES #42/#43 filed). Step
    (iii) closed — opcode 73 `moveend` registered (46; state loop + all
    three postlude forms source-complete, 7 named barriers); the plain-hit
    scenario now runs to the script's own `end` at the banked 4-roll ledger.
    Tail step — #43's BS_TARGET arm fixed + opcodes 26/27 registered (48):
    the KO scenario now executes its **entire faint cutscene to script
    completion** (playfaintcry → … → cleareffectsonfaint → return →
    moveendall → end), rng.calls still exactly 4, barrier pin 18→21.
  - **Side (3 scouts, all merged):** `docs/presentation-seam-scout.md`
    (§3 checkpoint pack: `turn5-faint.json` recommended, 4 never-emitted
    event kinds, 8 named gaps); `docs/faint-outcome-ground-truth.md` +
    `tools/probe/verify-faint-outcome-ground-truth.ts` (16 live checks
    PASS, supervisor-rerun: minimal WIN path enumerated,
    `HandleFaintedMonActions` is a C-side orchestration loop, `getexp`
    Frontier-dead, `checkteamslost` reads party-wide HP);
    `docs/round-controller-outcome-seam.md` (`resolveRoundBattle` has zero
    production call sites; five-piece dependency-ordered step (iv) plan).
    **Supervisor decision (reversible, recorded):** step (iv)'s party-HP
    slice extends `BattleScriptRulesContext` in place (seam doc Option A).
  - **Animation (5 steps, 18→19 exact):** MIST_BALL rung 3
    (`AnimThrowMistBall` wired through the now-shared
    `animScriptInterpreter.ts`, 32/32 probe ticks first-try);
    `AnimTask_ShakeMon2` ported generically (64-move leverage; DRAGON_BREATH
    + BLAZE_KICK re-driven, hand-fits deleted, 85/85+85/85 / 78/78+78/78);
    MUD_SLAP verified already-`exact` (supervisor mis-scope; both
    comparators re-verified live 51/51×4); EMBER landed `partial` then
    promoted **`exact`** (63/63+63/63 both orientations) after a probe
    falsified the supervisor's creation-tick hypothesis — real bug was the
    attacker-vs-ember draw order from target-relative subpriority.
- **Next (in order):** main — S10 step (iv) using the three banked docs:
  `getexp`(short-circuit)/`checkteamslost`/`jumpifbyte` registration, the
  `HandleFaintedMonActions` orchestration equivalent, the Option-A party-HP
  slice (ISSUES #42), then the `submitBattleDecision` →
  `resolveRoundBattle` adapter. **Then the next battle-lane brief is the
  presentation-seam checkpoint (ROADMAP S10 §3, hard ordering constraint)**
  — `docs/presentation-seam-scout.md` is its evidence pack. Animation —
  next ranked track (ShakeMon2 call-site retirement in
  `statusAnimation.ts`/`faintAttack.ts` is a bounded option; or
  FIRE_SPIN/DRAGON_RAGE/FIRE_BLAST siblings). ISSUES #43's remainder
  (BS_FAINTED) is step-(iv) territory.
- **Notes:** two PAPERCUTS updated this session (post-KO staging entry
  already existed; new `isControllerIdle`-vs-scheduler-field entry). The
  moveend worker appended an accurate status-only checkpoint note to
  ROADMAP (supervisor-owned file; kept, boundary re-stated). No usage/rate
  limits hit; all lanes idle at wind-down.

---
## 437 — ISSUES #43 BS_TARGET fix + opcodes 26/27 (`dofaintanimation`/`cleareffectsonfaint`) — KO scenario's faint cutscene now runs to script completion

- **State:** tree green at **182 files / 2180 tests** (+8), build green.
  `createBattleScriptStatusRulesHandlers` now composes **48** opcodes (was
  46): opcode 26 `B_SCR_OP_DOFAINTANIMATION`/`Cmd_dofaintanimation` (in
  `battleScriptSourceCommands.ts`, reusing the existing
  `emitSelectedBattlerControllerEvent` pattern like `playfaintcry`, new event
  kind `faint-animation`) and opcode 27
  `B_SCR_OP_CLEAREFFECTSONFAINT`/`Cmd_cleareffectsonfaint` (new handler in
  `battleScriptHitChainOpcode.ts`, alongside `tryfaintmon`). The KO scenario's
  real-seed integration test (`battleScriptHitChainOpcode.test.ts` RUNG 4
  block) now walks the **full** faint cutscene — `playfaintcry` → `pause` (64
  ticks) → `dofaintanimation` → `cleareffectsonfaint` → `printstring` →
  `return` → `moveendall` (its own controller-delegated states 9/10
  acknowledged, matching the RUNG 1 pattern) — all the way to the script's own
  `end` (`haltReason.kind: "terminal"`), `rng.calls` still exactly **4**
  throughout, with the pinned 204-damage/HP-0/hpDealt-90 assertions unchanged.
- **Did:** `resolveRulesBattlerForBattleScript` (`battleScriptRulesContext.ts`)
  gained the `BS_TARGET` arm — `battle_util.c:694-734`'s unconditional `case
  BS_TARGET: ret = gBattlerTarget;`, mapped to the already-populated
  `selectorRoles.target` (additive, no redesign, per ISSUES #43's own
  diagnosis). `Cmd_cleareffectsonfaint` is source-complete for every
  battler-scoped field this engine already models: the ARENA-gated `status1`
  clear (computed off the real `battleTypeFlags` word, not a barrier — always
  true here since `hp==0` is guaranteed on this path), `status2`/`status3`
  zero, `statStages` reset to `DEFAULT_STAT_STAGE`, the modeled
  DisableStruct/ProtectStruct subset (`rolloutTimer`/`furyCutterCounter`/
  `tauntTimer`/`rechargeTimer`/`truantCounter`/`disabledMove`/`substituteHP`/
  `bounceMove`/`confusionSelfDmg`/`prlzImmobility`/`loveImmobility`/
  `stealMove`/`endured`/`helpingHand`/`chargingTurn`/`targetNotAffected`/
  `flag2Unknown`/`protected`/`usedDisabledMove`/`usedTauntedMove`/
  `usedImprisonedMove`/`flinchImmobility`), the cross-battler
  `STATUS2_INFATUATED_WITH(target)` clear (fully computable — the bit itself
  encodes the relationship, `gBitTable[battler]<<16`, no external field
  needed), and the target's own `moveHistory`/`choicedMove`/`lastTakenMove*`
  slots. Two new named **(b) barriers** (18 → 21 in this module, ratchet pin
  raised deliberately): `STATUS2_ESCAPE_PREVENTION` and `STATUS2_WRAPPED`
  cross-battler clears each need `gDisableStructs[].battlerPreventingEscape`/
  `gBattleStruct->wrappedBy` identity this engine doesn't model, so each
  halts only when its own bit is actually set on another battler (never true
  for a plain damaging-move KO — unreached on this rung's own scenario,
  reachability proven by direct construction in the new test). A third
  barrier reuses `resolveHitChainBattlerOperand`'s existing "not
  BS_TARGET/BS_ATTACKER" fallback for the Battle-Arena-only
  `BS_OPPONENT1`/`BS_PLAYER1` call sites (unrelated to Factory). The remaining
  FaintClearSetData sub-writes (`transformedMonPersonality`, `encoredMove`*,
  `protectUses`, `stockpileCounter`, `disableTimer`*, `perishSongTimer`*,
  `chargeTimer`*, `battlerWithSureHit`, `isFirstTurn`,
  `truantSwitchInHack`, `mimickedMoves`, ProtectStruct's
  `noValidMoves`/`fleeType`/`physicalDmg`/`specialDmg`/`physicalBattlerId`/
  `specialBattlerId`, `gActionSelectionCursor`/`gMoveSelectionCursor`,
  `gBattleResources->flags->flags`, the species-base `types` reassignment —
  this engine has no code path that ever moves `types` away from base, so
  leaving it untouched is exactly equivalent — and
  `ClearBattlerMoveHistory`/`ClearBattlerAbilityHistory`'s separate AI-history
  structure) have no reader anywhere in this engine's currently modeled
  scope and are not tracked, matching this file's existing
  datahpupdate/tryfaintmon precedent for untracked non-branching state
  (documented in the handler's own comment, not silently dropped). 8 new
  Tier-1 tests (registration + field-reset dispatch + infatuation-clear +
  three barrier-reachability tests for `cleareffectsonfaint`, registration +
  dispatch for `dofaintanimation`), plus the `resolveRulesBattlerForBattleScript`
  unit test extended with a positive `BS_TARGET` mapping case.
- **Next:** step (iv) — close the loop: one legal Level-50 Factory battle
  runs to a real terminal outcome through `submitBattleDecision`, and
  `roundController.ts` consumes that outcome instead of a fixture. Needs
  ISSUES #42 (`checkteamslost`/party-HP modeling) solved first, plus the
  `HandleFaintedMonActions` C-side orchestration-loop equivalent
  (`docs/round-controller-outcome-seam.md` has the five-piece plan, Option A
  decided). ISSUES #43's remainder (`BS_FAINTED`, needed only by
  `getexp`/`openpartyscreen`/`switchhandleorder`) stays open, trimmed to that
  scope — not on this rung's path and not silently closed.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only, per the banked ground truth); no new production imports of
  canonical recordings. `moveendall` expands to `setbyte sMOVEEND_STATE, 0` +
  `moveend 0, 0` (two instructions, `asm/macros/battle_script.inc:417-420`) —
  tripped up the integration test once (moveend loop started one instruction
  early); fixed by stepping the `setbyte` half first, matching the RUNG 1
  test's own pattern.

---
## 436 — S10 step (iii): opcode 73 (`moveend`) registered — hit chain now runs to script completion

- **State:** tree green at **181 files / 2166 tests** (+31), build green.
  `createBattleScriptStatusRulesHandlers` now composes **46** opcodes (was
  45): opcode 73 `B_SCR_OP_MOVEEND`/`Cmd_moveend`, in a new
  `src/engine/battleScriptMoveEndOpcode.ts`. The plain-hit staged integration
  test (`battleScriptHitChainOpcode.test.ts`'s RUNG 4 block) now runs
  `BattleScript_HitFromAtkCanceler` all the way through `moveend` to the
  script's own `end` (`haltReason.kind: "terminal"`), with the RNG ledger
  still exactly the banked 4 rolls (moveend itself draws none on this path).
  The KO scenario's block (`playfaintcry BS_TARGET`, ISSUES #43) is
  byte-for-byte unchanged — it never reaches `moveend`.
- **Did:** the do-while/switch state loop, `moveendState` increment
  semantics, and `endMode`/`endState` postlude (all three assembled forms:
  `moveendall`/`moveendcase`/`moveendto`-`moveendfromto`) are implemented
  source-completely — that's the opcode. Execution order is strictly numeric
  (0,1,...,16,17; the C file's *physical* case order is 0..7,11,12,8..10,13..17,
  but moveendState is a plain counter). States 0 (RAGE), 6 (CHOICE_MOVE), 7
  (CHANGED_ITEMS), 13 (SUBSTITUTE), 14 (UPDATE_LAST_MOVES), 15 (MIRROR_MOVE),
  and 16's singles path (NEXT_TARGET) are source-complete, mostly by reusing
  already-banked dependency-ladder reducers (`applyBattleScriptMoveEnd*Ownership`,
  `resolveBattleScriptMoveEndNextTarget`) from prior sessions. State 1
  (DEFROST) and 8-10 (sprite visibility) reuse the already-tested
  `executeBattleScriptMoveEndControllerCase` dependency step directly — no
  duplicated logic. Seven barriers, each gated on its own real trigger and
  each with a reachability + pass-through test in the new
  `tests/battleScriptMoveEndOpcode.test.ts` (ratchet pin added:
  `battleScriptMoveEndOpcode.ts` → 7): state 2/5 `ABILITYEFFECT_SYNCHRONIZE`/
  `ATK_SYNCHRONIZE`'s `ABILITY_SYNCHRONIZE` branch (`gBattleStruct->
  synchronizeMoveEffect` unmodeled); state 3 `ABILITYEFFECT_ON_DAMAGE`'s
  7 named contact abilities; state 4 `ABILITYEFFECT_IMMUNITY`'s 8 named
  status-curing abilities (any of the 4 battlers); state 11
  `ITEMEFFECT_MOVE_END`'s 9 named cure/restore hold effects (any battler);
  state 12 `ITEMEFFECT_KINGSROCK_SHELLBELL`'s King's-Rock/Shell-Bell branch
  (gated on `battleMoveDamage != 0`, matching source); state 16's doubles
  replay (`BATTLE_TYPE_DOUBLE`-gated, unreachable for Level-50 singles).
- **Scope discovery (say-why, not silent):** registering opcode 73 is global
  — `factoryBattleScriptDecision.ts`'s staged asleep-move adapter (TYROGUE/
  PLUSLE) had been deliberately relying on opcode 73 staying unregistered as
  its own stopping checkpoint (`phase: "move-end-barrier"`). Once registered,
  that script (which always reaches `BattleScript_MoveEnd`) now runs
  genuinely instead of halting there, reaching the same `end` terminal. Fixed
  minimally: `FactoryBattleScriptDecisionRules.phase` gained a
  `"script-complete"` member (reusing the existing `machine-barrier` boundary
  shape, now reporting `B_SCR_OP_END`/`Cmd_end` instead of the old
  unregistered-opcode landing site) rather than inventing a new shared
  `BattleBoundary` kind. Updated the 4 dependent assertions in
  `factoryBattleScriptDecision.test.ts` (opcode/dispatcher/instructionCount/
  phase/`moveendState`/the extra sprite-visibility event) and the stale
  `battle-script-move-end-facts.json` "evidence-only, unregistered" receipt
  field (regenerated via its extractor). Separately: the RUNG 1-3 hit-chain
  opcodes (`attackanimation`/`hitanimation`/etc.) gate on the injected
  `isControllerIdle` port, not on `BattleScriptSchedulerState.
  pendingControllerBattlers`, so the RUNG 4 test's manual step sequence never
  acknowledged the battlers they mark pending — invisible until moveend's
  controller-delegated states (states 1/8/9/10) started checking that real
  scheduler field. Fixed by acknowledging between steps in the test (matching
  what `factoryBattleScriptDecision.ts`'s own `acknowledgePendingControllers`
  already does in production) — not a production bug, a test-only gap.
- **Next:** step (iv) — close the loop: one legal Level-50 Factory battle
  runs to a real terminal outcome through `submitBattleDecision`, and
  `roundController.ts` consumes that outcome instead of a fixture. Needs
  ISSUES #42 (`checkteamslost`/party-HP modeling) solved first for a *real*
  terminal outcome. ISSUES #43 (`BS_TARGET` in
  `resolveRulesBattlerForBattleScript`) remains open and unrelated to this
  step — fixing it would let the KO scenario's faint cutscene advance past
  `playfaintcry`, but nothing here required it.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only); no new production imports of canonical recordings.
- **Supervisor fold (2026-07-24 ~20:15):** merged and verified at **182
  files / 2172 tests**, build green: (1) side-lane step (iv) prep —
  `docs/faint-outcome-ground-truth.md` + `tools/probe/
  verify-faint-outcome-ground-truth.ts` (16 live checks PASS, reran
  independently: six unregistered opcodes on the minimal WIN path;
  `HandleFaintedMonActions` is a C-side orchestration loop, not an opcode;
  `getexp` dead for Frontier; `checkteamslost` reads party-wide HP; ISSUES
  #43 is two selector gaps, BS_TARGET + BS_FAINTED) and
  `docs/round-controller-outcome-seam.md` (`resolveRoundBattle` has zero
  production call sites; five-piece dependency-ordered seam plan).
  **Decision (supervisor, reversible):** the step (iv) party-HP slice uses
  the seam doc's **Option A** — extend `BattleScriptRulesContext` in place,
  the established RUNG-2/3 growth pattern — not a second wrapper context.
  (2) animation lane — MOVE_EMBER at honest `partial` (63/63+63/63 opponent
  orientation; 63/63+61/63 player orientation, 2-frame creation-tick
  remainder of the known same-frame-sprite-step class; two real bugs fixed
  en route: descending `sSpriteOrder` tie-break, wrong full-HP fixture
  assumption) after a MUD_SLAP verification pass (already `exact` since
  `c1df4a9`; both comparators re-verified live 51/51×4 — supervisor
  mis-scoped that brief, per-move status now checked before briefing).
  A follow-up worker on the 2-frame remainder is in flight. (3) the moveend
  worker's ROADMAP checkpoint note is accurate status-only content — kept,
  with the reminder that ROADMAP stays supervisor-owned. Fixed the RUNG 4 KO
  test's stale title (it blocks at `playfaintcry`, not `dofaintanimation`);
  appended the `isControllerIdle`-vs-scheduler-field papercut to
  PAPERCUTS.md.

