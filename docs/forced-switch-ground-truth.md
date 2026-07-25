# Forced-switch (non-terminal faint fork) ground truth

Prep-scout for the kernel's non-terminal faint fork: when a battler faints but
its side still has a healthy replacement, the real game runs a forced switch
and the battle **continues** to the next decision, instead of ending. This is
PREP, not registration — no `src/` production code is touched by this
document's worker.

The kernel currently halts (a deliberate, named `"non-terminal-barrier"`) at
the first unregistered instruction on this path:
`jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose`
inside `BattleScript_HandleFaintedMon` (`data/battle_scripts_1.s:2830-2897`,
`src/engine/battleScriptFaintedActionsOrchestration.ts`'s
`"non-terminal-barrier"` result kind). Everything below walks from that
barrier to "replacement mon is active, battle resumes."

Rerunnable verify script: `tools/probe/verify-forced-switch-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-forced-switch-ground-truth.ts`).
All checks **PASS** against the live `battle-scene-off` oracle as of this
writing.

## 1. Source topology: opcode by opcode from the barrier to resumption

Since Factory is `BATTLE_TYPE_TRAINER`, execution jumps straight to
`BattleScript_FaintedMonTryChoose`. The middle section of that label (the
"ask player yes/no whether to send a mon in before the opponent" Yes/No
dialog, `setatktoplayer0`/a second `openpartyscreen BS_ATTACKER`/etc.) is
**dead code for Factory**: the very next instruction reached is
`jumpifbattletype BATTLE_TYPE_FRONTIER, BattleScript_FaintedMonSendOutNew`,
and Factory is always `BATTLE_TYPE_FRONTIER`, so that jump is **always
taken**, skipping the dead section entirely. The reachable path for a Factory
singles battle is exactly:

```
BattleScript_FaintedMonTryChoose::
	openpartyscreen BS_FAINTED, BattleScript_FaintedMonEnd
	switchhandleorder BS_FAINTED, 2
	jumpifnotbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonSendOutNew   @ not taken (IS trainer)
	jumpifbattletype BATTLE_TYPE_LINK, ...                                       @ not taken
	jumpifbattletype BATTLE_TYPE_RECORDED_LINK, ...                              @ not taken
	jumpifbattletype BATTLE_TYPE_FRONTIER, BattleScript_FaintedMonSendOutNew     @ TAKEN
BattleScript_FaintedMonSendOutNew::
	drawpartystatussummary BS_FAINTED
	getswitchedmondata BS_FAINTED
	switchindataupdate BS_FAINTED
	hpthresholds BS_FAINTED
	printstring STRINGID_SWITCHINMON
	hidepartystatussummary BS_FAINTED
	switchinanim BS_FAINTED, FALSE
	waitstate
	resetplayerfainted
	switchineffects BS_FAINTED
	jumpifbattletype BATTLE_TYPE_DOUBLE, BattleScript_FaintedMonEnd             @ not taken (not doubles)
	cancelallactions
BattleScript_FaintedMonEnd::
	end2
```

(`data/battle_scripts_1.s:2843-2897`.)

### 1a. Opcode enumeration

| Opcode | `B_SCR_OP_*` id | Dispatcher (file:line) | Controller round-trip? | `Random()` sites | State read/written |
| --- | -: | --- | --- | --- | --- |
| `openpartyscreen BS_FAINTED` | 0x50 | `Cmd_openpartyscreen`, `battle_script_commands.c:5094-5149` (plain-battler `else` branch) | **Yes** — `BtlController_EmitChoosePokemon(PARTY_ACTION_SEND_OUT,...)` (`:5120`) + `MarkBattlerForControllerExec` (`:5121`); this is the opcode that actually triggers the per-side choice (see §1b) | zero (grepped) | `gBattleStruct->battlerPartyIndexes[battler]`, `monToSwitchIntoId[battler]=PARTY_SIZE` placeholder, `field_93` bit cleared; `gBattleResults.playerSwitchesCounter++` if player |
| `switchhandleorder BS_FAINTED, 2` | 0x51 | `Cmd_switchhandleorder`, `:5152-5217` (case 2→3) | No (pure) — reads a buffer the prior round-trip already filled | zero | `gBattleCommunication[0] = monToSwitchIntoId[battler] = gBattleBufferB[battler][1]`; calls `SwitchPartyOrder` → physically reorders `gPlayerParty`/`gEnemyParty` so the chosen mon is "next up" |
| `drawpartystatussummary BS_FAINTED` | 0x61 | `Cmd_drawpartystatussummary`, `:5697-5732` | Yes — `BtlController_EmitDrawPartyStatusSummary` | zero | Reads `MON_DATA_SPECIES_OR_EGG/HP/STATUS` for all 6 party slots into a local buffer; no `gBattleMons` write |
| `getswitchedmondata BS_FAINTED` | 0x4C | `Cmd_getswitchedmondata`, `:4606-4619` | Yes — `BtlController_EmitGetMonData(REQUEST_ALL_BATTLE,...)` | zero | `gBattlerPartyIndexes[battler] = monToSwitchIntoId[battler]` — this is the actual "which bench slot is now active" commit |
| `switchindataupdate BS_FAINTED` | 0x4D | `Cmd_switchindataupdate`, `:4621-4671` | No (pure) — consumes the buffer the prior round-trip filled | zero | Full `struct BattlePokemon` byte-copy into `gBattleMons[battler]` from the controller buffer; then explicitly recomputes `types[0]/[1]` and `ability` from `gSpeciesInfo`; clears item if knocked off; calls `SwitchInClearSetData()` (stat-stage/volatile reset, see §2c) |
| `hpthresholds BS_FAINTED` | 0x73 | `Cmd_hpthresholds`, `:6258-6283` | No (pure) | zero | Buckets the **opposing** (non-fainted) battler's HP% into `gBattleStruct->hpScale` — scores the survivor, not the incoming mon |
| `hidepartystatussummary BS_FAINTED` | 0x62 | `Cmd_hidepartystatussummary`, `:5734-5741` | Yes — `BtlController_EmitHidePartyStatusSummary` | zero | UI-hide only |
| `switchinanim BS_FAINTED, FALSE` | 0x4E | `Cmd_switchinanim`, `:4674-4698` | Yes — `BtlController_EmitSwitchInAnim` | zero | Pokédex-seen flag (skipped — Factory is Frontier, `:4682-4686`); clears `gAbsentBattlerFlags` bit |
| `waitstate` | 0x3A | `Cmd_waitstate`, `:3927-3931` | Is the busy-wait primitive itself: advances only once `gBattleControllerExecFlags==0` | zero | none |
| `resetplayerfainted` | `various BS_ATTACKER, VARIOUS_RESET_PLAYER_FAINTED` (`B_SCR_OP_VARIOUS`=0x76, case 7) | `Cmd_various`, `:6375-6383` | No | zero | Clears `gHitMarker &= ~HITMARKER_PLAYER_FAINTED` if both battlers 0/1 are alive and non-link/double/trainer |
| `switchineffects BS_FAINTED` | 0x52 | `Cmd_switchineffects`, `:5219-5299` | Indirectly — calls `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN,...)`/`ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN,...)`, which can push their own sub-scripts | zero direct (not counting whatever those effects do) | Clears `HITMARKER_FAINTED(battler)`, `faintedHasReplacement=FALSE`; Spikes check (none in Factory here); Truant counter; snapshots `hpOnSwitchout` |
| `cancelallactions` | 0x68 | `Cmd_cancelallactions`, `:5850-5858` | No | zero | `gActionsByTurnOrder[i] = B_ACTION_CANCEL_PARTNER` for every battler — invalidates the rest of the turn's queued actions |

**Zero new RNG accounting burden**: every opcode on this path has zero
`Random()` call sites (grepped, each function's full body) — matching
`docs/faint-outcome-ground-truth.md`'s finding for the terminal path and
confirmed live below (§2).

### 1b. Player vs. AI choice mechanism (the crux)

`Cmd_switchhandleorder` never decides who switches in — it only reads back a
value the controller already wrote. The real decision happens inside
`openpartyscreen BS_FAINTED`'s `BtlController_EmitChoosePokemon` round-trip,
resolved per-side by the battler's own controller callback:

- **Player side**: `PlayerHandleChoosePokemon`
  (`battle_controller_player.c:2665-2688`) does not choose anything itself —
  it begins a palette fade and sets
  `gBattlerControllerFuncs[gActiveBattler] = OpenPartyMenuToChooseMon`,
  handing off to the interactive party-menu UI. The whole VM stalls
  (`gBattleControllerExecFlags` stays set) until the human picks a mon and
  that flow calls `BtlController_EmitChosenMonReturnValue`.
- **AI/trainer side**: `OpponentHandleChoosePokemon`
  (`battle_controller_opponent.c:1621-1676`) calls
  `GetMostSuitableMonToSwitchInto()` (`battle_ai_switch_items.c:629-790`)
  synchronously and resolves same-tick — no controller wait.

`GetMostSuitableMonToSwitchInto` is **not** "next living index" and (for
singles) **not** random. Algorithm: pass 1 (`:690-746`) scans the bench for
the living, not-already-committed mon whose own typing is most effective
*against the current opposing battler's types* (`ModulateByTypeEffectiveness`
on both of the candidate's types), then checks whether that mon actually
carries ≥1 super-effective move; if it does, that mon is returned
immediately. If no candidate satisfies both, pass 2 (`:748-789`) falls back
to whichever bench mon's best move would deal the most raw damage
(`AI_CalcDmg`). The `Random() & BIT_FLANK` at `:660` is inside a
`BATTLE_TYPE_DOUBLE`-only branch and is unreachable for a 2-battler singles
battle — confirmed by grep and by the live ledger below (§2 shows zero RNG
activity across the whole switch-in window). Grepped `src/battle_factory.c`,
`src/battle_factory_screen.c`, `src/battle_ai_script_commands.c` for anything
Factory-specific that overrides switch-target selection: **found nothing** —
the only Factory-specific AI hit (`battle_ai_script_commands.c:369`,
`GetAiScriptsInBattleFactory()`) only tunes *move-selection* scoring, not
switch-target choice. Factory uses the vanilla algorithm.

### 1c. Entry hooks and what happens after the whole loop completes

`HandleFaintedMonActions` (`battle_util.c:1894-1971`) is the
`gBattleStruct->faintedActionsState` state machine already partially
documented (`docs/faint-outcome-ground-truth.md` §3.1). State 6
(`:1958-1965`), reached once every fainted battler's send-out script has
completed, runs:
```c
AbilityBattleEffects(ABILITYEFFECT_INTIMIDATE1,...) || AbilityBattleEffects(ABILITYEFFECT_TRACE,...)
 || ItemBattleEffects(ITEMEFFECT_NORMAL,...,TRUE) || AbilityBattleEffects(ABILITYEFFECT_FORECAST,...)
```
— the switch-in entry-hook sweep for the newly-arrived mon (and any
already-fielded mon reacting to it, e.g. Trace), distinct from and
additional to the narrower on-switch-in check already run synchronously
inside `switchineffects` itself. If any hook fires, `HandleFaintedMonActions`
returns busy and re-sweeps; once none fire, the state machine exits.

After it returns `FALSE`, `BattleTurnPassed` (`battle_main.c:3956-4019`, the
caller at `:3968`) resets `faintedActionsState=0`, runs
`HandleWishPerishSongOnTurnEnd()`, clears turn-scoped hitmarker bits, resets
`gChosenActionByBattler`/`monToSwitchIntoId` for all battlers, draws a fresh
`gRandomTurnNumber = Random()`, and sets
`gBattleMainFunc = HandleTurnActionSelectionState` (`:4012`) — **the same
function that drives every ordinary turn's action-selection phase**. Control
genuinely returns to a real command-decision phase, not a special
post-battle-only path. Mechanically: `Cmd_end2` (`BattleScript_FaintedMonEnd`)
sets `gCurrentActionFuncId = B_ACTION_TRY_FINISH`; the next VM tick's
`RunBattleScriptCommands_PopCallbacksStack` sees that sentinel and pops the
callback stack `BattleScriptExecute` pushed, restoring `gBattleMainFunc` to
`BattleTurnPassed`.

### 1d. Stat-stage / volatile reset on the reused battler slot

`switchindataupdate`'s raw buffer copy does **not** by itself reset
`statStages`/`status2` — the wire packer (`CopyPlayerMonData`, case
`REQUEST_ALL_BATTLE`) never assigns those fields, so they're stack garbage in
transit. The real reset is `SwitchInClearSetData()`
(`battle_main.c:3152-3258`, called from `switchindataupdate` itself,
`battle_script_commands.c:4657`): unless the move in progress is Baton Pass,
it unconditionally sets every `statStages[i] = DEFAULT_STAT_STAGE` (6),
zeroes `status2`/`gStatuses3`/the entire `gDisableStructs` struct, and clears
cross-battler references (infatuation, wrap, etc.) pointing at the slot. This
is separate from — and happens after — `cleareffectsonfaint`'s cleanup of
the *fainting* mon's own status (already documented,
`docs/faint-outcome-ground-truth.md` row 5); `SwitchInClearSetData` is what
guarantees the *reused battler slot* is volatile-clean for the incoming mon.

## 2. Live probe: opponent-side ledger + AI-choice verdict

`tools/battle-lab/mechanic-forced-switch-ai-choice-off.json`,
`overrides.parties`, seed 1. Player fields URSARING (species 217, Adamant,
31 IVs, 252 Atk/4 HP EVs, ability slot 0, `MOVE_STRENGTH`×4, accuracy 100 —
same one-shot rig as `mechanic-hit-chain-ko-off.json`) as its sole relevant
battler. Opponent fields **three distinguishable mons**, deliberately chosen
so "next living index" and "AI's best-matchup pick" predict *different*
outcomes:

| Slot | Species | Types | Role |
| -: | --- | --- | --- |
| 0 | SUNKERN (191) | GRASS/GRASS | HP-floored fodder (dies to Strength turn 1) |
| 1 | PIDGEY (16) | NORMAL/FLYING | "next index" candidate — neutral (1×) vs. URSARING's NORMAL/NORMAL |
| 2 | MACHOP (66), move `MOVE_KARATE_CHOP` | FIGHTING/FIGHTING | "best matchup" candidate — super-effective (2×) vs. NORMAL, with a real Fighting move to pass `GetMostSuitableMonToSwitchInto`'s second gate |

### 2a. Result: AI sends MACHOP (index 2), not PIDGEY (index 1)

```
frame   rngValue     battleOutcome  opp.hp  opp.species  opp.partyIndex  statStages[0]  status
0       919694434    0              90      191 (SUNKERN) 0              6              none
234     3421819359   0              90      191           0              6              none
235     3421819359   0              0       191           0              6              none   <- HP hits 0 (datahpupdate)
240     1621732966   0              0       191           0              6              none   <- 4th roll (seteffectwithchance) lands
475     1621732966   0              0       191           0              6              none   <- switch-in dance: STILL zero RNG drift
476     1621732966   0              0       191           2              6              none   <- gBattlerPartyIndexes flips to 2 first
478     1621732966   0              145     66 (MACHOP)   2              6              none   <- species/hp/stats fully rebuilt
500-600 1621732966   0              145     66            2              6              none   <- idle, decision phase reached
700     3278432283   0              145     66             2              6              none   <- AI re-score + next hit-chain window begins
890     3278432283   0              5       66             2              6              none   <- 2nd Strength lands (HP update, no RNG of its own)
894     2319805938   0              5       66             2              6              none   <- 4th roll of that hit chain
```

**This directly answers the brief's disambiguation question**: the opponent
sends MACHOP (party slot 2), skipping over the healthy PIDGEY (party slot 1)
entirely — proving the replacement is chosen by
`GetMostSuitableMonToSwitchInto`'s type/damage scoring (§1b), not "next
living index." `statStages` reads the neutral default (`[6,6,6,6,6,6,6,6]`)
and `status` reads `none` for the freshly-switched mon throughout, consistent
with `SwitchInClearSetData`'s unconditional reset (§1d) — this fixture's
MACHOP was never damaged/statused pre-switch, so it cannot independently
prove *clearing* of a prior stat change, only that the post-switch floor is
the neutral default (the same limitation the terminal-outcome doc flagged
for its own fresh-mon evidence).

### 2b. RNG ledger, attributed

- **Turn 1 kill is the identical 4-roll hit chain** already pinned in
  `docs/hit-chain-ground-truth.md`'s KO scenario (same attacker/move/seed;
  frame 90's mid-chain value `3421819359` matches that doc's own
  "frame 90 confirms roll 3" citation bit-for-bit — an independent
  cross-check that this fixture's turn-1 math is unchanged by which species
  occupy the bench). **New precision this round**: `datahpupdate` (HP→0,
  frame 235) fires **before** the 4th roll (`seteffectwithchance`, frame 240)
  completes — direct live confirmation of the documented opcode order
  (`healthbarupdate, datahpupdate, critmessage, resultmessage,
  seteffectwithchance, tryfaintmon`, `docs/faint-outcome-ground-truth.md`
  §1a) rather than an inference from roll-count alone.
- **The entire switch-in dance (frame 235→475, 240 frames) draws zero
  `Random()` calls** — `rngValue` is bit-identical the whole window,
  reconfirming `docs/faint-outcome-ground-truth.md` §2b's finding with a
  different bench (species-independent: none of SUNKERN/PIDGEY/MACHOP has an
  ability overridden away from a real value here, and still zero RNG,
  because none of the three has an on-switch-in ability that actually rolls
  `Random()`).
- **Post-switch-in to the next hit's own resolution is 12 LCG steps here**,
  not the 10 previously documented for the all-SUNKERN fixture (verified by
  forward-stepping the LCG from the frame-475 value to the frame-894 value).
  This is a **new, honestly-flagged data point, not a contradiction**: both
  this doc and `docs/faint-outcome-ground-truth.md` already flag the AI's
  own move re-scoring pass as unattributed at the individual-call level;
  MACHOP (a Fighting-type with a different moveset/matchup against URSARING
  than SUNKERN had) plausibly costs the AI's scoring loop a different number
  of internal calls. The **last 4 of the block are still positively the next
  attack's own hit chain** (same forward-derivation technique: stepping from
  the frame-700 value by 8 more lands exactly on frame-894's value, and the
  resulting HP delta 145→5 is consistent with a real damage roll), so the
  boundary claim ("last N are the hit chain, the rest are AI scoring") still
  holds — only the AI-scoring sub-count varies by matchup, which was already
  an open question upstream, not one this rung resolves.

## 3. Live probe attempt: player-side forced switch (party menu)

**Attempted, did not land within this rung's time budget — documented
honestly per the brief's own fallback clause.** Staged the mirror scenario
(player's SUNKERN in slot 0 dies to the opponent's URSARING/Strength turn 1,
opening a forced switch for the player instead of the AI) and tried to reuse
`docs/battle-resolution-adapter-ground-truth.md`'s voluntary-switch button
recipe (`DOWN, A, RIGHT, A, A`), adapted for the forced case:

- The voluntary recipe's leading `DOWN` (FIGHT→POKEMON action-select cursor)
  does not apply here — a forced switch has no action-selection screen to
  navigate from; source confirms `PlayerHandleChoosePokemon`
  (`battle_controller_player.c:2665-2688`) opens the party menu directly via
  a controller emit, no button needed to trigger it.
- First attempt: waited 600 frames after the kill (well past the AI-side
  switch-in's own ~240-frame window, for margin), then `A, A` (assuming the
  cursor already defaulted to a valid living slot). Result: `partyIndex`
  stayed `0` and `rngValue` stayed frozen at the post-kill value through
  frame 958 — no state change of any kind, i.e. the presses had no effect.
- Second attempt: added a leading `RIGHT` before the `A, A` (in case the
  cursor initializes on the fainted slot 0 and needs a nudge, mirroring the
  voluntary recipe's own `RIGHT`-jumps-slot-0-to-slot-1 behavior). Same
  result: `partyIndex` frozen at `0` through frame 1000, zero RNG activity.

Both attempts show the battle **fully idle** (no RNG draws, no state
mutation) for hundreds of frames after the kill — meaning either the button
timing did not land inside whatever window the forced-menu flow is actually
listening on, or the forced-menu cursor/confirmation flow differs from the
voluntary case's `HandleChooseMonSelection` submenu quirk in a way this
rung's battle-lab-only (no RAM watch) probing budget could not diagnose.
The voluntary-switch doc's own recipe was itself derived by RAM-probing
`gActionSelectionCursor`/`gPartyMenu.slotId`/`.action` tick-by-tick
(`tools/probe/dump-battler-snapshot.py`-style), not by guessing — the same
technique is almost certainly required here too, and this rung's remaining
budget did not allow standing up that probe from scratch. **Bank the
opponent-side ledger and the complete source map (§1-§2, both directions'
mechanism fully cited) as the solid deliverable of this rung**; the
player-side voluntary-switch recipe itself (§2b of
`docs/battle-resolution-adapter-ground-truth.md`) already proves the
underlying party-menu machinery works end-to-end for a *non-forced* switch,
so the remaining gap is specifically the forced-menu's cursor/timing
differences, not the party-menu mechanism itself.

## 4. Recommended registration slices for a main-lane step sequence

Dependency-ordered, each independently provable, sized honestly against what
this rung found:

1. **`JUMPIFBATTLETYPE`/`JUMPIFNOTBATTLETYPE`** — generic, reusable
   (`jumpifword` family already partially registered per
   `docs/faint-outcome-ground-truth.md`); needed first since almost every
   other opcode on this path is gated behind one.
2. **`OPENPARTYSCREEN` (`BS_FAINTED` only, non-doubles/link branch)** — the
   single opcode that owns the controller round-trip and the player-vs-AI
   choice fork (§1b). This is the single highest-leverage registration: it
   requires modeling **both** `PlayerHandleChoosePokemon`'s interactive
   party-menu hand-off (new controller state) **and**
   `GetMostSuitableMonToSwitchInto`'s type/damage-scoring algorithm (a pure,
   RNG-free function over already-modeled types/moves/party HP — no new RNG
   accounting, per §2b) for the AI side. These two sides can be built and
   tested independently before wiring either into the shared opcode.
3. **`SWITCHHANDLEORDER`** — pure, trivial once (2) exists (just transcribes
   the already-decided buffer value and reorders the party array).
4. **`GETSWITCHEDMONDATA` / `SWITCHINDATAUPDATE`** together — the actual
   battler-struct rebuild from the party record (species/types/ability/
   stats/HP/status1 copy) plus `SwitchInClearSetData`'s stat-stage/volatile
   reset (§1d). This is where the party-HP slice from
   `docs/faint-outcome-ground-truth.md` §3 needs to grow into a genuine
   "rebuild an active battler from a bench record" capability — the first
   real bench-to-active promotion this engine will model.
5. **`SWITCHINANIM` / `WAITSTATE` / `HIDEPARTYSTATUSSUMMARY` /
   `DRAWPARTYSTATUSSUMMARY`** — controller-emit opcodes with no battle-state
   effect on the modeled fields (§1a); cheap, mechanical registrations once
   the controller round-trip shape from (2) exists.
6. **`HPTHRESHOLDS`** and **`RESETPLAYERFAINTED`** (the `various` case) —
   small, pure, no dependencies beyond (1); can land anywhere in this order.
7. **`SWITCHINEFFECTS` (`BS_FAINTED`)** — register the opcode's own
   bookkeeping (hitmarker/`faintedHasReplacement` clear, Spikes gate) first
   as a no-op-on-this-topology proof (Factory singles here has no Spikes set
   and no on-switch-in ability firing, mirroring how
   `battleScriptFaintedActionsOrchestration.ts` already proved its own
   no-op assumptions); defer the `AbilityBattleEffects`/`ItemBattleEffects`
   entry-hook calls themselves as a separate, later slice — they are a large
   surface (every switch-in ability/item) already partially out of scope per
   `docs/battle-resolution-adapter-ground-truth.md`'s own entry-hook
   citations.
8. **`CANCELALLACTIONS`** — trivial, last on the path.
9. **Orchestration extension**: grow
   `battleScriptFaintedActionsOrchestration.ts`'s `non-terminal-barrier` case
   into a real continuation once (2)-(8) exist — it already has the correct
   shape (per-fainted-battler loop, `BS_FAINTED` role already wired since
   entry 440); the new work is resuming execution past
   `BattleScript_FaintedMonSendOutNew` instead of halting there, plus driving
   `HandleFaintedMonActions` state 6 (entry hooks — can stay a named,
   narrow barrier initially, same pattern as `GETEXP`'s Frontier
   short-circuit) and finally reaching `BattleTurnPassed`'s real
   `HandleTurnActionSelectionState` re-entry (§1c) — i.e., the point where
   this engine's decision loop can genuinely accept the next command instead
   of terminating.
10. **Player-side interactive party-menu controller state** is the one
    piece this rung could not live-verify (§3) — recommend the main-lane
    step that lands (2)'s player side budget a RAM-probe session
    (`tools/run-mgba-probe.py`-style) up front rather than reusing
    battle-lab-only captures, since this rung's attempts show the forced
    flow's timing genuinely differs from the already-solved voluntary-switch
    recipe.
