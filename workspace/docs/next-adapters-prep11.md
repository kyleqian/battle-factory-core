# Next adapters prep 11: Leaf Blade species diagnosis + measured prep of the 15 non-Random2 remaining moves (S10A, side lane)

Evidence/design only; **new files only** (no tracked file edited, no production code, no `PROGRESS.md`/`ISSUES.md`/`DEFERRED.md`). All emulator numbers are ROM frames from **direct, independent mGBA runs** (Scene ON, fresh process per scenario; the shared HTTP oracles were never contacted). Every relied-on probe was run twice and is byte-identical (`cmp` r1/r2: 32 + 14 scenario files; Part A dense: two fresh runs per fixture, digests equal). Production line numbers are at this branch's base `d997cdb3b`; a sibling lane edits `src/engine/*`: re-grep before editing. Drafted fixtures are **unverified until an adapter exists** (`consumedByTest: false`). Not run: full `npm test` / build (no production file changed); `npm run typecheck` is the only gate that applies to the new `.ts` tools (see the end).
Random2 moves (census code C) are excluded by assignment.

## 0. Results

### 0.1 Part A: Leaf Blade (348) + GOLEM target: **SPECIES-DEFECT, affects play today**

The 11,843 px residual is **not post-KO specific**. At the battle's FIRST body (entry geometry, no preceding body, no KO), the production adapter fails identically for any non-ONIX opponent target:

| Dense run through `verifyLiveAdapterFramebuffer` (2 fresh runs each, digests equal) | rows exact | residual px | residual ages |
|---|---|---|---|
| accepted `order-consumer-leaf-blade-player.json` (SCEPTILE -> ONIX) | 224 / 224 | 0 | none |
| SCEPTILE -> **GOLEM** (`prep11-leaf-blade-player-sceptile-opponent-golem`) | 212 / 224 | **11,843** | ages 0-11 (987 px per age; 986 at 11) |
| NINETALES -> **GOLEM** (the post-KO fixture's pair, at entry geometry) | 212 / 224 | **11,843** (identical) | ages 0-11 |
| NINETALES -> ONIX | 224 / 224 | 0 | none |
| SCEPTILE -> **STEELIX** | 212 / 224 | 12,202 | ages 0-11 (1018 px per age) |
| accepted `prep5-leaf-blade-player.json` with the opponent swapped to GOLEM | 212 / 224 | 11,843 | ages 0-11 |

So the post-KO number is exactly the entry-geometry number: it is the **target species** (GOLEM), not the attacker (NINETALES vs SCEPTILE changes nothing) and not the post-KO lend. `POSTKO_LEND_EXCLUDED_MOVE_IDS` (`src/engine/liveSpriteOrderHost.ts:283`) excludes the wrong thing: after the fix Leaf Blade should be allowed back post-KO (re-verify with `postko-leaf-blade-player.json`).

**Residual colours** (`fixtures/prep11/leaf-residual-colors.txt`, ages 0 / 11 / 12): bbox x149-203 y18-71 (GOLEM) / x144-208 y9-71 (STEELIX) = exactly the target sprite box; the colour pairs are the target's own palette tones swapped against its neighbours (GOLEM `101010<-636b21`, `636b21<-8c9442`, `9c8c39<-d6b55a` ...; STEELIX `4a5a7b<-849cad`, `849cad<-bdcec6`): **a 1-pixel horizontal shift of the target sprite**, not a hit flash, blend or palette load. A pure shift test (live render rolled by dx = -1 matches the ROM to 24 residual px of 987 = box edge pixels at ages 0-11, 0 at age 12) confirms it.

**Mechanism:** `src/animation/leafBlade.ts:231-233`

```ts
// ONIX's opponent-front idle holds x2=1 until the first shake task owns ...
return targetSide === "opponent" && age <= 11 ? 1 : 0;
```
`leafBladeDisplayedTargetX2AtAge(age, targetSide)` hard-codes the ONIX front-idle `x2 = 1` for **every** opponent target (called from `src/engine/battleScene.ts:22687`; the adapter, `liveMoveAnimation.ts:1198-1213`, passes no idle input). ROM opponent battler `x2` at body ages 0 / 5 (slot read from `opponentSprite`, `fixtures/prep11/leaf-idle-x2.json`, one fresh run per species): **ONIX 1**; GOLEM, GRAVELER, GENGAR, SHUCKLE, ABSOL, ZANGOOSE, SWELLOW, STEELIX **0** (then -2 / +2 once the first ShakeMon2 starts, as the reducer already models).

**Fix shape (presentation-only):** the production source already exists and already equals the ROM for all 8 species (`tools/integration/prep11IdleX2Check.ts`: `speciesFrontIdleRestOffsetOrZero(name)`, `src/animation/speciesIdleAnim.ts:7562`, ONIX 1, others 0, **8/8**), exposed as `liveBattlerAnchors(side, art).frontIdleRest.x2` (`liveMoveAnimation.ts:259`) and already threaded for Crabhammer / Psybeam / Magical Leaf (`liveMoveAnimation.ts:1030-1033`, `targetIdleX2`). Do the same for Leaf Blade: add `targetIdleX2` to the `case 348` config (`:1207`), thread it to `leafBladeDisplayedTargetX2AtAge(age, side, idleX2)` and return `targetSide === "opponent" && age <= 11 ? idleX2 : 0`. Verify with the four prep11 fixtures above (expect 224/224 each) and re-test the post-KO fixture. NOTE: pass the *species symbol without the `SPECIES_` prefix* to the table (the first call with the prefix silently returned 0 for every species: PAPERCUT).

**Follow-up audit (the same hard-code pattern may exist elsewhere):** `fixtures/prep11/audit-golem-summary.json` swaps the ONIX opponent for GOLEM in 58 accepted ONIX-target player fixtures (one fresh run each, `prep11TargetSwapAudit.py`): 22 exact (0 px) incl. Double-Edge, Hi Jump Kick, Magical Leaf (the control that already uses `frontIdleRest`), Grudge, Perish Song, Mean Look, Aromatherapy, Muddy Water, Future Sight, Drill Peck, Giga Drain / Absorb / Sunny Day alternates, Dragon Dance, Follow Me, Frustration, Seismic Toss, Swift, Uproar, Mega Drain, Knock Off; **Leaf Blade x2 (the defect)**; **Dragon Rage 139/150, 2,115 px at ages 86-96** (`order-consumer-dragon-rage-player`, `prep5-dragon-rage-player`; the residual is the **fireball projectile in flight** (orange/red `ff6310 ff9418 ff0000 ffc621` pixel pairs, bbox travelling x104-114,y97-111 at age 86 -> x166-181,y43-70 at age 96, `fixtures/prep11/dragon-rage-golem-residual-colors.txt`): the projectile's aim/endpoint depends on the target's position, so this is a SECOND species-dependent target input (not the idle x2); needs its own trace of which target coordinate the live adapter passes, UNTRIAGED beyond that); 9 more fixtures show residuals and 23 errored that are almost certainly the fixed accepted window not matching the swapped scenario's frame timing (multi-hit later hits, Aerial Ace/Ice Punch lab, Sleep Talk, Sing, Light Screen: constant or whole-window residuals; the errors read "Probe omitted part of the complete source window"). These need the fixture's window re-derived per swapped scenario before they say anything; only Leaf Blade is a proven species defect.

### 0.2 Per-move verdicts (Part B)

Common to all 15 (52 activations over the 32 base + 14 alternate-species scenarios, fresh x2): `gOamMatrixAllocBitmap = 0x6` and **no active task** at every activation; the move's **activation frame equals its own accepted probe's window start (row 0)** for every move whose probe records a window (`prep11Windows.sh`; windows are inclusive of the first-inactive frame: rows = script frames + 1); the order at activation is one of the two known shapes `[62,60,0,63,1,61,6,8,2,4,3,21,20,5,..]` (first body) / `[..,2,3,4,21,20,5,..]` (after a Tackle) in 47 of 52 activations (the other 5 are Bounce / Rollout bodies after several bodies: tracker lend needed).

**The D-PAL / D-BG / D-TILE / E-TASK / F-AFFINE labels are stale for every move that has an accepted corpus.** `prep11CrossCheck.py` compares the fresh measurement against the retained accepted dense corpora (`tools/compare/evidence/<move>-<side>-dense-state.json.gz`; they come from different, Factory-staged scenarios): for AIR_CUTTER, DESTINY_BOND, FORESIGHT, LEECH_SEED, PETAL_DANCE, RECYCLE, SKY_UPPERCUT, SPIDER_WEB, TRI_ATTACK x both sides (**18/18 corpora**) the window rows, matrix bitmap (where recorded), ordered sprite spawns (slot, template, palette bank, tile start, matrix id), and task (slot, function) pairs are **equal**. The allocator constants therefore do not depend on the scenario or the attacker/target species (14 alternate-species probes: 13 identical signatures; Sky Uppercut has a +1-frame tail, see its row).
Measured allocator facts (all bodies; `prep11-analysis.json`): first-loaded sprite sheet = **palette bank 7, tile 305** (a second sheet 8 / ~321-433, a third 9 or 10, `gSimplePaletteBlend` = bank 15), OBJ matrix ids first-free over bitmap `0x6` (0, 3, 4, ...), task slots lowest-free (UpdateMonBg slot 1, ClearMonBg/Shake/Blend slot 0 ...), sprite slots first-free from 3. OBJ banks 7/8/9 are **not free** at activation (6/4/2 distinct stale colour sets across the 52 activations; banks 0/1 = species art, 13-15 = UI), but every move overwrites the banks it uses, so no palette *snapshot* is needed.
**D-BG is derivable:** the `monbg` input is the first `Task_UpdateMonBg` data `[bgId = 6 (player target) / 8 (opponent), x, y, 32-x, 32-y, inBg2 = target is the player, battlerId = target, 0]` with `(x, y)` = the target battler sprite position at activation (+ the species front-idle x2, 1 for ONIX only): **25/25 bodies hold, including 7 alternate-species bodies** (`prep11MonbgCheck.py`, `fixtures/prep11/prep11-monbg-formula.json`). Source: `liveBattlerAnchors` (`liveMoveAnimation.ts:159-224`) + `frontIdleRest`.
Net-zero: every body above leaves sprites / bitmap / tasks equal at end+1 (except the X-SWITCH continuation, below).

| Move | Verdict | Missing input -> production source | Act / window / rows | Alternate species |
|---|---|---|---|---|
| ROAR (46) | **body READY-WITH-CHANGE; continuation UNRESOLVED** (§2.1) | none for the body: `SceneOnRoarConfig` = attacker, target, fieldProfile (`sceneOnPresentation.ts:3385`); allocator slots `[3,4,5]`, tasks SlideOffScreen 0 / UpdateMonBg 1 / cries 0,2 / ScaleMonAndRestore 3 (constants); no order field | act == window start, row 0: 252..350 (player attacker, 99 rows) / 219..322 (opponent attacker, 104 rows: cry timing differs by side) | VAPOREON: 99 rows, same signature |
| WHIRLWIND (18) | **body READY-WITH-CHANGE; continuation UNRESOLVED** | none (same as Roar); slots `[3,4,5,7,9,10]`; tasks ShakeMon2 / TranslateMonElliptical slot 1, SlideOffScreen 0 | 222..304 / 316..398, **83 rows** both sides | BEAUTIFLY: identical |
| BATON_PASS (226) | body READY-WITH-CHANGE; **flow BLOCKED** (§2.2) | body: none (ball sprite slot 3 age 4, `AnimTask_BlendColorCycleLoop` slot 0). Flow: production emits no switch commands after a Baton Pass (`move-animation > turn-end`) | 69 / 73, **53 rows**, row 0 | NINJASK: identical |
| LEECH_SEED (73) | **READY-WITH-CHANGE** (main body only) | `effectCenter` = `liveBattlerAnchors(...).picOffsetPoint`; `targetRestOffset` = `frontIdleRest` (Part A table); `allocatorProfile` constants: leeches slots `[3,4,5]` at ages 4/14/24 (the hitsplat/orbs part belongs to the separate end-turn drain body, a `move 0` body of 207 rows, which stays scene-off) | 246 / 245 vs accepted corpus 246..386: row 0, 141 rows | VENUSAUR: identical |
| TRI_ATTACK (161) | **READY-WITH-CHANGE** | all constants: triangle slot 3 / matrix 0 / bank 7 / tile 305; flame slots `[4,5,7,9,10,11,12,3]` (ages 107-125) + bank 8; lightning `[3,4,5]` bank 9; ice `[3,4,5,7,9,10,11]` bank 10 matrices `0,3,4,5,6,7,8`; palette-blend slots **3 (age 86) and 12 (age 244) == accepted `paletteSlots [3, 12]`**. Order seed via the lend | 81 / 77, **284 rows**, row 0 | DUGTRIO: identical |
| DESTINY_BOND (194) | **READY-WITH-CHANGE** | white-shadow sprite slot 3 (age 43), bank 7 / tile 305 (accepted corpus tag 10188 at bank 7), tasks FadeToBg 0 (age 4), WhiteShadow 0 (43), ShakeMonInPlace 1 (93), BlendSpriteColor 2 (93, 119), bitmap 6; order lend (post-Tackle `[..,2,3,4,21,20,5]`) | 218 / 219, **188 rows**, row 0 | GENGAR: identical |
| RECYCLE (278) | **READY-WITH-CHANGE** | `spriteSlot` 3, `matrixNum` 0, bank 7 (spawn age 10), `attackerPaletteIdPlusOne` = `16 * battlerOBJbank + 1`: battler OBJ banks **0 (player) / 1 (opponent)** measured -> **1 / 17** (production: the side). No palette snapshot (D-PAL stale) | 2193 / 2589 (after earlier bodies), **203 rows**, row 0 | PORYGON2: scenario's carrier is genderless PORYGON, the PORYGON2 variant fails lab validation (gender), not probed |
| PETAL_DANCE (80) | **READY-WITH-CHANGE** | slots `[3,4,5,7,9..17]` (13), tasks ellipse 0 / UpdateMonBg 1 / ClearMonBg 0 / Shake 0, hit splat matrix 0 bank 8 tile 310, big/small flowers bank 7 tiles 305/309, monbg formula | 217 / 215, **244 rows**, row 0 | VILEPLUME: identical |
| ROLLOUT (205) | **READY-WITH-CHANGE (needs counter)** | `RolloutCounter` (1..5) from the engine's DisableStruct rollout timer (`battleScriptRulesContext.ts:251-252, 325-326`): the request carries only the static power; lab bodies 1/2 = mud (power 30) / rock (power 60) templates with different bank/tile (8/321 vs 9/617); accepted corpus: 167, 167, 161, 153, 145 rows. Defense Curl doubles the power, so it cannot be inferred from `battleMovePower` alone | 75 / 79 (row 0, and body 2 at 575 == accepted body 2) | WAILMER: identical |
| AIR_CUTTER (314) | **READY-WITH-CHANGE** | wave slots `[3,4,5]`, slice slot 3, banks 7 / 8 (tiles 305 / 537), tasks projectile 0 / UpdateMonBg 1 / ShakeMon2 0 / Clear 0; targetCenter / sprites from anchors; no partner (singles) | 74 / 78, **112 rows**, row 0 | CROBAT: identical |
| FORESIGHT (193) | **READY-WITH-CHANGE** | glass slot 3, bank 7 / tile 305, blend task 0, UpdateMonBg 1, Clear 0, bitmap 6, monbg formula (spriteX 177 for ONIX), order lend | 211 / 210, **167 rows**, row 0 | HITMONLEE: identical |
| SKY_UPPERCUT (327) | **READY-WITH-CHANGE** (one species open point) | slide-off sprites slot 3 (age 85) and 9 (103), restore sprites 3 (141) / 4 (147), splat slots `4,3,5,7,4` (ages 91-103) matrices 0,3,4,5, tasks UpdateMonBg 1, FadeToBg 0/3, MoveSkyUppercutBg 2, order lend | 82 / 86, **188 rows**, row 0 | COMBUSKEN: spawn ages/slots identical but the script ends **1 frame later (189 rows)**: species-dependent tail, unexplained (OPEN-1) |
| SPIDER_WEB (169) | **READY-WITH-CHANGE** | web matrix 0 / bank 7 tile 305, threads bank 8 tile 433, palette-blend sprite bank 15; sprite slots `[3,4,5,7,9..18]` (slot 3 reused at different ages, see the draft spawn list), tasks LoopAndPlaySE 0 / UpdateMonBg 1 / Clear 0, order lend | 220 / 219, **207 rows**, row 0 | ARIADOS: identical |
| FLY (19) | **READY-WITH-CHANGE** (needs the hidden-attacker seam, §2.3) | body: ball slot 3 bank 7 matrix 0 (charge, 43 rows); strike: ball slot 3 + hit splat slot 4 bank 8 matrix 3 (68 rows); `controllerProfile` of `SceneOnFlyConfig` is HUD-only (message / HP ages): the live view must not need it | charge 51 (row 0, 43 rows), strike 513 / 408 (68 rows); `request.turn` 0 / 1 already emitted | SWELLOW: identical |
| BOUNCE (340) | **READY-WITH-CHANGE** (same seam) | as Fly; charge 64 rows, strike 55 rows; the paralysis status is a separate queue event | charge 254 / 338, strike 771 | PONYTA: identical |

### 0.3 Counts
READY-WITH-CHANGE: 13 (Roar and Whirlwind body-only with the continuation open; Rollout needs the counter; Fly / Bounce need the hidden-attacker seam). BLOCKED: BATON_PASS flow (body is fine). The "change" for the order-consumer moves is the same one every earlier adapter needed: a `case <id>` in `src/engine/liveMoveAnimation.ts`, the allocator constants of `fixtures/prep11-<move>-*.json` (== accepted corpora), and the renderer pair gate lift. Nothing in this prep needs a gameplay / RNG change.

## 1. Evidence index (all new files)

| File | Content |
|---|---|
| `tools/integration/prep11Probe.py`, `prep11Probes.sh` | per-body activation/end, power globals, mons, BG/blend registers, OBJ + BG palette banks (unfaded and faded), task funcs + data, spawns (with late attr), per-frame battler series, `sSpriteOrder`, species / party-index events |
| `prep11Windows.sh` | each move's OWN accepted source probe (`tools/compare/<move>Probe.py`): recorded window |
| `prep11Analyze.py` -> `fixtures/prep11/prep11-analysis.json` | per-body tables |
| `prep11CrossCheck.py` -> `fixtures/prep11/prep11-crosscheck.json` | fresh vs the 18 retained accepted corpora |
| `prep11MonbgCheck.py` -> `fixtures/prep11/prep11-monbg-formula.json` | the monbg formula |
| `prep11Draft.py` -> `fixtures/prep11-<move>-<side>-<scenario>[-turnN].json` (49) | drafted dense fixtures (prep10 shape, marked DRAFT) with activation, window, allocator, monbg, order, route seeds |
| `prep11AltScenarios.py` -> `tools/battle-lab/prep11-<move>-alt-<species>.json` | alternate-species scenarios (internal species ids via `species.h`) |
| `prep11LeafScenarios.py`, `prep11LeafDense.ts`, `prep11LeafColors.ts`, `prep11LeafIdleX2.sh`, `prep11IdleX2Check.ts`, `fixtures/prep11/prep11-leaf-blade-*.json`, `leaf-*.json/txt` | Part A |
| `prep11TargetSwapAudit.py`, `fixtures/prep11/audit*` | Golem swap audit |
| `prep11Routes.ts`, `prep11RouteProbe.ts`, `prep11TwoTurnProbe.ts`, `prep11XSwitchCommands.ts` -> `fixtures/prep11-routes.json`, `prep11-route-probe.json` | generated-rental route seeds + command sequences |

## 2. X-SWITCH and X-TWOTURN

### 2.1 Roar / Whirlwind: what the body is vs the forced switch
ROM (`PREP11_ALWAYS=1` series, `E` = the first frame the script is inactive = the last window row):
- Body = the move script alone (`Move_ROAR` / `Move_WHIRLWIND`); it is **self-contained**: activation == window start, net-zero at E+1. The target is slid off-screen by `AnimTask_SlideOffScreen` and is **still off-screen at E**: target battler `x2` = +97 (player attacker, opponent target; reaches 97 by body age ~93) or -106 (opponent attacker, player target), constant through E.
- Continuation (identical offsets for both moves, both sides): target OBJ slot 8 (battler sprite) **freed at E+4**; `gBattlerPartyIndexes[target]` changes at **E+7** (Roar 357 vs E=350) / E+7 (Whirlwind 311 vs 304); `gBattleMons[target].species` replaced at **E+9**; ball sprites (slots 3,4,5) at **E+10**; 15 star sprites (slots 7..21) at E+28..E+43; the new mon's `y2` bounce 14 -> -5 starts at **E+29**. From E+4 to E+9 the target side is **empty** (no battler sprite).
- Production today (`prep11XSwitchCommands.ts`, generated routes Roar 42/0, Whirlwind 9/0, 30/0): `message > move-animation > switch-out (+32 frames) > sprite-visibility > switch-in (+33) > message > ...`: the production queue **already emits a recall + send-in** for the forced replacement. Whether it composes with a live body whose slide-off already removed the mon is **not measured**: the live `move-animation` would run 99-104 rows and then a recall animation (shrink-into-ball) of a battler that is already off-screen. UNRESOLVED; named instrument: render the production `switchOut` / `switchIn` views (`liveView(...).switchOut`) for the ROM frames E+1..E+60 of the Roar scenario and compare (a new wrapper over `renderBattleResolutionLiveView`; 1-2 hours). Until then ship only the body behind a fallback that keeps the 32-frame scene-off timing for the continuation.
- Speculative recipe (needs that measurement): the continuation commands are `switch-out` at body end + 0 with the target hidden (production `switchOut` view that draws nothing) then `switch-in` at E+10, mon at E+29.

### 2.2 Baton Pass
ROM (opponent attacker, lab scenario `baton-pass-opponent-aipom-player-onix`; the player-attacker scenario has no switch because the lab trace gives no party-screen input): body 73..125 (53 rows): ball sprite slot 3 (age 4, freed age 22); **the attacker sprite is hidden (`invisible` = 1) from body age 9** and stays hidden past the window; slot 8 (its battler sprite) freed at **E+8**, `gBattlerPartyIndexes` changes at E+9 (134), `gBattleMons` species at E+11 (136), ball sprites of the replacement at **E+50** (175). Production (routes 71/0 AIPOM, 2/7 NINJASK): `move-animation > turn-end`: **no switch command is emitted after a Baton Pass** (the route driver stalls at the party screen / the engine presents no replacement), so the replacement graphics have no owner: BLOCKED for the flow. Resume condition: a presented forced-replacement sequence after Baton Pass in `battleResolutionPresentation` (same family as Roar's `switch-out/-in`) and the §2.1 measurement. The body alone is READY-WITH-CHANGE only if the attacker's hide at age 9 and the E+8 free are kept by the host (visibility after the window), otherwise the frames E+1..E+8 draw the wrong thing.

### 2.3 Fly / Bounce (hidden battler between turns)
`request.turn` 0 (charge) / 1 (strike) is already emitted by the engine (`prep11TwoTurnProbe.ts`: Fly 38/7 SWELLOW `19,t0 @579` ... `19,t1 @862`; Bounce 65/7 PONYTA `340,t0 @576`, `340,t1 @853`). ROM: the charge body hides the attacker at **age 7** (`invisible` = 1) and it **stays hidden for the entire gap** (Fly player: hidden 58..446, i.e. across the 300+ frame turn gap; visible again at strike age **39** (player attacker) / **40** (opponent)); Bounce player: hidden from charge age 7 (frame 261) to strike age **26** (797). Production command stream between the turns shows no `sprite-visibility` for the attacker, battler 0 (only battler 1 toggles at the end of each turn, and both at the strike's end) -> **the host must keep the attacker's `visibility.<side>.sprite = false` from charge age 7 through the strike body's age 39/40/26** (orchestrator state, presentation-only; the reducers' own `strikeAttackerRestoreAge` takes over inside the strike body). Both reducer configs also demand a `controllerProfile` (message / HP / hit-reaction ages) that the live view cannot supply: needs a body-only path (the census already says HUD-only).
Charge/strike rows: Fly 43 / 68 (act 51 / 513 or 408), Bounce 64 / 55 (254 / 771 player; 338 opponent charge).

## 3. Per-move notes (activation vs window; never matched to output)
- Activation = window start for every probe-covered move (row 0): AIR_CUTTER 78/74, DESTINY_BOND 218/219, FORESIGHT 210/211, PETAL_DANCE 217/215, RECYCLE 2193/2589, ROAR 219/252, SKY_UPPERCUT 86/82, SPIDER_WEB 219/220, TRI_ATTACK 81/77, WHIRLWIND 316/222, ROLLOUT 75 (five accepted body windows 75, 575, 1079, 1578, 2074), LEECH_SEED 246/245. Leech Seed's accepted window is `windows.main` of its probe (141 rows).
- Order dependence: first-body moves use the known-entry order; the rest of the order consumers (AIR_CUTTER, PETAL_DANCE, FORESIGHT, SKY_UPPERCUT, SPIDER_WEB, TRI_ATTACK, DESTINY_BOND) were measured at first-body (20 activations) and post-Tackle (27) shapes only. **Pixel sensitivity to the order was not re-measured here** (prep9 did it for the drain moves; order-consumer-truth for others); Bounce / Rollout later bodies see other shapes (`[..,2,3,9,7,5,4,10,21]`, `[..,2,5,3,4,7,9,10,21]`, `[..,2,3,4,5,11,10,9,7]`) and need the tracker lend.
- Reducer/ROM equality is **not** claimed beyond the allocator constants: the dense framebuffer comparison needs the adapters.

## 4. Generated-rental route seeds (`fixtures/prep11-routes.json`, `prep11-route-probe.json`)
Party member 0 knows the move, seeds 0..9999, streak 0..42 step 7, `playerTrainerId 416049562` (the prep10 recipe; `generatedCommandAnimationReplay` via `prep7Replay`, `battleScene: "on"`, one turn; `first` = first body of the battle):

| Move | Seed / streak / species that REACH the body | Notes |
|---|---|---|
| ROAR | 42/0 HOUNDOUR, 6/21 VAPOREON | not first body (opponent acted first) |
| WHIRLWIND | 9/0 BUTTERFREE, 30/0 BEAUTIFLY | not first body; continuation commands present |
| BATON_PASS | 71/0 AIPOM, 2/7 NINJASK | first body; no continuation commands |
| LEECH_SEED | 84/0 EXEGGCUTE (not first), 16/28 VENUSAUR (first, order known) | 7/28 BRELOOM did not reach |
| TRI_ATTACK | 0/21 DUGTRIO, 11/28 FEAROW (first, order known), 92/14 PORYGON (not first) | |
| DESTINY_BOND | 18/42 GENGAR (first, order known), 68/14 WOBBUFFET (not first) | |
| RECYCLE | none reached (78/0 PORYGON: the only slot-0 route, did not request it) | needs a second route search with Recycle after an item removal |
| PETAL_DANCE | 49/7 GLOOM, 34/0 IVYSAUR (both first, order known) | |
| ROLLOUT | 2/0 VOLTORB, 1/7 DUNSPARCE (first) | counter bodies 2..5 need more turns |
| AIR_CUTTER | 57/7 GOLBAT, 120/35 CROBAT (first, order known) | |
| FORESIGHT | 100/14 HITMONLEE (first, order known), 14/0 MACHOKE (not first) | |
| SKY_UPPERCUT | 48/7 HITMONCHAN (first), 145/14 COMBUSKEN (not first) | |
| SPIDER_WEB | none reached (118/0 ARIADOS did not) | 110 slot-0 routes exist; search deeper |
| FLY | 38/7 SWELLOW (first, order known), 25/7 MURKROW (first, order NOT known) | two turns via `[idx, idx]`: `19,t0` then `19,t1` |
| BOUNCE | 65/7 PONYTA (first), 87/0 SPOINK (not first) | two turns: `340,t0`, `340,t1` |

## 5. Open questions
1. SKY_UPPERCUT + COMBUSKEN ends 1 frame later (189 vs 188 rows) with identical spawn ages: what species-dependent wait adds it?
2. X-SWITCH continuation composition (§2.1): one measurement away; Baton Pass flow has no presented replacement.
3. Rollout counter source: confirm the DisableStruct field in the engine matches the ROM's `rolloutTimerStartValue - rolloutTimer - 1` through five bodies (accepted corpus has the ROM side).
4. Order pixel sensitivity of AIR_CUTTER / FORESIGHT / SPIDER_WEB / SKY_UPPERCUT / PETAL_DANCE / DESTINY_BOND / TRI_ATTACK (reverse-order test as in prep9).
5. Dragon Rage with a non-ONIX target (2,115 px at ages 86-96, the in-flight fireball): second species-dependent target input; trace which target coordinate the live adapter feeds the projectile (Part A audit).
6. Recycle / Spider Web have no generated-rental route that reaches the body in this search window.

## 6. Reproduction (workspace root; direct mGBA; nothing contacts the shared oracles)
```
python3 tools/integration/prep11LeafScenarios.py
npx vite-node tools/integration/prep11LeafDense.ts tools/integration/fixtures/prep11/prep11-leaf-blade-player-*.json   # 2 fresh runs each; OUT=/tmp/x.json; POKEBENCH_LIVE_EVIDENCE_DIR keeps rgb
PPM=/tmp/leafg npx vite-node tools/integration/prep11LeafColors.ts <fixture> <scratch-or-evidence-dir> <firstFrame> 0 11 12
sh tools/integration/prep11LeafIdleX2.sh ONIX:95 GOLEM:76 GRAVELER:75 GENGAR:94 SHUCKLE:213 ABSOL:376 ZANGOOSE:380 SWELLOW:305; npx vite-node tools/integration/prep11IdleX2Check.ts
python3 tools/integration/prep11AltScenarios.py
sh tools/integration/prep11Probes.sh r1; sh tools/integration/prep11Probes.sh r2     # /tmp/prep11-probes/rN; cmp r1 r2
sh tools/integration/prep11Windows.sh r1
python3 tools/integration/prep11Analyze.py /tmp/prep11-probes/r1 && python3 tools/integration/prep11CrossCheck.py && python3 tools/integration/prep11MonbgCheck.py && python3 tools/integration/prep11Draft.py
PREP11_ALWAYS=1 $PY tools/integration/prep11Probe.py tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json /tmp/o.json   # continuation series
node --experimental-strip-types tools/integration/prep11Routes.ts > tools/integration/fixtures/prep11-routes.json
MAX_CAND=8 MAX_HITS=2 node --experimental-strip-types tools/integration/prep11RouteProbe.ts <MOVE>
node --experimental-strip-types tools/integration/prep11TwoTurnProbe.ts; node --experimental-strip-types tools/integration/prep11XSwitchCommands.ts
python3 tools/integration/prep11TargetSwapAudit.py $(cat candidates)    # then prep11LeafDense.ts per audit fixture with FRESH=1
```
Probe processes segfault at interpreter teardown after writing their JSON (harmless, as in earlier preps).

## 7. Papercuts
- PAPERCUT 1: `speciesFrontIdleRestOffsetOrZero("SPECIES_ONIX")` silently returns `{0,0}` for every species (the table is keyed WITHOUT the `SPECIES_` prefix); a wrong key looks exactly like "species has no idle", ~15 minutes lost before the Onix x2=1 mismatch turned into an OK.
- PAPERCUT 2: `verifyLiveAdapterFramebuffer`'s CLI is a no-op under vite-node (`process.argv[1]` is the runner) and the scratch/rgb dirs are deleted at exit; the wrapper needs `POKEBENCH_LIVE_EVIDENCE_DIR` to keep pixels, ~10 minutes.
- PAPERCUT 3: lab scenarios for Fly / Bounce override only `battlers.player.moves` (set-id species); an alternate species needs a full `parties` override copied from another file, and genderless carriers (VOLTORB, PORYGON) reject a gendered replacement (`overrides.parties...gender 'genderless' is not available for species N`), ~10 minutes.
- PAPERCUT 4: the sprite `attr` read at the spawn frame is not final (animated tile numbers advance; Destiny Bond / Tri Attack set tile / palette after `CreateSprite`): record bank at spawn+3 and tile at spawn (a naive late read made Tri Attack's flame tile 553 instead of the accepted 537), ~10 minutes.
