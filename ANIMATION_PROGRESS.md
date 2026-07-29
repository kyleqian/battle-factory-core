# Animation coverage

## WATER_ORB implementation checkpoint; Hydro Pump remains partial (2026-07-29)

**Verdict:** `MOVE_HYDRO_PUMP` remains an honest **partial**, not exact.
Fresh dense probes now pin the complete 141-frame move-owned body through
first inactive cleanup in both legal set-303 MASQUERAIN orientations:
player-back **213–353**, evidence/raw
`9c8210033328ee98ceae81e54e2d4ec36ecbc4a763deb925171f23f6ef117af7` /
`360d0d7292aa8fa6125f3de46d5170d2d1a3ca62181ada3cdf11ff1cff779706`;
opponent-front **232–372**,
`3330496d0d3dd1feec78443a274380e43b593250459b36ed0b6976ae2e105880` /
`ff315fb58f55bcaa8c5e728faa33635d97e41d624747d867d4f1c9487fc06cee`.

**Landed / gate:** the source-relative reducer, typed seam, narrow
MASQUERAIN/ONIX compositor, and portable comparator now cover all **44** sine
WATER_ORBs, **12** impact splats, task/audio/tag/register/cleanup schedules,
and immutable gameplay inputs. The diagnostic comparator currently passes
player **83/141** component frames and **43/141** shared framebuffers;
opponent **83/141** components and **42/141** framebuffers. Exact is blocked on the
remaining late orb phase/slot assertions plus monbg/display-latch compositor
differences beginning at age 11; no frames were thinned.

**Sibling / next:** `MOVE_WHIRLPOOL` stays unsupported after an independent
source, asset, and legal-party both-orientation audit. Its lowest carrier is
challenge-0 set **170** `FRONTIER_MON_WAILMER_1`; its distinct **18** affine
vortex orbs, target palette blend/shake/audio, trap outcome, later repetition/
status-animation variants, and cleanup need independent dense proof. Coverage
is **94 exact / 1 partial / 0 staged / 181 unsupported**. No animation
boundary, unsupported barrier, canonical recording allowlist, or gameplay
ownership changed. Next: finish the bounded Hydro Pump orb/latch and
framebuffer gate, rerun both orientations twice fresh, then independently
accept or reject Whirlpool.

## MOVE_SPORE promoted exact; ANIM_TAG_SPORE track bounded (2026-07-29)

**Verdict:** `MOVE_SPORE` is exact. The lowest suitable legal Level-50
carrier is challenge-2 set **282** `FRONTIER_MON_PARASECT_2` (species **47**,
Spore **147**, Calm, HP+Defense+SpDefense, Leftovers). Complete legal
three-mon Scene-ON parties pass the whole move-owned body through first
inactive cleanup twice fresh in both orientations: player-back frames
**366–572 (207/207)**, evidence/raw
`5b275a53b8339e818fa56c158a04df729d1316fee0005ab11cc1ad1b9c446d40` /
`9730e4ea34ffdaab25796ea069be7270eb36eb9ea05d13cb32c834cb8ea9d0a7`;
opponent-front **370–576 (207/207)**,
`7d723ded7813648cb6a29b9a5aaa651b1d677d9698f35f0aff9005f0410e687b` /
`59a82fde62ce4c89b2a73f0053186df940bd51b39340339ef8fff92282f64e51`.

**Model/evidence:** extraction pins Parasect front/back and both Spore cells.
The relative reducer and typed seam port tag/mon-BG/alpha lifetimes, all nine
staggered `gSporeParticleSpriteTemplate`/`AnimSporeParticle_Step` lifecycles,
OBJ priorities and blending, looped audio, waits, blendoff, and cleanup.
`sporePortable.ts` proves every dense source/component, seam, OAM/matrix,
palette/tag/register/audio/unchanged-state/raw-RGB/production-framebuffer
frame twice fresh; presentation owns no sleep, damage, RNG, turn, controller,
or facility state.

**Sibling / next:** `MOVE_COTTON_SPORE` remains unsupported. Its independent
source audit pins shared art/callback but distinct `splitbgprio`, unblended
particles, audio, and no-alpha/no-`SporeDoubleBattle` body; give it complete
dense both-orientation acceptance before promotion. Coverage is **94 exact /
0 partial / 0 staged / 182 unsupported**; no boundary, barrier, or canonical
recording ratchet moved.

## MOVE_LIGHT_SCREEN promoted exact; SPARKLE_3 track bounded (2026-07-29)

**Verdict:** `MOVE_LIGHT_SCREEN` is exact. The lowest suitable legal
Level-50 carrier is challenge-0 set **112** `FRONTIER_MON_EXEGGCUTE`
(species **102**, Light Screen **113**, Naughty, SpAttack+HP, Persim Berry).
Complete legal three-mon Scene-ON parties pass the full move-owned body
through first inactive cleanup twice fresh in both orientations: player-back
frames **270–384 (115/115)**, evidence/raw
`7c1c3b39e53c00ee0174232a0c05a02ac7f14b6d2aa7478bc2ae372c5d2500a2` /
`b135e9fbf2c70ea860f0ee126959bbb0eaf0c4603566067dd5405c9698a74837`;
opponent-front **176–294 (119/119)**,
`51ffe743621c2745f8a59cd6786bb5d0fa9b12b844ee452d2e7ca729587e20db` /
`654a49bafe3470e81c34dfa1d127d67a78d59eb6d0b6af3c983d36008a8dbf6b`.

**Model/evidence:** reproducible extraction pins Exeggcute front/back,
GREEN_LIGHT_WALL, and SPARKLE_3. The pure relative reducer and typed seam port
`gLightScreenWallSpriteTemplate`/`AnimDefensiveWall`, all six
`gSpecialScreenSparkleSpriteTemplate`/`AnimWallSparkle` lifecycles from
`SpecialScreenSparkle`, alpha, rotating palette, delayed audio, opponent BG
transfer, OAM/VBlank latches, blendoff tail, and first inactive age 74.
`lightScreenEvidence.ts` proves every dense source/component, seam,
software+hardware OAM/matrix/palette/register/audio/immutable-state/raw-RGB/
production-framebuffer frame twice fresh; presentation owns no side
condition, damage, RNG, turn, controller, or facility state.

**Sibling:** `MOVE_MIRROR_COAT` remains unsupported. Its source batch-check
pins lowest carrier set **151** `FRONTIER_MON_CORSOLA` and the independent
RED_LIGHT_WALL/`gMirrorCoatWallSpriteTemplate`, wall-before-audio delay-10
then immediate-playse timing, real prior-special-damage counter staging/result,
and separate palette/audio/register/cleanup acceptance still required twice
fresh in both orientations. Coverage is **93 exact / 0 partial / 0 staged /
183 unsupported**; no boundary or barrier ratchet moved.

## MOVE_BLOCK promoted exact; X_SIGN track bounded (2026-07-29)

**Verdict:** `MOVE_BLOCK` is exact. The lowest suitable legal Level-50
carrier is challenge-0 set **193** `FRONTIER_MON_SUDOWOODO_1` (species
**185**, Block **335**, Hardy, SpDefense+HP, Hard Stone). Complete legal
three-mon Scene-ON parties cover the whole body through first inactive cleanup
twice fresh in both orientations: player-back **373–513 (141/141)**,
evidence/raw
`417c0585860b8396efa41bd2c3e5b2f3b1b90ac55dff7386928a3f6d727707f4` /
`3837aa0b60c7a1f8decf1cae22947e27cd16935f39b562dc430e572ef8432b6c`;
opponent-front **290–435 (146/146)**,
`e7b64ee034e9716237bf376395c329b2d859b66ec469761b4f80311fe982391c` /
`2e66e6ac4aaeaac809890797273f68b37d8f62f107446b9067721695d3eac276`.

**Model/evidence:** reproducible extraction pins Sudowoodo front/back and
X_SIGN with its source-shared HollowOrb palette. The typed reducer ports the
single `gBlockXSpriteTemplate` fall, both sine bounces, side-relative OAM
ordering, all three audio callbacks, seven flickers, wait, destruction, tag
cleanup, and first inactive frame. `blockEvidence.ts` passes every dense
source/component/typed-seam/software+hardware OAM/matrix/palette/register/
audio/state/raw-RGB/production-framebuffer frame in both orientations twice
fresh. Presentation exposes no trapped flag and owns no trap/gameplay effect,
damage, RNG, turn, controller, or facility state.

**Sibling:** `MOVE_ROCK_TOMB` remains unsupported. It independently adds
ROCKS load/free, four `gRockTombRockSpriteTemplate` falls,
`gRedXSpriteTemplate`, `AnimTask_ShakeMon`, platform shakes, audio/waits,
damage/stat/controller presentation and cleanup, and has no complete dense
both-orientation acceptance. Coverage is **92 exact / 0 partial / 0 staged /
184 unsupported**; no boundary or barrier ratchet moved.

## MOVE_WHIRLWIND promoted exact; WHIRLWIND_LINES repair complete (2026-07-29)

**Verdict:** `MOVE_WHIRLWIND` is exact. The lowest suitable legal
Level-50 carrier is challenge-0 set **153** `FRONTIER_MON_BUTTERFREE`
(species **12**, Whirlwind **18**, Quirky, SpAttack+HP, Pecha Berry).
Complete legal three-mon Scene-ON parties cover the body through first
inactive cleanup twice fresh in both orientations: player-back **222–304
(83 frames)**, evidence/raw
`173be41493206cf4b974d0bed0f799c9f6a13d727295421e4262f69f470fd5bc` /
`12653c28b7dd04790d0f2a8fed53b01f672d7da58d0a226a2957ca786aefb59c`;
opponent-front **316–398 (83 frames)**,
`ebf51bc3ffe9f65bc28e5e6e53ca72a92a01c1aaa51a844eb4c80fd5475d014f` /
`ec7f5084e7ba307ef23b567770f1271d48b3449140f9ef1bde357abc1c34d434`.

**Model/evidence:** reproducible extraction pins Butterfree front/back and
WHIRLWIND_LINES. The typed source-relative reducer ports all six
`gWhirlwindLineSpriteTemplate` lifecycles and flip cells,
`AnimTask_ShakeMon2`, `AnimTask_TranslateMonEllipticalRespectSide`,
`AnimTask_SlideOffScreen`, side-relative audio, waits, and cleanup. It owns
no forced switch, damage, RNG, turn, controller, or facility state. The
production compositor ports prior-callback OAM latches, side-relative
SortSprites order, and the established one-frame enemy-shadow latch.

**Acceptance / sibling:** `whirlwindEvidence.ts` passes **83/83** source,
component, typed-seam, software/hardware OAM/matrix, palette/tag, register,
audio, unchanged-state, raw-RGB, and production shared-framebuffer checks in
both orientations, twice fresh. `MOVE_DRILL_PECK` remains unsupported: it adds BowMon phases,
`AnimTask_DrillPeckHitSplats`, repeated IMPACT sprites, looped sound,
ShakeMon2, return slide, and damage/controller presentation, and lacks its
own dense both-orientation acceptance. Coverage is **91 exact / 0 partial /
0 staged / 185 unsupported**; no boundary or barrier ratchet moved.

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
