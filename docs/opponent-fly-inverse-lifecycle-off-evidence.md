# Opponent-owned FLY inverse lifecycle — Scene OFF evidence

Fixture: `tools/battle-lab/mechanic-opponent-fly-inverse-lifecycle-off.json`.
It is an explicit `battle-scene-off` `mechanicLab` run with `overrides.parties`:
three complete, checksummed Pokémon per side, no transient-state injection.
Murkrow is the lead (Speed **96**) against Gastly (**76**); all four Murkrow
slots are legal `FLY` (19), so the Factory AI has one real legal move choice.
Gastly begins at **105/105 HP** and has two healthy Bulbasaur bench records.

`overrides.parties` writes complete party records before `CB2_InitBattle`, so
the ROM derives stats/current HP/PP and keeps the bench; repeated opponent
slots constrain AI without injecting an AI result
(`../../../../oracle/BATTLE_LAB.md:247-262`).  The setup therefore stages its
low-HP prerequisite only through a preceding ROM FLY strike.

## Observed Scene-OFF sequence

All frames below are trace-relative. The committed fixture requests every frame
in each listed edge window (124 captures / 3,738 total trace frames).

| frames | semantic boundary | oracle state |
| --- | --- | --- |
| 0 | constructed action request | Gastly `105/105`, Murkrow `120/120`, FLY PP `15,15,15,15`; raw framebuffer SHA-256 `7ae0874af2675287d1385b3cb8d597a31bbff7c99360a35350369bd60f38c4d9`. |
| 1063→1064 | real first locked FLY strike | Gastly `105→25`; its selected Night Shade later runs, leaving Murkrow `70` at 1250. This is the only low-HP staging. |
| 1300 / 1667–1669 | two ordinary command/input boundaries | first post-strike player action request is live at 1300; the next ordinary choice starts the inverse lifecycle, with no controller-state injection. |
| 1715→1716 | second FLY first-use PP edge | Murkrow's selected FLY slot is `14→13` (`15,14,15,15` → `15,13,15,15`). |
| 1845–1886 | charge/hide and intervening player move | `STATUS3_ON_AIR` sets at 1847; Night Shade PP falls `13→12` at 1884 while the flag remains set, proving the player action is consumed but auto-misses. |
| 2016→2017 | genuine next player command | player controller command becomes `18` while Murkrow remains airborne; the trace opens FIGHT at 2502–2504 and confirms the highlighted move at 2534–2538. |
| 2541 / 2548–2552 | locked strike, visibility restoration, no second PP use | `currentMove=FLY` at 2541; `STATUS3_ON_AIR` clears `64→0` at 2550 while FLY PP remains `15,13,15,15`. |
| 2676→2677 | KO before selected player move | Gastly `25→0`; Night Shade PP remains `12`, so the selected move never executes. |
| 3334–3344 / 3354–3360 / 3400–3420 | real forced party-selector boundary | a real A acknowledges the faint text; player controller command becomes `22` at 3356, and the fully drawn **“Choose a POKéMON.”** selector is present by 3416 with both bench slots available. Frame 3416 raw SHA-256 is `bc8b80b2613fb7e2ffdf12b4bb15bf8bee9a3bb326e57faf71c57b3b2f593aa1`. |

The completed trace's manifest SHA-256 is
`afadb6a2e3682b87dc6433de7f9726187d995f2d25cdc4c5941ebae2f49a07d3`.
Two fresh Battle Scene OFF oracle runs had byte-identical manifests and all
124 PNGs; both manifests passed `jq empty`.

## Source basis

- Murkrow's source TM/HM learnset includes FLY in
  `reference/pokeemerald/src/data/pokemon/tmhm_learnsets.h:5136-5158`; FLY is
  `EFFECT_SEMI_INVULNERABLE`, 70 power, 95 accuracy, 15 PP in
  `src/data/battle_moves.h:250-261`.
- The first charging turn calls `ppreduce`, while the second-turn script sets
  `HITMARKER_NO_PPDEDUCT` (`data/battle_scripts_1.s:785-807`); FLY then sets
  `STATUS3_ON_AIR`, and its continuation clears it before hit handling
  (`:1990-2012`).
- `AccuracyCalcHelper` turns an attack against `STATUS3_ON_AIR` into a miss
  before the normal accuracy path (`src/battle_script_commands.c:1054-1067`);
  the same file's semi-invulnerable helpers set/clear the FLY bit
  (`:9009-9045`).
- A surviving trainer battle goes from `BattleScript_HandleFaintedMon` to
  `openpartyscreen BS_FAINTED` (`data/battle_scripts_1.s:2830-2845`), matching
  the forced selector observed at 3416.

This is a source-and-oracle evidence checkpoint only: it changes no engine,
controller, animation, canonical trace, or pixel-acceptance baseline. The
smallest generic follow-up is to retain the opponent locked-action owner
across the genuine command-18 boundary and let it publish this real
`openpartyscreen` request, without turn/tick routing.
