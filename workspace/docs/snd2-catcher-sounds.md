# snd2: the frame catcher's open sound findings, checked against the ROM

The frame catcher's first runs (`docs/frame-catcher-2026-11-20.md`) left five sound findings open. Each one was checked on the ROM and in
the decomp. Two were real bugs in our game, plus one more found on the way. The other three were mistakes of the catcher itself; those
are fixed in the catcher, so its reports no longer list them. Rules, RNG and the gameplay digest are unchanged: the five test-player
traces made again on this branch are byte for byte the old ones, and all five runs have the same gameplay digest as before.

Evidence (not in git): `.integration/evidence/snd2/` (catcher runs `base/` before and `final/` after, ROM probe outputs in `probe/`).

## Fixed in the game

| what | the ROM (decomp) | ours before | fix | test |
|---|---|---|---|---|
| A Pokémon sent in and knocked out in the same turn | cries as itself: `PlayerHandleFaintingCry` / `OpponentHandleFaintingCry` cry the party mon at `gBattlerPartyIndexes[battler]` | cried the Pokémon it replaced (seed 3: "Go! PHANPY! ... PHANPY fainted!" cried CHARMELEON; seed 6 VOLBEAT for EEVEE), and started the low-HP alarm from the old mon's max HP | `battleHitSounds.ts` reads the field at the faint and HP commands (switch-ins applied), not the turn's opening field | `snd2FaintCrySwitchIn.test.ts`: new ROM windows `snd2-switchin-faint-{off,on}` (RATTATA switches to a Level 5 PIDGEY that the foe's SEISMIC TOSS knocks out), both scenes |
| The swap screen's SUMMARY | cries the party Pokémon it shows (`battle_factory_screen.c:2404` opens it on `gPlayerParty`; the party is healed before the swap question, so the cry is the normal one) | cried the opening draft's six by row (seed 1: SABLEYE, ARON, DELCATTY for the party's MACHOKE, POLIWHIRL, BAYLEEF) | `core.ts` uses the same Pokémon as the picture (pic5's `factorySwapSummaryRentals`) | `snd2SwapSummaryCry.test.ts` |
| The same sound twice on one frame | one sound: the YES / NO's NO plays SE_SELECT twice (`menu.c:1020`, `script_menu.c:238`), the party submenu's B too, and the second `MPlayStart` on that frame changes nothing (the ROM probe logs it `noop`) | the player cut the first copy, which then sounds for one more frame: a doubled click | `player.ts`: a second start of the song already started on that frame, same player and pan, is ignored | `snd1PlayerPreemption.test.ts` |

ROM measurement of the swap SUMMARY: the catcher on seed 1's trace cut at the swap screen, with SUMMARY, UP, UP and B added
(`traces/t1sum.json`). The ROM's cries and ours now match in species, mode and frame: open 63 frames after the A, each change 21 frames
after the UP. Before the fix the run had 9 rows in its sound table, now 0.

## Not bugs in the game: the catcher was wrong

1. **Rollout's impact sound.** The ROM plays SE_M_HEADBUTT on 10 frames in a row for each roll, like ours: `AnimTask_Rollout_Step` calls
   `PlaySE12WithPanning(SE_M_HEADBUTT)` on every frame of its first phase (`battle_anim_rock.c:638-651`), and the step-mode ROM recording
   `aud242o-rollout-player` has all 10 (already pinned by `aud242oMoveAnimSounds.test.ts`). The catcher's fast ROM logger skips a frame
   when the music RAM did not change, and a sound restarted on every frame ends each frame in the same state, so it logged one. Fixed in
   `romRun.py` and `soundEventProbe.py --fast`: a playing track that did not move at all over a frame was restarted, so that frame is
   stepped. The fast logger now equals the step-mode recordings of both Rollout windows.
2. **Swap screen and swap-prompt sounds**, and the extra SE_SELECTs in the party submenu. Same presses, same sounds on both sides. Our
   party menu, its submenu and the swap screen report themselves open on the A frame, the ROM's a few frames later, so the A's own sound
   counted in the next menu's stretch on our side and in the old one on the ROM's. The catcher now counts a press's sound for the menu
   that took the press.
3. **SE_FAILURE in the battle party menu.** The ROM plays it too: B in the menu after a faint (`party_menu.c:1382-1384`, ROM window
   `party-forced-window`, pinned by `aud240cPartyMenuSounds.test.ts`). The catcher's ROM driver only made presses that changed a cursor,
   so the ROM never got that B. It now makes a press that only played a menu sound on our side, once.
4. **Summary screen music** (the extra "lowers the music" and "stops it"). Both are calls the ROM makes too: `CloseSummaryScreen` stops
   the cry and sets the music back to full volume on every close (`pokemon_summary_screen.c:1523-1524`). When the cry has already ended
   these calls change nothing; the ROM log leaves them out and ours logs every call. The catcher now leaves out a volume change to the
   volume the music already has, and a cry stop that cuts no cry, on both sides.

Smaller catcher fixes found on the way: the same sound twice on one frame counts once; only a steering press's own SE_SELECT is left out
(the old 8-frame window also dropped the player's real B right after it); a lowering and a restore of the music are no longer paired with
each other; the ROM driver makes a press once when the ROM side cannot read its effect (it pressed A six times on the summary's moves
page); the swap screen's SUMMARY is a menu the driver follows. Tests: `tools/test_frame_catcher.py` (17, no emulator).

## Catcher runs, before and after

Rows of each run's "Sound differences" table (fresh traces, same seeds; `base/` is master a528d1c59 with the old catcher).

| run | before | after | what is left |
|---|---|---|---|
| seed 1, winning-swap, Scene ON | 10 | 0 | |
| seed 3, full, Scene ON | 14 | 2 | Fire Spin's end-of-turn trap animation (below) |
| seed 4, full, Scene OFF | 7 | 1 | the last stretch: the run ends at the Lobby's save hold, expected (README) |
| seed 6, full, Scene OFF | 11 | 5 | the last stretch (2 rows); GROWLITHE's Intimidate (catcher set-up, below); a missing "come back!" (below) |
| seed 8, winning-swap, Scene OFF | 10 | 0 | |
| seed 1 cut at the swap SUMMARY | 9 | 0 | |
| Kyle's round, first 15,000 frames | 11 (first report, site build, before snd1) | 1 | a summary page-turn press the catcher replayed 5 frames too early (it lands mid-scroll on the ROM) |

## Found, not fixed (not sound, or not mine)

- **Fire Spin's end-of-turn animation is missing** (seed 3, battle 1: "Foe GLOOM is hurt by FIRE SPIN!"). The ROM plays General_TurnTrap's
  Status_FireSpin (`battle_anim_scripts.s:10382-10390`: SE_M_SACRED_FIRE2, embers, about 75 frames); our engine has no presentation for the
  turn-trap animation at all (pictures, time and sound), like the Ingrain heal the catcher already reported. Animation work.
- **The battle menus keep their cursor after a switch-in.** The ROM puts both the action and the move cursor back on the first entry
  (`HandleAction_Switch`, `battle_util.c:299-300`; `PlayerHandleSwitchInAnim`, `battle_controller_player.c:2190-2191`); ours opened
  CHARMELEON's move menu on the fourth move (seed 3, battle 1). A player pressing A at once would pick another move than on the ROM. Menu
  behaviour, not sound.
- **A voluntary switch with no "come back!" line** (seed 6, battle 1, the foe underground after Dig): the ROM prints "GROWLITHE, that's
  enough! Come back!" and recalls it (SE_BALL_OPEN); ours prints an empty line and goes to "Go! VOLBEAT!". Text and picture (the switch
  lines are pic1-9's item 7); the missing sound follows from the missing recall.
- **Catcher set-up gap: the player's Pokémon are not the engine's.** The catcher writes the engine's rentals into the save, but the
  re-entered select screen builds its six afresh with new personalities (`CreateFrontierFactorySelectableMons` →
  `CreateMonWithEVSpreadNatureOTID`), and those become the party. So gender and, for species with two abilities, the ability can differ:
  seed 6's GROWLITHE is female with no Intimidate on the ROM, male with Intimidate in ours, and the battle drifts from there (its HP 38 on
  the ROM, 62 in ours, five Intimidate stat drops only on our side). The catcher should patch the select screen's Pokémon (or the party
  after the draft) to the engine's personalities.
- Still open from snd1: our recorded sound effects are 1.2-1.45x quieter than in game; text speed-up on A (timing).
