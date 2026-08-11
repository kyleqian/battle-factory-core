# Battle 2 OFF portability fixture

`tools/compare/traces-groundtruth/battle2-off-turn1.json` is the first
explicit Battle Scene **OFF** Battle-2 turn fixture.  It reuses the committed
decline-prefix input transport only to reach the held `ONIX 117/117` versus
`KABUTO 91/91` action menu, opens FIGHT at canonical 33031, and confirms the
default ROCK SLIDE at 33071.  Its profile is explicit and the only dense
captures are the distinct OFF turn-resolution windows; the ten earlier
captures are joint transport anchors, not an assertion of ON pixel parity.

The fixture has 179 captures (under the 256 limit). Two OFF-oracle runs had
zero hash mismatches; final target capture 33485 is
`803c9c92e05f4d762af5af30c087611c57b33dc425ee8c5f23fadea31efa513d`.
This is ground truth for a later scenario adapter, not an app compare trace.

## Confirm-relative outcome ledger

The confirm edge at 33071 is elapsed zero. Fresh RAM data is committed in
`src/data/gen/battle2-off-turn1-watch.json`, reproduced by
`tools/probe/specs/battle2-off-turn1-watch.json`.  All status words remain
zero. `gBattlerByTurnOrder=[0,1]` pins ONIX (speed 76) before KABUTO (61).

| elapsed | observed logical boundary |
| --- | --- |
| +0 | ROCK SLIDE confirmation clears controller execution; PP starts 10 and RNG is 3530724670. |
| +6 | `gCurrentMove=157`, attacker 0, target 1: ONIX owns ROCK SLIDE. |
| +11 / +38 | accuracy call -> 2956382169; PP 10→9. Damage becomes 19 then STAB-adjusted 28, and spread call -> 2508258776. BATTLE ARMOR leaves crit multiplier 1. |
| +140 / +145 | KABUTO HP commits 91→63; the non-flinch secondary consumes call 3 -> 575948139. |
| +154 / +159 / +190 | KABUTO takes move/attacker ownership (`28`, 1); its accuracy call -> 650807554; SAND ATTACK PP 15→14 and ONIX accuracy stage 6→5. No HP or status change. |
| +400 / +405 / +407 | turn-end calls are respectively +1 -> 3011990093, +2 -> 1648070399, and +5 -> 3121225034. The action menu is execution-ready at +405 and the first confirmed accepted next-menu A edge is +407 (33478). |

Thus the shared battle rules consume 12 RNG calls: ROCK SLIDE accuracy,
damage spread, secondary; SAND ATTACK accuracy; then the 1+2+5 turn-end
cluster. Battle Scene OFF changes presentation duration but not the logical
order, PP/HP/stat result, or call ledger.

Source anchors: `Cmd_accuracycheck`, `Cmd_critcalc`,
`ApplyRandomDmgMultiplier`, and `Cmd_attackanimation` in
`reference/pokeemerald/src/battle_script_commands.c`; the latter skips move
animation when `HITMARKER_NO_ANIMATIONS` is set. `BattleTurnPassed` is in
`battle_main.c`; the final AI calls are in `BattleAI_SetupAIData` and
`ChooseMoveOrAction_Singles` in `battle_ai_script_commands.c`.

No production engine/controller/interface or rendering files were changed.
