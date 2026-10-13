# stq132 (S10A, ISSUES #168 renderer prep for SA5): SLP, BRN, INFATUATION — dense ROM windows, unwired reducers, 0 px comparator

Evidence + an UNWIRED pure reducer only. The one existing tracked file edited is `src/animation/statusConditionAnimations.ts`
(additions only: stp128's four animations give byte-identical outputs, and `tests/stp128StatusConditionReducer.test.ts` still passes
unchanged, 37 / 37). No production module imports the module. Base: master `a5e585119` (production src `38eb696fb`). Evidence is direct
mGBA only (Scene ON, `factory.json` bootstrap, explicit lab seeds), never the shared HTTP oracles. Every probe job ran twice in fresh
processes. Design inputs: docs/sta123-status-animations-design.md §1 / §2a, docs/status-animation-sprite-audit.md, and
docs/stp128-status-condition-render-prep.md (the pattern, the API and the landing recipe that this doc extends).

## 1. Results first

Per animation x side, all windows rel -1 .. E + 2 (release + 1), full screen and the affected rect, drawn through EXISTING production
helpers / assets (`tools/integration/fixtures/stq132/compare.json`):

| animation | side (status battler) | windows | species pairs (status battler / other) and paths | rows | px (full / rect) |
|---|---|---|---|---|---|
| SLP | player | 8 | Onix / Primeape, Golbat / Primeape: Spore inflict + 3 sleep turns each | 800 | **0 / 0** |
| SLP | opponent | 8 | Onix / Primeape, **Golbat (elevated, shadow)** / Primeape: Spore inflict + 3 sleep turns each | 800 | **0 / 0** |
| BRN | player | 6 | Onix / Primeape, Golbat / Primeape: Will-O-Wisp inflict + 2 end-turn ticks each | 252 | **0 / 0** |
| BRN | opponent | 7 | Onix / Primeape, **Golbat (elevated)** / Primeape: Will-O-Wisp inflict + 2 ticks; **Wailmer / Magby: Fire Punch's 10 % secondary** | 294 | **0 / 0** |
| INFATUATION | player | 4 | Onix / Primeape, Golbat / Primeape: 2 in-love checks each | 400 | **0 / 0** |
| INFATUATION | opponent | 4 | Onix / Primeape, **Golbat (elevated)** / Primeape: 2 in-love checks each | 400 | **0 / 0** |

**37 / 37 windows, 0 px on every row (2,946 scored rows), no residual.** The rows after the windows (E + 3) are 0 px too.

- **ROM windows.** 13 scenarios, 37 windows, rows rel -2 .. E + 3. r1 == r2 on 13 / 13 jobs (byte-identical outputs,
  `probe-sha256.json`). The probe (`stq132Probe.py`) is stp128's, plus the created sprite's affine mode and its `gOamMatrices` entry.
- **Staging** (`stq132Stage.py`):
  - sta123's accepted scenarios, verbatim: Primeape Spore / Will-O-Wisp / Attract vs Onix, both sides, seed 305419897.
  - The GOLBAT pairs are **controlled lab staging**: the same files with only the target lead's species set to GOLBAT (42).
  - For Attract, the GOLBAT is staged female, opposite the male Primeape. Source check: GOLBAT is not genderless (gender ratio 127,
    so battle_lab accepts the gender), and its Gen 3 ability, Inner Focus, blocks none of Attract / sleep / burn.
  - Fire Punch's secondary burn is `tools/battle-lab/mechanic-fire-punch-burn-lifecycle-off.json`, verbatim (seed 8). The probe
    forces Scene ON, and the same seed still burns on turn 1.
  - Paths: SLP inflicted (Spore; no Hypnosis window was staged, since Spore is the same `statusanimation`) + sleep turns. BRN inflicted
    (Will-O-Wisp; a Fire secondary) + the end-turn tick. INFATUATION: the in-love check. Attract itself plays no Status_Infatuation.
- **Spans** (identical in every window, every path):

  | animation | E (= activeRows) | controller release | create rows | destroy rows |
  |---|---|---|---|---|
  | SLP | 96 | 97 | 3 / 35 | 64 / 96 |
  | BRN | 38 | 39 | 3 / 9 / 15 | 26 / 32 / 38 |
  | INFATUATION | 96 | 97 | 3 / 20 / 37 | 62 / 79 / 96 |

  These are the sprite audit's frames. Fire Punch's secondary (after a damaging move's SE gate) has the same E 38 as Will-O-Wisp and
  the end-turn tick: no load-lag split like FRZ's.
- **The battler is never touched.** On every row of all 37 windows the status battler's x2 / y2 stay at its idle rest (opponent Onix
  x2 1, every other 0), and it stays visible. The BG shadows and BLDCNT / BLDALPHA stay 0. The scripts are sprite-only:
  `loadspritegfx` / `playsewithpan` / `createsprite` / `delay` (data/battle_anim_scripts.s:10235-10266).
- **Reducer.** `tests/stq132StatusConditionReducer.test.ts` (40 / 40) pins every source row of all 37 windows. The pinned fields:
  - gAnimScriptActive, and the controller hold through the release row;
  - the battler's x2 / y2 / invisible flag, the BG shadows, BLDCNT / BLDALPHA;
  - every created sprite: x / y / x2 / y2 / invisible / priority / subpriority / animNum / animCmdIndex / tile frame / data[0..7] /
    affine mode + matrix.

  The geometry comes from the battler sprite alone (`statusConditionTarget(side, sprite x, sprite y, idle x2)`), never from the ROM's
  sprites. The display test pins the SortSprites order.
- **Perturbation experiments** (`python3 tools/integration/stq132Perturb.py <out.json> <raw-dir>`). Each mutation changes ONE
  constant; the file is restored byte-for-byte afterwards. "tests" = failing tests out of 40; "windows" = dirty comparator windows
  out of 37. Every mutation fails at least one of the two:

  | mutation | tests | windows |
  |---|---|---|
  | SLP second create row 35 -> 36 | 17 | 16 |
  | BRN third create row 15 -> 16 | 13 | 13 |
  | INFATUATION third create row 37 -> 38 | 8 | 8 |
  | SLEEP_LETTER_LAST_CALL 60 -> 59 | 16 | 12 |
  | letter Z create-row matrix b 2200 -> 2201 | 16 | 0 (never displayed) |
  | letter Z x offset 4 -> 5 | 17 | 16 |
  | letter Z y offset -10 -> -11 | 17 | 16 |
  | letter Z subpriority target - 2 -> - 1 | 16 | 0 (no overlap with the battler) |
  | burn flame x offset 24 -> 25 | 14 | 13 |
  | burn flame y offset 24 -> 25 | 14 | 13 |
  | burn flame duration 20 -> 21 (data words) | 13 | 0 |
  | burn flame lastCall 22 -> 21 | 13 | 13 |
  | BURN_FLAME_FRAME_TICKS 4 -> 5 | 13 | 13 |
  | DestroyAnimSprite data[6] 0x3bfd -> 0x3bfc | 13 | 0 |
  | heart y offset 20 -> 21 | 9 | 8 |
  | heart lastCall 59 -> 58 | 8 | 8 |
  | heart subpriority target - 3 -> - 2 | 8 | 0 |
  | BATTLER_COORD_Y player 80 -> 81 | 10 | 10 |
  | BATTLER_COORD_X opponent 176 -> 175 | 12 | 11 |
  | SLP controllerRows 97 -> 98 | 17 | 0 |
  | BRN activeRows 38 -> 37 | 15 | 3 (the elevated Golbat shadow returns a row early) |
  | display: show a sprite on the row after its create row | 1 | 37 |
  | display: SortSprites y rule reversed | 1 | 8 (every INFATUATION window) |
  | display: equal-y tie to the later slot | 1 | 13 (every BRN window) |

  `tools/integration/fixtures/stq132/perturbation.json` is the receipt of the final run (24 mutations, all restored). On a first run
  (before the display-order pin) the equal-y tie failed 0 tests and only the comparator (13 windows) caught it, so the test now pins
  the SortSprites order.
- **Comparator negative controls** (each must fail; `compare.json` `controls`):

  | control | clean windows | meaning |
  |---|---|---|
  | `age+1` (display row + 1) | 0 / 37 | every window fails |
  | `wrong-side` (the other side's motion / offsets) | 0 / 37 | every window fails |
  | `drop-one` (sprite index 1 missing) | 0 / 37 | every window fails |
  | `no-affine` (identity matrix for the letter Z) | 21 / 37 | all 16 SLP windows fail |
  | `tie-swap` (the whole draw order reversed) | 16 / 37 | all 21 BRN + INFATUATION windows fail; the two letters never overlap on an opaque pixel |
  | `index-order` (creation order, no SortSprites y rule) | 24 / 37 | all 13 BRN windows fail (equal y: the EARLIER flame wins) |
  | `no-occluders` (no healthbox / message-window footprint) | 29 / 37 | the 8 player-side SLP windows fail: the letters rise under the opponent healthbox |

- **ROM facts the landing needs:**
  - **Display lag.** A script-created sprite first shows 2 rows after its create row, then shows the state of the row before (stp128's
    rule, here per sprite: `k >= 1` at rel - 1).
  - **The letter Z is an affine-normal 32x32 OBJ.** Production's `drawSpriteSheetAffineRotate(…, centre = left + 16 / top + 16, a, b,
    c, d, undefined, false)` with the reducer's matrix (rest.ts `restLetterMatrixAtAge`, which is the matrix of the row before) is exact
    on both sides. The create row's matrix (BIOS ObjAffineSet(0x14, ∓30): 2427 / ±2200) is never displayed.
  - **No y offset.** Rest's `screenCenterYOffset` (16 on the player side) is **not** applied. Status_Sleep's origin is
    `GetBattlerSpriteCoord(Y_PIC_OFFSET)` = sprite y + 8 (player) / sprite y (opponent), and that is exact on both sides, Onix and Golbat.
  - **SortSprites, not slot order.** Equal priority / subpriority sprites are ordered by their wrapped OAM y. The larger y gets the lower
    OAM index and wins. Exact ties keep the earlier slot in front (the burn flames, which share one y).
  - **BRN / INFATUATION start from BATTLER_COORD_X / Y** (singles sBattlerCoords 72 / 80 and 176 / 40), not from the sprite. An
    elevated Golbat's flames and hearts sit at the same place as Onix's.
  - **The elevated opponent's shadow** is hidden on rel 1 .. E + 1 (stp128 / stat102's rule, confirmed on all three Golbat-opponent
    animations).
  - **Palette bank 7.** `loadspritegfx` writes it on rel 1 (letter Z / small ember / magenta heart) and leaves it stale after the free.
    The renderer draws from the assets and needs none of that.

## 2. Reducer API additions (`src/animation/statusConditionAnimations.ts`, unwired)

New imports, all already-production `src/animation` modules: `./rest.ts`, `./firePunch.ts`, `./charm.ts`,
`./animLinearTranslation.ts`. The boundary ratchet is unchanged.

- `type StatusParticleAnimation = "SLP" | "BRN" | "INFATUATION"`, and `type StatusAnimation = StatusConditionAnimation |
  StatusParticleAnimation` (all seven).
  - stp128's `StatusConditionAnimation` and `STATUS_CONDITION_SPANS` are unchanged; the stp128 test pins its key set.
  - The sprite `template` union gains `gSleepLetterZSpriteTemplate` / `gBurnFlameSpriteTemplate` / `gMagentaHeartSpriteTemplate`.
  - Source and display sprites gain an optional `affine {a, b, c, d}`, which is present only on the letter Z.
- `STATUS_PARTICLE_SPANS`, `statusParticleSpan(animation)`: SLP 96 / 97 / 3, BRN 38 / 39 / 3, INFATUATION 96 / 97 / 3.
- `statusParticleSourceRow(animation, rel, target)` -> `StatusConditionSourceRow`: the battler at its idle x2, no BG / blend.
- `statusParticleDisplayRow(animation, rel, target)` -> `StatusConditionDisplayRow`:
  - `battlerOffset` = the idle rest, `battlerOnBg` false, `objPaletteRotation` 0;
  - `sprites[]` back-to-front by SortSprites; `left / top` = the OAM top-left (x + x2 - size / 2);
  - `enemyShadowHidden` rel 1 .. E + 1.
- `statusAnimationSpan(animation, options?)` / `statusAnimationDisplayRow(animation, rel, target, options?)`: one dispatcher for all
  seven (FRZ still takes `freezeLoadLagRows`).
- **Reuse.** Each sprite's motion is the production port of the same template + args:

  | animation | production function | what it gives |
  |---|---|---|
  | SLP | Move_REST's `restAtAge` (rest.ts, same template, same args 4 / -10) | AnimSleepLetterZ_Step's x2 / y2 and `restLetterMatrixAtAge`'s BIOS matrices (letter index 0, local age = calls - 1) |
  | BRN | Fire Punch's `firePunchBurnFlames` (firePunch.ts, `statusBaseCenter` = BATTLER_COORD_X / Y, `horizontalDirection` +1 opponent / -1 player) | AnimTravelDiagonally + gAnims_BasicFire: x + x2 and the frame |
  | INFATUATION | Move_CHARM's `magentaHeartAtAge` (charm.ts; Charm's 17-row heart spacing is Status_Infatuation's too) | AnimMagentaHeart's x / y / x2 / y2 / data |

- **Ported literally** (no production function covers them):
  - each sprite's create-row state (the CreateSpriteAndAnimate call: the letter Z's initial matrix, the flame at the createsprite
    origin, the heart's first call);
  - the burn flame's data words (InitAnimLinearTranslation's raw Q8 delta with the direction bit, the accumulator, and
    StoreSpriteCallbackInData6(DestroyAnimSprite) = 0x080A3BFD).

## 3. Landing recipe (SA5: SLP, BRN, INFATUATION; extends stp128 §3)

Common steps 1–3 are stp128's. These three go on the same `status-animation` command / effect (the generic plumbing sar131 adds).

1. **Command / clock.**
   - `minimumFrames` = `controllerRows` + gate (SLP / INFATUATION 97, BRN 39).
   - Frame mapping as stp128 §3.1: command age a == reducer rel a + 1 (+ the gate rows on gated paths). For BRN after Fire Punch /
     Will-O-Wisp the gate is the damaging / status move's IsBattleSEPlaying hold before rel 0; the spans themselves are path-independent.
2. **View.** Call `statusAnimationDisplayRow(animation, age + 1, statusConditionTarget(side, origin.x + 32, origin.y + 32, restX2))` from
   the same `statusConditionRenderView` stp128 §3.2 describes. It covers all seven, so one view serves SA5..SA8.
3. **Draw** (the comparator's `paint`, `tools/integration/stq132Compare.ts`):
   - `drawTileBg(battleBg.static)`;
   - the elevated-opponent shadow unless `enemyShadowHidden`;
   - the battlers at their idle rest (`battlerOffset`);
   - the sprites in the given order (all priority 2, in front of both battlers):
     - **letter Z**: `restArt.letterZ` (src/animation/assets/rest.json) through `drawSpriteSheetAffineRotate(fb, tileset, palette, left
       + 16, top + 16, a, b, c, d, undefined, false)`, exactly Move_REST's call minus `screenCenterYOffset`;
     - **burn flame**: src/assets/gen/battle-anim-small-ember.json, the 32x32 frame `tileOffset / 16` (= battleScene.ts
       `firePunchEmberTileset(frame)`), `drawSpriteSheet` at `left / top`, as `drawFirePunchParticleList`;
     - **heart**: `charmArt.magentaHeart` (src/animation/assets/charm.json), `drawSpriteSheet` at `left / top`;
   - **then** the healthboxes and the message window: the player-side letters rise under the opponent healthbox.

   No blend, no BG copy, no palette rotation.
4. **x2 tracker** (`liveBattlerX2History.ts:9-24`). Today "any other general or status animation" makes the side `unknown`. These
   three are **`keep`**: source-verified (the three scripts have no visual task and no battler access), and pinned on every row of all
   37 windows (`battlerX2 == idleX2`). So `liveBattlerX2History` may treat B_ANIM_STATUS_SLP / BRN / INFATUATION like HIT_ANIMATION
   (keep). For the other four, stp128 §3.4 holds: CURSED / NIGHTMARE `zeroed`, CONFUSION / FRZ `keep`.
5. **Palette bank 7.** As stp128 §3.5: nothing for the renderer. ANIM_TAG_LETTER_Z / ANIM_TAG_SMALL_EMBER /
   ANIM_TAG_MAGENTA_HEART are written into bank 7 on rel 1 and left stale after the free. That stale record belongs to SA9.
6. **Sprite order / allocator.** Unchanged: the audit's create / destroy streams equal the reducer's rows.

| slice | sprites / art (existing assets) | battler | BG / registers | acceptance (re-use this pack) |
|---|---|---|---|---|
| SA5 SLP | letter Z: rest.json `letterZ`, affine (reducer matrix), 2 sprites | idle (keep) | none | `stq132Compare.ts` through the production view: 16 windows, 0 px |
| SA5 BRN | burn flame: battle-anim-small-ember.json frames 0..4, 3 sprites, equal-y tie to the earlier slot | idle (keep) | none | 13 windows (incl. Fire Punch's secondary), 0 px |
| SA5 INFATUATION | heart: charm.json `magentaHeart` 16x16, 3 sprites, SortSprites y order | idle (keep) | none | 8 windows, 0 px |

## 4. Reproduction (from workspace/)

```
sh tools/integration/stq132Run.sh <fresh-out-dir-inside-the-repo>     # archive copy of HEAD, ~2 min, ends "stq132Run: ALL SAME"
npx vitest run tests/stq132StatusConditionReducer.test.ts tests/stp128StatusConditionReducer.test.ts   # 40 / 40 + 37 / 37
python3 tools/integration/stq132Stage.py <dir>/scenarios               # 13 scenarios (6 sta123 reused + 6 Golbat copies + Fire Punch)
sh tools/integration/stq132Job.sh <out-dir> <scenario.json> [<dump-dir>]   # one direct-mGBA probe job (stq132Probe.py)
python3 tools/integration/stq132Receipt.py <probe-dir> tools/integration/fixtures/stq132/scenario-index.json <rom-windows.json>
python3 tools/integration/stq132NpzToRaw.py <dump-dir> tools/integration/fixtures/stq132/rom-windows.json <raw-dir>
node --experimental-strip-types --no-warnings tools/integration/stq132Compare.ts <raw-dir> <out.json> [--neg=age+1|wrong-side|drop-one|no-affine|tie-swap|index-order] [--no-healthbox]
python3 tools/integration/stq132CompareReceipt.py <compare.json> <main.json> <name>=<control.json> ...
python3 tools/integration/stq132Perturb.py <out.json> [<raw-dir>]      # the perturbation table (~9 min with a raw dir)
```

The runner does the following:
1. Archives HEAD and links node_modules / reference.
2. Re-stages the 13 scenarios (== committed).
3. Runs 13 probe jobs x2 (7 parallel; r1 dumps the window frames). It checks r1 == r2, the committed sha256, and `rom-windows.json`
   (r1 == committed, r2 == r1).
4. Runs the stq132 + stp128 reducer tests in the copy.
5. Runs the comparator and the 7 controls. Their `compare.json` must equal the committed one.

It deletes the frame dumps (`STQ132_KEEP_RAW=1` keeps them) and its archive copy (`STQ132_KEEP_COPY=1` keeps it) at the end; the out
dir keeps only the probe outputs and receipts (~10 MB).

Fixtures (`tools/integration/fixtures/stq132/`): `scenarios/` (13), `scenario-index.json`, `probe-sha256.json`, `rom-windows.json`
(37 windows, every row expanded), `compare.json`, `perturbation.json`.

## 5. Gates

| gate | result |
|---|---|
| `sh tools/integration/stq132Run.sh .integration/validation/stq132-run1` (on `965ece3bd`; rerun on the final commit, see the session report) | **ALL SAME** (13 / 13 r1 == r2, 26 / 26 sha256, rom-windows SAME, tests 77 / 77, 37 / 37 windows 0 px, compare.json SAME), ~2 min |
| `python3 tools/integration/stq132Perturb.py tools/integration/fixtures/stq132/perturbation.json <raw>` | 24 / 24 mutations fail the pin test; file restored byte-for-byte |
| `npm test -- tests/stq132StatusConditionReducer.test.ts tests/stp128StatusConditionReducer.test.ts tests/animation/factoryAnimationInventory.test.ts tests/animation/animationBoundaryRatchet.test.ts` | 4 files / 88 tests passed |
| `npm run typecheck` | green |
| `npm run test:smoke` | 448 / 448 |
| full `npm test`, four shards (`npm test -- --shard=k/4`) | **1,643 files / 13,621 tests passed** (44 / 223 skipped), 0 failed |
| `npm run build` | green |
| `git diff --check a5e585119 HEAD` | clean |

One tracked file is modified (`src/animation/statusConditionAnimations.ts`, additions + the widened template union); everything else is new.
