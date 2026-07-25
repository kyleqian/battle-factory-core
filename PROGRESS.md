# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 442 — S10 §3 presentation-seam checkpoint: **PASSED** — `turn5-faint.json` re-driven from real kernel events, still 110/110

- **State:** tree green at **194 files / 2276 tests** (+3 files/+13 tests
  over entry 441's 191/2263), build green, ratchet green (6/6, barrier
  counts and canonical-recording allowlist unchanged — no new production
  imports). Oracle re-verified live: `turn5-faint.json` **110/110** (exact
  match to its recorded count), plus 22 other turn3/4/5/6 traces re-run as
  regression checks (`turn3-endeavor/menu/rockslide`, `turn4-doubleteam/
  menu/rockslide`, all 11 `turn5-*`, all 6 `turn6-*`) — every one still
  matches its own recorded count, zero regressions.
- **Did (the checkpoint's ordered 4-step plan, `docs/presentation-seam-
  scout.md` §7.3):** (1) **String resolver (gap 5)**,
  `src/engine/battleStringResolver.ts` — `resolveBattleStringLines` walks
  the already-extracted `battle-message-templates.json` (365-entry
  `gBattleStringsTable`, extracted in an earlier S7 session) and splices
  `{TOKEN}` placeholders via caller-supplied resolvers;
  `resolveBattleNameWithPrefix` implements `HANDLE_NICKNAME_STRING_CASE`
  source-faithfully (`battle_message.c:2286-2306` — "Foe "/"Wild "/no
  prefix by side+battle-type). Pinned against the real
  `STRINGID_TARGETFAINTED` template (corrected in last week's scout pass to
  `{B_DEF_NAME_WITH_PREFIX}\nfainted!\p`) producing exactly "Foe GROVYLE"/
  "fainted!". (2) **PC-to-window bridge (gap 7)**,
  `src/engine/presentationEventWindowBridge.ts` —
  `resolveFaintPresentationWindowContent` answers "am I in the fainted
  window" from a real `hp-change{to:0}` plus a `message` event whose
  `provenance.sourceLabel === "BattleScript_FaintTarget"`, never a turn
  number; minimal, scoped to this one window's own content decision (the
  giant `turn<N>Resolved` dispatch cascade in `drawFightSubmenuWindow` is
  untouched, per the brief). (3) **The leaf**,
  `src/engine/turn5FaintPresentationStaging.ts` — stages Onix (real
  level-50 stats) vs. Grovyle (real level-50 stats, HP 1 -> 0, both from
  `tests/damageCalc.test.ts`'s own RAM-pinned blocks) through the
  registered hit chain from `BattleScript_HitFromAtkCanceler` to the
  script's own `end`, composes the bridge + resolver on the captured
  events, and exports `resolveTurn5FaintWindowLines()`. `battleScene.ts`'s
  `TURN5_FAINTED_LINE1`/`LINE2` hardcoded literals are **deleted**, replaced
  by `const [TURN5_FAINTED_LINE1, TURN5_FAINTED_LINE2] =
  resolveTurn5FaintWindowLines();` — one real kernel run, computed once at
  module load, presentation only reads the result. One deliberate,
  documented substitution: the staged move is `MOVE_STRENGTH`, not the
  real turn's `MOVE_ROCK_SLIDE` — this leaf's own rendered content never
  depends on which move KO'd Grovyle, and `ROCK_SLIDE` is
  `MOVE_TARGET_BOTH` (a spread move), which trips `Cmd_ppreduce`'s
  existing, unrelated `unsupported-branch` for cross-side Pressure
  counting (a real, separate, already-pinned engine gap — not something to
  fake around). (4) **Re-verified**, live oracle: `turn5-faint.json`
  110/110, 22 regression traces unchanged (see State).
- **Next:** the presentation-seam checkpoint is closed; per ROADMAP S10 §3
  the kernel may resume growing past step (iv) (further opcodes/breadth)
  now that one window is proven to genuinely consume kernel events. Gap 4
  (tick/frame timestamp on events) remains open and un-scoped (confirmed
  not on this window's own critical path, §7.3) — the next window that
  needs HP-interpolation timing (e.g. `turn1-rockslide.json`) will need it.
- **Notes:** no new turn-keyed branches; no new production imports of
  canonical recordings (the three RAM-dump HP imports named in ISSUES #41
  are untouched — the fainted branch has zero RAM-dump reads, so no
  deletion fell out naturally here); `drawFightSubmenuWindow`'s own
  `turn<N>Resolved` boolean cascade is unmodified by design (redesigning it
  was explicitly out of this checkpoint's scope).

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

