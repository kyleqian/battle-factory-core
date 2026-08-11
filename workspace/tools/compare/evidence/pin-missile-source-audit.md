# MOVE_PIN_MISSILE Scene-ON source audit and exact acceptance

This source-pointer-bounded audit underpins the exact animation-lane port and
its production compositor.

## Source graph

- `reference/pokeemerald/data/battle_anim_scripts.s:702-730`
  (`Move_PIN_MISSILE`): NEEDLE and IMPACT, `monbg ANIM_TARGET`,
  `splitbgprio ANIM_TARGET`, alpha `12:8`, three `create_pin_missile_sprite`
  calls at duration 20 with wave amplitudes `-32/-40/-32`, three animation-2
  basic hitsplats, and three `AnimTask_ShakeMon2` target bursts.
- `reference/pokeemerald/src/battle_anim_bug.c:150-159`:
  `gPinMissileSpriteTemplate` uses `ANIM_TAG_NEEDLE`, affine-normal 16x16
  OAM, and `AnimMissileArc`.
- `reference/pokeemerald/src/battle_anim_bug.c:414-460`:
  `AnimMissileArc` initializes attacker-relative coordinates, negates target X
  on the opponent side, calls `InitAnimArcTranslation`, hides the newly
  allocated sprite, and `AnimMissileArc_Step` advances the arc twice before
  deriving the tangent rotation and restoring task data.
- `reference/pokeemerald/src/battle_anim_mons.c:785-805`:
  `InitAnimArcTranslation` and `TranslateAnimHorizontalArc` use the Q8.8
  linear accumulator and `Sin(data[7] >> 8, waveAmplitude)`.

## Legal staging

Both fixtures use complete legal three-mon `mechanicLab` parties and
`profile: battle-scene-on`. The active carrier is set 211 QWILFISH with all
four active choices constrained to move 42 PIN MISSILE; the opposing active
ONIX has all four choices constrained to TACKLE. The fixtures are bilateral
and use seed `0xcafebabe`; the earlier `0x12345679` receipt was a legitimate
accuracy miss and never entered the move animation script.

## Dense receipt boundaries

| orientation | source frames | source frames | source symbols | raw RGB digest | change-map digest |
| --- | ---: | ---: | --- | --- | --- |
| player-back | 86..178 | 93 | `0x082c9b60..0x082c9c25` | `d56111747113854c…` | `627ffeb13b1f1925…` |
| opponent-front | 90..182 | 93 | `0x082c9b60..0x082c9c25` | `888244d86c17e987…` | `d6ffb0e1f1264be1…` |

The four committed metadata fixtures contain full receipt and map digests.
The pointer-bounded source topology includes `gPinMissileSpriteTemplate`,
`AnimMissileArc_Step`, `gBasicHitSplatSpriteTemplate`, and
`AnimTask_ShakeMon2_Step`; the probe also records all live sprite/task RAM,
software and hardware OAM/matrices, faded/unfaded/hardware palettes and tags,
registers, audio players, immutable battle state, and raw RGB.

Measured in both orientations and recorded narrowly in the latch ledger: live
`AnimMissileArc_Step` motion displays reducer age−1, while destruction retains
one terminal matrix/OAM display from reducer age−2. Pin Missile's three short
`AnimTask_ShakeMon2(target, 3, 0, 2, 1)` bursts display RAM+1. The reducer
models each orientation's missile/hitsplat allocator order and ports the
source callback's two arc advances rather than fitting the captured pixels.
The tangent uses the integer GBA BIOS `ArcTan2`/`ArcTan2Neg` algorithm before
`SetSpriteRotScale`, preserving the ROM's fixed-point truncation.

## Exact acceptance

`pinMissilePortable.ts` regenerates both fixtures twice and requires 93/93
source-reducer, typed-seam, task/sprite, software/hardware OAM, affine matrix,
palette/tag, register, audio, immutable-state, raw-RGB, and production
framebuffer receipts in each orientation. It also locks the committed probe,
aggregate raw-RGB, and normalized change-map digests and rejects any residual.
