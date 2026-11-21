# sfa2: every summary front animation, checked on the ROM (2026-11-21)

Kyle looked at GRAVELER, LUVDISC and POLIWHIRL on the summary screen of the live site and said they "fidget a little", not the
animations he remembers. sfa214 (`7f9d09254`, 2026-10-27) had transcribed 20 of the 62 motion callbacks the Battle Frontier species
use. The other 137 species (42 motion types, GRAVELER, LUVDISC, POLIWHIRL and GROWLITHE among them) got an "approximate-static" fallback:
the two-frame picture program ran and the sprite never moved. Branch `fix/summary-front-anims` from master `5fbac1476`. Evidence (not
in git): `.integration/evidence/sfa2/`.

## In short

- All 62 motion callbacks are transcribed from `pokemon_animation.c` as per-call state machines: x2 / y2, data[0..7], the shared
  `sAnims` slot, the affine matrix with rotation (mGBA's HLE ObjAffineSet), invisibility (FLICKER_INCREASING) and the palette blend
  (GLOW_*, FLASH_YELLOW). No species is on the fallback now.
- A new mGBA probe records the summary sprite of all 376 species on the ROM, frame by frame. Against it, from the motion's dispatch on,
  ours matches the sprite state of all 378 recorded stretches (376 species, 2 repeats) in every picture: x2, y2, OAM matrix, frame,
  invisibility, blended colours. Rendered through the Info page, 377 of 378 match pixel for pixel; UNOWN differs only in its letter (see
  Open).
- The probe found three slips in sfa214's 239 species. 121 of them were wrong and are fixed (below).
- Two picture fixes on the same screen: the portrait is now drawn above the BG0 text windows, because OBJ priority 0 beats BG0. A motion
  that lifts it over "No." or the name used to be cut by the text. SPINDA's summary picture now carries its personality's spots.
- GROWLITHE's "empty box" (Kyle's battle, catcher finding #1) was GROWLITHE's own animation (BACK_AND_LUNGE, one of the 137). The ROM
  showed the lunge and tilt, and ours never moved. It is gone on this branch.
- Still open: the frame the animation starts on. The ROM's mon change sometimes takes a frame or two longer (a lag frame that depends on
  CPU load). Measured below, not changed.

## ROM

### Source

- `src/pokemon_summary_screen.c:3975-3992` CreateMonSprite: sprite at (40, 64), `oam.priority = 0`, data[0] = species, data[2] = 0,
  hFlip = !IsMonSpriteNotFlipped. `:3994-4004` SpriteCB_Pokemon: once `!gPaletteFade.active && data[2] != 1`, it sets data[1] (sDontFlip)
  = IsMonSpriteNotFlipped, plays the cry and calls PokemonSummaryDoMonAnimation. `:1627-1694` Task_ChangeSummaryMon: case 1 destroys the
  old sprite, case 8 creates the new one with data[2] = 1, and case 12 sets data[2] = 0, so the next AnimateSprites dispatches.
- `src/pokemon.c:6858-6877` PokemonSummaryDoMonAnimation: `StartSpriteAnim(sprite, 1)` first, then StartMonSummaryAnimation or, for a
  species with a delay, Task_PokemonSummaryAnimateAfterDelay (`:6793-6801`). That task counts down in RunTasks, before the same frame's
  AnimateSprites.
- `src/pokemon_animation.c:949-954` StartMonSummaryAnimation (sIsSummaryAnim TRUE). `:1003-1035` HandleStartAffineAnim (double-size,
  `StartSpriteAffineAnim(sprite, !sDontFlip)`, affineAnimPaused), HandleSetAffineData (xScale and rotation negated when sDontFlip is
  FALSE) and TryFlipX. `:1061-1085` ResetSpriteAfterAnim (summary branch: affine off, hFlip back). The 62 callbacks are at
  `:1087-3870`; `:5540-5544` is WaitAnimEnd.
- `src/sprite.c:308-322` AnimateSprites runs the callback, then AnimateSprite. On the frame HandleStartAffineAnim ran, BeginAffineAnim
  (`:1067`) overwrites the callback's matrix with sMonAffineAnims[0 / 1], the identity or its flip. `:1094-1097` a paused affine anim
  writes nothing after that.
- `src/pokemon_summary_screen.c:1154-1168` MainCB2 (RunTasks, AnimateSprites, BuildOamBuffer) and VBlank (LoadOam, sprite copies,
  TransferPlttBuffer), so the picture of frame f shows the state built in frame f - 1. `:319-357` BG0 has priority 0, the same as the
  portrait OBJ, and an OBJ wins against a BG of equal priority.
- `src/util.c:264` BlendPalette (GlowColor, Anim_FlashYellow).

### Measured

The probe is `tools/probe/sfa2-summary-front-anim-rom.py`, mGBA in process, Battle Scene OFF snapshot. It uses the frame catcher's
draft staging: the six set ids are written to rentalMons, the select screen is entered again, and its six are re-stored with the plan's
personality (nature + 25) and OT id 0. Then A on the first ball, A on SUMMARY, and DOWN once each rental's sprite callback has become
SpriteCallbackDummy. The plan (`tools/probe/sfa2SummaryFrontAnim.mjs plan`) is 63 batches of six. Each batch opens on a different motion
type, so all 62 types are seen on the initial path, and the other 314 species on the replacement path. Every frame records the mon
sprite's struct, its gOamMatrices entry, its OBJ colours, the hardware OAM entry and a 112 x 128 crop of the picture. In all: 41,262
sprite frames, 16,624 affine (7,393 rotated), 1,965 blended, 110 invisible. In every frame where the mon sprite exists (38,924), the
hardware OAM read after frame j holds the struct and matrix of frame j - 1.

| | ours before (master) | ours now |
|---|---|---|
| sprite state per picture from dispatch (`… states`), stretches exact | 120 / 378 | 378 / 378 |
| motion types with every species exact | 2 of 62 (RAPID_H_HOPS, SHRINK_GROW) | 62 of 62 |
| Info page render against the ROM crop, e >= 1 (`… pixels`), stretches exact | not run | 377 / 378 (32,856 pictures) |
| whole FactorySession replay with the ROM's presses (`… engine` + `… compare`), stretches where the ROM dispatches on our frame | | 134 / 135 (UNOWN's letter); the other 243 are one frame off from the dispatch lag below |

The state rule the receipts confirm for every species is this. e = 0 is the picture that shows the dispatch frame. Motion call k shows
at e = k + 2, or at e = delay + k + 1 for a species with a delay. The frame program shows at e - 1 from dispatch, whatever the delay.

How sfa214's 239 species compared (the `--game` run of `… states` on a master copy):

| | species | what was wrong |
|---|---|---|
| exact | 118 | (RAPID_H_HOPS and SHRINK_GROW in full; most of V_SQUISH_AND_BOUNCE(_SLOW), V_STRETCH, H_STRETCH, GROW_VIBRATE) |
| one picture early | 85 | every undelayed species of the 12 offset-only types (H_JUMPS, H_SHAKE(_SLOW), H_SLIDE(_SLOW), H_VIBRATE, V_JUMPS_BIG / _SMALL, V_JUMPS_H_JUMPS, V_SHAKE, V_SLIDE(_SLOW)): sfa214 showed call k at e = k + 1, from an unchecked "+1 for x2/y2, +2 for affine" rule; the ROM shows every motion at k + 2 |
| first affine picture | 6 | CIRCULAR_STRETCH_TWICE: call 0 writes (256, 288), but BeginAffineAnim's identity is what shows |
| delayed species | 30 | the frame program was started `delay` frames late (the ROM starts it at dispatch); the delayed affine ones also showed the motion one picture late |

The pixel run found one more slip, in the renderer. With the new states it first matched 278 of 378 stretches. Most of the others are
where a motion lifts the portrait over the "No." or name windows (GRAVELER, KINGLER, VENOMOTH, ...), because ours drew BG0's text over
the sprite. With the portrait drawn last, 376 matched. SPINDA's spots then made 377. UNOWN is left (Open).

Examples (picture e from dispatch, replacement path; values from the receipts):
- GRAVELER (BOUNCE_ROTATE_TO_SIDES_SMALL): e 10: x2 -8, matrix (-251, 49, 49, 251). e 23: x2 8, matrix (-251, -49, -49, 251).
- LUVDISC (H_SLIDE_WOBBLE): e 13: x2 -5, matrix (-243, -80, -80, 243). e 27: x2 -8, identity flip.
- POLIWHIRL (H_JUMPS_V_STRETCH, delay 5, not flipped): e 26: x2 -7, y2 8, (224, 0, 0, 320). e 41: x2 1, y2 -20, (288, 0, 0, 193).
  e 79: finished.
- GROWLITHE (BACK_AND_LUNGE, delay 30): e 31 goes affine. e 32-39: x2 walks back to -8. e 43-59: the lunge with up to 37/256 of tilt.
  e 64: finished.

### Dispatch frame (not changed)

Over the draft summary the ROM's dispatch frame, counted from the press, is not fixed. `--down-after N` pressed DOWN N frames into each
rental instead of after its animation, and `--page N` ran the mon changes on another page:

| | ROM | ours |
|---|---|---|
| initial (A on SUMMARY to dispatch) | 63 (59 species), 62 (RALTS, PICHU, SPINARAK, DITTO) | 63 |
| Info, DOWN after the animation / after 40 / after 120 | 21 (239 / 259 / 236 of 315), 20 (76 / 56 / 79) | 20 |
| Skills | 21 (198), 22 (74), 20 (43) | 20 |
| Battle Moves | 22 (197), 21 (102), 20 (16) | 21 |
| Contest Moves | 22 (194), 21 (108), 20 (13) | 22 (21 for RAPID_H_HOPS) |

The same pair of species gets 20 in one run and 21 in another (55 of 315 pairs moved between the three Info runs). So this is a lag frame
whose timing depends on CPU load (the decompression and the page text in Task_ChangeSummaryMon, the cry), not a property of the
species. The existing oracle traces press DOWN early, on 20 / 20 / 21 / 22, and pass. A trace whose press lands on another phase starts
the whole animation one or two frames off. Ours stays exact relative to its own dispatch. ISSUES #188 (b), `summary-info-quilava-v-stretch`
48 / 91 ("the whole replacement animation shows one render later in the ROM"), is this case; it is 48 / 91 on master and here.

## Change

- `src/engine/summaryFrontAnimation.ts`, rewritten:
  - The 62 Anim_* entries and their steady callbacks are transcribed in source order. C integer semantics apply (s16 / u16 / u8
    wraps, truncating division), with `sAnims` / AddNewAnim, gSineTable bounds (an index outside the table throws), HandleStartAffineAnim
    with the BeginAffineAnim overwrite, HandleSetAffineData's flip, ResetSpriteAfterAnim, the HLE ObjAffineSet, BlendPalette and
    invisible.
  - It is keyed by the extracted callback name. The data file is unchanged.
  - The presentation now gives `matrix` (pa, pb, pc, pd, flip included) in place of `{ xScale, yScale }`, plus `invisible` and `blend`.
  - The start rule above replaces the per-motion +1 / +2 offsets and the delayed frame program.
  - `SUMMARY_FRONT_IMPLEMENTED_MOTIONS` is derived (62). "approximate-static" is left only for a species outside the data.
- `src/engine/summaryInfoPage.ts`:
  - The portrait is drawn with the full matrix and the blended palette, and skipped while invisible.
  - It is drawn last (OBJ priority 0 over BG0's windows).
  - SPINDA's picture gets `spindaSpottedTileset(personality)` (spd1's rule), cached per personality.
- No gameplay, RNG, input or timing change. The start clocks (5, 0, the Moves-page delays) are untouched, and so is the exit freeze:
  StopPokemonAnimations keeps the pose. Two new oracle traces check that freeze mid-motion, ONIX mid-hop 55 / 55 and MAGBY mid-squish
  54 / 54 (`.integration/evidence/sfa2/traces/`).

## Tests

- `tests/sfa2SummaryFrontAnimRom.test.ts` (new, 66 tests) reads `tests/fixtures/sfa2-summary-front-anim-rom.json` (182 KB, written by
  `tools/probe/sfa2SummaryFrontAnim.mjs fixture` from the receipts). For each of the 62 motion types, one species (the batch opener,
  initial path) is pinned picture by picture until two pictures after its sprite settled. Every one of the 376 species is pinned by a
  sha256 of its whole sequence. One more test checks that no species is approximate, and one pins GRAVELER / LUVDISC / POLIWHIRL values.
  Master's model matches only 120 of the 378 receipts (the states run above).
- `tests/summaryFrontAnimation.test.ts`: `matrix` replaces `affine`. MAGBY's first affine picture is the flipped identity (-256, 0, 0,
  256). The frame program test starts at dispatch.
- `tests/summaryAllFactorySpecies.test.ts`: the approximate-species test now asserts there are none (62 motions). The hand-derived golden
  pins (V_SHAKE / V_STRETCH / H_SHAKE "visible at k + 1") are removed; the ROM pins replace them.
- Gates:
  - `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean.
  - The full suite (`npm test`, forks): 1,930 files / 16,718 tests passed, 0 failed (44 files / 243 tests skipped).
  - Tier 2, all 22 summary traces: the same on master and on this branch. 19 match in full (summary-info-onix 122 / 122,
    magby-front-animation 201 / 201, mon-down 54 / 54, mon-down-up 87 / 87, battle- / contest-moves-mon-down-up 80 / 80, ...). Three
    mismatch wholesale on both (battle1-swap-player-summary-return, factory-round-battle6-lukas-status-summary-message-off,
    sum259-swap-summary-mon-change). Two quilava-v-stretch traces are 48 / 91 on both.

## Catcher before / after (Kyle's battle, `kyle1121.json`)

`KEEP=1 tools/frame-catcher/run.sh` on master (`5fbac1476`, `GAME=` a `git archive` copy) and on this branch, about 35 s each
(`.integration/evidence/sfa2/catcher/`). The trace was played on the site's build, so both replays drift from Kyle's actual round in
the same way; the comparison is between the two replays. Master still has finding #1: "ROM only: 910 px at x9 y44 60x43", 85 frames in 7
summary stretches. Ours never showed GROWLITHE's lunge; the report's "ours" picture is just the nearest frame of ours, a mon-change frame
with the box empty. On the branch it is gone. Left at the box: "ROM only 516 px, 5 frames in 3 stretches" plus the VOLTORB pair (#6 / #7,
15 frames). Measured on the in-battle Skills page, the ROM's motion starts 2 frames after ours on all 7 mon changes, while the box goes
empty (+3) and the new portrait appears (+16) on the same frame on both sides. This is the dispatch lag above, here a steady +22 against
our +20.

## Open

- **The dispatch frame.** The lag is measured above, and in battle on the Skills page it showed +22 against our +20 on all 7 changes.
  Matching it would mean modelling the CPU load of the mon change (pic decompression, the page's text, the cry) or a measured rule in the
  faithful-timing sense. It was not attempted, and the existing traces pin the current values.
- **UNOWN's letter.** The summary always draws UNOWN A. The ROM draws the personality's letter (GetUnownLetterByPersonality in
  LoadSpecialPokePic); for personality 25 that is not A. The motion matches (ZIGZAG_FAST, state-exact). Only the picture differs. Battle
  pictures were not checked for this.
- Not covered by the probe: the in-battle summary's initial open (from the party menu). It uses the same callbacks, but its dispatch
  frame was not measured. Pages other than Info were measured for dispatch only. An overlap with other OBJs (markings at priority 1, the
  ball at 3) is drawn in that order and was not seen in the 378 stretches. Battle Scene ON uses the same summary and was not run.
- After `ResetSpriteAfterAnim`, LUNGE_GROW / CIRCLE_INTO_BG / GROW_IN_STAGES / TUMBLING_FRONT_FLIP still write a matrix to the freed
  slot, which has no visible effect on the portrait. ROTATE_TO_SIDES_TWICE (SOLROCK) calls HandleStartAffineAnim again for its second
  run, and InitSpriteAffineAnim allocates a second OAM matrix without freeing the first. The ROM leaks one matrix per SOLROCK view
  until the screen is left. The leak is not modelled (it would matter only if the 32 matrices ran out).
