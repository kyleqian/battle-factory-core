# Battle Factory post-win swap contract

This is a source-first handoff for Stage 8's unique swap-YES UI. It is not a
new controller interface and does not claim pixel implementation. The pinned
Battle Scene OFF evidence is the existing pair
`tools/compare/traces-groundtruth/battle1-swapyes-{a,b}.json`; both start at
the shared post-win offer at tick 29601 and the latter reaches Battle 2's
settled menu at tick 34081.

## Boundary before the UI

After a non-terminal win, `BattleFrontier_BattleFactoryPreBattleRoom_
EventScript_AskSwapMon` calls `factory_generateopponentmons` **before** it
prints the offer and reads its YES/NO result
([scripts.inc:137-158](../reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc)).
The three swap candidates are therefore `gEnemyParty[0..2]`, not a new
roll made by the swap screen. NO and B go straight to the common
`EnterBattleRoom` path. YES fades to black, runs `factory_swapmons`, then:

```text
offer YES
  -> player picker (three gPlayerParty slots, cursor 0)
  -> chosen ball: SUMMARY / SWAP / RECHOOSE (cursor SUMMARY)
  -> SWAP: remember player slot, slide to enemy picker
  -> enemy picker (three gEnemyParty slots; PKMN FOR SWAP + CANCEL buttons)
  -> chosen eligible ball: "Accept this POKéMON?" YES / NO (cursor YES)
  -> YES: copy one enemy slot, fade out, script marks swapped, common path
```

The task-level transitions are direct in
[`battle_factory_screen.c`](../reference/pokeemerald/src/battle_factory_screen.c):
`Swap_Task_HandleChooseMons` → `Swap_Task_HandleMenu` →
`Swap_OptionSwap` → `Swap_Task_SwitchPartyScreen` →
`Swap_ActionMon` → `Swap_AskAcceptMon` → `Swap_Task_Exit` (lines 2633-2679,
3989-4055, 2409-2456). SUMMARY fades to the normal summary screen and
returns; RECHOOSE and an accept-NO return to the picker. Either CANCEL asks
`Quit swapping?`; YES or B there exits without a mutation.

## Selection and mutation rules

Enemy selection is rejected only when its species equals either of the two
player mons *not* being replaced. `Swap_AlreadyHasSameSpecies` intentionally
skips `playerMonId`; the rejection text is "This POKéMON is already in your
party!" ([source](../reference/pokeemerald/src/battle_factory_screen.c)).

On accepted confirmation, `CopySwappedMonData` applies this exact operation:

```text
gPlayerParty[playerSlot] = gEnemyParty[enemySlot]
gPlayerParty[playerSlot].friendship = 0
rentalMons[playerSlot] = {
  monId:       rentalMons[enemySlot + 3].monId,
  ivs:         rentalMons[enemySlot + 3].ivs,
  personality: gEnemyParty[enemySlot].personality,
  abilityNum:  gEnemyParty[enemySlot].abilityNum,
}
```

The screen returns script result FALSE after an accepted mutation and TRUE
after quitting/keeping the party. The script alone then calls
`factory_setswapped` and prints "Thank you! Your POKéMON swap is complete."
before the shared battle-room continuation. Do not increment the saved swaps
counter at offer display or at the mutation: `FACTORY_DATA_WIN_STREAK_SWAPS`
consumes the flag after the next win ([`battle_factory.c:243-266`](../reference/pokeemerald/src/battle_factory.c)).

## Pinned OFF fixture

`battle1-swapyes-b` takes player slot 0 (ONIX) and enemy slot 0 (GROVYLE).
The checked-in RAM fixture `battle1-swap-rentalmons-dump.json` proves:

- before selection: player rental IDs `[156,149,180]`, offered IDs
  `[188,184,135]`;
- after accept: player slot 0 is exactly former offered slot 0 (`188`,
  personality `1094072807`, IVs `3`, ability `0`), while slots 1–2 remain;
- the declined branch retains all six records unchanged.

The existing dense oracle windows establish the real UI timing without
turning those timings into controller logic: entry settles at 29701,
enemy picker at 30001, accept popup at 30181, accepted return/message at
30681, and Battle 2's first menu at 34081. `battle1-swapyes-rng-dump.json`
records 3,757 LCG steps across that tail; its automatic VBlank stream freezes
only with the later Battle-2 setup (tick 33286), not inside the swap decision.

## Reusable UI inventory and bounded remainder

`tools/extract/extract-factory-swap-screen.ts` owns the reusable extracted
data: `swap-screen-windows.json` (all BG/window geometry) and the genuinely
swap-specific `action-box.json` / `action-highlight.json`. Factory draft
assets supply the menu chrome, ball/cursor, mon-pic backdrop, font, and their
palettes. This rules out harvesting a screenshot as swap chrome.

Still requiring explicit OFF UI coverage are duplicate-species rejection,
CANCEL/quit, SUMMARY, RECHOOSE, PKMN FOR SWAP, accept-NO, and button
highlight navigation. Their branches are source-defined above but have not
been oracle-probed by the canonical ONIX→GROVYLE route; implement/probe them
as state-driven UI paths rather than extending a battle tick script.
