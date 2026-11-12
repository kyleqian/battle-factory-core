# ret165 — Factory parties turn Return into Frustration (ISSUES #165, 2026-10-13)

Main/ts lane gameplay correction, user-authorized under `docs/factory-finish-scope.md`.

## Source

- `battle_factory.c:913-919` `SetMonMoveAvoidReturn`: `MOVE_RETURN` -> `MOVE_FRUSTRATION`, every other move unchanged.
- Callers that build Factory mons from `gFacilityTrainerMons`: `battle_factory.c:461` (player party on resume, friendship 0), `:501`
  (enemy party on resume), `:822` (Brain party, friendship 0), `battle_tower.c:1880` `FillFactoryFrontierTrainerParty` (friendship 0),
  `battle_factory_screen.c:1774` `CreateFrontierFactorySelectableMons` (the draft screen's mons; `Select_CopyMonsToPlayerParty` copies
  them into `gPlayerParty`). Swap screens read `gPlayerParty` / `gEnemyParty` (already mapped).
- Raw readers that keep Return: `battle_factory.c:672` (`GetMoveBattleStyle(gFacilityTrainerMons[monId].moves[j])`, the opponent
  battle-style hint). Neither Return nor Frustration is in any style list, so the hint's result is identical either way.
- Frustration at friendship 0: `(255 - 0) * 10 / 25 = 102` (`Cmd_friendshiptodamagecalculation`); Return at 0 gives dynamic power 0, so the
  damage formula used the table power 1.

## Change (production src)

- `src/engine/factoryCorpusParty.ts`: `setMonMoveAvoidReturn(move)` and `factoryFacilitySetMoveIds(setId)` (the raw table).
  `createFactoryCorpusPartyMember` — the one builder behind the battle-start kernel parties (`healFactoryKernelParty`, player and
  opponent), generated / Brain opponents, the swap rebuild (`rentalMons` -> next battle), post-win parties and the draft SUMMARY data
  (`createFactoryRentalPresentation`) — writes every set move through it. PP is the mapped move's (both 20).
- `src/engine/factoryCommentary.ts`: `getFactoryOpponentBattleStyle` tallies the raw set moves when a member carries `setId`.
- Not changed: `src/engine/factoryBattleScriptDecision.ts` (a fixed TYROGUE 15 vs PLUSLE_2 291 staging adapter; neither set has Return);
  core-rs (`crates/factory-core/src/mon_construction.rs` has no AvoidReturn mapping — out of this lane's scope).
- The live Return adapter (ReturnWeak / ReturnStrongest) stays: Metronome can still call Return.

## ROM proof (Battle Scene OFF)

`tools/probe/ret165/` — two `factoryLegal` labs and `ret165-receipt.json` (`build-ret165-receipt.ts`):
player GYARADOS 459 / EXEGGUTOR 534 / FEAROW 567, and an opponent GYARADOS 747 lead. All 6 Return carriers hold 218 in RAM (gBattleMons
`0x2024084` via `../oracle/battle_lab.py`, and both decrypted parties), friendship 0, every other move unchanged; the TS builder matches
all 12 ROM members (moves, PP, friendship). Frame 41 (`ret165-fight-menu-frustration-frame41.png`, read) shows **FRUSTRATION** / BITE /
THUNDER WAVE / DRAGON DANCE, PP 20/20. The draft SUMMARY page was not captured: reaching a Return set needs a staged draft roster, which is
not cheap; covered by source (`battle_factory_screen.c:1774`) and the Tier-1 test.

## Tests

`tests/factoryReturnToFrustration.test.ts` (9): the 11 Level-50 Return sets, the helper maps only 216, every Return set / non-Return
control, kernel party (player + opponent records), swap path, draft summary (`FRUSTRATION`, PP 20), raw style hint, power 102 at
friendship 0.

## Ripple (every moved pin attributed to a Return carrier)

| moved | carrier | action |
|---|---|---|
| `tests/factoryPartyMemberParity.test.ts` full sweep (TS vs core-rs wasm) | exactly the Return sets (26, 28, 107, 288, 306, 355, 459, 534, 567, 747, 827) | records the TS-only divergence; asserts it is exactly those sets and only the moves list |
| `tests/animation/liveReturnAdapter.test.ts` route 24/14 | player PIDGEOT set 355 | now a live 229-row Frustration body (234 with iu120 rows), friendship 0, no Return request |
| same, route 51/28 | player EXEGGUTOR set 534 | same |

No other test moved (full suite below).

Census 0..999 (`ret88Census.sh shards`, `.integration/validation/ret165-20261013/census/merged.json`) vs the final census on `159c9e694`:

| | commands | live | by count | frames | live frames | by frames | Return 216 | Frustration 218 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| before | 27,402 | 27,221 | 99.34 % | 4,166,351 | 4,149,717 | 99.60 % | 84 (live) | 90 (live) |
| after | 27,256 | 27,075 | 99.34 % | 4,155,309 | 4,138,675 | 99.60 % | **0** | 154 (live) |

34 battles changed (17, 22, 24, 29, 40, 52, 171, 202, 204, 218, 227, 242, 243, 273, 278, 316, 403, 438, 487, 489, 528, 554, 635, 671, 741,
775, 790, 812, 830, 846, 879, 897, 978, 986); in every one the command sequence first diverges exactly at the first Return command of the
before-arm (player 20 / opponent 14 carriers: GYARADOS, PIDGEOT, FEAROW, EXEGGUTOR, TOGETIC, DRAGONAIR). 0 unattributed. Played /
terminal / stalled 1000 / 997 / 3 both arms, 0 render throws; battleDigest `9b66e7da…` -> `ae69356f…`.

Soak vanilla 0:20 (`--parallel 10`): 20 / 20 OK, all budget-ended at battle 2 turn 16; the per-seed summary lines are identical to
`.integration/validation/soak-gates-20261012/vanilla.log` (no per-frame baseline exists to compare deeper).
