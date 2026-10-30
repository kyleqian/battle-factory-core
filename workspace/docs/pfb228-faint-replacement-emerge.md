# pfb228 -- Scene ON player faint-replacement send-in: why "path B" does not line up, and the wiring recipe (evidence only)

Step pfb228 (integration lane) is **evidence only: no `src/` or `tests/` change**. It answers ISSUES #146's Open line ("bso225 path B: fit the
pfr192 emerge route first") so the next run can draw the player back send-out animation on the forced (faint-replacement) send-in.

Short answer:

1. **There is no timing offset to fit.** The "ROM mon emerges -4..+3 ticks off" in `docs/bso225-player-back-send-out.md` ("Path B") is a
   measurement artifact: `bso225Dense.ts` (and `pfr192Dense.ts`) search an alignment `delta` in -4..+4 and every window picked **+4, the range
   boundary**, so the whole mon region was compared 4 ROM frames off. At `--delta=0` the confirm-relative clock is exact.
2. **The ROM's faint-replacement ball/release/emerge/back-animation is the path-A (mid-battle switch-in) timeline, translated by B.**
   With `B = 91 + len(name)` (the pfr192 ball clock) and `A = e - B` (CASTFORM `A = e - B - 1`), all 8 ROM windows have the same schedule
   as `midBattleSwitchInAt` (A: ball arc 3..44, release 46, mon visible 48, emerge scale 58 -> 256 at 59, tint hold, Anim_* callback 63,
   reducer tick 0 at 66, healthbox slide 66). No lag frame, no species/cry-keyed extra delay beyond B + the CASTFORM +1 that pfr192 already has.
3. Production draws that window with the **generic MAGBY-calibrated release** (`renderBattleResolutionForcedPartySelect`, non-canonical
   branch: `drawPlayerSideAffineMaterialize` + `drawSpriteSheet` + `drawCleanSwitchinParticles`): same start ticks, wrong content (no mon tint
   fade, no bg fade, no back animation, MAGBY ball arc and particle origin, path-B healthbox).
4. Routing the window through the existing path-A pipeline, plus a species-keyed ball arc and particle origin (both derivable from the mon sprite
   y), is predicted to take the Scene ON player-half residual from **110-325k px per window to 16 - 2079 px** (all 7 renderable windows).

## Method

- ROM: `tools/integration/pfb228RomFrames.sh` -> `pfb228Frames.py` (pfr192Frames + per-frame RAM of `gBattlerSpriteIds[0]`'s sprite and all non-healthbox
  sprites), lab scenario `tools/battle-lab/playerfaint-slot2-sunnyday.json` with player[1] overridden, Scene ON, direct mGBA via `run-mgba-probe.py`.
  Raw 240x160 frames are dumped from the SEND OUT press (confirm frame) on; rows are keyed by `e` = frames since that press.
- 8 windows (different species / back families / nick lengths): SKARMORY (JOLT_RIGHT), ALAKAZAM (GROW_STUTTER), ONIX (V_SHAKE), ENTEI
  (SHAKE_GLOW_RED), SHEDINJA (SHRINK_GROW_VIBRATE, genderless), KINGDRA (SHAKE_GLOW_BLUE), CASTFORM (CONVEX_DOUBLE_ARC), MEW (CONCAVE_ARC_SMALL,
  genderless; ROM schedule only -- our engine has no player battle pic for MEW and throws in `fieldArtBattler`, so MEW has no pixel comparison).
  All nature 6 except MEW 12.
- Ours: `tools/integration/bso225Dense.ts` (pfr192 forced-select harness) at `--delta=0`; "predicted" = `tools/integration/pfb228Proto.ts`
  (see "Prototype"). Mon region = x < 120, 48 <= y < 112 (ball, mon, particles, bg fade); phb = x >= 120 (healthbox).
- Tools: `pfb228Analyze.py` (per-window schedule from RAM rows), `pfb228Ball.py` (ball arc per window + a Python simulation of
  `SpriteCB_PlayerMonSendOut_1/_2`), `pfb228Segments.py` (per-segment residual), `pfb228Strip.py` (PNG strips).

## ROM schedule, relative to B (all windows)

`B` = confirm-relative `e` of `Task_DoPokeballSendOutAnim`'s creation = **91 + len(name)** (SKARMORY/ALAKAZAM/SHEDINJA/CASTFORM 99, KINGDRA 98,
ENTEI 96, ONIX 95, MEW 94). `schedule-per-window.txt` has every window; they are identical in `e - B` except CASTFORM (+1 throughout):

| Event (RAM row `e - B`) | all windows | CASTFORM |
|---|---|---|
| ball task created / ball arc callback (`SpriteCB_PlayerMonSendOut_2`) first row | 0 / 1 | 0 / 2 |
| ball lands: `HandleBallAnimEnd`, `ReleaseMonFromBall`, particle task, `Task_FadeMon_ToNormal`, cry task start | 47 | 48 |
| mon `invisible` clears, y2 = 14 (rendered one frame later) | 48 | 49 |
| emerge scale 40 -> 256 (+18/tick) | 47..59 (40, 58, ..., 256) | +1 |
| `SpriteCB_PlayerMonFromBall` -> `Anim_<family>` (`Task_HandleMonAnimation`) | 63 | 64 |
| first x2 / y2 of the animation body (e.g. JOLT_RIGHT x2 -1) | 66 | 67 |
| `Task_FadeMon_ToNormal_Step` | 69 | 70 |
| `WaitAnimEnd` (family dependent: JOLT_RIGHT 95, GROW_STUTTER 96, V_SHAKE 104) | -- | -- |

So the ball clock is B (already keyed in pfr192 as `ballShift = B - 96`), and **A (the path-A `switch-in` elapsed) = e - B - releaseExtra**,
i.e. `partySendOutReleaseClock(e, timing) - 96`. That is also how the generic branch is already clocked (ball visible at release clock 99 = B + 3,
mon at `PARTY_SENDOUT_RELEASE_VISIBLE_START` 145 = B + 49), so ours and the ROM start the ball, release and emerge on the **same ticks** in every
window; there is no constant shift, lag frame or species/cry delay between them (cry/species keys only move B and the prompt).

### RAM probe of `gBattlerSpriteIds[0]`'s sprite (2 windows, full rows in `rom/*-on.json`, `b[0]`)

`palette` = the mon's 16 `gPlttBufferFaded` words: `tint` = the all-7adf release tint, `plain` = the unfaded palette.

SKARMORY (B = 99, monY 84):

| e-B | inv | x2,y2 | callback | affEnded | xScale,yScale | palette |
|---|---|---|---|---|---|---|
| 46 | 1 | 0,0 | SpriteCallbackDummy | 1 | 256,256 | plain |
| 47 | 1 | 0,0 | SpriteCB_PlayerMonFromBall | 0 | 40,40 | tint |
| 48 | 0 | 0,14 | SpriteCB_PlayerMonFromBall | 0 | 58,58 | tint |
| 55 | 0 | 0,7 | SpriteCB_PlayerMonFromBall | 0 | 184,184 | tint |
| 59 | 0 | 0,2 | SpriteCB_PlayerMonFromBall | 0 | 256,256 | tint |
| 62 | 0 | 0,0 | SpriteCB_PlayerMonFromBall | 1 | 256,256 | tint |
| 63 | 0 | 0,0 | Anim_JoltRight | 1 | 256,256 | tint |
| 65 | 0 | 0,0 | JoltRight | 0 | 256,256 | tint |
| 66 | 0 | -1,0 | JoltRight | 0 | 256,256 | tint |
| 70 | 0 | -5,0 | JoltRight | 0 | 256,256 | tint |
| 72 | 0 | -7,0 | JoltRight | 0 | 256,256 | fading (72de7aff...) |
| 80 | 0 | 8,0 | JoltRight_2 | 0 | 256,256 | fading |
| 88 | 0 | 8,0 | JoltRight_2 | 0 | 256,256 | plain |
| 95 | 0 | 0,0 | WaitAnimEnd | 0 | 256,256 | plain |

ENTEI (B = 96, monY 86): same rows 46..64 (emerge scale and y2 identical); `Anim_ShakeGlowRed` from 63 stays the callback for the whole window
(`affEnded` 1, x2 = y2 = 0 -- the body is palette only); palette: tint to 64, plain 65..68, one glow frame 69 (`4ef977bf...`), tint again 70,
then the fade 71..~88 and the glow ramp (`35fb4e7f` at 88, `299c3dff` at 95). Species animation x2/y2 steps match `backSendOutFrameAtTick`
(bso225), checked here only through the pixel residual below (0 from B + 89).

### The ball arc is species-keyed (and exactly reproducible)

`SpriteCB_PlayerMonSendOut_1` sets `data[4] = GetBattlerSpriteCoord(Y_PIC_OFFSET) + 24`, which is the mon sprite's `y + 32`
(`y` = 80 + back-pic y offset = `fieldArt.player.origin.y + 32` in our art view: SKARMORY 84, ALAKAZAM 85, ONIX/CASTFORM 80, ENTEI/SHEDINJA/KINGDRA 86, MEW 88).
`InitAnimLinearTranslation` then gives `stepX = (48 << 8) / 25 & ~1 = 490` and `stepY = ((monY - 36) << 8) / 25 & ~1`:
490 / 500 / 450 / 512 / 512 / 512 / 450 / 532 -- every window matches the RAM `data[2]` of the ball sprite (`ball-arc-per-window.txt`).
`pfb228Ball.py` simulates `SpriteCB_PlayerMonSendOut_2` (linear translate + horizontal arc, amplitude -30, the data[7] 35..80 slow zone) and
reproduces the ROM's (x2, y2) sequence with **0 mismatching ticks in all 8 windows**.
The path-A table `MID_BATTLE_SWITCH_BALL_THROW_TABLE` is exactly the monY 93 arc (1 tick of mismatch at table[0]); it was fitted on one species.
The ball lands at (72, 68 + final y2) and the open-particle burst spawns at **(72, 63 + final y2)** (RAM spawn rows: SKARMORY 113, ALAKAZAM 114,
ONIX 110, ENTEI 116, MEW 118 = 63 + 50, 51, 47, 53, 55). Path A's send-in particle origin is the fixed `{ x: 68, y: 119 }` (monY 93: 4 + 119 = 123 = 63 + 60).

## Ours vs ROM at the true alignment (`--delta=0`), mon px (e > 90)

| Window | B | Back family | before (now) | path-A pipeline | + species ball arc | + species particle origin (predicted) | residual |
|---|---|---|---|---|---|---|---|
| SKARMORY | 99 | JOLT_RIGHT | 110236 | 8935 | 3050 | **74** | ball row B+45 (49), 5 px particle edges |
| ALAKAZAM | 99 | GROW_STUTTER | 129564 | 8672 | 3050 | **33** | ball row B+45 (26), 7 px |
| ONIX | 95 | V_SHAKE | 124807 | 10728 | 4030 | **272** | ball rows B+45/46 (100), particle/tail 12 rows <= 26 px |
| ENTEI | 96 | SHAKE_GLOW_RED | 324706 | 9826 | 4845 | **2079** | B+69 glow lag frame 2063, ball row 16 |
| SHEDINJA | 99 | SHRINK_GROW_VIBRATE | 120589 | 7639 | 2658 | **16** | ball row B+45 (16); healthbox 4170 (see below) |
| KINGDRA | 98 | SHAKE_GLOW_BLUE | 263209 | 9134 | 4153 | **1493** | B+69 glow lag frame 1477, ball row 16 |
| CASTFORM | 99 | CONVEX_DOUBLE_ARC | 153995 | -- | 3979 | **278** | ball row 83, particle/tail 13 rows <= 26 px |

("before" is the production `renderBattleResolutionForcedPartySelect` route; "path-A pipeline" = the same frames drawn by the existing
`midBattleSwitchInAt` route with its fixed monY 93 ball table and particle origin; the next two columns apply the species-keyed ball arc and
particle origin.) Segment split of "before" (`summary.json`): ball flight B+1..46 4.3-6.4k, emerge B+47..62 9.6-12.4k, back animation
B+63..95 94-113k, tail B+96.. up to 210k (ENTEI/KINGDRA/CASTFORM glow / long families).
- The **healthbox** (x >= 120 region) also improves: 47777 -> 0 px (e > 90) in every window but SHEDINJA (51947 -> 4170; the genderless
  SHEDINJA healthbox row differs, unrelated to this wiring, left as is: separate open item).
- The ENTEI / KINGDRA B+69 frames are bso225's known "palette lag frame" (the ROM's glow `BlendPalette` steps one tick before the reducer).
  Nothing else remains inside the back animation: **exact from B + 89 in every window** (as bso225 measured for path A: "exact from e = 88").
- Strips (ours | ROM | diff, mon region at B+20, +52, +62, +75, +90): `tools/integration/fixtures/faint-replacement-send-in/<window>-before-...png`
  and `<window>-predicted-...png` (SKARMORY, ONIX, ENTEI, CASTFORM). The "predicted" diff panels are dark (zero) except the sparkle edges.

## Why bso225's attempt failed (the artifact)

`bso225Dense.ts` / `pfr192Dense.ts` pick the alignment `delta` in [-4, 4] minimising the field-return rows (e = 56..135). On the
`*-dense-after.json` runs every window reports `delta: 4`: the boundary, i.e. the search never found a minimum. The mon-region residual was then
inflated by a 4-frame misalignment, the per-frame "best offset -4..+3" (the `--lag` option) wandered, and wiring the back animation at
`releaseTick - 17` regressed ALAKAZAM. Use `--delta=0` (the confirm press is the shared origin; ROM raw frame = confirm + e).

## Fix recipe (next run; not applied here)

Everything below is a **change to the forced-select / `switch-in` render route only**; no timing constant changes (pfr192's `B + D + 17`
prompt clock, `ballShift`, `releaseExtra` stay).

1. **Anchor.** For a Scene ON, non-MAGBY (`!canonicalIncoming`) player forced switch-in, the path-A `switch-in` elapsed is
   `A = partySendOutReleaseClock(elapsed, view.switchIn.timing) - 96` (= `e - B - releaseExtra`; 96 = `MAGBY_SEND_IN_BALL_SPAWN`).
   In `createBattleResolutionPresentationRenderView`'s `switch-in` branch (`battleResolutionPresentationRender.ts` ~2118-2140) the forced
   player command already carries `sendInVisualDelay`; for Scene ON the faint-replacement command needs `sendInVisualDelay = B + releaseExtra`
   (`= timing.ballShift + 96 + timing.releaseExtra`) so `sendInElapsed = phaseElapsed - visualDelay` is `A`. `midBattleSwitchInAt` already
   returns `null` ball / invisible mon for `A < 3`, and with `backAnimMon` set (bso225) the back animation's tick 0 lands on `A = 66` = **`e = B + 66`
   (CASTFORM B + 67)**: ROM `Anim_*` callback at B+63, first body x2 at B+66 (verified by exact pixels from B+89 in 7 windows).
   The healthbox slide keeps path A's default `healthboxSlideElapsed` 66 (`phb` residual 0).
2. **Renderer.** In `renderBattleResolutionForcedPartySelect`'s non-canonical branch, once `releaseClock - 96 >= 0` (A >= 0, B + 1 on), draw the
   path-A composition instead of `drawTurn15ForcedSwitchBall` + the `releaseTick <= 16 / drawSpriteSheet / drawCleanSwitchinParticles` split:
   the live-view mon/ball/particles/bg-fade/tint-fade layers of `renderBattleResolutionLiveView` with `view.midBattleSwitchIn`,
   `midBattleSwitchFade`, `midBattleSwitchParticles` (the prototype draws the whole frame with `renderBattleResolutionLiveView`; the real branch
   must keep the forced selector's own message ("Go! X!") / party-summary tray / `partySendOutBattleFadeBldy` handling, all of which are
   already 0-residual before B + 1 and in the msg region after).
3. **Ball table: species-keyed.** Replace the fixed `MID_BATTLE_SWITCH_BALL_THROW_TABLE` (x2, y2) with an arc generated from the incoming mon's
   sprite y: `monY = fieldArt.player.origin.y + 32`; `stepX = 490`, `stepY = ((monY - 36) << 8) / 25 & ~1`; table[0] = (0,0),
   table[t] = arc[t-1] where arc is `pfb228Ball.py ball_arc(monY)` (port of `SpriteCB_PlayerMonSendOut_2`; reference implementation validated on 8 windows;
   the pa/pb/pc/pd rotation entries do not depend on monY and stay). monY 93 reproduces today's table, so MAGBY / the voluntary switch-in does not change.
4. **Particle origin: species-keyed.** `drawMidBattleSwitchBallOpenParticles` (`battleScene.ts` ~7371) send-in origin `{ x: 68, y: 119 }`
   becomes `y = arcFinalY2 + 59` (= 63 + final y2 - 4, the ROM spawn y minus the 4 px tile half; monY 93 -> 119, unchanged for path A).
5. Leave `MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED` (66), the emerge / tint / fade tables and the reducers untouched.

**Predicted residual after wiring** (mon region, e > 90, delta 0): SKARMORY 74, ALAKAZAM 33, ONIX 272, SHEDINJA 16, CASTFORM 278 px (ball landing
row + sparkle edges), ENTEI 2079 and KINGDRA 1493 (the single known glow-palette lag frame at B + 69); healthbox 0 (SHEDINJA 4170 from an unrelated healthbox
difference); exact from B + 89 on in every window. The wired route must be re-measured (the prediction is a harness composition, not the
production branch: it replaces whole frames from B + 1 and mutates the ball table / particle origin through a scratch patch).

## Prototype (scratch, nothing committed in `src/`)

- `tools/integration/pfb228Proto.ts <rom-dir> <id> on <out.json> --delta=0 --proto=<shift> [--ballArc=<arc.json>]`: bso225Dense with the
  window `e >= B + 1` drawn by `renderBattleResolutionLiveView` at `phaseElapsed = e - B - shift` (shift 1 for CASTFORM), and
  `MID_BATTLE_SWITCH_BALL_THROW_TABLE` rewritten in place from `pfb228Ball.py --arc <monY>`; prints `fieldArt.player.origin`. Runs against
  unmodified `src/`; gives the "path-A pipeline" and "+ ball arc" columns.
- The "+ particle origin" column needs a one-line scratch edit of `drawMidBattleSwitchBallOpenParticles` (`y: Number(process.env.PFB_PY ?? 119)`,
  `scratch-particle-origin.patch` in the evidence dir), run from a scratch copy of `src/` (`/tmp/pfb228scratch`, `PFB_PY = arcFinalY2 + 59`).
- Reproduce: `sh tools/integration/pfb228RomFrames.sh <dir> skarmory=227:6 ...` (`id=species:nature[:female|genderless]`, `PFB228_SCENES=on`),
  then `pfb228Analyze.py`, `pfb228Ball.py`, `bso225Dense.ts --delta=0`, `pfb228Proto.ts`, `pfb228Segments.py`.

## Evidence

`/srv/pokebench/pokeemerald-factory-core/workspace/.integration/validation/sv-20261029/pfb228-evidence/`: ROM probe JSON + lab scenarios for the 8
windows (`rom/`; raw frame dumps are 34-44 MB each, only their SHA-256 are kept in `rom-raw.sha256`), ours-before / predicted dense results,
generated arcs, `summary.json`, the scratch patch, schedule and ball-arc listings, the strips.

## Other findings (not fixed here)

- MEW has no player battle pic in our engine (`createBattleCommandFieldArtView` throws "missing player battle pic for SPECIES_MEW").
- SHEDINJA's forced-send-in healthbox differs from the ROM by 4170 px even after the wiring (genderless healthbox row).
- `bso225Dense.ts`'s auto `delta` search is range-bounded at +4 (see above); the other pfr192/bso225 harnesses that copy it have the same flaw.
