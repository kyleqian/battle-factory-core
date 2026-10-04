# Alternate-species acceptance set for ISSUES #142 — BEFORE the fix (Scene ON fixtures, current code)

Evidence only (new files). Stager `tools/integration/altSpecies2Stage.py` (cases `altSpecies2Cases.json`, start finder `altSpecies2Find.sh`, runner `altSpecies2Run.sh`, receipt `altSpecies2Receipt.ts`) are copies of the altSpecies tools with the prefix `altspecies2-`. Scenarios: `tools/integration/fixtures/altspecies2-scenarios/` (legal mechanicLab `overrides.parties`: accepted scenario with ONE slot-0 species swapped; no transient state). Source fixtures `tools/compare/fixtures/altspecies2-*.json`, live fixtures `tools/integration/fixtures/altspecies2-*.json`, receipt `tools/integration/fixtures/altspecies2-before.json` (per case: roles, rows, residual per run, digests, residual rows with bbox/mask/colour attribution for run 0), summaries `tools/integration/fixtures/altspecies2-evidence/`. Raw dirs (gitignored): `.integration/validation/altspecies2-20261004/{pass1,pass2,logs}`.

Every case ran twice as separate fresh invocations (pass1, pass2), each with 2 fresh direct-mGBA source runs: 4 runs/case, identical rows+source digests for all 16.

## Results (16 staged cases)

| case | move | opponent species (role) | rows | residual px/run | residual rows | class |
|---|---|---|---|---|---|---|
| body-slam-player-lickitung-opponent-golbat | 34 | GOLBAT target | 107 | 200 | age 0 (bbox 160..191,65..72, 200/200 in shadow mask) | #142 shadow |
| mega-punch-player-cacturne-opponent-magneton | 5 | MAGNETON target | 160 | 200 | age 0, same | #142 shadow |
| brick-break-player-lombre-opponent-haunter | 280 | HAUNTER target | 192 | 1,125,090 | age 0 = 200 (shadow) **plus 151 rows, ages 23..191, ~2587 px each** | shadow + **NEW (unclassified)** |
| bite-player-meowth-opponent-magneton | 44 | MAGNETON target | 26 | 88,522 | all 26 rows, 2112..2893 px (age 0 includes the 200 shadow px) | **window/alignment unresolved**, see below |
| night-shade-player-ariados-opponent-golbat | 101 | GOLBAT target | 227 | 305,417 | all rows; age 0 259 (200 shadow + 59), then 59 px every row | **unresolved**, see below |
| reflect-player-shuppet-opponent-golbat | 115 | GOLBAT bystander | 79 | 105,965 | ages 8..78 ~2600 px (bbox 91..132,48..111; best shift dx-1,dy+1) | **unresolved** (live window start guessed) |
| shadow-ball-opponent-golbat-player-sableye | 247 | GOLBAT attacker | 148 | 286,896 | 16 rows ages 132..147 (17,931 px, full field) | **unresolved** (tail rows, start by finder 86) |
| karate-chop-player-primeape-opponent-golbat | 2 | GOLBAT target | 49 | 0 | – | exact (scan: already draws row 0) |
| slash-player-charmeleon-opponent-magneton | 163 | MAGNETON target | 46 | 0 | – | exact (scan: already draws row 0) |
| confusion-player-kadabra-opponent-magneton | 93 | MAGNETON target | 140 | 0 | – | exact, but see start caveat |
| psychic-player-kadabra-opponent-golbat | 94 | GOLBAT target | 140 | 0 | – | exact, start caveat |
| psychic-opponent-haunter-player-kadabra | 94 | HAUNTER attacker | 140 | 0 | – | exact, start caveat |
| toxic-player-clamperl-opponent-ledian | 92 | LEDIAN target | 219 | 0 | – | exact, start caveat |
| toxic-opponent-golbat-player-clamperl | 92 | GOLBAT attacker | 219 | 0 | – | exact, start caveat |
| shadow-ball-player-sableye-opponent-magneton | 247 | MAGNETON target | 148 | 0 | – | exact, start caveat |
| calm-mind-player-lunatone-opponent-golbat | 347 | GOLBAT bystander | 101 | 0 | – | exact, start caveat |

Species legality: elevated attackers are Factory carriers (Toxic: GOLBAT/LEDIAN-class; Psychic: HAUNTER; Shadow Ball: GOLBAT; from `battle-frontier-mons.json`); the swapped mon keeps the accepted scenario's four identical carrier moves (same convention as `altspecies-live-evidence.md`).

## Reading

* **#142 confirmed on older adapters**: Body Slam and Mega Punch (non-attacking elevated opponent) show exactly the 200 px age-0 shadow residual, rows 1.. exact. Brick Break age 0 is the same 200 px.
* **Start caveat**: cases with no script flag in the probe (Toxic, Confusion, Psychic, Shadow Ball, Calm Mind, Reflect, and the opponent-attacker ones) took their start from `altSpeciesFindStart.ts`, which selects the start where live matches source over ages 0..7. A start one frame late hides a row-0 shadow, so "exact" there is NOT proof that row 0 is fine. The issue142 scan (live view) says Toxic 92, Confusion 93, Psychic 94, Shadow Ball 247, Calm Mind 347 do not draw row-0 shadow; the fix step must re-derive the true window start (frame where the move script becomes active minus the display lag, see Hyper Fang 81 vs 85 in the earlier doc) before trusting these. Karate Chop 2 and Slash 163 already draw it (scan) and are exact.
* **NEW, not the #142 shadow class**: Brick Break + HAUNTER, ages 23..191 constant ~2587 px per row (needs attribution; may be a HAUNTER-specific body/sprite offset or the window alignment since start 291 was flag-derived vs accepted 288). Night Shade + GOLBAT: 59 px persistent on every row beyond the shadow. Bite + MAGNETON, Reflect + GOLBAT, Shadow Ball opp GOLBAT tail rows: likely start/window misalignment (Bite start 70 from probe flag vs accepted 80, Reflect live window 66+79 assumed from accepted shift 26, Shadow-Ball-opp start 86 chosen by finder across a 148-row window with a trailing divergence); not attributed in this session (45 min cap). Treat as unresolved, do not use as acceptance until windows are re-derived.

## Recorded negatives (could not stage / run)

* Thunder Punch 9: accepted scenario uses `playerSetIds`/`opponentSetIds` with no `overrides.parties`; no legal species swap without building parties (not done).
* Swagger 207 RATTATA opponent attacker: probe over `mechanic-poison-fang-opponent-zubat-player-onix` with opponent swapped to RATTATA recorded 0 frames (no prompt reached). Hyper Fang RATTATA already covers x2=1 (earlier doc).
* Razor Leaf 75, Haze 114, Light Screen 113: the accepted window start is not a row of the swapped probe, so the finder could not be seeded (`StopIteration`); Confuse Ray 109: accepted fixture has no window (whole-probe trace), not staged; Swords Dance 14 / Screech 103: no portable source fixture in `tools/compare/fixtures` with a parties scenario; not staged.
* Elevated carriers do not exist in Factory sets for Karate Chop, Mega Punch, Thunder Punch, Razor Leaf (no attacker cases).

## Fixtures the fix step must turn exact
Certain: `altspecies2-body-slam-player-lickitung-opponent-golbat`, `altspecies2-mega-punch-player-cacturne-opponent-magneton`, `altspecies2-brick-break-player-lombre-opponent-haunter` (age 0 only; the later rows need separate attribution). Conditional on re-derived starts: confusion, psychic (x2), toxic (x2), shadow-ball (x2), calm-mind, reflect, night-shade, bite. Already exact controls: karate-chop, slash.

## Reproduce
```
python3 tools/integration/altSpecies2Stage.py write <case> [start]     # or tools/integration/altSpecies2Find.sh <case> for start-frame probes
for p in 1 2; do ls tools/integration/fixtures/altspecies2-*.json | grep -v before | xargs -P 8 -I{} tools/integration/altSpecies2Run.sh $p {}; done
node --experimental-strip-types tools/integration/altSpecies2Receipt.ts .integration/validation/altspecies2-20261004
```
(`liveAdapterFramebuffer.ts` exits 1 when residual exists — the finding.)
