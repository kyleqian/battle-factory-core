# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 440 — S10 step (iv) part 2/3: `HandleFaintedMonActions` orchestration + `BS_FAINTED` role — a real Level-50 Factory battle now reaches `{ kind: "terminal", outcome: "player-win" }` through `submitBattleDecision`

- **State:** tree green at **188 files / 2236 tests** (this rung added 2 new
  test files — `battleScriptFaintedActionsOrchestration.test.ts`,
  `factoryBattleScriptTerminalDecision.test.ts` — plus assertions to existing
  files; entry 439's own 185/2217 baseline predates two lane merges that
  landed between it and this session), build green. ISSUES #43 closed
  (deleted). No new opcode registrations (still 51 composed handlers) — this
  rung is scheduling logic and a selector role, exactly as
  `docs/faint-outcome-ground-truth.md` §3.1 said it must be, not a 7th
  opcode.
- **Did (dependency order):** (1) `BS_FAINTED` selector role —
  `BattleScriptSelectorRoleBindings` gained a `fainted` field (genuinely new,
  not an alias of `target`, per ISSUES #43's own diagnosis), and
  `resolveRulesBattlerForBattleScript` maps it to
  `battle_util.c:713`'s `case BS_FAINTED: ret = gBattlerFainted;`. (2)
  `src/engine/battleScriptFaintedActionsOrchestration.ts` — the
  `HandleFaintedMonActions` (`battle_util.c:1894-1971`) C-side loop
  equivalent: once a hit chain's own move script halts at its own terminal
  `end`, it drives `BattleScript_GiveExp` then `BattleScript_HandleFaintedMon`
  per fainted battler (scanned from `battlers[0..battlersCount)].hp === 0`),
  reassigning `selectorRoles.target`/`fainted` together each time exactly
  like source's `gBattlerFainted = gBattlerTarget = ...` (`:1915`) — reusing
  the already-registered setbyte/getexp/checkteamslost/jumpifbyte/end2
  opcodes directly, no new registrations. Terminal vs. non-terminal is the
  real VM: if `checkteamslost`'s `jumpifbyte` takes the
  `BattleScript_FaintedMonEnd` branch, it reports `"terminal"`; otherwise
  execution falls into the real `jumpifbattletype BATTLE_TYPE_TRAINER, …`
  (a `jumpifword` macro expansion, `asm/macros/battle_script.inc:1434-1436`)
  which is genuinely unregistered, so it naturally halts unsupported-opcode
  and surfaces as a named `"non-terminal-barrier"` — never fabricated, never
  a silent fallthrough. 4 new Tier-1 tests (no-fainted-battlers, terminal
  WIN, non-terminal barrier, terminal LOSS). (3)
  `src/engine/factoryBattleScriptTerminalDecision.ts` — a sibling
  `BattleDecisionReducer` to `reduceFactoryAsleepMoveDecision` (own rules
  type/adapter id, not a growth of that one — its `rulesAt` is pinned to a
  sleeping-attacker phase that doesn't apply here). Stages a Level-50 Factory
  singles turn with the opponent's other two party slots pre-faint directly
  in the rules-context constructor (`party` slice, per the seam doc's own
  "that is what the slice is for"), runs the real registered hit chain from
  `BattleScript_HitFromAtkCanceler` (skipping `BattleScript_EffectHit`'s own
  still-unregistered `jumpifnotmove MOVE_SURF` guard, a proven no-op for any
  non-Surf move — same choice every RUNG 4 KO test already makes), then the
  new orchestration, then reconciles the Battle Script machine's internal RNG
  cursor onto the outer decision-boundary cursor by replaying its ledger
  through `context.rng.draw()` (both are the same deterministic LCG from the
  same seed, so this converges exactly). One `submitBattleDecision` call now
  returns a REAL `{ kind: "terminal", outcome: "player-win" }`, `rng.calls`
  pinned at the banked **4**, `battleOutcome` computed by `checkteamslost`
  from the party slice, not injected. `mapFactoryBattleOutcome` pins
  `B_OUTCOME_WON(1)/LOST(2)/DREW(3)` → `"player-win"/"trainer-win"/"draw"`
  with direct unit tests (draw is real per
  `docs/battle-resolution-adapter-ground-truth.md`, not asserted away). One
  more end-to-end test proves the non-terminal fork (healthy opponent bench
  slot) surfaces as a real `machine-barrier`, not a fake terminal. 5 new
  Tier-1 tests total for this file.
- **Gotcha found and fixed:** `absentBattlerFlags` must stay **0** for a real
  (non-asleep) hit chain — the asleep adapter's `0b1100` convention trips
  `CANCELER_BIDE`'s own admission guard
  (`battleScriptActionAdmission.ts:3205`, `attacker > 1` / absent-battler
  check) once attackcanceler's state walk actually reaches it, which only
  happens for a non-sleeping attacker.
- **Next:** step (iv) part 3/3 (still out of scope for this rung, per the
  brief): the pure `deriveBattleResolutionFromTerminalBoundary`-style adapter
  from `docs/round-controller-outcome-seam.md` §4 piece 5, wiring a real
  terminal boundary into `roundController.resolveRoundBattle`'s
  `BattleResolution` shape (id/maxHp/status carried forward from the
  pre-battle `BattleParty` snapshot, `draw` handling decided). No
  `roundController.ts` edit happened this rung (out of scope, honored).
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only); no new production imports of canonical recordings; ratchet
  barrier counts unchanged (no `unsupportedBranch` call sites added — the
  non-terminal fork's barrier is the VM's own natural
  missing-handler halt, not a new named barrier). The anticipated ripple in
  `battleScriptHitChainOpcode.test.ts`/`factoryBattleScriptDecision.test.ts`
  did not materialize: neither file's own code path calls the new
  orchestration or reducer, so both are byte-for-byte unchanged (only two
  unrelated `selectorRoles` exact-equality assertions elsewhere needed the
  new `fainted: null` field added).

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

