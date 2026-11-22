# tri1: each battle transition hands over to the battle intro at its own frame (2026-11-21)

Found by the frame catcher's new timing report (tdr1, `docs/tdr1-catcher-timing-report.md`): the gap MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER
was off in 27 of 28 battles, by -31 to +15 frames, 439 frames in all. Branch `claude/elastic-northcutt-5cbc37` from master `f09378446`.
Evidence (not in git): `.integration/evidence/tdr1/` (`base/` before, `tri1/` with this fix alone, `after/` with tri1 + wtl1 + sst1).

## In short

The battle music (MUS_VS_TRAINER) starts with the screen transition. On the ROM each of the 12 Frontier transitions takes its own time
before the battle intro starts, the same in every battle of a round. Ours took CIRCLES_MEET's time in a round's first battle and
ASYMMETRIC_SPIRAL_IN_SEQ's in the later ones, whatever transition played: those were the two transitions the room was first measured
on. In battles 2+ the transition pictures also showed 3 frames late against the music. Now the room runs the transition's clock from
the music, as the Factory Head's room already did, and hands over at each transition's own frame.

## ROM

### Source

- `src/battle_setup.c:2096-2099` (`DoSpecialTrainerBattle`'s Frontier case): `GetSpecialBattleTransition` draws the transition,
  `PlayMapChosenOrBattleBGM` starts the battle BGM and `BattleTransition_StartOnField` starts the transition on the same frame.
- `src/battle_transition.c` / `battle_transition_frontier.c`: each transition runs its own task length; `Task_BattleStart` installs
  `CB2_InitBattle` when the task is done. So the frames from the BGM to the battle intro depend on the transition, not on the battle.
- The engine already has these per-transition ends for the brain room (`brainBattleIntroHandoffTe`, trn225), measured with the BGM as
  the clock's anchor.

### Measured (frame catcher, 6 fresh traces, 28 battles, both scenes)

From MUS_VS_TRAINER, in frames (`intro.py` / `black.py`, scratch scripts over the catcher's frame stores):

| transition | battles | first picture change | screen black | battle intro's first picture | SE_BALL_TRAY_ENTER | ours before (battle 1 / later) |
|---|---|---|---|---|---|---|
| SQUARES | 1 | 2 | 141 | 180 | 333 | 359 / 374 |
| CIRCLES_SYMMETRIC_SPIRAL | 7 | 2 | 146 | 190 | 343 | 359 / 374 |
| LOGO_WIGGLE | 3 | 2 | 157 | 195 | 348 | 359 / 374 |
| CIRCLES_CROSS | 1 | 2 | 152 | 196 | 349 | 359 / 374 |
| CIRCLES_MEET | 4 | 2 | 162 | 206 | 359 | 359 / 374 |
| CIRCLES_CROSS_IN_SEQ | 3 | 2 | 165 | 209 | 362 | 359 / 374 |
| LOGO_WAVE | 3 | 2 | 168 | 213 | 366 | 360 / 375 |
| CIRCLES_MEET_IN_SEQ | 2 | 2 | 170 | 214 | 367 | 359 / 374 |
| SQUARES_SCROLL | 2 | 2 | 178 | 219 | 372 | 359 / 374 |
| CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ | 1 | 2 | 178 | 221 | 374 | 359 / 374 |
| CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ | 1 | 2 | 178 | 221 | 374 | 359 / 374 |

Every ROM row is the same in the round's first battle and in later ones. The battle intro's first picture comes 35 frames after the
handoff on both sides (36 after LOGO_WAVE, whose retained black callback the engine already models), and SE_BALL_TRAY_ENTER 153 frames
after that picture on both sides. So the handoff is the only difference: ours came at 171 frames after the BGM in battle 1 (CIRCLES_MEET's)
and 186 in battles 2+ (ASYMMETRIC_SPIRAL_IN_SEQ's).

The battle's random numbers follow the same clock on the ROM: its RNG at the first action menu is the transition draw's post-state
advanced 160 (SQUARES) to 200 (the IN_SEQ spirals) times, about 15 more than the BGM -> handoff frames, per transition (`rngdiff2.py` over
the catcher's "battle rng" set-up rows). The engine's battle RNG is not derived from the draw (the catcher writes the engine's value into
the ROM each battle), so that is not changed here (see Open).

## Change

`src/engine/battleRoom.ts`, `src/engine/core.ts` (presentation timing):

- `ordinaryBattleTransitionTe`: the ordinary room's transition clock is the settled elapsed less the draw frame
  (`ordinaryTransitionDrawElapsed`: 26 in the round's first battle, 23 later; the BGM plays there) plus the transition's start te (23 for
  ASYMMETRIC_SPIRAL_IN_SEQ, 26 for the rest, the clocks their constants were measured on). It drives the transition overlay and the room's
  fade. It is unchanged for the two pairs the room was measured on; in battles 2+ every other transition now shows 3 frames earlier.
- `ORDINARY_INTRO_HANDOFF_AFTER_BGM` / `ordinaryBattleIntroHandoffElapsed`: the handoff to the battle intro at the draw frame + the
  transition's frames from the table above less 35 (LOGO_WAVE 36). LOGO_WIGGLE (not drawn yet; the room's fallback picture stands in)
  has its own 160. These equal the brain room's `brainBattleIntroHandoffTe` less the start te for every transition the sweep and trn225
  both cover, except the two IN_SEQ spirals (1 frame earlier here) and LOGO_WAVE (5 earlier; trn225 left LOGO_WAVE's brain handoff on the
  ordinary room's old value). CIRCLES_ASYMMETRIC_SPIRAL, not in the baseline, takes CIRCLES_SYMMETRIC_SPIRAL's 155 (as the brain table);
  the run after the fix has it twice, both on the ROM's frames (343). Both core.ts handoffs (the round's first battle, later battles) use it; `BATTLE_SCENE_HANDOFF_ELAPSED` is gone.

- The canonical-recorded route (the canonical ROM traces' replay) keeps the old clock and handoffs (`perTransition` false): its battle 1
  was CIRCLES_MEET and its battle 2 ASYMMETRIC_SPIRAL_IN_SEQ on the ROM, the two the old values were measured on, but the engine's own
  draw for those inputs is ASYMMETRIC_SPIRAL_IN_SEQ in battle 1 (see Open), and its fixtures pin the ROM's ticks.

No kernel event, battle RNG or outcome moves. The overworld per-frame RNG runs through the transition until the battle starts, so it
now advances the ROM's count per transition, and a later battle can draw another transition than before (seed 3 Scene ON's battle 7:
CIRCLES_CROSS_IN_SEQ before, SQUARES_SCROLL after). The test player's presses follow the new timing, so fresh traces are other rounds.

## Merge with the box's night run (2026-11-22)

The box's trn226 (`docs/trn225-frontier-transitions.md`, ISSUES #225) drew LOGO_WIGGLE from source and started LOGO_WAVE's clock at te 32
(its flicker / main / handoff constants assume it), both in the Noland room; it left the ordinary room open. In the merge:
- the ordinary room takes trn226's start te per kind (`transitionStartTeOf`, shared with the brain room): LOGO_WAVE 32. That is this doc's
  "LOGO_WAVE starts 6 frames late"; its handoff stays 177 frames after the BGM, which is trn226's 209 on te 32;
- LOGO_WIGGLE is now drawn by trn226's renderer in the ordinary room too (the fallback picture is gone). Its handoff stays this branch's
  ordinary-room 160 frames after the BGM (the ROM's VS -> ball tray 348 in 3 catcher battles); trn226's Noland-room labs give the wiggle's
  end + 3, one frame later. The two IN_SEQ spirals differ from the brain table by the same frame. Not resolved here.

## Catcher, before / after

Six traces made with makeTrace on this branch (seeds 3, 44, 100 Scene ON `winning-coverage`; 5 and 2 Scene OFF `winning-swap`; 8 Scene OFF
`full`), remade after the fix (the old ones' presses no longer meet the menus).

| | before (`base/`, 28 battles) | after tri1 (`tri1/`, 30 battles) |
|---|---|---|
| MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER equal to the ROM | 1 of 28 (off -31 .. +15) | 30 of 30 |
| MUS_VS_TRAINER -> the battle intro's first picture equal | 1 of 28 | 30 of 30 |
| the transition's first change and black start equal | 3 of 28 (battles 2+: both 3 late) | 24 of 30 |
| this gap in the ranked list | 2nd, 439 frames | gone |

The 6 transitions still off are pictures of transitions trn225 left open: LOGO_WAVE starts 6 frames late (3 battles), LOGO_WIGGLE (not
drawn) goes black 3 frames late (2), SQUARES_SCROLL went black 2 frames late in one battle (its direction / BGM-lag case, trn225).

## Tests

`tests/tri1TransitionIntroHandoff.test.ts` (6): the clock starts at the transition's start te on the BGM frame in both rooms; the two
measured pairs keep 197 / 209 (and the no-transition fallbacks); every transition's handoff equals the ROM's frames above, the same in
battle 1 and later; agreement with the brain table where both are measured; ordinary play (the soak's player, seed 3 Scene ON and seed 2
Scene OFF, 4 battles each): MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER is the ROM's value for each battle's transition.

Re-pinned, each because the drawn transition now sets the intro's frame:
- `tests/aud241aBattleStartSounds.test.ts`: the seed-3 session draws CIRCLES_ASYMMETRIC_SPIRAL; its MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER is
  now 343, the ROM's for that transition (was 359, CIRCLES_MEET's, which the canonical trace in the same test still shows).
- `tests/snd1RoomSounds.test.ts`, `tests/factoryBattleStartIntro.test.ts` (the live route replaying the canonical battle-1 inputs): the replay
  now carries the recording's CIRCLES_MEET (`frontierTransitionPresentationForTableIndex(4)`) in place of the engine's draw, and every ROM
  sound / receipt of the window matches as before.

## Open

- **The engine's battle-1 draw for the canonical inputs** is CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ (table index 10, raw 49990) where the ROM
  recording drew CIRCLES_MEET (index 4): the room's per-frame RNG at the draw is not the recording's. Before tri1 the fixed handoff hid it
  (the timing was CIRCLES_MEET's whatever was drawn, the pictures the drawn one's). The catcher cannot see this: it writes the engine's
  transition into the ROM. Worth its own step (the room RNG before the draw), with the canonical traces as the ROM evidence.

- **The battle RNG at the first turn** does not follow the transition: on the ROM it is the transition draw advanced by the VBlanks of the
  transition and the battle start (160 to 200 per transition, measured above); the engine's comes from the facility's RNG plan. The
  catcher hides this by writing the engine's value into the ROM. A gameplay / RNG question for its own step.
- From the trainer's speech to the BGM ("SE_EXIT -> MUS_VS_TRAINER") the ROM is 3-5 frames later in most later battles. It crosses the
  speech's press, which makes no sound (`waitbuttonpress`), so the timing report cannot split it; not looked into.
- LOGO_WIGGLE's handoff: 160 here (ordinary room, catcher) against trn226's 161 (Noland room, labs); see the merge section.
