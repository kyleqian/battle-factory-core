# Icy Wind / Blizzard at arbitrary species geometry (S10A geoice, 2026-10-09)

Receipt: `tools/integration/fixtures/geoice-live-receipt.json` (base `7da7bbfa3` src `21729666`, code `068b59e9d` src `df4b263e`).
Tests: `tests/icyWindBlizzardGeometry.test.ts`.

## Question and answer

Before this step the live seam (`liveMoveAnimation.ts` `provableEffectOrder`) declined every species pair whose geometry made
the reducers' CreateSprite / SortSprites replay disagree with the OAM slot table captured at the accepted geometry
(`icyWind.ts` / `blizzard.ts` threw "allocated slot X, expected Y"). Census seeds 0..999: 256 commands / 62,491 fallback frames.

**The replay is source-faithful at other geometries.** On every window row of 15 previously declined pairs (fresh direct-mGBA
probes, two runs each, equal) the replay's slots equal the ROM `gSprites` slots holding a sprite at the same position, and its
per-age order equals ROM `sSpriteOrder` restricted to the effect slots — including the 41..54 rows per pair where the derived
slots differ from the retained table (`tools/integration/geoiceSlotCheck.ts`, `fixtures/geoice/slot-check*.json`).

## Production

- `icyWind.ts` / `blizzard.ts`: the `*_OAM_SLOTS` tables are gone. One cached replay per (side, geometry) of source CreateSprite
  (lowest free slot of the pool) / DestroySprite / SortSprites gives each sprite's slot (reducer state `oamSlot`) and the per-age
  order (`*EffectOamOrderAtAge`); renderer and checks share it. The retained table survives only as check data
  (`RETAINED_*` in `geoiceSlotCheck.ts`); the test pins replay == table at the accepted geometry.
- `battleScene.ts` Blizzard: the player attacker now follows every particle. ROM `gSprites[].subpriority` (offset 0x43) is 30 for
  the player battler and 3 for the particles, so SortSprites puts the attacker behind them whatever its y. The old y-insertion
  rule ("Pelipper shares subpriority 0") only happened to be pixel-neutral at the accepted PELIPPER geometry; CHARIZARD -> GOLBAT
  showed it (ages 82..84, 92..94, 117..119, 127..129).
- `provableEffectOrder` now declines only when (a) the replay's slot pool is exhausted (none seen), or (b) Blizzard's
  geometry-derived impact start + 164 != the fixed live window (372 player / 361 opponent). The opponent side's impact start
  moves 194..206 with the pair (traveling particles' cleanup): of 493 opponent geometries only those at 197 fit the window.
  ROM control: ARBOK -> CATERPIE (impact 198) runs 361 rows from activation where the impact-197 pairs run 360. The old gate
  accepted 50 of its 89 opponent geometries at the wrong impact start; none occurred in census seeds 0..299.

## Evidence grid (live window through the production renderer, two fresh runs, r1 == r2 everywhere)

| move | side | pairs | result |
| --- | --- | --- | --- |
| Icy Wind | player | ONIX->GOLBAT, FEAROW->CHARIZARD, VENUSAUR->LUVDISC, BULBASAUR->METAPOD | 3 x 287 rows 0 px; BULBASAUR->METAPOD ROM body 286 rows: ages 0..262 0 px, restorebg tail 263..285 |
| Icy Wind | opponent | MASQUERAIN->ONIX, FEAROW->WEEDLE, ZUBAT->BUTTERFREE, KADABRA->BULBASAUR | 3 x 287 rows 0 px; ZUBAT->BUTTERFREE as above |
| Blizzard | player | ONIX->MASQUERAIN, CHARIZARD->GOLBAT, WARTORTLE->HOPPIP, BULBASAUR->HOPPIP | 4 x 372 rows 0 px |
| Blizzard | opponent | BLASTOISE->IVYSAUR, ZUBAT->NIDOKING, BLASTOISE->BLASTOISE | 2 x 361 rows 0 px; BLASTOISE->BLASTOISE ROM body 360 rows: ages 0..337 0 px, tail 338..353 |

Elevated / low / high picture y are covered (attacker y 31..104, target y 31..104). Blizzard opponent has 3 pairs: only 6
declined geometries keep impact 197; ZUBAT->CHARIZARD / PIDGEY->DODRIO cannot move first in the lab setup and PIDGEY->ONIX's
Blizzard misses. Controls at geometries live before this step: Icy Wind RATTATA->CHARIZARD / LUVDISC->BULBASAUR and Blizzard
CHARIZARD->WARTORTLE / BULBASAUR->METAPOD 0 px; Icy Wind ONIX->MASQUERAIN / ZUBAT->ONIX have the one-row-shorter ROM body too.

## The restorebg tail (not sprite order)

In 3 / 15 pairs (and 2 / 4 previously live Icy Wind controls) the ROM body is one row shorter: `Task_FadeToBg` state 2
(LoadDefaultBg + the fade-in) runs one frame earlier, every row before it is exact and only the BG fade-in tail differs (Icy Wind
18 rows, Blizzard 16). Same class as the documented Faint Attack DELCATTY -> GOLEM restore-fade tail. It is a CPU-load lag phase
(whether the LoadDefaultBg frame overruns VBlank), species-dependent, not predicted by any model here, and it already applied to
the geometries live before this step. Not gated; recorded per pair in the receipt (`documentedTailAges`).

## Order history

The replays seed from constant pool projections, not the order lend. Slots depend only on the free slot set (allocator gate),
never on the order. Permuting the pre-move order (test + 40 random permutations x 11 geometries): Blizzard's effect order never
changes (no exact key ties); Icy Wind's changes only among the ice spikes (ages 192..232), which share one key (same y and
subpriority) and sit in disjoint 8-px columns (SPIKE_X step 8), so the tie order is pixel-neutral. ROM: the 15 probes run the ice
body first (known-entry order `4,3,5,...`); the constant seed is the after-Tackle order `3,4,5,...`; every row matches.

## Census (seeds 0..299, `prep43CensusDelta.py`)

85.71 -> 86.37 % live by count, 85.41 -> 86.73 % by frames (+53 commands / +15,466 frames: Icy Wind 37 player + 13 opponent,
Blizzard 3 player), 0 regressions, command sequence identical, battle digest identical. Still declined in the bucket: 5 Blizzard
opponent commands (impact start != 197) and the other moves' case-local gates. Accounting (`remainingAdaptersCensus.mjs`) unchanged.

## Not done / next

- Blizzard's ORDER-HOST body plan (opponent side, geometry-keyed; `order host: no EXACT plan: body 59:opponent`, 10 commands /
  1,826 frames) is unchanged. Next instrument: the replay's post-body free order (dummy keys of the destroyed particles) against
  ROM `sSpriteOrder` after the body per geoice Blizzard probe, prep45Check-style, then a geometry-keyed plan text as gdgeo.
- Blizzard opponent at impact start != 197: DONE in S10A lsbz (`liveMoveAnimationDuration(59)` = impact start + 164 from the displayed
  field; `docs/faithful-timing-policy.md` "lsbz (B)").
- The restorebg lag phase needs a CPU-load model (D4 policy) to become exact on every pair.

Reproduce: `python3 tools/integration/geoiceStage.py [--controls]`, then per fixture
`POKEBENCH_LIVE_EVIDENCE_DIR=<dir> node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts <fixture>`,
`node --experimental-strip-types --no-warnings tools/integration/geoiceSlotCheck.ts <dir> <out.json> <fixtures...>`,
`python3 tools/integration/geoiceReceipt.py <dir> <commit>`; scan: `tools/integration/geoiceScan.ts` (~6 min).
