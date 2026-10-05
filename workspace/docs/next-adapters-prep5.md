# Next adapters prep 5: measured verification of ten prep2 READY/SMALL moves (S10A, side lane)

Evidence/design only; **new files only**, no tracked file edited. Same method as `docs/h-buffer-s1-prep.md` (copied/adapted scripts, `prep5*`). Not run: `npm test`, build, typecheck,
any harness or shared oracle (fixtures are unverified until an adapter exists). Activation frames are ROM frames from `tools/integration/issue142ActivationProbe.py`
(fresh direct mGBA, Scene ON, one run per accepted scenario, 20 scenarios, `tools/integration/prep5Activation.sh`). Source = `reference/pokeemerald`; production paths repo-relative.

| File (all new) | What |
|---|---|
| `tools/integration/prep5Pins.mjs` -> `fixtures/prep5-pins.json` | 132 field pins (accepted value vs production-derived; both orientations): `liveBattlerAnchors` + `createBattleCommandFieldArtView(field)[side].coords` via the existing `prep4Production.mjs` `derive()` (no `liveBattlerCoordAttrs` needed) |
| `tools/integration/prep5Views.mjs`, `prep5TieScan.mjs` -> `fixtures/prep5-tie-scan.json` | accepted-config presentation stages + generic equal-key (subpriority, y) overlap scan |
| `tools/integration/prep5HealBellOrder.mjs` -> `fixtures/prep5-heal-bell-order.json`; `prep5BellyDrumOrder.mjs` -> `fixtures/prep5-belly-drum-order.json` | persistent-OAM-order sensitivity (copies of the two painter-order functions with the initial `sSpriteOrder` permutation as a parameter) |
| `tools/integration/prep5Activation.sh` -> `fixtures/prep5-activation/mechanic-*.json` | raw activation-probe receipts (20 scenarios; probe segfaults at interpreter exit after writing, harmless) |
| `tools/integration/prep5Draft.py` -> `fixtures/prep5-<move>-{player,opponent}.json` (20) + `fixtures/prep5-summary.json` | drafted live fixtures (`schema prep5-adapter-draft/v1`, shape of `prep4-*.json`; `draft` block ignored by the loader) |
| `tools/integration/prep5Routes.ts` -> `fixtures/prep5-routes.json` (streak 0..42) and `prep5-routes-streak126.json` (`STREAK_MAX=126`, Mist Ball) | generated-rental routes |

## 0. Verdicts

Pins: 132 total, 15 differ, **0 unresolved**: every difference is an `animationCenter` (or, once, Heal Bell's target `spriteCorner`) that no consumer reads (s2). Every consumed field
(`attackerTop`, `attackerHead`, `targetProfile`, `attackerNoteOrigin`, attacker/target `spriteCorner`, `battlePositionCenter`, consumed `animationCenter`) is **exact in both orientations**.
Row = `activation - windowStart + ageOffset` (ageOffset 0 for all ten); `+0` rows are in `LIVE_MOVE_OPPONENT_SHADOW_ROW` terms "add id".

| Move (id) | Config fields vs production | Order dependence | act / window / row / duration | Verdict |
|---|---|---|---|---|
| HEAL_BELL (215) | exact except opponent-front **target** `spriteCorner` (40,53 vs 40,48) + `animationCenter` (72,93 vs 88): unread (renderer draws player Onix at constant `ONIX_MATERIALIZE_CORNER` (40,48) = derived; reducer reads attacker only) | **YES**: notes replay a persistent `sSpriteOrder` from an assumed `[4,5,7,9,10,11]`; other permutations change the paint order on 5 ages (first age 34), overlapping notes | 209/209..469/0/261; 210/210..470/0/261 | **NEEDS-ORDER** (+ retire ad-hoc shadow) |
| MIST_BALL (296) | all 12 exact (incl. both `animationCenter`s the reducer reads) | none (one projectile) | 75/75..287/0/213; 79/79..291/0/213 | **READY** (+ retire ad-hoc shadow) |
| AROMATHERAPY (312) | exact except opponent-front target `animationCenter` (72,80 vs 88): unread | none (0 equal-key pairs) | 75/75..474/0/**400**; 79/79..474/0/**396** | **READY** (duration differs by side, open q.1) |
| PERISH_SONG (195) | exact except player-back attacker / opponent-front target `animationCenter` (72,89 vs 97; 72,80 vs 88): unread (reducer takes `side` only). `playerPerishSongTurns/opponentPerishSongTurns` = constant 3/3 | **YES (weak-moderate)**: 16 notes tie-break on reducer `oamSlot`; 6 equal-`centerY` overlapping notes with different tile/matrix per orientation (all at centerY -9) | 71/71..329/0/259; 75/75..333/0/259 | **NEEDS-ORDER** |
| DRAGON_RAGE (82) | all 12 exact | **YES (weak)**: 28 equal-y plume pairs/orientation (spawns 0/4, 2/6), resolved by `spawnIndex`; 32x32 plumes at dx 30 overlap 2 px, pixel effect unmeasured | 82/89..238/**-7**/150; 86/93..242/**-7**/150; script active to 259/263 | **NEEDS-ORDER (weak)**; row not in map; 21-frame tail |
| FOLLOW_ME (266) | `attackerTop` exact (72,72)/(176,25)... ; unread `animationCenter` mismatches (player attacker 72,88 vs 96; opponent-front target 72,80 vs 88) | none (one finger) | 69/69..253/0/185; 73/73..257/0/185 | **READY** |
| TAUNT (269) | `attackerHead` exact (104,85)/(144,39); consumed target `animationCenter` exact; unread player-attacker `animationCenter` (72,89 vs 97) | none (bubble offset 11 vs finger 12 -> distinct subpriority; scan hits are same-position pairs with different keys) | 66/76..200/**-10**/125; 70/80..204/**-10**/125 | **READY** (row not in map; window starts 10 frames after activation, open q.2) |
| METRONOME (118) | `attackerHead` exact (112,87)/(140,37); unread `animationCenter`s (72,91 vs 99; 72,80 vs 88) | none (bubble 11 / finger 12 subpriority) | 245/245..371/0/127; 244/244..370/0/127 | **READY** (body only; called move = second request, s3) |
| LEAF_BLADE (348) | `targetProfile` exact (176,42)/56x64/sub 40 and (72,88)/56x64/sub 30; unread `animationCenter`s (72,81 vs 89; 72,80 vs 88) | **YES**: blade (slot 3) vs trails at same (x,y,subpriority) with different tile cells on 32 (player) / 26 (opponent) ages; renderer replays persistent order from assumed `[3, ...TRAIL_OAM_SLOTS]` | 76/76..299/0/224; 80/80..303/0/224 | **NEEDS-ORDER** |
| BELLY_DRUM (187) | `attackerNoteOrigin` exact (72,107)/(176,56) = attacker pic + (0,8); accepted `animationCenter` literals = note origin / sprite centre: unread | none: note painter order identical for 4 initial permutations of `[4,5,7,9,10]` (0 ages differ) | 231/231..340/0/110; 211/211..320/0/110 | **READY** |

**Ready now (6): MIST_BALL, AROMATHERAPY, FOLLOW_ME, TAUNT, METRONOME, BELLY_DRUM. Need the order provider (4): HEAL_BELL, PERISH_SONG, LEAF_BLADE, DRAGON_RAGE (weak).** "NEEDS-ORDER"
means the accepted reducers already depend on a history-dependent tie (`docs/sprite-order-provider-design.md`: designed, not built); whether flipping the tie changes the final pixels was **not** measured
for Perish Song, Dragon Rage and Leaf Blade (it was shown to change the *paint order of overlapping notes* for Heal Bell).

## 1. Accepted sources (current line numbers, `src/engine/battleScene.ts`)

All ten branches have no `liveField` yet; each has a species-pair gate that throws, hard-coded art, and a hard-coded `drawSendOutHealthbox` block (recipe step 3 in `docs/next-adapters-prep2.md` s0).
Precedent for the `liveField` pattern in the same file: Focus Energy (`:22825-22920`, `liveField && view.age === 0` shadow at `:22859-22862`).

| Move | Branch | Gate (species) | HUD block | Accepted fixture |
|---|---|---|---|---|
| HEAL_BELL | `:34340` | `:34350-34358` Chimecho/Onix | `:34490` | `tools/compare/healBellFramebuffer.ts:20-52` literals + `heal-bell-evidence.json` (scenario windows 209..469 / 210..470) |
| MIST_BALL | `:17555` | `:17559-17566` Latias/Registeel | `:17627` | `mist-ball-{player-latias-opponent-registeel,opponent-latias-player-registeel}.json` |
| AROMATHERAPY | `:45179` | `:45188-45197` Vileplume/Onix | `:45376` | `aromatherapy-*-vileplume-*-onix.json` |
| PERISH_SONG | `:34524` | `:34536-34545` Murkrow/Onix; turns guard `:34551-34556` | `:34639` | `perish-song-*-murkrow-*-onix.json` |
| DRAGON_RAGE | `:50708` | `:50740-50749` Charmeleon/Onix | `:50817` | `dragon-rage-*-charmeleon-*-onix.json` (scenarios `mechanic-dragon-rage-{charmeleon-onix,onix-charmeleon}`) |
| FOLLOW_ME | `:33967` | `:33975-33984` Togetic/Onix | `:34046` | `follow-me-*-togetic-*-onix.json` |
| TAUNT | `:40370` | `:40376-40385` Murkrow/Shuckle | `:40463` | `taunt-*-murkrow-*-shuckle.json` |
| METRONOME | `:33858` | `:33866-33875` Chansey/Onix | `:33935` | `metronome-*-chansey-*-onix.json` |
| LEAF_BLADE | `:22596` | `:22612-22621` Sceptile/Onix | `:22757` | `leaf-blade-*-sceptile-*-onix.json` |
| BELLY_DRUM | `:42928` | none: art lookup throws `:42939-42948` | `:43030` | `belly-drum-evidence.json` + `bellyDrumFramebuffer.ts:105-139` (HP from dense frame 0) |

## 2. Per-move measurements

### 2.1 Config fields (derivation rules, all pinned in `prep5-pins.json`)
* **Geometry** (every move): `spriteCorner` = `liveBattlerAnchors.spriteCenter - 32`; `battlePositionCenter` = (72,80)/(176,40); `animationCenter` = pic point `picOffsetPoint` (x, `min(104, y+32+8 player)`).
* **FOLLOW_ME `attackerTop`** = `(battlePositionCenter.x, max(10, pic.y - coords.height/2))` (`battle_anim_effects_1.c` thought-bubble/finger top rule): Togetic player back h 48 -> (72, 96-24=72); opponent front -> (176, 49-24=25). Exact.
* **TAUNT / METRONOME `attackerHead`** = `SetSpriteNextToMonHead` (`battle_anim_effects_1.c:5480-5488`): x = pic.x + width/2 + 8 (player) / pic.x - width/2 - 8 (opponent), y = pic.y - trunc(height/4). Taunt Murkrow player (104,85) / opponent (144,39); Metronome Chansey player (112,87) / opponent (140,37). Exact (widths from the art view `coords`).
* **LEAF_BLADE `targetProfile`** = `{pictureOffset: target pic, width, height, subpriority 30|40}`: Onix opponent {176,42} 56x64 40 / player {72,88} 56x64 30. Exact.
* **BELLY_DRUM `attackerNoteOrigin`** = attacker pic + (0,8): (72,99+8=107) / (176,48+8=56). Exact. `fieldProfile` = dense frame-0 *displayed* HP: `maxattackhalvehp` (`battle_scripts_1.s:1780`) only sets `gBattleMoveDamage`; the HP drop is the later `healthbarupdate/datahpupdate`, so the HP at the MOVE_ANIMATION event is the pre-move HP.
* **HEAL_BELL/AROMATHERAPY** reducers read the attacker `animationCenter` + `battlePositionCenter` (both exact: Chimecho (72,95)/(176,34), pic-point convention); **MIST_BALL** reads both battlers' `animationCenter` (exact); **TAUNT** reads the target's (exact).
* **Unread mismatches**: Aromatherapy/Perish Song/Follow Me/Metronome/Leaf Blade/Belly Drum/Heal Bell mismatches are fields no consumer reads (reducers: `sceneOn*View` `sceneOnPresentation.ts:7557,7637,9543,9773,10060,10079,10632,12187`; renderer branches read only `spriteCorner`, `battlePositionCenter` and the shadow's `animationCenter.x`). Accepted literals there are RAM sprite centres or the Onix literals of the builders, not the pic point.
* **Heal Bell opponent-front target**: accepted `spriteCorner` (40,53) comes from the evidence manifest; the dense row shows the player Onix at sprite centre (72,80) = corner (40,48) = derived = the renderer's constant `ONIX_MATERIALIZE_CORNER` (`battleScene.ts:5996`). Live must draw it from `liveSceneOnBattlerArt(view.target)` at the derived corner.
* **Perish Song profile**: `playerPerishSongTurns/opponentPerishSongTurns` must be the literal `3` (type `sceneOnPresentation.ts:3519-3523`; renderer throws otherwise, `battleScene.ts:34551-34556`).
* **Genders / HP** in the drafts are the accepted values (Mist Ball Registeel and Perish Song profiles copied from the fixtures); rental HP differs (s4).

### 2.2 Perish Song: is the rules state at the event? **No.**
`trysetperishsong` runs *before* `attackanimation` (`data/battle_scripts_1.s:1567-1572`) and the production handler sets `status3 |= PERISH_SONG`, `perishSongTimer = 3`, `perishSongTimerStartValue = 3` per affected battler
(`src/engine/battleScriptTrysetperishsongOpcode.ts:52-66`), so the rules state (`battleScriptRulesContext.ts:336-337`) *does* hold 3/3 when `attackanimation` runs. But the MOVE_ANIMATION event is built at
`src/engine/battleScriptHitChainOpcode.ts:2276-2295` with only `[move, animTurn, power, damage, friendship, multihit]`, and `battleResolutionPresentation.ts:3350-3358` turns that into a `move-animation` command carrying only the
`BattleMoveAnimationRequest` (`battleMoveAnimation.ts:2-11`); the displayed field has no perish field (no match in `battleCommandField*.ts`/`battleResolutionPresentation.ts`). So the live adapter cannot read it and must supply the constant 3/3 literals.
That equals the rules state whenever neither battler already has `PERISH_SONG` status/Soundproof (those keep their old timer or are unaffected: `:49-57`); a partially-affected cast (one side already counting down, or Soundproof) would show a different count that the renderer does not model (it throws on non-3).

### 2.3 Order scans (`prep5-tie-scan.json`, `prep5-heal-bell-order.json`, `prep5-belly-drum-order.json`)
* Scan = per presentation age (lags 0,1) every sprite-like entry of the view, key (subpriority, y); equal keys with |dx|<16/32 counted. The generic scan over-reports where the view carries no `subpriority` (Taunt/Metronome bubble vs finger: createsprite subpriority offsets 11 vs 12 in `Move_TAUNT` `battle_anim_scripts.s:3605+` / `Move_METRONOME:2813+`, so hardware keys differ -> READY).
* HEAL_BELL: `healBellNotesInPainterOrder` (`src/animation/healBell.ts:372-407`) replays `sortGbaSpriteOrder` from a hard-coded `[4,5,7,9,10,11]`; initial orders descending / rotated change the order on ages including 34 (`[7,4,9,5]` -> `[4,7,5,9]`), ascending/interleaved do not. Same in both orientations.
* PERISH_SONG: notes sorted by `centerY` then `right.oamSlot - left.oamSlot` (`battleScene.ts` perish branch); slots `NOTE_SLOTS = [3,4,5,7,9..20]` (`perishSong.ts:12-13`) = the known-entry first-free list; hardware order is `sSpriteOrder` history, not slot order.
* LEAF_BLADE: `leafBladeDisplayedOamOrderAtAge` (`src/animation/leafBlade.ts:236-275`) replays from `[3, ...TRAIL_OAM_SLOTS]`; 69/63 equal-key overlapping blade-trail and trail-trail pairs, 32/26 with different tile cells.
* DRAGON_RAGE: `orderFirePlumesForDraw` (`dragonRage.ts:388-390`) = Y then spawn index (RAM-confirmed rule, comment `:360-387`).
* BELLY_DRUM: `bellyDrumNotesBackToFrontAtAge` (`bellyDrum.ts:185-215`) with four different initial permutations gives identical orders on all 112 ages (both origins) -> independent.
* No config/view carries a `spriteOrderSeed` or `hardwareTieSlotOrder` field (searched view keys for `spriteOrder|hardwareTie|creationOrder|spawnIndex`: only `spawnIndex` on Leaf Blade/Dragon Rage/Aromatherapy sprites).

### 2.4 Activation, window, shadow, duration, tail (`prep5-summary.json`, `prep5-activation/`)
All activations equal the prep2 table (re-measured, 0 differences). Script end = first inactive frame.
* Window start = activation (row 0, in map) for Heal Bell, Mist Ball, Aromatherapy, Perish Song, Follow Me, Metronome, Leaf Blade, Belly Drum; script end == window end (window's last row is the first inactive cleanup frame) for all of them.
* **Dragon Rage** window starts 7 frames after activation (row -7, not in map: 82 vs 89 / 86 vs 93) and ends 21 frames before the script end (259/263): the window tail is uncovered (same gap class as Dizzy/Scary Face).
* **Taunt** window starts 10 frames after activation (66 vs 76 / 70 vs 80): row -10, not in map; script end == window end (200/204).
* #142 map additions needed (`LIVE_MOVE_OPPONENT_SHADOW_ROW`, row 0): 215, 296, 312, 195, 266, 118, 348, 187. Not added: 82, 269.
* Ad-hoc age-0 enemy-shadow draws to retire: **Heal Bell** `battleScene.ts:34419-34430` (`opponentToPlayer && healState.age === 0`; reads attacker `animationCenter.x`, `battlePositionCenter.y + 29`), **Mist Ball** `:17589-17594` (`opponentToPlayer && view.age === 0`; `animationCenter.x - 16`, `battlePositionCenter.y + 25`). None in the other eight branches.
* `animationCenter` reads: Heal Bell reducer attacker (`:34463` painter order + `sceneOnHealBellView`), shadow `:34420`; Mist Ball reducer both + shadow `:17592`; Aromatherapy reducer attacker; Taunt reducer target; the rest none. All consumed values are pic-point convention (exact vs derived); no sprite-centre convention is consumed.
* Durations (rows = `end - start + 1`, harness `rows === duration - ageOffset`): Heal Bell 261; Mist Ball 213; Aromatherapy **400 player / 396 opponent**; Perish Song 259; Dragon Rage 150; Follow Me 185; Taunt 125; Metronome 127; Leaf Blade 224; Belly Drum 110.

### 2.5 Metronome: second MOVE_ANIMATION request
Script (`battle_scripts_1.s:1147-1155`): `attackanimation` (Metronome body, `moveId 118`, `rulesContext.currentMove` = 118) -> `waitanimation` -> `setbyte sB_ANIM_TURN 0; sB_ANIM_TARGETS_HIT 0` -> `metronome`. Production `createMetronomeHandler`
(`src/engine/battleScriptMetronomeOpcode.ts:79-131`) draws RNG until a legal move, sets `currentMove = selected`, clears ATTACKSTRING_PRINTED and **jumps** to the selected effect's script entry (`:113-115`). That script's own `attackanimation`
runs the **same** handler (`src/engine/battleScriptHitChainOpcode.ts:2229` `move = rulesContext.currentMove`, event at `:2276-2295`), so the second `MOVE_ANIMATION` is an ordinary request with `moveId = selected`, attacker/target from the (retargeted) selector roles
(`resolveDynamicMoveTarget`), `turn` 0. In the accepted scenarios the called move's interval starts at 414 (player, move 66) / 410 (opponent, move 240) after the body ends at 371/370 (`prep5-activation/`), i.e. after a "used X!" message. The Metronome adapter covers only the body; the called move animates through its own adapter or the generic fallback.

## 3. Ordinary generated-rental routes (`prep5Routes.ts`; party member 0 = `rentals[0]`, `rentsCount 0`, `playerTrainerId 416049562`, seeds ascending, streak 0..42 step 7)

| Move | Route (seed / streak / slot) | Rental (set) | Accepted-species route | Other carrier species (slot 0 or any slot) | slot-0 hits |
|---|---|---|---|---|---|
| HEAL_BELL | first 0 / 7 / 0 = Delcatty 162 (moves 290,185,104,215) | | **84 / 7 / 0 Chimecho set 209** | Chimecho, Delcatty | 394 |
| MIST_BALL | **90 / 49 / 0** (needs `STREAK_MAX=126`; none at streak <= 42) | Latias set 843 (296,337,213,86), HP 187, female | same | Latias only (sets 798, 843) | 600 (of 10000 x 19 streaks) |
| AROMATHERAPY | 34 / 21 / 0 | Vileplume set 394 (188,80,236,312) = accepted set | same | Vileplume only | 94 |
| PERISH_SONG | 25 / 14 / 0 | Murkrow set 289 (195,212,104,86) | same | Altaria, Jynx, Misdreavus, Murkrow | 414 |
| DRAGON_RAGE | 37 / 14 / 0 | Charmeleon set 280 (53,163,246,82) | same | Charmeleon only | 100 |
| FOLLOW_ME | 35 / 0 / 0 | Togetic set 183 (332,345,273,266) | same | Clefable, Furret, Togetic | 735 |
| TAUNT | 25 / 7 / 0 | Murkrow set 184 (185,19,259,269) = accepted set | same | Mightyena, Murkrow | 303 |
| METRONOME | 198 / 7 / 0 | Chansey set 227 (118,287,111,107), HP 313 | same | Chansey, Clefable | 208 |
| LEAF_BLADE | 23 / 21 / 0 | Sceptile set 453 (348,73,332,197), HP 136 | same | Sceptile only | 424 |
| BELLY_DRUM | 18 / 14 / 0 | Poliwrath set 367 (280,95,156,187) = accepted set | same | Poliwrath only | 97 |

Caveat (as in prep4): pixel evidence covers only the staged species pairs; other carriers (Delcatty, Altaria, Jynx, Misdreavus, Mightyena, Clefable, Furret) are generic art through the same branch and not pixel-pinned. Rental HP/gender differ from the accepted fixtures (hp fraction only affects the HUD).

## 4. Drafted fixtures
`tools/integration/fixtures/prep5-<move>-{player,opponent}.json` (`<side>` = attacker side), generated by `prep5Draft.py`. Same `Fixture` shape as the prep4 drafts plus `draft` {`activationFrame`, `scriptEndFirstInactive`, `shadowRow`, `shadowRowInMap`,
`expectedDuration`, `acceptedWindow`, `derivedAttacker` (pic-point `animationCenter`, `battlePositionCenter`), the move's derived config (`attackerTop` / `attackerHead` / `targetProfile` / `attackerNoteOrigin`), `order` verdict, `adhocShadowDraw`}; Perish Song adds `fieldProfileAdd {player/opponentPerishSongTurns: 3}`.
`denseWindow` = the accepted window with `ageOffset 0` (all ten accepted `appStage` ages are 0); `expectedDuration === rows`.

## 5. Recommended batch order
1. **MIST_BALL, AROMATHERAPY** (recipe only, no config helper, order-independent, rows 0; retire Mist Ball's ad-hoc shadow; Aromatherapy side-dependent duration).
2. **FOLLOW_ME, METRONOME, TAUNT, BELLY_DRUM** (anchor-derived inputs computed with `createBattleCommandFieldArtView(...).coords`; order-independent; Taunt gets no shadow-map entry). These four need only the `attackerTop`/`attackerHead`/`attackerNoteOrigin` formulas above.
3. **LEAF_BLADE, HEAL_BELL, PERISH_SONG, DRAGON_RAGE** only after the free-slot order provider (or a first-action probe showing the reducers' assumed initial orders hold); Leaf Blade also needs `targetProfile`, Perish Song the 3/3 literals; Dragon Rage additionally a window-tail decision.
Batches 1+2 = 6 moves / 12 fixtures, 5 added shadow rows (312, 296, 266, 118, 187).

## 6. Open questions
1. **Aromatherapy duration is side-dependent**: windows 75..474 (400 rows) vs 79..474 (396 rows) end on the same absolute frame 474 (script end), while the reducer's `frameCount` is 400; the opponent window is 4 rows short of the reducer length. Confirm the opponent evidence ends at the cleanup row (return 400/396 by attacker side like Blizzard) before wiring.
2. **Taunt**: window starts 10 frames after the script activates (row -10); the first ten script frames have no accepted pixels (as Future Sight -5). Check what is on screen on those frames before accepting age 0 = window start.
3. **Dragon Rage tail** (21 uncovered frames) and the 2-px plume overlap tie.
4. **Perish Song 3/3 constants** vs a threaded rules timer (s2.2); partial-effect casts.
5. **Order measurement**: pixel effect of flipping the tie was not measured for Perish Song / Leaf Blade / Dragon Rage; Heal Bell/Belly Drum measured at the painter-order level only.
6. **Heal Bell** opponent-front target: use derived corner (40,48) + live art, not the manifest's (40,53).
7. **Species pixel coverage** for the extra carriers (s3) and Mist Ball's streak >= 49 route.
8. **Metronome**: the called move's second request has no adapter requirement from this step; its pacing between the body end and the called move (371 -> 414) is outside the body window.
9. Drafts unverified (no harness run); `prep5Views.mjs` copies the Heal Bell literals from `healBellFramebuffer.ts:20-52` (not exported).

## 7. Evidence paths
`docs/next-adapters-prep5.md`; `tools/integration/fixtures/prep5-{pins,tie-scan,summary,routes,routes-streak126,heal-bell-order,belly-drum-order}.json`; `tools/integration/fixtures/prep5-activation/mechanic-*.json`;
`tools/integration/fixtures/prep5-*-{player,opponent}.json`; scripts `tools/integration/prep5{Pins,Views,TieScan,HealBellOrder,BellyDrumOrder,Draft}.{mjs,py}`, `prep5Activation.sh`, `prep5Routes.ts`.
