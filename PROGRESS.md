# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 436 — S10 step (iii): opcode 73 (`moveend`) registered — hit chain now runs to script completion

- **State:** tree green at **183 files / 2166 tests** (+31), build green.
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

---
## 435 — S10 step (ii) RUNG 4: seteffectwithchance + tryfaintmon registered — sixteen-opcode hit chain complete

- **State:** tree green at **178 files / 2135 tests** (+16), build green.
  `createBattleScriptStatusRulesHandlers` now composes **45** opcodes (was
  43): `seteffectwithchance`, `tryfaintmon` (both in
  `battleScriptHitChainOpcode.ts`). This closes the sixteen-opcode standard
  hit chain from ROADMAP S10 §2(ii); opcode 73 `moveend` remains the
  step-(iii) boundary, untouched.
- **Did:** `seteffectwithchance` is source-complete for its own control flow:
  Serene Grace doubling, the `MOVE_EFFECT_CERTAIN` short-circuit (no RNG
  drawn), and the roll-based branch (RNG **always** drawn once whenever
  CERTAIN isn't taken, matching C's `else if (Random()...)` evaluation order
  — ground truth's roll 4). Since every move reachable from this engine's
  registered topology has `moveEffectByte == 0`, both of `SetMoveEffect`'s
  actual dispatch sites are narrow `(b)` barriers (genuinely unreached today,
  still guarded per the "still a guard, not an omission" rule), each proven
  reachable by directly constructing a nonzero `moveEffectByte` in a Tier-1
  test. `tryfaintmon` is source-complete for the mode-FALSE form used by
  `BattleScript_EffectHit`: the literal `== BS_ATTACKER` comparison (not a
  generic selector — any other operand, including `BS_FAINTED`, correctly
  takes the "target" path, proven by a dedicated test), the no-faint
  pass-through, the faint branch (`HITMARKER_FAINTED`/`HITMARKER_PLAYER_FAINTED`
  bit-setting, real `call` transition into `BattleScript_FaintAttacker`/
  `FaintTarget`), and Destiny Bond/Grudge as narrow barriers gated strictly on
  their real trigger conditions (both reachable via direct hitMarker/status3
  construction, not just theoretically). The mode-TRUE `tryfaintmon_spikes`
  form (needs unmodeled `gSideStatuses`/SIDE_STATUS_SPIKES_DAMAGED) is one
  more barrier, never reached by the hit chain itself. Five new barriers
  total (13 → 18, ratchet pin raised deliberately, named above and in the
  ratchet's own comment). Extended both RUNG-1/KO integration tests: the
  plain-hit scenario now shows **4** attributed rolls with roll 4 attributed
  to `seteffectwithchance` and hands off at `moveend` (opcode 73, unregistered
  — per spec); the KO scenario's real ROM seed reproduces its exact 4-roll
  ledger including roll 4 (`24745`), drives `tryfaintmon`'s faint branch into
  `BattleScript_FaintTarget` with the correct `HITMARKER_FAINTED` bit, and
  then **blocks** (not halts) on the very next instruction, `playfaintcry
  BS_TARGET` — filed as ISSUES #43 (`resolveRulesBattlerForBattleScript` only
  maps `BS_ATTACKER`/`BS_EFFECT_BATTLER`, a pre-existing gap unrelated to this
  rung's two opcodes). 16 new Tier-1 tests (registration + branches +
  barrier-reachability, following the RUNG 1–3 pattern) plus a fixed
  pre-existing test whose default `attack:0/defense:0` fixture happened to
  produce NaN damage that zeroed HP — invisible before tryfaintmon existed to
  read that HP, now given a real nonzero attack/defense so the "no faint"
  scenario is actually a no-faint scenario.
- **Scope correction (say-why, not improvise):** the brief's acceptance
  criterion asking the KO integration test to drive "the terminal outcome...
  `battleOutcome` 0 -> 1" is **not achievable inside this rung and not
  source-faithful to attempt.** `Cmd_tryfaintmon` itself never touches
  `gBattleOutcome` — confirmed by reading its full body
  (`battle_script_commands.c:2965-3050`). The real transition lives in
  `Cmd_checkteamslost` (`:3534-3576`), reached only via
  `BattleScript_HandleFaintedMon`, deep past `dofaintanimation`/
  `cleareffectsonfaint`/the switch-in dance — and it requires summing HP
  across full six-slot `gPlayerParty`/`gEnemyParty` records, a party model
  this engine's Battle Script machine does not have anywhere (`roundController.ts`
  tracks a party, but at a disconnected higher layer). Implementing that is
  not "two opcodes" and was correctly out of scope per the brief's own opcode
  boundary (`moveend`/opcode 73 untouched). Filed as ISSUES #42 for whoever
  registers `checkteamslost` or wires step (iv). This rung instead proves
  exactly what `tryfaintmon` source-faithfully does: takes the real faint
  branch, sets the real hitMarker bits, and hands off cleanly at the next
  boundary the machine actually reaches.
- **Next:** step (iii) — register opcode 73 (`moveend`) per the already-banked
  dependency-ladder receipt (ROADMAP S10, "MOVEEND source-boundary
  checkpoint"). Fixing ISSUES #43 (`BS_TARGET` in
  `resolveRulesBattlerForBattleScript`) first would let the KO scenario's
  faint cutscene advance further, but is not required to start step (iii).
  After (iii): step (iv) closes the loop — and needs ISSUES #42
  (`checkteamslost`/party-HP modeling) solved first for a *real* terminal
  outcome, not a fixture.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only, per the banked ground truth); no new production imports of
  canonical recordings.

---
## 434 — [BETWEEN-SESSION HARDENING, user-directed] two ratchets + oracle freshness gate

- **State:** tree green at **178 files / 2119 tests**, build green. No code
  behaviour changed — this entry adds enforcement for rules that were prose,
  and one startup check. Session 433's work independently re-verified:
  `verify-hit-chain-ground-truth.ts` rerun against the live oracle, **PASS,
  0 failing checks**; the `orbyte` correction confirmed against
  `data/battle_scripts_1.s:244/271/1610/2153` (session 433 was right, the
  pre-reset ROADMAP was wrong).
- **Did:** (1) `tests/executableFrontierRatchet.test.ts` — pins the exact
  allowlist of production canonical-recording imports (**four**, across
  `battleScene.ts` and `factorySwapPresentation.ts`) and fails on any
  addition; a retired entry must be *deleted* from the allowlist, so wins
  ratchet down and cannot silently re-admit. Also pins per-module
  `unsupported-branch` barrier counts (13 hit-chain, 5 canceler), rejects
  barriers in unpinned modules, and requires each barrier-bearing module's
  test file to assert the halt kind. Both ratchets were negative-tested (each
  was made to fail on a probe file, then reverted) — a green ratchet that
  cannot go red is worthless. (2) `tools/check-oracle-freshness.sh` — the
  oracle exposes no version endpoint, so this compares each listening
  service's process start time against harness HEAD's commit time; exit 1 =
  stale, restart before staging. Wired into SUPERVISOR.md's Orient step.
  (3) ROADMAP S10 §3 restated as a **hard ordering constraint** (after step
  (iv), the next battle-lane brief *is* the presentation-seam checkpoint) and
  §4 now points at its enforcing test; SUPERVISOR.md and AGENTS.md carry the
  same two rules where workers actually read them.
- **Next:** unchanged from 433 — main: RUNG 4 (`seteffectwithchance`,
  `tryfaintmon`), then step (iii) opcode 73, then step (iv). **Then the
  presentation-seam checkpoint, not opcode 44.** Animation: MIST_BALL
  remainder in cost order (`AnimThrowMistBall` next) or the next ranked
  Level-50 track.
- **Notes:** the freshness gate exists because session 433 lost time to a
  service that predated the `overrides.parties` builder it was being asked to
  serve — banked as "not yet live" in `docs/hit-chain-ground-truth.md:40`,
  corrected at `:259` after a mid-session restart. The barrier pin exists
  because the (a)/(b) registration policy's failure mode is barrier creep:
  an opcode that is mostly barrier passes the executable-frontier gate on
  paper while executing nothing.
