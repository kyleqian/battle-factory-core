# Animation coverage

## MOVE_AROMATHERAPY FLOWER evidence/extraction checkpoint; production remains unsupported (2026-07-29)

**Did:** audited the complete `Move_AROMATHERAPY` source body and sole legal
Level-50 Factory carrier: challenge-3 set **394**
`FRONTIER_MON_VILEPLUME_1` (species **45**, Aromatherapy **312**, Impish,
Attack+HP, Persim Berry). Deterministically extracted Vileplume front/back
and `ANIM_TAG_FLOWER` from pinned source, with a byte-for-byte regeneration
test. The body loads FLOWER/THIN_RING/SPARKLE_2, has seven small and two big
`AnimFlyingParticle` flower lifecycles (big affine +4), green BG blend and
monbg, `AnimTask_StatusClearedEffect`, two SparklingStars, then the blended
thin-ring cleanup. Petal Dance remains the closest FLOWER-bearing but
independent sibling (`gPetalDance*` callbacks/macros).

**Verify:** fresh complete legal three-mon Scene-ON receipts run through the
first inactive cleanup frame in both orientations: player-back **75–474
(400)** / opponent-front **79–474 (396)**. Lifecycle counts are **7** small
flowers, **2** big flowers, **2** stars, **1** ring in each. Evidence/raw-RGB
digests: player `51540e9940a3d4730640d58ede6b4ff5dcd90af646ed2d91065ccca9c56a2d82`
/ `dc02bff98836fbeb9481c3ce01686d0f7e11b7ad15f529224b48278617deaf84`;
opponent `62348e83e242f603322064913d3a30b11827520d6df7dbe1303f68b7bda3d784`
/ `43d736b2d9f70f771a24566e3958a845381b7f3b51a69411c64e3a088b8e359b`.

**Next:** port only a source-relative Aromatherapy reducer/compositor behind
the established presentation seam, then prove the dense receipts before any
coverage promotion. **Notes:** `MOVE_AROMATHERAPY` remains unsupported; no
production, gameplay, RNG, damage, turn, facility, or coverage-state change.

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
