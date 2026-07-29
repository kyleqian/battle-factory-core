# Metronome — source audit and OFF receipts

Scope: source and stock-ROM Battle Scene OFF evidence only; no engine, census,
or shared-ledger change.

## Exact source contract

`Cmd_metronome` uses the `MOVES_COUNT < 512` branch in this pinned Emerald
source: `MOVES_COUNT == 355`, so each attempt is exactly
`(Random() & 0x1ff) + 1`.  Its possible values are 1..512; 355..512 are
out-of-range and restart the outer `while (TRUE)`, as does a match in the
Metronome portion of `sMovesForbiddenToCopy`.  The command has no retry cap:
every rejected candidate has already consumed its one `Random()` call
(`reference/pokeemerald/include/constants/moves.h:360`; `reference/pokeemerald/
src/battle_script_commands.c:7885-7923`).

The complete array, including the sentinel that only divides Mimic's prefix,
is:

```
METRONOME, STRUGGLE, SKETCH, MIMIC, 0xfffe,
COUNTER, MIRROR_COAT, PROTECT, DETECT, ENDURE, DESTINY_BOND, SLEEP_TALK,
THIEF, FOLLOW_ME, SNATCH, HELPING_HAND, COVET, TRICK, FOCUS_PUNCH, 0xffff
```

Thus the **18 real Metronome-forbidden moves** are every named entry above;
`0xfffe` is not a move and is merely scanned past by Metronome on its way to
the `0xffff` end marker (`battle_script_commands.c:721-746,7906-7916`).
This verifies the dossier's narrower derived statement: from its historical
23-effect blocked baseline, the forbidden moves remove exactly Metronome,
Mimic, Sketch, and Snatch.  The 19 selectable blocked effects in that
baseline were:

```
MIRROR_MOVE, BIDE, CONVERSION, TRANSFORM, CONVERSION_2, LOCK_ON, PRESENT,
BEAT_UP, MEMENTO, NATURE_POWER, CHARGE, ROLE_PLAY, ASSIST, RECYCLE,
IMPRISON, MUD_SPORT, WEATHER_BALL, WATER_SPORT, CAMOUFLAGE
```

That 19-item enumeration is correct, but “current” in
`docs/frontier-tail-notes.md §3.6` is now stale: the current 207/214 census
has seven blocked effects — Transform, Metronome, Lock On, Beat Up, Assist,
Imprison, and Snatch (`docs/executable-frontier-census.md:93,119,130,190,
216,228,231`).  Removing the self-forbidden Metronome and forbidden Snatch
leaves the **current selectable gate of five**: Transform, Lock On, Beat Up,
Assist, and Imprison.  Rows 5a-c, 6a-b, and 7 cover those five (Snatch may
remain blocked during its own row because it is never selectable).  Therefore
after those non-Metronome rows land, the gate is zero, as required before the
last-row implementation.  No correction to the archived 19-effect list is
needed.

On acceptance the command clears `HITMARKER_ATTACKSTRING_PRINTED`, assigns
the candidate directly to `gCurrentMove`, assigns
`gBattlescriptCurrInstr = gBattleScriptsForMoveEffects[gBattleMoves[gCurrentMove].effect]`,
then retargets with `GetMoveTarget(gCurrentMove, NO_TARGET_OVERRIDE)` and
returns.  There is no `gCalledMove` write and no continuation/push: it is a
direct tail jump into the selected effect.  Sleep Talk instead has its chooser
write `gCalledMove` and its script executes `jumptocalledmove TRUE`; that
opcode assigns `gCurrentMove = gCalledMove` before the same kind of direct
effect-pointer jump (`battle_script_commands.c:5743-5751`; `data/battle_scripts_1.s:
1324-1332`).  Metronome deliberately leaves `gChosenMove` as Metronome.

That distinction gives the unusual but source-correct PP/history ownership:
the selected effect's `ppreduce` evaluates target/Pressure using the called
`gCurrentMove`, but debits `gBattleMons[attacker].pp[gCurrMovePos]`; the move
position is still the Metronome slot (`battle_script_commands.c:1205-1253`).
At move end, `gLastPrintedMoves` and `gLastMoves` receive `gChosenMove`, while
`gLastResultingMoves` and a successful target's `gLastLandedMoves` receive
`gCurrentMove` (`battle_script_commands.c:4382-4435`).

The entry shell is exactly `attackcanceler; attackstring; pause
B_WAIT_TIME_SHORT; attackanimation; waitanimation; setbyte sB_ANIM_TURN,0;
setbyte sB_ANIM_TARGETS_HIT,0; metronome`
(`data/battle_scripts_1.s:1147-1157`).  Per the census exception note, every
fixed opcode and operand in that shell is already accepted; only
`B_SCR_OP_METRONOME` plus the dynamic-universe gate remains
(`docs/executable-frontier-census.md:258,274-280`).

The two Level-50 Factory carriers are `FRONTIER_MON_CHANSEY_1`
(`MOVE_METRONOME, REFRESH, DEFENSE_CURL, MINIMIZE`) and
`FRONTIER_MON_CLEFABLE_1` (`MOVE_METRONOME, DOUBLE_TEAM, REFLECT,
FOLLOW_ME`) (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:1591-1598,2725-2732`).  This agrees with the census's
one distinct / two weighted Factory-L50 Metronome row.

## Reproducible OFF receipts

Both fixtures are complete legal Level-50 `mechanicLab` parties with the
opponent constrained to one legal move.  The read-only probe derives every
draw from the ROM's pre-draw LCG state, records `sRandCount`, move globals,
PP slots, and all four move-history arrays.  Run either with:

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/run-mgba-probe.py /tmp/metronome.json -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/probe/audit-metronome-off.py \
  tools/battle-lab/mechanic-metronome-clefable-off.json /tmp/metronome.json
```

- `mechanic-metronome-clefable-off.json` (seed `305419897`) arms Metronome at
  frame 39 with `sRandCount=9419`, `gRngValue=0xa1600022`.  At frame 135 the
  selector's one candidate draw returns 45622 and yields candidate 55,
  **Water Gun** (pinned Emerald data: 54 is Mist, 55 is Water Gun; corrected
  by the consuming row-8 worker), accepted.  (`sRandCount` reaches 9423 in
  that frame because the selected Water Gun route also performs its own
  later work; the probe's selector
  ledger stops exactly at the accepted candidate.)  At frame 164 slot 0 PP is
  10→9: that is Metronome's slot; no PP exists or changes for the called Water Gun.
  At frame 448 the ROM has `currentMove=55`, `chosenMove=118`,
  `calledMove=0`, `lastPrintedMoves=[118,0]`, `lastMoves=[118,0]`,
  `lastResultingMoves=[55,0]`, and `lastLandedMoves=[0,55]`.
- `mechanic-metronome-chansey-off.json` (different seed `4`) gives the
  rejection receipt.  Metronome arms at frame 192 with
  `sRandCount=8988`, `gRngValue=0x4bd62378`.  At frame 287 its complete
  selector sequence is: Random return 28620 → candidate 461
  (**out-of-range**); return 14233 → 410 (**out-of-range**); return 33916 →
  125, **Bone Club**, accepted.  The two rejections and the accepted attempt
  occur in one command/frame, proving that every loop retry consumes another
  draw.  Frame 311 debits only slot 0 (Metronome) 10→9.  At frame 497:
  `currentMove=125`, `chosenMove=118`, `calledMove=0`,
  `lastPrintedMoves=[118,33]`, `lastMoves=[118,33]`,
  `lastResultingMoves=[125,33]`, and `lastLandedMoves=[33,125]`.

The called moves in these two stock-ROM receipts are executable today (Water Gun
and Bone Club), which makes the ownership observation easy to read.  A
future Metronome implementation still must retain its gate until *all* legal
destinations are executable; a stock-ROM receipt would remain valid even if a
particular selected destination were currently census-blocked.
