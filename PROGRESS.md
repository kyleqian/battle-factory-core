# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 446 — Executable-frontier census's #1 lever landed: entry-chokepoint trio registered (`JUMPIFHALFWORD`/`JUMPIFSTATUS3CONDITION`/`ORWORD`) — the shared hit chain is now executable from its literal `BattleScript_EffectHit` entry

- **State:** tree green at **200 files / 2366 tests** (+3 files/+24 tests
  over entry 445's 197/2342), build green. Ratchet green: new barrier pin
  `battleScriptJumpifhalfwordOpcode.ts` → 1 (the other 14 concrete call
  sites' unmodeled memHword pointers — `gChosenMove`/`gBattleWeather`/
  `gTrainerBattleOpponent_A` — all barrier on this one named line);
  `jumpifstatus3condition`/`orword` need **zero** runtime barriers (see
  below), so they carry no pin at all. No new production imports of
  canonical recordings.
- **Did (commits `efd1cea`, `1c76424`, `2398407`), per the census's own
  ranked-table #1 row:**
  - **`B_SCR_OP_JUMPIFHALFWORD`** (`Cmd_jumpifhalfword`): sibling of
    `jumpifbyte`/`jumpifword`. Models `gCurrentMove` (the Surf guard's
    load-bearing pointer) against the full source-derived `MOVE_*` catalog;
    every other concrete call site's pointer is unmodeled → the one pinned
    barrier.
  - **`B_SCR_OP_JUMPIFSTATUS3CONDITION`** and **`B_SCR_OP_ORWORD`**: both
    turned out fully **(a)-complete** — all 7 concrete `jumpifstatus3condition`
    call sites use `BS_TARGET` + one of 5 named `STATUS3_*` bits, and all 43
    concrete `orword` call sites target `gHitMarker` with one of 11 named
    `HITMARKER_*` bits (`|`-joined text parsed at registration). Both use
    `Cmd_setbyte`'s own eager-validation-at-registration pattern (every
    concrete instance checked once, up front) instead of a runtime barrier.
  - **Surf-underwater sub-branch walked by hand + reachability test:** needs
    only `orword` plus the already-registered `setbyte` (`sDMG_MULTIPLIER`)
    — no new barrier.
  - **Integration proof:** `battleScriptHitChainOpcode.test.ts`'s RUNG 4 "hit
    turn" test now starts at the literal `BattleScript_EffectHit` (not the
    `BattleScript_HitFromAtkCanceler` shortcut every prior proof used), same
    banked 4-roll ledger; added a Surf-underwater sibling test.
    `factoryBattleScriptTerminalDecision.ts`'s `ENTRY_LABEL` switched the same
    way — its step loop is opcode-driven (256-step budget, no hardcoded PCs)
    so this was a clean, no-ripple change, verified by its own test + suite.
  - **Census regenerated:** **34/214 effects, 74/355 moves** executable (was
    1/214, 2/355). The predicted "~57/214" was optimistic — of the 56
    trio-only effects, ~22 also carry the tool's own tracked SetMoveEffect
    subsystem note (`Cmd_seteffectwithchance`'s family-B status2/misc
    dispatch barrier for their own `MOVE_EFFECT_*` byte, e.g.
    FLINCH/PAY_DAY/TRI_ATTACK) and correctly stay blocked-on-subsystem, out
    of scope. Updated the two ground-truth assertions the doc's own text
    said would flip (quintet: blocked-on-opcodes-with-JUMPIFHALFWORD →
    executable); all 8 checks pass. Also fixed a real bug this surfaced: the
    doc's "Key finding" paragraph was hardcoded prose about JUMPIFHALFWORD
    that would've gone self-contradictory (calling a now-registered opcode
    "still unregistered") — made it fully dynamic so it always names
    today's actual top blocker.
- **Next:** per the regenerated ranked table, `EFFECT_EARTHQUAKE`'s own trio
  (`BICWORD`, `JUMPIFNEXTTARGETVALID`, `SELECTFIRSTVALIDTARGET`) is now the
  single highest-leverage next registration (147 weighted, one effect).
  After that, `STATBUFFCHANGE`/`PLAYANIMATION`/`SETGRAPHICALSTATCHANGEVALUES`
  unlocks 9 effects/14 moves (the stat-up family) — but stat changes are
  explicitly out of this lane's scope; hand off to whoever owns that family.
  Forced-switch §4 slice 3 (`SWITCHHANDLEORDER`'s permutation layer, PROGRESS
  445's own finding) is still unstarted and still not "trivial."
- **Notes:** no oracle traces added this session; no presentation/
  `battleScene`/ROADMAP edits. Stat-down family, confusion, and end-turn
  orchestration remain explicitly out of scope.

---
## 445 — Forced-switch §4 slices 1-2 landed: `jumpifbattletype`/`openpartyscreen` registered — the non-terminal fork now runs through the AI's real pick

- **State:** tree green at **197 files / 2342 tests** (+3 files/+24 tests
  over entry 444's 194/2318), build green. `verify-forced-switch-ground-
  truth.ts` rerun live before starting and again after every commit: still
  **23/23 ALL PASS**. Ratchet green: `battleScriptJumpifwordOpcode.ts` (new,
  pin 1) and `battleScriptOpenPartyScreenOpcode.ts` (new, pin 3) added to
  `PINNED_BARRIER_COUNTS`, each with its own reachability test; no new
  production imports of canonical recordings.
- **Did (commits `3967df3`, `011deee`, `f3aa6bc`), per
  `docs/forced-switch-ground-truth.md` §4's own ordering:**
  - **Slice 1 — `B_SCR_OP_JUMPIFWORD`** (`Cmd_jumpifword`, structurally
    identical to the already-registered `Cmd_jumpifbyte` but 4-byte
    word/value): this is what `jumpifbattletype`/`jumpifnotbattletype`
    expand to. Registering it takes `BattleScript_HandleFaintedMon`'s
    `BATTLE_TYPE_TRAINER` gate from a halted barrier to a real taken jump
    for Factory, straight through to `BattleScript_FaintedMonSendOutNew`.
    Modeled memWord/value universe: `gBattleTypeFlags`/`gHitMarker` against
    the named constants this rung's path needs; everything else barriers.
  - **Slice 2 — `B_SCR_OP_OPENPARTYSCREEN`** (`BS_FAINTED`, plain-battler
    branch), the doc's own "single highest-leverage registration": (a)
    `src/engine/battleAiSwitchInto.ts` — a pure, RNG-free port of
    `GetMostSuitableMonToSwitchInto`'s pass-1 gate (type-matchup scoring +
    super-effective-move check, including the documented "picks the type
    that takes the MOST damage" bug and the mono-type-opponent double-
    multiply quirk), built and unit-tested standalone first per the doc's
    own suggestion; (b) the opcode itself, dispatching AI-controlled
    fainted battlers through that port (writes a new
    `monToSwitchIntoId[battler]` rules-context field, zero RNG) and barring
    three named, reachability-tested branches: doubles/multi topology,
    the player-side interactive party-menu round trip (§3/§4 step 10's own
    later slice), and pass-2's `AI_CalcDmg` raw-damage fallback (unreached
    by any fixture here). Extended `BattleScriptPartyMemberState`/`Input`
    with a `moves` field (backward compatible) — a real dependency the
    scoring function needed that the party slice didn't carry yet.
  - **Integration proof** (`tests/factoryBattleScriptTerminalDecision.test.ts`,
    `tests/battleScriptFaintedActionsOrchestration.test.ts`, both updated):
    the healthy-opponent-bench KO scenario now runs `checkteamslost ->
    jumpifbyte -> jumpifword -> openpartyscreen`, reproducing the banked
    ledger (MACHOP, party index 2, picked over PIDGEY's "next index" decoy,
    zero extra `Random()` calls) before halting at the next genuinely
    unregistered opcode, `switchhandleorder`. Also fixed a real gap this
    surfaced in `battleScriptFaintedActionsOrchestration.ts`'s
    `runScriptToOwnEnd`: it only treated an *unregistered* opcode as a
    barrier — a *registered* opcode's own internal `unsupported-branch`
    halt (now reachable for the first time) used to hit its catch-all
    "unexpected step" throw instead of surfacing as the same kind of named
    machine boundary. Fixed to treat any non-terminal halt uniformly.
- **Next — slice 3, `SWITCHHANDLEORDER`, is NOT the "trivial" transcription
  the doc characterized it as; a real finding for whoever picks this up:**
  reading `SwitchPartyOrder` (`battle_main.c:4086-4115`) shows it calls
  `GetPartyIdFromBattlePartyId()` + `SwitchPartyMonSlots()` against
  `gBattlePartyCurrentOrder`/`gBattleStruct->battlerPartyOrders` — a
  per-battler *permutation* layer over the raw party array that this
  engine does not model at all (today `party.opponent[i]` IS the raw
  array, no indirection). `monToSwitchIntoId`/`gBattlerPartyIndexes` are
  positions in that permuted order, not raw array indices, so slice 4
  (`GETSWITCHEDMONDATA`/`SWITCHINDATAUPDATE`) reading "party at
  `gBattlerPartyIndexes[battler]`" only lines up if this permutation is
  modeled first (or proven a no-op for singles — not yet checked). Do not
  skip this: it's the actual next slice, sized honestly rather than rushed
  in the time remaining this session. `docs/forced-switch-ground-truth.md`
  §4 should get a one-line correction pointing here.
- **Notes:** `battler({..., partyIndex})`/`.types`/`.moves` were all
  already-modeled fields this rung reused, not new plumbing. No
  presentation/`battleScene`/ROADMAP edits. Terminal KO path (empty bench)
  is untouched — confirmed byte-for-byte by the unchanged terminal-decision
  tests alongside the updated non-terminal ones.

