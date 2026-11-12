# fps147 (S10A side lane, ISSUES #139 presentation half): Scene ON B_ANIM_FOCUS_PUNCH_SETUP — dense ROM windows, unwired reducer, 0 px comparator, landing recipe

This step adds evidence and an UNWIRED pure reducer. **It adds new files only**: no existing tracked file is edited, and no production
module imports the new `src/animation/focusPunchSetUp.ts` (pinned by the test).

- **Base**: master `1c801184b`.
- **Evidence**: direct mGBA only (Scene ON, the `factory.json` bootstrap, the lab seed of rcp143's R4 card). Every probe job is run
  twice in fresh processes.
- **Out of scope**: the kernel pre-pass (ISSUES #139, main lane), any production wiring, and the Scene OFF presentation.

## 1. Results first

### Pixels

Windows run from the empty-box print through the row before the "…is tightening its focus!" glyph: rel -4 .. 122, full screen, 127
rows each. rel 0 is the first gAnimScriptActive row R. Rows 123 .. 128 are scored with the message band (y >= 112, the print)
reported apart. Source: `tools/integration/fixtures/fps147/compare.json`.

| window | Focus Punch user (frontier entry) | other battler | rows | reducer arm px | production Endure arm px |
|---|---|---|---|---|---|
| p-breloom | player BRELOOM (480) | JOLTEON | 127 + 6 | **0** | **0** |
| p-machamp | player MACHAMP (810) | JOLTEON | 127 + 6 | **0** | **0** |
| p-electabuzz | player ELECTABUZZ (503) | JOLTEON | 127 + 6 | **0** | **0** |
| p-breloom-golbat | player BRELOOM (480) | **GOLBAT (elevated opponent)** | 127 + 6 | **0** | 1,000 + 1,200 (exactly the 200-px shadow on rel -4..-1, 122..128) |
| o-golem | opponent GOLEM (498) | JOLTEON | 127 + 6 | **0** | **0** |
| o-aggron | opponent AGGRON (546) | JOLTEON | 127 + 6 | **0** | **0** |
| o-registeel | opponent REGISTEEL (840) | JOLTEON | 127 + 6 | **0** | **0** |
| p-machamp-sub | player MACHAMP **behind a substitute** | JOLTEON | timing only | no animation (§1d) | — |

**Summary: the reducer arm is 0 px on 7 / 7 windows and on every animation row.**

- **Reducer arm**: `focusPunchSetUpDisplayRow` composed with existing production helpers.
- **Production Endure arm**: the existing `liveMoveAnimationPresentation({ moveId: ENDURE })` + `renderSceneOnMovePresentation(…,
  liveField)` at age = rel. It is 0 px on the 6 windows without an elevated opponent.
  - On the elevated window it misses only the opponent shadow. That shadow must be visible outside display rows 1 .. 121, but the Endure
    body draws it on its age 0 only (§4e).

**Negative controls.** Each control is applied to the reducer arm and must fail (`compare-<neg>.json`):

| control | clean windows | meaning |
|---|---|---|
| `age+1` (display row + 1) | 0 / 7 | every window fails |
| `wrong-side` (the motion on the other battler) | 0 / 7 | every window fails |
| `no-shake` (attacker x2 0) | 0 / 7 | every window fails |
| `no-blend` (palette Y 0) | 0 / 7 | every window fails |
| `shadow-shown` (shadow never hidden) | 6 / 7 | fails exactly the elevated-opponent window |

### RAM

`tests/fps147FocusPunchSetUp.test.ts` (27 tests, committed fixtures only) checks, on every row (7 windows x 137 rows, rel -8 .. 128),
that the reducer's source row equals the RAM:

- gAnimScriptActive;
- sBattleAnimScriptPtr as label + offset (General_FocusPunchSetUp, or EndureEffect inside its calls);
- the attacker's x2;
- gAnimVisualTaskCount;
- every Endure particle: gSprites slot, x, y, animCmdIndex (frame), data[0], data[1].

The display row's palette Y also reproduces the attacker's hardware OBJ palette bank exactly (RGB_RED BlendPalette on BGR555) on
130 rows per window.

### Reproducibility

The ROM windows are r1 == r2 on 8 / 8 jobs (byte-identical probe JSON, `probe-sha256.json`). `tools/integration/fps147Run.sh` rebuilds
scenarios, probes, receipt and compare outputs (main and the 5 controls) into a fresh directory: **ALL SAME** (16 / 16 files).

### a. No CPU-load (D4) phase

The 7 animated windows rise at trace frames 44, 76 and 108, and every relative row is identical on all of them:

- S → R = 6;
- E − R = 120;
- the act / script-offset / visual-task / x2 / particle sequences;
- the palette change rows (43, 47, … 93).

The ShakeMon2 display lag (2 rows) and the blend display lag (1 row) are structural. They come from the general-animation host (§2),
not from load. 0 / 7 windows show an alternate phase, so no faithful-timing parameter is needed.

### b. Elevated

**No legal Focus Punch carrier is elevated.** The 9 carrier species are BRELOOM ×3, GOLEM, ELECTABUZZ, MILTANK, AMPHAROS, AGGRON,
MACHAMP, REGIROCK and REGISTEEL (11 entries of `battle-frontier-mons.json`). None of them is in `battle-enemy-shadow.json`'s
`elevatedSpecies`, so no elevated opponent Focus Punch window exists.

The elevated dependency is the other battler instead. SpriteCB_EnemyShadow (`battle_gfx_sfx_util.c:1214`) hides an elevated opponent's
shadow while gAnimScriptActive is set, whoever animates. The `p-breloom-golbat` window pins this: the shadow is hidden on display
rows 1 .. 121 (E + 1).

### c. Idle rest

All 9 carriers have a production front idle rest of x2 0 / y2 0, and the ROM opponent x2 is 0 at rest on all three opponent windows.
ShakeMon2 writes absolute x2 values and ends at 0, so no x2-tracker change is needed.

### d. Behind a substitute

`TryHandleLaunchBattleTableAnimation` (`battle_gfx_sfx_util.c:468-472`) returns early for a battler behind a substitute, because
FOCUS_PUNCH_SETUP is not one of `ShouldAnimBeDoneRegardlessOfSubstitute`'s ids. The controller completes at once and nothing is drawn.

The probed window has 0 active rows, 0 sprites, 0 visual tasks, x2 0, an unchanged palette, and the doll on screen (a frame was
viewed). Counted from the playanimation row X:

- "tightening its focus!" printstring at X + 3, first glyph at X + 4;
- with the animation: X + 124 / X + 125;
- difference: 121 rows.

Golem, Machamp and Registeel carry Substitute in their legal sets.

## 2. Why the Endure ages shift

General_FocusPunchSetUp (`battle_anim_scripts.s:10635-10646`) is **byte-identical** to Move_ENDURE (`:3196-3207`). Only the host
differs:

- **Move_ENDURE** runs in the controller (CB1), *before* AnimateSprites / BuildOamBuffer.
- **A general animation** runs from `Task_ClearBitWhenBattleTableAnimDone` inside RunTasks, *after* them
  (`battle_gfx_sfx_util.c:485-498`).

Measured against `endureAtAge` (src/animation/endure.ts, the accepted Endure port), with rel 0 = R:

| quantity | general animation at row rel | Endure |
|---|---|---|
| script offset, sprite creation, active | age rel + 1 (active rel 0..119 = 120 rows; R is already 3 bytes in) | age 0 .. 120 active (121 rows) |
| sprite positions / frames | age rel; on its create row a sprite holds the AnimEndureEnergy init position (CreateSpriteAndAnimate runs only the init) and lives 25 RAM rows | age (first step on the create row), 24 rows |
| BlendColorCycle Y, ShakeMon2 x2 | age rel; both tasks created on rel 37 (x2 = +1 initializer there), each ends one row later | age |
| **display** | **Endure's display at age rel**: sprites + palette Y from age rel − 1, x2 = `attackerDisplayX2` at age rel | (same) |

The display rows therefore coincide with production's Endure display at age = rel. That is why the production Endure arm is 0 px.

## 3. Reducer API (`src/animation/focusPunchSetUp.ts`, unwired)

The only import is `./endure.ts` (`endureAtAge`) plus the `./focusEnergy.ts` types. There is no new motion code.

- **`FOCUS_PUNCH_SETUP_ROWS`**: { scriptStart −6, emptyBoxDisplay −4, playanimationRow −2 (X), activeRows 120, taskCreateRow 37,
  focusPrintRow 122, focusFirstGlyphDisplay 123 }, all rel to R.
- **`FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_ROWS`**: { focusPrintRow 1, focusFirstGlyphDisplay 2 }, rel to the same nominal R = X + 2.
- **`focusPunchSetUpSourceRow(rel, side, attackerCoord)`**: the RAM at the end of row rel.
  - Fields: `{ active, script: { label, offset } | null, sprites[] (FocusEnergySprite + initOnly), paletteTaskActive, shakeTaskActive,
    visualTaskCount, attackerPaletteY, attackerX2 }`.
- **`focusPunchSetUpDisplayRow(rel, side, attackerCoord)`**: what the screen of row rel shows.
  - Fields: `{ sprites[] (ascending slot), attackerPaletteTarget "red", attackerPaletteY, attackerX2, enemyShadowHidden }`.
- **`attackerCoord`** is GetBattlerSpriteCoord(BATTLER_COORD_X / Y): production's `liveBattlerAnchors(side, art).battlePositionCenter`,
  (72, 80) / (176, 40). It equals the ROM on all 7 windows (each particle's init position).

## 4. LANDING RECIPE

### a. Kernel event (main lane, #139)

Run `BattleScript_FocusPunchSetUp` through the existing script machine with gBattlerAttacker = the Focus Punch battler, in
battler-index order, between turn-order fixing and action 1 (rcp143 R4 "Fix shape"). Its `playanimation` is already registered
(`battleScriptStatbuffchangeOpcode.ts:268`, dispatchBranch 5), so in Scene ON the machine emits:

1. `message STRINGID_EMPTYSTRING3`;
2. `{ kind: "animation", animationId: "FOCUS_PUNCH_SETUP", battler: <attacker>, arguments: [] }`
   (`battleScriptStatbuffchangeOpcode.ts:343`);
3. `message STRINGID_PKMNTIGHTENINGFOCUS`.

In Scene OFF the same opcode takes the HITMARKER_NO_ANIMATIONS branch (BattleScript_Pausex20). There is no animation event, only the
two prints and the pause.

### b. Timing rows

The Scene ON rows are ROM facts from 7 / 7 windows; R4 Breloom frames are in brackets. The Scene OFF column is rcp143 R4.

| row | Scene ON (rel to R; X = R − 2) | Scene OFF (R4 frames) |
|---|---|---|
| script entered (S) | −6 [70] | 70 |
| printstring EMPTYSTRING3 executes | −5 [71] | 71 |
| empty box on screen | −4 | — |
| waitmessage 1 done | −3 | — |
| playanimation executes (X) | −2 | Pausex20 instead |
| gAnimScriptActive (R .. E − 1) | 0 .. 119 [76 .. 195] | — |
| E (inactive) | 120 [196] | — |
| printstring PKMNTIGHTENINGFOCUS | 122 [198] (behind a substitute: 1) | 108 |
| first glyph | 123 [199] (behind a substitute: 2) | — |
| action 1 | 221 [297] (R4) | 207 |

- **The EMPTYSTRING3 message is 2 ROM rows** (printstring X − 3 → waitmessage done X − 1).
- ISSUES #167 already notes that production gives the charge-turn EMPTYSTRING3 a 24-frame message (off108). The same message here
  needs the same 2-row treatment, or every later row shifts by 22.

### c. Presentation command

In `battleResolutionPresentation.ts`, next to the HELD_ITEM_EFFECT / STATS_CHANGE payload branches (`:3819-3845`), map the Scene ON
`FOCUS_PUNCH_SETUP` payload to a new command (the command union lives next to `status-animation`, `:322-330`):

```ts
{ type: "general-animation", eventSequence, battler, animation: "FOCUS_PUNCH_SETUP", timing: { minimumFrames: 123 } }
```

- **Today the payload falls through.** No command is built, so nothing is drawn or timed.
- **Rows.** The command spans X + 1 .. X + 123 (rel −1 .. 121). The next message command's first row is the printstring row
  X + 124 (rel 122), and its first glyph shows at X + 125.
  - Confirm δ = 0 against the message command's first-row convention with an anchor test, as gaf140 / sc106 did.
- **Behind a substitute** (`fieldBattler(field, battler).substituteDoll === true`): `minimumFrames: 2` (X + 1 .. X + 2; printstring
  at X + 3) and no effect.

### d. Render effect

In `battleResolutionPresentationRender.ts`:

1. Add `{ type: "general-animation"; battler: 0 | 1; animation: string; age: number }` to `BattleResolutionRenderEffect` (`:564-590`,
   beside `status-animation`).
2. Add the command to the field-as-is list (`:849-864`).
3. Give it a duration of `minimumFrames`, as for `status-animation` (`:1093-1094`).
4. Build the effect like the status-animation one (`:1617-1626`) with **`age = phaseElapsed − 1`**. Command age a is ROM row X + 1 + a,
   so this age is the reducer's rel.

### e. Draw

The hook is `battleScene.ts` `renderBattleResolutionLiveView` (`:55485`). Two paths are proven:

1. **Reuse the accepted Endure body.** This is the comparator's production arm.
   - For age 0 .. 121, build `liveMoveAnimationPresentation({ moveId: 203 /* ENDURE */, attacker: battler, target: 1 − battler, turn,
     power: 0, damage: 0, friendship, multihit: 0 }, field, age)`.
   - Draw it with the existing `renderSceneOnMovePresentation(fb, presentation, true, hiddenSides)` call (`:55528`).
   - **Plus the shadow rule.** For an elevated opponent, set `liveOpponentShadow.species` iff
     `!focusPunchSetUpDisplayRow(age, …).enemyShadowHidden`. Without it, exactly the 200-px shadow is missing on the rows outside
     1 .. 121.
   - The Endure live branch reads no allocator / order / RNG input.
2. **Draw the reducer.** Write a `focusPunchSetUpRenderView(view)` modelled on `statusAnimationRenderView` (`:7766`, consumed at
   `:54903`). It draws `focusPunchSetUpDisplayRow(age, side, liveBattlerAnchors(side, art).battlePositionCenter)` exactly as
   `tools/integration/fps147Compare.ts` `paint` does:
   - `drawTileBg(battleBg.static)`;
   - the elevated-opponent shadow unless `enemyShadowHidden`;
   - the opponent battler, then the player battler, with the attacker's palette blended toward RGB_RED by
     `paletteFade.ts blendComponentToward(…, attackerPaletteY)` and its corner + front idle rest + `attackerX2`;
   - the particles from `src/animation/assets/focus-energy.json`, frame × 4 tile rows, corner (x − 8, y − 16), drawn in slot order
     9, 7, 5, 4, 3;
   - then the healthboxes and the message window. The live view already draws these after the field.

Path 2 is 0 px on 7 / 7 windows, the elevated opponent included.

### f. Hosts already keyed on the event

Each of these is registered for the event, but none has been verified for Focus Punch here:

- `liveSpriteOrderHost.ts:472` maps the payload to `{ kind: "general-animation", animation: "FOCUS_PUNCH_SETUP" }`;
- `spriteOrderProductionPlans.ts:316` has a FOCUS_PUNCH_SETUP plan;
- `liveMoveSpriteAllocator.ts:117` lists it among the general animations.

### g. x2 tracker

No change is needed (§1c).

### h. Not probed

- The semi-invulnerable skip in `Cmd_playanimation` (a battler that chose Focus Punch is not mid-Fly/Dig at turn start).
- Two Focus Punch users in one turn (battler-index order: two consecutive scripts).

## 5. Reproduce

```sh
sh tools/integration/fps147Run.sh /tmp/fps147-fresh         # everything; prints ALL SAME (about 20 s)
# pieces:
python3 tools/integration/fps147Stage.py <dir>               # the 8 scenarios (from rcp143 R4's card)
sh tools/integration/fps147Probes.sh <out> [<scenario-dir>]  # direct mGBA, Scene ON, r1 (with raw dump) + r2; "probes r1 == r2: 8 / 8"
python3 tools/integration/fps147Receipt.py <out> <fixture-dir>
node --experimental-strip-types --no-warnings tools/integration/fps147Compare.ts <out>/dump <out.json> [--neg=…] [--fixtures=<dir>]
npx vitest run tests/fps147FocusPunchSetUp.test.ts           # hermetic, 27 tests
```

## 6. Files (all new)

- `src/animation/focusPunchSetUp.ts`: the reducer (unwired).
- `tests/fps147FocusPunchSetUp.test.ts`: the hermetic pins.
- `tools/integration/fps147Stage.py`, `fps147Probe.py`, `fps147Probes.sh`, `fps147Receipt.py`, `fps147Compare.ts`, `fps147Run.sh`.
- `tools/integration/fixtures/fps147/`:
  - `scenarios/*.json` (8);
  - `rom-windows.json`: 7 animated windows plus `noAnimationWindows` (the substitute window);
  - `probe-sha256.json`;
  - `compare.json` and `compare-{age+1,wrong-side,no-shake,no-blend,shadow-shown}.json`.
