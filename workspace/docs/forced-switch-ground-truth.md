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

## 3. Live probe: player-side forced switch (party menu)

**Cracked.** Two naive battle-lab-only attempts from an earlier session
(`A, A` after a flat wait; `RIGHT, A, A`) both left `partyIndex` frozen at
`0` with zero RNG activity — the same shape of failure the voluntary-switch
recipe's own prior naive attempts hit
(`docs/battle-resolution-adapter-ground-truth.md` §2b), because both skipped
a required intermediate step and never waited long enough between presses.
The fix was the same technique that cracked the voluntary case: RAM-probe
`gPartyMenu.action`/`.slotId`/`.slotId2`, `gActionSelectionCursor`, and
`gBattlerPartyIndexes` tick-by-tick with a throwaway probe
(`tools/probe/dump-forced-switch-party-menu.py`, run via
`tools/run-mgba-probe.py`) instead of guessing timings.

### 3a. Scenario

`tools/battle-lab/mechanic-forced-switch-player-choice-off.json` — the exact
mirror of §2's `mechanic-forced-switch-ai-choice-off.json` fixture with the
two sides' parties swapped: the **opponent** fields the one-shot URSARING
rig (`MOVE_STRENGTH`×4, Adamant, 252 Atk/4 HP EVs) and the **player** fields
SUNKERN (slot 0, dies turn 1), PIDGEY (slot 1, healthy — the "next living
index" decoy), and MACHOP (slot 2, healthy — the slot this recipe
deliberately picks, to prove the choice is a real player decision and not a
default-first-healthy autopick).

### 3b. What was actually gating the two failed naive attempts

RAM-probing the idle window right after the kill (zero button presses,
`gPartyMenu` fields read from `0x203cec8` per `bin/oracle symbols
gPartyMenu`, offsets `menuType/layout`@+8, `slotId`@+9, `slotId2`@+10,
`action`@+11 confirmed against `include/party_menu.h`'s `struct PartyMenu`
layout and cross-validated by replaying the *already-proven*
`mechanic-voluntary-switch-statused-off.json` fixture through the same
offsets and reproducing its known frame-722/883/1121 transitions exactly)
showed `gPartyMenu.action` and every other field **still reading their
zeroed pre-battle defaults 2200+ ticks after the kill** — the party menu had
not opened at all, not even the fade. `gBattleMainFunc` was likewise frozen.
This is **not** the EXP-gain message (`Cmd_getexp`'s `getexpState` case 0
unconditionally skips to the no-op last case whenever `gBattleTypeFlags &
BATTLE_TYPE_FRONTIER`, `battle_script_commands.c:3270-3280` — ruled out by
direct source read, Factory is always Frontier). It **is** the ordinary
"SUNKERN fainted!" battle text: switching to a dense periodic `A`-press
pattern (2 frames on, 18 off — the same convention every other committed
hit-chain/switch fixture already uses, e.g.
`mechanic-forced-switch-ai-choice-off.json`'s own trace) unblocked it
immediately: `gPartyMenu.action` flips from `0` to `1`
(`PARTY_ACTION_SEND_OUT`, `include/constants/party_menu.h:69`) and
`menuTypeLayout` flips to `1` (menu genuinely open) on the very tick one of
those periodic `A` presses lands. The two prior failed attempts never
pressed anything during this window, so the message sat undismissed forever
and nothing downstream ever ran — this, not a forced-menu timing quirk, was
the actual gap.

### 3c. The working recipe

**Working, rerunnable button sequence** (exact segments in the committed
fixture's `trace.segments`):

1. **Submit the doomed mon's move**, same as every other hit-chain fixture:
   `A(2f)`, wait `30f`, `A(2f)` (FIGHT → move 1).
2. **Dense `A` mash (`2f` on / `18f` off, ×20) starting immediately after**,
   continuing well past the kill (frame 240 in this fixture) — this is what
   dismisses the "SUNKERN fainted!" message. RAM-probed: `gPartyMenu.action`
   flips `0→1` and `menuTypeLayout` flips `0→1` together, on whichever tick
   the mash catches the message's open window (tick 396 in the exact
   200-frames-idle-then-mash timing this fixture uses — not load-bearing
   precision, any dense-enough mash lands it, confirmed across three
   independent probe runs with slightly different idle padding all landing
   within a handful of ticks of each other). **Continuing to mash `A` after
   the menu opens is harmless**: with the cursor still on slot 0 (the
   fainted mon), `A` is silently ignored (RAM-confirmed no state change
   across multiple extra presses) — unlike the voluntary case there is no
   observed submenu-open-on-illegal-slot here, so the dense mash does not
   need to stop precisely at the message-dismiss tick.
3. **Wait ~40 ticks** (menu open→input-accepted lockout, matching the
   voluntary recipe's own step 2 finding), then **`DOWN(2f)`** — moves the
   cursor from the fainted slot 0 to slot 1
   (`UpdatePartySelectionSingleLayout`'s `MENU_DIR_DOWN` case,
   `party_menu.c:1549-1566`, a plain `(*slotPtr)++`). RAM-probed:
   `gPartyMenu.slotId` flips `0→1` roughly 40 ticks after the press.
   (Note: `RIGHT` — the voluntary recipe's own navigation button — only
   special-cases jumping *from* slot 0, landing on `1` the first time
   [`MENU_DIR_RIGHT`, `party_menu.c:1567-1575`]; a second `RIGHT` is a no-op
   once already off slot 0, so `RIGHT` alone cannot reach slot 2. `DOWN`
   increments one slot per press and does reach it, which is why this
   recipe uses `DOWN, DOWN` instead.)
4. **Wait ~40 ticks, then `DOWN(2f)` again** — moves the cursor slot
   `1→2` (the same plain increment). RAM-probed: `gPartyMenu.slotId` flips
   `1→2`.
5. **Wait ~40 ticks, then `A(2f)`** — opens the `SEND OUT / SUMMARY /
   CANCEL` submenu on slot 2. Source confirms this is the **same
   `Task_TryCreateSelectionWindow` default-case path** the voluntary
   recipe's step 4 already found: `HandleChooseMonSelection`'s `switch
   (gPartyMenu.action)` has no explicit case for `PARTY_ACTION_SEND_OUT`
   (`= 1`) either, so it falls to the same `default:` branch shared with
   `ABILITY_PREVENTS`/`SWITCHING` (`party_menu.c:1355-1362`). The submenu's
   action list is `{MENU_SEND_OUT, MENU_SUMMARY, MENU_CANCEL1}`
   (`sPartyMenuAction_SendOutSummaryCancel`,
   `src/data/party_menu.h:697/714`) — `MENU_SEND_OUT` is index 0, the
   default cursor position, exactly like the voluntary recipe's
   `MENU_SHIFT` at index 0.
6. **Wait ~40 ticks, then `A(2f)` again** — confirms the default option
   (`MENU_SEND_OUT`). This is the same "fifth press confirms the submenu's
   default option" mechanism the voluntary recipe found, confirmed here for
   the forced case too. RAM-probed and live-confirmed via the oracle's
   `/v1/battle-lab/run` route (not just the raw RAM probe):
   `gBattlerPartyIndexes[0]` flips `0→2` about 80 ticks after this press
   (frame 680 in the committed fixture).
7. **The switch itself takes real time after that**, same as the AI-side
   dance: species/HP/stats fully rebuilt to MACHOP by frame 700.

**No `CANCEL` path exists for this flow** — confirmed by source, not just
absence of testing: `HandleChooseMonCancel`'s `switch (gPartyMenu.action)`
special-cases `PARTY_ACTION_SEND_OUT` to just `PlaySE(SE_FAILURE)`
(`party_menu.c:1372-1375`), unlike the voluntary case's `PARTY_ACTION_SWITCH`
which offers a real Yes/No cancel-confirmation dialog — matching the
brief's expectation that the forced flow has no cancel option.

### 3d. Ledger: player-side dance draws zero `Random()`, same as the AI side

Live-verified (`tools/probe/verify-forced-switch-ground-truth.ts`,
`runPlayerSideChecks`), rerunning
`mechanic-forced-switch-player-choice-off.json` against the live oracle:

```
frame   rngValue     player.hp  player.species  player.partyIndex  status
235     3421819359   90         191 (SUNKERN)   0                  none   <- pre-4th-roll
240     3421819359   0          191             0                  none   <- HP hits 0 (datahpupdate)
250     1621732966   0          191             0                  none   <- 4th roll lands
660     1621732966   0          191             0                  none   <- full button dance done, STILL zero RNG drift
680     1621732966   0          191             2                  none   <- gBattlerPartyIndexes flips to 2 (MACHOP, not PIDGEY's 1)
700     1621732966   145        66 (MACHOP)     2                  none   <- species/hp fully rebuilt, neutral stat stages
822     2210656548   145        66              2                  none   <- AI re-scores its next move (new RNG activity resumes)
1200    1160559944   0          66              2                  none   <- 2nd Strength lands (one-shots MACHOP too; battle stays non-terminal, PIDGEY still on the bench)
```

**The entire forced-menu button dance (frame 250→660, 410 frames spanning
the real, human-timescale button presses in steps 2-6 above) draws zero
`Random()` calls** — bit-for-bit matching the AI-side dance's own finding
(§2b) even though this half is gated behind genuine player input rather than
a synchronous algorithm. The frame-235/240/250 rngValues are bit-identical
to §2's own table (same attacker/move/seed, parties merely swapped sides),
an independent cross-check that the turn-1 hit chain is unaffected by which
side holds which mon. `statStages` reads neutral (`[6]*8`) and `status`
reads `none` for the freshly-switched MACHOP (frame 700) — the same
`SwitchInClearSetData` reset already documented in §1d and confirmed live
for the AI side in §2a, now confirmed symmetric for the player side. The
battle resumes to a real decision phase after the switch (RNG activity
resumes at frame 822 — the AI rescoring its move) and a **second real
attack** lands on the newly-switched MACHOP at frame 1200 (one-shotting it
too, since URSARING's Strength is that strong against this whole bench) —
`battleOutcome` stays non-terminal throughout because the player still has
PIDGEY alive on the bench, proving the engine's forced-switch handling
survives a second cascade without any special-casing.

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
3. ~~**`SWITCHHANDLEORDER`** — pure, trivial once (2) exists (just transcribes
   the already-decided buffer value and reorders the party array).~~
   **CORRECTED (2026-07-25, §5): this was under-specified, not wrong** —
   `SWITCHHANDLEORDER`'s call to `SwitchPartyOrder` does maintain a real,
   non-identity-after-one-switch permutation table, exactly as entry 445
   flagged. §5 settles the actual question that matters for this engine:
   that permutation is proven (source + RAM) to be a **presentation-only**
   side table, disjoint from the raw-array indices (`monToSwitchIntoId`/
   `gBattlerPartyIndexes`) the forced-switch *mechanical* path (slices 3-4)
   actually reads and writes. The "trivial transcription" characterization
   is correct for the mechanically-relevant subset of this opcode; it is
   wrong only if read as "the whole opcode body is a no-op," which it isn't.
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
10. **Player-side interactive party-menu controller state** is now live-verified
    end-to-end (§3): the recipe is `A,A` (submit the doomed mon's move) →
    dense `A` mash to dismiss the faint message → `DOWN,DOWN` (navigate off
    the fainted slot 0 to the target bench slot) → `A,A` (open + confirm the
    `SEND OUT/SUMMARY/CANCEL` submenu's default option), each press
    separated by a ~40-tick input-lockout wait. `OpenPartyMenuToChooseMon`'s
    UI state machine (cursor navigation, the `PARTY_ACTION_SEND_OUT`
    submenu path, no-cancel behavior) is source-mapped and RAM-confirmed
    (§3c) enough to model as a controller-side input state machine once (2)
    is built; the underlying navigation logic
    (`UpdatePartySelectionSingleLayout`) is pure and RNG-free, matching the
    AI side's own no-new-RNG-accounting finding.

## 5. 2026-07-25 correction: the `gBattlePartyCurrentOrder` permutation is real but presentation-only — slice 3 sizing settled

Entry 445 (previous session) flagged that `SwitchPartyOrder`
(`battle_main.c:4086-4114`, called from `Cmd_switchhandleorder`,
`battle_script_commands.c:5152-5217` case 2→3 fallthrough) routes through
`GetPartyIdFromBattlePartyId()`/`SwitchPartyMonSlots()` against
`gBattlePartyCurrentOrder`/`gBattleStruct->battlerPartyOrders[battler]` — a
per-battler permutation layer this engine does not model — and asked whether
`monToSwitchIntoId[battler]`/`gBattlerPartyIndexes[battler]` are raw array
indices or positions in that permuted order. Settled below, source first,
then RAM.

### 5a. Source: the permutation and the raw-index space are two disjoint systems

**The permutation's lifecycle.** `gBattlePartyCurrentOrder` is declared
`EWRAM_DATA u8 gBattlePartyCurrentOrder[PARTY_SIZE / 2] = {0}`
(`party_menu.c:231`); `gBattleStruct->battlerPartyOrders[MAX_BATTLERS_COUNT][PARTY_SIZE / 2]`
is its per-battler counterpart (`include/battle.h:381`). Both pack 2 raw
party-array indices per byte, one per "battle-order position" (confirmed
empirically in §5b, not just from the source comment, which uses a
misleading "current pos of Slot N" phrasing). At battle start,
`BufferBattlePartyOrderBySide` (`party_menu.c:5924-5988`, singles branch
`:5958-5969`) builds the table as: position 0 = the raw index of whichever
mon is currently active for that battler (`gBattlerPartyIndexes[leftBattler]`),
positions 1-5 = every other raw index in ascending numeric order. When the
active mon is raw index 0 (the ordinary lead-mon-out start state, true for
both committed fixtures — see §5b), this **is** the literal identity
permutation, position *i* → raw index *i*.

**Every writer.** The only mutator on the forced-switch path is
`SwitchPartyOrder(battler)` (`battle_main.c:4086-4114`), called for singles
from `Cmd_switchhandleorder` case 3 (`battle_script_commands.c:5207`, the
`else` branch — neither link-multi `:5191` nor in-game-partner `:5201`
applies to Factory singles). It: (1) copies `battlerPartyOrders[battler]`'s 3
bytes into the shared global scratch `gBattlePartyCurrentOrder`
(`:4092-4093`) — note this is a **shared scratch buffer**, not a per-battler
copy: `SwitchPartyMonSlots`/`GetPartyIdFromBattleSlot`/`SetPartyIdAtBattleSlot`
(`party_menu.c:6027-6056`) are hardcoded to the single global, so calling
`SwitchPartyOrder` for the opponent temporarily clobbers whatever was staged
for the player and vice versa; (2) converts the **old** active raw index
(`gBattlerPartyIndexes[battler]`, stale — not yet updated to the new mon) and
the **new** raw index (`monToSwitchIntoId[battler]`, already decided) each to
a battle-order *position* via `GetPartyIdFromBattlePartyId`
(`party_menu.c:6058-6075`, an inverse-lookup despite its name: input = a raw
array index, output = the position currently holding it — confirmed against
its own call site at `party_menu.c:6085`, `UpdatePartyToBattleOrder`'s
`memcpy(&gPlayerParty[GetPartyIdFromBattlePartyId(i)], &partyBuffer[i], ...)`,
which only type-checks if the return value is a position); (3) calls
`SwitchPartyMonSlots(pos1, pos2)` (`party_menu.c:6051-6056`), which swaps
which raw index occupies those two positions; (4) writes the 3 resulting
bytes back to `battlerPartyOrders[battler]` (`:4109-4112`; doubles also
mirrors to the partner, `:4103-4105` — out of scope, noted only).
Voluntary/menu switches go through the identical function
(`party_menu.c:5854`, `TrySwitchInPokemon`) plus a **separate**, real data
swap (`SwapPartyPokemon(&gPlayerParty[newSlot], &gPlayerParty[slot])`,
`:5855`) that physically reorders `gPlayerParty[]` itself while the menu is
open — bracketed by `UpdatePartyToBattleOrder`/`UpdatePartyToFieldOrder`
(`party_menu.c:6078-6098`, called at menu open/close, e.g. `:5778`) which
un-reorder it back to raw/field order afterward. None of this touches
`monToSwitchIntoId`/`gBattlerPartyIndexes`.

**Every reader on the forced-switch mechanical path is in raw-index space,
never position space.** `gBattlerPartyIndexes` is a **separate** top-level
global (`EWRAM_DATA u16 gBattlerPartyIndexes[MAX_BATTLERS_COUNT]`,
`battle_main.c:158`) — distinct from the same-named `u8` field nested inside
`struct BattleStruct` (`battle.h:379`), which this document's own trace never
actually reaches. Proof it's raw-index space, not position space:
- `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`) sets
  `gBattlerPartyIndexes[battler] = monToSwitchIntoId[battler]` (`:4613`)
  verbatim, then requests controller data via
  `gBitTable[gBattlerPartyIndexes[battler]]` (`:4615`) — a bitmask over raw
  slots.
- `PlayerHandleGetMonData` → `CopyPlayerMonData(gBattlerPartyIndexes[battler], monData)`
  (`battle_controller_player.c:1591`) → `GetMonData(&gPlayerParty[monId], ...)`
  (`:1620` and everywhere else in that function) indexes `gPlayerParty[]`
  **directly** with the value from `gBattlerPartyIndexes`. No
  `GetPartyIdFromBattleSlot` translation happens anywhere in this call chain.
- `OpponentHandleChoosePokemon` (`battle_controller_opponent.c:1621-1676`):
  `chosenMonId = GetMostSuitableMonToSwitchInto()` (already a port,
  `src/engine/battleAiSwitchInto.ts`) is compared **directly** against
  `gBattlerPartyIndexes[battler1/2]` (`:1658-1659`) and indexes
  `gEnemyParty[chosenMonId]` (`:1657`) — both must live in the same
  (raw-index) space for this comparison/indexing to be meaningful, and
  `gEnemyParty[]` only ever takes raw indices.
- The interactive party menu is the **only** place position-space appears on
  the player side, and it is fully resolved back to a raw index before
  crossing into engine state: `TrySwitchInPokemon` (`party_menu.c:5800-5856`)
  reads the UI cursor via `GetCursorSelectionMonId()` (a raw index, valid
  because `UpdatePartyToBattleOrder` already physically reordered
  `gPlayerParty[]` to match display order when the menu opened, `:5778`),
  then `gSelectedMonPartyId = GetPartyIdFromBattleSlot(slot)` (`:5851`) —
  which, because the array is already physically reordered, is a no-op
  identity read-back to the same raw index — and `WaitForMonSelection`
  (`battle_controller_player.c:1359-1373`) emits exactly that raw
  `gSelectedMonPartyId` back to the engine (`:1364`). By the time
  `Cmd_switchhandleorder` reads `gBattleBufferB[battler][1]`
  (`battle_script_commands.c:5188-5189`), it is already a raw index.

**Conclusion:** the permutation table is consumed only by (a) the
interactive party-menu's own cursor↔raw-index bookkeeping (self-contained,
resolved before it reaches the engine) and (b) party-status-summary display
ordering (`drawpartystatussummary`/`hidepartystatussummary`, §4 slice 5,
"controller-emit opcodes with no battle-state effect on the modeled
fields" — still true). It never feeds `monToSwitchIntoId`,
`gBattlerPartyIndexes`, or any downstream battler-struct field.

### 5b. RAM: identity at start, real swap after one switch, raw-index fields never diverge

Probed via a new raw-EWRAM script,
`tools/probe/dump-forced-switch-party-order.py` (run only through
`tools/run-mgba-probe.py`; symbol addresses via `bin/oracle symbols
gBattlePartyCurrentOrder gBattlerPartyIndexes`), replaying the exact
committed traces frame-for-frame. `gBattlePartyCurrentOrder` packs
`(rawIndexAtPosition[2i] << 4) | rawIndexAtPosition[2i+1]` per byte *i*
(confirmed by this data, not assumed from the source comment):

| Fixture | Tick | `gBattlePartyCurrentOrder` (decimal, 3 bytes) | as hex nibbles | `gBattlerPartyIndexes` | battler species |
| --- | -: | --- | --- | --- | --- |
| ai-choice | 0 (battle start) | `[1, 35, 69]` | `01 23 45` (identity: pos *i* → raw *i*) | `[0,0,0,0]` | b1=SUNKERN(191) |
| ai-choice | 470 (post-`SWITCHHANDLEORDER`, pre-`GETSWITCHEDMONDATA`) | `[33, 3, 69]` | `21 03 45` (positions 0↔2 swapped) | `[0,0,0,0]` (**unchanged**) | b1=SUNKERN(191) (**unchanged**) |
| ai-choice | 476 (post-`GETSWITCHEDMONDATA`) | `[33, 3, 69]` (unchanged) | `21 03 45` | `[0,2,0,0]` (battler 1 flips to **raw index 2**) | b1=SUNKERN(191) (species not yet rebuilt) |
| ai-choice | 478 (post-`SWITCHINDATAUPDATE`) | `[33, 3, 69]` (unchanged) | `[0,2,0,0]` (unchanged) | — | b1=MACHOP(66) = `gEnemyParty[2]` |
| player-choice | 0 (battle start) | `[1, 35, 69]` | `01 23 45` (identity) | `[0,0,0,0]` | b0=SUNKERN(191) |
| player-choice | 655 (post party-menu commit, pre-flip) | `[33, 3, 69]` | `21 03 45` (same swap shape) | `[0,0,0,0]` (**unchanged**) | b0=SUNKERN(191) |
| player-choice | 680 (post-`GETSWITCHEDMONDATA`) | `[33, 3, 69]` (unchanged) | `[2,0,0,0]` (battler 0 flips to **raw index 2**) | — | b0=SUNKERN(191) |
| player-choice | 700 (post-`SWITCHINDATAUPDATE`) | `[33, 3, 69]` (unchanged) | `[2,0,0,0]` (unchanged) | — | b0=MACHOP(66) = `gPlayerParty[2]` |

Decoding `01 23 45 → 21 03 45`: position 0 held raw 0, position 2 held raw 2
(identity); after the swap, position 0 holds raw 2 and position 2 holds raw
0 — i.e. `SwitchPartyMonSlots(pos(rawIndex=0)=0, pos(rawIndex=2)=2)` swapped
exactly those two positions, matching §5a's source trace of
`SwitchPartyOrder` byte-for-byte, symmetric across both the AI side and the
player side. All 8 rows are now pinned as executable checks in
`tools/probe/verify-forced-switch-ground-truth.ts`'s
`runPartyOrderRamChecks()` (4 new checks per fixture, 8 total; all pass
alongside the pre-existing 23 as of this writing — **31/31 ALL PASS**).

The headline fact: **the permutation table visibly changes (tick 470/655),
proving it is not a no-op** — entry 445 was right to flag it as real state —
**but `gBattlerPartyIndexes` and the rebuilt species never pass through
position-space at any point**: they flip directly from the old raw index to
the new one (`0`→`2`), and `SWITCHINDATAUPDATE` rebuilds the battler struct
directly from `gEnemyParty[2]`/`gPlayerParty[2]`. If the permutation were
being consulted for the mechanical rebuild, the "identity" reading at tick
470 (before `GETSWITCHEDMONDATA` runs) vs. the "swapped" reading at 476
onward would have to produce *different* raw-index resolutions for the same
downstream read — they don't, because nothing downstream of
`SWITCHHANDLEORDER` ever calls `GetPartyIdFromBattleSlot`/
`GetPartyIdFromBattlePartyId` again on this path.

### 5c. Verdict and slice-3 sizing

- **(a) Identity at battle start: YES**, for both sides, in both fixtures —
  `01 23 45` (§5b), matching §5a's source derivation for the ordinary
  lead-mon-out start state.
- **(b) After a Factory forced/voluntary switch: permutes by a pairwise
  position swap**, not "incoming mon always becomes position 0 via a shift."
  Concretely: `SwitchPartyMonSlots(GetPartyIdFromBattlePartyId(oldRawIndex),
  GetPartyIdFromBattlePartyId(newRawIndex))` swaps whichever two positions
  currently hold the old and new raw indices. Net visible effect happens to
  read as "new mon → position 0" *only* because the pre-switch active mon is
  always at position 0 by construction (§5a) — the general operation is the
  swap, not a move-to-front.
- **(c) Slice 3 must NOT model this permutation.** It is real, but it is
  presentation-only bookkeeping for the interactive party-menu's own
  cursor↔raw-index translation (already self-contained, §5a) and for
  party-status-summary display order (§4 slice 5, already scoped as
  state-free for this engine). `SWITCHHANDLEORDER`'s entire
  mechanically-relevant output, for everything slice 4
  (`GETSWITCHEDMONDATA`/`SWITCHINDATAUPDATE`) needs, is the one-line
  transcription §4 originally described:
  `gBattleCommunication[0] = monToSwitchIntoId[battler] = gBattleBufferB[battler][1]`
  (`battle_script_commands.c:5188-5189`) — a raw party-array index, exactly
  the representation this engine's `party.opponent[i]`/`party.player[i]`
  arrays already use with no indirection. **No new data model is needed**:
  slice 3 reduces to asserting/threading the already-decided raw index
  (likely already available from slice 2's `monToSwitchIntoId` plumbing) and
  can *prove* (rather than model) that this engine's existing raw-array
  indexing is correct for slices 3-4, via the checks landed in §5b. If a
  future slice ever models `drawpartystatussummary`'s on-screen ordering or a
  live party-menu reopen mid-battle, *that* is where a 6-entry per-side
  position array plus a 2-argument swap operation (mirroring
  `SwitchPartyMonSlots`) belongs — scoped strictly to that presentation
  feature, never touching `monToSwitchIntoId`/battler-party-index state.

## 6. 2026-07-25 (later session): slices 1-9 landed -- the non-terminal fork is complete

`src/engine/battleScriptSwitchinOpcode.ts` registers `SWITCHHANDLEORDER`,
`GETSWITCHEDMONDATA`, `SWITCHINDATAUPDATE`, `SWITCHINANIM`, `HPTHRESHOLDS`,
`CANCELALLACTIONS`, and `VARIOUS`'s `RESET_PLAYER_FAINTED` case;
`DRAWPARTYSTATUSSUMMARY` joins `HIDEPARTYSTATUSSUMMARY` in
`battleScriptSourceCommands.ts`. Per §5c, no permutation model was added --
`SWITCHHANDLEORDER` only transcribes the already-decided raw index.
`SWITCHINDATAUPDATE` is the first "rebuild an active battler from a bench
record" registration: species/hp/status1/types come from the party record;
stat stages/status2/status3/the modeled DisableStruct fields reset to
`SwitchInClearSetData`'s neutral values; `ability`/`item`/`moves`/`pp` stay
untracked (no species-ability table, no per-battler party moves/pp modeled).
`SWITCHINEFFECTS` clears `HITMARKER_FAINTED` and barriers only on a real,
narrow condition (Spikes -- structurally unreachable since `sideStatuses` is
narrowed to Safeguard; Truant; the closed set of `AbilityBattleEffects
(ABILITYEFFECT_ON_SWITCHIN)` trigger abilities) -- 8 total barrier call
sites, none reachable by any fixture this engine builds today (pinned,
`tests/executableFrontierRatchet.test.ts`).

`battleScriptFaintedActionsOrchestration.ts`'s `runScriptToOwnEnd` now
auto-acknowledges controller round trips (the forced-switch dance's own,
previously unneeded since nothing before it ever marked a battler pending),
and its top-level result splits what used to be a single "terminal" kind by
`battleOutcome`: nonzero is the real terminal (checkteamslost's own jump);
zero is a new `"resumed"` kind -- every fainted battler's own script reached
`BattleScript_FaintedMonEnd` via the full forced-switch dance instead, and
the battle genuinely continues. `factoryBattleScriptTerminalDecision.ts`'s
reducer surfaces `"resumed"` as a real `{ kind: "decision-required" }`
boundary (reusing this adapter's own established single-command-per-turn
shape -- the mover's side, its one known move, now targeting the switched-in
battler) rather than end-turn orchestration (dual-sided submission, turn
priority, the AI's own next pick), which stays explicitly out of scope.

**Slice 10** (the player-side interactive party-menu controller state) did
not fall out of this work and remains the one named, RAM-proven (§3) barrier
left on this path -- `openpartyscreen`'s existing player-side halt is
unchanged. Everything else in §4's list (1-9) is now registered and proven
by `tests/battleScriptSwitchinOpcode.test.ts` (per-opcode) and
`tests/factoryBattleScriptTerminalDecision.test.ts` (full-dance integration:
a healthy-bench KO now runs `checkteamslost -> jumpifbyte -> jumpifword ->
openpartyscreen -> switchhandleorder -> getswitchedmondata ->
switchindataupdate -> hpthresholds -> hidepartystatussummary ->
switchinanim -> waitstate -> resetplayerfainted -> switchineffects ->
cancelallactions -> end2`, MACHOP becomes the real active opponent battler,
zero `Random()` draws, neutral reset, and a genuine next decision boundary).
