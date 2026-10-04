# altspecies3 — source-derived window starts for the alternate-species set (ISSUES #142)

Evidence only (new files; no tracked file edited). Supersedes the *start* choices of `docs/altspecies2-before.md`, which came from the live-match finder `altSpeciesFindStart.ts`. Receipt: `tools/integration/fixtures/altspecies3-results.json` (per case: window, derivation, 4 runs with rows/residual/digests, residual rows with bbox/colour attribution for run 0, classification); derivation: `tools/integration/fixtures/altspecies3-derivation.json`; fixtures `tools/integration/fixtures/altspecies3-*.json` (live) + `tools/compare/fixtures/altspecies3-*.json` (source) + `altspecies3-scenarios/`. Raw dirs (gitignored): `.integration/validation/altspecies3-20261004/{pass1,pass2,logs,activation,ptrtrace,fadetrace,png}`.

## Method (no live matching anywhere)

1. `altSpecies3Activation.py` (detection copied from `tools/compare/allocatorNetZeroProbe.py`: `gAnimScriptActive` rising edge with `sAnimMoveIndex == move`; for Bite the probe's runtime Meowth/BITE carrier patch from `poisonFangProbe.py:34-44` is applied) is run on the accepted scenario and on the alternate scenario.
2. Per move: `offset = accepted window start − accepted-scenario activation` (the accepted fixture's own convention: 0 for Karate Chop/Mega Punch/Body Slam/Night Shade/Slash/Brick Break; +3 Calm Mind; +5 Confusion/Psychic/Shadow Ball; +7 Toxic; +10 Bite; Reflect's accepted *live* window starts at the activation, offset 0). The interval is the one at/just before the accepted start (Shadow Ball's accepted window is the first of two uses).
3. `derived start = alternate activation (same interval) + offset`; `altSpecies3Stage.py` (copy of the altspecies2 stager; start read from the derivation, end clipped to the last probe frame) writes the fixtures; each case ran as 2 separate fresh passes x 2 fresh direct-mGBA runs (4 runs; rows, residual, live digest and **source digest identical in all 20 case-runs-sets**).

Result of the derivation: it **agrees with the finder start for 14/16 cases** (so "exact, start caveat" is now exact with a source-derived start). The two that moved: **Bite 70→80** (70 was the Poison-Fang activation of the unpatched scenario; the probe's currentMove window starts at 80, accepted 80) and **Reflect live window 66→65** (activation; the source window itself starts 39 as accepted).

## Corrected per-case table (run 0 shown; residual is identical for runs 0..3)

| case | move | accepted start / offset | derived start | rows | residual px per run (4) | residual rows | first residual row / bbox | class |
|---|---|---|---|---|---|---|---|---|
| bite-player-meowth-opponent-magneton | BITE | 80 / 10 | 80 | 26 | 0/0/0/0 | 0 | - | control-exact |
| body-slam-player-lickitung-opponent-golbat | BODY_SLAM | 303 / 0 | 313 | 107 | 200/200/200/200 | 1 | age 0 bbox 160..191,65..72 | acceptance-142 |
| brick-break-player-lombre-opponent-haunter-shattered | BRICK_BREAK | 288 / 0 | 291 | 192 | 200/200/200/200 | 1 | age 0 bbox 160..191,65..72 | acceptance-142 |
| brick-break-player-lombre-opponent-haunter | BRICK_BREAK | 288 / 0 | 291 | 192 | 1125090/1125090/1125090/1125090 | 152 | age 0 bbox 160..191,65..72 | superseded-staging-artifact |
| calm-mind-player-lunatone-opponent-golbat | CALM_MIND | 294 / 3 | 298 | 101 | 0/0/0/0 | 0 | - | control-exact |
| confusion-player-kadabra-opponent-magneton | CONFUSION | 81 / 5 | 81 | 140 | 0/0/0/0 | 0 | - | control-exact |
| karate-chop-player-primeape-opponent-golbat | KARATE_CHOP | 77 / 0 | 77 | 49 | 0/0/0/0 | 0 | - | control-exact |
| mega-punch-player-cacturne-opponent-magneton | MEGA_PUNCH | 76 / 0 | 76 | 160 | 200/200/200/200 | 1 | age 0 bbox 160..191,65..72 | acceptance-142 |
| night-shade-player-ariados-opponent-golbat-hp160-notail | NIGHT_SHADE | 217 / 0 | 224 | 209 | 200/200/200/200 | 1 | age 0 bbox 160..191,65..72 | acceptance-142 |
| night-shade-player-ariados-opponent-golbat-hp160 | NIGHT_SHADE | 217 / 0 | 224 | 227 | 292024/292024/292024/292024 | 17 | age 0 bbox 160..191,65..72 | rom-tail-variance |
| night-shade-player-ariados-opponent-golbat | NIGHT_SHADE | 217 / 0 | 224 | 227 | 305417/305417/305417/305417 | 227 | age 0 bbox 160..221,65..103 | superseded-staging-artifact |
| psychic-opponent-haunter-player-kadabra | PSYCHIC | 83 / 5 | 83 | 140 | 0/0/0/0 | 0 | - | control-exact |
| psychic-player-kadabra-opponent-golbat | PSYCHIC | 79 / 5 | 79 | 140 | 0/0/0/0 | 0 | - | control-exact |
| reflect-player-shuppet-opponent-golbat | REFLECT | 39 / -26 | 65 | 79 | 200/200/200/200 | 1 | age 0 bbox 160..191,65..72 | acceptance-142 |
| shadow-ball-opponent-golbat-player-sableye-notail | SHADOW_BALL | 260 / 5 | 86 | 132 | 0/0/0/0 | 0 | - | control-exact |
| shadow-ball-opponent-golbat-player-sableye | SHADOW_BALL | 260 / 5 | 86 | 148 | 286896/286896/286896/286896 | 16 | age 132 bbox 0..239,0..111 | rom-tail-variance |
| shadow-ball-player-sableye-opponent-magneton | SHADOW_BALL | 256 / 5 | 260 | 148 | 0/0/0/0 | 0 | - | control-exact |
| slash-player-charmeleon-opponent-magneton | SLASH | 73 / 0 | 73 | 46 | 0/0/0/0 | 0 | - | control-exact |
| toxic-opponent-golbat-player-clamperl | TOXIC | 219 / 7 | 83 | 219 | 0/0/0/0 | 0 | - | control-exact |
| toxic-player-clamperl-opponent-ledian | TOXIC | 219 / 7 | 220 | 219 | 0/0/0/0 | 0 | - | control-exact |

Rows marked `superseded-staging-artifact` are the as-staged fixtures kept as evidence; their corrected variants are `-shattered`, `-hp160`, `-hp160-notail`, `-notail` (same derived start, only the staging defect fixed or the ROM-variable tail excluded by a shorter live `denseWindow`).

## Reliable #142 acceptance fixtures (row-0 enemy-shadow class, 200 px, bbox 160..191,65..72, 200/200 in the shadow mask, nothing else)

* `altspecies3-body-slam-player-lickitung-opponent-golbat` (107 rows)
* `altspecies3-mega-punch-player-cacturne-opponent-magneton` (160)
* `altspecies3-reflect-player-shuppet-opponent-golbat` (79; live window 65..143 = accepted live convention)
* `altspecies3-brick-break-player-lombre-opponent-haunter-shattered` (192; also exercises the shattered-wall branch)
* `altspecies3-night-shade-player-ariados-opponent-golbat-hp160-notail` (209 rows, ages 0..208; the fade tail is excluded, see below)

After the #142 fix each must reach 0 residual on all 4 runs.

## Exact controls (0 residual at the derived start, must stay 0)

karate-chop, slash, bite (corrected), confusion, psychic (player Kadabra / opponent Haunter attacker), toxic (opponent Ledian target / opponent Golbat attacker), shadow-ball (opponent Magneton target), shadow-ball opponent-Golbat attacker `-notail` (132 rows), calm-mind. Because their starts are source-derived, 0 at age 0 proves the live adapter already draws row 0 correctly there (consistent with the issue142 scan); they are real regression controls, not start-biased ones. Elevated *attackers* (Toxic/Golbat, Psychic/Haunter, Shadow Ball/Golbat) show no row-0 shadow residual.

## Attribution of the unattributed families

### Brick Break + HAUNTER (constant ~2587 px/row, ages 23..191): STAGING ARTIFACT — not a live-adapter defect

* Not a window problem: derived start 291 == old start; `altSpecies3AgeScan.ts` shows every source row best-matches the live row of the same age.
* Pixels (`.integration/validation/altspecies3-20261004/png/brick-break-age23-zoom.png`, source | live | diff): the source draws the target blended behind a translucent diagonal-striped 64x64 panel (ANIM_TAG_BLUE_LIGHT_WALL, `gBrickBreakWallSprite`) plus alpha; live draws an opaque Haunter and no panel. Haunter's own sprite/palette/idle/elevation play no role (residual bbox 155..196,9..71 = the panel).
* Source: in this scenario the opponent first uses Reflect (`sAnimMoveIndex` 115, frames 71..149, activation scan; the accepted Onix scenario does the same: 68..146), so `choosetwoturnanim` takes `BrickBreakShatteredWall` (`reference/pokeemerald/data/battle_anim_scripts.s:3709-3740`, `gBrickBreakWallSpriteTemplate`).
* Cause: the live fixture lacked `body: "shattered-wall"`. The accepted checker infers the body from the window length (`tools/compare/brickBreakPortable.ts:125`: 151 rows = normal, else shattered); `tools/integration/liveAdapterFramebuffer.ts:37,70` takes it from `fixture.body` (default normal) and `src/engine/liveMoveAnimation.ts:598` maps `request.turn === 0 ? "normal" : "shattered-wall"`. The 192-row accepted window is a shattered-wall window.
* Proof: `altspecies3-brick-break-...-shattered.json` (same start, `body` added) = **200 px, row 0 only, 192 rows, 4/4 runs**. The species-dependent branch in `src/engine/battleScene.ts` (28571-28578, `liveField || species === "LOMBRE"/"ONIX"`) is bypassed for live fields; no new defect.
* Fix shape (stager, not engine): carry `body` into the live fixture (`shattered-wall` when the accepted window frameCount != 151); `liveAdapterFramebuffer.ts` should apply the same rule so unflagged fixtures cannot silently render the wrong branch.

### Night Shade + GOLBAT (59 px on every row beyond the row-0 shadow): STAGING ARTIFACT (HP profile), plus a ROM tail-length variable

* The 59 px (bbox 191..221,91..103, colours cream/grey) are the player's `HP 160/177` digits and bar end: source shows ARIADOS **160/177** (`night-shade-...-age50-zoom.png`), live **177/177**. The stager's HP profile falls back to the full-HP gen-3 formula when the probe rows carry no battler HP (`altSpecies3Stage.py` `formula_hp`, same code in altspecies2); the accepted Onix fixture records `playerHp 165` (the opponent's Tackle at 74..115 lands before the window). `altspecies3-...-hp160.json` (only `playerHp` fixed) removes the 59 px: ages 1..208 exact.
* Remaining after that: ages 209..224 (16-18 rows, 18,239 px, whole field): see the shared tail variable below. `-hp160-notail` (live window 224..432) = **200 px, row 0 only, 4/4 runs**.

### Shadow Ball (opponent GOLBAT attacker) tail rows 132..147, and the Night Shade tail: ROM behaviour the accepted fixtures never exercised (not species-dependent, not a live defect)

* `altSpecies3AgeScan.ts`: from age 132 (Shadow Ball) source row N equals live row N-1 (source one frame **later**); from age 209 (Night Shade) source row N equals live row N+1 (source one frame **earlier**); heads are exact, rows reconverge on the final static frame.
* Script-pointer schedules (`ptrtrace/`, `A3_TRACE_PTR=1`): the only differing command is the last `waitbgfadein` after `restorebg` (Night Shade `0x82d35ca`: 39 frames accepted vs 38 alt; Shadow Ball `0x82d36a7`: 38 vs 39). Same-scenario proof that species is not the cause: the **accepted Shadow Ball scenario itself** has two uses with 154- and 155-frame scripts (38- then 39-frame final wait).
* `fadetrace/` (`gPaletteFade` per frame): both runs execute the same 16-step fade-out and 16-step fade-in; they diverge at relative frame 19, where `Task_FadeToBg` (`reference/pokeemerald/src/battle_anim.c:1148-1175`) spends **one or two** inactive frames between the fade-out ending (state 1 → `sAnimBackgroundFadeState = 2`) and `LoadMoveBg` + the fade-in start (state 2). That inter-state stall is 1 or 2 frames depending on task/main-loop ordering; I did not prove what selects it (hypothesis: task-slot/priority ordering, i.e. scenario history), only that it is in the ROM, not species- or sprite-dependent.
* Verdict: not a species-hardcoded branch; live models one value (the accepted scenario's). Fix shape if desired: make the `restorebg`/`fadetobg` inter-state stall (1|2 frames) an input of the live view (taken from the real task schedule) rather than a constant. For #142 acceptance use the `-notail` windows.

## Other findings

* Bite (old 88,522 px) was a **staging artifact**: `poisonFangProbe.py` patches species 41 → MEOWTH at run time (move 44); the stager read the unpatched scenario and wrote `attacker.species: ZUBAT`. With `MEOWTH` (and start 80) Bite is **exact**; stager fixed in `altSpecies3Stage.py`.
* Reflect and Shadow Ball (opponent Golbat) were not window-misaligned in the way suspected: Reflect now shows the clean 200 px class at live start 65; Shadow Ball's start (86) was already source-correct, its tail is the ROM variable above.
* The old altspecies2 receipt's "NEW unclassified" families contain **no new live-adapter defect**; the only live-adapter defect in the set is still #142 row-0 shadow.

## Reproduce

```
python3 tools/integration/altSpecies3Derive.py .integration/validation/altspecies3-20261004/derive.json   # activation + offsets (copy to fixtures/altspecies3-derivation.json)
for c in $(python3 -c "import json;[print(r['case']) for r in json.load(open('tools/integration/fixtures/altspecies3-derivation.json'))]"); do python3 tools/integration/altSpecies3Stage.py write $c; done
export A3_ROOT=.integration/validation/altspecies3-20261004
for p in 1 2; do ls tools/integration/fixtures/altspecies3-*.json | grep -v -E "derivation|results" | xargs -P 8 -I{} tools/integration/altSpecies3Run.sh $p {}; done
node --experimental-strip-types tools/integration/altSpecies3Receipt.ts $A3_ROOT && python3 tools/integration/altSpecies3Classify.py
# diagnostics: altSpecies3AgeScan.ts, altSpecies3DiffPng.ts, A3_TRACE_PTR=1 / A3_TRACE_FADE=1 altSpecies3Activation.py
```
(`liveAdapterFramebuffer.ts` exits 1 when residual exists. The `-shattered`, `-hp160`, `-hp160-notail`, `-notail` variants are hand-derived copies of the staged live/source fixtures.)
