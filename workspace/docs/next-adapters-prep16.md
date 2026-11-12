# Next adapters prep 16: Overheat / Silver Wind palette composite, BG-register history, Psych Up (S10A, side lane)

Evidence/design only; **new files only** (no tracked file edited, no `src/` change, no experiment patch was needed so nothing was reverted). Every ROM number is a **direct, independent mGBA run** (fresh process each; the shared HTTP oracles were never contacted). Every relied-on probe ran **twice from fresh processes with byte-identical output**: the palette/register probe (`prep16Probe.py`, 64 scenarios x 2, `cmp` clean), the two dense captures (`silverWindProbe.py`, `psychUpProbe.py`: 196 / 179 per-frame RGB sha256 lists identical), the route probe (JSON identical). Production line numbers are at base `96e2fd6ae`. Method = prep14 §1.3-1.5 ("run the real reducer with production-derivable inputs, compare with the ROM / retained RGB").

## 0. Results

### 0.1 Verdicts

| Move | Verdict | Exact? | What remains |
|---|---|---|---|
| **OVERHEAT 315 (0.77%)** | **READY, first body (palette provider = composite below)** | `overheatActualCore`-style RGB gate with the composite `palettes` + asset words: **230/230 exact rows, 0 residual pixels, player AND opponent** (`prep16OverheatPixels.ts`). Reducer outputs on all renderer-read banks == ROM at every probed age >= 7 in 4 scenarios x 3 palette kinds | the first-body gate (§2). Later bodies are **not** proven (§2) |
| **SILVER_WIND 318 (0.52%)** | **READY, first body; opponent-side first body needs the first-body register constants** | composite palettes: **193/193 player, 196/196 opponent** exact (identical to the accepted-palette baseline, 0 pixels differ); **opponent as FIRST body (fresh capture, first-body registers): 196/196, 0 residual**; the accepted post-Tackle inputs on that same capture leave **1568 px** (8 px/row) | first-body gate; the opponent first-body register constants (§2.3) |
| **PSYCH_UP 244 (0.37%)** | **NEEDS-BG-STATE for non-first bodies; first body exact for the player side** | player attacker as first body (JUMPLUFF vs SHUCKLE, capture-derived inputs): **179/179 exact, 0 residual**. Reducer inputs `monBg.initialBgCnt/initialHardwareScroll`, `registers.bld*`, `matrixSlots` are **already equal** between first body and post-Swords-Dance for the player attacker (only `targetPictureOrigin` differs, = species geometry); they differ after other predecessors (§2.2) | palette composite for its 5 extra fields (not pixel-proven, §1.4); opponent-attacker first body not captured; tracker table for post-first bodies |

Not reached: dense pixel proof of an **alternate species** (needs the live adapter: the reducers' species are hard-coded to the accepted pair in `silverWindInputsFor`/`psychUpInputsFor`, so alternates are proven at the ROM-bank level only); a Psych Up opponent-attacker first-body capture (the faster-species trick used for Silver Wind cannot make JUMPLUFF outspeed NINJASK; a SHUCKLE-target variant would do, not run); Overheat/Silver Wind pixel proof after a non-first predecessor.

### 0.2 Palette source table (renderer-read banks; ROM bank numbers are absolute: BG 0-15, OBJ 16-31)

Facts below were measured in 5 scenarios per move (accepted player, accepted opponent, alternate-player CHARIZARD/BEAUTIFLY/SKIPLOOM vs GOLEM, alternate-opponent, shiny; `prep16-palette-sources.json`) at ages 0,1,2,3,4,5,6,7,8,12,20,40,80,120,160. "== ROM" means the hex of the production-sourced bank equals the ROM hardware/unfaded/faded bank.

| Bank | Renderer read | Production source | Equal to ROM |
|---|---|---|---|
| BG 2, 3 | field subpalettes 2/3 (`battleScene.ts` Overheat `:26260`, Silver Wind `fieldPaletteBank` `:26133`) | **constant**: `src/assets/gen/battle-bg.json` `palette[0]` (== `palette[1]`) | all non-shiny runs, every probed age (Silver Wind: ROM faded 2/3 differ at probed age 12 only, hardware does not; see §1.2) |
| BG 4 | field subpalette 4 | **constant**: `battle-bg.json` `palette[2]` | all ages |
| OBJ 16 (battler 0 = player, `battlerPalNum` 0) | attacker/target bank 16+`attr2>>12` | species back sprite palette: `battle-back-sprites.json[species].palette`, which is also what the existing field-art view returns as `art.player.pic.palette` (the Seismic Toss adapter already passes it, `liveMoveAnimation.ts:1912`; checked equal for 12 species pairs) | all non-shiny scenarios |
| OBJ 17 (battler 1 = opponent) | same | `battle-opponent-front-sprites.json[species].palette` == `art.opponent.pic.palette` | all 12 |
| OBJ 23 (= 16+7, first loaded sheet) | Overheat small ember; Silver Wind sparkle6; Psych Up spiral | the move's own asset: Overheat `ANIM_TAG_SMALL_EMBER` (`live-animation-palette-resources.json` resources == `battle-anim-small-ember.json`, 16 words); Silver Wind `src/animation/assets/silver-wind.json` `resources.sparkle6.palette` (tag 10271); Psych Up `psych-up.json` | from the load age on (ember / sparkle6 by probed age 2, impact by 5, Psych Up spiral by probed age 5; hardware lags the RAM load by one frame); before it the bank holds the previous body's leftovers (e.g. HIT SPLAT after a Tackle) and no sprite reads it |
| OBJ 24 (= 16+8) | Overheat hit splat | `ANIM_TAG_IMPACT` (resources JSON == `battle-anim-hitsplat.json`) | from age 5 |
| BG 8 (player attacker) / BG 9 (opponent attacker) = monbg bank | target picture | **written by the reducer** from the target OBJ bank (`overheat.ts:529-531`, `silverWind.ts:340-341`); before that ROM holds stale copies (e.g. 8 == 16) that nothing reads | Overheat: equal from the monbg age (7) to the end; Silver Wind: from probed age 6 until the clear (145/148); the bank is then unread |
| BG 5, 8, 9, 15, OBJ 26 etc. | not read | differ across scenarios (HP bar / text / stale), **not needed** (composite leaves them 0) | n/a |
| Unfaded / faded / hardware | `view.palette.hardware`/`.faded` | **all three arrays of the composite are identical at activation** for the composed banks (ROM: banks 2-4, 16, 17 equal across hw/unfaded/faded at age 0); the reducers derive faded/hardware from them with the same latches the accepted run verified | composite-driven reducer == accepted-palette-driven reducer on **every read bank at every age** (2 accepted scenarios x Overheat/Silver Wind, `compositeVsAcceptedReducer`): the only differences are the monbg bank before its setup (ages 0-6) / after the Silver Wind clear and the asset banks before their load age, none of which the renderer reads |
| **Shiny** | n/a | **genuinely missing**: ROM banks 16/17 match no asset palette when `shiny: true` (the repo has no shiny battle palettes) | gate: `!shiny` (the request carries no personality today; the field art view takes species only) |

**Provider.** `liveMoveAnimationPalette.ts` supplies none of this today: there are no plan rows for 315/318/244 (`live-animation-palette-resources.json` `plans`), and `prepareLiveMovePalette` returns only `{historyKnown, traceScratchUnfadedPalette}`. Checked: applying the same `loadSpritePalette` loads from `createLiveMovePaletteHost()` allocates **bank 23 (ember, sparkle6) and 24 (impact)** with unfaded == faded == the asset words (`prep16-provider-slots.json`). So the smallest provider is: (1) two plan rows `315: loads [ANIM_TAG_SMALL_EMBER, ANIM_TAG_IMPACT]`, `318: loads [ANIM_TAG_SPARKLE_6]` (+ one resource row with the sparkle6 words from `silver-wind.json`) so the host/`historyKnown` tracking stays honest (it already frees them after the body); (2) a pure `composeLivePalettes(playerSpecies, opponentSpecies)` = `tools/integration/prep16PaletteComposite.ts` (35 lines, assets only) giving `{unfaded, faded, hardware}` with banks 2,3,4,16,17 set; (3) the asset words passed as `resources.{smallEmber,impact|sparkle6}.palette` (the reducers load them themselves at ages 1/4, `overheat.ts:521-527`, `silverWind.ts:335-337`). No new "snapshot capture" is needed.

### 0.3 BG-register history (Silver Wind opponent, Psych Up, Overheat)

64 scenarios, 2 turns each (`prep16Scenarios.py`; predecessor = the other side's four moves replaced by TACKLE / SWORDS_DANCE / SPLASH / GROWL / PSYCHIC / HYPER_BEAM, a first-body variant per target, shiny and alternate variants), IO registers 0x00-0x56, `gBattle_BG*_X/Y`, the 32 software matrices and `gOamMatrixAllocBitmap` snapshotted at activation, one frame before, end+1 and end+30 of every body (`prep16-bg-history.json`, `-bg-states.json`, `-bg-table.json`).

- **The first-body state is a constant.** All **64/64** first-body activations (both sides, 3 target moves, alternate species, shiny, all predecessor variants) have the identical register/scroll/matrix signature **S0** (`dispcnt 0xbf40, bg0cnt 0x9800, bg1cnt 0x9c00, bg2cnt 0x5e00, bg3cnt 0x5a0b, all scrolls 0, win0h 240, win0v 161, bld* 0`, identity matrices, bitmap 0x6).
- **Any earlier body breaks it**, always at least `win0h 240 -> 0` and `win0v 161 -> 0`, and usually more (table). The software matrices are **identical to the first body's in every snapshot (activation, end+1, end+30) of every body of the 64 scenarios** (no state in `prep16-bg-states.json` differs in `matricesSha`; matrix history is not an issue for these predecessors).
- Activation registers that matter to the reducers, relative to S0 (`prep16-bg-table.json`; turn 1 = same-turn predecessor):

| Target body | After | Differences vs first body |
|---|---|---|
| Silver Wind, opponent attacker | foe TACKLE or PSYCHIC | `bg1cnt 0x9c00 -> 0x5c02`, win0 0 (this is the accepted fixture's state) |
| | foe SPLASH / HYPER_BEAM | win0 only (`bg1cnt` stays 0x9c00) |
| | stat body after GROWL / SWORDS_DANCE | `dispcnt 0x3f40, bg1cnt 0x1c00, bg1vofs 509 / 3, BG1_Y -3 / 3`, win0 0 (+ `bg2cnt 0x5e02` in some orders) |
| | own earlier SILVER_WIND (turn 2) | `bg1cnt 0x5c01` (prev TACKLE) or `0x9c01` (prev SPLASH), `bg2cnt 0x5e02` |
| Silver Wind, player attacker | (first body only in turn 1) turn 2 after TACKLE/SPLASH/HYPER_BEAM | `bg1cnt 0x5c01, bg2cnt 0x5e02`, win0 0 |
| Psych Up, player attacker (reads `bg2cnt`) | foe TACKLE / PSYCHIC | `bg2cnt 0x5e00 -> 0x5e02` |
| | foe SPLASH / HYPER_BEAM / stat bodies | `bg2cnt` unchanged (stat bodies change `dispcnt/bg1cnt/bg1vofs` instead, which this reducer does not read) |
| Psych Up, opponent attacker (reads `bg1cnt`, `bg1vofs`) | foe TACKLE / PSYCHIC | `bg1cnt 0x9c00 -> 0x5c02` |
| | stat bodies | `bg1cnt 0x1c00`, `bg1vofs 3 / 509` (SWORDS_DANCE / GROWL), `dispcnt 0x3f40` |
| Overheat (both) | turn 2 after SPLASH / HYPER_BEAM | `dispcnt 0x3f40, bg1cnt 0x1c00, bg1vofs 509`, win0 0 |

- **Is there a simple production rule? Yes in principle, no for production today.** The state is a deterministic **transition table** `(state at activation, body move, attacker side [, stat direction]) -> state left`: 20 distinct states over all probed bodies; every `(state, move, side)` key maps to one successor **except the stat-animation bodies**, whose `sAnimMoveIndex` is 0 for both GROWL's and SWORDS_DANCE's stat change (`prep16-bg-states.json` `nonFunctional`; they split cleanly by the stat direction/previous move). **Chain rule:** the next body's activation signature equals the previous body's end+30 signature in **197/197** pairs with a gap >= 30 frames and equals end+1 in **31/31** pairs with a gap < 30 (the stat body starting 4 frames after its parent). So a tracker "left-at-end per body" is exactly the ISSUES #148 shape. But each supported move needs its own measured row (~20 bodies measured here; the production has ~220 live adapters), and `registers`/scroll are renderer inputs the live path has no holder for. **Only first bodies can be exact today.**
- **The first-body gate production needs** = "no animation body (including stat-change bodies, both sides) has run since the battle began". The production already derives this bit for the allocator: `prepareLiveMoveSpriteOrder(...)` returns `input.known === true` only for the first body (`liveMoveSpriteAllocator.ts:141-144`; the route probe's `orderInput.known` below). Use the same bit; later bodies stay `null` (no adapter) or faithful-random.

## 1. Evidence

### 1.1 Composite and reducers (Overheat, Silver Wind)
`prep16PaletteCheck.ts`: real reducers, `palettes` = composite, asset words as resource palettes, compared with the ROM `palFull` at ages {0..8,12,20,40,80,120,160} on the banks the renderer reads (Overheat 2,3,4, monbg, 16, 17, 23, 24; Silver Wind 2,3,4, monbg, 16, 17, 23), 4 scenarios per move (accepted player/opponent, alternate CHARIZARD/GOLEM, BEAUTIFLY/GOLEM, both orientations). **Overheat: 0 mismatches at every age >= 7, in hardware, faded and unfaded;** the 38 mismatches per scenario are all pre-load/pre-monbg ages of banks nothing reads yet (monbg bank ages 0-6, bank 23 ages 0-1, bank 24 ages 0-4). Silver Wind: hardware 0 mismatches at probed ages 6-12; at 40-160 only bank 2 (see §1.2), plus the monbg bank at 0-5 and 160.

### 1.2 Silver Wind's two ROM-vs-reducer notes (not composite-attributable)
Bank 2 at probed ages 40-160: the ROM holds the faded BUG-background palette; the renderer draws the BUG background from the asset (`battleScene.ts:26123`), not from hardware bank 2, and the reducer's `palette` does not model it. At probed age 12 ROM `faded` 2/3/16 are mid-exclude-fade (hardware equal); the **accepted-palette reducer shows the identical differences** (an ad-hoc check of `silverWindAtAge` with the corpus palettes, and `compositeVsAcceptedReducer` finds no composite-vs-accepted difference on banks 2/3/16), i.e. they are my probe's sample phase vs the retained corpus rows, and the RGB gate is exact. Evidence for exactness is therefore the pixel gate (193/193, 196/196), not the faded arrays.

### 1.3 First-body captures
`silverWindProbe.py` on `prep16-swopp-first-onix` (the accepted species pair; the player ONIX gets nature BRAVE + speed IV 0 so the opponent BUTTERFREE acts first): Silver Wind is body 0 (196 rows). `silverWindInputsFor("opponent-front", rows)` (capture-derived) renders **196/196 exact**; the accepted post-Tackle inputs: 8 px/row off from age 0. The only differing inputs: `background.registers.bg1cnt 0x9c00` (vs `0x5c02`), `win0h 240`, `win0v 161` (vs 0), `background.monbg.splitBg1Cnt 0x9c01` (vs `0x5c01`) and the species geometry fields.
`psychUpProbe.py` on `prep16-hist-psychup-player-first-shuckle` (config target species overridden NINJASK -> SHUCKLE, geometry capture-derived): **179/179 exact**. Compared with the accepted post-Swords-Dance rows the reducer inputs (monBg, registers, matrixSlots) are **equal**; only `targetPictureOrigin.y 49 vs 40` (geometry) differs.

### 1.4 Psych Up palette (not pixel-proven)
ROM banks: spiral bank 23 == `psych-up.json` palette, banks 16/17 == battler assets, BG 2-4 == battle-bg, all ages probed (`prep16-palette-sources.json`). Its input also carries `palettes.attackerBank/backgroundBanks/resourcePalette` (`psychUp.ts:75-83`), derived in `psychUpInputsFor` from rows, not from the composite; swapping those for production sources was **not** run.

## 2. Exact integration input lists

### 2.1 Overheat (first body) — `SceneOnOverheatConfig` (`sceneOnPresentation.ts:2342`), `OverheatLiveInputs` (`overheat.ts:~40-125`)
| Field | Source |
|---|---|
| attacker/target side, species | request (the reducer's art lookup needs `battle-back-sprites` / `battle-opponent-front-sprites` entries: present for all species tested) |
| `attackerPictureOrigin/targetPictureOrigin` | `liveBattlerAnchors().picOffsetPoint` (prep14: 3/3) |
| `attackerSprite/targetSprite` x,y,x2,y2 | `liveBattlerAnchors().spriteCenter` + `frontIdleRest` (prep14); slot 6/8 by side, subpriority 30/40 constants |
| `animationRngSeed` | echo: no Random2 draw (prep14 §1.3); `liveMovePresentationRng` not needed |
| `allocator.spriteOrder` / `initialOccupiedSprites` / `initialMatrixBitmap` | known-entry first-body order (`prepareLiveMoveSpriteOrder`), bitmap `0x6`, in-use `[0,1,2,6,8,60,61,62,63]` (prep13/14 constants) |
| task/sprite/matrix slots, OAM templates, resources tile/slot/bank | constants (prep14 §1.3 list) |
| **`palettes.{unfaded,faded,hardware}`** | **composite (§0.2): `composePalettes(playerSpecies, opponentSpecies)`** |
| **`resources.smallEmber.palette`, `resources.impact.palette`** | asset words (resources JSON / `battle-anim-small-ember.json`, `battle-anim-hitsplat.json`); banks 7/8 from the palette host |
| `background.*`, `registers` | first-body constants (S0) |
| gate | first body AND `!shiny`; duration `OVERHEAT_FIRST_INACTIVE_AGE = 229` (`overheat.ts`, `liveMoveAnimationDuration` `liveMoveAnimation.ts:377`) |

### 2.2 Silver Wind (first body) — `SceneOnSilverWindConfig` (`sceneOnPresentation.ts:2372`), `silverWind.ts:35-100`
Same as Overheat plus: `attackerPictureOrigin = attacker spriteCenter`, `targetPictureOrigin = (target spriteCenter.x, target picOffsetPoint.y)` and each sparkle's birth `attr0` y byte shifted by the target pic-y delta (prep14 §1.4); `resources.sparkle6.palette` = `silver-wind.json` words; `background.registers`, `monbg.splitBg1Cnt` and `win0h/v` = **S0 values for the first body** (player side: the accepted constants; **opponent side: `bg1cnt 0x9c00, win0h 240, win0v 161, splitBg1Cnt 0x9c01`**, NOT the accepted post-Tackle `0x5c02/0/0/0x5c01`). Gate: first body, `!shiny`. Durations `{player: 192, opponent: 195}` first-inactive.

### 2.3 Psych Up — `SceneOnPsychUpConfig` (`sceneOnPresentation.ts:2298`), `psychUp.ts:64-89`
Player-attacker first body is ready after wiring the palette fields (§1.4). Still needed: `palettes.attackerBank/backgroundBanks/resourcePalette` from production sources; `monBg.initialBgCnt` (player: `bg2cnt` 0x5e00 first/0x5e02 after foe TACKLE or PSYCHIC; opponent: `bg1cnt` 0x9c00 / 0x5c02 / 0x1c00), `monBg.initialHardwareScroll` (opponent: `bg1vofs` 0 / 3 / 509), `registers.bld*` (0 at every activation measured), `matrixSlots` (identity in every measured activation). Verdict for later bodies: tracker table (§0.3) or first-body-only; **Psych Up opponent-attacker first body is unverified**.

## 3. Ordinary-input route seeds (prep11 §4 recipe; `prep16Routes.ts` + `prep16RouteProbe.ts` -> `fixtures/prep16/prep16-routes.json`, `-route-probe.json`)

Party member rentals[0..2] knows the move, seeds 0..9999 ascending, streak 0..42 step 7, `rentsCount 0`, `playerTrainerId 416049562`, `battleScene: "on"`, one turn. Probed result (`firstBody` = the move is the battle's first MOVE_ANIMATION request, attacker 0 = the player; `orderInput.known` true for those):

| Move | Routes (seed/streak, species, slot) that are **first body** | Not first body (foe acts first) |
|---|---|---|
| OVERHEAT | **4/14 MAGCARGO (slot 0, request frame 619)**, **69/14 SOLROCK (slot 3, f559)**, 5/14 PRIMEAPE (slot 2, f555), 9/35 EXPLOUD (slot 0, f588) | 8/42 CHARIZARD: the move was never requested (foe KO / not selected first) |
| SILVER_WIND | 3/7 VOLBEAT (f562), 8/7 VENOMOTH (f570), 10/7 MASQUERAIN (f568) | 9/0 BUTTERFREE (f707, post foe body) |
| PSYCH_UP | **66/7 JUMPLUFF (slot 2, f608)**, 15/28 METAGROSS (slot 2, f701) | 14/21 CLAYDOL (f933), 19/35 SNORLAX (f850) |

Slot-0 route counts over the 10,000 x 7 grid: Overheat 2132, Silver Wind 1475, Psych Up 1012; carrier species Overheat 14 (incl. SOLROCK, MAGCARGO), Silver Wind 9, Psych Up 10.

## 4. Method / reproduce
`sh tools/integration/prep16Run.sh` (~5 min on 12 jobs; direct mGBA only): regenerates `tools/battle-lab/prep16-*.json`, runs the probe twice and `cmp`s, then `prep16PaletteSources.py`, `prep16PaletteCheck.ts`, `prep16ProviderSlots.ts`, `prep16OverheatPixels.ts`, `prep16SilverWindPixels.ts`, `prep16BgHistory.py`, `prep16BgStates.py`, `prep16BgTable.py`, the two first-body captures (x2) + `prep16SilverWindFirstBody.ts` / `prep16PsychUpFirstBody.ts`, routes + route probe (x2). Receipts: `tools/integration/fixtures/prep16/` (bank-index / register tables and counts only; no RGB dumps, no mGBA logs).

## 5. Papercuts
- `PAPERCUT:` `validate_request` accepts a gender the species cannot have ("genderless" for CHARIZARD) and `BattleLab.prepare` then raises, so a generated alternate silently produced no probe JSON in the batch (the xargs wrapper hides the error); I only noticed from the count (62 of 63), ~6 min.
- `PAPERCUT:` `silverWindInputsFor` / `psychUpInputsFor` hard-code the species pair (BUTTERFREE/ONIX, JUMPLUFF/NINJASK), so a first-body capture with a different species silently renders the wrong sprite (residual 1668 px at age 0) before looking like a register bug; had to build a same-species scenario (nature + speed-IV trick), ~8 min.
- `PAPERCUT:` there is no `timeout` binary in this macOS shell (`timeout 580 sh ...` fails with command-not-found and the run is skipped), ~1 min.
- `PAPERCUT:` the `date` in this session runs in odd steps relative to elapsed work; budget by command timing, not by intuition, ~2 min.
