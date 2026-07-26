# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 452 — Forced-switch §4 slice 10 landed: the player-side `openpartyscreen` halt is now a real forced-switch decision, not a barrier — §4's whole slice list (1-10) is complete

- **State:** tree green at **207 files / 2449 tests** (+0 files/+10 tests
  over entry 451's 207/2439 — all new tests landed in existing files), build
  green. Ratchet: `battleScriptOpenPartyScreenOpcode.ts`'s `unsupported-
  branch` pin **deliberately dropped 3 → 2** — the player-side branch
  retired from the barrier count entirely (it's a genuine named halt now,
  not an unsupported-branch placeholder); the doubles-topology and
  `GetMostSuitableMonToSwitchInto` pass-2 barriers are unchanged. Census
  untouched (no opcode registrations changed — `openpartyscreen` was
  already registered; only its player-side branch's internal behavior
  changed).
- **Did, per `docs/forced-switch-ground-truth.md` §3/§4 slice 10 (the one
  barrier entry 447 left named):**
  - `battleScriptOpenPartyScreenOpcode.ts`'s player branch now halts with a
    genuine `"player-choice-required"` reason (new `BattleScriptHaltReason`
    kind, `battleScriptMachine.ts`) naming the legal bench slots — alive
    (hp>0), non-egg, not the fainted slot itself, exactly
    `OpenPartyMenuToChooseMon`'s own gate — instead of an unsupported-branch
    placeholder. A resume writes the chosen index into
    `monToSwitchIntoId[battler]` (the SAME sentinel field the AI branch
    already writes) and the identical opcode handler then takes an
    "already-decided" advance path — no parallel mechanism invented.
  - `battleScriptFaintedActionsOrchestration.ts` surfaces this as a new
    `"player-choice-required"` result (paused mid-script, NOT at
    `BattleScript_FaintedMonEnd`) and exports
    `resumeBattleScriptFaintedActionsAfterPlayerChoice`, which clears the
    halt and re-drives the existing slice 1-9 machinery
    (`switchhandleorder → getswitchedmondata → switchindataupdate → ... →
    cancelallactions → end2`) unmodified to completion.
  - `factoryBattleScriptTerminalDecision.ts` wires this into the kernel's
    own **pre-existing but previously unused** `BattleForcedSwitchRequest`/
    `BattleSwitchDecision` shapes (`battleDecisionBoundary.ts` already
    defined and validated them; no reducer had ever produced or consumed
    one) via a new resumable `"forced-switch-pending"` phase
    (`pendingScript`: `programCounter`/`callStack`/`scheduler`, JSON-safe,
    round-trips through `serializeBattleState`/`parseBattleState`) and a
    shared `finalizeOrchestration` tail factored out of the original
    single-call reducer path. That factoring caught and fixed a **latent
    RNG-reconciliation bug**: the original reconciliation compared
    `rngAfter.calls` directly against the machine-local ledger's own count,
    which only worked because the adapter had never before been invoked a
    SECOND time on the same lineage (`rngBefore.calls` was always 0); the
    forced-switch resume is this adapter's first genuine second invocation,
    so the fix (`rngBefore.calls + machineRng.calls`, mirroring
    `factoryBattleScriptFullTurnDecision.ts`'s own documented subtlety)
    applies uniformly to both call sites now.
  - **Rejection tests needed zero new validation code**: `submitBattleDecision`'s
    existing `legalPartyIndexes`/`side` schema checks
    (`battleDecisionBoundary.ts`, already written, never before exercised by
    a real reducer) already reject fainted/active slot, egg slot,
    out-of-range index, and wrong-side submissions before the reducer ever
    runs — proven, not assumed, by four new rejection tests, each asserting
    the paused state's serialization is byte-identical before/after.
  - `battleEndTurnOrchestration.ts`/`factoryBattleScriptFullTurnDecision.ts`
    gained explicit (currently unreachable, thrown) handling for the new
    result kind to stay exhaustive — a player-side end-turn KO (e.g. Toxic)
    could in principle reach the same fork, but wiring a real forced-switch
    continuation into those dual-sided reducers is intentionally out of
    this step's scope.
  - New Tier-1 coverage: `battleScriptOpenPartyScreenOpcode.test.ts` (halt
    shape, egg exclusion, already-decided resume-advance path),
    `battleScriptFaintedActionsOrchestration.test.ts` (the orchestration
    result + resume function directly, independent of the adapter),
    `factoryBattleScriptTerminalDecision.test.ts` (the full player-side
    integration: decision request → legal-slot submit → rebuilt battler
    (species/hp/types/status1/statStages) → genuine next boundary, zero
    `Random()` calls throughout, plus canonical serialize/parse replay of
    both the request and the resume transition).
- **Next:** wiring a real forced-switch continuation into the full-turn/
  end-turn dual-sided reducers (currently a named, unreachable throw);
  confusion + flinch registrations (ground truth banked); the AI
  move-selection port (`docs/factory-ai-ground-truth.md`);
  `DoFieldEndTurnEffects` setters (screens/weather); the full-turn proof's
  non-terminal variant.
- **Notes:** no oracle traces added (pure Tier-1, direct-construction per
  this doc's own established discipline — the live oracle recipe was
  already banked in §3 from an earlier session). No presentation/
  `battleScene`/ROADMAP edits. OUT OF SCOPE per the brief and untouched:
  party-menu presentation/UI, voluntary switching as a turn action,
  switch-in entry hooks, the AI move-selection port, census regeneration.
  PAPERCUT: none this session.

---
## 451 — [SUPERVISOR WIND-DOWN 2026-07-25 ~16:00] session summary

- **State:** tree committed and green at **207 files / 2439 tests**, build
  green, single main worktree, zero unmerged branches, census re-verified
  live (**53/214 effects, 105/355 moves, 77/276 Factory-L50 executable**,
  12 self-checks pass). **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** No usage/rate limits hit all session.
- **Session (~35 workers across 3 lanes, all outcomes verified; 3 cap-kills
  + 1 API-server-error, every one salvaged to zero code loss):**
  - **Main (12 steps):** S10 **step (iv) COMPLETE** (party-HP slice +
    jumpifbyte/getexp/checkteamslost; BS_FAINTED role + fainted-actions
    orchestration + first real terminal boundary; BattleResolution adapter
    with facility-verified draw→loss; ISSUES #42/#43 closed). **S10 §3
    presentation-seam checkpoint PASSED** (turn5-faint.json 110/110 from
    real kernel events; string resolver + PC-to-window bridge; 22
    regression traces clean). Kernel breadth: ppreduce Pressure fix
    (ROCK_SLIDE-class unblocked), SetMoveEffect status quartet, census
    entry-chokepoint trio (census 2→74 moves), ChangeStatBuffs + both stat
    routes (→105 moves), forced-switch fork COMPLETE (jumpifword/
    openpartyscreen + AI matchup-scorer port + switch-in rebuild — §4 step
    10 player-side menu is the one named barrier left), end-turn
    orchestration (burn/poison/toxic ticks, end-turn KO reuses faint
    machinery), and the **full-turn reducer** — a genuine multi-turn cycle
    with a continuous LCG ledger (two-turn proof, burn-across-turns proof,
    mid-turn-KO-cancels-second-action proof).
  - **Side (9 scouts, all merged):** ground-truth packs with all-PASS
    verify scripts for the adapter (draw reachability + facility handling
    + party-status sync + switch recipes both voluntary and forced),
    SetMoveEffect, secondary+primary stat routes, end-turn, Factory AI
    (15/17-roll ledgers, unconditional tie-break), party-order permutation
    (presentation-only verdict), the §7 event-inventory refresh, and the
    **self-validating executable-frontier census tool**
    (`tools/report/executable-frontier-census.ts`) whose literal-entry rule
    found the chokepoint that flipped 72 moves in one registration.
  - **Animation (14 steps):** DRAGON_RAGE parked `partial` **149/150**
    (7-step convergence ladder; interpreter gained waitforvisualfinish
    scheduling; generic slideMon/speciesIdleAnim/FIRE_PLUME ports; final
    frame forensically eliminated to a named unknown). SHADOW_PUNCH parked
    `partial` 84/111 player-orientation with all families attributed
    (opponent orientation has a named BLDY-drift lead). Component-extractor
    `jumpret` typo fixed (+79 dependency edges — dissolved a false "40
    moves blocked" premise). blend_color_cycle family mapped (28 moves,
    zero new blend math) and GROWTH's AnimTask_BlendColorCycle RAM-probed
    + Tier-1-pinned (scene wiring is the named next action). Coverage:
    **19 exact / 3 partial**.
- **Next (in order):** main — forced-switch §4 step 10 (player-side
  party-menu decision-request), confusion + flinch registrations (ground
  truth banked), AI move-selection port (`docs/factory-ai-ground-truth.md`),
  DoFieldEndTurnEffects setters (screens/weather), the full-turn proof's
  non-terminal variant; presentation — continue the §3 seam retirement
  window-by-window (ISSUES #39/#41 path). Animation — GROWTH scene wiring →
  dense comparators (28-move family behind it), SHADOW_PUNCH opponent
  orientation. All prep docs carry rerunnable verify scripts.
- **Notes:** PAPERCUTS gained 5 entries/bumps this session. The launcher's
  "unauthenticated/sandboxed" hint on cap-kill/API-error exits is noise
  (recorded in entries 444/448). Supervisor salvage rule tightened: verify
  `npm run build` too, not just tests (a salvaged mid-rework briefly broke
  `tsc -b`; caught and fixed same session, recorded in memory).

---
## 450 — Full-turn reducer landed: "decision → both actions → end-turn → next decision boundary" is now a genuine multi-turn cycle

- **State:** tree green at **205 files / 2426 tests** (+1 file/+5 tests
  over entry 449's 204/2421 — the 5 new reducer integration tests; the
  `speed` field's own mechanical ripple landed in existing files/tests, no
  new ones), build green. Ratchet green, **zero new barrier pins**. Census
  not regenerated (out of scope per this step's brief — pure
  orchestration/reducer wiring, no move-effect registrations changed,
  nothing to flip).
- **Did (new `src/engine/factoryBattleScriptFullTurnDecision.ts` +
  `tests/factoryBattleScriptFullTurnDecision.test.ts`), built directly on
  `runBattleEndTurnOrchestration` per entry 449's own "Next" naming this
  exact step:**
  - **Shared boundary reused, not invented:** the existing
    `BattleCommandRequest` (already names `side`/`battler`) asks the player
    first, then the trainer (test-supplied — the AI port is a later step,
    `docs/factory-ai-ground-truth.md`) — matching source's own
    `HandleTurnActionSelectionState` collecting both battlers' actions
    before `SetActionsAndBattlersTurnOrder` ever runs. No new shared
    boundary type.
  - **Turn order:** added a `speed` field to
    `BattleScriptRulesBattlerState` (own commit, `maxHP` precedent —
    defaulted to 100, mechanical ripple only: 2 legacy `emptyBattler`
    call sites + 2 `toStrictEqual`-on-full-battler-object test fixtures
    needed the same one-time update `maxHP` caused in entry 449). Turn
    order itself reuses `turnOrder.ts`'s already-ported
    `getWhoStrikesFirst` verbatim (priority bracket, then effective speed,
    then the speed-tie `Random() & 1` roll, drawn ONLY on a genuine tie —
    `battle_main.c:4728/4745`) — not re-derived.
  - **Second-action skip, sourced not assumed:** in singles, ANY
    fainted-actions fork from the first action — terminal
    (`gBattleOutcome != 0`) OR the non-terminal forced-switch dance —
    cancels the second action. Two distinct source mechanisms converge on
    this rule: `RunTurnActionsFunctions` (`battle_main.c:4937-4943`) forces
    `B_ACTION_FINISHED` once `gBattleOutcome != 0`; separately,
    `BattleScript_HandleFaintedMon`'s own tail runs `cancelallactions`
    right after `switchineffects` in singles (`data/battle_scripts_1.s
    :2893-2895`, already a registered no-op opcode), cancelling the
    pending action even when the battle doesn't end. Either way,
    `sEndTurnFuncsTable[gBattleOutcome]` (`battle_main.c:554-565`) only
    reaches `BattleTurnPassed` when `gBattleOutcome === 0` — so a terminal
    first action skips `runBattleEndTurnOrchestration` entirely (reported
    immediately), while a non-terminal forced switch still reaches it.
  - Each action runs its move's script from the LITERAL topology entry
    (`TOPOLOGY_BY_MOVE`, `factoryBattleScriptDecision.ts`'s own mechanism),
    reusing `runBattleScriptFaintedActionsOrchestration` after every action
    (not just the killing one) and `runBattleEndTurnOrchestration`
    unmodified — no field/battler loop re-derived.
  - **RNG reconciliation subtlety (new, not present in any single-command
    reducer):** the machine's own per-invocation ledger always starts its
    `calls` counter at 0 (`createBattleScriptRngState`'s own contract),
    while the decision boundary's cursor is cumulative across the WHOLE
    battle. Reconciliation now compares `rngAfter.calls` against
    `rngBefore.calls + finalState.rng.calls`, not the two directly —
    invisible in every prior reducer because those are single-invocation
    adapters whose `rngBefore.calls` is always 0.
  - **Integration proofs, all passing:** (1) a full two-turn cycle, real
    `GetWhoStrikesFirst` order (speed 100 vs 50, no tie), each hit chain's
    own 4-roll ledger pinned (8 calls/turn, 16 cumulative by turn 2, one
    continuous LCG stream — not reset per turn); (2) burn applied via a
    REAL Ember `MOVE_EFFECT_BURN` 10% proc on turn 1 (seed hunted by
    direct replay, not hand-derived), ticking the flat `floor(maxHP/8) =
    124` at both end-turns (recurrence, no growth — unlike Toxic,
    `docs/end-turn-ground-truth.md` §2b); (3) a mid-turn KO on the first
    action: terminal boundary reported directly, the trainer's own chosen
    move never dispatches (PP still full, 16 vs the player's used 15),
    `runBattleEndTurnOrchestration` never runs, exactly the killing blow's
    banked 4-roll ledger.
- **Next:** the non-terminal forced-switch variant of proof 3 (second
  action skipped via `cancelallactions` rather than terminal) is
  structurally handled by the reducer (same code path as the terminal
  case, gated on `faint1.kind`) but has no integration test this session —
  optional per the brief ("if cap allows"), landed the terminal case
  ("at minimum") instead. Confusion
  (`docs/stat-change-confusion-ground-truth.md`) and the AI move-selection
  port (`docs/factory-ai-ground-truth.md`) remain the next open
  subsystems; `runBattleEndTurnOrchestration`'s own still-barriered cases
  (Ingrain/Leech Seed/Wrap/weather/Reflect-Light Screen-Safeguard/etc.,
  entry 449's own "Next") are unchanged.
- **Notes:** no oracle traces added this session (all three proofs are
  direct-construction Tier-1, per this step's own brief). No
  presentation/`battleScene`/ROADMAP edits. OUT OF SCOPE per the brief and
  untouched: AI port, item/switch player actions beyond the existing fork,
  census refresh.

