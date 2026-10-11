# shadow105: the elevated-opponent enemy shadow on land97's idle lead rows (evidence + fold-ready temp patch)

Evidence only, new files only (`shadow105*` tools, `tools/integration/fixtures/shadow105/`, this doc). FIXED base `3cc8381ce` (production
src `dc6c756a`). Fresh direct mGBA (`ctl95Probe.py` via `shadow105Job.sh`, 40-row RGB tail), explicit lab seed 305419897 in every lab,
every lab twice: **r1 == r2 on 11 / 11** (`receipts/probe-sha256.json`). Production renders come from git-archive copies of the base and of
the base + the temp patch. Nothing in `src/` or `tests/` of this checkout was edited.

## 1. Results first

| Question | Answer |
|---|---|
| Which lead rows show the shadow on the ROM? | **Lead row 0 ONLY, for every N measured (4, 8, 10).** On 13 / 13 bodies (4 moves, 11 labs), ROM row A (the activation, `gAnimScriptActive`'s rising edge) has the sha of A-1, the pre-activation field with the shadow. Rows A+1 .. A+N are byte-identical to A+N, the body's age-0 image with the shadow hidden. A differs from A+N only inside the 32x8 shadow box (x 160..191, y 65..72) |
| Elevated vs grounded TARGET | **The same: row 0 only.** An elevated opponent attacker vs a grounded player target (LAPRAS / SNORLAX) and vs an elevated-species player target (GOLBAT / CROBAT): identical lead structure. The player side has no shadow sprite |
| **New: a PLAYER attacker into an ELEVATED opponent target** | **The ROM shows the shadow on lead row 0 there too** (`SpriteCB_EnemyShadow` hides it while `gAnimScriptActive`, whoever attacks). **Master draws 200 px wrong on that row** (Bite RATICATE -> CROBAT, Sludge Bomb MUK -> GOLBAT, Twineedle BEEDRILL -> GOLBAT: `lead-base-*.json`, 200 px on row 0, 0 on rows 1..N-1). Audit 24's decline only covers an elevated ATTACKER. **219 live census commands** (seeds 0..999) are player lead commands into an elevated opponent |
| Temp patch | `fixtures/shadow105/shadow105-lead-row0-shadow.diff` (2 files, +9 / -6). (a) It drops the elevated-attacker decline in `liveMoveIdleLeadRows`. (b) The move effect of phaseElapsed 0 of a lead > 0 command carries `preActivationRow: true`. (c) `renderBattleResolutionLiveView` arms the live shadow on that row (`effect.age === shadowRow \|\| effect.preActivationRow === true \|\| ...`). **The move effect stays on every lead row** (age 0, the land97 image). Only the shadow suppression changes |
| Patched windows (dense ROM vs patched production, both runs) | **Every lead row 0 px on 13 / 13 bodies**. Body rows: 0 px on Bite x3, Sludge Bomb x3 (36 / 36, 164 / 164 rows). Not 0 px, all identical in the base, none a lead row: Shadow Punch's known age-90 lag phase (rows 91..106 + 109, audit 24 TIMING-PHASE) and the Twineedle body residuals (section 4). **r1 == r2 everywhere** |
| Patched, full production path (5 census routes, `shadow105RouteRender.ts`) | **5 / 5.** Row 0 carries `preActivationRow` and equals row 1 plus **exactly 200 px inside the shadow box**. Rows 1..N-1 are the age-0 image. Body rows, ages and the next command's row are identical to the base. The command keys are identical |
| Census 0..999 (10 `--index-from` shards per tree) | **239 commands +N exactly (235 live), 0 mismatches, +1,296 frames** (3,985,209 -> 3,986,505, which is land97's own pre-decline total). **0 status changes**; key sequence and `battleDigestExcludingFrames` identical. Live share unchanged, **95.38 % / 98.72 %** |
| Pins | Section 5 (patched-copy `npm test`) |

## 2. ROM shadow-row table (`receipts/lead-patched-*.json`, `romLead`; r1 == r2)

Lead row j = ROM row A + j. "shadow" = the row differs from A+N only inside the shadow box. "= age 0" = its sha equals A+N.

| Move (N) | Attacker -> target | Body | ROM row 0 | ROM rows 1..N | Patched lead px (r1 / r2) | Base (`3cc8381ce`) lead |
|---|---|---|---|---|---|---|
| Shadow Punch 325 (8) | HAUNTER opp -> LAPRAS (grounded) | 0 | shadow, = A-1 | = age 0 | 0 x 8 / 0 x 8 | 0 rows (declined) |
| Shadow Punch 325 (8) | HAUNTER opp -> GOLBAT (elevated species) | 0 | shadow, = A-1 | = age 0 | 0 x 8 / 0 x 8 | 0 rows (declined) |
| Bite 44 (10) | CROBAT opp -> LAPRAS | 0 | shadow, = A-1 | = age 0 | 0 x 10 / 0 x 10 | 0 rows (declined) |
| Bite 44 (10) | CROBAT opp -> GOLBAT | 0 | shadow, = A-1 | = age 0 | 0 x 10 / 0 x 10 | 0 rows (declined) |
| Bite 44 (10) | RATICATE ply -> CROBAT opp | 0 | shadow, = A-1 | = age 0 | 0 x 10 / 0 x 10 | **row 0: 200 px** |
| Sludge Bomb 188 (4) | GOLBAT opp -> SNORLAX | 0 | shadow, = A-1 | = age 0 | 0 x 4 / 0 x 4 | 0 rows (declined) |
| Sludge Bomb 188 (4) | GOLBAT opp -> CROBAT | 0 | shadow, = A-1 | = age 0 | 0 x 4 / 0 x 4 | 0 rows (declined) |
| Sludge Bomb 188 (4) | MUK ply -> GOLBAT opp | 0 | shadow, = A-1 | = age 0 | 0 x 4 / 0 x 4 | **row 0: 200 px** |
| Twineedle 41 (10) | BEEDRILL opp -> SNORLAX | 0, 1 (2 hits) | shadow, = A-1 | = age 0 | 0 x 10 (hit 1); hit 2: 940 / row, base-identical (s4) | 0 rows (declined) |
| Twineedle 41 (10) | BEEDRILL opp -> GOLBAT | 0, 1 | shadow, = A-1 | = age 0 | 0 x 10 (hit 1); hit 2: 940 / row (s4) | 0 rows (declined) |
| Twineedle 41 (10) | BEEDRILL ply -> GOLBAT opp | 0, 1 | shadow, = A-1 | = age 0 | 0 x 10 (hit 1); hit 2: 839 / row (s4) | **row 0: 200 px** (hit 1) |

Base with the decline: the elevated opponent windows (production age 0 aligned with ROM A+N) are 0 px on the body, as audit 24 showed.
Shadow Punch is the exception: its age-90 lag phase is the same in both trees.

## 3. Census routes through the full production path (`receipts/route/route-check.json`)

| Route (battle:move:side) | Frames base -> patched | Target rows base -> patched (lead) | Patched row 0 vs row 1 |
|---|---|---|---|
| 38:44:opponent (CROBAT Bite) | 10,392 -> 10,426 | 26 -> 36 (0 -> 10) | 200 px, bbox 160,65..191,72 |
| 4:188:opponent (Sludge Bomb) | 6,358 -> 6,366 | 160 -> 164 (0 -> 4) | 200 px, same bbox |
| 31:337:opponent (Dragon Claw) | 11,284 -> 11,290 | 137 -> 143 (0 -> 6) | 200 px, same bbox |
| 38:188:player (WEEZING Sludge Bomb -> CROBAT) | 10,392 -> 10,426 (b38's CROBAT leads) | 164 -> 164 (4 -> 4) | 200 px, same bbox (**master's row 0 lacks it**) |
| 32:44:player (PUPITAR Bite -> CHIMECHO) | 18,252 -> 18,252 | 36 -> 36 (10 -> 10) | 200 px, same bbox (**master's row 0 lacks it**) |

Census per move (commands regaining +N): 41 x11, 44 x4, 52 x5, 92 x7, 93 x23, 94 x51, 124 x13, 153 x6, 188 x29, 207 x9, 225 x16,
232 x7, 247 x31, 325 x10, 337 x14, 347 x3. That is 16 of the 19 elevated-user lead moves; Charm 204, Knock Off 282 and Poison Fang 305
have no elevated opponent command in seeds 0..999. Per (move, attacker): `receipts/census-delta.json` `perMoveAttacker`.

## 4. Flagged, not fixed (identical in base and patch; not lead rows)

- **Twineedle 41, hit 2 (the second `Move_TWINEEDLE` script).** Every row differs by a constant 839 / 940 px (bbox 16,26..169/192,149, which
  reaches the message box). Lead rows and body alike, identical in the base. A per-hit fixture / message-box presentation difference in
  `liveAdapterFramebuffer.ts`'s view of a later multi-hit body, not the shadow. Not investigated.
- **Twineedle 41, hit 1.** Body ages 1..21 differ by 11..54 px / row (bbox 56,26..169,107: the needle area). Identical in the base. A
  BEEDRILL-attacker body residual of the adapter. Not investigated.
- **Shadow Punch 325.** The age-90 optional lag (rows 91..106 + 109) was already documented by audit 24 (TIMING-PHASE).

## 5. Pins (patched-copy `npm test`)

`receipts/pins.txt`. Patched copy = `git archive 3cc8381ce` + the diff, with its own `git init` and node_modules / artifacts / reference
symlinked. **`npm run typecheck` exit 0.**

| Run | Result |
|---|---|
| Pass 1, full suite (reference not yet linked) | 56 files / 80 tests failed, 1,571 files / 13,237 tests passed. Nearly all are `reference/pokeemerald` ENOENT (environment) |
| Pass 2: the 56 files again, reference linked | **3 files / 4 tests failed**, 53 files passed |
| Base copy, the same 3 files | `appDifferential` fails the same 2 tests (environment: the copy's git has no HEAD commit); the other two files pass |

**The patch moves exactly 2 tests in 2 files**, both introduced by the audit-24 decline commit `df4afda75`:

- `tests/land97IdleLeadRows.test.ts`, "live audit 24: elevated opponent attackers keep no idle lead rows". It expects
  `liveMoveIdleLeadRows(req(325, 1), pair(143, 93))` 0 and gets **8**; Bite 44 on the same pair would get 10.
- `tests/playableAnimationIntegration.test.ts`, "renders both opponent damaging and no-hit moves...". The HAUNTER (elevated) Shadow Punch
  route expects `land97Ages(0, 105)` (0..104) and gets **0..112**, which is `land97Ages(325, 105)`, the pre-decline land97 pin.

Nothing else moves: no live-adapter age pin, no census ratchet, no sprite-order or lend test. Audit 24's effect-less row 0 moved 29
pins; this patch keeps the effect, and the shadow flag is render-only (it is not read by the live / partial status or the census).

## 6. FOLD INSTRUCTIONS

1. From the repo root, on a tree whose `battleResolutionPresentationRender.ts` / `battleScene.ts` match `3cc8381ce`:
   `patch -p1 < workspace/tools/integration/fixtures/shadow105/shadow105-lead-row0-shadow.diff`. It applies clean with no `.orig` / `.rej`.
   It removes the now-unused `battleCommandFieldArtElevation` import (`noUnusedLocals`).
2. Move the pins in section 5:
   - revert `df4afda75`'s two test expectations. In `land97IdleLeadRows.test.ts`, an elevated opponent attacker now keeps N (325 -> 8, 44 -> 10).
   - in `playableAnimationIntegration.test.ts`, the HAUNTER Shadow Punch route is `land97Ages(325, 105)` again.
3. Add a Tier-1 test:
   - `liveMoveIdleLeadRows(req(325, 1), pair(143, 93)) === 8`;
   - phaseElapsed 0 of a lead > 0 command's view has `effect.preActivationRow === true`, and phaseElapsed 1 does not;
   - on census route b38 (seed 38, streak 26), the target command's row 0 differs from row 1 by 200 px inside x 160..191, y 65..72. That is
     `shadow105RouteRender.ts`'s `row0VsRow1`, and it is 0 px without the patch.
4. Expected census after the fold (seeds 0..999): 27,515 commands, **3,986,505 frames**, live 95.38 % / 98.72 %. The 239 elevated-attacker
   lead commands regain +N; nothing else moves.
5. Docs:
   - close audit 24's land97 DEFECT;
   - record the **new player-attacker -> elevated-target row-0 defect** that the same patch fixes (219 live census commands, no frame change);
   - the Twineedle residuals of section 4 stay open.

## 7. Reproduce (from workspace/)

```
sh tools/integration/shadow105Run.sh .integration/validation/<fresh> [--census] [--pins]
```
The runner restages the scenarios (diffed with the committed ones), runs fresh probes x2 (r1 == r2), and builds the base / patched archive
copies (node_modules, artifacts and reference symlinked). It then runs the lead / shadow check per move in both copies and the 5 census
routes. `--census` adds the 0..999 census in both copies (+ `shadow105CensusDelta.py`); `--pins` adds `npm test` in the patched copy. Every
receipt is cmp'd with `tools/integration/fixtures/shadow105/receipts/`. Without flags it takes about 1 minute; `--census` adds about
4 minutes and `--pins` about 10.

## 8. Gates

- **Runner pass 2** (fresh dir, fresh probes): `shadow105Run: ALL SAME`, 10 / 10 receipts (`fixtures/shadow105/runner-pass2.log`).
  **Pass 3 `--census`**: ALL SAME, 13 / 13 receipts; the census was reproduced byte for byte (`runner-pass3-census.log`).
- This checkout (new files only; `git status` showed no modified tracked file at any commit):
  - `npm test`: **1,627 files / 13,387 tests passed** (44 / 223 skipped), 598 s;
  - `npm run build`: green.
