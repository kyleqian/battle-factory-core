# Animation coverage

## MOVE_WHIRLPOOL status body proven; move remains partial (2026-07-29)

**Verdict:** `Status_Whirlpool` is independently source-pointer-pinned and
fully evidenced, but `MOVE_WHIRLPOOL` remains **partial** because this work
adds no reducer, seam, compositor, or production framebuffer claim. Legal
three-Pokémon Wailmer/Onix Scene-ON parties land Whirlpool normally, then use
real second-turn controller input to reach residual status play: player-back
**663–770 (108/108)**, evidence/raw
`e5d210e7908b269ba0722959c4035d4bc39c04378a323cf74698375baa615b84` /
`8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71`;
opponent-front **653–760 (108/108)**,
`d6b1d9e43817259be6ad63c9b36e5f4d11112a868785925253716eb97fead93a` /
`481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c`.

**Evidence:** `statusWhirlpoolProbe.py` identifies `Status_Whirlpool` by its
pointer and source bounds, confirms real prior Whirlpool + trapped status,
then captures through first inactive cleanup. Its portable verifier proves
two `WhirlpoolEffect` calls / 12 vortex lifecycles, source parameters and
affine/OAM latches, 30-tick ShakeMon, target blend, WATER_ORB/monbg/split
priority/12:8 alpha, target-panned audio, stopsound cleanup, registers, and
stable gameplay twice fresh per orientation. Coverage remains **99 exact / 1
partial / 0 staged / 176 unsupported**.

## MOVE_WHIRLPOOL promoted partial; main body evidence complete (2026-07-29)

**Verdict:** `MOVE_WHIRLPOOL` is partial. Legal Scene-ON Wailmer/Onix probes
cover the entire main `Move_WHIRLPOOL` body through first inactive cleanup
twice fresh in both orientations: player-back **78–210 (133/133)**
evidence/raw `2942fa0bf1a07da485bcf391ca4ecea06a41361d648adc27a1e48a3f32018125` /
`d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8`;
opponent-front **82–214 (133/133)**
`7e57488e1a265960fec441a02b5133f0b4a6e38ddde46cd42e21b5a29b0aaba3` /
`8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa`.

**Evidence / boundary:** `whirlpoolPortableEvidence.ts` pins all 18 affine
vortex lifecycles, OAM/matrix and palette/register latches, target blend and
ShakeMon, WATER_ORB tags, target-pan audio, immutable gameplay, and cleanup.
No reducer, seam, compositor, or production renderer was added. The later
`Status_Whirlpool` has separate complete evidence above; neither body has
production presentation acceptance. Coverage is **99 exact / 1 partial / 0
staged / 176 unsupported**.

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

## MOVE_ROLLING_KICK promoted exact; SlidingKick representative complete (2026-07-29)

**Verdict:** `MOVE_ROLLING_KICK` is exact. Source and generated inventory prove
challenge-1 set **233 `FRONTIER_MON_HITMONLEE_1`** is the sole/lowest legal
Level-50 carrier. Complete legal Scene-ON parties pass the whole 55-frame body
through first inactive cleanup twice fresh in both orientations: player-back
**81–135 (55/55)**, evidence/raw
`3f35463979c0971b6432ed8695caa1130e21890d07ea4edb80b6685271932f92` /
`76c1741106018ee425f40505c56af234d7d033562dc8bd3c84386e465d9d7ef3`;
opponent-front **85–139 (55/55)**,
`4fb8c542ab55e346e4f22129cfa10f028d1a43ff8be0ee6e1e1d8b4160849690` /
`237e0cd3062b05c1ffa91a1ecc2e03a60ba1f195012ad079f0980933ea12d5a1`.

**Model/evidence:** the pure reducer, narrow typed seam, extracted Hitmonlee
art, and production compositor port attacker elliptical motion, both slide
callbacks, attacker-relative `gSlidingKickSpriteTemplate`, affine hitsplat,
target ShakeMon, monbg/alpha, side-relative audio, windows/text, the task
two-interval versus sprite one-interval OAM latches, and cleanup.
`rollingKickPortable.ts` proves **55/55** reducer/component/seam/cleanup and
production shared-framebuffer equality twice per orientation.

**Sibling / next:** `MOVE_LOW_KICK` is now exact independently through its own
target-relative geometry, `AnimTask_RotateMonSpriteToSide`, 33-frame body, and
portable verifier. No gameplay, boundary, barrier, canonical allowlist,
damage, RNG, turn, controller, or facility state changed.
