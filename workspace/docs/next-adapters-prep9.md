# Next adapters prep 9: measured verification of the five D-PAL ("palette snapshot") moves (S10A, side lane)

Evidence/design only; **new files only**, no tracked file edited, no production code. Method copied from `docs/next-adapters-prep8.md` / `docs/allocator-plan-v2-evidence.md` for ABSORB (71), MEGA_DRAIN (72), GIGA_DRAIN (202),
DREAM_EATER (138), SUNNY_DAY (241), which `docs/remaining-adapters-census.md` labelled **D-PAL** ("unfaded/faded/hardware snapshots are not supplied", census l.45, l.59).
All emulator numbers are ROM frames from **direct, independent mGBA runs** (Scene ON, fresh process per scenario, 54 scenarios, each run twice; no shared oracle service was contacted).
Production line numbers are at this branch's base `d3d40e53b` (a sibling lane is editing `liveMoveAnimation.ts` / `battleScene.ts`: re-grep before editing). Not run: `npm test` / build / typecheck (no production file, test or `src/` type changed; only `tools/`, fixtures and this doc).
Drafted fixtures are unverified until an adapter exists.

## 0. Verdicts

**Headline: the D-PAL label is stale for all five.** None of the five reducers consumes a palette *snapshot* (unfaded / faded / hardware buffer, palette-bank allocation, tag table): every palette-dependent output is an age-derived blend schedule
(`bgPaletteBlendYAtAge` etc.) that the renderer applies to (a) `battleBg.palette` (the Factory arena BG, byte-identical at activation in 53/53 runs) and (b) species art palettes (`battleBackSprites` / `opponentFrontSprites`, identical to OBJ banks 0/1 at activation in 53/53 runs).
The ROM's faded BG rows equal `BlendPalette(unfaded-at-activation, 0x33ED | white, production schedule)` **at every body age in 48/48 scenarios with one constant age lag per move** (§1.3). What remains is the allocator profile (constant, §2), the order input (validated, pixel-neutral, §2.3) and the renderer's species/pair gates (§3.3).

| Move (id) | Verdict | Palette inputs (§1) | Allocator profile (§2) | Order input (§2.3) | act / window / row / duration / tail | Measurement files |
|---|---|---|---|---|---|---|
| GIGA_DRAIN (202) | **READY-WITH-ORDER** (+ renderer pair lift) | none from the host; BG banks 1-3 blend 0x33ED == production `bgPaletteBlendYAtAge` at lag 0: 229/229 ages in 12/12 scenarios | hitsplat 3, orbs `[3,4,5,7,9,10..19,3,20,21,4,7,9,5,11,13]`, stars `[3,4,5,3]`, paletteController 3 (both spawns): **constant over 12 histories/species, == accepted literal, == ROM first-free replay** | orderSeed (17 slots): accepted post-Tackle `[3,4,21,20,5,..]` == lend; first-body `[4,3,21,..]` == provider; **0 px** over 4 variants x 2 orientations | 214 / 214..443 / **0** / 230 / 0 (both orientations) | `prep9-palette-baseline`, `-bank-variance`, `-blend-check`, `-allocator`, `-first-free`, `-tracker-lend`, `-order-pixels`, `-dense-crosscheck` |
| SUNNY_DAY (241) | **READY-WITH-ORDER** (renderer already species-generic) | none; BG banks 1-3 and OBJ banks 0/1 white blend == production `palette.coefficient` at lag 2: 157/157 ages x 12; `paletteBanks` is **echo-only** (the renderer never reads `view.palette`) | raySlots `[3,4,5,7]` x 12 scenarios, == accepted; ray spawn ages 20/28/36/44 | `spriteOrder` (64): first-body == provider, post-Tackle == lend; **0 px** over 8 ROM orders + reversed x 2 orientations | 211 / 211..368 / **0** / 158 / 0 | same |
| MEGA_DRAIN (72) | **READY-WITH-ORDER** (+ pair lift) | none; blend lag 0: 217/217 x 12 | hitsplat 3, orbs `[3,4,5,7,9,10,11,12,13,14,3,15,4,5,10,16]`, stars `[3,4,5,3]`, pc 3: constant x 12, == accepted | orderSeed (12): accepted first-body `[4,3,5,16,..]` == provider == lend; post-Tackle `[3,4,5,..]` == lend; **0 px** | player 75 / 75..292 / 0 / 218 / 0; opp 79 / 79..296 | same |
| ABSORB (71) | **READY** (+ pair lift; reducer age = activation age - 10) | none; blend (y max 4) at lag **10** (= the reducer's monbg-relative age): 205/205 ages x 12 | hitsplat 3, orbs `[3,4,5,7,9,3,4,10]`, stars `[3,4,5,3]`, pc 3: constant x 12, == accepted fixture literal | **no order field** in the config; ROM seed shapes `[3,4,5,10,9,7]` / `[4,3,5,..]` follow the same lend; neutrality measured on Giga/Mega/DE only (same sprite kinds) | 213 / **223**..416 / **-10** / 194 / script ends 418 (2 frames after the window end) | same |
| DREAM_EATER (138) | **READY-WITH-ORDER** (+ pair lift; needs a sleeping target = a preceding sleep body) | none; BG2 psychic ring + all other banks identical across 5 histories at every age (one 1-frame orientation offset at age 246) | no hitsplat / pc; orbs `[3,4,5,7,9,10..19,3,20,21,4,7,9,5,11,13]`, stars `[3,4,5,3]`: constant x 5, == accepted | orderSeed `[4,3,16,15,..,7]` identical across all 5 histories, == lend after Tackle->Sing (both planned); **0 px** | player 1308 / 1308..1573 / 0 / 266 / 0; opp 2146 / 2146..2412 / 0 / 267 | same |

**Palette-baseline answer (the question asked): yes, constant, and mostly irrelevant.** Across 53 activation snapshots (5 moves x both orientations x first-body / post-Tackle / Growl-preceded / Tackle-Sing histories; attackers = the 5 accepted species + Venusaur, Tangela, Jigglypuff; targets Onix, Shuckle):
BG banks 0-7 and 10-14 are **byte-identical** in unfaded, faded and hardware PLTT (13/16 banks) — including the three the moves blend (BG 1-3 = `F_PAL_BG`, `GetBattlePalettesMask` mask `0xe`, `battle_anim_mons.c:1402-1410`); the compact `battleBg.palette` rows equal hardware banks 2/3 (rows 0/1) and 4 (row 2).
The varying banks are exactly: BG8/9 (monbg battler copy = species art), BG15 unfaded (text), OBJ0/1 (battler palettes == species art palettes: `obj0UnfadedIsPlayerBackArt` / `obj1UnfadedIsOpponentFrontArt` **53/53**), OBJ5/7 (HP-bar colour), OBJ13-15 unfaded (healthbox/text; faded constant).
Faded == unfaded at activation for OBJ0/1 and BG1-3 in 53/53; `gPaletteFade.active` = 0 in 53/53; hardware PLTT == faded at activation in 53/53 (one display behind afterwards, as the renderers already model). Activation buffers equal the **retained accepted dense evidence** in 8/8 accepted move x orientation cases, and all 1,555 dense rows' per-bank hashes match (`prep9-dense-crosscheck.json`).

**Minimal production change (palette): none for the reducers.** The palette inputs are `battleBg.palette` + species art, which production already has (`battleScene.ts:1712` `battleBg`; `battleBackSpritesAsset` :683, `opponentFrontSpritesAsset` :515).
For Sunny Day supply `paletteBanks` as an adapter constant (accepted literal `{background:[0,1,2,3], attackerPartner: player?17:18}`, `tools/compare/sunnyDayActualCore.ts:64`) — it is validated (`sunnyDay.ts:53-57`) and echoed, never consumed.
**Optional (history hygiene, not an input to these moves):** none of 71/72/138/202/241 has a plan in `live-animation-palette-resources.json` (58 plans; `liveMoveAnimationPalette.ts:91` `plans[...]`), so `prepareLiveMovePalette` marks the palette history **unknown** after any of them.
The ROM restores the tag table (53/53: tags at end+1 == tags at activation) but leaves the moves' own colours in OBJ banks 7-9 (53/53 changed), which a *later* Shadow Punch scratch row (325) could read. Keeping history known across these bodies needs ROM-extracted plan rows (loads `ANIM_TAG_ORBS, ANIM_TAG_BLUE_STAR, ANIM_TAG_IMPACT` for 71/72/202/138; `ANIM_TAG_SUNLIGHT` for 241; only `ANIM_TAG_IMPACT` is in `resources` today) added to `plans` / `resources` by whatever generates that JSON — a generated-data extension, not a snapshot provider.

## 1. Palette measurements

### 1.1 What each reducer consumes (file:line, base `d3d40e53b`)

| Move | Palette-like fields in the reducer | Consumer in the renderer | Needs from host |
|---|---|---|---|
| ABSORB | `bgPaletteBlendY` (`absorb.ts:60-66`: 0 / 2 at age 5-7 / 4 at 8-179 / 2 at 180-182 / 0), colour `0x33ED`, `paletteControllerActive` (`absorb.ts:173`) | `battleScene.ts:44437` `battleBg.palette.map(blendPaletteToward(.., green, displayed.bgPaletteBlendY))` | nothing |
| MEGA_DRAIN | `bgPaletteBlendY` (`megaDrain.ts:112`), `paletteControllerActive` (:227), allocator `paletteController` slot (:89) | `:44607` same blend | nothing |
| GIGA_DRAIN | `bgPaletteBlendY` (`gigaDrain.ts:95-114`: 2..12 ramp, ages 15-216), `paletteControllerActive` (:220), allocator `paletteController` (:90) | `:44791` same blend | nothing |
| DREAM_EATER | `dreamEaterBgBldyAtAge` (`dreamEater.ts:120`, hardware BLDY), `dreamEaterPsychicBgPaletteRowAtAge` (:136, software-faded BG ring of the script-loaded psychic BG) | `:45098` `gpuDarken(dreamEaterPsychicBgPaletteRowAtAge(battleAnimPsychicBg.palette, view.age-1))`, `battleBg.palette.map(gpuDarken)` | nothing (asset palette is script-loaded) |
| SUNNY_DAY | `palette` ramp `{coefficient, backgroundBanks, attackerPartnerBank}` (`sunnyDay.ts:128-139`), `SunnyDayLiveInputs.paletteBanks` (:21, validated :53-57) | `battleScene.ts:35837-35845` own `hardwareCoefficient`, `whiteFadeFieldPaletteRows(battleBg.palette)`, `blendPaletteToward(art.palette, white, ..)`; **`view.palette` / `paletteBanks` never read** | `paletteBanks` constant (echo) |

`GetBattlePalettesMask` (`battle_anim_mons.c:1402-1453`): `F_PAL_BG` = BG banks 1,2,3; `F_PAL_BATTLERS_2` = OBJ bank (16+battler) of each visible battler = OBJ banks 0/1 in singles. Scripts (`battle_anim_scripts.s`): `Move_GIGA_DRAIN` :5814 (`simple_palette_blend selector=F_PAL_BG ... RGB(13,31,12)` = 0x33ED),
`Move_ABSORB` :5700 (0 -> 4), `Move_SUNNY_DAY` :6726 (`AnimTask_BlendBattleAnimPal F_PAL_BG | F_PAL_BATTLERS_2 ... RGB_WHITE`, coefficient 0 -> 6 -> 0).

### 1.2 Snapshot constancy (`prep9-palette-baseline.json`, `prep9-bank-variance.json`)

`prep9PaletteProbe.py` records, at activation-1 / activation / +1 / end+1: 512-word unfaded, faded and hardware PLTT, `sSpritePaletteTags`, `gReservedSpritePaletteCount` (4 in 53/53), `gPaletteFade`, BLD/BG/DISP regs, in-use sprites, `sSpriteOrder`, in-use tasks;
and per frame over the body: per-bank (32) hashes of unfaded and faded, hardware==faded, and the sprite/task spawn log. Scenario set (`prep9Scenarios.py`): the 10 accepted lab scenarios + derived variants: **firstbody** (attacker faster), **sp3 / sp114** (attacker Venusaur / Tangela), **tg213 / tg113** (target Shuckle / Chansey),
**tm45** (target moves Growl: a status body precedes), Dream Eater **sp39** (Jigglypuff). 56 defined, **54 ran**: `dream-eater-*-tg113` (Chansey) failed lab validation; `dream-eater-opponent-tg213` ran but never reached Dream Eater (no activation) — 53 activation snapshots.
Histories actually probed (preceding bodies): none (first body), `[33]`, `[45]` (Growl: unknown to the tracker), `[33,47]`, `[33,33,47]`, `[47]`.

Banks that never differ across scenarios at any body age (aligned at activation): per move, BG0-7, BG10-14 and OBJ2-4, 6, 8-12 (+ OBJ5 for the four non-DE moves). Varying: BG8/9, BG15 unfaded, OBJ0/1, OBJ7 (age 0 only: HP-bar leftover before the move loads its own palette), OBJ13-15 unfaded, DE OBJ5 (HP-bar colour). Dream Eater BG2 differs at exactly one age (246) because the opponent-orientation body is one frame longer (267 vs 266 rows).
Banks changing during a body (faded): BG1-3, BG8/9 (monbg), OBJ7-9 (the move's `loadspritegfx` palettes: ORBS / BLUE_STAR / IMPACT; Sunny: OBJ0/1/7) — **BG4 never changes**, although the drain renderers blend every `battleBg.palette` row (incl. compact row 2 = hardware bank 4; Sunny's `whiteFadeFieldPaletteRows` leaves row 2). Accepted-pixel exact, so that row is not drawn; noted only.

### 1.3 The blend itself (`prep9-blend-check.json`, `prep9-blend-schedule.json`)

`prep9BlendSchedule.ts` dumps the production reducers' `bgPaletteBlendY` / Sunny `palette.coefficient` per age; `prep9PaletteBlendCheck.py` computes `BlendPalette(unfaded bank at activation, colour, y(age - lag))` and compares it with the ROM faded bank hash at every body age:
GIGA lag 0 (229/229), MEGA lag 0 (217/217), SUNNY lag 2 (157/157; BG1-3 and OBJ0/1), ABSORB lag 10 (205/205) — **in every scenario of the move** (the input is the activation row, so history/species independence is exactly the claim). ABSORB's 10 is its reducer's `monbg`-relative age (ROM orbs spawn at activation age 44 = `ABSORB_ORB_FIRST_AGE` 34 + 10; stars 139 = 129 + 10; hitsplat 26; `Task_UpdateMonBg` at 10);
GIGA/MEGA/DE/SUNNY reducer age == activation age (orbs 56 / 50 / 78, stars 151 / 145 / 173, rays 20/28/36/44, hitsplat 38 in Giga, `Task_UpdateMonBg` at 10 / 10 / 7 / 4).

## 2. Allocator profile and order inputs

### 2.1 Constant from baseline + timeline (`prep9-allocator.json`, `prep9-first-free.json`)

Baseline at activation (all 53): occupied sprite slots `{0,1,2,6,8,60,61,62,63}` (mask `f000000000000147`), **no active task** — the same constant baseline as the affine-task study. ROM spawn logs replayed against a first-free allocator seeded with it: **1,057 sprite spawns, 0 violations**; tasks: 208 spawns with exactly one constant exception per body (`Task_UpdateMonBg` lands in slot 1 because the `monbg` command's own transient task occupies slot 0 inside the same pass — identical in all 53 scenarios).
Per move, `hitsplat / orbs / stars / paletteController / rays / baselineOccupied / tasks` have **1 distinct value over all 12 (5 for DE) scenarios**; spawn ages identical (DE: 2 values = the one-frame orientation offset). Accepted literals (`tools/compare/{giga,mega}DrainFramebuffer.ts`, `dreamEaterFramebuffer.ts`, `tools/compare/fixtures/absorb-*.json`, `sunnyDayActualCore.ts:62`) equal the ROM in 8/8 accepted scenarios (hitsplat, orbs, stars, paletteController, orderSeed).
So the profile can be a per-move constant table gated on the known allocator baseline — no history provider.

### 2.2 `paletteController`

It is the slot of the `gSimplePaletteBlendSpriteTemplate` sprite (spawn ages 13 and 188 / 194 / 200 for 71 / 72 / 202): slot 3 both times. A pure allocator constant; it carries no palette data.

### 2.3 Order (`prep9-tracker-lend.json`, `prep9-order-pixels.json`)

* Provider call: the lend is `spriteOrderTrackerLend(tracker)` (`spriteOrderEventTransform.ts:211`) after `applySpriteOrderPresentationEvent` of prompt/commit and each earlier body; first-body order is `spriteOrderWithOccupiedPrefix(knownEntrySpriteOrderState("battle-lab-ordinary-singles"), KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)` (`spriteOrderProvider.ts:256`).
* Validated against 54 raw per-frame `sSpriteOrder` runs (`spriteOrderEventProbe.py`, repeated identically): of 53 target bodies, **27 first bodies: provider 64-entry == observed 27/27**; **47 with a known lend: lent free order == observed 47/47** and `[...occupiedPrefix, ...lend]` == observed 64-entry order 47/47; the lend restricted to the move's slot set == the accepted `orderSeed` shape 37/37.
  The 6 unknown are the Growl-preceded histories: Growl (45) has **no production body plan** (`SPRITE_ORDER_PRODUCTION_BODIES` has `33:`, `47:`, `71:`, `241:`, not 45/72/138/202), so the tracker invalidates — production degrades to the known-order gate, as designed. (Turn boundaries in the replay are approximated by a >250-frame gap between bodies.)
* Shapes: first body `[4,3,...]`, post-Tackle `[3,4,...]` (the bounce pair swaps); Dream Eater always `[4,3,...]` (Sing's body re-leaves it).
* Pixel sensitivity: **34 order-variant renders (reversed / ascending / each other ROM-observed shape x both orientations x every source age; Sunny: 7 ROM orders + reversed) -> 0 differing pixels** (`prep9OrderPixels.ts`; accepted baseline 0). As in prep8 the renderers only use order to break exact `(priority, subpriority, y)` ties, so the order input is a correctness-hygiene gate, not a pixel input.
  ABSORB's config has no order field; its sprite kinds are a subset of Giga/Mega's (hitsplat, orbs, stars), so neutrality is *expected* but was not measured through a field.

## 3. Activation, window, shadow row, lifts, routes, drafts

### 3.1 Activation / window / row (`prep9-summary.json`)

| Move | act | script end (first inactive) | window (dense) | shadow row = act - windowStart | duration (rows) | window end - script end | preceding bodies (accepted) |
|---|---|---|---|---|---|---|---|
| GIGA_DRAIN p / o | 214 / 214 | 443 / 443 | 214..443 | 0 | 230 | 0 | Tackle (33) |
| SUNNY_DAY p / o | 211 / 211 | 368 / 368 | 211..368 | 0 | 158 | 0 | Tackle |
| MEGA_DRAIN p / o | 75 / 79 | 292 / 296 | 75..292 / 79..296 | 0 | 218 | 0 | none (first body) |
| ABSORB p / o | 213 / 213 | 418 / 418 | 223..416 | **-10** | 194 | -2 (cleanup row 417, then inactive 418) | Tackle |
| DREAM_EATER p / o | 1308 / 2146 | 1573 / 2412 | 1308..1573 / 2146..2412 | 0 | 266 / **267** | 0 | Tackle, Sing / Tackle x2, Sing |

ABSORB is the one exception to row 0: its dense window starts 10 frames after the activation edge (the reducer is `monbg`-relative), so the live adapter must keep the previous presentation for 10 rows (shadow row -10: not in the changemap) and begin the reducer at age 0 on frame activation+10; `ageOffset` 10 in the draft.
Window lengths differ by orientation for Dream Eater (266 / 267) like prep8's Swift/Horn Drill. DE's 1,308 / 2,146 activations are late in long scenarios (multi-turn); the live trigger is the `Move_DREAM_EATER` script edge, not a frame number.

### 3.2 Reducer / tail notes

Reducer `active` ends: Giga `age <= 228` (`GIGA_DRAIN_BODY_LAST_AGE`), Mega 216, Absorb 193 (+10 offset -> 203 relative to activation), Sunny `< 157`, DE blend/psychic last age 245 / 263-264. These line up with the window ends above (dense-evidence cross-check: 1,555/1,555 rows).
ABSORB uncovered tail: script active until 418 vs window end 416 (cleanup frame 417 is a fixture-recorded row, not a window row); Giga/Mega/DE/Sunny have **no** uncovered tail.

### 3.3 Renderer lifts under `liveField` (`battleScene.ts`, base `d3d40e53b`)

| Move | Branch | What gates / hard-codes it |
|---|---|---|
| ABSORB | :44397-44562 | **pair gate** `LOMBRE <-> ONIX` :44411-44425 (throws otherwise); art `absorbArt.lombreBack/Front` :44427, `onixFrontSprite/BackSprite` :44431; healthboxes :44524-44544 level 50 status `"none"`; text :44555 |
| MEGA_DRAIN | :44564-44757 | pair gate `SKIPLOOM <-> ONIX` :44578-44592; `synthesisArt.skiploom*` :44594, onix :44602; healthboxes :44719-44739; text :44750 |
| GIGA_DRAIN | :44759-44924 | pair gate `ROSELIA <-> ONIX` :44768-44781 (art is already the generic battle-back / opponent-front `ROSELIA!` :44782-44783), onix :44788; healthboxes :44886-44906; text :44917 |
| DREAM_EATER | :45048-45269 | pair gate `WIGGLYTUFF <-> ONIX` :45060-45073 (generic art :45075-45076), onix :45081; healthboxes :45236-45256 with the **sleep status hard-wired to the target side** by orientation :45245/:45256; text :45262 |
| SUNNY_DAY | :35800-35914 | **no pair gate**; art by species `artFor` :35813-35819 (throws if missing); healthboxes :35893-35903 (level 50, status from `fieldProfile ?? "none"`); text :35907 |

So the four drain moves need (1) the pair gate removed, (2) the attacker/target art taken from `artFor`-style generic assets (the Onix constants are the target art), (3) healthbox name/level/status taken from the live field (`level: 50` and `status: "none"` are literals; DE's `"sleep"` is positional).
This is the same lift prep8 listed for its ten moves; nothing palette-specific.

### 3.4 Generated-rental routes (`prep9-routes.json`, `prep9-route-probe.json`)

Slot-0 carriers over seeds 0..9999 x streak 0..42 step 7 (rentsCount 0): GIGA_DRAIN 3,786 slot-0 hits (28 species incl. ROSELIA, VENUSAUR, TANGELA, GENGAR), SUNNY_DAY 2,321 (21 species incl. BELLOSSOM, CHARIZARD), MEGA_DRAIN 430 (SKIPLOOM, TANGELA, BEAUTIFLY, KABUTO), DREAM_EATER 588 (WIGGLYTUFF, HYPNO, GENGAR, JYNX, GARDEVOIR, CHIMECHO), **ABSORB 113 (LOMBRE only)**.
Ordinary-command-path replay (`prep9RouteProbe.ts` -> `prep7Replay.ts`, production orchestrator, one turn): GIGA 8/9 probed routes issue the move (4 as first body, 2 with the order input known — the rest follow an opponent body/ability the tracker does not plan; the accepted ROSELIA route is a first body with order **not** known), SUNNY 8/9 (4 first-body, 3 known), MEGA 3/4 (2 first-body, 2 known), ABSORB 1/1 (LOMBRE, not first body),
**DREAM_EATER 0/6** (one-turn routes: Dream Eater fails on an awake target and issues no animation; a real route needs a preceding sleep move). The opponent mon is drawn from the same set pool (same species); opponent-attacker route counts were **not** measured here.

### 3.5 Drafted fixtures

`tools/integration/fixtures/prep9-<move>-{player,opponent}.json` (10; `prep9-adapter-draft/v1` = prep8 draft shape + `draft.palette`), summary `prep9-summary.json`. Unverified until an adapter exists (`consumedByTest: false`).

## 4. Open questions / risks

1. **Absorb age offset.** The draft carries `ageOffset 10` / `shadowRow -10`; confirm against the live activation edge when wiring (the first 10 rows are the ordinary scene + `loadspritegfx`). Only Absorb differs.
2. **Dream Eater trigger.** Accepted histories are `Tackle -> Sing` (both planned in the order table). Any other sleep source (Spore, Hypnosis, Sleep Powder, Yawn, ...) has no production body plan -> order unknown -> gate. The healthbox sleep status is positional (:45245).
3. **Growl-preceded histories** invalidate the order tracker (no plan for 45). All order-carrying moves are pixel-neutral on every probed order, but production should still gate on `known`.
4. **Absorb order neutrality** was not measured through a field (none exists).
5. **Opponent-attacker real routes** and wider sets of preceding bodies (switches, abilities, the accepted-ROSELIA route's unplanned pre-body) were not enumerated.
6. Two scenarios did not produce a body (`dream-eater-*-tg113` invalid; `dream-eater-opponent-tg213` no activation) — recorded, not hidden.

## 5. Measurement set (all new files)

| File | What |
|---|---|
| `tools/integration/prep9Scenarios.py` -> `fixtures/prep9-scenarios/*.json` (+ `manifest.json`, 56) | derived BattleLab scenarios |
| `prep9PaletteProbe.py` / `prep9Probes.sh <run>` -> `fixtures/prep9-probes-r1.tar.gz` (extract to `fixtures/prep9-probes/r1/`) | the per-scenario palette/allocator probe, 54 runs; `prep9-repeat-runs.json`: **54/54 byte-identical across two fresh runs** (sha256), and the same for the 54 raw order probes |
| `prep9OrderProbes.sh` -> `fixtures/prep9-raw.tar.gz` (extract to `fixtures/prep9-raw/`) | `spriteOrderEventProbe.py` per-frame order (54, repeated identically) |
| `prep9PaletteAnalysis.py` -> `prep9-palette-baseline.json` | banks vs production `battleBg.palette` / species art, per scenario |
| `prep9BankVariance.py` -> `prep9-bank-variance.json` | which banks vary / change, per move |
| `prep9BlendSchedule.ts` + `prep9PaletteBlendCheck.py` -> `prep9-blend-schedule.json`, `prep9-blend-check.json` | production schedule vs ROM faded rows (48 scenarios) |
| `prep9DenseCrosscheck.py` -> `prep9-dense-crosscheck.json` | probe vs retained accepted dense evidence (8 cases, 1,555 rows) |
| `prep9Allocator.py`, `prep9FirstFree.py` -> `prep9-allocator.json`, `prep9-first-free.json` | allocator profile derivation, first-free replay |
| `prep9TrackerLend.ts`, `prep9OrderPixels.ts` -> `prep9-tracker-lend.json`, `prep9-order-pixels.json` | production order host vs ROM; pixel sensitivity |
| `prep9Routes.ts`, `prep9RouteProbe.ts` -> `prep9-routes.json`, `prep9-route-probe.json` | rental carriers, command-path routes |
| `prep9Draft.py` -> `prep9-summary.json`, `prep9-<move>-<side>.json` (10) | drafts + summary |

Reproduce (from `workspace/`): `tar xzf tools/integration/fixtures/prep9-probes-r1.tar.gz -C tools/integration/fixtures && tar xzf tools/integration/fixtures/prep9-raw.tar.gz -C tools/integration/fixtures` (or `sh tools/integration/prep9Probes.sh r1` and `sh tools/integration/prep9OrderProbes.sh`, ~30 s each), then
`python3 tools/integration/prep9PaletteAnalysis.py r1 > tools/integration/fixtures/prep9-palette-baseline.json` and the other scripts as their headers state (order: Allocator, BankVariance, BlendCheck, FirstFree, DenseCrosscheck, TrackerLend, OrderPixels, Draft). The extracted `prep9-probes/` and `prep9-raw/` directories are not committed (tarballs are).
