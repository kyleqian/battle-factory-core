# fix114 — land live audit 25's three banked patches (S10A main lane, 2026-10-11)

Production fix (narrow grant) for the three DEFECTS of docs/aud110-live-audit-25.md, presentation only. Base **master `bce86a4b0`** (src `94a7f48b3`),
fix commit **`6a6978eb6`** (src `876dfd41b`). Direct mGBA only, lab seed 305420349, INTERNAL species ids, every probe = two fresh mGBA processes
(r1 == r2), windows aligned to production's accepted start (`aud110Align.py`: Taunt +10 / 125 rows, Harden +1 / 101, Swagger +7 / 161), every row compared.

## Results

**All 91 aligned windows rendered from the checkout itself are 0 px, r1 == r2 (Taunt 23 / 23, Harden 45 / 45, Swagger 16 / 16, Mean Look 4 / 4,
Substitute 3 / 3).** The 69 aud110 windows are byte-identical to aud110's `c-aligned-patched.txt` (its banked-patch arm), and the base arm on
`bce86a4b0` is byte-identical to its `b-aligned-base.txt`. Census 0..999 base vs fix: **0 status, 0 frame, 0 decline changes; command KEY
sequence, battleDigest (`557268f1`) and commandKeyDigest (`d38322c6`) identical** (27,513 commands each).

| Defect | Fix (patch -p1, every hunk) | aud110 windows (base -> fix) | Widened pairs, base -> fix (px per window, r1 == r2) |
|---|---|---|---|
| **A** Taunt 269: anger marks behind a player target | `battleScene.ts` TAUNT branch: marks after the player battler / bubble when the target is the player (ROM `ScriptCmd_createsprite` subpriority = target - 2) | 14 / 19 -> **19 / 19** | opp Murkrow -> BIG player Steelix **1,421 -> 0**; opp Mightyena -> SMALL player Diglett 0 -> 0 (no overlap: control); reverse orientation player Murkrow -> Steelix, player Mightyena -> Diglett 0 -> 0 |
| **B** Harden 106: opponent attacker's front idle rest missing | `battleScene.ts` HARDEN branch: attacker corner (and the shine-mask corner) + `sceneOnBattlerFrontIdleRest` when the attacker is the opponent | 33 / 35 -> **35 / 35** | opp **RATTATA** (the only other non-zero rest, x2 1) Harden **41,270 -> 0** (x2: first + later body); second ONIX pair (Steelix / Onix) **109,067 -> 0** (x2); the player-attacker windows 0 -> 0 |
| **C** Swagger 207: Rattata height 38 / 32 for every species | `swagger.ts` optional `attackerPictureHeight`, `SceneOnSwaggerConfig.battlerHeight`, `liveMoveAnimation.ts` case 207 passes `attackerAnchors.pictureHeight` (as Bulk Up) | 4 / 8 -> **8 / 8** | player TALL Steelix (back 64) **76,616 -> 0**, player SHORT Wailord (back 20) **28,542 -> 0**, opp TALL Steelix (front 64) **119,344 -> 0**, opp SHORT Diglett (front 28) **2,200 -> 0** (x2 each) |

Totals by arm (`tools/integration/fixtures/fix114/{head,base}-aligned.txt`): base Taunt 17 / 23, Harden 39 / 45, Swagger 4 / 16; fix all 0 px.
Mean Look / Substitute 0 px in both arms. Struggle bodies (29, stg107's) are counted, not listed (Struggle is not on master: the copies carry stg107's diff).

## Tests (`tests/fix114LiveAuditDefects.test.ts`, 17) and revert experiments

| Rule (state level, production live path) | Revert experiment (`patch -R -p1` of the one patch, rerun, re-apply) |
|---|---|
| A: for opponent Murkrow -> player Steelix, Mightyena -> Diglett, Golbat -> Onix, every pixel of the anger marks of `sceneOnTauntView(age - 1)` (drawn alone) equals the live frame at ages 1..123 | **fails** Steelix and Onix (`age 75 (56,55)` ...); Diglett passes (no overlap, the control) |
| B: an opponent ONIX / RATTATA Harden attacker's OBJ box at ages 0, 1 equals the same species drawn as the Harden target (rest x2 1) | **fails** all 3 (1,091 / 410 / 1,091 px) |
| C: `config.battlerHeight` = `64 - 2 * yOffset` and `attackerY2` = `growAndShrinkY2AtAge(age, h)` for tall / short attackers on each side + Rattata 38 / 32 | **fails** all 8 (`battlerHeight` undefined) |
| Receipt: the receipt's windows of those pairs are 0 px, r1 == r2 | n/a (receipt) |

**Pins moved: none.** Every existing Taunt / Harden / Swagger / Bulk Up test passes unchanged: the staged and anchor pins use the Rattata pair
(real heights 38 / 32 = the old constant), Relicanth / player attackers for Harden (rest 0), and Taunt's staged / anchor pairs have no mark overlap.

## Gates (final code `eebbff29e`, serialized, four Vitest workers)

- Targeted: new tests + every test file matching taunt / harden / swagger / bulkUp / `269` / `106` / `207` + factoryAnimationInventory +
  playableAnimationIntegration: **327 files, 5,486 tests passed**.
- `npm run typecheck` green; `npm run test:smoke` **8 files / 448 tests passed**.
- Full suite (two shards): **1/2 815 passed + 22 skipped files (7,009 tests), 2/2 814 passed + 22 skipped (6,406 tests)**, both exit 0.
- `npm run build` green. `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on
  --base bce86a4b0`: **PASS, 624 / 624 captures byte-identical** (235 / 216 / 173; no capture moved). `git diff --check` clean.

## Reproduce (from workspace/)

```
sh tools/integration/fix114Run.sh .integration/validation/<fresh>                   # 38 scenarios, probes + HEAD / bce86a4b0 arms (~8 min)
FIX114_CENSUS=1 sh tools/integration/fix114Run.sh .integration/validation/<fresh>   # + census base vs HEAD + receipt compare (~6 more min)
npm test -- tests/fix114LiveAuditDefects.test.ts
```

Files: `fix114Stage.py` (10 widened scenarios on aud110Stage.scenario), `fix114Patched.sh` (aud110Patched.sh on a REV of this checkout),
`fix114Run.sh`, `fix114Receipt.py`; fixtures `fixtures/fix114/{head,base}-aligned.txt`, `fixtures/fix114-live-receipt.json` (windows + census).
