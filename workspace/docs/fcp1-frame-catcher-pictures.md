# fcp1: picture fixes from the frame catcher (2026-11-20)

The frame catcher (`tools/frame-catcher/`, first report `docs/frame-catcher-2026-11-20.md`) compared our engine with the ROM over Kyle's
round and varied battles. This step fixed the picture differences it found that nobody had fixed yet. Every fix is presentation only,
measured on the ROM, and pinned by a test that fails without it. Kyle's trace's gameplay digest is unchanged (`90a4f3cc19dd63f3` before
and after), as are the digests of the three fresh traces below.

Fresh traces (made on this branch's base, a528d1c59): `makeTrace.mjs --seed 3 --scene on --policy full`, `--seed 1 --scene on --policy
winning-swap`, `--seed 8 --scene off --policy winning-swap`, all `--battles 2 --max-frames 45000`, plus Kyle's live trace (on master it
drifts after battle 1's first turns and stays in battle 1, so it is used for the draft only).

Gates on the final tree: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; `NODE_OPTIONS=--max-old-space-size=8192 npm test`
1,900 files / 16,265 tests passed, 0 failed (44 files skipped as on master).

## Fixed

| # | what Kyle would see | ROM | cause | fix | test |
|---|---|---|---|---|---|
| 1 | After switching CHARMELEON out, losing PHANPY and sending CHARMELEON back, its HP box was missing for about 1,000 frames (seed 3, through "CHARMELEON used AERIAL ACE!" to the foe's Petal Dance) | the box shows the whole time (`SwitchIn_TryShinyAnimShowHealthbox` -> `SetHealthboxSpriteVisible`, `battle_controller_player.c:1098-1112`) | the render view replays earlier segments of the turn for visibility; it replayed the voluntary switch's recall (which hides the box) but not the send-in that showed it again | a switch-in in an earlier segment restores the battler's sprite and box (`battleResolutionPresentationRender.ts`) | `tests/hpb1HealthboxAfterResend.test.ts` |
| 2 | Ingrain's end-of-turn heal: ours went straight to "X absorbed nutrients with its roots!", silent | Scene ON plays `General_IngrainHeal` (green background, orbs flying into the rooted mon, blue stars; `battle_anim_scripts.s:10648-10665`), 198 frames before the text; Scene OFF waits 35 frames (`BattleScript_Pausex20`) | `BattleScript_IngrainTurnHeal`'s `playanimation` (`battle_scripts_1.s:3609-3610`) had no presentation | a 198-frame `INGRAIN_HEAL` general animation (the Wish heal pattern) and the Scene OFF hold. The script is `Move_ABSORB` without its opening hit, so `src/animation/ingrainHeal.ts` reuses `absorb.ts` with the orbs 13 frames earlier | `tests/ing1IngrainHealAnimation.test.ts` (ROM frame hashes) |
| 3 | The foe's SPINDA had no spots (Kyle's battle 4, personality 1313747607) | spots from the personality on every front picture (`DrawSpindaSpots`, `pokemon.c:5808-5812`, from `LoadSpecialPokePic`) | the field picture is built from the species alone | `src/engine/spindaSpots.ts`, used by the field-art builder for an opponent SPINDA | `tests/spd1SpindaSpots.test.ts` (ROM spot pixels for 4 personalities) |
| 5 | The rental's name on the draft screen was pure red, (255,0,0), after a summary visit; the ROM's is (231,8,8) | after a summary visit the select screen's `STATE_MENU_REINIT` (`battle_factory_screen.c:1654-1657`) takes the name's red from text palette entry 4, which `Select_InitDisplay` never loads (`PLTT_SIZEOF(4)`, :1191): the field message box's red left there (`gMessageBox_Pal[4]`, RGB(28,1,1)) | not modelled | the breathe blends from that red from its next step after a summary visit (`speciesNameFade.ts`) | `tests/nmc1DraftNameColourAfterSummary.test.ts` |
| 6b | With only one Pokémon left standing, ours said "Choose a POKéMON." in the battle party menu | "Choose POKéMON or CANCEL." (seed 8, battle 2, DUSTOX and CHINCHOU fainted: 213 ROM-only frames) | `DisplayPartyMenuStdMessage` swaps the prompt when `ShouldUseChooseMonText` is false: not a send-out and at most one party mon with HP (`party_menu.c:2491-2522`, `gText_ChoosePokemonCancel`, `strings.c:450`) | not modelled | the prompt follows that rule (`battlePartySelect.ts`) | `tests/pmw1PartyMessageWindow.test.ts` |
| 6 | The party menu's message box while it closes: on every cancel (B, or A on CANCEL) ours showed the submenu's narrow "Do what with this PKMN?" box; after SEND OUT in a forced switch ours went back to "Choose a POKéMON." | a cancel never opened the submenu, so the ROM fades out with "Choose a POKéMON." in the wide box (seed 1: 8 of 8 cancels); SEND OUT keeps the narrow box through the fade | the box was drawn narrow through every close, and the forced send-out's close had no clock in the shared renderer | narrow only after a confirm; the forced send-out's confirm is carried (`battlePartySelect.ts`) | `tests/pmw1PartyMessageWindow.test.ts` |

Measured on the ROM for each:

- **1**: seed 3 catcher run; ROM frames 11,659-12,675 show the box, ours 11,235-12,188 did not.
- **2**: staged oracle labs `tools/battle-lab/ing1-player-on.json`, `ing1-opp-on.json`, `ing1-player-off.json` (the Wish windows with
  INGRAIN; app stages `ing1-*` in `tools/compare/appTrace.ts`, traces `tools/compare/traces/ing1-*.json`). Before: every row before the heal
  at offset 0, the text at +198 (Scene ON) / +35 (Scene OFF). After: Scene ON 249 of 256 frames identical over the heal window on the player
  side, 248 on the opponent side; the ones left are 2 to 10 pixels of one small orb (the orb drawing `Move_ABSORB` already uses). Scene OFF:
  256 of 256 identical through the text. Sounds (added with the planning session's OK, one `INGRAIN_HEAL` branch in
  `src/engine/moveAnimSounds.ts`): the ROM's SE rows from `tools/audio/soundEventProbe.py` on the two Scene ON labs are SE_M_CRABHAMMER x8
  at command age 34 to 76 every 6 frames and SE_M_ABSORB_2 at 129, panned to the rooted battler's side; ours now plays the same frames, SEs
  and pans on both sides. The HP number and the next menu after the heal stay 1 to 2 frames off, as after the Wish heal
  (`docs/wsh1-general-anim-commands.md` residuals).
- **3**: oracle mechanic labs with an opponent SPINDA of personality 1313747607, 0, 0xFFFFFFFF and 0x12345678: our spot pixels match the
  ROM's exactly (0 wrong pixels), and the battle screen renderer draws them.
- **5**: Kyle's draft (catcher ROM run): menu closed at 4006, (231,8,8) from 4008, then the seven breathe steps
  (214,198,181,173,156,140 and back). Ours now: closed at 4066, (231,8,8) from 4068, the same steps. The swap screen loads all five text
  colours and already matched (seed 1).
- **6**: seed 1 catcher run, the cancels at ROM 2,622 / ours 2,531 and the forced SEND OUT at ROM 8,922 / ours 8,444.

## Catcher re-run on this branch

`JOBS=4 KEEP=1 tools/frame-catcher/run.sh` on the four traces, base a528d1c59 against this branch (reports in this step's scratchpad, not
kept). Every menu followed on both runs; the gameplay digests are identical.

| trace | picture differences before / after | gone |
|---|---|---|
| seed 3 `full`, Scene ON | 674 / 661 | the missing HP box (ours-only 3,384 px over 1,000 frames, ROM-only over 4 stretches of battle 1); the party message box on 6 closes |
| seed 1 `winning-swap`, Scene ON | 293 / 287 | the cancel box (ours-only 1,360 + 649 px over 128 frames, 8 cancels); the forced SEND OUT box (30 + 28 frames) |
| seed 8 `winning-swap`, Scene OFF | 447 / 441 | the cancel box (244 + 240 frames); the forced SEND OUT box (45 + 42 frames) |
| Kyle's live trace (draft + battle 1) | 173 / 174 | the draft name colour (ROM-only 211 px over 243 frames); the party message box (112 + 98 frames) |

The Ingrain heal and SPINDA do not occur in these traces; they were checked on the staged ROM labs above. What is left near the fixed
items: in Kyle's draft, a few pixels of the name at the breathe's steps (after a summary visit the ROM's first step comes 93 frames after
the menu closes, ours 51: the breathe's phase across the summary visit is not modelled; restarting the task in RUN, as CB2_InitSelectScreen
does, did not change it); in Kyle's battle 1, one frame per forced SEND OUT submenu opening (281 px over 3 frames); in seed 3's battle 2, a
faint stretch that the two sides cut differently (ROM-only at the player's box, 205 frames, already in the base run).

## Not fixed

- **4. The room after the swap screen** (confirmed on the ROM, not fixed). The ROM returns to the room through
  `CB2_ReturnToFieldContinueScript` (`overworld.c:1677`): after the swap screen's fade to black it holds black for 15 frames (the map
  reload), then `FieldCB_ContinueScript` -> `FadeInFromBlack` fades the room in over 15 frames (`field_screen_effect.c:95-99, 150-155`),
  with no message box (the YES/NO prompt is not redrawn). After a real swap `factory_setswapped` and
  `msgbox BattleFrontier_BattleFactoryPreBattleRoom_Text_YourSwapIsComplete, MSGBOX_DEFAULT` follow ("Thank you! Your POKéMON swap is
  complete.", box 10 frames after the fade, waits for A), then "Right this way, please!" (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:151-158`).
  Ours holds black for 3 frames, shows the room at full light with the old YES/NO prompt for a frame and the old text for 3 more, and skips
  "Thank you!" (seed 1: ROM black 13,131-13,145, fade 13,146-13,160, "Thank you!" from 13,171; ours black 12,405-12,407, room 12,408).
  Why not fixed here: our room advances the per-frame RNG (as the ROM's VBlank `Random()` does), so the ROM's extra 30+ frames and the new
  A-press wait change the RNG every later battle starts from. That is a gameplay-timing change, outside this presentation-only brief; it
  belongs with the room-timing work (the same reason the picture-fixes step left the rooms' hand-off timing alone). Once it is allowed: the
  draft's own return to the room already models the same black hold and fade (`prebattleRoom.ts` `EXIT_TO_ROOM_BLACK_HOLD_TICKS`,
  `paletteFade.ts` `FADE_IN`); the swap return should reuse them, then add the "Thank you!" message on the swap path.
- **6, the two "worth a look" items.** Checked on the ROM, nothing to fix on master: (a) no party slot is drawn in another colour while the
  submenu is open (Kyle's run, 12 submenu openings sampled 3, 10 and 20 frames in: only the party icons' bob phase differs); the old
  picture (t1, ROM 2,839) was a fade frame with the two sides' cursors on different slots, which the cancel-fade work has since fixed.
  (b) After a party-menu cancel the battle screen returns frame for frame as the ROM's (seed 1: the same 16 fade-in pictures and the same
  action-menu picture, at a constant offset).

## Seen, not in this brief

- The party icons' bob phase differs on most party-menu frames (Kyle's run: ROM-only / ours-only blobs at the icons in 142 and 161
  stretches). Not checked further.
- Seed 3, battle 2: during "ELEKID, come back!" the ROM draws the recalled mon at full size where ours already shows it shrunk (ours
  17,284 vs ROM 18,160, 70 frames over 6 recalls).
