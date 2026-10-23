# tl204: Scene ON rows after the live body of the zero-frame-tail moves

Evidence only. No file under `src/` changed. Everything below is measured from fresh Scene ON ROM rows (direct mGBA probes, each scenario run twice fresh, r1 == r2) and compared with production's command timeline on the same scenario.

## Method

- Scenarios: `tools/integration/tl204Stage.py` stages PRIMEAPE vs ONIX (mechanicLab `overrides.parties`, every ONIX move Tackle, seed 11, 960 closing frames), slot 0 = the measured move x4. Ten moves: Double Team (104), Rain Dance, Scary Face, Light Screen, Calm Mind, Sunny Day, Charm, Fake Tears, Leech Seed, Hail (nine of the 24 ont193 zero-frame-tail moves plus Double Team, which ont193 masks). Committed under `tools/integration/fixtures/tl204/scenarios/`; the twice-fresh receipts (rows r1/r2, identity line per case) are under `tools/integration/fixtures/tl204/rom/`.
- ROM rows (`tools/integration/tl204RomRows.py` -> `rom-rows.json`): per frame `gBattlescriptCurrInstr`, `instructionExecution`, screen sha. A "run" is consecutive frames on one pointer. Print runs have row 0 before the first glyph, so the first glyph is run row 1.
- `used -> print`: first glyph of "PRIMEAPE used <MOVE>!" to the first glyph of the print that follows the body (stat / weather / screen / seed print). `print -> next`: the end of that print chain to the foe's "used TACKLE!" typed burst (>= 8 changes in 12 rows, the sst200 rule).
- Production (`tools/integration/tl204Compare.ts`, via `lsd194Production.ts`: real kernel + `projectBattleResolutionCommands`, Scene ON, seed 1 for every move so the first print is a success print). Production `message` start = the ROM first-glyph row.
- Accounting: residual = (production `stat` rows - ROM script rows) + (production body rows - ROM animation-window rows). Script rows are one ROM row per script instruction (attackstring release row, the instructions through `attackanimation`, those between the `waitanimation` release and `printfromtable`, and `printfromtable` row 0). Windows are the runs where the pointer waits (`waitanimation`, `printfromtable` waiting on the stat-arrow animation).
- Regenerate: `node --experimental-strip-types --no-warnings tools/integration/tl204Compare.ts tools/integration/fixtures/tl204/rom-rows.json tools/integration/fixtures/tl204/production-vs-rom.json`.

## Result

`used -> print` rows (ROM / production / residual). Production's `print -> next` equals the ROM for all ten (residual 0, ROM gaps 98-111), so the rows after the print are already right; only the stretch between the used print and the first following print is short.

| Move | ROM | production | residual | script rows ROM - prod | window rows ROM / prod | `tailRows` | after rule (`tailRows - 1`) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Double Team | 271 | 266 | -5 | 7 - 2 = 5 | 239 / 239 | 6 | 0 |
| Rain Dance | 219 | 214 | -5 | 5 - 0 = 5 | 190 / 190 | 6 | 0 |
| Sunny Day | 190 | 184 | -6 | 6 - 0 = 6 | 161 / 161 | 7 | 0 |
| Hail | 185 | 179 | -6 | 6 - 0 = 6 | 161 / 161 | 7 | 0 |
| Leech Seed | 207 | 168 | -39 | 39 - 0 = 39 | 144 / 144 | 40 | 0 |
| Light Screen | 121 | 117 | -4 | 6 - 0 = 6 | 89 / 91 | 7 | +2 |
| Charm | 218 | 212 | -6 | 7 - 2 = 5 | 192 / 191 | 6 | -1 |
| Fake Tears | 209 | 208 | -1 | 7 - 2 = 5 | 178 / 182 | 6 | +4 |
| Calm Mind | 220 | 210 | -10 | 9 - 2 = 7 | 188 / 185 | 7 | -4 |
| Scary Face | 333 | 314 | -19 | 7 - 2 = 5 | 302 / 288 | 6 | -14 |

Production's current `tailFrames` is 0 for all ten (the ont193 zero-frame set: trail unknown, or for Double Team `rows.pre === 0`). `universalRows` is pre 3 / post 0, except Double Team pre 0 / post 0.

Reading the table: every residual is production early. The script-row column accounts for most of it everywhere; the window column is zero for the five "exact" moves and non-zero for the five with a body-length difference.

## Source localisation

Script rows (`reference/pokeemerald/data/battle_scripts_1.s`), the part production does not emit because the tail is 0 frames:

- Rain Dance / Hail / Light Screen / Sunny Day (`BattleScript_EffectRainDance`, `_EffectHail`, `_EffectLightScreen`, `BattleScript_MoveWeatherChange`, `BattleScript_PrintReflectLightScreenSafeguardString`): `attackstring`, `ppreduce`, the `setrain`/`sethail`/`setlightscreen`, (`goto`), `attackanimation`, `waitanimation`, `printfromtable`. Each instruction is one ROM row; measured 5 (Rain), 6 (Hail, Light Screen, Sunny Day). Production has 0 `stat` rows for these.
- Leech Seed (`BattleScript_EffectLeechSeed`): `attackstring`, then `pause B_WAIT_TIME_SHORT` (a pause countdown, one row per frame, 32 rows) before `ppreduce`, `jumpifstatus2`, `accuracycheck`, `setseeded`, `attackanimation`. Measured 39 script rows; this is the whole -39. The ont193 trail model treats this as 0.
- Charm / Fake Tears / Scary Face (`BattleScript_EffectStatDown`): `attackcanceler`, `jumpifstatus2`, `accuracycheck`, `attackstring`, `ppreduce`, `statbuffchange`, two `jumpifbyte`, `attackanimation`, `waitanimation`, `setgraphicalstatchangevalues`, `playanimation`, `printfromtable`. Measured 7 script rows; production already emits 2 `stat` rows, so 5 are missing.
- Calm Mind (`BattleScript_EffectCalmMind`, `BattleScript_CalmMindDoMoveAnim`): `attackstring`, `ppreduce`, `jumpifstat`, `attackanimation`, `waitanimation`, `setbyte`, `playstatchangeanimation`, `setstatchanger`, `statbuffchange`, `jumpifbyte`, `printfromtable`. Measured 9; production 2.
- Double Team (`BattleScript_EffectEvasionUp` -> `_EffectStatUp...`): measured 7, production 2. Because `rows.pre === 0` (masked), `liveMoveScriptTailFrames` returns 0 before it looks at the tail rows.

Animation windows (`reference/pokeemerald/data/battle_anim_scripts.s`), the body-length differences. Only the move scripts are localised; which production table row differs is not yet traced:

- Scary Face (`Move_SCARY_FACE`): ROM windows 302, production 288 (-14). Two `waitforvisualfinish` after palette blends (`simple_palette_blend` delay 3, blend_y 0->16 and 16->0), `delay 10`, `AnimTask_ScaryFace`, `delay 13`. Production's body is 14 rows short; which of these waits it under-counts is not traced (hypothesis only: the palette blend-out wait).
- Fake Tears (`Move_FAKE_TEARS`): ROM 178, production 182 (+4). Four `delay 8` groups of tear sprites and a final `waitforvisualfinish` that follows the last sprite lifetime.
- Light Screen (`Move_LIGHT_SCREEN`): ROM 89, production 91 (+2). `setalpha`, `waitplaysewithpan 15`, `delay 10`, `SpecialScreenSparkle`, `delay 1`, `blendoff`.
- Charm (`Move_CHARM`): ROM 192, production 191 (-1). Three heart sprites with `delay 15` x2 and a final `waitforvisualfinish`.
- Calm Mind (`Move_CALM_MIND`): ROM 188, production 185 (-3), plus a 3-row post-arrow window vs 2 production `stat` rows. Two `AnimTask_BlendBattleAnimPalExclude` fades around three `gThinRingShrinkingSpriteTemplate` rings (`delay 14` x2).

## Proposed rule (not implemented)

1. For the measured moves, the missing stretch is the script rows and equals `tailRows - 1` frames (trail -1, post 0) in `liveMoveScriptTailFrames`: set the trail to -1 for Double Team, Rain Dance, Sunny Day, Hail, Leech Seed, Light Screen, Charm, Fake Tears, Calm Mind, Scary Face (equivalent to `LIVE_MOVE_POST_ROW_SIDES` membership for the tail, without changing the body rows). This takes Double Team, Rain Dance, Sunny Day, Hail and Leech Seed to exactly 0.
2. Double Team needs the `rows.pre === 0` early return lifted (the masked pre must not gate the tail).
3. Calm Mind's tail is `tailRows - 1 = 6` rows against a -7 script deficit: the extra row is the third post-arrow row that production folds into a 2-row `stat`.
4. The remaining non-zero residuals (Scary Face -14, Fake Tears +4, Light Screen +2, Charm -1, Calm Mind -3 body) are animation-window length in `data/battle_anim_scripts.s`, not tail rules. Leave them for body-timing steps.
5. Keep the other 14 zero-frame ont193 moves at 0 until measured.

Preserves gameplay outcomes, RNG, damage, turn order and facility state: only presentation row counts change.

## Not measured

- Production's body-start offset and per-row held-screen / pixel equality (there is no per-scenario production render).
- The front/tail split of the script rows (all counted as one block).
- The Scene OFF control for these scenarios.
- The 14 other zero-frame-tail moves.

## Pins

`tests/tl204ZeroTailRows.test.ts` pins the ROM numbers, current production numbers and the residuals above; the residuals are data, and re-pinning is the expected diff when the rule lands.

Code under test: `src/` tree `git rev-parse HEAD:workspace/src` at the tl204 commits is unchanged from the parent integration commit (no src edit in this step).
