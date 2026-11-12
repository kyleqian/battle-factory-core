# Next adapters prep 12: Random2 draw plans for the C-only moves (S10A, side lane)

Evidence/design only; **new files only** (plus the two census files and a one-line stale-text fix in `remainingAdaptersCensus.mjs`, §3). No `src/`, adapter, presentation-RNG, `PROGRESS.md`/`ISSUES.md` change. All emulator numbers are ROM frames from **direct, independent mGBA runs** of the accepted staged scenarios (`tools/battle-lab/mechanic-*.json`, Scene ON lab; the shared HTTP oracles were never contacted). Every relied-on probe ran **twice from fresh processes**: all per-frame fields identical (`runsSha1` equal); only `finalStateSha1` (EWRAM+IWRAM hash) differs between fresh processes in this probe variant (PAPERCUT below), and nothing here relies on it. Line numbers are at base `c1fe6ced1`; a sibling lane edits `src/engine/*`, re-grep before editing.

## 0. Results

### 0.1 Census (a)

`node tools/integration/remainingAdaptersCensus.mjs --write --doc` against 218 live: **`218+0+58=276`** (live + in-flight + remaining = accepted Factory moves; weights 85.13% / 0% / 14.38%).

- Script change: none needed for the counts (`ORDER_BATCH`/`PREP6_READY` were already empty). Two stale prose fixes: `remainingAdaptersCensusDoc.mjs:40` ("198 live" and the two obsolete in-flight batch lists) and the `staleCodesCorrected` C line in `remainingAdaptersCensus.mjs:369` (it still said "C stays a blocker: not reconstructible"; now records D3 and that three moves draw no Random2). Regenerated `docs/remaining-adapters-census.md` and `fixtures/remaining-adapters-census.json`.
- **Random2 (code C): 52 moves.** BONEMERANG, CURSE, DIG, DIVE, ERUPTION, EXTRASENSORY, FLAIL, FLATTER, FURY CUTTER, HAIL, HIDDEN POWER, HYPER BEAM, HYPER VOICE, ICE BALL, ICE BEAM, LOVELY KISS, LUSTER PURGE, MACH PUNCH, MEGAHORN, MUD-SLAP, NIGHTMARE, OCTAZOOKA, OUTRAGE, OVERHEAT, PSYCH UP, PSYWAVE, PURSUIT, RAIN DANCE, RAPID SPIN, RETURN, REVENGE, SAND-ATTACK, SAND TOMB, SHEER COLD, SHOCK WAVE, SIGNAL BEAM, SILVER WIND, SKILL SWAP, SKY ATTACK, SMOG, SNORE, SPIKES, SPIT UP, SUPERPOWER, WATER PULSE, WATER SPOUT, WILL-O-WISP, plus the five C-only ASTONISH, DOUBLE KICK, METEOR MASH, THRASH, WISH (the 11-move PROVIDER-C group = those five + HIDDEN POWER, HYPER BEAM, ICE BEAM, MUD-SLAP, SAND-ATTACK, WATER SPOUT; FLAIL is C + X-POWER, group MULTI).
- **Non-Random2 remainders: 6.** BATON PASS (X-SWITCH), ENDEAVOR, EXTREMESPEED, FIRE PUNCH, MEMENTO (D-SCAN), SUBSTITUTE (X-SUBST).

### 0.2 Verdict table (player-side accepted scenario, activation = first anim-active frame `A`, `ageOffset = D - A`)

Weights are the census usage share. "Reproduced" = the plan alone (activation `gRng2Value` + draw offsets + lag counts + draw counts) replays to the **accepted pinned inputs exactly** (`tools/integration/prep12Plans.py`, no emulator in that step). "Alt" = the alternate-species scenario (§2) has the identical plan shape (same offsets, lag, call sites) and its replay equals the words observed at its draw frames.

| Move (weight) | Draws per body / draw frames | ageOffsets from `A` | Lag before last draw | Reproduced (pinned source) | Alt shape | Verdict |
|---|---|---|---|---|---|---|
| ICE BEAM (1.98%) | **0** | none | n/a | activation 689912548 == `IceBeamAnimationProfile.animationRngStart` | n/a | **C-LABEL STALE: no Random2 draw.** NEEDS-plan row (task slots / sprite order), see §1.9 |
| MUD-SLAP (0.54%) | 60 / 6 frames x 10 | +9,+13,+17,+21,+25,+29 | 0 | **30/30 (xStep,yStep) exact**, fixture `animationProfile.mud` | yes | READY-WITH-PRESENTATION-RNG for the words; NEEDS dirt sprite slots + known sprite-order residual (§1.7); window offset UNRESOLVED (§1.7) |
| DOUBLE KICK (0.44%) | 4 / 1 frame per hit body | +10 | 0 | **exact** x,y,xSign,ySign = 46625,58366,21952,56639 (hit 1; hit 2 is its own body at +10) | yes | **READY-WITH-PRESENTATION-RNG** |
| SAND-ATTACK (0.41%) | 60 / 6 x 10 | +12,+16,+20,+24,+28,+32 | 0 | **30/30 exact**, fixture `animationProfile.dirt` | yes | as Mud-Slap; plus `controllerProfile` stages (HUD only per census) |
| FLAIL (0.41%) | 2 / 1 frame | +49 | 0 | **exact at all 5 power tiers** (40/80/100/150/200; x%48, y%24 vs corpus hit-splat x2+24, y2+12); activation == each corpus row 0 `animationRng` | yes (full-HP scenario) | **READY-WITH-PRESENTATION-RNG**; X-POWER label stale (§3) |
| WISH (0.36%) | 42 / 21 frames x 2 | +41,+44,...,+101 (step 3) | 0 | **21/21 twinkles exact** (tileOffset, yOffset) | yes | **READY-WITH-PRESENTATION-RNG** |
| METEOR MASH (0.22%) | 96 / 39 frames (48 stars x 2; 1 or 2 stars per frame) | +48,+50,...,+133 | 0 | **48/48 twinkles exact** (tile, y2) | yes | **READY-WITH-PRESENTATION-RNG** |
| ASTONISH (0.08%) | 4 / 1 frame | +31 | 0 | **exact** v1,v2 = (299,127),(291,74) | yes | **READY-WITH-PRESENTATION-RNG** |
| HIDDEN POWER (0.04%) | **0** | none | n/a | activation 3293766408 == dense corpus `animationRng` (echo only) | n/a | **C-LABEL STALE.** NEEDS-plan row (allocator slots, matrices, sprite order), §1.9 |
| HYPER BEAM (0.04%) | 156 / 26 frames x 6 (52 orbs x 3) | +110,+113,...,+185 | 0 | **52/52**: animation, phase exact; speed equal as translation step data (several speeds give identical steps) | yes | READY-WITH-PRESENTATION-RNG for the words; NEEDS orb slot + persistentOrder (allocator PLANS row), §1.8 |
| THRASH (0.04%) | 12 / 3 frames x 4 | +7,+37,+67 | 0 | **3x4 exact** fistRandom | yes | **READY-WITH-PRESENTATION-RNG** |
| WATER SPOUT (0.03%) | **0** | none | n/a | activation 2958200064 == dense corpus `animationRng` (echo only) | n/a | **C-LABEL STALE.** The only "random" is a task-local `ISO_RANDOMIZE2` (§1.9). NEEDS-plan row (task + sprite slots) |

Not reached: nothing in the assigned list; the other 40 Random2 moves (multi-provider) were not probed. Opponent-side scenarios were not re-probed (the draw plan is attacker-side independent: same call sites; the accepted opponent pins are untouched).

### 0.3 Batch picks for the integration lane

All Random2 words come from the per-battle presentation host: `words = replay(host state at the move's activation, plan)`; a pinned scenario seeds the host with the accepted activation value and must reproduce the accepted fixture exactly (these are the acceptance vectors in `plans.json`).

- **R1 = Double Kick + Astonish + Thrash + Flail.** One shared plan shape: a handful of draw frames at fixed offsets, 4 words per frame (Double Kick/Astonish/Thrash share the `Random2() % w`, `& mask`, `& 1` transforms) or 2 words (Flail); no per-sprite slots, no order input, no lag before the draws. All census C-only except Flail (C + X-POWER, now resolved at HEAD). Combined weight 0.96%.
- **R2 = Wish + Meteor Mash** (0.58%). Shared `AnimMiniTwinklingStar` transform (`tile = (w&3)==0 ? +4 : +5`, `y = w&7` negated if >3), 21 / 48 stars, one star per 3 / 2 frames; config field `twinkles` already exists on both reducers. Both census C-only.
- **R3 = Ice Beam + Water Spout + Hidden Power** (2.05%, no RNG at all): drop the C dependency; each needs its allocator/plan row (§1.9). Ice Beam is the single highest-weight move in the whole C group and does not need the presentation RNG.
- **R4 = Mud-Slap + Sand-Attack** (0.95%): the dirt transform is exact, but 30 sprite slots + the Mud-Slap/Sand-Attack sprite-order residual + the unresolved window offset (§1.7) make this a data task, not an RNG task. **R5 = Hyper Beam** (orb slots/persistent order).

## 1. Per-move plans

Common model (verified by `random2BodyWords.py` and re-verified here by `replay == observed` on every row): per frame, `steps = [not lag] + draws`, the `RfuMain1` step first, then draws in source order; `word = state >> 16` (`random.c:31-32`). Body-internal lag before the last draw is **0 for all nine drawing moves** (the only lag frames inside these stretches are the 0-step frames after the last draw, e.g. Double Kick frames 260-261), so `ageOffset` equals the non-lag step count and the plan is a pure function of `A`. Source cites relative to `reference/pokeemerald`.

### 1.1 Double Kick (`Move_DOUBLE_KICK`, `data/battle_anim_scripts.s:6530`)
- Site: `AnimFistOrFootRandomPos`, `src/battle_anim_fight.c:487` (x `% xMod`), `:488` (y `% yMod`), `:490` (`& 1` negates x), `:492` (`& 1` negates y). Script arg2 = 1, so the `:478` `% 5` draw is skipped. xMod = target width / 2, yMod = target height / 4 (`:483-484`).
- 1 draw frame per hit body at **+10** (A=227, draw frame 237, scenario `mechanic-double-kick-player-nidorina-opponent-onix`), 4 words. The second hit is its own `Move_DOUBLE_KICK` body (A=355, +10 again; its activation value 0xC8F6148A is not pinned by any accepted fixture).
- Words -> `SceneOnDoubleKickConfig.fistRandom`: word0 `.x`, word1 `.y`, word2 `.xSign`, word3 `.ySign` (`src/animation/doubleKick.ts:51-54`: `x % xModulo`, `y % yModulo`, sign = `& 1`); `targetDimensions {width,height}` from the target species art.
- Activation `0x8C5713A0` (== `rng2-doublekick-receipt.json firstRng2`). Replay -> **46625, 58366, 21952, 56639 = pinned**.
- Other blockers: none (census C only; no order/slot field in the config).

### 1.2 Astonish (`Move_ASTONISH`, `:9411`)
- Site: `AnimSprayWaterDroplet`, `src/battle_anim_flying.c:1106` (`0x1ff & Random2()`), `:1107` (`0x7f & Random2()`), two droplet sprites in one frame.
- 1 draw frame at **+31** (A=220, frame 251), 4 words. word0/word2 -> `dropletRandom[k].v1` (`& 0x1ff`), word1/word3 -> `dropletRandom[k].v2` (`& 0x7f`), k = 0, 1 (`SceneOnAstonishConfig.dropletRandom`, `astonish.ts:114-119`).
- Activation `0x58AC9BC2`. Replay -> `[[299,127],[291,74]]` = `tools/compare/astonishEvidence.ts:62` pin, exact.
- Other blockers: `targetPictureYOffset` is coords-derivable (census note). None else.

### 1.3 Thrash (`Move_THRASH`, `:2532`)
- Same site as Double Kick, three `gFistFootRandomPosSpriteTemplate` (script args `1,10,0|1|3`, all arg2 >= 0 so no `% 5` draw).
- 3 draw frames at **+7, +37, +67** (A=72), 4 words each -> `fistRandom[g].{x,y,xSign,ySign}` (`thrash.ts:44-47`).
- Activation `0x561FBE00`. Replay equals the fixture's three words groups exactly.
- Other blockers: none in the census (C only). The multi-turn lock-in is a gameplay concern outside this body.

### 1.4 Flail (`Move_FLAIL`, `:3096`)
- Site: `AnimHitSplatRandom`, `src/battle_anim_normal.c:1062` (`% 48 - 24` into x2), `:1063` (`% 24 - 12` into y2); the script passes animation=3 so the `:1054` draw is skipped. `AnimTask_FlailMovement` draws nothing.
- 1 draw frame at **+49**, 2 words -> `SceneOnFlailConfig.visualRandom.{x,y}` = `w0 % 48`, `w1 % 24` (`flail.ts:180-181`). The natural-HP scenario holds five Flail bodies (A=429/1863/3314/4040/4769 for powers 40/80/100/150/200); all five reproduce the corpus hit-splat (`x2+24`, `y2+12`) and each activation equals the corpus row-0 `animationRng`.
- Other blockers re-verified at HEAD: `movePower` is now `gBattleMovePower` when the damagecalc wrote it (`src/engine/battleScriptHitChainOpcode.ts:2300-2301`), so the census X-POWER cite (`:2285`) is stale. `hitsplatCenter`/`targetInitialX2` are coords-derivable (`liveBattlerAnchors`).

### 1.5 Wish (`Move_WISH`, `:8155`) and Meteor Mash (`Move_METEOR_MASH`, `:8724`)
- Site: `AnimMiniTwinklingStar`, `src/battle_anim_effects_3.c:2147` (`Random2() & 3`: 0 -> tile +4, else +5), `:2153` (`Random2() & 7`, > 3 negated -> y2).
- Wish: 21 stars, 21 draw frames **+41, +44, ..., +101**, 2 words each. Meteor Mash: 48 stars, 39 draw frames **+48, +50, ..., +133** (frames with 5 steps carry two stars), 2 words per star in spawn order. Words -> `twinkles[i].{tileOffset|tile, yOffset|y2}` (`wish.ts:13-15`, `meteorMash.ts:45`; `SceneOnWishConfig.twinkles`, `SceneOnMeteorMashConfig.twinkles?`).
- Activations: Wish A=65 `0xB0528D00`, Meteor Mash A=298 `0x34B39BC4`. Replay equals all 21 / 48 pinned twinkles.
- Other blockers: none in the census (C only). Meteor Mash `twinkles` is optional in the config, so a surrogate fills it.

### 1.6 Hidden Power / Ice Beam / Water Spout: see §1.9.

### 1.7 Mud-Slap (`:5220`) and Sand-Attack (`:5192`)
- Site: `AnimDirtScatter`, `src/battle_anim_ground.c:213` (`Random2() & 0x1F` -> x), `:214` (y), clamp `> 16 -> 16 - v`; `data[2] = targetX + x`, `data[4] = targetY + y`, duration 20 (script arg2), `InitAnimLinearTranslation` (`battle_anim_mons.c:1065`) gives `xStep = (|dx|<<8 as u16) / 20`, LSB = moving left (same for y).
- 6 waves of 5 sprites: 6 draw frames, 10 draws each, **Mud-Slap +9, +13, ..., +29 (A=77); Sand-Attack +12, +16, ..., +32 (A=78)**, word order = (x, y) per sprite in spawn order. Words -> `animationProfile.mud|dirt[i].{xStep,yStep}`.
- Reproduction: with the single scenario constant `(targetX - sourceX, targetY - sourceY) = (89, -73)` (unique solution of the 30-sprite fit over -150..150; matches the geometry: player attacker centre + 15 vs Onix centre 176), all 30 `(xStep,yStep)` pairs of **both** fixtures are exact from the activation value alone (`0x78A77ADB` for both; the fit validates the word order/transform, the constant is geometry production already has).
- Residuals/blockers: (1) the 30 per-sprite OAM `slot`s and the sprite-order seed (allocator PLANS row, census B); (2) the known Mud-Slap/Sand-Attack sprite-order residuals (out of scope here); (3) **window offset UNRESOLVED**: the accepted fixtures' `denseWindow.startFrame` (Mud 80, Sand 46) is **+3 / -32 relative to the script activation** in the current lab trace (the other nine are exactly 0); the fixtures come from `tools/probe/run-battle-lab-rgb.py`, not the move-specific probes. Resolve (read how it numbers frames, or re-stage) before choosing a dense window for the alternate; use `A` from a probe, not the fixture number.

### 1.8 Hyper Beam (`Move_HYPER_BEAM`, `:8362`)
- Site: `AnimHyperBeamOrb`, `src/battle_anim_effects_1.c:2339` (`animNum = Random2()`, `% 8`), `:2349` (`speed = Random2()`, `(speed & 31) + 64`), `:2356` (`Random2() & 0xFF` -> `data[5]`), 52 orbs created two per 3 frames.
- 26 draw frames at **+110, +113, ..., +185**, 6 words each. Words -> `animationProfile.orbs[i].{animation, speed, phase}` (`hyperBeam.ts:14-20, 98-123`; `animation & 7`, `speed = (w & 31) + 64`, `phase & 0xff`).
- Activation (A=79) `0x755AE995`. Replay equals the corpus' 52 orbs: animation 52/52 and phase 52/52 exact; speed is observable only through the translation step data (`data[0..4]`), and the predicted speed yields identical step data for 52/52 (the corpus-side `inferSpeed` returns the first speed in an equivalence class, so a literal speed compare would false-fail).
- Other blockers: each orb also pins `slot` and `persistentOrder` (allocator/order, from the corpus births) and the profile needs `spriteOrderSeed`/subpriorities: **NEEDS the per-move allocator PLANS row** (52 slots first-free + the cross-body order), not an RNG item.

### 1.9 Ice Beam, Hidden Power, Water Spout: **no Random2 draws**
All three probes single-step every animation-active frame: the only `Random2` caller in the whole run is `RfuMain1+0x10`. The census C label comes from the reducers' `animationRng` / `animationRngStart` / `animationRngSeed` fields, which only **echo** `gRng2Value` (advanced one `ISO_RANDOMIZE1` per frame, with Hidden Power's one skipped tick at 119, `hiddenPower.ts:273-281`); nothing in `src/engine` reads them for rendering (`grep animationRng src/engine`: only `liveMoveAnimation.ts:1614`, which passes `animationRngSeed: 0` for Grudge with the comment "State-only diagnostic ... (no pixel consumer)"). The pins equal the probe activation values (Ice Beam 689912548 == `iceBeam` `animationRngStart`; Hidden Power 3293766408 and Water Spout 2958200064 == dense corpus row-0 `animationRng`). No `Random()` (gameplay) either: `grep "[^2]Random()" src/battle_anim*.c` is empty. Water Spout's rain `x` uses a task-local `ISO_RANDOMIZE2` on `task->data[7]` (`src/battle_anim_water.c:1318`), a pure function the reducer already ports (`waterSpoutIsoRandomize2`).
- So these three move from "blocked on C" to "pass `animationRng: 0` (as `liveMoveAnimation.ts:1614` already does) and supply the allocator/plan rows": Ice Beam `soundTaskSlot/monbgTaskSlot/shakeTaskSlot/clearTaskSlot/targetSpriteSlot` + `spriteOrder` (`iceBeam.ts:60-75`), Hidden Power `allocationSlots/orbitMatrixNums/scatterMatrixNums/spriteOrderSeed/uninitializedScatterY` + live personality (`hiddenPower.ts:25-38`), Water Spout `launchTaskSlot/launchSpriteSlots/impactAffineSlots/spriteOrderSeed` + displayed HP (`waterSpout.ts:19-33`). prep11 measured those slots as constants for first bodies (matrix bitmap 0x6, no tasks, first-free sprite slots from 3); not re-measured for these three here.

## 2. Alternate-species dense-proof sketches (chosen before probing, never by matching output)

`tools/integration/prep12AltScenarios.py` writes `tools/battle-lab/prep12-<move>-alt-*.json` (same trace/moves as the accepted scenario; player attacker and opponent target species swapped; first legal gender per `battle_lab.validate_request`). The window for the dense proof is **A_alt + (accepted window start - accepted A)**, length = the accepted `frameCount`; `A_alt` comes from the probe (below), never from live output.

| Move | Alternate (player -> opponent) | `A_alt` / activation | Plan shape vs accepted |
|---|---|---|---|
| Double Kick | HITMONLEE -> GOLEM | 88 / `0x2EA37519` | identical (+10) |
| Astonish | GENGAR -> GOLEM | 75 / `0xDAAD9D3D` | identical (+31) |
| Thrash | SNORLAX -> GOLEM | 73 / `0x16194BC9` | identical (+7,+37,+67) |
| Meteor Mash | SHIFTRY -> GOLEM | 78 / `0x072069B2` | identical |
| Wish | VOLBEAT -> GOLEM | 64 / `0xB0528D00` | identical |
| Hyper Beam | SNORLAX -> GOLEM | 235 / `0xD497D0BF` | identical |
| Mud-Slap | set 156 ONIX -> set 146 NIDORINA (set-id scenario, battlers.moves override) | 72 / `0x481C6973` | identical; window offset unresolved (§1.7) |
| Sand-Attack | same sets | 73 / `0x481C6973` | identical; window offset unresolved |
| Flail | MAGIKARP -> GOLEM (full-HP scenario, one body) | 73 / `0x7695EB87` | identical (+49) |

For Double Kick / Thrash the alternate also exercises the `% (width/2)`, `% (height/4)` transforms with GOLEM's dimensions; for the dirt moves the fit constant changes with the geometry and must come from the live anchors. The proof compares the production render (words from the pinned alternate activation) against the ROM dense run of the alternate scenario; an oracle-pinned activation is the only exact claim, play is surrogate (D3).

## 3. Stale labels re-checked against HEAD (not hand-edited in the generated doc)

| Label (census) | Status at HEAD | Evidence |
|---|---|---|
| **C on Hidden Power, Ice Beam, Water Spout** | **stale: no Random2 draw** | §1.9 (probe, 2 fresh runs) |
| **C "not reconstructible" (script text)** | superseded by D3 | `docs/random2-trackability.md` header; script string updated |
| **X-POWER on Flail** | resolved: request carries `gBattleMovePower` | `src/engine/battleScriptHitChainOpcode.ts:2300-2301` (comment: "gBattleMovePower when this move's damagecalc ran; else the table power"); the census cite `:2285` is the old static line |
| **B (sSpriteOrder)** | first-body satisfied and cross-body tracked while modelled; no Random2 move above needs B except the four with slot/order fields (Mud-Slap, Sand-Attack, Hyper Beam, and the three of §1.9) | census `codes.B` text; prep11 s0.2 |
| **F-AFFINE / E-TASK / D-BG / D-TILE** (Hidden Power, Hyper Beam, Ice Beam, Water Spout) | stale by prep11 s0.2 (constants equal the accepted corpora, 18/18; monbg = target sprite position + front-idle x2, 25/25 bodies), **not re-measured for these four here**; the retained corpora `hidden-power|hyper-beam|ice-beam|water-spout-{player,opponent}-dense-state.json.gz` are the cross-check inputs for the integration lane | prep11 `prep11CrossCheck.py` / `prep11MonbgCheck.py` |
| D-PAL (Ice Beam, Hyper Beam, Hidden Power, Water Spout) | not re-measured | prep9 only cleared Absorb/Mega Drain/Giga Drain/Dream Eater/Sunny Day |

The census itself still lists F-AFFINE / E-TASK / D-* in `needs`; its PROVIDER-C grouping already treats them as non-blocking for first bodies. A cheap follow-up (not done): regenerate the census with those prep11-corrected codes dropped for the moves with retained corpora.

## 4. Reproduce

```sh
# probes: direct mGBA, fresh process x2 per scenario (~13 s .. 4 min each); alt scenarios first
python3 tools/integration/prep12AltScenarios.py
tools/integration/prep12Probes.sh /tmp/p12 astonish double-kick hidden-power hyper-beam ice-beam meteor-mash mud-slap sand-attack thrash water-spout wish flail-natural \
  alt-double-kick alt-astonish alt-thrash alt-meteor-mash alt-wish alt-hyper-beam alt-mud-slap alt-sand-attack alt-flail
# plans: no emulator
python3 tools/integration/prep12Plans.py /tmp/p12 tools/integration/fixtures/prep12-random2/plans.json
node tools/integration/remainingAdaptersCensus.mjs --write --doc
```

Outputs: `tools/integration/fixtures/prep12-random2/plans.json` (per move: `draws [{ageOffset,count,transform,consumerField}]`, `acceptedActivationValue`, `pinnedWords`, `predictedFromPlan`, `reproduced`, alternate), `receipts/<move>.json` (compact: scenario, `runsSha1` of both runs, activation, offsets). No RGB dumps, no mGBA logs.

## 5. Papercuts

- `random2RouteProbe.py` final `finalStateSha1` is not stable across fresh processes in the `--step-anim --step-sample 0` variant (all per-frame fields are); `prep12Probes.sh` compares everything else. ~10 min to find out whether it is the open-bus read path noted in random2-trackability s8.3.
- Lab scenarios built from Factory set ids (Mud-Slap/Sand-Attack) fail validation only inside `BattleLab.prepare` (held-item / species uniqueness), not in `validate_request`: each failed alternate costs a full mGBA boot. ~10 min.
- The `Bash` tool's 120 s default timeout backgrounds long probe loops; pass `timeout` explicitly.
