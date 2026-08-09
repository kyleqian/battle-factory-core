# Cmd_printfromtable family scout

This is a source-only handoff for the remaining `Cmd_printfromtable` B guard.
The deterministic extractor is
`tools/extract/extract-printfromtable-family-audit.ts`; its generated artifact
is `src/data/gen/printfromtable-family-audit.json`. It reads only the pinned
`reference/pokeemerald` source and is not imported by production code.

## Closed inventory

The committed `data/battle_scripts_1.s` program contains **73**
`printfromtable` occurrences, **43** distinct table pointers, and **145**
resolved table entries. Every pointer has a source definition in
`src/battle_message.c`; every entry is contiguous from index 0 and resolves to
a numeric `STRINGID_*` in `include/constants/battle_string_ids.h`. The full
pointer/length inventory is:

| Pointer | Length | Producer scope |
| --- | ---: | --- |
| `gAbsorbDrainStringIds` | 2 | ordinary Factory-L50 singles |
| `gBRNPreventionStringIds` | 3 | ordinary Factory-L50 singles |
| `gBattlePalaceFlavorTextTable` | 4 | excluded Palace |
| `gBerryEffectStringIds` | 2 | ordinary Factory-L50 singles |
| `gFellAsleepStringIds` | 2 | ordinary Factory-L50 singles |
| `gFirstTurnOfTwoStringIds` | 8 | ordinary Factory-L50 singles |
| `gFlashFireStringIds` | 2 | ordinary Factory-L50 singles |
| `gFocusEnergyUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gFutureMoveUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gGotBurnedStringIds` | 2 | ordinary Factory-L50 singles |
| `gGotDefrostedStringIds` | 2 | ordinary Factory-L50 singles |
| `gGotFrozenStringIds` | 2 | ordinary Factory-L50 singles |
| `gGotParalyzedStringIds` | 2 | ordinary Factory-L50 singles |
| `gGotPoisonedStringIds` | 2 | ordinary Factory-L50 singles |
| `gInobedientStringIds` | 5 | ordinary Factory-L50 singles |
| `gItemSwapStringIds` | 3 | ordinary Factory-L50 singles |
| `gKOFailedStringIds` | 2 | ordinary Factory-L50 singles |
| `gLeechSeedStringIds` | 5 | ordinary Factory-L50 singles |
| `gMistUsedStringIds` | 2 | widened legal Factory singles |
| `gMoveWeatherChangeStringIds` | 6 | ordinary Factory-L50 singles |
| `gNoEscapeStringIds` | 5 | excluded wild |
| `gPRLZPreventionStringIds` | 3 | ordinary Factory-L50 singles |
| `gPSNPreventionStringIds` | 3 | ordinary Factory-L50 singles |
| `gPartyStatusHealStringIds` | 5 | ordinary Factory-L50 singles |
| `gProtectLikeUsedStringIds` | 3 | ordinary Factory-L50 singles |
| `gRainContinuesStringIds` | 3 | ordinary Factory-L50 singles |
| `gReflectLightScreenSafeguardStringIds` | 6 | ordinary Factory-L50 singles |
| `gRestUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gSandStormHailContinuesStringIds` | 2 | ordinary Factory-L50 singles |
| `gSandStormHailDmgStringIds` | 2 | ordinary Factory-L50 singles |
| `gSandStormHailEndStringIds` | 2 | ordinary Factory-L50 singles |
| `gSportsUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gStatDownStringIds` | 4 | ordinary Factory-L50 singles |
| `gStatUpStringIds` | 6 | ordinary Factory-L50 singles |
| `gStockpileUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gSubstituteUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gSwallowFailStringIds` | 2 | ordinary Factory-L50 singles |
| `gTransformUsedStringIds` | 2 | ordinary Factory-L50 singles |
| `gUproarAwakeStringIds` | 3 | ordinary Factory-L50 singles |
| `gUproarOverTurnStringIds` | 2 | ordinary Factory-L50 singles |
| `gWeatherStartsStringIds` | 16 | widened legal Factory singles |
| `gWokeUpStringIds` | 2 | ordinary Factory-L50 singles |
| `gWrappedStringIds` | 6 | ordinary Factory-L50 singles |

The JSON carries every entry's source line, index expression, numeric string
ID, and every producer's assembly line plus citations. The scope label is for
the producer path; it does not claim that every row is selected in every
ordinary L50 scenario. Doubles-only chooser rows remain visible in their full
source tables rather than being silently truncated.

## Missing production batch and barrier consequence

The current `PRINTFROMTABLE_TABLES` map has 40 of the 43 source pointers. It
also transcribes only 5 of the 6 source rows for `gStatUpStringIds`: the
missing index 5 is `STRINGID_PKMNUSEDXTOGETPUMPED` from
`battle_message.c:1006-1014` (`B_MSG_USED_DIRE_HIT` is defined at
`battle_string_ids.h:400`). The smallest source-complete production batch is
therefore four finite data changes:

1. `gWeatherStartsStringIds` — 16 entries; source producer
   `src/battle_util.c:2529` pushes `BattleScript_OverworldWeatherStarts`.
2. `gNoEscapeStringIds` — 5 entries; source wild escape producer
   `src/battle_util.c:520` selects `BattleScript_PrintFailedToRunString`.
3. `gBattlePalaceFlavorTextTable` — 4 entries; source
   `VARIOUS_PALACE_FLAVOR_TEXT` producer `src/battle_script_commands.c:6396`.
4. `gStatUpStringIds[5] = STRINGID_PKMNUSEDXTOGETPUMPED` — the existing
   family is otherwise registered, but its source length is 6 rather than the
   current production length 5.

The next main implementation can land these four finite data changes together,
preserving the existing pointer/index guards. That retires the remaining
source-produced pointer/length B subcase at `Cmd_printfromtable`; malformed
operand shape and genuinely out-of-range index guards remain defensive D
boundaries. The three absent pointers are the only families absent from the
map; `gStatUpStringIds` is the only registered family with a source-length
mismatch.
No oracle or dynamic-pixel acceptance is claimed here.

## Regeneration

```sh
node --experimental-strip-types tools/extract/extract-printfromtable-family-audit.ts
npm test -- tests/printfromtableFamilyAudit.test.ts
```

The Tier-1 test asserts the 43/145/73 counts, all contiguous indices and
numeric IDs, special-scope citations, the three missing production keys, and
byte-idempotent regeneration.
