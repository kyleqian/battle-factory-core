# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 461 — Full-turn reducer: PLAYER-side forced-switch variant lands (entry 459's item 3, the named remainder)

- **State:** tree green at **218 files / 2585 tests** (+0 files/+3 tests
  over entry 460's 218/2582 — only added tests to the existing
  `factoryBattleScriptFullTurnDecision.test.ts`), build green, ratchet
  unchanged (6/6 — no barrier call site touched). Two per-rung commits
  (`b3f8276` plumbing, `fccfd9d` tests), both green.
- **Did:** surfaced the `faint1`/`faint2` `"player-choice-required"` fork
  (both previously threw "outside this reducer's modeled domain") as a real
  `"forced-switch"` decision-required boundary, mirroring
  `factoryBattleScriptTerminalDecision.ts`'s own `forced-switch-pending`
  phase + resume machinery. Added `playerBenchHp`/`playerBenchOverride` to
  `FactoryFullTurnConfig` (party slot 0 = active, this reducer's own
  convention — both player and opponent parties now share one `benchSlot`
  helper). New `pendingForcedSwitchAt`/`pendingScriptAt`/
  `buildForcedSwitchPendingRules` reconstruct the halted
  `BattleScript_HandleFaintedMon` script from a durable `pendingScript`
  bundle (programCounter/callStack/scheduler); `resumeFullTurnForcedSwitch`
  resumes it via `resumeBattleScriptFaintedActionsAfterPlayerChoice`, and a
  `"resumed"` result runs straight into a new shared `runEndTurnTail` helper
  (factored out of the existing two-action-turn tail, now called from both
  the normal turn path and the forced-switch resume path).
- **Test:** a pure side-relabeling of entry 459 item 2's own trainer-side
  fixture (same STRENGTH/200atk/50def/90hp one-shot, same speed gap) so the
  trainer's killing blow KOs the player's active mon instead. Pins: the
  reducer surfaces `{kind:"forced-switch", side:"player", battler:0,
  faintedPartyIndex:0, legalPartyIndexes:[1]}` (not a throw); submitting the
  legal MACHOP slot rebuilds the active battler (species/hp/partyIndex/
  neutral stat stages/clean status — moves/pp/other stats intentionally NOT
  rebuilt, per `battleScriptSwitchinOpcode.ts`'s own documented "ability/
  item/moves/pp stay untouched" scope) and resumes to a genuine next command
  boundary; exact RNG ledger (4 total across all three submissions — just
  the killing blow's own hit chain, zero from the forced-switch dance, zero
  from the cancelled second action, zero from the quiet end-turn); PP ledger
  (trainer's Strength used once, the player's own action never dispatched);
  the fainted/active slot (index 0) is rejected.
- **Next:** entry 460's own list stands, item 3 is now the completed
  remainder off it — `CheckViability` handler bodies phased by the audit's
  16-reachable-handler table (ground truth scout first), Ingrain/Leech
  Seed/Wrap registration, seam window 3 (`turn5-rockslide.json` per the
  scout doc's ranking), ENDTURN_ABILITIES/ITEMS breadth.
- **Side merge (same hour, supervisor-verified, `83f15c3`):**
  `addbyte`/`jumpifbytenotequal` widened off their single hardcoded
  `gBattleCommunication`/`gBattlersCount` tuple onto the shared SETBYTE
  byte-lvalue universe (+`gBattlersCount` sentinel comparand) —
  `BattleScript_WeatherFormChanges` now runs to its own `return` for
  non-Castform L50 singles (0 RNG draws), Castform barrier still reached
  *through* the loop; Perish Song/Teeter Dance/Intimidate/Palace loop
  counters ride the same mechanism (not separately tested). Census
  unchanged (opcode-level dispatch only; regenerated zero-diff, 25/25
  self-checks); ratchet barrier count still 3 (comment updated). Merged
  suite 218 files / 2590 tests + build re-verified green.
- **Notes:** pure reducer/config work, no presentation/census/opcode-
  registration changes (as scoped; `battleScriptSetByte.ts`/
  `battleScriptDamagingWeatherOpcode.ts` untouched, left for the side worker
  this hour). Scratch-verified via a deleted `tests/_scratch_item3.test.ts`
  before writing the real test (same discipline entry 459 used), confirming
  the exact RNG/PP numbers and the switch-in module's documented
  moves/pp-untouched limitation before asserting on it. No PAPERCUT logged.

---
## 460 — [SUPERVISOR WIND-DOWN 2026-07-25 ~21:50] session summary

- **State:** tree committed and green at **218 files / 2582 tests**, build
  green, census live-verified **73/214 effects, 152/355 moves, 118/276
  Factory-L50 executable** (session start: 53/105/77; all 25 census
  self-checks pass), single main worktree, zero unmerged branches, zero
  stale worktrees. **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** No usage/rate limits hit all session.
- **Session (~17 workers over 3 lanes, every outcome supervisor-verified
  live; zero cap-kills, one launcher-arg mistake self-caught):**
  - **Main (7 steps):** forced-switch §4 slice 10 (player-side
    forced-switch decision request through `submitBattleDecision` — §4 list
    1-10 COMPLETE); MOVE_EFFECT_CONFUSION+FLINCH registered (census
    105→122 moves; both feed the existing canceler reducers, RNG-threading
    bug found+fixed); presentation-seam window 2 (`turn1-rockslide.json`
    256/256 from kernel events, first production `stat-stage-change`
    emission, 27-trace sweep clean); Factory-AI port in two steps
    (CheckBadMove full incl. get_ability redraw semantics, then
    TryToFaint + CheckViability-as-table + masks 0/1/7 dispatch — all 3
    banked scenario ledgers reproduce at 11/11/13 policy draws);
    screens/weather setters + full `DoFieldEndTurnEffects` (F2-F5 +
    F7-F10, census →148 moves); full-turn reducer consuming the REAL
    mask-7 policy + non-terminal forced-switch full-turn variant (entry
    459 — Gate-5's submission-boundary claim now demonstrated for L50
    singles move selection).
  - **Side (6 scouts/steps, all merged):** screens/weather ground truth
    (29/29 verify, corrected end-turn doc's F8/F10 opcode claim);
    turn1-rockslide seam consumer map (16 inputs, staged proof-of-events);
    ISSUES #44 census fix (support set now mechanically derived, +8
    ground-truth checks); AI port-subset audit (masks per band; two doc
    corrections supervisor-re-verified against source); the
    **RNG caller-attribution probe** (closed entry 455's 2-roll gap:
    window totals bundle a trailing opponent proc draw +
    `BattleTurnPassed`'s `gRandomTurnNumber`, both decision-independent —
    `tools/probe/attribute-factory-ai-random-callers.py`);
    Ingrain/Leech Seed/Wrap ground truth (18/18 verify — Ingrain/Wrap
    end-turn bodies already opcode-complete); `TRYCASTFORMDATACHANGE`
    registered per supervisor (a)/(b) decision (census →152 moves; a
    fielded Forecast Castform is the one named barrier; runtime
    weather-form loop next needs `addbyte`/`jumpifbytenotequal` widened
    past `gBattleCommunication`-only).
  - **Animation (7 steps, stacked 7-deep, all merged):** MOVE_GROWTH
    **`exact`** 63/63 both orientations (residual cracked as per-mechanism
    framebuffer display lag, scale+2/tint+1); MOVE_FUTURE_SIGHT `partial`
    85/114 (SetPsychicBackground ported+RAM-probed incl. the rotation-pause
    cadence; defect B killed by register probe; defect A parked with the
    monbg mechanism RAM-confirmed and a GROW-direction instrument named);
    MOVE_CONFUSION `partial` 108/140 (zero net-new components; window 1
    19/20; window 2 carries defect A — cross-move triangulation banked).
    Coverage **21 exact / 5 partial**. PSYCHIC noted as cheap once staged.
- **Next (in order):** main — full-turn player-side forced-switch variant
  (entry 459's named remainder), CheckViability handler bodies phased by
  the audit's 16-reachable-handler table, `addbyte`/`jumpifbytenotequal`
  sBATTLER widening (unblocks the runtime weather-form loop),
  Ingrain/Leech Seed/Wrap registration (ground truth banked, mostly
  opcode-complete already), seam window 3, ENDTURN_ABILITIES/ITEMS
  breadth. Animation — defect A via the OAM double-size-window instrument
  (promotes FUTURE_SIGHT+CONFUSION together), then PSYCHIC. All prep docs
  carry rerunnable verify scripts.
- **Notes:** PAPERCUTS +1 (dense comparators bbox only the first diff
  frame — partially retired same-day by `confusionPortable.ts`'s
  `--per-frame-bbox`). Supervisor decisions this session, both recorded in
  ROADMAP/PROGRESS: AI-port acceptance restated to policy-own draws
  (11/11/13) after the attribution probe; Castform (a)/(b) split
  registered with the honest fielded-Castform barrier. Memory file updated
  with session tactics (launcher-pipeline exit masking; cross-move
  triangulation; sRandCount+LR attribution probe; point-in-time family
  costs; probe-then-decide).

---
## 459 — Full-turn reducer now consumes the REAL Factory-AI trainer policy (item 1) AND the non-terminal forced-switch full-turn variant (item 2); item 3 (player-side variant) not started, per the brief's own time cap

- **State:** tree green at **217 files / 2570 tests** (+0 files/+2 tests
  over entry 458's 217/2568 — both items only added tests to the existing
  `factoryBattleScriptFullTurnDecision.test.ts`), build green, ratchet
  unchanged (6/6 — neither item touched a barrier call site). Two per-rung
  commits (`b2057ba`, `98e1315`), both green.
- **Item 1 — real AI trainer decisions in the full-turn cycle, done:**
  generalized the trainer side of `factoryBattleScriptFullTurnDecision.ts`
  to a real 4-move set (`FactoryFullTurnBattlerConfig.moves` optional
  override, `trainerLegalDecisions()` enumerating nonzero moveset slots,
  the trainer-command branch indexed by the submitted `moveSlot` instead of
  a hardcoded 0) so `submitFactoryAiDecision` (entry 457's mask dispatch)
  can drive the trainer's per-turn command through the SAME
  `reduceFactoryFullTurnDecision` reducer — **no new shared boundary type
  and no reducer-logic change needed**: `submitFactoryAiDecision`'s own
  RNG-synchronizing wrapper already advances the kernel's cumulative cursor
  with the policy's draws before calling the reducer, and the reducer's own
  `rngBefore`/`rngAfter` reconciliation (entry 450's own subtlety) already
  accounts for whatever the context's cursor holds going in — composition
  just worked, confirming ROADMAP S10's decision-source-agnostic-kernel
  architecture. New integration test: two real turns where the trainer's
  move is chosen by the live mask-7 policy from Surf/RockSlide/BodySlam/
  Thunderbolt against a Ground-type target — Surf wins unambiguously both
  times (verified via direct construction against 3 different RNG seeds
  before writing the test: same [100,99,99,89] score line and single-slot
  `bestMoveSlots` every time, so the pick needs no seed-dependent tie-break)
  — with the complete per-turn draw ledger (11 policy draws + both 4-roll
  hit chains, 19 then 38 cumulative) pinned as one continuous LCG stream
  and the chosen move (`moveSlot: 0`) asserted both turns.
- **Item 2 — non-terminal forced-switch full-turn variant, done:** added an
  optional trainer-side bench (`trainerBenchHp`/`trainerBenchOverride`,
  party slots 1/2 — slot 0 is always the active trainer mon in this
  reducer's own layout, unlike `factoryBattleScriptTerminalDecision.ts`'s
  active-at-slot-2 convention). The reducer's `faint1.kind === "resumed"`
  branch (already wired when this module first landed, entry 450) needed
  **zero logic changes** — it already skips the second action and runs
  straight to `runBattleEndTurnOrchestration` per `cancelallactions`. New
  integration test reused the existing "mid-turn KO" fixture's exact
  numbers verbatim, just adding a healthy MACHOP bench (entry 447's own
  proven switch-in candidate — real move, passes
  `GetMostSuitableMonToSwitchInto`'s pass-1 gate) — passed on the first
  run. Pinned: outcome is `decision-required` (not terminal), the next
  boundary names battler 1 rebuilt as MACHOP (species/hp 145/partyIndex 1/
  neutral stat stages/clean status), the player's own move shows exactly
  one PP use (the second action never dispatched — there is no second
  Strength cast to draw RNG for), and `rng.calls` stays at exactly 4 (the
  killing blow's own hit chain — the forced-switch dance and this
  scenario's quiet, weather/status-free end-turn both draw zero; a
  dispatched second action would have made this 8, not 4).
- **Item 3 (player-side variant) — not started**, per the brief's own
  explicit time cap ("do not start past ~40 min") and its own conditional
  framing ("if BOTH land and cap allows") — items 1+2 together, plus the
  upfront reading of AGENTS.md/PROGRESS.md/the two source modules, the
  scratch-tested AI scoring verification, and both green rungs, filled the
  bounded worker session's budget. No shape gap found for item 3 specifically
  (not attempted far enough to surface one) — the natural next step would
  reuse `factoryBattleScriptTerminalDecision.ts`'s own `playerBenchHp`/
  `playerBenchOverride` precedent (already proven there) ported onto this
  reducer's player-side party the same way item 2 just did for the trainer
  side, plus surfacing the `"player-choice-required"` fork this reducer
  currently just throws on (both `faint1`/`faint2` branches already name
  the exact throw site: "outside this reducer's modeled domain").
- **Notes:** no presentation/census/opcode-registration changes (pure
  reducer/config work, as scoped). Both items composed entirely from
  already-landed machinery (entries 447/450/457) — no genuine shape gap
  surfaced needing escalation. PAPERCUT: none logged — a scratch vitest
  file under `tests/` (deleted after use, never committed) let the exact
  mask-7 scoring/draw-count numbers get verified against 3 RNG seeds before
  the real test was written, instead of hand-deriving them and discovering
  a mismatch after the fact.

