# scd112 (S10A, ISSUES #166 slice d): drawing the `stats-change` command (General_StatsChange's stat-arrow banner), both scenes

Base: master `0962e7b38` (production src `94a7f48b3`). Final production src: **`128c05c18`** (unchanged since `b8374abc6`). Slice (c)
(sc106) added the command and its 76 / 90 frames with no pixels. This slice draws them. **It adds pixels, not frames.**

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The renderer | `battleScene.ts statsChangeRenderView` + one draw branch in `renderBattleResolutionSceneOffView`. Scene ON's `renderBattleResolutionLiveView` sends non-move effects there, so both scenes share it. **Command age a = reducer rel a + 1.** The banner comes only from the reducer: `statsChangeParams` gives palette / direction; `statsChangeRow` gives `bannerVisible` / `eva` / `bg1YVisible`. It is drawn by the existing exact helpers (`drawStatIncreaseBannerForBattler` / `drawStatDecreaseBannerForBattlerPalette`). The mask is the battler's displayed pic (species / Castform form art of the field) at `battleCommandFieldSpriteOrigin`, which includes elevation. **Scene ON**: the opponent stands at its tracked front idle rest (`liveBattlerAnchors(...).frontIdleRest`, from the x2 history), because the ROM's OBJ-window copy takes the battler's live x2 / y2. **Scene OFF** has no x2 input and no residual x2. The elevated opponent's shadow is hidden while `enemyShadowHidden` (rel 1 .. E+1 = every command age). No banner is drawn while the battler's sprite is invisible, over the doll, or for an unplayable argument. No new constants | `battleScene.ts`, `battleResolutionPresentationRender.ts` (effect) |
| Production files touched | `battleResolutionPresentationRender.ts`: the `stats-change` effect (type and branch). `battleScene.ts`: `statsChangeRenderView`, the draw branch, and two import lines. **`factoryRoundBattleOrchestrator.ts` (+8 lines, outside the listed grant, needed for "residual x2 from the live history")**: at a `stats-change` command it passes the tracked x2 input, as it already does for `substitute-fade`. That host exists only in Scene ON, so the input is always present there (`{zeroed: []}` when no side is zeroed). This marks the scene. Presentation only: no frame, RNG or rule input. The boundary ratchet needs no entry, because `battleScene.ts` is already a consumer | `git diff 0962e7b38 HEAD -- src/` |
| **Comparator through production** | **19 / 20 windows 0 px**, rect AND full screen, rows A-1 .. E+2 (1,664 rows), r1 == r2. The missing window is **Growl ON: 82,916 px.** Every command row is off by ~1,091 px because the ONIX is drawn and masked at x 145 instead of the ROM's 144. Cause: the x2 tracker (`liveBattlerX2History.ts`) has no row for Growl (45). Its 0-power fallback keeps the target's rest (ONIX +1). But `Move_GROWL` ends with `AnimTask_ShakeMon2` on ANIM_TARGET, an absolute reset to x2 0, and the receipt shows ONIX x2 = 0. **With the tracker's Growl target row set to "zeroed" (experiment only): 20 / 20.** This is not fixed here, because the tracker also feeds live move bodies, so pixels outside stats-change frames would move | receipt `productionCompare`, `experiments.tracker-growl-zeroed` |
| Per window (ON and OFF identical unless noted) | Harden (16, player, ONIX opponent at rest +1 in ON) 0 / 0; Agility (41 sharply, elevated GOLBAT, shadow) 0 / 0; Growl (22, ONIX) **ON 82,916** / OFF 0; Screech (47 sharply down, player ONIX) 0 / 0; Cosmic Power (55 multiple) 0 / 0; Tickle (57) 0 / 0; Superpower (57, MACHAMP) 0 / 0; **Memento (58 sharply, ONIX x2 = 1 in ON: corner 145 == ROM)** 0 / 0; Icy Wind (24, elevated GOLBAT) 0 / 0; Intimidate (22, player) 0 / 0. The production corner == the ROM mask rect on every window except Growl ON. The raw production rect (no transplant) is also 0 px on every banner row of the 19 | same |
| Method | Production renders a constructed segment [previous message, `stats-change`, next command] (`tools/integration/scd112Windows.ts`). The next command is a message on the print path, and the 2-frame `stat` then a message on the playstatchangeanimation path. Renders use `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView` (ON) / `renderBattleResolutionSceneOffView` (OFF) at every ROM row. The constructed field's HP / text is not the ROM's, so production's frame is transplanted onto ROM row A-1: wherever it differs from production's ordinary frame for the command (the base tree's frame), the production pixel is used. A wrong mask / corner / rest / EVA / BG1 Y / palette / shadow row shows as px | `scd112ProductionCompare.ts` header |
| Controls (must fail) | `--neg=age+1` (production one row ahead): **0 / 20**. `--neg=no-rest` (no x2 input in ON): **Memento ON fails, 87,280 px** (Growl ON then passes, which isolates its residual to the rest). `--neg=no-shadow`: **all 10 elevated-shadow windows fail** (9 / 20 pass) | receipt `experiments` |
| **δ check** (age a == rel a + 1) | **Command rows: δ = 0 on both paths.** (1) stat101: launch -> next instruction = 77 / 91 rows on all 20 windows. That covers the print path (Harden, Agility, Growl, Screech, Icy Wind, Intimidate) and the playstatchangeanimation path (Cosmic Power, Tickle, Superpower, Memento); it is 1 row behind a Substitute. So the 76 / 90 inserted frames are exactly the added rows rel 1 .. E+1. (2) Through production, the boundary rows are 0 px outside the message band on all 20 windows: rel -1 and 0 are the previous command, and E+2 is the next command's first frame. On the 5 elevated-GOLBAT windows this pins both shadow edges: the ROM shows the shadow on rel 0 and E+2 and hides it on 1 .. E+1, exactly the command. **Caveat (print path, not this slice's frames):** the ROM's box changes on E+3 (stat101 `firstScreenChangeAfterE` 78 / 92 = the print instruction + 1). Production's following message prints its first glyph on its first frame (E+2), so on the 12 print-path windows that glyph is **one row early** (162..498 px in the box band, y >= 112). That is the message's lead after a stats-change command: the builder (sc106) puts the message right after the 76 / 90 frames with no 1-row lead. The playstatchangeanimation path shows 0 px at E+2: its next command is the 2-frame `stat` write | receipt `deltaCheck` |
| Production routes (app render path, base `0962e7b38` vs final) | **8 / 8 OK**: seed 0 slot 2 ON (Acid Armor 40 sharply up, Icy Wind 24, Growl 46); seed 3 slot 3 ON (Sand-Attack 27, opponent); seed 3 slot 1 ON (Icy Wind secondary 24, player); seed 6 slot 0 ON (Intimidate 22 + Agility 41); seed 13 slot 3 ON (Tickle 57 playstatchangeanimation, 18, 24, 27); **seed 14 slot 0 ON (elevated opponent LEDIAN, 39 / 41 sharply)**; seed 3 slot 3 OFF; seed 0 slot 2 OFF. On every route: identical frame count and per-frame command key / type / age. Every differing frame lies inside a stats-change command (0 outside). Every reducer banner age differs (the banner is drawn: 58 / 58 or 80 / 80 per command). Non-banner ages differ only for the elevated LEDIAN's shadow hide (10 = 90 - 80 per command). The following command's first frame is byte-identical on all 41 commands. No Castform stats change occurred in the ~100 scanned routes (seeds 0..53, scan mode) (stat101: 5 census events, normal form). The Castform form mask is pinned at unit level (section 3) | receipt `routes` |
| Census 0..999 (10 `--index-from` shards per tree, base `0962e7b38` vs final `ba00510d3` archives) | **Identical.** 27,513 commands: 0 key, 0 status, 0 frame and 0 other-field changes. `battleDigest`, `battleDigestExcludingFrames`, `commandDigest` and `battleFrames` are identical on 10 / 10 shards. Frames 14,946,997 == 14,946,997. 5,552 stats rows identical; 3,667 presented stats-change commands (298,348 rows, == sc106) | receipt `census`, `scd112CensusDelta.py` |
| Scene ON / OFF gameplay parity | `tests/sc106StatsChangeCommand.test.ts` "Scene ON / OFF gameplay parity": seed 0 slot 2 (7 / 7 commands) and seed 13 slot 3 (6 / 6). Identical boundaries / RNG on the final tree | targeted gate |

## 2. Gates (final code: production src `c477ee818` = `128c05c18` + a type alias)

The comparator, routes and census above ran on `128c05c18`. `db3dc75e4` only names `statsChangeRenderView`'s return type: the
battleScene split-eligibility scanner flagged the inline multi-line return type as unrecognized top-level content. The emitted JS is
identical. `scd112Run.sh --census` reran everything on the final tree (section 5).
- Targeted (4 workers): scd112StatsChangeRender, sc106StatsChangeCommand, statsChangeReducer, battleResolutionPresentation,
  factoryAnimationInventory, playableAnimationIntegration, animationBoundaryRatchet: **7 files / 98 tests passed**.
- `npm run typecheck`: green (before and after the type alias). `npm run test:smoke`: **448 / 448**.
- Full suite, two shards (4 workers). Shard 2: **814 files / 6,412 tests passed**. Shard 1 on `128c05c18`: 1 failure,
  `battlesceneSplitEligibility` (the scanner, fixed by `db3dc75e4`). Shard 1 rerun on the final code: **815 files / 6,995 tests
  passed**. Total **1,629 files / 13,407 tests passed** (44 files / 223 tests skipped), 0 failed. **No pixel-hash pin moved** in any
  existing test.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 0962e7b38`:
  **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173). The canonical railroad traces are unchanged, and no capture of the app-only
  trace moved (none of its captures falls on a stats-change frame).
- `git diff --check`: clean.

## 3. Tier-1 (`tests/scd112StatsChangeRender.test.ts`, 9 tests)

- The receipt's numbers (19 / 20, the Growl experiment 20 / 20, the three controls, delta check, routes 8 / 8).
- 6 windows (Harden ON, Memento ON, Agility ON, Icy Wind ON, Screech OFF, Cosmic Power OFF). Every row's production frame sha256 must
  equal the comparator's 0 px receipt, and every banner row (58 / 80) must differ from the ordinary frame.
- The shadow: hidden on all 90 command ages; age 0 differs from the ordinary frame in exactly the 200 shadow px; the next command's
  first frame shows it again.
- Castform: a CASTFORM opponent in form 2 (`liveCastformForms`) is masked with the form's pic (not the normal one) at the elevated corner.
  No effect over the doll; none for an unplayable argument (70).
- **Revert experiment**: with the banner draw disabled (`if (false && statsChange?.banner)`), **6 / 9 fail** (every per-window hash
  pin). The file was restored from a scratch copy.

## 4. Open (not in scope)

- The x2 tracker's Growl (45) target row (section 1). It also moves live bodies after a Growl on an ONIX / RATTATA opponent. Wanted: a
  measured `LIVE_BATTLER_X2_MOVE_TABLE` target row 45 = zeroed (source: `AnimTask_ShakeMon2`), with its own pins.
- The print path's following message is one row early (section 1, δ caveat): a 1-row lead before the message after a stats-change
  command (builder, sc106 rules).
- Out of scope per the brief: the order host / allocator binding (slice e), census accounting (slice f), the live Double Team window's
  9-row gap, Scene OFF pauses (#167).

## 5. Reproduction (from workspace/)

`sh tools/integration/scd112Run.sh <fresh> --census` on the final tree (`db3dc75e4`, production src `c477ee818`): **ALL SAME** (17:13 -> 17:19).
That covers stat102's ROM frames (22 / 22 probes r1 == r2, ALL SAME); the comparator 19 / 20 with r1 == r2; the controls 0 / 19 / 9; the
experiment 20 / 20; routes 8 / 8 OK; the census identical; and the receipt == committed.

```
sh tools/integration/scd112Run.sh <fresh-out-dir-inside-the-repo> [--census]   # stat102 ROM frames (ALL SAME), comparator x2 (r1 == r2),
                                                                                 # controls + experiment, 8 routes base vs final,
                                                                                 # census (--census), receipt == committed -> ALL SAME
npx vitest run tests/scd112StatsChangeRender.test.ts
node --experimental-strip-types --no-warnings tools/integration/scd112ProductionCompare.ts <stat102Run-out-dir> <out.json> [--neg=age+1|no-rest|no-shadow] [--tracker-growl-zeroed]
node --experimental-strip-types --no-warnings tools/integration/scd112RouteRender.ts --routes=14:0:on,3:3:off --out=<f.json> [--scan]
python3 tools/integration/scd112RouteDelta.py <base.json>[,..] <final.json>[,..] <out.json>
python3 tools/integration/scd112CensusDelta.py <census-base-dir> <census-final-dir> <out.json>
```
