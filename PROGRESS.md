# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

