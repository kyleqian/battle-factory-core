# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 444 — SetMoveEffect status-write quartet registered (POISON/BURN/FREEZE/PARALYSIS) — secondary status procs are now kernel-executable

*(Entry written by the supervisor: the worker landed both code commits green
and was cap-killed mid-docs-update; suite/build/verify script independently
re-verified before this entry.)*

- **State:** tree green at **194 files / 2318 tests** (+31 over entry 443's
  2287 baseline at merge), build green. `B_SCR_OP_PRINTFROMTABLE` and
  `B_SCR_OP_UPDATESTATUSICON` registered (53 opcodes composed);
  `Cmd_seteffectwithchance`'s two SetMoveEffect dispatch barriers replaced by
  a real `applySetMoveEffect` dispatch, source-complete for
  {POISON, BURN, FREEZE, PARALYSIS} — per-status guards ported exactly
  (type immunities, existing-status, Safeguard, substitute), affects-user
  flag, `status1` write plus the party-record sync mirroring `datahpupdate`.
  Barrier pin `battleScriptHitChainOpcode.ts` 19 → 25, fully itemized in the
  ratchet test's own comment (net of the two retired dispatch barriers;
  SLEEP/TOXIC route via still-unregistered `Cmd_seteffectprimary`; family-B
  status2/misc cases incl. FLINCH stay barriers).
- **Did:** commits `78b1734` (registration + dispatch + 31 Tier-1 tests) and
  `e40c7f3` (integration proof: staged KADABRA Body Slam vs MAGNETON
  reproduces the banked ledger — proc seed paralyzes battler AND party slot
  with zero extra `Random()` draws vs a plain hit, control seed untouched,
  asserting `docs/set-move-effect-ground-truth.md`'s banked values).
  Verify script `verify-set-move-effect-ground-truth.ts` re-run all-PASS
  post-land (supervisor).
- **Next (banked prep, in consumption order):** (1) forced-switch
  registration slices — `docs/forced-switch-ground-truth.md` §4's 10-step
  plan, `openpartyscreen` first (both directions live-proven, 23/23 checks);
  (2) stat-down secondary family — `docs/stat-change-confusion-ground-truth.md`
  (`ChangeStatBuffs` zero-RNG, silent-guard finding); (3) end-turn
  orchestration — `docs/end-turn-ground-truth.md` (inline-faint structural
  finding, ORWORD/PLAYANIMATION gap, 17/17 checks). Animation lane:
  DRAGON_RAGE finish ladder in flight.
- **Notes:** FLINCH deliberately excluded (turn-order field ripple — its own
  slice). The cap-kill's "unauthenticated/sandboxed" postflight hint was
  noise (the worker ran 45 min and committed real work) — do not relaunch
  with sandbox overrides on that basis.

