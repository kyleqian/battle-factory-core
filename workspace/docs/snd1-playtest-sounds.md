# snd1: the sound gaps of Kyle's 2026-11-20 live play, fixed against the ROM

Kyle played battlefactory.app (game eb-01c15b77495c4068 = core aeac1cdcb) and reported sound gaps ("there seems to just be gaps in the
rigor of the sound"). Evidence: his trace (`~/Developer/pokebench/_playtest-20261120/`, outside the repo), replayed on the site build and on
this branch. On this branch (cut from the box tip 2cd8b3039) the trace drifts out of sync during battle 1, because the box's timing work moved
frames, so the replay is used to locate moments and every fix is proven on staged ROM windows. Sound stays write-only: Kyle's trace gives the
same gameplay digest before and after (7e6488030b7461a0); only sound events change (+171 SE_SELECT, +1 SE_EXIT, 13 effectiveness SEs moved).

All ROM windows were recorded with `tools/audio/soundEventProbe.py` (step mode unless noted) and are committed under `tools/audio/fixtures/snd1-*`.

## 1. Battle menus (`src/engine/battleCommandPresentation.ts`)

| ROM (battle_controller_player.c) | before | now |
|---|---|---|
| HandleInputChooseAction :245-302: A always; D-pad only when the cursor moves; B silent in singles | only A on BAG / RUN | all |
| HandleInputChooseMove :480-597: A, B always; D-pad only when the cursor moves | silent | all |
| PlayerHandleYesNoInput :1420-1452 (forfeit box): UP / DOWN only when the cursor moves; A, B | every UP / DOWN | ROM rule |
| text.c TextPrinterWaitWithDownArrow: A / B on a `\p` page (the Torment / Taunt / no-PP rejection, "has no moves left!") | silent | SE_SELECT |

Windows: `snd1-fight-menu-{on,off}` (labs `tools/battle-lab/snd1-fight-menu-*.json`: an action-menu cursor walk with edge presses, FIGHT, a
move-cursor walk with edge presses, B back, FIGHT, a move), `snd1-forfeit-menu-{on,off}`, `snd1-torment-reject-off`, `snd1-struggle-{on,off}`.
Test: `tests/snd1BattleMenuSounds.test.ts` (every SE_SELECT frame equal, phase timeline checked). `frf250a` / `frf250b` now compare their
whole windows (they skipped the cursor sounds as a known gap).

Not changed (behaviour, not sound): HandleMoveSwitching (SELECT swaps two moves) is not implemented; the forfeit box handles A before UP /
DOWN in one frame (the ROM handles UP, DOWN, then A); the draft handles RIGHT, LEFT, then A (the ROM A first).

## 2. Audit of the input screens

Method: every press of Kyle's trace logged with its screen state and the sounds of that tick (site build), silent presses grouped by screen,
each group checked against the ROM source and a ROM window.

| screen | result |
|---|---|
| draft / rental | all 14 PlaySE sites of `battle_factory_screen.c` have an emitter (aud240a windows). Silent presses: B in cursor mode (no ROM branch), presses while the pic animates |
| summary | aud240b windows. Silent presses: DOWN on the last rental (no next mon), RIGHT on the last page (ChangePage returns) |
| swap screens | aud240a windows. Silent presses: before the screen accepts input (its fade-in) |
| battle party menus | aud240c windows. Silent presses: edge presses that cannot move, presses during the 62-frame open fade |
| battle menus, forfeit, selection messages | **fixed** (section 1) |
| first walk into the battle room | **fixed**: SE_EXIT was missing (section 4) |
| Lobby attendant + pre-battle briefing | **fixed**: the whole conversation was silent (below) |
| post-battle dialogue, scientist / swap offer, terminal | aud240a / aud240d / aud241c windows. Kyle's silent A presses landed while text printed (the ROM is silent there too) |

**Lobby attendant (`src/engine/lobbySounds.ts`).** ROM: A at the attendant plays SE_SELECT (field_control_avatar.c TryStartInteractionScript,
any interaction script); `\p` / `\l` page waits (text.c); the CHALLENGE / LEVEL multichoice A and B (script_menu.c, B not ignored); MSGBOX_YESNO
A (a second SE on NO) and B; the save dialog's YES / NO A, B silent (start_menu.c SaveConfirmInputCallback / SaveOverwriteInputCallback,
menu.c plays nothing for B); a cursor press only when the ROM cursor moves; SE_SAVE when the saved message is done (SaveSuccessCallback
:1112-1116; anchored at the measured page age 15, the ROM's player name is shorter than our placeholder); SE_SELECT on A there (SaveSuccesTimer
:947-953); the walk-out warp's SE_EXIT on the fade's second frame; the briefing's `\p` page. Message ends (waitbuttonpress) stay silent.
Windows: `snd1-lbrb-{happy-a,info1,bcancel,levelb,saveno,saveb,savedlgno,overwriteno}-window.json` (lab traces `tools/compare/traces/lbrb-*-off.json`);
`tests/snd1LobbySounds.test.ts` requires every ROM sound after the loss terminal's first page on its frame.

Found, not fixed (behaviour): the attendant's three-entry menus wrap the cursor (the ROM's do not, script_menu.c:143-146; the sound follows
the ROM rule; fixed by lbb1, `docs/lbb1-lobby-b-press.md`); "saved the game." waits for A where the ROM moves on after 60 frames; **no screen speeds text up on an A / B press**
(text.c:944-952 with `canABSpeedUpPrint`, set for field messages by menu.c:194 and for battle messages by battle_message.c:3016), so a player who
mashes A reaches page waits later than on the ROM.

## 3. Ball-tray sounds at battle start (`src/audio/player.ts`)

The tray fires 14 SEs in one second; SE_BALL_TRAY_BALL (SE1) / _EXIT (SE2) follow each other as close as 2 frames apart. Frames and pans
already matched the ROM exactly (`snd1-first-walk-window.json`, frames 1228-1291). Two player faults:

1. **Preemption cut one frame early.** The player cut the old voice at the new event's time. ROM, isolated (soundRecorder's clean state,
   register-poked PlaySE1WithPanning, scratch probe): a BALL preempted 2 frames after its call plays its whole first audible frame (RMS 2133,
   alone 2133) and about half of the next (583 vs 1123); m4a acts on the call's frame, the mixer buffer plays out over the next one and TrackStop
   releases the notes. With the BALL's 924-sample onset the old cut lost every ball that the next followed within 2 frames (2 of 6 balls, 2 of 6
   exits silent). Now: released from one frame after the start, over one frame (`SE_STOP_LAG_S`, `SE_STOP_RELEASE_S`), also for m4aSongNumStop.
   With one frame between calls the ROM keeps the old sound a little longer than this model (not a tray case).
2. **First-use loading.** The tray files were fetched on first use, in the middle of the first battle's tray; they join the prefetch set.

Loudness against a ROM recording of the same stretch with the battle music muted (the ROM's own `m4aMPlayVolumeControl`): our tray mix was
0.57 of the ROM's RMS, 0.65 after the preemption fix. The rest is the recordings: the in-game sound is louder than the same sound recorded
alone (in-game / recorded RMS: SE_SELECT 1.22, SE_BALL_TRAY_BALL 1.45, SE_BALL_TRAY_EXIT 1.19, SE_EXIT 1.02; the battle BGM recording matches
the game at 0.995). A ball SE register-poked in battle reproduces the recording exactly, so the difference comes from the in-game call path
(the m4a mixer runs inside VBlankIntr; the in-game note keeps a stronger second frame and a later echo). **Not fixed**: re-recording the SEs
with in-game call timing is an asset job of its own.

## 4. Doorway sound (`src/engine/core.ts`)

ROM: EnterBattleRoom's warp plays DoWarp's PlaySE(SE_EXIT) (field_screen_effect.c:490) on every walk, first included (battle1-swapyes-b frame
484). The first-walk branch of core.ts had no emitter. Later walks were already right: the battle return at P+79 (aud241c) and the walk-in on
the warp fade's second frame; the in-game SE_EXIT matches its recording (1.02), so the "not quite right" later doors were the recording-level
point of section 3 at most. Test: `tests/snd1RoomSounds.test.ts` (live route, every sound of frames 301-2000 of the canonical trace on the ROM frame).

## 5. Delibird's Ice Ball

1. **The impact had no recording.** SE_M_BRICK_BREAK (198) was dropped as `missing`. Census: 53 of the 131 SE ids the move animations emit
   had no recording, 26 emitted pans only had one on the other side, 8 only a centred one (44 of the 623 SEs of Kyle's session were silent).
   187 tuples recorded (`tools/audio/snd1-extra-se.json`, the aud244a method; encoded as the extractors do, existing files untouched; method
   check: two existing SEs reproduce byte for byte). Not recorded: SE_M_BLIZZARD (153) and SE 132 at the left pans, which loop and need the
   aud244b loop pass. Test: `tests/snd1EmittedSesHaveAssets.test.ts`.
2. **The effectiveness SE drifted before the impact.** ROM `aud242q-iceball5`: SE_M_ICY_WIND, SE_M_BRICK_BREAK 30 frames later (ours too),
   the effectiveness SE the frame before each hit, 41 frames after the impact. Ours came 12 / 30 / 48 / 63 / 77 frames early on rolls 1-5
   (before the impact from roll 3): the lead-body anchor subtracted the lead rows of every earlier lead body of the presentation. It now starts
   with the hit (`src/engine/battleHitSounds.ts`): +1 / +1 / +1 / +4 / +8 (the last two are our hit's drift); the aud241b Seismic Toss windows stay
   exact; aud252's Hail residual -8 -> -1. Test: `tests/snd1IceBallSounds.test.ts`.

Kyle's log shows no critical hit on that Ice Ball; crits play no extra SE in the ROM's script, so there was nothing crit-specific to check.
