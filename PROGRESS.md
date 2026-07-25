# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 449 — End-turn orchestration landed: `BattleTurnPassed` C-side scheduling equivalent, burn/poison/toxic ticks source-complete, faint machinery reused for end-turn KOs

- **State:** tree green at **204 files / 2421 tests** (+1 file/+5 tests
  over entry 448's 203/2416), build green. `verify-end-turn-ground-
  truth.ts` rerun live before starting and again after every commit: still
  **17/17 ALL PASS**. Ratchet green, **zero new barrier pins** — the new
  module's own case-level guards never fire on any existing production
  path (they're a standalone orchestration surface, not wired into an
  existing scenario yet). Census regenerated and diffed **byte-identical**
  to entry 448 (53/214 effects, 105/355 moves, 77/276 Factory-L50) — end
  turn is orchestration, not a move-effect entry, so nothing was expected
  to flip and nothing did.
- **Did (new `src/engine/battleEndTurnOrchestration.ts` +
  `tests/battleEndTurnOrchestration.test.ts`), per
  `docs/end-turn-ground-truth.md` §4:**
  - **Step 2 (orchestration loop, landed):** `runBattleEndTurnOrchestration`
    is the `BattleTurnPassed` C-side equivalent — same category as the
    already-landed `HandleFaintedMonActions` port, driving the full
    field-loop + all-battlers'-19-cases pass to completion in one call.
    Implements the doc's load-bearing ordering rule verbatim: the instant a
    fired tick's inline `checkteamslost` leaves `battleOutcome !== 0`, the
    field/battler loop stops immediately (no further cases, no further
    battlers) and falls through to the SAME unconditional
    `runBattleScriptFaintedActionsOrchestration` call the clean-completion
    path also uses (reused verbatim, not reimplemented).
  - **Step 1 + step 3 (`ORWORD` + Burn/Poison/Bad Poison, landed):**
    `ORWORD` was already registered (executable-frontier census, entry
    446). `BattleScript_PoisonTurnDmg`/`BurnTurnDmg` needed **zero new
    opcodes** — `orword`/`healthbarupdate`/`datahpupdate`/`tryfaintmon`/
    `checkteamslost`/`statusanimation`/`printstring`/`waitmessage`/`end2`
    were all already registered. Added the one real missing piece: a
    `maxHP` field on `BattleScriptRulesBattlerState` (defaults to `hp` for
    every legacy fixture — safe, since nothing read it before this doc),
    letting the C-side damage precompute (`gBattleMoveDamage = maxHP/8` or
    `/16`, the toxic-counter bump capped at `TOXIC_TURN(15)` with its party
    `status1` mirror) happen exactly where source does it, before
    `BattleScriptExecute`.
  - **Every doc-reachable case this engine doesn't model yet is a named
    barrier gated on its own real already-modeled bit/field** (never a
    blanket skip): Ingrain (`STATUS3_ROOTED`), Nightmare/Curse/Thrash
    (`status2` masks), Disable/Taunt (`disabledMove`/`tauntTimer`),
    Reflect/Light Screen/Mist/Safeguard (`sideStatuses`/`mistTimers`), and
    all four weather cases (the already-modeled `weather` field) all
    barrier for real if their trigger bit is ever set — currently never,
    since nothing in this engine sets any of them yet. Cases with **no**
    modeled trigger state at all (Leech Seed, Wrap, Uproar, Encore, Charge,
    Yawn, Wish, `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2`) are documented,
    permanently-inert no-ops today, matching this step's own brief's
    explicit Wish/Uproar/Leech-Seed deferral; Lock-On is skipped citing the
    doc's own dead-for-Factory finding (B15). `PLAYANIMATION` was already
    registered (narrowed to `B_ANIM_STATS_CHANGE`) — Ingrain/Leech
    Seed/Wrap's own animation arm would barrier there for real if ever
    reached, so it needed no further work this session.
  - **Known simplification, documented, not silently assumed:** per-battler
    tick order defaults to ascending battler id — `gBattleMons[].speed` has
    no home anywhere in `BattleScriptRulesContext` (a separate subsystem
    from `turnOrder.ts`'s own speed model). Not exercised by any proof
    here or by the doc's own live scenarios, both of which give exactly
    one battler a live end-turn condition at a time.
  - **Integration proofs, all passing:** (a) burn ticks the doc's exact
    live 105→92→79 sequence across two consecutive `runBattleEndTurnOrchestration`
    calls, battler AND party slot both synced, zero RNG draws either turn;
    (b) a Toxic end-turn KO (SHEDINJA-shaped, 1 HP) runs the SAME faint
    machinery as a mid-turn KO — inline `checkteamslost` decides
    `battleOutcome`, `HandleFaintedMonActions` still runs unconditionally,
    `cleareffectsonfaint` clears status1, zero further RNG; (c) regular
    poison (flat `floor(maxHP/8)`, no counter) and Toxic's growing
    multiplier (1x then 2x across two turns) both pinned as their own
    direct-construction tests, distinguishing the three `DoTurnDmg`-family
    statuses from each other.
- **Next (named, not landed — doc §4 steps 4-8):** `DoFieldEndTurnEffects`
  itself only ever no-ops today (Reflect/Light Screen/Safeguard/weather
  have no setter anywhere in this engine yet); Ingrain/Leech Seed/Wrap's
  own heal/drain bodies (need `PLAYANIMATION`'s animType broadened past
  `B_ANIM_STATS_CHANGE`, plus `COPYWORD`/`JUMPIFABILITY`/`MANIPULATEDAMAGE`
  for Leech Seed specifically); the zero-script counter cases
  (Disable/Encore/Lock-On/Charge/Taunt/Yawn bodies); Thrash's
  `CHOSENSTATUS2ANIMATION`; and **item (c)'s full "decision → both actions
  → end-turn → next decision boundary" dual-sided reducer** was not
  attempted this session (a genuinely new capability — every existing
  decision reducer is single-command-per-turn) — proofs (a)/(b) instead
  used the doc's own established direct-construction discipline (§3),
  which is sufficient to prove the orchestration module itself but does
  not yet wire it behind a `BattleDecisionReducer`. Whoever picks this up
  next should build that reducer directly on
  `runBattleEndTurnOrchestration` rather than re-deriving the field/battler
  loop.
- **Notes:** no oracle traces added this session (reused the doc's own
  banked `mechanic-endturn-burn-off.json`/`mechanic-endturn-toxic-ko-off.json`
  evidence). No presentation/`battleScene`/ROADMAP edits. Two pre-existing
  `toStrictEqual`-on-full-battler-object tests
  (`battleScriptAttackCancelerFlinch`/`Disabled.test.ts`) needed their own
  local battler fixture builders updated with the new `maxHP` default —
  the same one-time ripple every new battler field causes; fixed inline.

