# Battle Factory single-round policy

This is a development-time source dossier for Stage 8's generic seven-battle controller. It describes the pinned `reference/pokeemerald` source, not a new canonical input replay. The machine-readable portion is `src/data/gen/factory-round-policy.json`, reproduced by `tools/extract/extract-factory-round-policy.ts`.

## Scope and provenance

**Proven source rules** below are direct consequences of the cited source functions/scripts. Line anchors are against the pinned checkout in this run. The only **canonical-run observations** are explicitly marked. No policy here uses oracle screenshots, absolute frame numbers, or a turn replay.

This dossier is for the Level-50 singles product scope. The data artifact also retains the Open Level tables because the source selection rule is shared. Battle Tent, doubles, Noland/Brain encounters, records, save/retire menus, and BP/reward bookkeeping are intentionally outside the proposed generic round controller.

## State model and seven-battle counter

**Proven source rule.** `InitFactoryChallenge` sets `curChallengeBattleNum = 0`, clears the six `rentalMons` IDs to `0xffff`, clears the three temporary opponent IDs, and resets the factory win streak and rental count only when the Factory streak-active bit is not already set ([`battle_factory.c:198-222`](../reference/pokeemerald/src/battle_factory.c)). `curChallengeBattleNum` is therefore a zero-based in-progress-round battle index; the pre-battle script calls it battle 2 through battle 7 when its value is 1 through 6 ([`scripts.inc:79-89`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc)).

The successful regular-battle script increments the factory streak first, then increments `curChallengeBattleNum`. A resulting value of 7 sets `CHALLENGE_STATUS_WON` and warps to the lobby; values 1–6 warp back to the pre-battle room ([`BattleFactoryBattleRoom/scripts.inc:92-111`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc)). A loss instead sets `CHALLENGE_STATUS_LOST` and warps to the lobby without an increment ([`scripts.inc:74-90`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc)). `IncrementWinStreak` caps Factory streaks at 9999 ([`frontier_util.c:2111-2157`](../reference/pokeemerald/src/frontier_util.c)); the extracted status values are WON=3 and LOST=4.

```text
onBattleResolved(outcome):
  if outcome != win:
    status = lost
    return terminal

  factoryWinStreak = min(factoryWinStreak + 1, 9999)
  battleIndex += 1
  if battleIndex == 7:
    status = won
    return terminal
  return preBattleContinuation  // indexes 1..6
```

The source has special Noland paths that differ after the battle. They are not needed for the first normal seven-battle round and must not be silently folded into the regular `battleIndex == 7` branch.

## Trainer selection and opponent generation

**Proven source rule.** Challenge tier is `factoryWinStreak / 7` ([`GenerateOpponentMons`, `battle_factory.c:303-314`](../reference/pokeemerald/src/battle_factory.c)). `GetRandomScaledFrontierTrainerId` uses a normal trainer-ID range except on battle index 6, which uses the hard range. Challenges 0–7 use their matching range row; challenge 8+ clamps to normal row 7 (the final normal/hard rows are intentionally the same 200–299 range) ([`battle_tower.c:1104-1129`](../reference/pokeemerald/src/battle_tower.c)). The extracted table preserves both numeric ranges and source labels.

`GenerateOpponentMons` retries trainer selection until it does not match any prior `trainerIds[0..curChallengeBattleNum)`. It writes the selected trainer back into that history only for indexes 0–5; the seventh trainer is deliberately not stored ([`battle_factory.c:316-329`](../reference/pokeemerald/src/battle_factory.c)). That is enough history for one challenge; the save structure has capacity 20, not a seven-slot resettable list ([`global.h:390-425`](../reference/pokeemerald/include/global.h)).

The three opponent mon IDs retry `GetFactoryMonId` until all of these pass ([`battle_factory.c:331-376`](../reference/pokeemerald/src/battle_factory.c)):

- Unown is rejected.
- A species matching any of all six `rentalMons` entries is rejected. After a win, entries 3–5 retain the just-fought opponent, so the next candidate cannot match either player rentals or that saved opponent roster.
- At Level 50, IDs above `FRONTIER_MONS_HIGH_TIER` (849) are rejected.
- Species may not repeat within the three-mon opponent party.
- Non-`ITEM_NONE` held items may not repeat within that party; `ITEM_NONE` may repeat.

When the actual battle starts, `FillFactoryFrontierTrainerParty` builds the enemy party from `gFrontierTempParty`, applies source moves/items/nature, and uses the fixed-IV row selected by challenge/battle index ([`battle_tower.c:1824-1885`](../reference/pokeemerald/src/battle_tower.c)). The non-`BUGFIX` source branch notably uses the Battle Tower Level-50 streak for that IV *challenge* number; the generated policy records the fixed-IV table but does not choose a build configuration for a controller.

## Rental selection and swap mutations

**Proven source rule.** Initial six rentals use the same challenge number. The first `GetNumPastRentalsRank` slots use the next (better) range; the rest use the current range. Rank is 0 below 15 rents, then rises at 15, 22, 29, 36, and 43, capped at 5 ([`GenerateInitialRentalMons`, `battle_factory.c:509-601`](../reference/pokeemerald/src/battle_factory.c); [`GetFactoryMonId/GetNumPastRentalsRank`, `battle_factory.c:829-886`](../reference/pokeemerald/src/battle_factory.c)). Initial rentals reject Unown, duplicate mon IDs/species, and duplicate non-none items, with the source's `currSpecies` exception handling the duplicate-species retry. The range and IV tables are mechanically extracted rather than copied by hand.

After a battle, `factory_setopponentmons` stores each current enemy party mon's ID, IVs, personality, and ability in `rentalMons[3..5]`, and restores its held item ([`SetRentalsToOpponentParty`, `battle_factory.c:384-401`](../reference/pokeemerald/src/battle_factory.c)). If the swap screen accepts an enemy slot, `CopySwappedMonData` replaces exactly the selected player party slot with that `gEnemyParty` slot, resets friendship to zero, and copies that slot's ID/IV/personality/ability metadata into the corresponding `rentalMons[0..2]` entry ([`battle_factory_screen.c:2350-2361`](../reference/pokeemerald/src/battle_factory_screen.c)). Declining/quitting returns TRUE and performs no such copy ([`battle_factory_screen.c:2409-2436`](../reference/pokeemerald/src/battle_factory_screen.c)).

The swap flag is separate from party mutation. The initial draft and an accepted post-battle swap call `factory_setswapped`; when the next win is processed, `factory_set FACTORY_DATA_WIN_STREAK_SWAPS` updates the saved rental count only if that flag is set, then clears it ([`battle_factory.c:243-266`](../reference/pokeemerald/src/battle_factory.c); [`pre-battle scripts.inc:39-42,151-158`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc); [`battle-room scripts.inc:92-98`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc)). Do not increment rental count merely because a swap choice is displayed.

## Timing of heal, generation, and continuation

**Proven source rule.** On normal return from battle the pre-battle room first saves opponent metadata, restores player held items, prints the restore text, and calls `HealPlayerParty`; this all happens before the continuation menu ([`pre-battle scripts.inc:54-62`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc)). Choosing Go On enters `AskSwapMon`, which generates the next opponent before type/style commentary and before the YES/NO swap offer. Both NO and YES use that already-generated opponent; YES alone opens the swap screen ([`scripts.inc:137-158`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc)). Immediately before every `DoSpecialTrainerBattle`, the battle-room script calls `HealPlayerParty` again ([`battle-room scripts.inc:74-87`](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc)).

```text
after nonterminal win:
  save enemy metadata -> restore player held items -> heal player -> menu
  if Go On:
    generate trainer + three opponent mons (with retry rules)
    offer swap
    if accept: copy one enemy slot to chosen player slot; mark swap
    heal player again -> construct/start battle
```

**Canonical-run observation (not used as a policy constant).** The Battle Scene OFF bootstrap changes presentation only; the oracle description says battle rules, inputs, party generation, and main battle RNG remain reference behavior. No extra Battle Scene OFF oracle probe was necessary for this source policy.

## Explicit implementation inputs still needed

- The shared controller needs an RNG interface whose calls include retry draws and whatever mon-personality generation `CreateMonWithEVSpreadNatureOTID` consumes. This dossier establishes rejection predicates and ranges, not an unverified fixed draw count.
- The controller needs a deliberate decision on the pinned build's `BUGFIX` preprocessor branch for regular-opponent IV challenge selection. The source exposes both alternatives; do not guess from the JSON table alone.
- Noland/Factory Brain branches, pause/retire/save/record UI, lobby reward/BP settlement, and exact terminal presentation are separate interfaces/UI work.
- The post-battle swap screen's visual/timing acceptance and exact loss/seventh-win presentation still require the main lane's OFF-profile UI work; this dossier only establishes logical state transitions.
