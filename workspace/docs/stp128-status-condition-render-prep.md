# stp128 (S10A, ISSUES #168 renderer prep for SA6 / SA7 / SA8): CURSED, NIGHTMARE, CONFUSION, FRZ — dense ROM windows, unwired reducers, 0 px comparator

Evidence + an UNWIRED pure reducer only. **New files only**; no existing tracked file is edited and no production module imports the new
`src/animation/statusConditionAnimations.ts`. Base: FIXED master `9a184dfa6` (production src `b4befa039`). Evidence is direct mGBA only
(Scene ON, `factory.json` bootstrap, explicit lab seeds), never the shared HTTP oracles. Every probe job runs twice in fresh processes.
Design inputs: docs/sta123-status-animations-design.md (§1 rows, §2a components, §5 SA6..SA8) and docs/status-animation-sprite-audit.md.
The shape copies stat102 (reducer + dense comparator) -> scd112 (the production landing).

## 1. Results first

Per animation x side, all windows rel -1 .. E + 2 (release + 1), full screen and the affected rect, through EXISTING production helpers
(`tools/integration/fixtures/stp128/compare.json`):

| animation | side (target) | windows | species pairs (target / other) | rows | px (full / rect) |
|---|---|---|---|---|---|
| CURSED | player | 4 | Onix / Gengar, **Golbat** / Gengar | 312 | **0 / 0** |
| CURSED | opponent | 4 | Onix / Gengar, **Golbat (elevated, shadow)** / Gengar | 312 | **0 / 0** |
| NIGHTMARE | player | 3 | Shuckle / **Haunter (elevated opp, shadow)**, Golbat / Gengar | 234 | **0 / 0** |
| NIGHTMARE | opponent | 6 | Shuckle / Haunter, **Golbat (elevated)** / Gengar | 468 | **0 / 0** |
| CONFUSION | player | 6 | Onix / Primeape, Golbat / Primeape (move-inflicted + 2 self-checks each) | 618 | **0 / 0** |
| CONFUSION | opponent | 6 | Onix / Primeape, **Golbat (elevated)** / Primeape | 618 | **0 / 0** |
| FRZ | player | 3 | Shuckle / Delcatty: 1 after Ice Beam (E 115) + 2 frozen turns (E 116) | 2 x 120 + 119 | **0 / 0** |
| FRZ | opponent | 2 | Shuckle / Delcatty: 1 after Ice Beam (E 115) + 1 frozen turn (E 116) | 120 + 119 | **0 / 0** |

**34 / 34 windows, 0 px on every row, no residual.** FRZ has only one species pair per side: freezing is a 10 % Ice Beam roll, and only the
sprite audit's swept seeds are staged. Its second "pair" is the two paths, after Ice Beam and the frozen turn.

- **ROM windows**: 14 scenarios, 34 windows, rows rel -2 .. E + 3 (release + 2). r1 == r2 on 14 / 14 jobs (byte-identical outputs,
  `probe-sha256.json`). Per row the probe records: the screen sha and changed bbox; every enabled OAM entry; the created sprites (x / y /
  x2 / y2 / invisible / priority / subpriority / animNum / animCmdIndex / tile / data[0..7]); the battler's x / y / x2 / y2 / invisible;
  gBattle_BG1/2_X/Y; DISPCNT / BG1CNT / BG2CNT / BLDCNT / BLDALPHA; OBJ palette bank 7; the anim-script pointer / sAnimFramesToWait.
- **Reducer** pins every source row of all 34 windows (`tests/stp128StatusConditionReducer.test.ts`, 37 / 37; the extra test pins the spans to sta123's controller rows). The pinned fields are
  gAnimScriptActive, the controller hold up to the release row, the battler's x2 / y2 / invisible, the monbg BG shadows,
  BLDCNT / BLDALPHA, and every sprite field above. FRZ's ice-cube palette rotation is pinned on exactly the rows where OBJ palette RAM
  changes. The test also pins `statusConditionTarget` (geometry from the battler sprite) on every window.
- **Perturbation experiments.** Each single-constant mutation fails the pin test (run on 36 tests, before the span test existed); the restored file passes:

  | mutation | failing tests |
  |---|---|
  | GHOST_CREATE_ROW 6 -> 7 | 18 |
  | ghost Sin amplitude 12 -> 11 | 17 |
  | ghost wave step 6 -> 5 | 17 |
  | ghost fade start `data[7] > 30` -> `> 29` | 17 |
  | ghost BLDALPHA 0x050B -> 0x050C | 18 |
  | ShakeMon2 numTimes 14 -> 13 | 17 |
  | GHOST_BATTLER_VISIBLE_ROW 47 -> 48 | 17 |
  | MONBG_ROW 3 -> 2 | 22 |
  | DUCK_CREATE_ROW 3 -> 4 | 13 |
  | duck Cos amplitude 30 -> 29 | 12 |
  | duck priority threshold 128 -> 127 | 6 |
  | duck duration 90 -> 89 | 12 |
  | DUCK_FRAME_TICKS 8 -> 7 | 12 |
  | createsprite subpriority `target - 2` -> `- 1` | 29 |
  | FREEZE_CREATE_ROW 6 -> 5 | 5 |
  | FREEZE_REGISTER_LAG 1 -> 0 | 5 |
  | FREEZE_BATTLER_VISIBLE_ROW 111 -> 110 | 5 |
  | FREEZE_BG_RESET_ROW 115 -> 116 | 5 |
  | cube anchor `animY - 36` -> `- 35` | 5 |

- **Comparator negative controls** (each must fail; `compare.json` `controls`):

  | control | clean windows | meaning |
  |---|---|---|
  | `age+1` (display row + 1) | 0 / 34 | every window fails |
  | `wrong-side` | 5 / 34 | every ghost / duck window fails; FRZ has no side-dependent motion |
  | `no-shake` | 17 / 34 | all 17 ghost windows fail |
  | `no-rotation` | 29 / 34 | all 5 FRZ windows fail |
  | `lag-swap` (the other FRZ path's load lag) | 29 / 34 | all 5 FRZ windows fail |
  | `blend-gba5` (hardware 5-bit blend math) | 17 / 34 | all 17 ghost windows fail; it happens to match on the duck (opaque) and the ice cube |
  | `no-occluders` (no healthbox / message-window footprint) | 24 / 34 | the 5 player-target ghost windows (the ghost rises under the opponent healthbox) and all 5 FRZ windows (the cube reaches the message window / player healthbox) fail |

- **The blend is 8-bit.** mGBA blends the expanded 8-bit channels: (231 x 6 + 239 x 10) >> 4 = 236, which is not a 5-bit expansion value.
  So production's `drawSpriteSheetBlendedOverFb` / `blendChannel` is exact, and the hardware-style 5-bit formula is wrong (it is the
  control above).
- **FRZ 116 vs 115: cause isolated.** It is CPU load, not sound.
  - **Frozen turn (`MoveUsedIsFrozen`).** The launch row rel 0 ends with sBattleAnimScriptPtr at Status_Freeze + 5 and
    sAnimFramesToWait 0. That is *inside* `loadspritegfx ANIM_TAG_ICE_CUBE`: past its opcode byte, before its `+= 2`. The ice-cube LZ
    decompression (4,608 bytes) straddles the VBlank, so one row is lost, and every later row (monbg 4, create 7, ..., E 116) is
    shifted +1.
  - **After Ice Beam (`MoveEffectFreeze` behind the 17 / 18-row IsBattleSEPlaying gate).** Both `playsewithpan` and `loadspritegfx`
    finish on rel 0 (pointer + 7, wait 1): monbg 3, create 6, E 115.
  - Every other row is identical between the two paths. The reducer takes this as `freezeLoadLagRows` (1 frozen turn, 0 after a
    gated damaging move): a measured dominant phase per path, the D4 faithful-timing class.
- **Other ROM facts the landing needs:**
  - The monbg copy is pixel-identical to the sprite at offset 0. monbg runs on rel 3 / 3 + lag, and clearmonbg brings the sprite back
    on 47 (ghost) / 111 + lag (FRZ). Only the shake makes the copy visible.
  - The shake shows one row late (the BG scroll shadow is copied in the next VBlank).
  - Script-created sprites first reach the screen 2 rows after their create row (task after BuildOamBuffer, then the OAM copy), and
    then show the state of the row before. The ghost callback's BLDALPHA writes show on their own row; the create-row write shows
    one row later.
  - An elevated opponent's shadow is hidden on rel 1 .. E + 1 (stat102's rule, confirmed here on Golbat / Haunter).
  - ShakeMon2 leaves the battler's x2 at 0 (CURSED / NIGHTMARE). CONFUSION / FRZ keep the idle x2 (the Onix opponent's 1).

## 2. Reducer API (`src/animation/statusConditionAnimations.ts`, unwired)

Imports: `../engine/battleMenu.ts` (GBA_SINE_TABLE_256), `./shakeMon2.ts`, `./frozenIceCube.ts`. The boundary ratchet is unchanged.

- `type StatusConditionAnimation = "CURSED" | "NIGHTMARE" | "CONFUSION" | "FRZ"`.
- `statusConditionTarget(side, spriteX, spriteY, idleX2 = 0)` -> `StatusConditionTarget`:
  - `spriteX / spriteY` = gSprites[battler].x / y. That is production's `battleCommandFieldSpriteOrigin(art, side)` + 32, elevation
    included; it is equal on all 34 windows (`productionCornerEqualsRom`).
  - `animX / animY` = GetBattlerSpriteCoord(X_2 / Y_PIC_OFFSET) = sprite x / sprite y + 8 (player) or + 0 (opponent).
- `STATUS_CONDITION_SPANS[animation]` and `statusConditionSpan(animation, { freezeLoadLagRows })` -> `{ activeRows, controllerRows,
  createRow }`: CURSED / NIGHTMARE 74 / 75 / 6, CONFUSION 99 / 100 / 3, FRZ 115 + lag / 116 + lag / 6 + lag (the frozen turn is the
  default, lag 1).
- `statusConditionSourceRow(animation, rel, target, options?)` returns the RAM / register state at the end of row rel:
  - `{ active, controllerBusy, battlerX2, battlerY2, battlerInvisible, bg[4], sprites[], bldcnt, bldalpha }`;
  - each sprite is `{ template, index, x, y, x2, y2, invisible, priority, subpriority, animNum, animCmdIndex, tileOffset, hFlip, blend,
    size, data[8] }`.
- `statusConditionDisplayRow(animation, rel, target, options?)` returns what the screen of row rel shows:
  - `battlerOffset {x, y}` and `battlerOnBg`;
  - `sprites[]` in back-to-front order: `{ template, index, left, top, size, tileOffset, hFlip, priority, subpriority, blend: {eva, evb}
    | null }`. For the ice cube (size 64), `left / top` is the subsprite base; the four pieces sit at +(-16,-16), (-16,48), (48,-16),
    (48,48).
  - `enemyShadowHidden`;
  - `objPaletteRotation` (FRZ: the left rotations of ice-cube palette entries 13..15).
- The callbacks are literal ports:
  - `AnimGhostStatusSprite(_Step)` (battle_anim_ghost.c:1127-1174);
  - `AnimConfusionDuck(_Step)` (battle_anim_normal.c:258-296) and `sAnims_ConfusionDuck` (8-tick frames 0 / 4 / 0h / 8 and 0h / 4 / 0
    / 8; JUMP costs no tick);
  - AnimTask_ShakeMon2 (TARGET, 2, 0, 14, 1) via `shakeMon2OffsetAtTick`;
  - AnimTask_FrozenIceCube via `frozenIceCubeState`;
  - Task_UpdateMonBg's BG shadow formula; Cmd_createsprite's subpriority (target - 2).

## 3. Landing recipe (SA6 CURSED + NIGHTMARE, SA7 CONFUSION, SA8 FRZ)

Common to all four:

1. **Command / clock.** These go on sa125's `status-animation` command (battler, animation, minimumFrames = controllerRows + gate).
   - The render effect is added in `battleResolutionPresentationRender.ts`, next to the `stats-change` effect: the union at `:573`, the
     duration list at `:853` / `:1070`, and the effect at `:1562-1567`. It is `{ type: "status-animation", battler, animation, age:
     phaseElapsed, battlerX2Input }`, and it is skipped behind the Substitute doll, as the kernel already suppresses it.
   - **Frame mapping**, as stat102 §4 / scd112: command age a == reducer rel a + 1 (+ the gate rows before the rise on gated paths;
     confirm δ = 0 with the anchor test, as sc106 did).
2. **View.** A `statusConditionRenderView(view)` in `battleScene.ts`, modelled on `statsChangeRenderView` (`:7700-7740`).
   - It calls `statusConditionDisplayRow(animation, age + 1, statusConditionTarget(side, origin.x + 32, origin.y + 32, restX2), {
     freezeLoadLagRows })`.
   - `origin` is `battleCommandFieldSpriteOrigin(fieldArt[side], side)`. `restX2` is the tracked front idle rest
     (`liveBattlerAnchors(...).frontIdleRest`, as scd112).
   - Call it in the live-field render path where `statsChangeRenderView` is consumed (`:54818`).
3. **Draw** (exactly the comparator's order, `tools/integration/stp128Compare.ts` `paint`):
   - `drawTileBg(battleBg.static)`;
   - the elevated-opponent shadow unless `enemyShadowHidden` (drawSourceOpponentEnemyShadow);
   - priority-3 sprites;
   - the battlers (the target at `origin + battlerOffset`);
   - priority 1 / 2 sprites. Blended ones go through `drawSpriteSheetBlendedOverFb(…, eva, evb)`, the 8-bit helper (not a 5-bit
     blend). Opaque ones go through `drawSpriteSheet`.
   - **then** the healthboxes and the message window. Those already draw after the field in the live view, and they must stay in
     front: ghost under the opponent healthbox, cube under the message window / player healthbox.
4. **x2 tracker** (`liveBattlerX2History.ts:9-24`): a status animation makes the side `unknown` today.
   - CURSED / NIGHTMARE leave the battler's x2 at **0** (ShakeMon2's final write), so `zeroed` for that side.
   - CONFUSION / FRZ leave it unchanged (`keep`).
   - PSN / PRZ (also ShakeMon2) are out of scope here.
5. **Palette bank 7.** The audited tags load into bank 7: 0x27D8 ghost, 0x27ED devil, 0x2759 duck, 0x271A ice cube. Bank 7 is left
   stale after the free.
   - The renderer needs none of that: it draws from the assets. FRZ's rotation comes from `objPaletteRotation`.
   - The host still invalidates on every status animation (`factoryRoundBattleOrchestrator.ts:2366-2386`). Replacing that with the
     bank-7 stale record is SA9, not these slices.
6. **Sprite order / allocator.** Unchanged: the sprite audit's streams (5 ducks at +3 / all at +92; ghost / devil +6 / +47; cube +6 / +109
   (+ lag)) match the reducer's create / destroy rows.

Per animation:

| slice | sprites / art (existing assets) | battler | BG / registers | acceptance (re-use this pack) |
|---|---|---|---|---|
| SA6 CURSED | ghost: `src/animation/assets/curse.json` `ghost` (32x32, palette as is) | monbg copy + ShakeMon2 offset (`battlerOffset`, ±2 x, rows 7..33) | BLDCNT blend / TGT2_ALL, BLDALPHA from the reducer (0x050B, fade from display rel 36) | `stp128Compare.ts` through the production view: 8 windows, 0 px |
| SA6 NIGHTMARE | devil: `lovely-kiss.json` `devil` tileset rows 0..3 (frame 0) | same | same | 9 windows, 0 px |
| SA7 CONFUSION | duck: `dizzyPunch.json` `duck`: 16x16 frame = tiles `tileOffset .. +3`, hFlip per reducer; priority 3 behind the battlers, 1 in front | idle (no shake, no monbg) | none | 12 windows, 0 px |
| SA8 FRZ | ice cube: `src/assets/gen/battle-anim-ice-cube.json` pieces (production's battleAnimIceCube / Move_SHEER_COLD), palette 13..15 rotated `objPaletteRotation` | monbg copy at the idle rest | blend 0/16 -> 9/7 -> 0/16 from `frozenIceCubeState` | 5 windows, 0 px; pass `freezeLoadLagRows` 1 on MoveUsedIsFrozen, 0 after a gated damaging move (until SA2 measures other gates) |

## 4. Reproduction (from workspace/)

```
sh tools/integration/stp128Run.sh <fresh-out-dir-inside-the-repo>     # archive copy of HEAD, ~2 min, ends "stp128Run: ALL SAME"
npx vitest run tests/stp128StatusConditionReducer.test.ts              # 37 / 37
python3 tools/integration/stp128Stage.py <dir>/scenarios               # 14 scenarios (8 sta123 reused + 6 Golbat pairs)
sh tools/integration/stp128Job.sh <out-dir> <scenario.json> [<dump-dir>]   # one direct-mGBA probe job (stp128Probe.py)
python3 tools/integration/stp128Receipt.py <probe-dir> tools/integration/fixtures/stp128/scenario-index.json <rom-windows.json>
python3 tools/integration/stp128NpzToRaw.py <dump-dir> tools/integration/fixtures/stp128/rom-windows.json <raw-dir>
node --experimental-strip-types --no-warnings tools/integration/stp128Compare.ts <raw-dir> <out.json> [--neg=age+1|no-shake|wrong-side|no-rotation|lag-swap] [--blend=gba] [--no-healthbox]
python3 tools/integration/stp128CompareReceipt.py <compare.json> <main.json> <name>=<control.json> ...
```

The runner does the following:
1. Archives HEAD and links node_modules / reference.
2. Re-stages the 14 scenarios (== committed).
3. Runs 14 probe jobs x2 (7 parallel; r1 dumps the window frames). It checks r1 == r2, the committed sha256, and `rom-windows.json` (r1 == committed, r2 == r1).
4. Runs the reducer test in the copy.
5. Runs the comparator and the 7 controls. Their `compare.json` must equal the committed one.

It deletes the ~1 GB frame dumps at the end (`STP128_KEEP_RAW=1` keeps them). The out dir still holds ~1.6 GB (the archive copy and its
git repo); delete it after the run.

Fixtures (`tools/integration/fixtures/stp128/`): `scenarios/` (14), `scenario-index.json`, `probe-sha256.json`, `rom-windows.json`
(34 windows, every row expanded, ~1 MB), `compare.json`.

Perturbation recipe: copy the module aside, change one constant (section 1 table), run the test (it fails), restore the copy.

## 5. Gates (on `54a4747d7`)

| gate | result |
|---|---|
| `sh tools/integration/stp128Run.sh .integration/validation/stp128-run2` | **ALL SAME** (14 / 14 r1 == r2, 28 / 28 sha256, rom-windows SAME, test 37 / 37, 34 / 34 windows 0 px, compare.json SAME) |
| `npm test -- tests/stp128StatusConditionReducer.test.ts tests/animation/factoryAnimationInventory.test.ts tests/animation/animationBoundaryRatchet.test.ts` | 3 files / 47 tests passed (run before the span test was added) |
| `npm run typecheck` | green |
| `npm run test:smoke` | 448 / 448 |
| full `npm test`, two shards (`npm test -- --shard=1/2`, then `--shard=2/2`) | **1,640 files / 13,569 tests passed** (44 / 223 skipped), 0 failed |
| `npm run build` | green |
| `git diff --check 9a184dfa6 HEAD` | clean |

29 files changed, all added; no tracked file is modified.
