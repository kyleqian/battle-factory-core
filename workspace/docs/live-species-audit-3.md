# Live adapter species audit 3 (S10A side lane, 2026-10-06): the adapters promoted this session

Same method as `docs/live-species-audit.md` / `-2.md`: swap the species in a copy of the accepted lab scenario, **derive the window, the healthbox HP /
gender, the attacker personality and (Random2 moves) the pinned `presentationRngActivation` from the swapped scenario's OWN ROM state** (prep14Probe
`atActivation`: activation frame + accepted offset 0, `gBattleMons`, `gRng2Value`; never live output; turn-order changes replayed as `precedingBodies`,
so the merged #148 x2 tracker supplies the history), run the production live view against fresh direct-mGBA frames, **2 fresh runs with identical
digests for every row** (`identical true` in all 89 receipts). Evidence (compact, no RGB / mGBA logs): `tools/integration/fixtures/species-audit-3/`.

## 1. Results first

89 swapped rows run (67 target swaps + 22 attacker swaps): **84 exact, 5 residual** -> 3 SPECIES-DEFECTs (each proven 0 px by a reverted in-place patch,
2 identical fresh runs), 1 LAG FRAME (confirmed by counters and a ROM-frame-offset test), 1 UNRESOLVED (9 px).

### Defect table (patches in `fixtures/species-audit-3/patches/`, receipts in `patch-receipts/`)

| Move (id) | Side / species | px (before -> after patch) | Mechanism | File:line (production) | Fix shape | Residual colours (ROM<-live) |
|---|---|---|---|---|---|---|
| **Ice Beam (58)** | player attacker, opponent **RATTATA** (any target with front-idle x2 != 0; ONIX-like) | 15,990 -> **0** (164/203 -> **203/203**) | Before monbg takes over (ages 0-38) the target is drawn as an OBJ at `spriteCorner.x + targetX2` where `targetX2 = sourceShake(age)` = 0. The ROM target OBJ still carries its idle `x2` (RATTATA +1; ROM `battlerX2Y2` = (1,0)), so the live sprite is 1 px left. Ages 39+ already exact (monbg base uses `frontIdleRest.x2`, `liveMoveAnimation.ts:2265`). Shift fit: live moved +1 px matches ROM (410 -> 102 px at age 0, the rest is the beam/crystal overlap); the gated patch = 0 px | `src/engine/battleScene.ts:15763` (`drawTarget` in the ICE_BEAM branch) | draw at `corner.x + targetX2 + (age < 39 ? targetAnchors.frontIdleRest.x2 : 0)`; carry the tracked target x2 through `SceneOnIceBeamConfig` (the live config already has `liveBattlerAnchors(target).frontIdleRest.x2` at `liveMoveAnimation.ts:2265`). Accepted SHUCKLE/ONIX pairs have x2 = 0 so they cannot expose it. Proven with `+ (iceBeamState.age < 39 ? 1 : 0)` | bbox x163-190 y41-71, 410 px/age ages 0-38: `101010<-bdbd9c`, `633152<-101010`, `633152<-b573b5` (whole target outline 1 px) |
| **Water Spout (323)** | player attacker, opponent **RATTATA** | 48,755 -> **0** (151/270 -> **270/270**) | `drawTarget` places the target at `corner.x + taskOamDisplayed.targetX2` (the HorizontalShake write only); the ROM holds the idle x2 (+1 for RATTATA) until the shake task ends (age 119; proof: `+1` for all ages broke ages 119-269 (61,089 px), `+1` for age < 119 = 0 px). Also 410 px/age, same colour pairs as Ice Beam | `src/engine/battleScene.ts:14920` | add the tracked target x2 (`liveBattlerAnchors(target).frontIdleRest.x2` / `battlerX2Input`) into `WaterSpoutLiveInputs` and draw `corner.x + targetX2 + idleX2` for ages before the shake end (<119); plumb as for Ice Beam. Proven with `+ (waterSpoutState.age < 119 ? 1 : 0)` | bbox x163-190 y41-71, 410 px/age ages 0-118 (age 117: 375): same pairs as Ice Beam |
| **Astonish (310)** | player attacker, opponent **GOLBAT** (any elevated target) | 3,351 -> **0** (33/63 -> **63/63**) | droplet origin y = `targetCenter.y + 32 - targetPictureYOffset`. GOLBAT: center y 35 (ROM droplet spawn y 35, slot 3 frame 4), pic yOffset 3 -> origin 64, but the ROM origin is **8 px lower** (the enemy elevation: GOLBAT = 8). GOLEM/SHUCKLE/RATTATA (elevation 0) exact. Sweep of `+k` for k in {-8..8}: only k = 8 = 0 px (k=6: 2,328, k=5: 2,642) | `src/animation/astonish.ts:163` | add the target's enemy elevation to the droplet origin (`art.opponent.origin.y - battleCommandFieldSpriteOrigin(...)` as at `liveMoveAnimation.ts:1688`, or take `targetCenter` from the un-elevated anchor); pass it through the ASTONISH config (`liveMoveAnimation.ts:2243`). Proven with `+ 8` | ages 32-61, 136-148 px/age at the droplets, bbox x169-182 y57-71 (age 32) -> x130-221 y25-50 (age 45): `399cff<-bdbd9c`, `bdbd9c<-399cff`, `0839ff<-bdbd9c` (blue droplet vs background) |

**The same missing input (`frontIdleRest.x2` of the target OBJ) as audit 1/2**; Ice Beam and Water Spout were exact on their accepted pairs only because the accepted
target there is SHUCKLE (x2 = 0). Check any other adapter accepted on a SHUCKLE/x2=0 target for the same literal.
Tests to add: live fixtures `species-audit-3/derived/rattata-ice-beam-player-delcatty-opponent-shuckle.json` (164/203 -> 203/203),
`rattata-water-spout-player-wailmer-opponent-shuckle.json` (151/270 -> 270/270), `golbat-astonish-player-loudred-opponent-onix.json` (33/63 -> 63/63); the accepted
pairs must stay exact.

### Non-defect / unresolved table

| Row | px | Verdict |
|---|---|---|
| **Hidden Power (237), player Unown, opponent GOLBAT** (body 1, after the opponent's Tackle) | 72,040 (96/180); ages 65-179, 84 rows | **LAG FRAME (emulator main-loop overrun, species-keyed; not a defect).** Counters (§2.4): the swapped ROM run has a lag frame (main-loop pass delta 0) at frame 295 = age 64, exactly before the first residual age (65); RATTATA/GOLEM runs have none there. ROM-frame-offset test: live(age) == ROM frame `first+age+1` at **0 px for every sampled age 65-179** (and ages 60-64 exact at offset 0). Two identical fresh counter runs |
| **Astonish (310), player-side attacker swap to GOLEM** (opponent ONIX) | 9 (61/63); ages 33-34 only (6 + 3 px) | **UNRESOLVED**: a 4x5 px blob of the water droplet (`399cff<-216bff`, `ffffff<-399cff`, ...; bbox x174-177 y64-68), droplet antialias/affine edge for this pinned rng draw; ROM frame offset test shows +0 is the right frame (no lag). Not tied to the species by any probe (the same draw was not run with another attacker) |
| Not staged (swapped battle never reaches the body) | - | Thrash player-side Tauros + opponent GOLEM (probe: 0 animation bodies in 934 frames); Astonish + RATTATA opponent/player target (only the Tackle body runs in 534 frames). Harness/staging limit, not production; needs a different speed-EV staging |
| Skipped (same species) | - | Ice Beam / Water Spout SHUCKLE swaps (accepted target is already SHUCKLE) |

Everything else is **EXACT twice fresh (0 px, identical digests)**, including the reordered rows (turn order changed -> `precedingBodies` -> tracker x2 history).

## 2. Coverage

Swap sets (target species at the target's side; accepted pair + both orientations; first bodies, or the derived `precedingBodies` after a changed turn order):

| Move (id) | opponent target: GOLBAT / SHUCKLE / GOLEM / RATTATA (player attacker) | player-side target: GOLEM / RATTATA (opponent attacker) | attacker swap: GOLEM (player) / GOLBAT (opponent) |
|---|---|---|---|
| Ice Beam 58 | G exact / - (is SHUCKLE) / exact / **RATTATA DEFECT** | exact / exact | exact / exact |
| Rain Dance 240 | exact x4 | exact x2 | exact / exact |
| Hyper Beam 63 | exact x4 | exact x2 | exact / exact |
| Water Pulse 352 | exact x4 | exact x2 | exact / exact |
| Double Kick 24 | exact x4 | exact x2 | exact / exact |
| Flail 175 | exact x4 | exact x2 | exact / exact |
| Astonish 310 | **GOLBAT DEFECT** / exact / exact / not staged | GOLEM exact / RATTATA not staged | 9 px UNRESOLVED / exact |
| Thrash 37 | GOLBAT / SHUCKLE / RATTATA exact, GOLEM not staged | exact x2 | not staged (GOLEM) / exact |
| Wish 273 | exact x4 | exact x2 | exact / exact |
| Water Spout 323 | exact (GOLBAT) / - / exact (GOLEM) / **RATTATA DEFECT** | exact x2 | exact / exact |
| Hidden Power 237 (Unown attackers; swap targets only) | **GOLBAT LAG FRAME** / exact / exact / exact | exact x2 | n/a |
| Hail 258 | exact x4 | exact x2 | exact / exact |

Not reached: Overheat (315) and Silver Wind (318) (not live adapters on master at the start of this session); Hidden Power attacker swaps (Unown form is the attacker);
SHUCKLE/GOLBAT on the player-side (back sprite) target; the x2-history tracker with earlier-than-first bodies beyond the derived Tackle-first turn
(reordered turns were replayed by `precedingBodies`; no fixture needed `precedingTurns`).

### 2.4 Hidden Power GOLBAT lag evidence
`speciesAudit2Counters.py` (main-loop pass counter) on the swapped scenario, 2 fresh runs identical: lag frames 295 and 350 (ages 64, 119); RATTATA
(exact): 353 (age 118, not pixel-visible). `fixtures/species-audit-3/counters/hidden-power-lag.txt`, `hidden-power-lagshift.txt` (age 63: -1 = 1,224 /
0 = 0 / +1 = 0; age 80: 1,516 / 1,031 / **0**; age 179: 1,224 / 1,224 / **0**: the live row `age` equals the ROM frame `first+age+1` from age 65 on).

## 3. Method notes / pipeline
`speciesAudit3Stage.py` (swap `party[0]` species + speed EV, either side) -> `speciesAudit3Probes.sh` (prep14Probe, direct mGBA, original + swapped scenarios) ->
`speciesAudit3Derive.py` (window = swapped activation + accepted offset; HP/gender/personality from `gBattleMons` at activation; `presentationRngActivation` = `gRng2Value` at the
swapped activation edge; `precedingBodies` from the swapped bodies) -> `speciesAudit3Dense.sh` (production live view vs fresh frames, 2 fresh runs). `derive.txt`
lists every row (activation, old -> new pinned rng2, body lengths). Random2 pins changed on every swap that changed the frame count (e.g. Double Kick GOLBAT
2354516896 -> 2566245609), so the audit also exercised the pin path for all 8 faithful-random moves.

## 4. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py
W=tools/integration/fixtures/species-audit-3
tools/integration/speciesAudit3Stage.sh && tools/integration/speciesAudit3Probes.sh $W/list.tsv /tmp/s3/probes && python3 tools/integration/speciesAudit3Derive.py $W/list.tsv /tmp/s3/probes $W/derived
tools/integration/speciesAudit3StageAttacker.sh && tools/integration/speciesAudit3Probes.sh $W/listA.tsv /tmp/s3/probes && python3 tools/integration/speciesAudit3Derive.py $W/listA.tsv /tmp/s3/probes $W/derived
tools/integration/speciesAudit3Dense.sh /tmp/s3/dense 10 '*-ice-beam-*' '*-water-spout-*' '*-astonish-*' '*-hidden-power-*'      # glob over derived/
tools/integration/speciesAudit3Patch.sh $W/patches/ice-beam-target-idle-x2.diff /tmp/s3/patch rattata-ice-beam-player-delcatty-opponent-shuckle   # applies, runs, ALWAYS reverts
tools/integration/speciesAudit2Dense.sh $W/derived /tmp/s3/ev /tmp/s3/out <stem>...; npx vite-node tools/integration/prep11LeafColors.ts <fixture> <ev run0> <firstFrame> <ages>
npx vite-node tools/integration/speciesAudit3LagShift.ts <fixture> <ev run0> <firstFrame> <ages>        # ROM frame offset -1/0/+1 test
python3 tools/integration/speciesAudit3Lag.py <counters.json> <firstFrame> <lastFrame>                  # lag frames
```
PAPERCUTS: zsh does not word-split unquoted `$VAR` lists (stage scripts need bash arrays), ~3 min; BSD `sed -i` needs `-i ''`, ~1 min; libmgba teardown segfault spam in `xargs` probes (silenced with `2>/dev/null`), ~1 min.
