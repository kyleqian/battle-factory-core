# A Transformed Pokemon's moves spent the PP of its own moves in the party record — fixed

Found by the Metronome sweep (fourth pass): staged battle `stages/metronome-transform.json` (real sets, lab seed 50110)
and five more battles of the sweep.

## Symptom

Chansey (set 227) calls Transform through Metronome. Its moves become copies of the opponent's (5 PP each); the party
record still holds Metronome with 2 PP. Each copied move it then uses: the ROM leaves the party record at 2. The engine
wrote the copied move's PP into the party record's slot (4, 3, 2 ...).

## What it changes for the game

A switch-in rebuilds a Pokemon's moves and PP from the party record. So in the engine, a Pokemon that had Transformed
and used copied moves came back from the bench with the wrong PP on its own moves (more or less than it should have).
The party menu and the summary showed the same wrong PP. In the Level 50 Factory Transform happens only through
Metronome (Chansey 227, Clefable 389).

## C source

`Cmd_ppreduce` (`battle_script_commands.c:1205-1249`): the battler's PP is always reduced; the write to the party
Pokemon, `BtlController_EmitSetMonData(REQUEST_PPMOVE1_BATTLE + gCurrMovePos)`, is inside
`if (MOVE_IS_PERMANENT(gBattlerAttacker, gCurrMovePos))` (`:1239-1246`): not while the Pokemon is Transformed, and
not for a slot Mimic filled. `PressurePPLose` has the same gate (`battle_util.c:758-763`).

## Engine and fix

- `src/engine/battleScriptHitChainOpcode.ts` (`ppreduce`): the party write was outside the gate; only the controller
  event was gated, and only on Transform. Both now sit inside the full gate (not Transformed, not a Mimic slot).
- `src/engine/battleScriptAttackCancelerOpcode.ts`: the two Pressure losses outside `ppreduce` (Snatch's winner, the
  Magic Coat owner) get the same gate.

Other party PP writes were read again: Spite, Imprison and Perish Song already had the gate; Grudge and the Leppa Berry
have none in the game either (`battle_script_commands.c:3035-3040`, `battle_util.c:3377`).

## Proof

- ROM, `stages/metronome-transform.json`: before the fix the wide compare stopped at decision 9 (`parties.0.0.pp.0`:
  engine 4, ROM 2); after it all 77 turn states and every wide state match, and the expected row
  (`move:EFFECT_TRANSFORM`) is in the battle's tally.
- Test (fails without the fix): `tests/battleScriptHitChainOpcode.test.ts` "writes the party record's PP for the
  Pokemon's own move, and not while it is Transformed or for a Mimic slot".
