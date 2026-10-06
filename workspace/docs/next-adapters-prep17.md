# Next adapters prep 17: Meteor Mash tail diagnosis + Mud-Slap / Sand-Attack data (S10A, side lane)

New files only; direct mGBA (Scene ON, one fresh process per run, every relied-on probe run twice, outputs identical). No `src/` changes.

## 0. Results

### 0.1 Meteor Mash (309): the extra row is a CPU-load lag frame, **not** a function of side / species / random words

| body | attacker -> target | activation A | body rows | lag row (rng2 not advanced) | fade-down starts row | row-193 AgbMain start vcount | LoadDefaultBg end vcount |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accepted player METANG -> ONIX | player | 298 | **213** | none | 196 | 193 | 96 |
| accepted opponent METANG -> player ONIX | opponent | 231 | **214** | **195** | 197 | 205 | 109 |
| prep12 alt SHIFTRY(300) -> GOLEM | player | 78 | **214** | **195** | 197 | 206 | 110 |
| A2 METANG -> GOLEM (target species only) | player | n/a | **214** | **195** | 197 | 207 | 111 |
| A3 GOLEM -> SHIFTRY(300) (prep12 pair reversed) | player | n/a | **214** | **195** | 197 | 203 | 107 |

(`tools/integration/fixtures/prep17/meteor-mash-tail-receipt.json`; every case `identicalAcrossFreshProcesses: true`. "Rows" = first inactive row - A, the same convention as the 214/215 in the R1 receipt's pointer-bounded windows: 213 + 1 trailing row = 214, 214 + 1 = 215.)

Mechanism (source: `Cmd_restorebg` -> `Task_FadeToBg` state 2, `battle_anim.c:1148-1190`):
- The tail is `restorebg`'s task: BLDY 0->16 (rows 176-192), then **state 2 runs `LoadDefaultBg()` = `DrawMainBattleBackground()` (two `LZDecompressVram`, ~92k instructions, row 193)**, then a fade 16->0.
- In every body that frame costs ~128-137k instructions (a normal row is ~41-46k). Whether the *following* row runs a main-loop iteration (Random2 via RfuMain1, tasks, sprites) depends on where the main-loop iteration sits relative to VBlank when the heavy frame starts. In the 213-row body the row-193 iteration started at vcount 193 (the LZ work began at vcount 226 and finished at 96 with time to spare); in the four 214-row bodies it started at 203-207 (LZ begins at vcount 8-12, ends at 107-111) and row 194 (A+194) has **no** AgbMain iteration (rng2 does not advance, no RunTasks): the fade-down starts one row later (197 vs 196) and the body is one row longer.
- It is not the twinkles: the last mini-star is freed at row 194 in all five bodies (`lastMiniFreeRow: 194`), and the 48 twinkle lifetimes are identical (initialization delay is decided by the allocator, not by the words). Not the species/side either: A2 differs from the accepted player body only in the target species (ONIX -> GOLEM) and flips; the accepted opponent body is 214 with the same attacker species as the 213 body.
- Predictor-ish facts (not production-computable): the iteration phase at row 193 is a sum of the CPU costs of the previous ~190 rows (row 192 costs 40.5k instructions in the 213 body, 42.9k-46.5k in the others). That needs a cycle-accurate cost model; I found no cheap proxy.

**Verdict: LAG (CPU-phase, unpredictable from the battle state).** Rule that does exist and is production-computable: *body rows = 213 + L*, *fade-down first row = 196 + L*, *last mini free = 194*, where `L` in {0,1} is the lag at row 195 (the row whose AgbMain iteration is skipped). The R1 reducer's `terminalAge = (target is player) ? 214 : 213` / `restoreFallAge = 197 : 196` (`src/animation/meteorMash.ts`) is a **coincidence of the two accepted bodies** (the opponent-attacker body lagged, the player-attacker one did not); 3 of 3 player-attacker alternates lag, so the side rule is wrong for them.

Recommendation for the integration lane (inputs):
1. Replace the side term by an explicit `restoreLagRows: 0 | 1` on `SceneOnMeteorMashConfig`, default **1** (4 of 5 measured bodies, all three alternates), with the accepted player METANG -> ONIX body pinned at 0 through its fixture (scoped exact stays exact). Rows 0..194 are lag-independent; only rows >= 195 shift (fade coefficient `176..192` rise is unchanged, `restoreFallAge = 196 + L`, `terminalAge = 213 + L`).
2. The skipped AgbMain iteration at row 195 also skips one `RfuMain1` Random2 step: with the existing `presentation-rng.v1` policy (no lag model) later bodies' words are faithful-random anyway; no Meteor Mash word is drawn after row 133, so **the end age does not depend on the host words** (answering the "does the last twinkle decide the end" question: no).
3. Dense proof for the alternate with `L = 1`: window = A + 214 rows (A + 0..A + 214), previously 16,977 px/row on ages 196-211 with `L = 0`. I did not re-run production pixels (no `src/` work in this lane): the receipt predicts the fall at 197 and the end at 214 for the alt, which is exactly what the R1 residual (ages 196..211, one-row shift) shows.

### 0.2 Mud-Slap (189) and Sand-Attack (28)

1. **Window offset: resolved, not a numbering bug.** `tools/probe/run-battle-lab-rgb.py` numbers frames exactly like the other probes (re-run: first Mud sprite at frame 86 = A + 9; `currentMove` set at frame 39 = presentation age 0). The Mud fixtures' `denseWindow` is simply `[A+3, A+53]` (A = 77 player / 81 opponent), a 51-row window that starts 3 rows after activation and runs 3 rows past the body; the Sand fixtures' window (46..314, 269 frames) is the whole move-text + body + result span (A = 78 / 82), 32/36 rows *before* activation. Script rows: Mud body = rows 0..50 (dirt visible rows 9..49, last free row 50); Sand body = rows 0..57 (dirt visible 12..52, last free 53, the body then idles to 57). Absolute windows: Mud player 77..127, opponent 81..131, alt 72..122; Sand player 78..135, opponent 82..139, alt 73..130 (activation = `presentationAge` 38 / 42 / 33 and 39 / 43 / 34 from the fixtures' `age = frame - 39`).
2. **OAM slots: lowest-free over computed lifetimes reproduces all 30 slots of all six bodies** (fixtures' `slot` lists equal on the four accepted bodies; the alternate pair matches the same sequence). Inputs: base in-use slots `{0,1,2,6,8,60,61,62,63}`; two transient helper sprites in slot 3 (the attacker slide helpers, sprite attr0 = 160) with measured lifetimes Mud rows `[4,8)` and `[9,11)`, Sand `[7,11)` and `[12,14)`; each wave's 5 dirt sprites live 21 rows (Mud waves at rows 9,13,17,21,25,29; Sand 12,16,20,24,28,32); the second transient is created *before* the first wave's five sprites in the same row. Slot sequence for both moves: `4,5,7,9,10 | 3,11,12,13,14 | 15..19 | 20..24 | 25..29 | 30..34` (`allocatorMatchesDirt: true` for all six).
3. **Sprite order: the known residual is not an unresolved tie; the lent activation order is the only input.** The activation `sSpriteOrder` (64 bytes) is identical in all six bodies (also for the opponent-attacker orientation and the alternate pair): `[62,60,0,63,1,61,6,8,2,4,3,21,20,5,19,...]`. The transient slot-3 pair swaps positions 9/10 (slots 4/3): the order just before wave 1 is `...,8,2,3,4,21,...` (also identical in all six). The accepted **Sand** seed literal is the *activation* order, the accepted **Mud** literal is the *pre-wave-1* order (`seedEquals` in `dirt-order-receipt.json`); both fixtures are exact, so the two orders are indistinguishable on those frames (the only swapped sprites are the invisible slot-3 helper and slot 4). Inputs for the order consumer: the lent first-body order and the transient lifetimes of item 2.
4. **Geometry constant is not a constant: it is anchors.** `AnimDirtScatter` source = `(attackerX2 + 15*dir, attackerPicY + 15)`, destination = `(targetX2 + xOff, targetPicY + yOff)`. Measured against battler `gSprites` (x, y): source = (ax + 15, ay + 23) for a player attacker (picY = y + 8 on the player side) and (ax - 15, ay + 15) for an opponent attacker; destination base = (tx, ty + 8) for a player target and (tx, ty) for an opponent target. The 30-word model solves **uniquely** to the prediction on all six bodies: `target - source` = **(89, -73)** (accepted player pair, battlers (72,92)/(176,42)), **(89, -52)** (alt, (72,80)/(176,51)), **(-89, 22)** (accepted opponent-attacker body). `xStep = ((|dx|<<8) & 0xFFFF) / 20`, bit 0 = moving left; same for y (`dirt-geometry-receipt.json`).

Words: x-word then y-word per sprite in spawn order; the frame's own AgbMain `RfuMain1` Random2 step precedes the callbacks, so the first sprite word of a wave is the *second* LCG step of that row (the one off-by-one that cost me a probe: draw-row state = `lcg(rng2 after row W-1)`).

**Verdicts**
- **MOVE_MUD_SLAP: READY-WITH-PRESENTATION-RNG.** Exact input list: (a) 60 Random2 words in 6 draw rows A+9, +13, +17, +21, +25, +29 (10 words per row, x/y per sprite, after the row's RfuMain1 step); (b) battler sprite anchors (attacker/target x, y) + side flags for source/destination (item 4); (c) first-body lent `sSpriteOrder` + the two slot-3 transient lifetimes (item 3); (d) slots by lowest-free from the base set (item 2); (e) activation row A (window `A..A+50`).
- **MOVE_SAND_ATTACK: READY-WITH-PRESENTATION-RNG**, identical but draw rows A+12, +16, +20, +24, +28, +32, body `A..A+57`, plus the existing `controllerProfile` stages (HUD only per the census).
- Caveat on both: production-pixel proofs of the alternate use the draft fixtures `draft-mud-slap-alt-set156-set146.json` / `draft-sand-attack-alt-set156-set146.json` (draft, never compared to production); the 6 accepted-body field checks (slots, steps) are exact against the checked-in fixtures.

## 1. Reproduce (workspace root; ~1 min total)

```
sh tools/integration/prep17Run.sh r1 meteor mud sand     # fresh processes -> /tmp/p17/r1 (known harmless teardown SIGSEGV after the output is written)
sh tools/integration/prep17Run.sh r2 meteor mud sand     # second fresh run
python3 tools/integration/prep17AltScenarios.py          # writes the two extra Meteor Mash alternates (chosen before probing)
python3 tools/integration/prep17MeteorReceipt.py tools/integration/fixtures/prep17/meteor-mash-tail-receipt.json
python3 tools/integration/prep17DirtGeometry.py tools/integration/fixtures/prep17/dirt-geometry-receipt.json
python3 tools/integration/prep17DirtOrder.py tools/integration/fixtures/prep17/dirt-order-receipt.json
python3 tools/integration/prep17Draft.py                 # draft: true alternates
```
`prep17MeteorLag.py` (instruction-stepped vcount per key function) and `prep17DirtTrack.py` (per-row sprite track) are the two new probes; `prep13Probe.py` is reused for bodies/spawns/rng2/orderSeries.

## 2. Papercuts
- `prep13Probe.py` has no frame-timing view; the lag diagnosis needed a new instruction-stepped probe. ~25 min.
- mGBA probes segfault at exit after writing output (wrapper `tools/run-mgba-probe.py` tolerates it; bare `xargs` runs print noise). ~3 min.
- `run-battle-lab-rgb.py` needs a non-existent fresh output dir and fails with a bare FileExistsError traceback. ~2 min.
- The opponent-attacker Meteor Mash alternate (opponent SHIFTRY -> player GOLEM with the opponent's party edited) never selects Meteor Mash (only a Tackle body appears); a player-attacker reversal was used instead. ~5 min.
