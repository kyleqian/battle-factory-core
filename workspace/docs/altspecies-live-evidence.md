# Alternate-species live-adapter framebuffer evidence (Scene ON)

Evidence only; no production code, test, or existing tracked file was touched. Every live
adapter's accepted dense proof uses one species pair; a read-only audit suspected
species-dependent behaviour no gate sees. This document decides two suspects with ROM evidence.

## Method

* 12 new legal `mechanicLab` `overrides.parties` scenarios (three complete Pokémon per side, all
  four slots of the move carrier identical, no injected transient state) under
  `tools/integration/fixtures/altspecies-scenarios/`. Each is an accepted scenario with ONE
  slot-0 species swapped (`tools/integration/altSpeciesCases.json`, stager
  `tools/integration/altSpeciesStage.py`). Genderless species use `gender:"genderless"`.
* New source fixtures `tools/compare/fixtures/altspecies-<case>.json` and live fixtures
  `tools/integration/fixtures/altspecies-<case>.json` (accepted fixture shape, same probe).
  Windows are the move's script activation through cleanup, same frame count as the accepted
  fixture. Probes that record a script flag/`sourceWindow` give the start directly; start-frame
  probes (Acid, Synthesis) and Hyper Fang were located with `altSpeciesFindStart.ts`
  (best live-vs-source match over ages 0..N; Hyper Fang start 85, flag said 81 — 0 residual at 85).
  A faster opponent moving first just lengthens the trace (`extraFrames`, default +300 on the
  last segment; not a transient-state injection).
* Dense comparison = `liveAdapterFramebuffer.ts` (production live path vs fresh direct-mGBA
  source). Run twice as separate fresh invocations (`pass1`, `pass2`), each doing 2 fresh source
  runs: 4 fresh runs per case, digests (rows incl. source RGB hashes) identical for all 12.
* Residual attribution: `altSpeciesAnalyze.ts` (pixel count, bbox, overlap with the source-derived
  enemy-shadow mask `src/assets/gen/battle-enemy-shadow.json`, source/live colour pairs,
  best integer shift fit). Receipt: `tools/integration/fixtures/altspecies-live-evidence.json`;
  per-case row summary JSON: `tools/integration/fixtures/altspecies-evidence/`. Raw RGB/run dirs
  and the first-residual-row source|live|diff PNGs (`png/<case>/first-residual-age0.png`, one per
  residual case, from pass1 run0) are under the gitignored `.integration/validation/altspecies-20261004/{pass1,pass2,png}`.

## Results (all 12 cases: 4 fresh runs, identical digests)

| case | move | opponent (elevated?) | attacker | rows | residual px/run | residual rows |
|---|---|---|---|---|---|---|
| acid-player-ekans-opponent-golbat | ACID | GOLBAT (yes) target | player | 131 | 0 | – |
| mud-shot-player-krabby-opponent-magneton | MUD_SHOT | MAGNETON (yes) target | player | 145 | 200 | age 0 |
| flame-wheel-player-quilava-opponent-golbat | FLAME_WHEEL | GOLBAT target | player | 170 | 200 | age 0 |
| heat-wave-player-ninetales-opponent-haunter | HEAT_WAVE | HAUNTER target | player | 168 | 200 | age 0 |
| block-player-sudowoodo-opponent-golbat | BLOCK | GOLBAT target | player | 141 | 200 | age 0 |
| torment-player-murkrow-opponent-golbat | TORMENT | GOLBAT target | player | 177 | 200 | age 0 |
| torment-opponent-koffing-player-onix | TORMENT | KOFFING **attacker** | opponent | 177 | 200 | age 0 |
| detect-player-yanma-opponent-golbat | DETECT | GOLBAT bystander | player | 110 | 200 | age 0 |
| synthesis-player-skiploom-opponent-magneton | SYNTHESIS | MAGNETON bystander | player | 130 | 0 | – |
| synthesis-opponent-jumpluff-player-onix | SYNTHESIS | JUMPLUFF **attacker** | opponent | 130 | 0 | – |
| hyper-fang-opponent-rattata-player-onix | HYPER_FANG | RATTATA (x2=1) attacker | opponent | 107 | 0 | – |
| sandstorm-opponent-onix-player-phanpy | SANDSTORM | ONIX (x2=1) attacker | opponent | 168 | 180,304 | all 168 (903–1091 px each) |

Windows (source frames) are in the receipt (`window`) and in each source fixture.

### Residual attribution

**Age 0, 200 px, in 8 cases** (Mud Shot, Flame Wheel, Heat Wave, Block, Torment x2, Detect; Acid and
Synthesis are exact): identical in every case — bbox x160..191, y65..72, 200/200 px inside the
source enemy-shadow mask (`LoadAndCreateEnemyShadowSprites`, singles opponent centre (176,69), 32x8),
source colour (82,107,99) = the shadow colour on every pixel, live shows the battle background
(189,189,156). Rows 1..N are exact. I.e. the ROM displays the elevated shadow on the body's FIRST row
(SpriteCB_EnemyShadow hides it only while `gAnimScriptActive`, observed one display frame late), and
the live branch first draws it at age 1.

**Sandstorm with opponent ONIX attacker, every row**: bbox x149..204, y12..71 (the Onix front
sprite). At ages 0..9 and 163..167 a +1 px horizontal shift of the live body reproduces the source
to within 42 px (so the source body sits at x2=+1 = ONIX front-idle rest offset). Ages 10..162 have the
same bbox/count (1091 px, same pixel set) but the sandstorm blend over a scrolling BG makes a pure
shift fit inapplicable; colour pairs are one-palette-step neighbours (e.g. src(214,181,155)→live(182,148,123)),
consistent with edge pixels displaced by the missing offset. Source check: the Sandstorm branch
(`src/engine/battleScene.ts` ~17798) uses `onixIdle = playerToOpponent ? rest(opponent species) : {0,0}`,
so an opponent attacker never gets its rest offset. The 42 px that survive a shift at age 0 are
not separately attributed.

## Verdicts

| suspect | verdict |
|---|---|
| S1. Elevated-opponent shadow absent on row 0 in several new live branches | **CONFIRMED**: Mud Shot, Flame Wheel, Heat Wave, Block, Torment, Detect: exactly 200 px at age 0 (rows 1.. exact) for a non-attacking elevated opponent (GOLBAT, MAGNETON, HAUNTER); Torment with elevated opponent **attacker** (KOFFING) identical. Acid and Synthesis (both attacker roles) already draw it at age 0: **REFUTED** for those. Detect/Synthesis show the shadow is needed even when the move is self-targeted. |
| S1b. "Shadow only matters when the opponent attacks" | **REFUTED**: it is needed whenever an elevated species is the opponent battler, as target, attacker or bystander. |
| S2. Opponent-attacker front-idle rest offset missing | **CONFIRMED for Sandstorm** (ONIX, all 168 rows, 903–1091 px). **REFUTED for Hyper Fang** (RATTATA x2=1 exact, 107 rows). Heat Wave, Block, Mud Shot, Hydro Pump, Bubble Beam, Cross Chop, Sludge, Role Play, Spite: **not testable** — no legal Factory ONIX/RATTATA carrier of those moves (ONIX: Rock Slide, Bind, Dragon Breath, Sandstorm; RATTATA: Hyper Fang, Pursuit, Quick Attack, Swagger). Recorded negative; the code paths named in the audit remain unproved for ONIX/RATTATA attackers. |
| Mud Shot vs GOLBAT | recorded negative: Ground vs Flying is immune, no animation runs (MAGNETON used). |
| Elevated opponent attacker for Mud Shot, Acid, Flame Wheel, Heat Wave, Block | recorded negative: no elevated species carries those moves in a Factory set (only KOFFING Torment, SKIPLOOM/JUMPLUFF Synthesis, YANMA Detect do; Yanma Detect/Skiploom Synthesis are already accepted fixtures). |

## Generic rule supported

1. For every body, an elevated opponent species (the 61 in `battle-enemy-shadow.json`) shows its
   shadow (32x8 mask at (160,65)) from the first displayed row, independent of attacker side, target,
   or whether the move is self-targeted. A live branch must draw it at age 0.
2. An opponent-front attacker with a non-zero front-idle rest offset (ONIX, RATTATA: x2=1) is
   displayed at that offset from row 0 through the window. Hyper Fang does this; Sandstorm does not.
3. Species-parametric proofs matter: the accepted ONIX target hid both effects for the player-attacker
   branches (ONIX is not elevated, and the player side has no idle offset).

## Reproduce

```
python3 tools/integration/altSpeciesStage.py write <case> [start]     # stage + source/live fixtures
FX=(tools/integration/fixtures/altspecies-*.json)
for p in 1 2; do POKEBENCH_LIVE_EVIDENCE_DIR=.integration/validation/altspecies-20261004/pass$p \
  node --experimental-strip-types tools/integration/liveAdapterFramebuffer.ts "${FX[@]}"; done
node --experimental-strip-types tools/integration/altSpeciesReceipt.ts .integration/validation/altspecies-20261004
```
(`liveAdapterFramebuffer.ts` exits 1 when residual exists; that is the finding, not a tool error.
The Hyper Fang and Sandstorm fixtures at their recorded starts need no extra arguments.)
