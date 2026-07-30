# Animation coverage

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
`Status_Whirlpool` trapping/repetition animation remains outside this
checkpoint. Coverage is **99 exact / 1 partial / 0 staged / 176 unsupported**.

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

## MOVE_MEGA_PUNCH promoted exact; MegaPunchKick track established (2026-07-29)

**Verdict:** `MOVE_MEGA_PUNCH` is exact. Generated inventory and source audit
prove challenge-1 set **254 `FRONTIER_MON_CACTURNE_1`** is the sole/lowest
legal Level-50 carrier. Complete legal Scene-ON parties pass the entire
160-frame source body through first inactive cleanup twice fresh in both
orientations: player-back **76–235**, receipt/raw
`9a324ee534928083d1f41dea0c2366ef2b47392c7869fb7aee81a7bf5641cd2f` /
`7bab206057ef1ae1e99eb24bb9879a8052b73cfae92ccf90a51202cc851c5a36`;
opponent-front **80–239**,
`d8f787f50acb0d43013b904de76a0f22543a348e56cf36a403b715eb233b701f` /
`c05a36ec1e051de5783282bda799cbde791ee4613b4405ab3874094b33f80a55`.

**Model/evidence:** the source-relative reducer, typed seam, and production
compositor port variant-0 `gMegaPunchKickSpriteTemplate`, HANDS_AND_FEET,
IMPACT/hitsplat, target monbg/alpha, both palette-blend programs, side-specific
impact background, ShakeMon2, audio, Cacturne/Onix/chrome, display latches,
and cleanup. `megaPunchPortable.ts` proves **160/160** reducer/seam/cleanup,
MegaPunchKick software sprite+matrix, ShakeMon2 task/offset, blend-register,
and side-panned SE trigger assertions; each complete probe record and raw-RGB
window is fixture-receipt-pinned, and every production framebuffer pixel passes
twice fresh per orientation.

**Sibling / next:** `MOVE_MEGA_KICK` remains unsupported: its distinct
variant-1 art selection and `SE_M_MEGA_KICK2` require independent complete
both-orientation dense acceptance. Coverage is **97 exact / 0 partial /
0 staged / 179 unsupported**. No gameplay, boundary, barrier, or canonical
allowlist ownership changed.
