# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 453 — MOVE_EFFECT_CONFUSION (7) and MOVE_EFFECT_FLINCH (8) registered in SetMoveEffect's dispatch — zero new opcodes, census +4 effects/+17 moves

- **State:** tree green at **207 files / 2465 tests** (+0 files/+16 tests
  over entry 452's 207/2449 — all new tests landed in existing files: 14 in
  `battleScriptHitChainOpcode.test.ts` (a new confusion/flinch describe
  block; 2 obsolete FLINCH barrier tests were replaced 1:1 with UPROAR-based
  equivalents, net 0 there), 1 each in the two dedicated
  `battleScriptAttackCanceler{Confused,Flinch}.test.ts` integration
  additions, plus a small key-list fixup in `battleScriptRulesContext.test.ts`
  and two `toStrictEqual` fixture updates), build green. Census regenerated:
  **53→57 effects, 105→122 moves, 77→92 Factory-L50 (944→1099 weighted)**.
  Ratchet green, zero pin changes (the 2 barrier tests removed for FLINCH
  were replaced 1:1 with UPROAR-based equivalents — same barrier call site,
  different still-unsupported byte).
- **Did, per `docs/stat-change-confusion-ground-truth.md` §1.6/§2.5 and
  `docs/set-move-effect-ground-truth.md` (both banked, cited not re-derived):**
  - `applySetMoveEffect` (`battleScriptHitChainOpcode.ts`) now dispatches
    `MOVE_EFFECT_CONFUSION`/`MOVE_EFFECT_FLINCH` before falling through to
    the stat-family table / unsupported-branch barrier. CONFUSION: shared
    family-B early-out + Own Tempo gate, `(Random()%4)+2` duration draw,
    plain status2 write (guaranteed-zero bits), push+jump to
    `BattleScript_MoveEffectConfusion` (all 4 of its ops were already
    registered). FLINCH: Inner Focus gated on `certain` (a direct, un-pushed
    jump to `BattleScript_FlinchPrevention` — that script's own `goto
    BattleScript_MoveEnd` tail ends the move, unlike the status1 quartet's
    push+jump preventions), otherwise a plain status2 write gated on the
    target not having acted yet this turn, always falling through with no
    script call either way (source-verbatim from `battle_script_commands.c`
    :2524-2567 — read fresh, not assumed).
  - FLINCH's turn-order gate (`GetBattlerTurnOrderNum(effectBattler) >
    gCurrentTurnActionNumber`) needed two new `BattleScriptRulesContext`
    fields: per-battler `turnOrderNum` and context-level
    `currentTurnActionNumber`. `factoryBattleScriptFullTurnDecision.ts` is
    the one real owner (mover1=0/mover2=1, set once per action via a new
    `withTurnOrderPositions` helper); every other construction site
    (including every existing single-command fixture) defaults to
    `turnOrderNum=1`/`currentTurnActionNumber=0` — the source-faithful
    "target hasn't acted yet" shape those fixtures' own one-attacker-action
    staging already implies, not a made-up convenience default. Three
    `emptyBattler`/filler-battler call sites (`factoryBattleScriptDecision.ts`,
    `factoryBattleScriptFullTurnDecision.ts`, `factoryBattleScriptTerminalDecision.ts`)
    needed the same one-time mechanical ripple `speed`/`maxHP` caused
    previously.
  - **Found and fixed a latent RNG-threading bug** in
    `createSeteffectwithchanceOpcodeHandler`/`finalizeSeteffectwithchance`:
    the latter unconditionally overwrote the returned transition's `.rng`
    with the pre-dispatch value, silently discarding any RNG draw made
    *inside* `applySetMoveEffect`. Invisible until now because every
    previously-registered effect byte (the status1 quartet, `ChangeStatBuffs`)
    draws zero RNG — confusion's duration draw is the first genuine second
    draw within one `seteffectwithchance` step. Fixed by threading the
    post-chance-roll rng through `context.state` before calling
    `applySetMoveEffect`, so its own returned `.rng` is authoritative and
    the override is no longer needed.
  - **New Tier-1 coverage** (`battleScriptHitChainOpcode.test.ts`): docs
    §2.5's real oracle ledger (seed 9 proc / seed 1 control) reproduced
    byte-for-byte — raw rngValues confirmed live via `bin/oracle lab` at
    authoring time (frame-0 789488161/3034451114, forward-stepped 3 LCG
    steps past the shared accuracy/crit/damage rolls to the exact pre-roll-4
    state), not synthesized — plus Own Tempo/Safeguard(blocks, `<=7`
    gate)/Substitute/already-confused gates for CONFUSION, and Inner
    Focus/Safeguard-does-NOT-block(`<=7` gate excludes byte 8)/Shield-Dust-
    DOES-block(`<=9` gate includes it)/turn-order-gate-negative/
    already-flinched gates for FLINCH.
  - **Two new integration tests** prove infliction feeds the *existing*
    CANCELER_CONFUSED/CANCELER_FLINCH reducers with zero adaptation glue:
    `battleScriptAttackCancelerConfused.test.ts` replays docs §2.5's ledger
    end-to-end (rolls 4-5 via the production opcode dispatch, then roll 6 —
    the canceler's own `Random()&1` check — via the reducer directly),
    landing on the exact live frame-300 `rngValue` (679317255) docs §2.5
    itself verified against the oracle. `battleScriptAttackCancelerFlinch.test.ts`
    proves a flinched battler's next admission reaches the reducer's
    `"flinched"`/`BattleScript_MoveUsedFlinched` cant-move outcome.
  - Census tool: added `MOVE_EFFECT_CONFUSION`/`MOVE_EFFECT_FLINCH` to
    `SETMOVEEFFECT_SUPPORTED` plus 5 new drift-guard checks (4
    require-executable, 1 require-still-blocked for TRI_ATTACK). Four
    effect scripts flip fully executable: `EFFECT_CONFUSE_HIT`,
    `EFFECT_FLINCH_HIT`, `EFFECT_FLINCH_MINIMIZE_HIT` (Stomp/Minimize
    class), `EFFECT_TWISTER`; six more (Razor Wind/Sky Attack/Snore/Skull
    Bash/Solar Beam/Fake Out) have their remaining-blocker reason correctly
    narrowed (FLINCH no longer in their list) but stay blocked on other
    still-missing opcodes.
- **Next:** ISSUES #44 (a pre-existing, unrelated census gap found along the
  way — the stat-down secondary-effect family was never added to
  `SETMOVEEFFECT_SUPPORTED`, so its 4 `EFFECT_*_DOWN_HIT` entries still
  misreport `blocked-on-subsystem`; cheap follow-up, named not fixed here);
  the non-terminal forced-switch continuation into the full-turn/end-turn
  dual-sided reducers (currently a named, unreachable throw); the AI
  move-selection port (`docs/factory-ai-ground-truth.md`);
  `DoFieldEndTurnEffects` setters (screens/weather); primary-effect
  confusion (`EFFECT_CONFUSE`, `Cmd_seteffectprimary`, out of this step's
  scope) and the other status2 family members (TRI_ATTACK/UPROAR/etc.).
- **Notes:** no oracle traces committed (Tier-1 direct-construction per this
  doc's own established discipline; the oracle was queried live only to
  derive the two raw rngValue literals now pinned in the test file, same
  discipline the stat-change-confusion ground-truth doc itself used). No
  presentation/`battleScene`/ROADMAP edits. OUT OF SCOPE per the brief and
  untouched, confirmed: CANCELER internals (reused, not modified),
  primary-effect confusion (`CONFUSE_RAY`'s `EFFECT_CONFUSE` path — did not
  fall out free, `Cmd_seteffectprimary` stays unregistered),
  TRI_ATTACK/UPROAR/other status2 family members, AI port. PAPERCUT: none
  this session.

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

