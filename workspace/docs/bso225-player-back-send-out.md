# bso225: the player's back send-out animation in Battle Scene ON

Finish plan Phase 2; ISSUES #146 ("Open" first line) and #71.

## Scout findings (before this step)

Three player send-in paths draw the player's back sprite in Scene ON. Before bso225 **none** of them played the per-species
`BattleAnimateBackSprite` animation; all drew the static back sprite.

| Path | Where | Status after bso225 |
|---|---|---|
| A. Mid-battle `switch-in` command (voluntary switch and forced Roar/Whirlwind "dragged out!") | `midBattleSwitchInAt` -> `drawMidBattleSwitchInSprite` (view `elapsed` = the command's `phaseElapsed`) | **Draws the back animation**, ROM-fitted (below). |
| B. Faint-replacement send-in (party-select clock, `PartySendOutTiming`, pfr192) | `switchIn` view + party-select release branch (`releaseTick`) | **Not wired** (not provable, below). Draws the static back sprite as before. |
| C. Battle-start PLAYER materialize (`drawGeneratedPlayerMaterialize`, canonical ticks 1653+) | `battleScene.ts` generated-intro path | **Not wired**; separate path (a canonical-tick replay, not a `switch-in` command). Static back sprite as before. |

The battle-start player send-out is separate from the mid-battle `switch-in` command: it is not driven by the command's
`phaseElapsed`, so A's wiring does not reach it. The opponent send-ins (fra151) are out of scope and untouched.

Scene mode comes from `segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS`. A segment without
`beforeRules` (null/undefined) or with the no-animations marker gets no back animation: Scene OFF is byte-identical.

## What changed

- `src/animation/sendOutDispatcher.ts`: adapters `backSendOutAffineAtTick` and `backSendOutPaletteAtTick` over the banked reducers
  (`backSendOutFrameAtTick` already existed): per tick x2/y2, the affine matrix, the palette blend (BlendPalette coefficient + colour).
- `src/engine/battleResolutionPresentationRender.ts`: `MidBattleSwitchInView.backAnim` (`x2`, `y2`, `matrix`, `blend`,
  `tintTaskWrites`), `midBattleSwitchInBackAnimAt`, `MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED = 66`, `backAnimNatureName`
  (`GetNature` = `personality % 25`). Only a player `switch-in` command with Scene ON carries it.
- `src/engine/battleScene.ts`: `drawPlayerBackAnimSprite` (plain `drawSpriteSheet` at origin + (x2, y2), or
  `drawSpriteSheetAffineRotate` about the 64x64 centre) used once the emerge has finished.
- Presentation only: no timing, clock, message-frame, RNG or kernel change.

### Selector and reducers

Selector = `3 * GetSpeciesBackAnimSet(species) + sBackAnimNatureModTable[nature]`, nature = `personality % 25`
(`selectBackSendOutAnimation(species, natureId)`, bare species name).

### ROM-fitted anchor

- Back reducer tick 0 renders at view elapsed **66** = mon first visible at elapsed 49 + 17 emerge ticks.
- The release fade task (`Task_FadeMon_ToNormal`, `midBattleSwitchSendInFadeAt(elapsed, 0)`) rewrites the mon palette only on ROM rows
  70..86 (view elapsed 71..87). On other frames a glow/flash family's `BlendPalette` shows, computed from the plain unfaded palette
  (its first coefficient-0 write wipes the pink tint). Implemented as `tintTaskWrites` / `backTintTaskWritesAt`.

### Reducer coverage (Factory pairs)

`tools/integration/bso225Coverage.ts`: 625 distinct (species, nature) Factory pairs, **625 covered, 0 missing** (all 25 back sets
present: DIP_RIGHT_SIDE 51, CONCAVE_ARC_LARGE 24, H_SLIDE 42, V_STRETCH 23, SHRINK_GROW_VIBRATE 50, H_SPRING 2, CONCAVE_ARC_SMALL 29,
H_SHAKE 23, TRIANGLE_DOWN 40, V_SHAKE_LOW 23, CONVEX_DOUBLE_ARC 37, V_SHAKE_H_SLIDE 10, SHAKE_GLOW_RED 31, V_SHAKE 76, SHRINK_GROW 5,
H_VIBRATE 32, JOLT_RIGHT 53, SHAKE_FLASH_YELLOW 19, H_SPRING_REPEATED 2, GROW 5, H_STRETCH 5, CIRCLE_COUNTERCLOCKWISE 3,
SHAKE_GLOW_BLUE 32, SHAKE_GLOW_GREEN 1, GROW_STUTTER 7). Missing functions: none. Nothing is counted as "drawn nothing extra".

## ROM proof: path A, five send-in windows

Staging: `tools/integration/bso225Stage.py` (Roar on the player; opponent HOUNDOUR drags out the staged slot 1; Scene ON oracle,
`bin/oracle --profile battle-scene-on lab`; genderless species need `gender: "genderless"`). Compare: `tools/integration/bso225Compare.ts`
(snd182Compare adapted; renders through `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`; `mon` = x < 120,
48 <= y < 112 vs the ROM). `--before` = the pre-bso225 render (static sprite, same alignment).

| Window (nature 6) | Back family | send-in mon px before | after | e>=88 before | e>=88 after |
|---|---|---|---|---|---|
| SHEDINJA | SHRINK_GROW_VIBRATE (genderless) | 36482 | 7639 | 14719 | **0** |
| SKARMORY | JOLT_RIGHT | 41453 | 8935 | 8835 | **0** |
| ALAKAZAM | GROW_STUTTER | 51247 | 8672 | 8440 | **0** |
| ONIX | V_SHAKE | 41967 | 10728 | 15645 | **0** |
| ENTEI | SHAKE_GLOW_RED (genderless) | 206525 | 9826 | 186367 | **0** |

(Families per `selectBackSendOutAnimation(species, 6)`.) The back animation is **exact from e = 88** in all
five windows (the animation window is then fully ours = ROM, including the affine and palette steps).

Where the remaining residual is (all "after"):

- e = 3..64 (ball flight and emerge, ~88-200 px): pre-existing, identical in "before".
- e = 65..87 (~70-190 px/frame): the ball-release sparkle and tint particles, not part of the back animation; identical in "before".
- **ENTEI e = 68 (2126 px): palette lag frame.** The ROM's glow `BlendPalette` coefficient steps one tick earlier than the reducer at
  reducer tick 3 (ROM coefficient 1, reducer 0). Later coefficient steps match. One frame; not fitted (a one-tick lead experiment
  broke other frames).
- No affine residual in any window.

PNG strips (ours | ROM per frame at e = 70, 90, 98, 106, mon region, magenta separator between frames):
`tools/integration/fixtures/back-send-out/<window>-e70-e90-e98-e106.png`; `summary.json` (px, ROM frame-set sha256) and
`scenarios/` (the lab scenarios). Strips are built by `tools/integration/bso225Strip.py` from `bso225Compare.ts --dump=121,141,149,157`
(`t = 51 + e`).

## Path B (faint-replacement send-in): not wired, why

`tools/integration/bso225Dense.ts` (pfr192Dense with `--before`) against pfr192 ROM frames (`pfr192RomFrames.sh`, Scene ON). The pfr192
production route is not pixel-aligned with the ROM on the mon region **even before bso225**: the ROM mon emerges earlier than
production in some frames (per-frame best offset between -4 and +3 ticks, e.g. SKARMORY e = 150). With the back animation drawn at
`releaseTick - 17` the mon-region total moved: SKARMORY 200615 -> 195351, KINGDRA 364911 -> 338352, ONIX 214818 -> 209096 but
ALAKAZAM 219917 -> 223774 (worse); scanning the anchor (14..28) only trades one against the other. It is not provable as exact, one
window regresses, so the wiring was reverted. Remaining: fit the pfr192 emerge/mon timing first (its own step), then wire
`backSendOutFrameAtTick` at back tick = `releaseTick - 17`.

## Path C (battle-start player materialize): not wired

Canonical-tick replay, not a `switch-in` command; out of the time budget. Remaining.

## Tests

`tests/bso225PlayerBackSendOut.test.ts`: selector mapping for several (species, nature) pairs, 625/625 Factory coverage, the start tick
66, and Scene OFF / null-rules / opponent send-ins draw no back animation (frames identical to the no-rules path; Scene ON differs).

## Reproduce

```
python3 tools/integration/bso225Stage.py <out-dir> <first> <last> tag=species[:nature[:gender]]...   # stage + capture ROM windows
node --experimental-strip-types --no-warnings tools/integration/bso225Compare.ts <scn.json> <rom-dir> <out.json> [--before] [--dump=t,..]
node --experimental-strip-types --no-warnings tools/integration/bso225Coverage.ts [out.json]
```
