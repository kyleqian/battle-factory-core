# Live adapter species audit (S10A side lane, 2026-10-05)

Question: do the LIVE adapters (accepted on an ONIX opponent target, a few alternates) stay pixel-exact when the target (or the
player's back sprite) is another species? Method: swap the species in a copy of the accepted lab scenario, **derive the dense window and
the healthbox HP from the swapped scenario's OWN ROM state** (never from live output), run the production live view against fresh
direct-mGBA frames twice, compare digests. Everything below is "2 identical fresh runs" (`identical True` in every receipt).

## 1. Results first

### Defect table (3 distinct species defects, all proven; 2 with a runtime patch that makes the dense window 0 px)

| Move (id) | Side | Species that exposes it | px | Mechanism | File:line (production) | Fix shape |
|---|---|---|---|---|---|---|
| **Dragon Rage (82)** | player attacker (also opponent attacker) | GOLEM 2,115 px (ages 86-96, 139/150); GOLBAT 2,574; SHUCKLE 2,566; opponent-attacker + player GOLEM back sprite 3,626 | 2,115-3,626 | The fire-spit projectile aim is the per-side RAM literal `DRAGON_RAGE_FIRE_SPIT_GEOMETRY` (start/deltaQ8/matrix) measured on ONIX. ROM `StartDragonFireTranslation` (`battle_anim_dragon.c:218-243`) aims at the TARGET's `BATTLER_COORD_X_2` / `Y_PIC_OFFSET`+10 and starts at the ATTACKER's `X_2`/`Y_PIC_OFFSET`+(30,15), then `InitAnimLinearTranslation` (`battle_anim_mons.c:1065-1091`): `delta = (|d|<<8)/10`, low bit set when moving up/left, cleared otherwise. The literal is exactly this for ONIX (1894, -1537). Residual colours (`fixtures/prep11/dragon-rage-golem-residual-colors.txt`): `ff9418<-ff6310`, `ffc621<-ff9418`, `ff6310<-ff0000`, projectile only, bbox x104-114,y97-111 at age 86 -> x166-181,y43-70 at age 96 | `src/animation/dragonRage.ts:197-212` (`DRAGON_RAGE_FIRE_SPIT_GEOMETRY`), consumed at `src/animation/sceneOnPresentation.ts:6852-6854`; config built at `src/engine/liveMoveAnimation.ts:1295` | Compute `start`/`deltaXQ8`/`deltaYQ8` per request from `liveBattlerAnchors(target).picOffsetPoint` (+(0,10)) and `liveBattlerAnchors(attacker).picOffsetPoint` (+(30,15) player / mirrored opponent) with the ROM u16 rule above; keep the affine `matrix` literal (it is the fixed `sAffineAnim_DragonRageFire`). **Proven:** `PATCH='{"deltaYQ8":-1459}' speciesAuditPatchDense.ts` on the GOLEM fixture = **150/150, 0 px**, 2 identical digests (GOLEM: pic y 45 -> dy=-57 -> `((57<<8)/10)|1 = 1459`; X is unchanged 1894 because `picOffset.x`=176 for every opponent) |
| **Aerial Ace (332)** (Quick Attack 98 shares the body fn: not measured) | player attacker | GOLEM 34,505 px (ages 15-49, 15/50); GOLBAT 29,295; SHUCKLE 16,399 | 16k-35k | `aerialAceTargetSpriteXAtAge` subtracts a hard-coded `1` from the opponent target's staged x from reducer age 57 (live age 15), i.e. the ONIX settled front-idle x2 (+1) that the ROM monbg reset removes. ROM keeps the species' own x2: GOLEM/GOLBAT/SHUCKLE x2 = 0, so live draws the target 1 px too far left (verified by shift fit: live +1 px right matches source at ages 15,17,19,21,30,45) | `src/animation/aerialAce.ts:49-57` (caller: `liveMoveAnimation.ts:1377-1394` passes no target x2) | Pass `targetIdleX2 = liveBattlerAnchors("opponent", art).frontIdleRest.x2` (same input Leaf Blade needs, #144) into the Aerial Ace config and use `- (side==="opponent" && age>=57 ? targetIdleX2 : 0)`. **Proven:** `X2=0 speciesAuditAerialAcePatch.ts` on the GOLEM fixture = **50/50, 0 px**, 2 identical digests |
| **Leaf Blade (348)** (ISSUES #144) | player attacker | GOLEM 11,843 px (ages 0-11, 212/224, identical on both fixtures); GOLBAT 9,995; SHUCKLE 5,628 | 5.6k-12k | `leafBlade.ts:231-233` returns `x2 = 1` for every opponent target at ages <= 11; the ROM holds the target's own front-idle x2 (1 only for ONIX) | `src/animation/leafBlade.ts:231-233` | already specified in ISSUES #144: pass `frontIdleRest.x2` into the config / `leafBladeDisplayedTargetX2AtAge` (re-confirmed here on 3 species; same input as the Aerial Ace fix) |

Dragon Rage also depends on the ATTACKER species: the literal start (102,112) is the CHARMELEON back sprite's `Y_PIC_OFFSET`(97)+15; a
player attacker with a different back-pic yOffset has the same defect (not separately measured, same code).

### Verdict counts

Original 36 non-exact audit rows (23 errored + 13 residual of `audit-golem-summary.json`), GOLEM, source-derived window + ROM HP,
2 identical fresh runs (`receipts/golem-r1`, `receipts/golem-final`):

| Verdict | Rows | Which |
|---|---|---|
| **EXACT** (window/HP/gender artifact only) | **25** | light-screen, comet-punch hit1-3, double-slap hit1-2, triple-kick hit0-2, teeter-dance, blizzard, icy-wind, defense-curl, ingrain, smelling-salt, wrap, heal-bell, metronome, rock-tomb, safeguard, sweet-scent, fire-blast, ice-punch lab, sing, sleep-talk |
| **SPECIES-DEFECT** | **5 rows / 3 defects** | Leaf Blade x2 rows, Dragon Rage x2 rows, Aerial Ace |
| **UNRESOLVED** | **5** | amnesia (199/215), cosmic-power (224/240): tail-fade 1-frame ROM timing, see 3.1; psybeam (reorder: GOLEM turn order changes, not derivable; GOLBAT/SHUCKLE show the same tail-fade pattern); belly-drum (swapped scenario's body activates at 73 vs 231: the original's preceding turn is not reproduced); faint-attack-alt-base (probe records a different trace, window 2344 not in the swapped probe) |
| **N/A** | 1 | order-consumer-dive: no live adapter for DIVE (`No live adapter`) |

Why the "window mismatch / constant residual" rows were never window-only: the earlier audit kept the ONIX fixture's HP/window. Three
**swap artifacts** (not defects) explain 25 rows: (a) the swapped scenario's activation frame moves (+1..+28 frames; Tackle order, cry length), so
the window must be `activation' + (accepted start - activation)`; (b) HP: Golem/Golbat/Shuckle max HP and the Tackle damage the player took differ, and the
fixture HP was hard-coded 155 (`speciesAuditDerive.py` now reads gBattleMons at the activation edge); (c) the lab's player DRAGONAIR is female in
the swapped ROM frames (healthbox symbol `ff9c94`) but the fixture said male: Ice Punch lab goes 0/184 (4,416 px) -> **184/184** with the gender
read off the ROM frame (`fixtures/species-audit/overrides.json`). The Aerial Ace lab residual (35,705 px) was 24 px of gender + the real defect above.

### Widened audit (all 58 ONIX-target player fixtures; 2 more geometries; player-side back sprite)

| Swap | Derived/run | Exact | Residual rows | Errors | New findings |
|---|---|---|---|---|---|
| Opponent GOLBAT (elevated/flying; speed 90 so Tackle order is kept; reorders -> `precedingBodies` recomputed from ROM) | 55 | 39 | 13 | 3 | Dragon Rage 2,574, Aerial Ace 29,295, Leaf Blade 9,995 (same 3 defects); Blizzard/Icy Wind 0/372, 0/286 = **designed fallback**, see 3.2; Psybeam tail (285,072); Cosmic Power tail; Light Screen / Future Sight 400 px at the last 2 ages; Smelling Salt 3,358 px ages 74-112; Aromatherapy 1,676 px age 364 (the last four **UNRESOLVED**, 3.3) |
| Opponent SHUCKLE (small) | 56 | 48 | 6 | 2 | only the same 3 defects + Psybeam tail (291,744). Blizzard/Icy Wind exact |
| Player-side back sprite ONIX -> GOLEM (77 opponent-attacker fixtures with a player ONIX target; 65 derived) | 65 | 54 | 7 | 4 | Dragon Rage opponent-attacker 3,626 (same literal defect, `...opponent` geometry: start (161,64), deltaQ8 (-2279, 870)); Amnesia opp tail 278,640 / Horn Drill tail 282,816 (tail-fade, 3.1); Blizzard fallback; Ice Punch lab opponent **exact** with opponentGender female; Aerial Ace opponent 48/50, 51 px (**UNRESOLVED**, 2 rows); Sleep Talk / Dream Eater: `Sprite order unknown` (harness limitation: reordered `precedingBodies` have no plan) |

## 2. Per-defect fix briefs (integration lane)

### D1 Dragon Rage fire-spit aim (species-blind literal)
* **Input (missing):** target `picOffsetPoint` and attacker `picOffsetPoint` (already in `liveBattlerAnchors`, `liveMoveAnimation.ts:260-277`).
* **Source of truth:** `StartDragonFireTranslation` + `InitAnimLinearTranslation` (see table); `DRAGON_RAGE_FIRE_SPIT_ARGS` = (30,15,0,10,10) already in `dragonRage.ts:65`.
* **Formula:** player attacker `start=(atk.x+30, atk.y+15)`, `target=(tgt.x+0, tgt.y+10)`; opponent attacker `start=(atk.x-15, atk.y+15)` (note ROM subtracts `initialY` from x for the opponent side, `battle_anim_dragon.c:229-230`), `target=(tgt.x-0, tgt.y+10)`; `delta = ((|t-s|)<<8)/10` (u16), low bit `|1` when negative else `&~1`. Check against the two literals before deleting them: ONIX player (102,112)->(176,52): (1894,-1537) exact.
* **Test to add:** table test over {ONIX, GOLEM, GOLBAT, SHUCKLE} target y (45/35/49) asserting `deltaYQ8 = -1459/-1715/-1357 (low bit set when moving up)` for the player attacker and the ONIX literal unchanged; plus a dense live fixture `tools/integration/fixtures/species-audit/derived/prep5-dragon-rage-player.json` (GOLEM, 139/150 today) that must reach 150/150 (`speciesAuditDense.ts`).

### D2 Aerial Ace settled target x (species-blind `- 1`)
* **Input:** `frontIdleRest.x2` of the opponent target (`liveBattlerAnchors`, `speciesFrontIdleRestOffsetOrZero(speciesSymbol)`; **key has no `SPECIES_` prefix and silently returns {0,0} on a wrong key**).
* **Source:** ROM monbg reset at reducer age 57 keeps the species' own front-idle x2 (aerialAce.ts:43-45 comment states the ONIX assumption).
* **Test:** unit: `aerialAceTargetSpriteXAtAge(57,"opponent",corner,x2)` for x2 in {0,1}; live: `species-audit/derived/prep7-aerial-ace-lab-player.json` (GOLEM) 15/50 -> 50/50, and the accepted ONIX fixture stays exact. Quick Attack (98) shares the body fn: re-run its fixture with GOLEM after the change.

### D3 Leaf Blade — as ISSUES #144 (same `targetIdleX2` input); test fixtures `species-audit/derived/{prep5,order-consumer}-leaf-blade-player.json` (212/224 -> 224/224).

## 3. Unresolved / not defects, with next instrument

3.1 **Tail-fade 1-frame ROM timing (Psybeam GOLBAT/SHUCKLE, Amnesia/Cosmic Power GOLEM, Amnesia/Horn Drill player-GOLEM, Cosmic Power GOLBAT).** Residual is the whole
field brightness (`7c7b7f` ROM vs `8b8a8f` live, ~17.8k px per row for 16 rows at the body's tail, 0 px before it). `prep11Probe.py` of Psybeam (orig vs GOLBAT):
all tasks/sprites/BLDY identical up to age 138 (BLDY ramp 0..16), then the fade-out start is **one frame later** in the swapped ROM
(BLDY holds 16 for 5 frames vs 4; the last task ends age 159 vs 158), body length 160 vs 159. `AnimTask_SwayMon` (`battle_anim_mon_movement.c:751-810`) is a deterministic
sine, so the extra frame is not species logic: suspected emulated lag frame (heavier frame) or task-order phase. **Next instrument:** record `gMain.vblankCounter1`
and REG_VCOUNT per emulated frame across the body in orig vs swapped, and run the same scenario with a different species twice (lag must be species-keyed, not
random); if lag is confirmed the adapters cannot be species-exact and the 1-frame tail must be accepted as not-a-defect. Verdict: **UNRESOLVED**.

3.2 **Blizzard / Icy Wind with GOLBAT (and player GOLEM Blizzard): 0/372, 0/286.** By design: `provableEffectOrder` (`liveMoveAnimation.ts:305-322`) returns false
for a geometry whose particle OAM sort is not proven and the live seam shows the scene-off view (the field residual ~17k px/row is the missing animation). The
same adapters are **exact with GOLEM and SHUCKLE**. Not a bug, but the elevated-target pair is not covered: fix = extend the retained OAM-order proof to the GOLBAT
pic point (data work). Verdict: **KNOWN-FALLBACK**.

3.3 **GOLBAT-only small residuals:** Light Screen 400 px at ages 86-87 and Future Sight 400 px at ages 112-113 (the last two rows), Smelling Salt 3,358 px ages 74-112,
Aromatherapy 1,676 px age 364, and player-GOLEM Aerial Ace (opponent attacker) 51 px at two ages. Not pixel-dumped (out of time). **Next instrument:** `prep11LeafColors.ts` with
`POKEBENCH_LIVE_EVIDENCE_DIR` on those rows (the 400-px pair equals one 32x8 shadow, suspect the elevated-opponent shadow-row `LIVE_MOVE_OPPONENT_SHADOW_ROW`,
`liveMoveAnimation.ts:176-222`, tail hide for an elevated target).

3.4 **Harness limitations (not production):** Sleep Talk / Dream Eater with a reordered turn (`Sprite order unknown`: `fixtureSpriteOrder` has no plan for the
recomputed `precedingBodies`; Sleep Talk is exact with the original `precedingBodies`, `receipts/golem-r1`); Belly Drum / Faint Attack / Psybeam(GOLEM) scenario staging.

## 4. Reproduce

```sh
python3 tools/integration/speciesAuditList.py > /tmp/sa/list.tsv                      # the 36 non-exact rows (ALL=1: all 58)
python3 tools/integration/speciesAuditStage.py --species GOLEM --id 76 --hp 155 --speed-ev 252 --tag golem <(cut -f1,2 /tmp/sa/list.tsv) > /tmp/sa/list-golem.tsv
tools/integration/speciesAuditBodies.sh /tmp/sa/list-golem.tsv /tmp/sa/bodies         # direct mGBA, prep11Probe.py per scenario (orig + swapped)
python3 tools/integration/speciesAuditDerive.py /tmp/sa/list-golem.tsv /tmp/sa/bodies # window from the swapped body activation + ROM HP -> species-audit/derived/
tools/integration/speciesAuditDenseAll.sh tools/integration/fixtures/species-audit/derived /tmp/sa/dense 8   # 2 fresh runs each
python3 tools/integration/speciesAuditSummary.py /tmp/sa/dense
# one-shot pipeline for a species: SIDE=opponent|player tools/integration/speciesAuditRun.sh <tag> <SPECIES> <id> <hp> <speedEv> <list> <outdir>
# proofs:  PATCH='{"deltaYQ8":-1459}' FRESH=2 npx vite-node tools/integration/speciesAuditPatchDense.ts tools/integration/fixtures/species-audit/derived/prep5-dragon-rage-player.json
#          X2=0 FRESH=2 npx vite-node tools/integration/speciesAuditAerialAcePatch.ts tools/integration/fixtures/species-audit/derived/prep7-aerial-ace-lab-player.json
#          npx vite-node tools/integration/speciesAuditFireSpit.ts <fixture>   # derived fire-spit deltas for ONIX/GOLEM/GOLBAT/SHUCKLE vs the literal
```
`vite-node` wrappers must run from the workspace root; `prep11Probe.py` exits with a harmless mGBA teardown segfault (outputs are written).
Receipts: `tools/integration/fixtures/species-audit/receipts/{golem-r1,golem-final,golbat,shuckle,pgolem}/` (`summary.txt`, per-fixture JSON with both digests, `derive.txt`, `list.tsv`).
