# MOVE_GLARE Scene-ON evidence checkpoint

Source body: `Move_GLARE` `0x082cd0ca` through the byte before
`Move_BARRAGE` `0x082cd133` (cleanup offset `0x68`). Both orientations expose
212 active-script frames plus the first inactive cleanup: player 74–286 and
opponent 78–290, 213 frames each. Two fresh probes per orientation produced
byte-identical dense JSON, raw RGB, and change maps.

The legal carrier is `FRONTIER_MON_DUNSPARCE_1` / set 200: species 206,
Docile, HP+Attack EV spread, Lax Incense. Both complete three-Pokémon parties
override all four active DUNSPARCE slots to move 137 and face active SHUCKLE.

Component audit:

- `AnimTask_GlareEyeDots` computes side-specific DUNSPARCE start coordinates,
  then creates 13 pairs of `gGlareEyeDotSpriteTemplate` (SMALL_RED_EYE,
  `AnimGlareEyeDot`) four ticks apart. These 8×8 dots are not the sparkle
  sprites: the task data records pair count, ±3 offsets, endpoints, and active
  sprite count until every dot is destroyed.
- Only after that task finishes does the first `AnimTask_BlendBattleAnimPal`
  blend `F_PAL_BG` from black coefficient 0→16. The runtime callback is
  `AnimTask_BlendSpriteColor_Step2`; all faded/unfaded/hardware palette words
  are recorded.
- The two later `gEyeSparkleSpriteTemplate` instances are distinct 16×16
  `AnimEyeSparkle` sprites at attacker offsets (−16,−8) and (+16,−8), with
  the source 0/4/8/4/0 cells. `AnimTask_ScaryFace` runs concurrently and is a
  task, not either sparkle instance.
- After the literal two-tick delay, `AnimTask_ShakeTargetInPattern(20,1,FALSE)`
  runs while ScaryFace remains active. Probe task data pins the task separately
  from both sprite families and records both battler logical sprites, hardware
  OAM, and matrices each frame.
- The second `AnimTask_BlendBattleAnimPal` is a separate `F_PAL_BG` 16→0
  restore after all visual tasks finish. Both audio intervals (`SE_M_PSYBEAM2`
  and `SE_M_LEER`), pans, BG/blend registers, and raw RGB are captured.

The source-relative reducer, typed seam, and narrow compositor now pass all
213 source/component and framebuffer frames twice fresh in both orientations.
Fresh pixels refine the display rules: dot creation is RAM+2 while destruction
is RAM+1, sparkles first scan out at age 115, and each BG-palette ramp transfers
one coefficient later than the original reducer hypothesis. SCARY_FACE and
THUNDER retain independent exact acceptance; TRI_ATTACK remains unsupported.
