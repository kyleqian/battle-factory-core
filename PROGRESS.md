# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 439 — S10 step (iv) part 1/3: party-HP slice + jumpifbyte/getexp/checkteamslost registered — real `battleOutcome` 0 -> 1 now computed from party state

- **State:** tree green at **185 files / 2217 tests** (+3 files / +37 tests
  from entry 438), build green. `createBattleScriptStatusRulesHandlers` now
  composes **51** opcodes (was 48): `B_SCR_OP_JUMPIFBYTE` (41),
  `B_SCR_OP_GETEXP` (35), `B_SCR_OP_CHECKTEAMSLOST` (36), each in its own new
  module (`battleScriptJumpifbyteOpcode.ts`/`battleScriptGetexpOpcode.ts`/
  `battleScriptCheckteamslostOpcode.ts`) with a dedicated Tier-1 test file.
  ISSUES #42 closed (deleted, not just marked). ISSUES #43 unchanged and
  still open (`BS_FAINTED`, needed by `getexp`'s barrier and step (iv)'s
  still-unbuilt orchestration loop).
- **Did (in dependency order, per the supervisor's Option A decision in
  entry 438 — not relitigated):** (1) `BattleScriptRulesContext` extended in
  place with a per-side, 6-slot `{species, isEgg, hp}` party array plus a
  `partyIndex` field on each active battler
  (`docs/faint-outcome-ground-truth.md` §3.2) — mechanical blast radius only,
  new fields default to empty/0 so all ~80 existing construction sites are
  untouched. (2) `Cmd_datahpupdate`'s real HP write
  (`battleScriptHitChainOpcode.ts`) now also writes the matching party slot
  at the active battler's own side/partyIndex, pinned by two new Tier-1
  tests. (3) `B_SCR_OP_JUMPIFBYTE` — source-complete byte-compare +
  conditional jump, all six `CMP_*` comparators (individually proven via a
  synthetic-operand harness against a real instruction's shape, since no
  compiled call site pairs `CMP_COMMON_BITS`/`CMP_NO_COMMON_BITS` with a
  resolvable value); the memByte/value resolver covers every pointer this
  rung's WIN path and this engine's other modeled fields touch, with one
  unified barrier for the rest of the program's 56 call sites (1 barrier).
  (4) `B_SCR_OP_GETEXP` registered for exactly the Frontier short-circuit
  `BattleScript_GiveExp` always takes for a Factory battle (state 0 and
  state 6 source-complete, including the real two-VM-step cadence real
  hardware uses since `Cmd_getexp` has no do-while); the general EXP/
  level-up/evolution machinery (states 1-5) and the `BS_FAINTED` selector
  are each one named barrier, both proven reachable and both proven crossed
  without halting on the real Factory path (2 barriers). (5)
  `B_SCR_OP_CHECKTEAMSLOST` sums the new party slice exactly per source
  (species-nonzero, non-egg gated) and writes `battleOutcome`; three
  barriers on their own real, Factory-unreached conditions
  (`BATTLE_TYPE_INGAME_PARTNER`+Steven, `BATTLE_TYPE_ARENA`'s per-mon
  exclusion, link-battle empty-spot counting), each reachable + pass-through
  tested (3 barriers). A staged integration test
  (`battleScriptCheckteamslostOpcode.test.ts`) stages `BattleScript_GiveExp`
  then `BattleScript_HandleFaintedMon` (carrying the same rulesContext
  forward, matching prior rungs' staged-entry convention) and asserts
  `battleOutcome` goes 0 -> 1 purely from `checkteamslost`'s own sum over an
  all-fainted opponent party — not injected. Ratchet updated: three new
  `PINNED_BARRIER_COUNTS` entries (1/2/3, named above) and the composed-
  handler-count test bumped 48 -> 51. The existing KO scenario integration
  test is byte-for-byte unchanged (rng.calls 4, damage 204, HP 0).
- **Next:** step (iv) parts 2-3 (out of this rung's scope, still needed
  before `roundController.ts` can consume a real outcome): the C-side
  `HandleFaintedMonActions` orchestration-loop equivalent (drives
  `BattleScript_GiveExp` then `BattleScript_HandleFaintedMon` per fainted
  battler once a hit chain's own `moveend` reaches its terminal state —
  `docs/faint-outcome-ground-truth.md` §3.1); the `BS_FAINTED` selector role
  the orchestration loop needs (ISSUES #43's remainder); then the pure
  `deriveBattleResolutionFromTerminalBoundary`-style adapter from
  `docs/round-controller-outcome-seam.md` §4 onto `submitBattleDecision`.
  None of this touches `roundController.ts`'s public API.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only, per the banked ground truth); no new production imports of
  canonical recordings.

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

