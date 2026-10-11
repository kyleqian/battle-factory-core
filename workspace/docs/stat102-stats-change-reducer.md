# stat102 (S10A, ISSUES #166 slices a + b): General_StatsChange pure reducer + dense ROM comparator

Base: master `64f0ae997` (production src `72e4e0ab`). The only change under `src/` is the new file `src/animation/statsChange.ts`. It is NOT
wired into production: no command, no duration, no renderer call. Evidence comes from direct mGBA only, never the shared HTTP oracles.
Commits: `1c6ce7836` (reducer + test), `927ecad33` (shadow-hide field), `cb0b8bc0c` (comparator + runner + receipt), then this doc.
The design is `docs/stat101-stats-change-design.md`.

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| Slice (a): does a pure reducer reproduce every ROM row? | **Yes. Every row of all 20 committed stat101 TSVs is pinned: rel A-1 .. E+3, 1,684 rows.** Pinned columns: EVA / EVB, BG1 X / Y from Step2 on (before that: the previous animation's leftovers, unchanged), the visible BG1 lag, WINOUT / BLDCNT, the copy slot, the OBJ-window OAM entry, act. The full animArg switch is pinned too (-1..70). `npx vitest run tests/statsChangeReducer.test.ts`: **24 / 24** | `tests/statsChangeReducer.test.ts` |
| Perturbation experiment | Each single-constant mutation fails the pin: RESET_LAG_ROWS 2 -> 0: 21 / 23 failed; non-sharp waitTime 20 -> 21: 16 / 23; OAM lag 2 -> 1: 20 / 23; the fade timer `> 0` -> `>= 0`: 21 / 23 (run before the shadow test existed, which was the 24th test). The restored file passes 23 / 23 | section 3 |
| Slice (b): is the reducer + production corner pixel-exact? | **Yes. 20 / 20 windows are 0 px, both in the 64x64 mask rect at the production corner and on the FULL SCREEN, on every row A-1 .. E+2 (1,664 rows = 14 x 79 + 6 x 93).** This includes Memento ON (x2 = 1 -> corner 145) and the elevated GOLBAT (y 3, shadow). The banner comes only from the reducer (palette / direction / bannerVisible / eva / bg1YVisible) plus production's `drawStatIncreaseBannerForBattler` / `drawStatDecreaseBannerForBattlerPalette`. The mask is `battleCommandFieldSpriteOrigin` + live x2 / y2 (== the ROM rect 20 / 20) | `tools/integration/fixtures/stat102/proto-compare.json` |
| E+3 | Outside the animation. The next instruction's message box starts drawing there: 559..922 px on the 6 print-path scenarios (Harden, Agility, Growl, Screech, Icy Wind, Intimidate; both scenes). The playstatchangeanimation paths (Cosmic Power, Tickle, Superpower, Memento) show 0 px on E+3, because their next instruction is the stat write | `afterWindow` per window |
| **Correction: shadow hide rows** | stat101 said the shadow is hidden on rows 0..E+1. **It is hidden on rows 1 .. E+1**: rel 0 still shows it (200 px on rel 1 with a uniform lag 2). Source reason: gAnimScriptActive rises in BattleMainCB1 (the controller's `LaunchBattleAnimation`), before CB2's `AnimateSprites`, so the OAM built on rel 0 already hides it (shown rel 1). It falls in `Task_ClearBitWhenBattleTableAnimDone` (CB2 `RunTasks`, after `AnimateSprites`), so the shadow returns on E+2. Reducer field `enemyShadowHidden` | reducer `SHADOW_*_LAG_ROWS`, pixel receipt |
| Regressions | The stat101 prototype on the new base (`927ecad33`) == the committed `fixtures/stat101/proto-compare.json`. Probes r1 == r2 22 / 22 == stat101 `probe-sha256.txt`; receipts and the 20 TSVs are byte-identical. Two fresh runs (run2 generated the receipt; run3 ALL SAME) | `stat102Run.sh` |
| Census / differential | Unchanged by construction: `git diff 64f0ae997 927ecad33 -- src/` = only `src/animation/statsChange.ts` (+269). `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 64f0ae997`: **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173) | |

Gates on `cb0b8bc0c`:
- Full suite in two foreground shards: **1,626 files / 13,382 tests passed** (44 / 223 skipped), 0 failed. Shard 1: 813 files / 6,975 tests (02:53 -> 02:58). Shard 2: 813 / 6,407 (02:58 -> 03:03).
- `npm run build`: green.
- `npm run typecheck`: green.
- `npm run test:smoke`: 448 / 448 (at `1c6ce7836`).
- Animation boundary ratchet: 3 / 3. The module has no imports.

## 2. Reducer API (`src/animation/statsChange.ts`)

- `statsChangeParams(animArg)` -> `{animArg, direction "up"|"down", palette (stat-anim-banner.json key), sharply, targetBlend 10|13, waitTime 20|30, velocity +-3, bg1X 0|64}` or null (the task is destroyed at once). It follows the source switch order: 21 is EVASION up, and 56 is multiple up2.
- `statsChangeSpan(params)` -> `{state3Rel 67|89, endRel 75|89, nextInstructionRel 77|91, addedRows 76|90}`.
- `statsChangeRow(params, rel)` -> `{active, eva, evb, windowRegsVisible, bg1X, bg1YRam, bg1XVisible, bg1YVisible, copyAlive, maskOamVisible, bannerVisible, enemyShadowHidden}`. A field is null where the animation has not written it yet.

The reducer replays Step3's state machine (fade timer / blend / wait timer / state) literally from `battle_anim_utility_funcs.c`. Only these row anchors are ROM facts, each a frame-order fact identical in all 20 windows:

| Anchor | Value |
|---|---|
| Step1 | rel 1 |
| Step2 copy allocated | rel 2 |
| Step2's LZ decompressions overrun 2 VBlanks | BG1 X / Y land on rel 4 |
| `ResetBattleAnimBg` call (ClearBattleAnimBg) overruns 2 VBlanks | Y 0 lands 2 rows late, state 3 on 67 / 89 |
| SetGpuReg lag | 1 row |
| Task-driven sprite -> OAM lag | 2 rows |
| `end` waits for the stat SE | E 75 |

Together these explain stat101's "BG1 Y stops at +-180 / +-246, then 0, then +-3" tail.

## 3. Reproduction (from workspace/)

```
npx vitest run tests/statsChangeReducer.test.ts                     # slice (a): 24 / 24
sh tools/integration/stat102Run.sh <fresh-dir-inside-the-repo>       # slice (b): ~50 s, ends "ALL SAME"
node --experimental-strip-types --no-warnings tools/integration/stat102ReducerCompare.ts <raw> <out.json>   # in the archive copy
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 64f0ae997
```

Perturbation: copy the module aside, `sed` one constant (e.g. `const RESET_LAG_ROWS = 0;`), run the test (it fails), then restore the copy.

`stat102Run.sh` does the following:
1. Archives `927ecad33` into the fresh directory.
2. Re-stages the 11 scenarios.
3. Runs 22 probe jobs x2 (8 in parallel; r1 dumps frames inside the run directory).
4. Checks the receipts against stat101.
5. Runs the stat101 prototype regression.
6. Runs the reducer comparator and checks it against `fixtures/stat102/proto-compare.json`, requiring 20 / 20.

## 4. Next: slice (c), restated with the stat102 corrections

**(c) Presentation command + duration, both scenes (no renderer yet).**

- Add a `stats-change` command at the STATS_CHANGE `animation` event, using the SUBSTITUTE_FADE pattern (`battleResolutionPresentation.ts:3387` / `:3740-3745`).
- Duration: `statsChangeSpan(statsChangeParams(arg)).addedRows` (76 / 90). This replaces the hard-coded 76 / 90.
- Emit none when `statsChangeParams` returns null, and none behind a Substitute.
- Make the Double Team decision (stat101 section 3).

**Frame mapping (stat102).** If (c)'s anchor test confirms δ = 0 (production's next command starts on the ROM's baseline X + 1 row), the command's 76 / 90 frames are ROM rel 1 .. E+1. So **command age a == reducer rel a + 1**. The consequences:
- The elevated-opponent shadow is hidden on exactly the command's frames (`enemyShadowHidden` is true on rel 1 .. E+1 and false on rel 0 / E+2). The renderer can hide it for the whole command with no extra rows.
- Banner rows are ages 6 .. 63 / 6 .. 85.
- The next command's first row (rel E+2) shows the shadow again. On the print paths, the message box starts on its second row (E+3).

Tier-1: command order for the five paths. Then the anchor test, the patched-copy full suite, `pins.json`, and the census delta, all as stat101 section 4 (c).

**(d) Renderer.** Use `statsChangeRow(params, age + 1)` (`bannerVisible`, `eva`, `bg1YVisible`, `enemyShadowHidden`) with the stat102 corner (`battleCommandFieldSpriteOrigin` + live x2 / y2). The shadow draw is `battleScene.ts drawSourceOpponentEnemyShadow` (private; the comparator replays it from `battle-enemy-shadow.json`). Acceptance: the stat102 comparator through `renderBattleResolutionLiveView`, at 0 px rect + full screen on A-1 .. E+2.
