# Animation coverage

## MOVE_LOW_KICK source-evidence checkpoint; no production promotion (2026-07-29)

**State:** `MOVE_LOW_KICK` is **partial only**, not exact. The generated
inventory and source prove the two Level-50 carriers are set **178
`FRONTIER_MON_MACHOKE_1`** and later set **298 `FRONTIER_MON_SUDOWOODO_2`**;
Adamant HP+SpDefense Focus-Band Machoke is the sole lowest carrier.

**Did:** complete legal Scene-ON Machoke/Onix three-mon parties and a reusable
mGBA probe extension pass a complete dense **33/33** source window through
first inactive cleanup twice fresh in each orientation: player-back **214–246**
evidence/raw `f3b4b291ee90208d9f9dcf7e2ea91a355c6da0e270289e6a083cdae126782a74` /
`40639ddccc47ad2f867891ce5daa4d6a5769ff22b85352095bac14ba5cc9d9e5`;
opponent-front **214–246** `7264ca8cdc9335c80e375354c674322eb857f1c2a7d0ea253fe2e73cefd14e0a` /
`4d657cf51c4c28805b20ed868890418aaf2ab03c7074ccce9757ea63bef75e20`.
The receipts pin source-relative slide/restore offsets, target-relative foot
and hitsplat, RotateMonSpriteToSide/matrix, tags, panning, OAM/matrices,
palettes/registers, raw RGB, and immutable gameplay fields.

**Next:** port a source-relative reducer, narrow typed seam, any Machoke art,
and production compositor/display latches; then establish every-frame shared
framebuffer equality twice per orientation. Do not promote Low Kick from its
shared Rolling Kick template: its target-relative/rotation/timing body is
independent. Coverage is **98 exact / 1 partial / 0 staged / 177 unsupported**.

**Notes:** No production compositor/wiring, engine, gameplay, boundary,
barrier, canonical-recording allowlist, damage, RNG, turn, controller, or
facility state changed; no framebuffer equality is claimed.

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

**Sibling / next:** `MOVE_LOW_KICK` remains unsupported: target-relative
geometry, `AnimTask_RotateMonSpriteToSide`, and its distinct timing/body need
independent complete dense both-orientation acceptance. Coverage is **98 exact
/ 0 partial / 0 staged / 178 unsupported**. No gameplay, boundary, barrier,
canonical allowlist, damage, RNG, turn, controller, or facility state changed.

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
