# hie2: the held-item effect animation is drawn (ISSUES #220 step 2, Scene ON)

Presentation only. `battleScene.ts generalAnimationRenderView` draws `General_HeldItemEffect` for the `general-animation` command
`HELD_ITEM_EFFECT` that hie1 added (`heldItemEffectRenderView`): the animated battler (either side, any species) is rotated by
AnimTask_RotateMonToSideAndRestore x3 (ages 0 .. 95) and tinted toward the script's RGB(17, 31, 25) (ages 168 .. 187); two granting
stars (ages 96 / 106, 61 ticks) and the thin ring (ages 167 .. 198, clipped at the picture bottom) sit at
`liveBattlerAnchors().picOffsetPoint` (GetBattlerSpriteCoord X_2 / Y_PIC_OFFSET). No command, timing, kernel or RNG change.

## Source facts used

- The opponent's step is negated (`gBattleAnimArgs[1] = -...`), so its angles are the exact negatives of the player's. ObjAffineSet floors the
  u16 angle (>> 8): the player's negative angle rounds away from zero and the opponent's toward it on every odd step. The opponent's
  matrix is the player's mirrored entry at the even step one before it (ages 1 .. 15 of each 32) or one after it (17 .. 31); y2 = |c| >> 3 of
  that entry. (`heldItemHeal.ts sitrusRotationAtAge(age, opponent)`.) A plain mirror was one frame early on alternating frames.
- Stars: `SetAnimSpriteInitialXOffset` with attacker == target negates dx off the player side.
- The elevated opponent's shadow hides while the script runs (`SpriteCB_EnemyShadow`, `gAnimScriptActive`): drawn, but unmeasured (see residuals).

## Epoch (hie2b: drift-free; age 0 = the first identity rotation display)

`battleResolutionPresentationRender.ts heldItemEffectAge0Frames`: **age 0 = command start + (command `minimumFrames` - 204)**, one rule for every
path: restart (Sitrus, Leftovers; 229) 25, continuation (Shell Bell; 223) 19, cure berry after its status command (Cheri; 192) -12.
The ROM's first print glyph is exactly age 0 + 204 (`SITRUS_ITEM_HEAL_TEXT_FIRST_AGE`) and the command lasts until that print.

hie2 first fitted 34 / 36 / 8 by comparing app frame N with ROM frame N. Each Scene ON lab is already out of step with the ROM before the
segment (the app runs 9 - 20 frames ahead; hash alignment, `.integration/evidence/hie2b/offs.py`), so those numbers were the drift-free age 0 plus the lab's own
pre-segment drift (25 + 9, 19 + 17, -12 + 20; Leftovers 25 + 17 = 42). In an aligned battle they would have drawn the animation 9 - 20 frames late.

Negative age 0 (Cheri): the ROM's animation starts 12 frames before the held-item command, inside the netted 32-frame `status` command. Drawing it
there would need a second effect on the `status` command (whose own effect is not a general animation), so it is NOT done: the held-item view
starts at age 12 at the command's first frame, and ages 1 .. 11 (age 0 is identity, so 11 visible frames) are a residual (below).

## Measured, drift-aware (`.integration/evidence/hie2b/`, ROM = Scene ON oracle)

App capture N is the state after N ticks. `offs.py <dir> <from> <to>` counts exact app-frame-f == ROM-frame-(f + offset) hashes per offset;
`shift.py` diffs pixels at a given offset. "Pre" = the offset just before the segment (the move / hit / HP commands, last 40 frames); the window is the
command's captures (command start + 1 .. + length).

| lab | pre-segment offset | in-window offset | window exact at the in-window offset | at the pre offset | after the window (print) |
|---|---|---|---|---|---|
| hie1-sitrus-on | +9 (40 / 40) | +9 | 229 / 229 | = | +9 (51 / 51) |
| hie2-sitrus-opp-on (Rattata holds the berry) | +9 (40 / 40) | +9 | 229 / 229 | = | +9 (51 / 51) |
| hie1-shellbell-on | +16 (41 / 41) | +17 | 223 / 223 | 115 / 223 | +17 (57 / 57) |
| hie1-leftovers-on | +16 (41 / 41) | +17 | 229 / 229 | 121 / 229 | +17 (51 / 51) |
| hie1-cheri-on | +20 (135 / 170 over 560 - 729; the static idle frames from 650 make +18 .. +22 tie) | +20 | 192 / 192 | n/a | +20 (49 / 49) |

So the animation is exact across each whole window at one constant offset; relative to the pre-segment offset it is 0 (Sitrus, both sides, Cheri) or +1
(Shell Bell, Leftovers; the same +1 hie1 saw on the Shell Bell print). Matched frames over the whole trace (`compare --summary`, same-frame, so lab drift
dominates): sitrus 176, shellbell 782, cheri 211, leftovers 547, opp 169 (hie2's fitted epoch scored 373 / 979 / 398 / 555 / 367 on the same-frame metric
because it absorbed the drift; that metric is not the criterion here).

## Residuals

- Cheri: ROM ages 1 .. 11 are drawn inside the preceding 32-frame `status` command (app captures 720 - 730 at +20 differ, <= 964 px at 49,74-97,112: the battler's rotation); not drawn.
- **Leftovers: hie1's "+8" is not reproduced.** Drift-aware, Leftovers' animation AND the print after it sit at +17 against a pre-segment +16 (hie1's own
  `a1-leftovers-on` capture gives the same: pre +16, print +17), i.e. +1 like Shell Bell, not +8. Nothing is fitted for it. (hie1's figure was probably taken against another lab's offset;
  Leftovers' pre-segment offset +16 differs from Sitrus' +9 by 7.)
- The pre-segment drift itself (+9 Sitrus, +15 / +16 Shell Bell / Leftovers, +20 Cheri) is earlier-battle timing (move animation / hit / HP commands), out of scope here.
- Shell Bell / Leftovers: the +1 between the pre-segment and the window offset (also the print's).
- The window frames at the pre offset for Shell Bell / Leftovers differ in 108 / 108 frames (the +1 phase), all in the battler's rotation.
- Opponent side is proved on one lab (Rattata, not elevated). An elevated opponent's shadow window and a species whose OBJ is not a 64 x 64 canvas are unproved.
- Idle 1 px player-sprite bounce phase and the persistent opponent healthbox 6 px diff outside the window (pre-existing); at the in-window offset the old 5 / 13 / 6-frame HP-bar rows no longer appear in the window.

## Gates (code 8ff4876e8)

typecheck 0; `test:gate` 362 files / 2843 tests green; direct importers of the changed modules + hie1 / hie2 (now incl. the epoch test) / icePunch /
animationBoundaryRatchet / factoryAnimationInventory: 252 files, 3191 passed (1 skipped); `build` and `build:lib` 0; Scene OFF differential vs 3250873e3: 2152 captures byte-identical (turn5-sitrus-a..d, hie1-{sitrus,shellbell}-off).
