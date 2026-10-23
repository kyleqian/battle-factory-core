# hpb202 - health-bar programs that threw (SHEDINJA maxHp 1, census "invalid HP program")

Two throws in `src/engine/healthboxAssembly.ts` (`assertBattleHealthBarProgram` / `battleHealthBarAnimationFrames`):

| | throw | reachable in the playable route? | cause |
|---|---|---|---|
| (a) | `source program did not converge 1->0/1` | **yes** (any SHEDINJA, Factory set 21, losing its only HP to damage / weather / poison) | the Q_24_8 branch of `CalcNewBarValue` was not ported faithfully |
| (b) | `invalid HP program A->B/M` (82 of 1000 census battles per scene) | **no** | census-harness artefact (stale displayed field), not a production path |

## (a) SHEDINJA / maxHp < 48 - the source

`CalcNewBarValue` (`reference/pokeemerald/src/battle_interface.c:2334-2395`), for `maxValue < scale (48)`:

* `toAdd = Q_24_8(maxValue) / scale` - an integer division of the 24.8 value: maxHp 1 -> 256/48 = 5 per frame.
* `currValue` is 24.8 fixed point; `ret = Q_24_8_TO_INT(currValue)` is an **arithmetic shift (floor)**. Moving left, `ret` is rounded up when `(currValue & 0xFF) > 0`.
* Done on `ret <= newValue` (left) / `ret >= newValue` (right): `currValue = Q_24_8(newValue)`; the next call returns -1.
* `CalcBarFilledPixels` (bar pixels) reads the fractional `currValue` (`(currValue * 48 / max) >> 8` for max < 48), the HP text (`UpdateHpTextInHealthbox`) reads `ret`. The sliver rule (`filledPixels == 0 && newValue > 0` -> 1 px) tests the animation's **target**, so a lethal drain ends with an empty bar.

So `1 -> 0 / 1` is 52 steps (51 steps leave `currValue` = 1/256, the 52nd lands on 0); the HP text stays 1 until the last step.

The old port used `Math.trunc` / `% 256` (C truncation toward zero) on the transient negative `currValue` of a draining bar instead of the source's arithmetic shift and `& 0xFF`. For max 1 the 52nd step (`currValue` = 1 - 5 = -4) was therefore still rounded up to 1 (`trunc(-4/256) = 0`, `-4 % 256 != 0`); `ret` only reached 0 at `currValue` <= -256, about 100 steps, past the 96-step conservative limit -> "did not converge" in both `battleResolutionCommandDuration` (hp case) and the renderer's per-frame `battleHealthBarValueAtFrame`.

### Port

* `battleHealthBarValueAtFrame` / new `battleHealthBarFillValueAtFrame` share one controller loop (`battleHealthBarControllerAtFrame`) that follows the source (floor, `& 0xFF` round-up, completion snap). `battleHealthBarAnimationFrames` is unchanged and now converges for every maxHp 1..47 and every from/to (swept in the test).
* The renderer feeds the bar's fractional `currValue` (`hpBarFraction`) to both the opponent bar and the player bar + overlay (`HealthboxContentParams.hpBarFraction`, `battleResolutionPresentationRender.ts`), only for `maxHP < 48` (other maxima: unchanged).
* The player-side compose now passes the target fraction to `calcBarFilledPixels` (sprite and overlay), which removes a 1-px red sliver production drew at the end of a lethal player-side drain (found by the ROM compare, 2 px residual at the last row; the ROM draws none).

## (b) "invalid HP program" - a harness artefact

`tools/integration/lsd194Census.ts` (and the ancestors it was copied from) computed every command's duration on the **segment-start** field (`s.field`). Production evolves the field per command (`currentCommandField` -> `applyCompletedCommand`; a `switch-in` replaces the battler, including `maxHP`). An hp command after an in-segment switch-in (a faint -> forced send-in, then residual damage / a drain on the new mon) therefore validated `from/to` against the **old** mon's maxHP: `311->292/143` etc.

Production calls `battleResolutionCommandDuration(c, currentCommandField(state))` and the renderer builds the same field, so it cannot reach this. Fix: the census uses the exported `battleResolutionFieldBeforeCommand(s.field, s.commands, i)`.

Census seeds (rngValue = seed, streak seed*11%49, rentals 0..2, least-used legal move), master harness on the master tree, each run singly:

| seed | throw (both scenes) | master cmds off/on | fixed harness cmds off/on |
|---|---|---|---|
| 1 | `311->292/143` | 78 / 78 | 139 / 139 |
| 15 | `163->139/142` | 321 / 317 | 332 / 328 |
| 16 | `173->173/163` | 138 / 136 | 219 / 219 |
| 19 | `167->126/154` | 853 / 880 | 971 / 1004 |
| 56 | `172->162/127` | 63 / 63 | 195 / 193 |

`tools/integration/hpb202Seed.ts` (diagnostic copy; `--oldfield=1` reproduces the stale field) prints the failing command, the segment-start field, the field before the command, the earlier switch-ins and the kernel events behind it. Seed 1 (off): the hp command at index 20 is `health-bar-update` 311->292 (`BattleScript_DamagingWeatherLoop`, weather damage) on battler 1; the segment-start field has species 219 (maxHP 143), but an earlier `switch-in` of the same segment (event 88) put species 113 (maxHP 311) there. The program is the new mon's HP against the old mon's maxHP.

Kernel events are untouched: for each seed x scene the fixed harness on the master healthbox/renderer sources and on the new ones gives identical `eventsDigest` and identical command rows (10/10), and master's partial rows are an exact prefix of the fixed rows.

## ROM evidence (SHEDINJA damage KO, both scenes, both sides)

Scenarios `tools/integration/fixtures/hpb202/scenarios/shedinja-ko-{opp,ply}.json`: SHEDINJA (species 303, genderless, Scratch) vs DUGTRIO Rock Slide (super effective, Wonder Guard). Direct mGBA through `tools/integration/lsd194Probes.sh` -> `sub183RomFrames.py` (`JOBS="<scenario>:off <scenario>:on"`), **twice from fresh processes, r1 == r2 byte-identical** (rows and raw RGB; sha256 in `fixtures/hpb202/rom-rgb-sha256.tsv`).

`tools/integration/hpb202BarCompare.ts <rom.rgb.gz> <out.json> --scene=.. --side=..` renders the real kernel + `renderBattleResolutionLiveView` and compares the hp command's rows 0..52 (52 bar steps + the first row) against ROM frames o..o+52 over the whole SHEDINJA healthbox rectangle (opponent {12,14,140,46}, 4096 px; player {126,72,230,112}, 4160 px), searching o over every ROM frame.

| scene | side | best o | residual (53 rows) | runner-up residual |
|---|---|---|---|---|
| off | opponent | 146 | 0 | 162 |
| off | player | 150 | 0 | 189 |
| on | opponent | 253 | 0 | 162 |
| on | player | 257 | 0 | 189 |

Compact results: `fixtures/hpb202/compare/*.json` (pinned by `tests/hpb202HealthBarPrograms.test.ts`). The HP text, the empty-bar end and the 5/256 per-frame bar movement all match; before the fix production threw before drawing anything.

(b) has no ROM case: it is not a production path, so there is no ROM behaviour to compare; production's per-command field is pinned in the Tier-1 test instead.

## Gates and scope

* `tests/hpb202HealthBarPrograms.test.ts` (14): maxHp 1 both directions, the sliver rule, maxHp 20 text rounding, a sweep of every maxHp 1..47 program, the maxHp >= 48 control, the (b) field-before-command class, the ROM receipts.
* Run singly: `healthboxAssembly`, `battleSceneHealthboxFactories`, `battleHealthbox`, `lsd194PrintFloorAndDrain`, `battleResolutionPresentation`, `sub183SubstituteTurnTiming` pass unchanged.
* Production code changed (`healthboxAssembly.ts`, `battleResolutionPresentationRender.ts`): the supervisor must still run the full `npm test`, `npm run build`, `npm run typecheck` and the 0..999 census; this session was forbidden to.
* Out of scope: faint timing (fnt201), drain animation, gameplay / RNG.
