# A forced Struggle that never starts: the end-of-turn order reads Struggle for that Pokemon — fixed

Mac parity lane, fourth pass. The last open lead of the second pass ("a battler whose forced Struggle never started
keeps the cell set", `endturn-order-forced-struggle.md`). No replay battle shows it. Proof: a Mechanic Lab scenario on
the real ROM (below) and the source.

## What it changes for the game

A Pokemon with no usable move (no PP left, or all its moves blocked by Taunt, Disable, Torment) must Struggle. When
the faster Pokemon on the other side faints from its own move (Selfdestruct, Explosion, recoil, Struggle recoil) and
its replacement comes in at once, the rest of the turn is cancelled: the Struggle does not happen. At the end of that
turn the game sorts the two Pokemon for the end-of-turn effects (weather damage, Leftovers, Leech Seed, poison). For
the Pokemon whose Struggle was cancelled it uses Struggle's priority (0). The engine used the priority of the move its
cursor still pointed at. When that move is Protect, Detect, Endure, Quick Attack, Mach Punch or another move with a
priority, the two orders differ: the engine let that Pokemon go first, the game lets the faster one go first. It
matters when the order decides who faints first.

The case comes up at the end of long battles, when both sides are out of PP and the faster one dies of its own
Struggle recoil.

## C source

- `AreAllMovesUnusable` (`battle_util.c:1125-1140`) sets `gProtectStructs[battler].noValidMoves` at action selection.
- `HandleAction_UseMove` (`:100-102`) clears it when the forced Struggle starts. `FaintClearSetData`
  (`battle_main.c:3294`) clears it when that Pokemon faints.
- `BattleScript_FaintedMonSendOutNew` ends with `cancelallactions` (`battle_scripts_1.s:2895`): after a mid-turn
  replacement no further action of the turn runs. The Struggle never starts, so the flag stays set.
- `ENDTURN_ORDER` (`battle_util.c:1199-1218`) sorts with `GetWhoStrikesFirst(..., FALSE)`, which reads `MOVE_STRUGGLE`
  for a battler whose flag is set (`battle_main.c:4700`) and `moves[chosenMovePositions]` otherwise.
- `TurnValuesCleanUp(FALSE)` zeroes the whole struct at the very end of the turn.

## Engine and fix

- `src/engine/battleScriptRulesContext.ts`: a new field `noValidMovesKept` (one bit per battler, 0 at every turn's
  start).
- `src/engine/factoryBattleScriptFullTurnDecision.ts`: when the turn's second action is dropped after a mid-turn
  replacement (both paths: the trainer's replacement, and the player's replacement choice) and that action was a
  forced Struggle of a Pokemon that is still there, its bit is set.
- `src/engine/battleEndTurnOrchestration.ts` `endTurnChosenMove`: a set bit reads `MOVE_STRUGGLE`.

## ROM proof (Mechanic Lab, Scene OFF, `challengeNum 0`, base sets `[156,149,180]` / `[184,188,135]`, seed 601)

`overrides.parties`: player Chansey (Sandstorm, Taunt, Selfdestruct, Splash), Jolteon (four Splash), Blissey; opponent
Snorlax with four Endure (priority +3), Ivysaur, Bayleef. Chansey is faster than Snorlax, Jolteon much faster.
Decisions: Sandstorm; Taunt; Selfdestruct; replacement Jolteon; Splash; Splash.

| turn | what the ROM shows | sandstorm damage, in order |
|---|---|---|
| 1 | Snorlax's Endure first, Chansey's Sandstorm | Snorlax (frame 590), Chansey (759): Endure's +3 |
| 2 | Endure first, then Taunt | Snorlax (1354), Chansey (1523) |
| 3 | Snorlax is taunted and has no usable move. Chansey's Selfdestruct runs first (1554), Chansey faints, Jolteon comes in (2047). No Struggle follows. | **Jolteon (2428), Snorlax (2595)** |
| 4 | Endure first (the Taunt is over), Splash | Snorlax (3190), Jolteon (3347) |

Control, the same battle with Splash instead of Taunt on turn 2: on turn 3 Snorlax uses Endure first, Chansey's
Selfdestruct follows, Jolteon comes in, and the sandstorm hits **Snorlax first** (2573), then Jolteon (2730). So in the
taunted run the game did not read Endure for Snorlax.

## Tests

- `tests/parityMacForcedStruggleNeverStarted.test.ts`: a whole turn through the reducer with the ROM run's shape (the
  faster player Pokemon uses Selfdestruct, the trainer's Pokemon has four Endure with 0 PP). The faster replacement
  takes the sandstorm first (fails on the unfixed code). Control with PP: the Endure user first.
- `tests/battleScriptRulesContext.test.ts`: the key list has the new field.
