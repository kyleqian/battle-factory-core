# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 443 — S10 kernel-breadth RUNG 1 complete (`Cmd_ppreduce` Pressure barriers retired); RUNG 2 (SetMoveEffect quartet) scoped, not attempted this session

- **State:** tree green at **194 files / 2286 tests** (+10 tests over entry
  442's 2276), build green, ratchet green — `battleScriptHitChainOpcode.ts`'s
  barrier pin shrank **21 -> 19** (the two retired Pressure barriers, delta
  named). `docs/set-move-effect-ground-truth.md`'s verify script rerun live
  before starting RUNG 2 scoping: still all-PASS.
- **Did (RUNG 1, committed `c33286c`):** ported the real
  `AbilityBattleEffects(ABILITYEFFECT_COUNT_ON_FIELD/COUNT_OTHER_SIDE, ...)`
  loops (`battle_util.c:3160-3191`) into `Cmd_ppreduce`, bounded by the real
  `gBattlersCount` (2 singles / 4 doubles, same precedent as
  `cleareffectsonfaint`'s existing loop), replacing the two unconditional
  barriers that blocked every `MOVE_TARGET_BOTH`/`MOVE_TARGET_FOES_AND_ALLY`
  move (ROCK_SLIDE, EARTHQUAKE, SURF...) from the hit chain — surfaced by the
  presentation-seam checkpoint (PROGRESS 442). 15 new Tier-1 tests: both
  count forms in singles (the real loop degenerates to the old default-branch
  result) and doubles (genuine multi-battler scan — allies excluded from
  COUNT_OTHER_SIDE, allies included in COUNT_ON_FIELD, cumulative counts,
  attacker excluded from its own count), plus one full hit-chain integration
  test driving ROCK_SLIDE from opcode 0 through `ppreduce` to the script's
  own `end` (previously impossible — this is the leverage proof).
- **RUNG 2 (SetMoveEffect status quartet + flinch): scoped via a live source
  read, deliberately NOT attempted this session** — invoking the brief's own
  escape hatch rather than risk a half-finished, uncommitted cross-cutting
  change under the hard time cap. Concretely, for the next session:
  - **2 new opcodes, both small.** `B_SCR_OP_PRINTFROMTABLE`
    (`Cmd_printfromtable`, `battle_script_commands.c:2180`) needs **no new
    port** — it's a table pointer + `MULTISTRING_CHOOSER` index into one of 7
    small constant tables (`gGotPoisonedStringIds`/`BurnedStringIds`/
    `FrozenStringIds`/`ParalyzedStringIds`, 2 entries each: STATUSED /
    STATUSED_BY_ABILITY; `gPSNPreventionStringIds`/`BRNPreventionStringIds`/
    `PRLZPreventionStringIds`, 3 entries each: ABILITY_PREVENTS_MOVE_STATUS /
    ABILITY_PREVENTS_ABILITY_STATUS / STATUS_HAD_NO_EFFECT, all in
    `battle_message.c:1072-1231`) — resolve table+index to a literal
    `STRINGID_*` operand and feed the *already-registered* `prepareMessage`
    port, same synthetic-operand trick this file already uses for
    `STRINGID_USEDMOVE_OPERAND`. `B_SCR_OP_UPDATESTATUSICON`
    (`Cmd_updatestatusicon`, `:7699`) reuses the existing `BS_EFFECT_BATTLER`
    selector resolver for the non-doubles branch; `BS_ATTACKER_WITH_PARTNER`
    (doubles) is a clean (b) barrier.
  - **SetMoveEffect's dispatch** (`:2234-2521` POISON/BURN/FREEZE/PARALYSIS,
    `:2546-2567` FLINCH): each status write is
    `BattleScriptPush(next) + goto sMoveEffectBS_Ptrs[byte]`
    (`BattleScript_MoveEffect{Poison,Burn,Freeze,Paralysis}`:
    `statusanimation, printfromtable <table>, waitmessage, goto
    BattleScript_UpdateEffectStatusIconRet` -> `updatestatusicon, waitstate,
    return`) on success, each guarded by one ability (Immunity/Water
    Veil/Magma Armor/Limber) with its own `BattleScript_{PSN,BRN,PRLZ}
    Prevention` push+jump sub-script, plus type immunity (POISON:
    Poison/Steel; BURN: Fire; FREEZE: Ice + sun-no-freeze; PARALYSIS: none).
    All 4 share the affects-user flag, the Shield Dust/Safeguard/0-HP/
    Substitute `INCREMENT_RESET_RETURN` early-outs (`:2253-2267`), and the
    party-record `status1` sync (mirrors the already-established
    `datahpupdate` live-sync pattern — ground truth doc §2 pinned this needs
    no new plumbing). SLEEP(1)/TOXIC(6) stay named (b) barriers — unreachable
    via this call site per the doc (their own scripts use the still-
    unregistered `Cmd_seteffectprimary`).
  - **FLINCH(8) needs one genuinely new `BattleScriptRulesContext` field**
    (turn order / `gCurrentTurnActionNumber`, for `GetBattlerTurnOrderNum
    (gEffectBattler) > gCurrentTurnActionNumber`) before its plain
    `status2 |=` write is source-complete — real new cross-cutting plumbing
    (construction/validation, every existing test fixture), not just a
    dispatch branch. This is the one piece of the doc's "zero new opcodes"
    claim that's still nontrivial; left a named (b) barrier rather than rush
    a new required field this session.
  - Net finding: the guard structure is **not** materially bigger than the
    doc's enumeration (confirmed by reading the real source, not assumed) —
    RUNG 2 is tractable, just larger than the time remaining this session.
- **Next:** RUNG 2 as scoped above — printfromtable/updatestatusicon first
  (small, no new ports), then the quartet dispatch with party sync, then the
  integration proof against the banked KADABRA/MAGNETON paralysis ledger in
  `docs/set-move-effect-ground-truth.md` §2 (must match: 8 total rolls, zero
  extra draws for the proc, `status1` written on both the battler and its
  party slot, control seed untouched). Flinch's turn-order field is a
  separate, addable-after slice.
- **Notes:** no oracle traces added this session beyond the pre-check
  verify-script rerun (all PASS); no presentation/`battleScene`/ROADMAP
  edits; stat-down family and confusion remain explicitly out of scope per
  the doc.

