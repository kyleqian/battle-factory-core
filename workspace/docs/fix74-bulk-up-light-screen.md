# fix74 (S10A side lane, 2026-10-10): live audit 18's two live-claim findings — Bulk Up 339 across species, Light Screen 113 at a hidden opponent

Base `c8f0d2382` (audit 18's branch at master `a7904fcc0`). Production change: ONE line in `liveMoveHiddenTargetDeclines`
(`src/engine/liveMoveAnimation.ts`); final `src` tree `23c773400`. Receipt: `tools/integration/fixtures/fix74-live-receipt.json`.
Direct mGBA only (no shared oracle touched), explicit lab seed 305420349 in every scenario.

## 1. Results first

| Finding | Verdict | Change | Evidence |
|---|---|---|---|
| **Bulk Up 339 "species-dependent"** (audit 18: CHANSEY 38,812 / 32,675 px in every window incl. the control; ROM body 108 rows vs production 104) | **Not species-dependent; production is already source-correct for every species (branch A, no code change).** The duration is species-independent. Audit 18's 108 rows are activation .. first inactive, which is 108 for EVERY species (PRIMEAPE too). Production's accepted window starts at the first grown frame, 4 rows after activation (104 rows). Audit 18 rendered production age 0 at activation, so the live grow ran 4 frames ahead of the ROM. Same ARTIFACT class as audit 18's own Iron Defense (ageOffset -1). | inventory scope line only | **22 / 22 dense windows 104 / 104 rows, 0 px, r1 == r2** (5 Factory users x 2 sides x SNORLAX / SHUCKLE + CHANSEY both sides on audit 18's own control scenarios); ROM RAM y2 == the committed prediction on 22 / 22; activation framing 108 rows, lead 4, on 22 / 22 |
| **Light Screen 113 by the PLAYER while the opponent is hidden** (audit 18 TIMING-PHASE: the ROM drops the age-68 / 69 lag frames, 148 px ages 69..81) | **Fails closed** like Sky Uppercut at a hidden target (hide66); keyed on the hidden opponent, not on which two-turn move (Fly / Bounce / Dig / Dive) hid it | `liveMoveHiddenTargetDeclines`: `moveId 113 && attacker 0 && opponent hidden` | audit 18's 12 Light Screen windows (`AUDIT18_LENDS_ONLY`): the 2 `dive-{snorlax,golem}-light-screen-ply-c0` live -> fallback, the other 10 (opponent side with the player hidden, controls, Shock Wave chains) unchanged live; `tests/fix74HiddenLightScreen.test.ts` (3 / 5 fail without the change) |
| OPTIONAL: audit 18's OPEN row (Sandstorm 201 in the Fly hidden span, GOLEM hidden: 1 row at age 162) | **Not reproduced by the Factory Fly users.** GOLEM cannot use Fly in the Factory; with SKARMORY or SWELLOW as the hidden Fly user the window is exact | none | 4 / 4 windows (2 species x 2 sides) 168 / 168 rows 0 px, r1 == r2, hide agrees (`fixtures/fix74/sandstorm/receipts/`) |

**Census (seeds 0..999, base `c8f0d2382` vs final; 5 parallel ranges of 200 per tree):** 26,717 commands. The command KEY sequence (battle,
kind, moveId, side, attacker, target) is identical, `battleDigestExcludingFrames` is identical in every range, and **0 status / frame changes**
(live 25,612 / 26,717 in both trees, live frames 3,821,357 both). No census route casts a player Light Screen while the opponent is hidden. Player
Light Screen is 81 live / 19 fallback in BOTH trees, and Bulk Up is 22 / 22 live in both.
**ON/OFF parity** (`hide66Parity.ts --moves=339`): seed 154 / streak 28 (HERACROSS, player Bulk Up x 3, 13 turns) and seed 211 / streak 23
(SLAKING, opponent Bulk Up x 3, 30 turns). Battle RNG, rules context and boundary are equal at every turn boundary.

**Gates (final code `917c16404`, src `23c773400`, four Vitest workers):** targeted (every test file matching BULK_UP / LIGHT_SCREEN / hide66
/ 339 / 113, plus the inventory, playableAnimationIntegration and the two fix74 tests) 201 files / 3,257 tests passed (10 / 39 skipped);
`npm run typecheck` green; `npm run test:smoke` 8 / 448; `npm test` shard 1/2 803 files / 6,892 tests, shard 2/2 803 files / 6,327 tests,
0 failed (44 files / 223 tests skipped); `npm run build` green; `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt
presentation-rng-playable-live-bodies-seeded-on --base c8f0d2382`: 624 / 624 captures byte-identical; `git diff --check` clean.

## 2. Bulk Up 339: the source mechanism

`data/battle_anim_scripts.s:4390` Move_BULK_UP: `loadspritegfx ANIM_TAG_BREATH`; `createvisualtask AnimTask_GrowAndShrink, 2`;
`playsewithpan SE_M_SWAGGER`; `waitforvisualfinish`; `createsprite gBreathPuffSpriteTemplate, ANIM_ATTACKER, 2`; `loopsewithpan SE_M_SWAGGER, 4, 2`;
`waitforvisualfinish`; `end`.

- `AnimTask_GrowAndShrink` (`battle_anim_effects_2.c:2235`) runs `gGrowAndShrinkAffineAnimCmds` (`:543`: (-4, -5) x 12, hold 24, (+4, +5) x 12,
  END) through `RunAffineAnimFromTaskData` (`battle_anim_mons.c:1800`). Every frame it calls `SetSpriteRotScale` and
  `SetBattlerSpriteYOffsetFromYScale` (`:1873`), which sets `y2 = (H - min(128, (H << 8) / d)) / 2` with `H = MON_PIC_HEIGHT -
  2 * GetBattlerYDeltaFromSpriteId()`, i.e. the species' **`gMonBackPicCoords` (player) / `gMonFrontPicCoords` (opponent) `y_offset`**.
- `AnimBreathPuff` (`:2253`) starts at `GetBattlerSpriteCoord(X_2) +- 32`, `Y_PIC_OFFSET` and translates for `data[0] = 52` frames.
- **Species-dependent inputs:** the side's `y_offset` (the y2 height H), the battler OBJ corner (sBattlerCoords + y_offset; minus elevation for
  an opponent, and none of the five users is elevated), the affine-sampled 64x64 picture, and the breath origin (`Y_PIC_OFFSET`). **No species
  input reaches a frame count.** Production derives all four from source (`liveBattlerAnchors`: `pictureHeight = 64 - 2 * coords.yOffset` from
  the side-correct table, `picOffsetPoint`; `liveSceneOnBattlerArt`).
- **Why CHANSEY's body is 108 rows:** every Bulk Up body is 108 rows from the `gAnimScriptActive` rising edge to the first inactive frame
  (`issue142-shadow-rows.json` already recorded PRIMEAPE's as [68, 175] / [72, 179] with `offsetWindowStartMinusActivation` 4). The accepted
  window (`tools/compare/bulkUpProbe.py`) starts at the first frame whose attacker matrix is not identity, 4 rows later, and ends at the same
  first inactive frame, giving 104 rows. Audit 18's residual pattern fits a 4-frame phase lead exactly: the ramps 2..16 and 38..52 differ, plus
  the breath creation rows 53..62, while the 24-frame hold 17..37 and everything from 63 on match. Audit 18 tried `ageOffset` +-1 only.

### Predictions (committed in `8c1bec736` before any species probe) vs probes

| Species | side | yOffset | H | predicted rows (window / activation) | predicted px | probed (2 targets each) |
|---|---|---|---|---|---|---|
| PRIMEAPE | player / opponent | 7 / 7 | 50 / 50 | 104 / 108 | 0 | 104 / 108, **0 px** x 4, y2 == prediction |
| SLAKING | player / opponent | 8 / 8 | 48 / 48 | 104 / 108 | 0 | 104 / 108, **0 px** x 4, y2 == prediction |
| HERACROSS | player / opponent | 4 / 3 | 56 / 58 | 104 / 108 | 0 | 104 / 108, **0 px** x 4, y2 == prediction |
| MACHAMP | player / opponent | 4 / 1 | 56 / 62 | 104 / 108 | 0 | 104 / 108, **0 px** x 4, y2 == prediction |
| URSARING | player / opponent | 3 / 1 | 58 / 62 | 104 / 108 | 0 | 104 / 108, **0 px** x 4, y2 == prediction |
| CHANSEY (audit 18 control) | player / opponent | 11 / 9 | 42 / 46 | 104 / 108 | 0 | 104 / 108, **0 px** x 2, y2 == prediction |

Rows that differ from PRIMEAPE's shape (the y2 sequence; displayed age = reducer age + 2; the full lists are
`displayedAgesDifferingFromPrimeape` in `fixtures/fix74/bulk-up-predictions.json`): SLAKING (H 48) only 4 rows, 3 / 11 / 39 / 47 on both sides.
HERACROSS player and MACHAMP player (H 56) 33 rows. URSARING player and HERACROSS opponent (H 58) 37 rows. MACHAMP opponent and URSARING
opponent (H 62, y2 down to -9) 39 rows. All of those lie between displayed ages 6 and 44. CHANSEY 39 rows on the player side and 8 on the
opponent side, between ages 3 and 47. Across the 48 affine frames, the ROM's RAM `gSprites[attacker].y2` equals these sequences in all
22 windows, and the renderer reproduces them pixel-exact.

**Not changed, flagged for the supervisor:** production's Bulk Up command lasts 104 frames, the accepted window. The ROM body is 4 idle lead
rows longer (activation .. first grown frame; the sprite is already in affine-double mode with an identity matrix, so it looks like the idle
scene). Production's row 0 shows the elevated-opponent shadow (the ROM's activation row) and its rows 1+ are window rows. Every displayed image is
a ROM image, but the body is 4 frames shorter than the ROM's. That is the shared convention of every adapter whose accepted window starts after
activation (Swagger +7, Scary Face +4, Taunt +10, Iron Defense +1, ...). It is species-independent and out of this step: changing it for Bulk
Up alone would move frame totals for one adapter only.

## 3. Light Screen 113 at a hidden opponent

`liveMoveHiddenTargetDeclines` (hide66's Sky Uppercut gate) now also returns true for `moveId 113 && attacker === 0` while the OPPONENT side is
hidden (`liveMoveHiddenSides`: any semi-invulnerable charger, Fly / Bounce / Dig / Dive; the CPU-load input is the invisible opponent OBJ,
not the move that hid it). The opponent's Light Screen with the player hidden keeps the visible lag profile [68, 69] (audit 18 lag.txt) and
stays live. The census decline reason is hide66's "target hidden (semi-invulnerable): no D4 phase for its lag profile" (`classifyPresentationDecline`).

## 4. Reproduction (from workspace/)

```
python3 tools/integration/fix74Stage.py tools/integration/fixtures/fix74/scenarios           # 20 scenarios (+ 2 CHANSEY copies of audit 18's ctl)
# one bulkUpProbe.py run per scenario -> <probe-dir>/<name>.json, then:
python3 tools/integration/fix74Derive.py tools/integration/fixtures/fix74/scenarios <probe-dir> tools/integration/fixtures/fix74/fixtures
node --experimental-strip-types --no-warnings tools/integration/fix74Verify.ts tools/integration/fixtures/fix74/fixtures/<name>.json  # 2 fresh probes
# activation framing: tools/integration/audit18Probe.py <scenario> <out.json> <rgb-dir> (bodies[].startFrame / endFrame)
python3 tools/integration/fix74Receipt.py <scratch> <census-delta.json> <parity...json> <sandstorm.json>
AUDIT18_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts tools/integration/fixtures/audit-18/fixtures dive-snorlax-light-screen-ply /dev/null
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..199 --out=<r.json> --commands=<r.jsonl>   # x5 ranges x {base, final}
python3 tools/integration/fix74CensusDelta.py <dir> 0 200 400 600 800
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=154 --streak=28 --moves=339
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=211 --streak=23 --moves=339
# Sandstorm: audit18Probes.py <dir> fixtures/fix74/sandstorm/scenarios/*.json; fix74SandstormFixtures.py <dir> fixtures/fix74/sandstorm/fixtures;
#            audit18Check.ts fixtures/fix74/sandstorm/fixtures fly-{skarmory,swellow}-sandstorm-{ply,opp} <out.json>
```
