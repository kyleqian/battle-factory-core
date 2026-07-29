# Animation coverage

## MOVE_HYPNOSIS bounded partial; GOLD_RING track proven short of framebuffer (2026-07-29)

**Verdict:** `MOVE_HYPNOSIS` is a durable partial, not exact. The Level-50
eligibility graph rejects source set 38 Hoothoot; challenge-1 set **265
POLITOED_1** is the lowest legal carrier. Complete legal Scene-ON parties
pass the entire body through first inactive cleanup twice fresh in both
orientations: player-back **74–242 (169/169)**, evidence/raw
`6b164293b9a3ad086504808422b0f95ab07ccd84595eb87b3ca908e34189b0c4` /
`7c06a1b4825562841f65768ae6b9a97374dba4a727a0ecd59f28220deddf10a1`;
opponent-front **78–245 (168/168)**,
`8baa59de6a99008bebd74e72b4089c6146f5f98fefd03ca7805a84412b4f100b` /
`69b6f767aef05462568e2229c129b620b2ebfa6da399d072507eaa438ee453ec`.

**Landed / gate:** source extraction pins Politoed front/back + GoldRing.
The pure reducer and portable comparator prove all six 27-tick
`gGoldRingSpriteTemplate` paths, side geometry, psychic-BG BLDY, blend-task
lifetime, sound triggers, waits/cleanup, OAM/matrices, palettes/tags,
registers/audio fields, unchanged gameplay state, and raw RGB. Exact remains
blocked only on a typed seam plus every **169/168** production shared
framebuffer matching: psychic palette rotation, target tint, ring ordering/
latches, Politoed idle latches, audio semantics, and cleanup. `MOVE_PSYBEAM`
remains unsupported: lowest carrier set **145 SPINDA**; eleven shorter rings,
SwayMon, two-leg tint, and `LoopSEAdjustPanning 3/4/0/15` need independent
dense evidence. Coverage is **95 exact / 1 partial / 0 staged / 180
unsupported**. No boundary list, barrier, canonical allowlist, sleep,
damage, RNG, controller, turn, or facility state changed.

## MOVE_HYDRO_PUMP promoted exact; WATER_ORB repair complete (2026-07-29)

**Verdict:** `MOVE_HYDRO_PUMP` is exact. Complete legal three-mon Scene-ON
parties pass the full 141-frame move-owned body through first inactive cleanup
twice fresh in both set-303 MASQUERAIN orientations: player-back **213–353
(141/141)**, evidence/raw
`9c8210033328ee98ceae81e54e2d4ec36ecbc4a763deb925171f23f6ef117af7` /
`360d0d7292aa8fa6125f3de46d5170d2d1a3ca62181ada3cdf11ff1cff779706`;
opponent-front **232–372 (141/141)**,
`3330496d0d3dd1feec78443a274380e43b593250459b36ed0b6976ae2e105880` /
`ff315fb58f55bcaa8c5e728faa33635d97e41d624747d867d4f1c9487fc06cee`.

**Repair/evidence:** the source-relative reducer and typed seam cover all
**44** sine WATER_ORBs, **12** WATER_IMPACT splats, tasks, tags, registers,
audio, waits, and cleanup. The repair ports the clamped audio display latch
separately from sound-task lifetime, prior-frame battler offsets and the
opponent enemy-shadow latch, plus `sprite.c`'s stable priority/Y ordering
across reused OAM slots; splat relative priority 4 resolves in front of the
beam's relative priority 3. `hydroPumpPortable.ts` proves every dense
source/component, seam, software/hardware OAM/matrix, palette/tag/register/
audio/unchanged-state/raw-RGB/production-framebuffer frame twice fresh.

**Sibling / next:** `MOVE_WHIRLPOOL` remains unsupported/audit-only. Its
lowest carrier is set **170** `FRONTIER_MON_WAILMER_1`; its distinct **18**
affine vortex orbs, target blend/shake/audio, trap outcome, later repetition/
status-animation variants, and cleanup need independent complete dense
both-orientation acceptance. Coverage is **95 exact / 0 partial / 0 staged /
181 unsupported**. No animation boundary, unsupported barrier, canonical
recording allowlist, or gameplay ownership changed.

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
