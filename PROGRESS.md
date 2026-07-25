# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 441 — S10 step (iv) part 3/3 (FINAL): pure `BattleResolution` adapter + no-fixture win/loss integration proof — **ROADMAP S10 step (iv) is now COMPLETE**

- **State:** tree green at **191 files / 2263 tests** (+3 files / +27 tests
  over entry 440's 188/2236), build green, ratchet green (6/6, barrier counts
  and canonical-recording allowlist unchanged — no new production imports).
  `roundController.ts` and its three fixture-driven test files
  (`roundController.test.ts`, `roundScenarioMatrix.test.ts`,
  `factoryTerminalPresentation.test.ts`) are **byte-for-byte untouched**
  (confirmed via `git diff`, as the seam doc's "what stays intact" promised).
- **Did:** (1) `src/engine/battleResolutionAdapter.ts` —
  `deriveBattleResolutionFromTerminalBoundary`, the pure adapter from
  `docs/round-controller-outcome-seam.md` §4 piece 5. Takes only the narrow
  `BattleScriptRulesContext` slice it reads (`battlers`/`battleTopology`/
  `party`, structurally satisfied by the real type) plus the terminal
  `BattleOutcome`/`rng.value` and the pre-battle `BattleParty` snapshots.
  Ground-truth-pinned rules, all cited in-file: outcome `player-win`→`"win"`,
  `trainer-win`/`draw`→`"loss"` (the Factory battle-room script has exactly
  one `case 1`=WON; LOST and DREW both fall through to the identical
  `WarpToLobbyLost` branch — `docs/battle-resolution-adapter-ground-truth.md`
  §4 — a draw is never thrown on); `id`/`maxHp` carried verbatim from the
  pre-battle snapshot; `hp` overlaid from the kernel's live-synced party
  slice; `status` is fainted→`"none"`, the slot mirrored by a live battler→
  its real `status1` mapped to the `BattleStatus` vocabulary (toxic checked
  ahead of plain poison — `GetAilmentFromStatus` collapses them, this engine's
  vocabulary keeps them distinct), every other (benched) slot→its pre-battle
  value, since the kernel's party slice tracks only `species`/`isEgg`/`hp`,
  not bench status. The `status1`→`BattleStatus` mapping is **total** over
  real values (every `STATUS1_*` bit checked is disjoint) — no unrepresentable
  case was found, so no barrier was added. 13 unit tests (outcome mapping ×3,
  status1 mapping incl. the toxic-vs-poison precedence, identity carry-
  forward, hp overlay, all three status rules, rngValue passthrough, and a
  dedicated synthetic-state draw→loss test per the brief). (2) Minimal,
  additive extension to `factoryBattleScriptTerminalDecision.ts`: an optional
  `attackingSide: "player" | "trainer"` config knob (default `"player"`,
  proven byte-for-byte unchanged — existing 5 tests still pass unmodified)
  that mirrors the identical staged hit chain onto the player's own modeled
  party slot instead, with no new kernel modeling — exactly the same move
  math, opposite roles, needed to stage a *real* trainer-win for the
  integration proof. (3) `tests/battleResolutionAdapterIntegration.test.ts` —
  the no-fixture integration proof: a staged last-mon-KO scenario runs
  through `submitBattleDecision` to a REAL terminal boundary, then the
  adapter, then `resolveRoundBattle` on a real `RoundControllerState`. Win
  path: `player-win` → `presentingBattleWin` → `lastBattle.outcome==="win"` →
  `swapOffer` command carries the real adapted (all-fainted) opponent party →
  declining the swap genuinely increments `battleIndex` 0→1. Loss path:
  `trainer-win` (via the new `attackingSide:"trainer"` staging) →
  `resolveRoundBattle` drives `roundLost`, `lastBattle.outcome==="loss"`.
- **Next: the presentation-seam checkpoint (ROADMAP S10 §3) is the next
  battle-lane step — a hard ordering constraint, not a preference.** Step
  (iv) is done; `docs/presentation-seam-scout.md` is its evidence pack (one
  already-exact presentation window re-driven from kernel semantic events
  instead of turn-N state, committed trace still passing). Do not register
  further opcodes or grow the kernel past this checkpoint.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only); no new production imports of canonical recordings;
  `core.ts` production wiring of the adapter into the tick flow is
  deliberately out of this rung's scope (the presentation-seam checkpoint's
  territory, per the brief).

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

