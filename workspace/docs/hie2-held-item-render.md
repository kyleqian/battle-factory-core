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

## Epoch (age 0 = the first identity rotation display)

Measured on the hie1 Scene ON labs, in frames after the command starts: script restart (Sitrus) 34, continuation (Shell Bell) 36, cure
berry after its status command (Cheri) 8 (`battleResolutionPresentationRender.ts heldItemEffectAge0Frames`). In every lab the ROM's first
text glyph is exactly age 0 + 204 (`SITRUS_ITEM_HEAL_TEXT_FIRST_AGE`).

## Measured (`npm run compare -- <trace> --summary`, frames matched / window = command frames), before -> after

| trace | frames matched | held-item window exact |
|---|---|---|
| hie1-sitrus-on | 182 -> 373 / 1823 | 33 -> 224 / 229 |
| hie1-shellbell-on | 796 -> 979 / 1823 | 27 -> 210 / 223 |
| hie1-cheri-on | 218 -> 398 / 1823 | 12 -> 192 / 192 |
| hie1-leftovers-on | 561 -> 555 / 1823 | 33 -> 27 / 229 |
| hie2-sitrus-opp-on (new: the opponent's Rattata holds the Sitrus Berry) | -> 367 / 1101 | -> 223 / 229 |

## Residuals

- Sitrus 722-726 (5 frames, 2 .. 6 px at 86,33), Shell Bell 732-744 (13 frames, <= 12 px at 81,33), opponent-holder lab 722-727 (6 frames, 54 px at
  191,91): the previous HP bar's last rows (healthbox), not the animation. Same in the baseline.
- Leftovers: the animation is 8 frames early (ROM age 0 = command start + 42; hie1's unmodelled +8 lead, ISSUES #220). Same command length as
  Sitrus, so the command alone cannot tell the two apart.
- The first text glyph after the window is early by 9 (Sitrus; the HP climb 11), 17 (Shell Bell), 17 (Leftovers), 20 (Cheri): the command's end
  is earlier than the ROM's age 0 + 204. This is hie1's lead (timing), not moved here; the measured corrections are the per-path age-0 numbers above
  plus these tails. The text / HP rows differ by exactly that shift after the window.
- Opponent side is proved on one lab (Rattata, not elevated). An elevated opponent's shadow window and a species whose OBJ is not a 64 x 64 canvas are unproved.
- Idle 1 px player-sprite bounce phase and the persistent opponent healthbox 6 px diff outside the window (pre-existing).
