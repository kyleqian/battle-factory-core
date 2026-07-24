# Portable BOUNCE source-evidence checkpoint

`MOVE_BOUNCE` remains **unsupported** for pixel acceptance. This checkpoint
provides a legal Scene-ON stage, a complete source/RAM-derived reducer for
both visual halves, and a shared-seam state adapter. It deliberately does not
claim a green framebuffer window.

## Legal Level-50 stage and zero-PP-Up proof

`tools/battle-lab/mechanic-bounce-spoink-onix.json` stages legal Level-50 set
121 SPOINK against set 156 ONIX. Only the opponent's four move slots are
overridden to move id 340; every slot explicitly has
`ppUps:[0,0,0,0]`. The checked mGBA probe reports:

- source-initialized legal sets 121/156, seed `0x12345679`;
- PP `[5,5,5,5]` at frame 323, then `[5,5,5,4]` at frame 335;
- charge `gCurrentMove=340` at frames 323–502;
- strike `gCurrentMove=340` at frames 828–1069;
- immutable stock-controller result HP 117→114 at frame 969.

Thus the stage proves BOUNCE's zero-PP-Up maximum of 5 and one stock-ROM PP
consumption. Presentation code neither reads nor writes PP, damage, accuracy,
semi-invulnerability, paralysis, action order, or controller progression.

## Dense source/RAM evidence

Run through `tools/run-mgba-probe.py` with
`tools/probe/run-battle-lab-rgb.py`; that probe captures every frame, final
sprite state, final OAM ordering, battler visibility, `BLDALPHA`, controller
commands, PP, and HP.

- Charge ball: frames **345–368**, 24 consecutive states. It is centered at
  SPOINK's source animation center `(176,49)` and uses the complete
  `sAffineAnim_BounceBallShrink` program. Endpoint raw-RGB SHA-256 values are
  `18f9e420...3370b00` and `ce8bbc43...1797fd`. SPOINK becomes invisible at
  frame 345 and stays invisible after the ball is destroyed.
- Strike ball: frames **881–904**, 24 consecutive states. The affine-double
  64×64 round-shadow object is anchored at target battle position `(72,80)`,
  with matrix `{a:409,b:0,c:0,d:256}` and `y2`
  `-102,-92,...,-2,8,-2,...,-112`. It is destroyed and SPOINK is restored at
  frame 905.
- The shared basic hit-splat is live at frames **890–898**.
- `AnimTask_ShakeMon(ANIM_TARGET,0,5,11,1)` owns target `y2`, not FLY's
  target `x2`; the first displayed +5 poses are frames **892–893**, followed
  by **896–897**, **900–901**, and **904**.
- Strike composition has `BLDALPHA=0x080c` from the sampled opening through
  the ball/hit overlap. The target OBJ is hardware-invisible while `monbg`
  owns its BG copy; that is compositor state, not a generic hit blink.

The corresponding source is
`reference/pokeemerald/data/battle_anim_scripts.s` (`Move_BOUNCE`,
`BounceSetUp`, `BounceUnleash`) and
`reference/pokeemerald/src/battle_anim_flying.c`
(`sAffineAnim_BounceBallShrink`, `sAffineAnim_BounceBallLand`,
`AnimBounceBallShrink`, `AnimBounceBallLand`).

## Landed presentation seam

`src/engine/bounce.ts` owns only relative charge/strike ages and exposes the
ball affine state, attacker visibility, hit-splat visibility, and vertical
shake ownership. `SceneOnBounceConfig` / `sceneOnBounceView` expose that
reducer through the same relative Scene-ON seam used by FLY. The framebuffer
dispatcher fails explicitly for BOUNCE rather than silently falling through
to another move.

## Honest remainder

No portable pixel comparison is green yet, so BOUNCE has no coverage entry
and is not `staged` or `partial`. Next work must extract/install SPOINK
front/back presentation assets and healthbox geometry, implement the
source-relative monbg/alpha/OAM compositor for both charge and strike, and
dense-compare complete controller windows. Opposite orientation remains
required because attacker/target front/back geometry changes both centers and
the strike's target BG composition. FLY's accepted windows are unchanged.
