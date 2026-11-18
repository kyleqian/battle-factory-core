# Finding 47 (not fixed): a round's first trainer is rolled before the rentals' personalities (2026-11-18, chained rounds)

Status: found and proven on the ROM, **not fixed by Kyle's decision** (2026-11-18: "Yeah, let's leave Finding 47"): no player can see it,
and the fix would re-roll the battles 269 tests pin. Do not fix it without asking Kyle again.

## What differs

When a new challenge starts, the game rolls the six rentals and then, straight away, the first trainer and his three Pokemon. The rentals'
personalities (which decide ability, gender and the like) are made later, when the rental screen opens. The engine builds a new round the other
way round: the six rentals, then their personalities, then the first trainer. Both pick the same six rentals. For the same random state they
pick a different first trainer.

What it means for a player: nothing they can see. The first trainer is a random pick either way, from the same list with the same chances. Only
the exact trainer for one exact random state differs, and that state depends on how many frames the player spent on the screens before.

## The source

`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:30-31`: `factory_generaterentalmons` then `factory_generateopponentmons`, in one script run
(no wait between them). `GenerateInitialRentalMons` (`battle_factory.c:509-601`) picks set ids only; `GenerateOpponentMons` (`:303-377`) picks the
trainer and his sets. The rentals' personalities come from `CreateMonWithEVSpreadNatureOTID` in `CreateFrontierFactorySelectableMons`
(`battle_factory_screen.c:1736-1778`, from `Select_InitMonsData`, `:1289`) when the select screen opens; the trainer's from
`FillFactoryFrontierTrainerParty` (`battle_tower.c:1824-1885`) at the battle's start.

The engine: `createFactoryRoundBattleOrchestrator` with `rentals: generateInitial` (how the site's game builds every chained round, `core.ts`)
calls `generateInitialFactoryRentals`, whose result cursor is after the six personality loops, and rolls the first opponent from that cursor.

## The ROM

Chained rounds (`REPLAY_ROUNDS=2`), the ROM frame that rolled the new draft, and the engine's production construction run from each cursor of it:

| Chain | Draft (ROM = engine) | ROM's first trainer | Engine rolled after the draft's picks | Engine's round construction (after N personality draws) |
|---|---|---|---|---|
| seed 1 census, round 2 after a loss | 143 195 135 167 164 110 | 31: 127 172 160 | 31: 127 172 160 | 79: 113 120 119 (284 draws) |
| seed 10 ai-v1, round 2 after a win | 255 213 266 215 237 234 | 101: 259 222 241 | 101: 259 222 241 | 97: 225 191 203 (443 draws) |

The ROM frame had 13 and 12 draws in all: room for the VBlank draw, the rental picks and the trainer picks, not for six personality loops.

## Why it is not fixed here

A prototype in `createFactoryRoundBattleOrchestrator` (rental picks, trainer picks, rental personalities, trainer personalities) made both chains
match in every way. But the same code builds every census battle, so the prototype re-rolls the first opponent of every census seed: the full
suite then has 269 failing tests in 103 files (45 of them animation tests), which pin battles the census seeds generate today. Re-pinning them
is a project-wide decision (other lanes own most of those pins), and no player can see the difference. The round replay names this difference
apart (`knownDifference: "first-trainer-order"`, `matchExceptKnown` in `round-compare`) and goes on with the ROM's trainer, so it hides nothing else.

If it is fixed: the prototype is the change above (`generateFactoryOpponent` from `initialRentalGeneration.selectionRngValue`, then
`generateInitialFactoryRentals` with `constructionRngValue` = that roll's selection end, then the opponent's construction from the rentals' end);
Brain battles at a round's first battle (test-only streaks) keep today's order, since `FillFactoryBrainParty` runs at the battle's start.
