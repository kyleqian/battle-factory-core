# opl5: Open Level, the runs a player can reach that opl4 had not checked (2026-11-22)

Follow-up to `docs/opl4-open-level-proof.md` ("Not checked"). Frame catcher runs on both sides from the same seeds and inputs, the ROM
from its own Open Level route; every check reads the ROM's RAM (`tools/openlevel/catcherChecks.py`). Evidence:
`workspace/.integration/evidence/opl5/` (not in git). Engine unchanged (tools only); Level 50 census byte-identical (below).

## In short

| run | rounds / battles | menus followed | game-loop checks |
|---|---|---|---|
| Open round, then LV. 50, then OPEN LEVEL again (seed 5 Scene ON, seed 13 Scene ON) | 3 / 15 each | 597 / 597, 834 / 834 | all the same |
| LV. 50 round, then OPEN LEVEL, then LV. 50 again (seeds 4, 21 Scene OFF) | 3 / 15 each | 769 / 769, 865 / 865 | all the same |
| gold Noland at Open (streak 35, silver symbol held): seeds 16 Scene OFF and 21 Scene ON beat him, 15 Scene OFF loses | 2 / 8, 2 / 8, 1 / 7 | 207, 273, 318, all | all the same |
| after-save start at Open (a new ROM snapshot), a whole round: seeds 2, 9 Scene OFF | 1 / 7 each | 401 / 401, 285 / 285 | all the same |

Totals over the nine runs: 97 battles; the same rentals as built (114), IVs (114), deals (12: the ROM's own six and first trainer
from the engine's cursor), each deal's level / streak / rent count (12), **both levels' slots and win-streak-active flags (12)**, the
save's symbols and heard-speech bits (5, where logged), trainer rolls (75), foes as built (291), the player's three at every battle
start (97), transitions (97), the Factory Head's team (3).

## 1. Switching levels at the Lobby

A round won at one level, then the attendant's level choice changed (`makeTrace.mjs --lobby-levels`). At every deal the catcher reads
the ROM's `factoryWinStreaks[0][*]`, `factoryRentsCount[0][*]` and `winStreakActiveFlags` (STREAK_FACTORY_SINGLES_50 / _OPEN) and
compares them with the engine's carry (`carryForChallengeLevel`):

| seed | round 1 | round 2 (other level) | round 3 (back) |
|---|---|---|---|
| 4 OFF | Level 50, won 7 (6 rents) | Open: streak 0, rents 0; Level 50 kept: 7 / 6, active | Level 50: streak 7, rents 6 (challenge 1); Open kept: 7 / 3, active |
| 21 OFF | Level 50, won 7 (5 rents) | Open: 0 / 0; Level 50 kept 7 / 5, active | Level 50: 7 / 5; Open kept 7 / 6, active |
| 13 ON | Open, won 7 (2 rents) | Level 50: 0 / 0; Open kept 7 / 2, active | Open: 7 / 2 (challenge 1); Level 50 kept 7 / 5, active |
| 5 ON | Open, won 7 (5 rents) | Level 50: 0 / 0; Open kept 7 / 5, active | Open: 7 / 5; Level 50 kept 7 / 5, active |

ROM and engine the same in every cell, and each round's deal (six set ids, the first trainer and its sets) the same.
Within one mount a level switch follows a won round only (a loss or a retire ends the mount at `challenge-request`), so the
"switch back to a level that lost" case is not playable in one mount; the engine's rule for it is pinned from the source
(`tests/opl2OpenLevelEngine.test.ts`).

A third Open-first run (seed 13 Scene OFF) matched through round 2's deal and first battle, then split at the GO ON menu: the test
player pressed A on REST, which the engine deliberately ignores (REST, "save and quit", is not modelled) and the ROM takes. Not a level
rule; not counted above.

## 2. Gold Noland at Open

`--start-streak 35 --symbols 1`: the save holds the silver symbol and the silver speech heard; the catcher writes the same on the ROM
(FLAG_SYS_FACTORY_SILVER, `battledBrainFlags` bit 8). Battle 42 (the round's 7th) is the gold Factory Head on both sides; his team is the
ROM's own `FillFactoryBrainParty` from the engine's cursor (his draws the engine's stream back to back): 3 / 3. After a gold win the next
round's deal reads Open streak 42, rents 1, both symbols and both speeches heard, the Level 50 slots untouched: the engine's carry.

## 3. The after-save start at Open

`oracle/bootstrap/factory-open-after-save*.json` (`make-factory-open-after-save.py`, `oracle/BOOTSTRAP.md`): the Open route cut at frame
5,310, where the ROM shows "Please step this way." at its first glyph, the engine's `start: "after-save"` frame 0 (the text box identical
frame by frame; the rest differs only by the Lobby's wandering NPCs). gRngValue there 0xfd76c447 is the engine's `gameplaySeed`. From it the
ROM plays the door walk, the PreBattleRoom walk-in, its own deal and the briefing; the catcher compares that first stretch too (only the
NPC differs) and the whole round after it: all checks the same. The ROM's own cursor at the deal differs from the engine's (the engine does
not follow every per-frame draw of the walk: the parked distribution class of ISSUES #55, the same at Level 50), so the deal is trapped
with the engine's cursor as every later deal is.

## Level 50 unchanged

No engine change in this round (tools only: the test player's level plan, makeTrace / engineRun / romRun / compare.py / catcherChecks,
the after-save bootstrap). Census 0..199 both scenes on 371080d27: byte-identical to master (below). The soak-driver tests (38 files, 344 tests) pass.

Census 0..199 on 371080d27 against master 32c233e62: Scene OFF and Scene ON eventsDigest and error identical 200 / 200, 0 changed
commands, byte-identical shards.
