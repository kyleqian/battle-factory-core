# Animation coverage

## MOVE_BRICK_BREAK evidence checkpoint; TORN_METAL representative partial (2026-07-29)

**Verdict:** `MOVE_BRICK_BREAK` is **partial**, evidence only. Inventory
proves its **46** Level-50 Factory carriers outrank `MOVE_CRUSH_CLAW`'s **11**;
set **131 `FRONTIER_MON_LOMBRE`** is the lowest legal carrier. Complete legal
Lombre/Onix Scene-ON parties use real target `REFLECT`, selecting the source
`BrickBreakShatteredWall` body. Dense receipts run twice fresh through first
inactive cleanup: player-back **288–479 (192/192)** evidence/raw
`e484e602be861db10e4042c2a6de75e5f6e261e533515d48d8597637db5c4697` /
`e1b36f8036f30386af0c7cdaac9645f73bb9eb526802c3179e745871cf637363`;
opponent-front **289–480 (192/192)**
`f0314f159cb9b141c107cbe078382ebb4ff7379c4ce2c835aa9b921c65bbe27a` /
`8402d60c9605e852c0f099dbc617c80dc21d005097ed1985395b647564ae23bc`.

**Evidence / boundary:** source and portable hardware verifier pin both
source branches, four `gBrickBreakWallShardSpriteTemplate` / TORN_METAL
lifecycles, wall, lunge/hitsplat/fist, WindUpLunge, OAM/affine/palette and
register ordering, three target-panned audio events, and cleanup. `CRUSH_CLAW`
stays unsupported: it only loads TORN_METAL and has its own lunge/ShakeMon2/
four-claw-slash body. No production reducer, seam, compositor, gameplay, RNG,
or exact credit changed. Coverage is **100 exact / 1 partial / 0 staged / 175
unsupported**.

## MOVE_WHIRLPOOL promoted exact; both source bodies accepted (2026-07-29)

**Verdict:** `MOVE_WHIRLPOOL` is exact through one pure source-relative
reducer, typed Scene-ON seam, and production compositor. The complete main
body passes **133/133** semantic and framebuffer frames twice in both
orientations: player-back evidence/raw
`2942fa0bf1a07da485bcf391ca4ecea06a41361d648adc27a1e48a3f32018125` /
`d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8`;
opponent-front
`7e57488e1a265960fec441a02b5133f0b4a6e38ddde46cd42e21b5a29b0aaba3` /
`8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa`.

**Residual / model:** the independently staged `Status_Whirlpool` body passes
**108/108** twice per orientation: player-back
`e5d210e7908b269ba0722959c4035d4bc39c04378a323cf74698375baa615b84` /
`8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71`;
opponent-front
`d6b1d9e43817259be6ad63c9b36e5f4d11112a868785925253716eb97fead93a` /
`481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c`.
The model preserves the main body's 18 vortex-orb lifecycles and 50-tick
ShakeMon, the residual body's 12 lifecycles and 30-tick ShakeMon, their
distinct affine/OAM creation latches, palettes/registers/audio, stable sprite
ordering, Wailmer/Onix art, field chrome, and cleanup.

**Ownership:** no trapping outcome, damage, RNG, turn/controller, round,
facility, boundary list, unsupported barrier, or canonical allowlist changed.
Coverage is **100 exact / 0 partial / 0 staged / 176 unsupported**.

## MOVE_LOW_KICK promoted exact; target-rotation track complete (2026-07-29)

**Verdict:** `MOVE_LOW_KICK` is exact. Source and inventory prove set **178
`FRONTIER_MON_MACHOKE_1`** is the lowest legal Level-50 carrier (before set
298 Sudowoodo_2). Complete legal Scene-ON Machoke/Onix parties pass the full
body through first inactive cleanup twice fresh per orientation: player-back
**214–246 (33/33)** evidence/raw
`f3b4b291ee90208d9f9dcf7e2ea91a355c6da0e270289e6a083cdae126782a74` /
`40639ddccc47ad2f867891ce5daa4d6a5769ff22b85352095bac14ba5cc9d9e5`;
opponent-front **214–246 (33/33)**
`7264ca8cdc9335c80e375354c674322eb857f1c2a7d0ea253fe2e73cefd14e0a` /
`4d657cf51c4c28805b20ed868890418aaf2ab03c7074ccce9757ea63bef75e20`.

**Model/evidence:** the pure source-relative reducer, narrow typed seam,
reproducible Machoke art, and production compositor port both slide callbacks,
target-relative SlidingKick/hitsplat, RotateMonSpriteToSide's ObjAffineSet
matrix plus target position/OAM transfer, Vital Throw target panning, field
chrome/text, sprite/task display latches, tag cleanup, and first inactive
cleanup. `lowKickPortable.ts` proves **33/33** reducer/component/seam/cleanup
and **33/33** shared-framebuffer equality twice per orientation.

**Sibling / next:** `MOVE_ROLLING_KICK` remains independently exact under its
own 55-frame portable verifier. Next independent component track:
`water-orb-hydro-pump-whirlpool`, with `MOVE_WHIRLPOOL` requiring its own dense
both-orientation proof despite Hydro Pump's exact shared components. Coverage
is **99 exact / 0 partial / 0 staged / 177 unsupported**.

**Ownership:** no damage, Low Kick weight calculation, RNG, turn order,
controller, round advancement, facility state, animation-boundary list,
unsupported barrier, or canonical-recording allowlist changed.
