# qa91 (S10A side lane, 2026-10-10): live audit 21's Quick Attack DEFECT fixed, its Castform key lift landed

**Quick Attack 98 is fixed.** The target's base x2 is now the negative of the target's tracked rest, not a constant.
- Every audit 21 player Quick Attack window is **0 px CHAIN** through production: **18 / 18** (6 pairs x 3), r1 == r2.
  - This includes both ONIX first-body windows, which stay exact.
  - Before the fix: 16 / 18 windows were 14,223..18,704 px.
- prep7's three accepted Quick Attack comparators are still exact.
- The opponent side is unchanged: before == final digests on 12 windows.
- Census 0..999: identical. Quick Attack's 287 commands stay live, so the census shows no gain or loss.
  - All 144 player bodies now draw the target where the ROM does.

**The Castform keys are lifted.** `52:by:1` (sun Ember), `53:by:1` (sun Flamethrower) and `184:at:3` (hail Scary Face) join
`LIVE_CASTFORM_FORM_PROVEN`. Their 14 / 14 aligned windows are live at 0 px, CHAIN and ENTRY, on both Castform sides, r1 == r2. Rain Icy
Wind (`196:by:2`, `196:at:2`) still declines; its reason now says TIMING-PHASE.

## 1. Results

### 1.1 The x2 mechanism (RAM, direct mGBA, two runs, r1 == r2)

`qa91X2Probe.py` records `gSprites[gBattlerSpriteIds[b]].x2 / y2` on every frame of every body (`fixtures/qa91/x2/`). Opponent x2, from
activation - 2 to the body end + 2:

| Scenario (audit 21, lab seed 305420349) | Quick Attack body | opponent x2 at activation | then |
|---|---|---|---|
| PIDGEOTTO -> ONIX | c0 (frame 79) | **+1** | +1 until ShakeMon starts, then 0 / +5 shake, ends 0 |
| | c1 (1413), c2 (2747) | **0** | 0 / +5 shake, ends 0 |
| NIDORINA -> ONIX | c0 (78) / c1 (1412) / c2 (2746) | **+1** / 0 / 0 | same |
| NIDORINA -> NIDORINO | c0 / c1 / c2 | 0 / 0 / 0 | 0 / +5 shake, ends 0 |

The supervisor's hypothesis holds:
- The -1 was ONIX's own send-out idle rest (+1), negated. `AnimTask_ShakeMon(ANIM_TARGET, 5, 0, 6, 1)` writes the target's x2
  absolutely: it replaces the rest and ends at 0.
- The live renderer always draws the opponent at its rest plus `targetBaseX2`. The rest is `sceneOnBattlerFrontIdleRest`: the tracked
  `liveIdleRest`, else the species rest. So the correct base is `-rest` from the impact age.
  - The rest is 1 for ONIX / RATTATA until a body zeroes it (`liveBattlerX2History.ts`). It is 0 for every other species (all ported
    front-idle families; listed in this run) and for every player back sprite.
- prep7 fitted -1 on ONIX's first body, where `-rest` = -1. The 16 DEFECT windows have a rest-0 target, or ONIX already zeroed by its
  earlier Quick Attack: the tracker's `zeroed` input, as audit 21's receipts record.

The fix (production):
- `quickAttackAnimationAtAge(age, side, targetRestX2)`: `targetBaseX2 = age >= 58 && rest !== 0 ? -rest : 0`.
- `sceneOnQuickAttackView` passes the opponent target's drawn rest (0 for a player-side target).
- The staged prep7 ONIX keeps -1, because its staged corner carries the species rest.
- Case 98 in `liveMoveAnimation.ts` needed no change. Its target battler already carries the tracked `liveIdleRest`.

**Grant note:** `src/animation/sceneOnPresentation.ts` gained one argument at the `sceneOnQuickAttackView` call site (+2 lines). The
reducer's new input has no other route to the view. No other `src/` file outside the grant was touched.

### 1.2 Player Quick Attack windows (audit 21's 6 pairs x 3, `audit21Check.ts` through this tree; two fresh probes each)

| Window | units | before CHAIN / ENTRY (audit 21 `receipts/check/`) | **final CHAIN** / ENTRY (`fixtures/qa91/qa/`) | r1 == r2 |
|---|---|---|---|---|
| a21-qa-ply-azurill-crobat-c0 / c1 / c2 | 0 / 4 / 8 | 14,957 / 14,957 each | **0** / 0 each | yes |
| a21-qa-ply-nidorina-nidorino-c0 / c1 / c2 | 0 / 4 / 8 | 14,223 / 14,223 each | **0** / 0 each | yes |
| a21-qa-ply-persian-nidorino-c0 / c1 / c2 | 0 / 4 / 8 | 14,223 / 14,223 each | **0** / 0 each | yes |
| a21-qa-ply-nidorina-snorlax-c0 / c1 / c2 | 0 / 4 / 8 | 14,229 / 14,229 each | **0** / 0 each | yes |
| a21-qa-ply-pidgeotto-onix-c0 (first body) | 0 | 0 / 0 | **0** / 0 | yes |
| a21-qa-ply-pidgeotto-onix-c1 / c2 | 4 / 8 | 18,704 / 15,274 each | **0** / 15,274 each | yes |
| a21-qa-ply-nidorina-onix-c0 (first body) | 0 | 0 / 0 | **0** / 0 | yes |
| a21-qa-ply-nidorina-onix-c1 / c2 | 4 / 8 | 18,704 / 15,274 each | **0** / 15,274 each | yes |

**ENTRY on ONIX's later bodies (4 windows)** stays at base's 15,274 px. This is not a Quick Attack residual.
- The residual is only rows 0..13 (1,091 px each). Those are the pre-impact idle rows, where `targetBaseX2` is 0 both before and after
  the fix.
- The ENTRY lend truncates the history to the consumer's own body. The x2 tracker therefore never sees ONIX's earlier Quick Attack,
  and the renderer draws ONIX at its species rest +1 where the ROM has 0.
- From the impact on, ENTRY is 0 px too: -rest cancels the +1.
- Production always runs the CHAIN history, which is 0 px.

### 1.3 Opponent-side Quick Attack (new controls, `qa91Stage.py`, same recipe and seed)

Before = `27b43d26d`, whose src `e7a4775e` is base `5af9bdb51`'s src. Final = this tree. Both sides use the same probes, and the per-row
digests are equal on all 12 windows.

| Pair (opponent -> player) | windows | before = final CHAIN / ENTRY |
|---|---|---|
| PIDGEOTTO -> ONIX (prep7's original orientation) | 3 | **0 / 0** each |
| PIDGEOTTO -> SNORLAX | 3 | **0 / 0** each |
| PERSIAN -> SNORLAX | 3 | 1 / 1 each (one pixel at age 9, (138, 74), ROM `946300` vs `d6d6c6`) |
| PERSIAN -> ONIX | 3 | 1 / 1 each (the same pixel: it follows the PERSIAN attacker; pre-existing, untouched) |

Opponent NIDORINO -> NIDORINA (audit 21's crashed control) and an opponent ONIX attacker -> NIDORINA crash the direct probe process
deterministically: exit 139, no output, twice each. Both are dropped. The opponent ONIX ATTACKER's own rest is therefore not measured.

### 1.4 prep7's accepted Quick Attack comparators (direct mGBA)

| Comparator | frames | px |
|---|---|---|
| `npm run compare:quick-attack-portable` (opponent PIDGEOTTO -> player ONIX) | 219 / 219 | 0 |
| `npm run compare:quick-attack-opposite` (player PIDGEOTTO -> opponent ONIX) | 214 / 214 | 0 |
| `npm run compare:quick-attack-opposite-controller` | 158 / 158 | 0 |

`tools/integration/prep7Reducers.mjs` regenerates `prep7-reducer-checks.json` byte-identically. It now passes the ONIX rest 1 for the player
orientation.

### 1.5 Castform keys (`fixtures/qa91/castform/`, audit 21's `c83-aligned/` windows through this tree)

| Key | windows | final |
|---|---|---|
| `52:by:1` sun Ember (Castform player / opponent) | 6 | live, **0 px** CHAIN and ENTRY, r1 == r2 |
| `53:by:1` sun Flamethrower | 6 | live, **0 px** |
| `184:at:3` hail Scary Face | 2 | live, **0 px** |
| ctl (normal form) Ember / Flamethrower / Scary Face | 17 | live, 0 px (unchanged) |
| `196:by:2` / `196:at:2` rain Icy Wind | 8 | **declined**: `measured residual ...: (TIMING-PHASE: lag ages [241, 242] vs [261], also without Castform; live audit 21)` |

### 1.6 Census seeds 0..999 (base `5af9bdb51` vs final src `23934074`; 10 `--index-from` shards each)

The census ran `flat84Census.sh`: `hist73Merge.py`, `prep43CensusDelta.py`, `flat84CensusCheck.py`. Receipt: `fixtures/qa91/census-check.txt`.

The gates all PASS:
- same command count (27,516);
- same command KEY sequence (`commandKeyDigest 907bc05914b3aebf` both);
- same frames per command;
- `battleDigest` and `battleDigestExcludingFrames` identical on all 10 shards;
- 0 render throws.

The deltas:
- **0 live -> fallback**, 0 gains. Live 25,918 / 27,516 commands, 3,873,692 / 3,968,405 frames (94.19 % / 97.61 %), before == after.
- Quick Attack 98: 287 commands (144 player, 143 opponent), all live before and after. Each of the 144 player bodies targets a rest-0
  species (none is ONIX / RATTATA), so all 144 now draw the target at the ROM's x2 from age 14 (they were 1 px left).
- The three lifted Castform keys occur 0 times in these seeds. Rain Icy Wind's 5 declines change only their reason text.

### 1.7 Gates (final code, serialized, four Vitest workers)

- Focused: 50 files, **997 tests** green. The set is every `tests/` file that names Quick Attack / Castform / move 98, plus
  `factoryAnimationInventory` and `playableAnimationIntegration`.
- `npm run typecheck`: green.
- `npm run test:smoke`: 8 files, 448 tests, green.
- Full suite, two shards: **1,617 files passed** (809 + 808, 44 skipped), **13,278 tests passed** (6,934 + 6,344).
- `npm run build`: green.
- `compare:differential fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 5af9bdb51`:
  **PASS, 624 captures byte-identical.**
- `git diff --check`: clean.

Tier-1 tests in `tests/qa91QuickAttackCastformKeys.test.ts`:
- the reducer rule;
- the live seam for NIDORINO / SNORLAX / CROBAT (0), ONIX / RATTATA at rest (-1) and zeroed (0), and the opponent attacker (0);
- the RAM receipt's activation x2 = the tracker's rest;
- the key set, and the 14-window final receipt.

Revert experiment (`fixtures/qa91/revert-experiment.txt`): with the old constant restored, 2 / 6 tests fail. The live seam test fails
with NIDORINO at `[0, -1, -1]` instead of `[0, 0, 0]`. `cast83CastformForms.test.ts` now counts 29 + 3 proven keys and checks the rain
residual reason.

## 2. Reproduce

```sh
sh tools/integration/qa91Run.sh <fresh-receipt-dir> <fresh-scratch-dir>   # x2 RAM, QA / Castform / opponent checks, == committed
C=<scratch>; git archive 5af9bdb51 | tar -x -C $C/base; git archive HEAD | tar -x -C $C/final   # + node_modules symlinks
FLAT84_CENSUS_JOBS=10 sh tools/integration/flat84Census.sh $C/base $C/final $C/out            # census-check.txt
npm run compare:quick-attack-portable; npm run compare:quick-attack-opposite; npm run compare:quick-attack-opposite-controller
```

Run B of `qa91Run.sh` (fresh dirs, 23:04..23:06): the staged scenarios, the derived fixtures, and every x2 / qa / castform / opp /
opp-before receipt and summary were **== committed (byte-identical)**.

## 3. Not reached

- An **opponent ONIX / RATTATA attacker**: Quick Attack's absolute attacker travel against a non-zero attacker rest. Its probe crashes
  (1.3).
- A RATTATA target. The rule is the same tracked rest (+1), but it was not probed.
- The ENTRY lend's pre-impact rows on a zeroed ONIX (1.2) need the x2 history. That is a harness-truncation limit; production has the
  history.
