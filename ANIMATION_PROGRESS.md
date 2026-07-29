# Animation coverage

## MOVE_ROLLING_KICK source evidence complete; compositor remains (2026-07-29)

**Verdict:** `MOVE_ROLLING_KICK` remains unsupported, with its source side
ready for the next exact repair. Source and generated inventory prove
challenge-1 set **233 `FRONTIER_MON_HITMONLEE_1`** is the sole/lowest legal
Level-50 carrier. Complete legal Scene-ON parties pass the full 55-frame
source body through first inactive cleanup twice fresh in both orientations:
player-back **81–135**, evidence/raw
`3f35463979c0971b6432ed8695caa1130e21890d07ea4edb80b6685271932f92` /
`76c1741106018ee425f40505c56af234d7d033562dc8bd3c84386e465d9d7ef3`;
opponent-front **85–139**,
`4fb8c542ab55e346e4f22129cfa10f028d1a43ff8be0ee6e1e1d8b4160849690` /
`237e0cd3062b05c1ffa91a1ecc2e03a60ba1f195012ad079f0980933ea12d5a1`.

**Evidence / next:** fixture-pinned probes prove `gSlidingKickSpriteTemplate`,
elliptical attacker motion, both slide callbacks, hitsplat, target ShakeMon,
alpha registers, side-relative audio, immutable battle state, and raw RGB.
Exact still requires the source-relative reducer, typed seam, extracted
Hitmonlee art, production compositor/display latches, and **55/55** production
framebuffer equality twice per orientation. `MOVE_LOW_KICK` remains
unsupported with target-relative geometry and its distinct rotation body.
Coverage remains **97 exact / 0 partial / 0 staged / 179 unsupported**; no
gameplay, boundary, barrier, or canonical allowlist changed.

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

## MOVE_HYPNOSIS promoted exact; GOLD_RING repair complete (2026-07-29)

**Verdict:** `MOVE_HYPNOSIS` is exact. The Level-50 eligibility graph rejects
source set 38 Hoothoot; challenge-1 set **265 POLITOED_1** is the lowest legal
carrier. Complete legal Scene-ON parties pass the entire body through first
inactive cleanup twice fresh in both orientations: player-back **74–242
(169/169)**, evidence/raw
`6b164293b9a3ad086504808422b0f95ab07ccd84595eb87b3ca908e34189b0c4` /
`7c06a1b4825562841f65768ae6b9a97374dba4a727a0ecd59f28220deddf10a1`;
opponent-front **78–245 (168/168)**,
`8baa59de6a99008bebd74e72b4089c6146f5f98fefd03ca7805a84412b4f100b` /
`69b6f767aef05462568e2229c129b620b2ebfa6da399d072507eaa438ee453ec`.

**Repair/evidence:** the typed Scene-ON seam carries resolved POLITOED/ONIX
geometry and immutable field state. The source-relative reducer and production
compositor port the queued psychic palette rotation/BLDY, target
RGB(31,18,31) 0↔12 tint, all six 27-tick GoldRing paths with source OAM order
and display latches, Politoed/Onix idle and enemy-shadow latches, three
side-panned Supersonic triggers, windows/text, and first inactive cleanup.
`hypnosisPortable.ts` proves every dense source/component, seam,
software/hardware OAM/matrix, palette/tag/register/audio/unchanged-state,
raw-RGB, and production shared-framebuffer frame twice fresh.

**Sibling / next:** `MOVE_PSYBEAM` remains unsupported/audit-only. Its lowest
carrier is set **145 SPINDA**; eleven shorter rings, SwayMon, two-leg tint, and
`LoopSEAdjustPanning 3/4/0/15` need independent complete dense both-orientation
acceptance. Coverage is **96 exact / 0 partial / 0 staged / 180 unsupported**.
No boundary list, barrier, canonical allowlist, sleep, damage, RNG, controller,
turn, or facility state changed.
