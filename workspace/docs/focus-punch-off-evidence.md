# Focus Punch / `B_SCR_OP_JUMPIFNODAMAGE` OFF evidence

## Source contract

`jumpifnodamage` is a five-byte instruction: opcode `0xcf` followed by one
four-byte little-endian pointer (`asm/macros/battle_script.inc:1061-1064`).
`Cmd_jumpifnodamage` reads exactly
`gProtectStructs[gBattlerAttacker].physicalDmg` and `.specialDmg`
(`src/battle_script_commands.c:9148-9154`). Its polarity is intentionally
counterintuitive:

- if either attacker-owned receipt is nonzero, advance the PC by five;
- only if both receipts are zero, load the pointer at instruction bytes 1–4.

The fields are `u32` members of `ProtectStruct` (`include/battle.h:104-130`).
`TurnValuesCleanUp(FALSE)` zeroes that complete struct before a turn
(`src/battle_main.c:4857-4874`). A real non-passive HP update writes the
physical or special receipt on the damaged battler
(`src/battle_script_commands.c:1919-1968`).

`BattleScript_EffectFocusPunch` targets the zero-receipt jump at
`BattleScript_HitFromAccCheck`. The nonzero fallthrough instead runs
`ppreduce`, prints `STRINGID_PKMNLOSTFOCUS`, waits, and goes to
`BattleScript_MoveEnd` (`data/battle_scripts_1.s:2260-2266`). Focus Punch is
power 150, accuracy 100, 20 PP, and priority -3
(`src/data/battle_moves.h:3435-3446`). The staged carrier is the real
Level-50-eligible `FRONTIER_MON_BRELOOM_2` set 480: Breloom with Giga Drain,
Leech Seed, Focus Punch, and Spore
(`src/data/battle_frontier/battle_frontier_mons.h:3363-3368`).

## Battle Scene OFF routes

Both committed `mechanicLab` scenarios use complete three-mon parties and only
ordinary controller input. The opponent's four move slots are identical, so
the stock Factory AI chooses a slot normally but cannot choose another move.
Starmie is faster than Breloom, 135 to 90.

`mechanic-focus-punch-damaged-off.json` constrains Starmie to Swift, its legal
always-hit action. Swift spends one PP and deals real physical damage
`135→111` before priority -3 Focus Punch. Focus Punch then spends `20→19`;
frame 400 visibly prints “BRELOOM lost its focus and couldn't move!”, while
Starmie remains `135/135`. The next request has `currentMove=0`,
`battleOutcome=0`, and RNG `2682491093` after nine calls from the captured
initial cursor `919694434`.

`mechanic-focus-punch-undamaged-off.json` constrains Starmie to its legal Light
Screen action. Light Screen spends one PP, sets five turns, and leaves both HP
values unchanged. Focus Punch spends `20→19`, jumps into the hit chain, and
damages Starmie `135→66`; the next request has `currentMove=0`,
`battleOutcome=0`, Light Screen at four turns, and RNG `2210656548` after ten
calls. Breloom remains `135/135`, proving the opponent action supplied no
damage receipt.

Each final scenario was replayed twice with byte-identical full manifests:

- damaged: `380326f3df019ecc7262ff690adc7ce7fc2672645542124b770503f8d9961b19`
- undamaged: `6df18da00b95509e613f1313a3ac8befaed9496369c842020082e91cad54cc53`

Scenario SHA-256 values are respectively
`ceab94c70969085217488ec42fc8754ef842b793eff37d3fd072cad465d28343`
and
`3f7cd6b1b5677550bf72b43bfc7728b577b08e12001aedccdb6a612d86e0f4a5`.

## Honest boundary

The battle-lab manifest exposes HP, PP, current move, controller state,
outcome, RNG, parties, and side conditions, but not raw `ProtectStruct`
receipt words. The Light Screen route therefore proves zero received damage
through unchanged HP and the real resulting hit path; the exact receipt
fields, reset, write conditions, and branch are pinned directly from source.
The special-damage fallthrough is not duplicated in the oracle because the
handler simply ORs the two fields; the Swift route proves the nonzero branch
with a physical receipt.
