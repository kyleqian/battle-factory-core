# MOVE_PIN_MISSILE Scene-ON evidence checkpoint

This is a dense, source-pointer-bounded checkpoint for the animation lane. It
does not promote coverage or claim a production compositor.

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

Measured in both orientations (not generalized into the latch ledger yet):
the first missile’s affine matrix is independently allocated and its first
visible hardware state follows the source callback’s invisibility boundary;
the affine missile removal is a plain OAM teardown. The three missile slots
and reused hitsplat slots must be modeled from each orientation’s allocator
order, and the `AnimMissileArc_Step` twice-advance must be ported from the
source rather than replaced by a fitted curve.

## Remaining work

`src/animation`, the Scene-ON typed seam, and the production draw case remain
unchanged in this checkpoint. A later worker must port the Q8.8 arc plus BIOS
angle/matrix behavior, prove both orientations twice fresh against the full
receipt and framebuffer, and only then promote `MOVE_PIN_MISSILE` from the
current 156 exact moves.
