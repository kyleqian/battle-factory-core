# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 448 — ChangeStatBuffs core + BOTH stat-change routes registered — census at 105/355 moves (77/276 Factory-L50) executable

*(Entry written by the supervisor: the worker landed all five rungs green
and was killed by an API server error during its docs tail; suite/build/
both verify scripts/census independently re-verified before this entry.)*

- **State:** tree green at **203 files / 2416 tests** (+20 over entry 447),
  build green. Census (re-run live): **53/214 effects, 105/355 moves,
  77/276 Factory-L50 moves executable** (was 34/74/53 after the trio), 12
  ground-truth checks pass. Both stat verify scripts all-PASS.
- **Did (commits `e263061`, `8342ed0`, `b4b9f42`):** `ChangeStatBuffs`
  ported source-completely (exact guard-ladder order, flags semantics —
  silent secondary guards vs `STAT_CHANGE_ALLOW_PTR` primary message path,
  shared value-2 `WONT_INCREASE/_DECREASE` quirk, zero RNG); secondary
  stat `MOVE_EFFECT_*_PLUS/_MINUS` cases wired in `applySetMoveEffect`
  (banked Crunch SP_DEF_MINUS_1 proc/control/Clear-Body ledgers asserted);
  primary route registered end-to-end (`STATBUFFCHANGE`,
  `SETGRAPHICALSTATCHANGEVALUES`, `PLAYSTATCHANGEANIMATION`, plus the
  DOWN-path's `JUMPIFSTATUS2`/`ORBYTE`; `setstatchanger` confirmed a
  setbyte alias) with integration proofs from the LITERAL topology entries
  (Swords Dance +2 zero rolls, Tail Whip -1 one accuracy roll, Clear Body
  block with ability-reveal message at unchanged RNG-step count,
  at-bound early-out). Census doc regenerated + committed; its
  ground-truth assertions updated deliberately (12 checks).
- **Next:** end-turn orchestration (`docs/end-turn-ground-truth.md`, 17/17
  checks banked — the last structural piece for multi-TURN battles), then
  confusion (`docs/stat-change-confusion-ground-truth.md`) and the AI
  move-selection port (`docs/factory-ai-ground-truth.md`, 15/17-roll
  ledgers banked). Forced-switch §4 step 10 (player-side interactive
  party-menu controller state) remains the one named barrier on that path.
- **Notes:** the killing API error hit mid-response during docs; no code
  was lost (all rungs committed). The launcher's "unauthenticated/
  sandboxed" postflight hint is again noise on this failure mode.

---
## 447 — Forced-switch §4 slices 3-9 landed: the non-terminal faint fork is now COMPLETE — multi-KO battles are mechanically possible

- **State:** tree green at **202 files / 2396 tests** (+2 files/+30 tests
  over entry 446's 200/2366), build green. `verify-forced-switch-ground-
  truth.ts` rerun live before starting and again after every commit: still
  **31/31 ALL PASS**. Ratchet green: new pin `battleScriptSwitchinOpcode.ts`
  → 8 barriers (itemized in the ratchet's own comment), each with a
  reachability test in the new `tests/battleScriptSwitchinOpcode.test.ts`;
  no new production imports of canonical recordings.
- **Did, per `docs/forced-switch-ground-truth.md` §4/§5 (new §6 written
  summarizing this landing)/§1a's own opcode enumeration:**
  - **`B_SCR_OP_SWITCHHANDLEORDER`** (`Cmd_switchhandleorder`, cases 2/3):
    per §5's settled finding, `SwitchPartyOrder`'s permutation table is
    presentation-only and is **not modeled** — the opcode reduces to
    transcribing the already-decided `monToSwitchIntoId[battler]` into
    `battleCommunication0`. Cases 0/1 (multi-battler/order-only) barrier.
  - **`B_SCR_OP_GETSWITCHEDMONDATA` + `B_SCR_OP_SWITCHINDATAUPDATE`**: the
    first "rebuild an active battler from a bench record" registration.
    Commits `partyIndex = monToSwitchIntoId[battler]`, then rebuilds
    species/hp/status1/types from the party record at that index and resets
    stat stages/status2/status3/the modeled DisableStruct-shaped fields
    (rolloutTimer, furyCutterCounter, truantCounter, rechargeTimer,
    disabledMove, usedDisabledMove, tauntTimer, usedTauntedMove,
    usedImprisonedMove) to `SwitchInClearSetData`'s neutral values, plus the
    cross-battler `STATUS2_INFATUATED_WITH` clear (same precedent as
    `cleareffectsonfaint`). `ability`/`item`/`moves`/`pp` are **not**
    rebuilt — no species-ability table, no per-battler party moves/pp
    modeled — documented, not silent (matches the established
    cleareffectsonfaint precedent for untracked fields).
  - **`B_SCR_OP_SWITCHINANIM`, `B_SCR_OP_HPTHRESHOLDS`,
    `B_SCR_OP_CANCELALLACTIONS`, `B_SCR_OP_VARIOUS`'s
    `RESET_PLAYER_FAINTED` case, `B_SCR_OP_DRAWPARTYSTATUSSUMMARY`**:
    switchinanim clears the switched-in battler's `gAbsentBattlerFlags` bit
    (Pokédex-seen skipped, Factory is always Frontier); hpthresholds/
    cancelallactions are pure no-ops (their only writes are untracked,
    unread fields); various's case 7 clears `HITMARKER_PLAYER_FAINTED` under
    its real gate; drawpartystatussummary joins hidepartystatussummary's
    existing controller-emit pattern.
  - **`B_SCR_OP_SWITCHINEFFECTS`**: clears `HITMARKER_FAINTED(battler)`.
    Spikes barriers on the real `SIDE_STATUS_SPIKES` bit — structurally
    unreachable since `sideStatuses` is narrowed to Safeguard only. Truant
    and `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN)` barrier on the
    switched-in battler's real `ability` against the closed trigger set
    (Drizzle/Sand Stream/Drought/Intimidate/Forecast/Trace/Cloud
    Nine/Air Lock, `battle_util.c:2485-2599`). `ItemBattleEffects
    (ITEMEFFECT_ON_SWITCH_IN)` needed **no barrier at all**: its only two
    cases are HOLD_EFFECT_RESTORE_STATS (unreachable — stat stages are
    always neutral post-`switchindataupdate`) and HOLD_EFFECT_DOUBLE_PRIZE
    (writes an untracked, unread field).
  - **Orchestration fix (`battleScriptFaintedActionsOrchestration.ts`)**:
    `runScriptToOwnEnd` now auto-acknowledges controller round trips (a real
    gap — the forced-switch dance's own opcodes mark battlers pending,
    which nothing before this consumed). The result type's old single
    "terminal" kind is split by `battleOutcome`: nonzero is real terminal
    (checkteamslost's own jump); zero is a new **`"resumed"`** kind — every
    fainted battler's script reached `BattleScript_FaintedMonEnd` via the
    full forced-switch dance instead, battle genuinely continues.
  - **Reducer (`factoryBattleScriptTerminalDecision.ts`)**: surfaces
    `"resumed"` as a real `{ kind: "decision-required" }` boundary, reusing
    the adapter's own established single-command-per-turn shape (the
    mover's side, its one known move, now targeting the switched-in
    battler) — **not** end-turn orchestration (dual-sided submission, turn
    priority, AI's next pick), which stays explicitly out of scope. Added
    `opponentBenchOverride` to `FactoryTerminalMoveConfig` (optional,
    backward-compatible) so the integration test could stage a real
    switch-in candidate (MACHOP + Karate Chop) without touching either
    existing bench fixture.
  - **Integration proof**
    (`tests/factoryBattleScriptTerminalDecision.test.ts`, new test): the
    healthy-bench KO scenario now runs the **entire** forced switch —
    `checkteamslost -> jumpifbyte -> jumpifword -> openpartyscreen ->
    switchhandleorder -> getswitchedmondata -> switchindataupdate ->
    hpthresholds -> hidepartystatussummary -> switchinanim -> waitstate ->
    resetplayerfainted -> switchineffects -> cancelallactions -> end2` —
    MACHOP becomes the real active opponent battler (species/hp/types/
    partyIndex from the party record, neutral stat stages/status), zero
    `Random()` draws beyond the banked 4-roll hit chain, and the reducer
    returns a genuine next `decision-required` boundary. The terminal path
    (empty bench) and the pre-existing openpartyscreen-pass-2-fallback
    barrier fixture are both untouched, still passing byte-for-byte.
- **Next:** §4 step 10 (player-side interactive party-menu controller
  state) is the one remaining named barrier on this whole path — RAM-proven
  recipe already banked in §3, not attempted this session (explicitly out
  of scope per the brief). Otherwise the non-terminal faint fork is
  COMPLETE: multi-KO battles are now mechanically possible end-to-end for
  the AI/trainer side. Stat-down family, confusion, and end-turn
  orchestration (dual-sided action selection, turn-order priority) remain
  the next open subsystems for whoever picks up S10.
- **Notes:** no oracle traces added this session (reused the banked
  `mechanic-forced-switch-ai-choice-off.json`/dump-forced-switch-party-
  order.py evidence from §2/§5b). No presentation/`battleScene`/ROADMAP
  edits. `BATTLE_TYPE_FRONTIER` is itself an OR of every frontier
  facility's bit including `BATTLE_TYPE_ARENA` — a real source quirk that
  tripped the new opcode file's own tests during development (fixed by
  using `BATTLE_TYPE_FACTORY` alone in test fixtures); worth flagging for
  any future fixture that checks a single frontier-facility bit.
