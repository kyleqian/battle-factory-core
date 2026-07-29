# Animation coverage

## MOVE_AROMATHERAPY promoted exact; FLOWER/SPARKLE_2 track bounded (2026-07-29)

**Verdict:** `MOVE_AROMATHERAPY` is exact. The sole legal Level-50 carrier is
challenge-3 set **394** `FRONTIER_MON_VILEPLUME_1`. Complete legal Scene-ON
parties pass the body through first inactive cleanup twice fresh in both
orientations: player-back **75–474 (400/400)**, evidence/raw
`83f9f2d03fb0cd19a05394a29dfa0e5ecfe8d142ca1dc3711a0cbf6586db0728` /
`dc02bff98836fbeb9481c3ce01686d0f7e11b7ad15f529224b48278617deaf84`;
opponent-front **79–474 (396/396)**,
`323ccf6d2752af1f726823e7925fcb4b91db586f56493c878e1a532d1974c686` /
`43d736b2d9f70f771a24566e3958a845381b7f3b51a69411c64e3a088b8e359b`.

**Model:** the typed presentation seam ports all **7** small + **2** affine
big FLOWER particles, source OAM-Y/tie order, green blends/monbg,
`AnimTask_StatusClearedEffect` scrolling OBJ-window mask, both SPARKLE_2
stars, thin-ring expansion, audio, waits, hardware latches, tag cleanup, and
first inactive frame. Extraction now follows the source make rule that
concatenates `flower_1.png` as small-flower tile 4. Presentation owns no
status cure, gameplay RNG, damage, turn, controller, or facility outcome.

**Sibling/control:** `MOVE_PETAL_DANCE` remains unsupported despite shared
FLOWER art/particle callbacks; its repeated groups, shake, affine program,
waits, and cleanup need independent dense acceptance. Heal Bell, Refresh,
Wish, and Cosmic Power retain distinct bodies. Coverage is **90 exact / 0
partial / 0 staged / 186 unsupported**; no boundary or barrier ratchet moved.

## MOVE_SWEET_KISS promoted exact; RED_HEART track bounded (2026-07-29)

**Verdict:** `MOVE_SWEET_KISS` is exact. The lowest suitable Level-50
Factory carrier is challenge-0 set **123** `FRONTIER_MON_LUVDISC` (species
**325**, Sweet Kiss **186**, Relaxed, SpAttack+HP, Quick Claw). Complete legal
three-mon Scene-ON parties pass the whole body through first inactive cleanup
at **159/159** source/component, typed-seam, hardware, audio, raw-RGB, and
shared-framebuffer frames in both orientations, twice fresh. Player-back
frames **74–232** reproduce evidence/raw digests
`5117db12992b65aadfc65a448ea2260dfd5848be19fc3d6e2df733d90604af21` /
`61870ad0f56694de71f2d492c51fbe208216ef88b8550eca8a3a17fca8f73f11`;
opponent-front frames **78–236** reproduce
`db45d09de25efa0d267f53c0337017c98094b0d174e8b99babfaa7dabf496821` /
`76f32756df4d9bbdbfee5daf5d5ecf5b72bcdbacc3c4eab909c44cd7a8759876`.

**Model/boundary:** the source-relative reducer and typed seam port RED_HEART
and ANGEL load/free, `gAngelSpriteTemplate` path/affine/display timing, all
six parameterized `gRedHeartBurstSpriteTemplate` `AnimParticleBurst`
lifecycles, target-relative geometry, source sprite ordering, audio, waits,
and cleanup. Extraction regenerates Luvdisc front/back, RED_HEART, and ANGEL
assets byte-for-byte. The evidence pins unchanged HP/item state and zero
presentation-owned confusion; no damage, RNG, status, turn, controller,
facility, import-boundary, or unsupported-barrier behavior changed.

**Sibling/control:** `MOVE_ATTRACT` remains **unsupported** because its body
adds a projectile heart, rising hearts, HeartsBackground, SwayMon, blend
color cycling, and independent cleanup. The existing `MOVE_CHARM`
magenta-heart control remains exact at **93/93** body plus **4/4** teardown
frames in both orientations twice fresh. Coverage is **89 exact / 0 partial /
0 staged / 187 unsupported**.

## MOVE_SLAM promoted exact; SLAM_HIT track bounded (2026-07-29)

**Verdict:** `MOVE_SLAM` is exact. The lowest suitable Level-50 Factory
carrier is challenge-0 set **164** `FRONTIER_MON_LICKITUNG_1` (species
**108**, Slam **21**, Quirky, Attack+HP, Sitrus Berry). Complete legal
three-mon Scene-ON parties pass the whole move through first inactive cleanup
at **54/54** source/component, typed-seam, hardware, audio, raw-RGB, and
shared-framebuffer frames in both orientations, twice fresh. Player-back
frames **212–265** reproduce evidence/raw digests
`8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182` /
`4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2`;
opponent-front frames **211–264** reproduce
`66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401` /
`66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc`.

**Model/boundary:** the pure source-relative reducer and typed seam port
SLAM_HIT/IMPACT load and free, the four-cell side-flipped
`gSlamHitSpriteTemplate`, both attacker and target slide/return sequences,
animation-1 hitsplat, target `ShakeMonInPlace`, monbg/alpha, audio, OAM/display
latches, and cleanup. Source extraction regenerates Lickitung front/back and
SLAM_HIT assets byte-for-byte; the narrow compositor reuses exact IMPACT,
slide, shake, Onix, and field primitives. No damage, RNG, turn, controller,
facility, import-boundary, or unsupported-barrier behavior changed.

**Sibling/control:** `MOVE_SECRET_POWER` remains **unsupported** because the
Factory building environment selects the distinct `Move_STRENGTH` body; other
environments also dispatch to independent bodies. Shared SLAM_HIT proof does
not promote it. The existing BODY SLAM slide/impact/shake control remains
independent. Coverage is **88 exact / 0 partial / 0 staged / 188
unsupported**.
