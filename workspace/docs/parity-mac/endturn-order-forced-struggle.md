# End-turn order after a forced Struggle: the engine was right (audit "suspected" lead) — no change, pinned

Mac parity lane, 2026-11-12.

## The lead

The audit suspected that the end-of-turn order was wrong for a Pokémon that had to Struggle: the engine sorts it with the
priority of the move slot its cursor still points at (for example a Protect with 0 PP, priority +3), where
`GetWhoStrikesFirst` would use `MOVE_STRUGGLE` (priority 0) for a battler whose `gProtectStructs[].noValidMoves` is set
(`battle_main.c:4700`). The engine source carried a "KNOWN GAP" comment saying the same.

## What the ROM does

`HandleAction_UseMove` clears `noValidMoves` when the forced Struggle starts (`battle_util.c:100-102`). At end of turn
the cell is FALSE, so the sort reads `moves[chosenMovePositions]`: the unusable slot. The engine already did exactly that.

ROM proof (Mechanic Lab, Scene OFF, `challengeNum 0`, base sets `[156,149,180]` / `[184,188,135]`, seed 305419897):
player lead Shuckle (213) holding Leftovers (200) with moves `[182,0,0,0]` (Protect only), opponent lead Blissey (242)
holding Leftovers with four Tackle. Trace: A every 30 frames. After ten Protects Shuckle Struggles every turn:

| step of one turn | HP (Shuckle, Blissey) |
|---|---|
| Blissey's Tackle (Blissey is faster and moves first) | 86 -> 82, 304 |
| Shuckle's Struggle and recoil | 77, 304 -> 281 |
| end of turn, first Leftovers | **82** (Shuckle), 281 |
| end of turn, second Leftovers | 82, **301** (Blissey) |

The slower, Struggling Shuckle heals first: Protect's +3 decides the end-turn order.

## What changed

- The comment in `src/engine/battleEndTurnOrchestration.ts` (`endTurnChosenMove`) now states the real source behaviour.
- `tests/parityMacEndTurnOrderForcedStruggle.test.ts` pins the ROM order (Struggling battler first).

Not modeled (not reachable in a plain turn): a battler whose forced Struggle never started keeps the cell set.
