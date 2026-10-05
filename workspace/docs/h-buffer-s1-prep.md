# H_BUFFER batch S1 (+S2) prep: measured verification of the static triage (S10A, side lane)

Evidence/design only; **new files only**, no tracked file edited. Verifies `docs/h-buffer-triage.md` batch S1 by *measurement* (production helpers, probes,
reducer scans) and drafts the live fixtures. Not run: `npm test`, build, typecheck, any harness (fixtures are unverified until an adapter exists).
Format follows `docs/next-adapters-prep2.md`. All frames are ROM frames from `tools/integration/issue142ActivationProbe.py` (fresh direct mGBA, Scene ON, one run per scenario).

Files (all new):

| File | What |
|---|---|
| `tools/integration/prep4Production.mjs` | `derive(attacker, side, target)` = production `liveBattlerAnchors` + `createBattleCommandFieldArtView` (pic point, sprite centre, battle position, pictureHeight, front idle, coords w/h/yOffset, subpriority 30 player / 40 opponent) |
| `tools/integration/prep4Pins.mjs` -> `fixtures/prep4-pins.json` | 176 field pins, accepted value vs production-derived, both orientations, S1 + S2 (`match`, `resolved`, `note`) |
| `tools/integration/prep4TieScan.mjs` -> `fixtures/prep4-tie-scan.json`; `prep4OrderScan2.mjs` -> `fixtures/prep4-order-scan2.json` | OAM-tie dependence scans (Ember, Dragon Breath; Ingrain, Smelling Salt) |
| `tools/integration/fixtures/prep4-activation/mechanic-*.json` | raw activation-probe receipts (16 scenarios) |
| `tools/integration/prep4Draft.py` -> `fixtures/prep4-<move>-{player,opponent}.json` | 16 drafted live fixtures (6 S1 + BIND, WRAP) in the `prep2-*.json` shape (`schema prep4-adapter-draft/v1`) |
| `tools/integration/prep4Routes.ts` -> `fixtures/prep4-routes.json` | generated-rental routes (seeds 0..9999 x streak 0..42 step 7, rentsCount 0, playerTrainerId 416049562) |

## 0. Verdicts

| Move | Config fields vs production | Order dependence | Shadow row / duration | Verdict |
|---|---|---|---|---|
| EMBER (52) | all derived exact (both orientations) | **YES, unshown**: 90 equal-key overlapping pairs in the window | `-4` (not in map) / 63 | **NOT-READY: NEEDS-ORDER** |
| DRAGON_BREATH (225) | all derived exact | none (0 equal-key pairs) | `-6` (not in map) / 83 (window starts at presentation age -2) | **READY** (trim 2 pre-age-0 rows, s2.2) |
| DEFENSE_CURL (111) | all exact **except** attacker `animationCenter`: live default (72,102)/(176,56) vs accepted (72,86)/(176,46) -> explained, derivable | none (single orb) | `0` / 100 | **READY** (config case must set `animationCenter = battlePositionCenter + (0,6)`) |
| INGRAIN (275) | all exact; accepted visual species is **CACTURNE**, not Lileep | slots == known-entry first-free; also 0 overlapping equal-key pairs -> moot | `0` / 164 | **READY** (Lileep pixels not pinned) |
| MEAN_LOOK (212) | all exact (`targetSubpriority` field is the **attacker's** subpriority) | none (one eye) | `0` / 171 | **READY** |
| SMELLING_SALT (265) | all 5 profile numbers exact | none (hands never overlap) | `0` / 121; ad-hoc shadow `battleScene.ts:41910-41916` to retire | **READY** |
| BIND (20) (S2) | geometry exact; profile = script literals | none | **`+2`** (in map, value 2, not 0) / 45 | **READY** |
| WRAP (35) (S2) | geometry exact; `animationCenter` mismatch is unconsumed | none | `0` / 38 | **READY** |

So 5 of 6 S1 moves are mechanically ready; **Ember is not**: it silently depends on OAM tie order (s2.1). Double Team / Faint Attack skipped as instructed.

## 1. Accepted sources per move

Config type lines are the **current** file (the readiness JSON/triage cites drifted: e.g. Ember `:1834` there, `:1696` now).

| Move | Config (`src/animation/sceneOnPresentation.ts`) | Accepted fixture / builder | Renderer branch (`src/engine/battleScene.ts`) | Species gate |
|---|---|---|---|---|
| EMBER | `SceneOnEmberConfig:1696` (`EmberGeometry`, `SceneOnFaintAttackFieldProfile`, `animationAgeOffset?`) | `tools/compare/fixtures/ember-{player-onix-opponent-murkrow,opponent-onix-player-murkrow}.json`; `tools/compare/emberPortable.ts:21` | `:50594-50708` | `:50599-50610` ONIX->MURKROW only, else throw |
| DRAGON_BREATH | `SceneOnDragonBreathConfig:1369` | `dragon-breath-*-onix-*-murkrow.json`; `dragonBreathPortable.ts:21` | `:48389-48528` | `:48406-48417` ONIX->MURKROW only |
| DEFENSE_CURL | `SceneOnDefenseCurlConfig:3411` (`DefenseCurlProfile{attackerPicYOffset, attackerSubpriority}`) | `defense-curl-evidence.json` + dense gz; `defenseCurlFramebuffer.ts:125` `defenseCurlConfigFor` | `:16576-16706` | none: art-table lookup, throws `:16599/:16602` if art missing |
| INGRAIN | `SceneOnIngrainConfig:3424` (`IngrainProfile{attackerSubpriority}`) | `ingrain-evidence.json`; `ingrainFramebuffer.ts:68` | `:15839-15963` | none; art throws `:15857/:15858` |
| MEAN_LOOK | `SceneOnMeanLookConfig:3433` (`MeanLookProfile{targetSubpriority}`) | `mean-look-evidence.json`; `meanLookFramebuffer.ts:100` | `:16341-16467` | none; art throws `:16360/:16363` |
| SMELLING_SALT | `SceneOnSmellingSaltConfig:2160` (5 numbers) | `smelling-salt-evidence.json`; `smellingSaltFramebuffer.ts:143` | `:41865-42035` | none; art throws `:41890/:41893` |
| BIND | `SceneOnBindConfig:1424` | `bind-*-onix-*-murkrow.json`; `bindPortable.ts:20` | `:30403-30507` | `:30409-30420` ONIX->MURKROW only |
| WRAP | `SceneOnWrapConfig:1432` | `wrap-*-tentacool-*-onix.json` | `:30507-30605` | `:30514-30525` TENTACOOL->ONIX only |

None of the eight branches references `liveField` yet; every branch has its own hard-coded healthbox/message block that needs `if (!liveField)` (recipe step 3):
Ember `:50658-50699`, Dragon Breath `:48473-48519`, Defense Curl `:16678-16697`, Ingrain `:15937-15954`, Mean Look `:16441-16458`, Smelling Salt `:42003-42026`,
Bind `:30452-30498`, Wrap `:30565-30596`. Ember/Dragon Breath/Bind/Wrap also hard-code the species art (`onixBackSprite`, ...) -> `liveSceneOnBattlerArt(view.attacker|target)`.

## 2. Per-move measurements

Pins: `tools/integration/fixtures/prep4-pins.json` (field, accepted, derived, match, resolved, note). 176 pins, 16 differ, **0 unresolved**; every difference is below.

### 2.1 EMBER (Onix <-> Murkrow) - NEEDS-ORDER
* **Config** (accepted == derived, both orientations): `attackerCenter` (72,88)/(176,42) = attacker pic point; `targetCenter` (176,51)/(72,97) = target pic point (only `.x` feeds the reducer);
  `targetBattlePosition` (176,40)/(72,80) = target battlePositionCenter; `attackerSide`; `targetSubpriority` 40/30 (opponent-target 40, player-target 30); also spriteCorner and animationCenter of both battlers match `liveBattlerAnchors`.
  `fieldProfile` is the FaintAttack shape (HP, status, gender; no max HP). Draft: player 117/117 vs 142/142; opponent 142/142 vs 69/117; genders female/male in both (copied from the accepted fixtures; max HP = set 156 Onix 117 / set 184 Murkrow 142).
* **Order**: `emberSpritesInDrawOrder` (`src/animation/ember.ts:174-200`) sorts by `centerY` then `creationOrder` (spawn index: "earlier-created paints last"), all sprites sharing one subpriority (38/28). `prep4TieScan.mjs`
  over ages 0..62 (x lags 0,1,2): max 3 sprites, **117 equal-key pairs, 90 with overlapping 16x16 cells** (e.g. age 36 (154,64)/(168,64)). That proxy is correct for the accepted staging (second action after a net-zero move) but
  the OAM order is the history-dependent free-slot `sSpriteOrder` (`docs/sprite-order-provider-design.md`, designed not built); `createKnownEntrySpriteAllocatorProvider` gives slots, not that order, so equality on a
  *first* action cannot be shown -> **NEEDS-ORDER**. (Whether flipping the tie changes pixels was not measured.) No `spriteOrderSeed`/`hardwareTieSlotOrder` field exists in this config; the dependence is implicit in the reducer.
* **Activation**: player 384 / opponent 438 vs accepted window 388..450 / 442..504 (`firstFramePresentationAge` 0): row **-4** both -> **not in the shadow map**. Duration = 63 rows (script active to 453/507: the 3 trailing rows are outside the accepted window).
* **Ad-hoc enemy shadow draw**: none in the branch (nothing to retire).

### 2.2 DRAGON_BREATH (Onix <-> Murkrow) - READY
* **Config** (all exact): `attackerCenter`, `targetCenter` = pic points; `attackerSide`; `targetSubpriority` 40/30; script constants `duration 20, subpriorityOffset 2, spawnCount 11, spawnInterval 4`
  (`DragonBreathFireGeometry`, `dragonBreath.ts`; `CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY` already holds them). Same FaintAttack-shape profile as Ember (117/117 vs 142/142; 142/142 vs 69/117).
* **Order**: `dragonBreath.ts:224-231` sorts by Y then spawn index, but `prep4TieScan.mjs` finds **0 equal-key pairs** (max 6 sprites) over ages -2..82 -> key-determined; no order input.
* **Activation**: 391 / 445 vs accepted window 395..479 / 449..533 with `appStage.firstFramePresentationAge = -2`: row `391-395-2 = -6` / `445-449-2 = -6` -> not in map.
  The accepted run starts the window at presentation age -2; **no accepted live fixture has a negative age offset** (all `ageOffset` are 0/1). The draft therefore starts the window at the first age >= 0
  (`startFrame` 397 / 451, `ageOffset 0`, duration **83**; `draft.acceptedWindow` keeps 395/449 with -2). The 2 trimmed rows (ages -2,-1, pre-embers) are not compared; if the integrator wants them, `ageOffset -2` needs the harness/live clock to accept negative ages (`liveAdapterFramebuffer.ts:142`). Script runs 4 frames past the player window (483) and still ran at capture end in the opponent scenario (window end 533 = capture end, tail unmeasured).
* **Ad-hoc shadow**: none.

### 2.3 DEFENSE_CURL (Phanpy -> Onix)
* `attackerPicYOffset` = attacker `coords.yOffset` (Phanpy back 14 / front 16): exact. `attackerSubpriority` 30/40 exact. Both battlers' `spriteCorner`, `battlePositionCenter`, target `animationCenter` match.
* **The one real mismatch**: accepted attacker `animationCenter` (72,86)/(176,46) vs live default (pic point) (72,102)/(176,56). The reducer's orb origin is that field (`sceneOnDefenseCurlView` `sceneOnPresentation.ts:10267-10282`).
  Source: `Move_DEFENSE_CURL` argv `(0,6,0,1)` -> `AnimSpriteOnMonPos` with `respectMonPicOffsets = FALSE` (`reference/pokeemerald/src/battle_anim_mons.c:1515-1528`) = **attacker battlePositionCenter + (0,6)**
  (72+0,80+6 / 176,40+6): exact in both orientations. The config case must therefore override the attacker's `animationCenter`. (Target `animationCenter` in the accepted builder is the same literal; unconsumed.)
* **Order**: orb slot 3 is a constant inside the reducer state, never read by the renderer; one orb with subpriority attackerSubpriority-2 -> none.
* **Activation** 214 / 215 = window start -> row 0 (both). Duration 100. `fieldProfile`: player 172/183 vs 117/117; opponent 117/117 vs 171/183; male/male.
* Ad-hoc shadow: none.

### 2.4 INGRAIN (accepted visual attacker CACTURNE -> Onix)
* The scenario names Lileep, but the accepted config's visual species is **CACTURNE** (set-140 stage overrides party data after buffers exist, `ingrainFramebuffer.ts:68-77`). Pins with CACTURNE are exact; with LILEEP the attacker `spriteCorner`
  differs ((40,55) vs (40,57) player; (144,8) vs (144,15) opponent) -> the draft fixture uses CACTURNE; a Lileep rental renders different art that this evidence does not pin.
* `attackerSubpriority` 30/40 exact; the reducer reads the attacker `battlePositionCenter` (exact), not `animationCenter` (accepted values equal the RAM sprite centre: player attacker (72,87) vs pic (72,95), opponent target (72,80) vs pic (72,88); the other two match; the differences are **unconsumed**, `sceneOnPresentation.ts:10285-10300`).
* **Order**: the renderer hard-codes slots (`:15873-15930`): battlers 6/8, roots `[3,4,5,7]`, orbs `9+index`. The known-entry `firstMove` host (`knownEntrySpriteAllocator.ts`, route `battle-lab-ordinary-singles`) has free slots `3,4,5,7,9,10,11,12,...` and battlers at 6/8:
  roots take the first four free slots, orbs (created 85/99/113, lifetimes 30/30/18 -> never reused) 9,10,11 -> **equal on a first action**. Moot anyway: `prep4OrderScan2.mjs` finds 522 equal-subpriority pairs per side but **0 overlapping**. (Ingrain is not in `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`; the host is invalidated after it as for every unlisted move.)
* **Activation** 205 / 293 = window start -> row 0. Duration 164. `fieldProfile` (accepted): player 169/177 vs 142/142; opponent 142/142 vs 160/177; male/male.
* Ad-hoc shadow: none.

### 2.5 MEAN_LOOK (Murkrow -> Onix)
* `animationProfile.targetSubpriority` is filled from the **attacker** sprite subpriority (`meanLookFramebuffer.ts:124`, comment "Mean Look creates its eye from ANIM_ATTACKER"): 30 player / 40 opponent, exact. The reducer reads the **target** `animationCenter` (exact pic point (176,42)/(72,88)); the attacker one is unconsumed (accepted (72,88)/(176,42) = Onix literals vs derived Murkrow pic (72,97)/(176,51)).
* **Order**: one eye sprite (slot 4 inside the state, unused by the renderer) -> none. **Activation** 71 / 75 = window start -> row 0. Duration 171. `fieldProfile`: player 156/156 vs 142/142; opponent 142/142 vs 156/156; male/male. Ad-hoc shadow: none.

### 2.6 SMELLING_SALT (Granbull -> Onix)
* Profile (opponent target Onix): `targetLeft 148 = pic.x - width/2 (176-28)`, `targetRight 204 = pic.x + width/2`, `targetTop 10 = pic.y - height/2 (42-32)`, `targetPictureY 42 = pic.y`, `targetVerticalSpan 60 = pictureHeight`; player target: 44/100/56/88/64. All 10 pins exact (widths/heights from the art view `coords`, pictureHeight from `liveBattlerAnchors`).
* The reducer reads only `targetVerticalSpan`; the renderer reads attacker `battlePositionCenter` and target `animationCenter.x` (exact); the attacker `animationCenter` differs ((72,85) vs (72,93)) but is **unconsumed**.
* **Order**: two clapping hands share a subpriority; `prep4OrderScan2.mjs`: 59 two-hand rows, minimum centre distance 48 >= 32 (cell width) -> never overlap -> moot.
* **Activation** 218 / 218 = window start -> row 0. Duration 121. `fieldProfile`: player 190/197 (female) vs 142/142 (male); opponent: 142/142 male vs 190/197 female.
* **Ad-hoc enemy-shadow draw to retire**: `battleScene.ts:41910-41916` (`!playerAttacker && saltState.age === 0` -> `drawSourceOpponentEnemyShadow`).

### 2.7 S2: BIND (Onix <-> Murkrow), WRAP (Tentacool <-> Onix)
* Configs are script literals (`BIND_ANIMATION_PROFILE`, Wrap ellipse/squeeze) plus geometry; pins are exact except Wrap's unconsumed `animationCenter` (accepted RAM centre (72,90)/(72,80) vs derived pic (72,98)/(72,88); `wrapAnimationAtAge` takes no geometry).
  `spriteCorner` exact. Neither branch has a species-independent art path (gates above) and neither reads sprite order.
* **BIND activation 384 / 438 vs window 382..426 / 436..480 -> shadow row `+2`** (not 0): `LIVE_MOVE_OPPONENT_SHADOW_ROW` would need `20: 2` (the table is `Record<number, number>`, every current value is 0). Duration 45. HP from the compare fixtures: Onix 117 vs Murkrow 142 / Onix 69 vs 142.
* **WRAP** 222 / 78 = window start -> row 0, duration 38; HP player Tentacool 117/136 vs Onix 110; opponent Tentacool 136 vs Onix 110 (the Tentacool is Factory set 124).
* No ad-hoc shadow draws in either branch.

## 3. Ordinary generated-rental routes

`prep4-routes.json` (party member 0 = `rentals[0]` of `generateInitialFactoryRentals`, `rentsCount 0`, `playerTrainerId 416049562`, seeds ascending, streak 0..42 step 7). "acc" = first route whose species is the accepted pixel species.

| Move | First route (seed / streak / slot) | Rental | Accepted-species route | slot-0 hits (of 10000x7 draws) |
|---|---|---|---|---|
| EMBER | 4 / 7 / 0 | Magcargo set 194 (moves 157,52,151,201) | none (carriers: Castform, Combusken, Houndour, Magcargo, Torkoal; no Onix) | 721 |
| DRAGON_BREATH | 4 / 21 / 0 | Kingdra set 461 | **acc 136 / 0 / 0**: Onix set 156 (moves 157,20,225,201: also Bind) | 1140 |
| DEFENSE_CURL | 1 / 7 / 0 | Dunsparce set 200 | **acc 85 / 0 / 0**: Phanpy set 120 (205,111,317,201) | 827 |
| INGRAIN | 26 / 0 / 0 | Lileep set 140 (246,51,275,109) | none for Cacturne (carriers: Cradily, Lileep, Sunflora, Victreebel, Vileplume) | 523 |
| MEAN_LOOK | 25 / 14 / 0 | Murkrow set 289 (195,212,104,86) | **same** | 305 |
| SMELLING_SALT | 21 / 21 / 0 | Granbull set 376 (25,265,86,46) | **same** (only carrier species) | 116 |
| BIND (S2) | 29 / 7 / 0 | Tangela set 216 | **acc 136 / 0 / 0**: Onix set 156 | 212 |
| WRAP (S2) | 31 / 0 / 0 | Weepinbell set 165 | **acc 65 / 0 / 0**: Tentacool set 124 (61,51,112,35) | 528 |

Caveat: the accepted pixel evidence only covers the staged species pairs; any other rental species is generic art through the same branch and is **not pixel-pinned** (use the alt-species probe route for that). Ember/Dragon Breath/Bind/Wrap
additionally need their species gates relaxed (`liveField || ...`) for any route; Ember has no accepted-species carrier at all.

## 4. Drafted fixtures

`tools/integration/fixtures/prep4-<move>-{player,opponent}.json` (`<side>` = attacker side), generated by `tools/integration/prep4Draft.py` (a copy of `prep2Draft.py`; same `Fixture` shape of `liveAdapterFramebuffer.ts:25-48` plus `orientation` and an ignored `draft` block:
`activationFrame`, `shadowRow`, `shadowRowInMap`, `expectedDuration`, `acceptedWindow`, derived config values, order verdict). Probes: Ember/Dragon Breath/Bind `tools/probe/run-battle-lab-rgb.py`; Defense Curl/Ingrain/Mean Look/Smelling Salt/Wrap their own dense probes (all take `<scenario> <output> <rgb-dir>`).
Hard requirement of the harness: `expectedDuration === rows + ageOffset`; drafts satisfy it (Ember 63, DB 83, DC 100, Ingrain 164, Mean Look 171, Smelling Salt 121, Bind 45, Wrap 38).

## 5. Open questions
1. **Ember tie order**: needs the free-slot order provider (or a first-action scenario probe of Ember to show the proxy still holds). Everything else about Ember is derivable.
2. **Dragon Breath age -2**: trim (draft) vs support negative ages in the live clock; window tail beyond 533 (opponent) unmeasured.
3. **Defense Curl** needs a per-move `animationCenter` override (battlePositionCenter + (0,6)); `liveMoveAnimationPresentation` (`liveMoveAnimation.ts:330-343`) defaults to the pic point.
4. **Bind** shadow row 2 (first non-zero map value). Check the hook (`liveMoveOpponentShadowRow`) copes with a non-zero row.
5. Species pixel coverage (Ingrain Cacturne vs Lileep; every rental species other than the staged pairs).
6. Triage line cites (`docs/h-buffer-triage.md`, readiness JSON) are stale for the config types (s1).
