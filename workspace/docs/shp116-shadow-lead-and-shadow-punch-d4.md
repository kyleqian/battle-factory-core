# shp116: the elevated opponent's lead-row-0 shadow (shadow105) + Shadow Punch's age-90 restore lag as D4 (sp103) + the target shadow return

S10A side lane, narrow production grant. Base master `681da5c10` (production src `e00a22788`). Presentation only: no gameplay, RNG, damage,
turn order or facility state is touched (census key sequence + `battleDigestExcludingFrames` identical; Scene ON / OFF parity).

## Results first

| Rung | What landed | Proof |
|---|---|---|
| 1. shadow105 | `fixtures/shadow105/shadow105-lead-row0-shadow.diff` (`patch -p1`; the `liveMoveIdleLeadRows` hunk drifted because `4bf782115` had widened audit 24's decline to either attacker; resolved by hand: the decline is removed). phaseElapsed 0 of a lead > 0 move command carries `preActivationRow: true`; `renderBattleResolutionLiveView` arms the live opponent shadow on that row | Fresh probes, 11 labs x2: **r1 == r2 11 / 11**, frame rows equal to shadow105's banked sha256. Lead checks through THIS production (`shadow105LeadCheck.ts --pre-activation`): every lead row 0 px on the 11 first bodies (Shadow Punch x2, Bite x3, Sludge Bomb x3, Twineedle hit 1 x3), r1 == r2; Bite / Sludge Bomb / Twineedle **byte-identical to shadow105's banked `lead-patched-*.json`** (after rung 1 all 4 were); after rung 2 the two Shadow Punch windows are **114 / 114 rows exact** (lead + body: their age-90 lag rows 91..106 + 109 are now the policy phase). Twineedle hit 2's 940 / 839 px rows are shadow105 s4's base-identical residual (not in scope). 5 / 5 census routes: row 0 `preActivationRow`, rows 1..N-1 the age-0 image, **row 0 == row 1 + exactly 200 px in 160,65..191,72**, body rows / next command / command keys identical to the base |
| 2. sp103 | `fixtures/sp103/sp103-shadow-punch-d4.diff` (src hunks clean; live-status JSON hunks by hand since master's `implementedCount` carries Struggle; census via `remainingAdaptersCensus.mjs --write --doc`). `liveMoveTimingPolicy.ts` 325 (optional-lag-age 90, fixed 27 / 70 / 71, 109 / 108 rows, opponent 12 : 4, player 13 : 3, chosen event); 325 leaves `LIVE_MOVE_ANIMATION_IDS` for `LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS`; duration **107 player / 106 opponent**; `liveFadeHost.restoreTaskStartCallbackDeferrals` 1; the opponent shadow return at `101 + deferrals` | Fresh probes, 6 labs x2: **r1 == r2 6 / 6**, equal to sp103's banked `probe-sha256.txt`. The 8 committed windows (`tests/animation/shp116ShadowPunchTiming.test.ts`): 6 policy phase 0 px except the player's E+5 trail row 106 (STEELIX; CROBAT after rung 3); 2 other phase exactly on 83..98 + 101 + the documented last row(s) |
| 3. sp103 DEFECT | `renderSceneOnMovePresentation`'s Shadow Punch shadow return: on the live field it now draws for the OPPONENT battler whenever its species is elevated (`enemyMonElevation > 0`), attacker or target, at `101 + deferrals` (Smokescreen's precedent shape). The accepted non-live fixture path keeps `opponentToPlayer` | 24 sp103 bodies (ctl95ControlCheck.ts --shift=8, r1 == r2 every body): player HAUNTER -> CROBAT **lag phase, 7 / 7 bodies: ages 102..105 200 -> 0 px**, row 106 1,609 -> 1,409 (the trail row only, as STEELIX's 1,440). Other phase (CROBAT-slow b3): 102..104 200 -> 0, 105 1,609 -> 1,409, last row 106 2,636 -> **2,836** (+200: the ROM hides the target shadow again on that post-body row). **Every other row of all 24 bodies unchanged.** Revert experiment: 3 window tests fail |

Age 101 is not 0 px in the other phase (ROM shadow back at 101, production at 102): that is the D4 entry's documented residual
(`alternatePhaseResidual` 83..98 + 101), the same as the opponent HAUNTER's own return.

## Accounting before / after

| | before (`681da5c10`) | after |
|---|---|---|
| catalogue (`remaining-adapters-census.json` `sumsTo`) | `238+13+25+0+0=276` | **`237+13+26+0+0=276`** |
| live-status `implementedCount` | 239 (238 + Struggle 165) | **238** (237 + Struggle 165, the separate + 1) |
| `faithfulTimingCount` | 25 | **26** (+ MOVE_SHADOW_PUNCH, `alternatePhaseResidual` 83..98 + 101, max 18,176 px/row) |
| `remaining-adapters-census.json` `liveStatusImplementedCount` | 239 | 238 |

Factory acceptance and the 276 total are unchanged.

## Pins moved (all deliberate)

- `tests/land97IdleLeadRows.test.ts`: the audit 24 / shadow105 case now expects N for an elevated opponent, either attacker (325 -> 8, 44 -> 10).
- `tests/helpers/land97LeadAges.ts` + 4 call sites (`liveAnchorMoveAdapters`, `liveNext5MoveAdapters`, `liveOrderConsumerMoveAdapters` x2,
  `livePrep2MoveAdapters` x2): `4bf782115`'s opponent-species parameter reverted (no elevated decline any more).
- `tests/playableAnimationIntegration.test.ts`: the HAUNTER Shadow Punch route `land97Ages(0, 105)` -> `land97Ages(325, 106)` (8 lead rows + 106).
- `tests/animation/factoryAnimationInventory.test.ts`: `238 + additional` -> `237 + additional`; `implementedCount` 239 -> 238.
- `tests/liveStatusImplementedCount.test.ts`: 238 -> 237 (+ Struggle = 238).
- `tests/animation/fp100FocusPunchTiming.test.ts` accounting: `[238, 13, 25]` -> `[237, 13, 26]`, census string -> `237+13+26+0+0=276`.
- `tests/sc106StatsChangeCommand.test.ts` Intimidate route (seed 6): the stats-change anchor 2694 -> 2694 + 10 (the two player DROWZEE
  Confusion bodies (93, N 5) into the elevated Foe DUSTOX before it regain their lead rows: 140 -> 145 rows each).
- New: `tests/shp116ShadowLeadRow0.test.ts` (3), `tests/animation/shp116ShadowPunchTiming.test.ts` (13).

## Census 0..999 (10 `--index-from` shards per tree, `hist73Merge.py`, `shp116CensusDelta.py`)

- 27,429 commands in both trees. **Command KEY sequence identical; `battleDigestExcludingFrames` identical (10 / 10 shards); 0 status
  changes (0 live -> fallback); 0 frame-delta mismatches.** No budget-stalled tail (the streams pair 1 : 1).
- Frames **4,057,956 -> 4,060,559 (+2,603)**; live share unchanged, 98.80 % / 99.27 %.
- (a) **458 lead commands regain +N, +2,576 frames** (454 live):
  - 239 elevated-ATTACKER commands, **+1,296 frames** — exactly shadow105's number at its base;
  - 219 PLAYER commands into an elevated opponent, +1,280 frames. These had their N rows at shadow105's base (with a 200 px row 0) and
    lost them to `4bf782115`'s interim decline; they regain them with the row-0 shadow now drawn (shadow105's "new player-attacker" finding).
- (b) **27 Shadow Punch commands +1 frame** (all live in both trees): opponent HAUNTER 10 x 105 -> 114 (+8 lead +1), player HAUNTER
  into grounded foes 13 x 114 -> 115, into elevated KOFFING 4 x 106 -> 115 (+8 +1).
- Per (move, side): `receipts` -> `tools/integration/fixtures/shp116-live-receipt.json` `census.delta.perMoveSide`.

## Scene ON / OFF parity

`tools/integration/shp116Parity.ts` on the seed-54 HAUNTER route (opponent HAUNTER Shadow Punch into WAILMER), 23 boundaries: **ON == OFF**
(rng, rules context minus hitMarker's scene bit, boundary) and the boundary digest `8318623d3cbd…` is the same in the base and the final
tree. The Shadow Punch body presents 114 rows (base 105).

## App differential (`--base 681da5c10`)

`fight-submenu` 235 / 235 and `battle1-postwin-next-prompt` 216 / 216 captures byte-identical. `presentation-rng-playable-live-bodies-seeded-on`
(app-only) 152 / 173: the 21 moved captures are (1) 10 player Shadow Punch rows (frames 1904..1916 and 3049..3061: phaseElapsed 93..105 =
ages 85..97 of two grounded-target bodies, same elapsed in both trees), 17,716 px each = one BLDY step of the restore fade-in, the sp103
policy phase's one-row deferral; (2) 11 action-menu captures (2284..2503, 673 / 1,673 px): the action menu's phaseElapsed is one lower
in the final tree (the + 1 Shadow Punch row), so its idle animation phase shifts on those captures (2275 / 2512 / 3622 coincide).

## Out of scope / still open

- Twineedle residuals (shadow105 s4), the player window's last-row E+5 artifact (sp103), idle98's universal rows, Struggle follow-ups.
- The other-phase post-body row (CROBAT-slow b3 row 106, +200 px) is inside the documented other-phase last-row residual.

## Reproduce (from workspace/)

```sh
sh tools/integration/shp116Run.sh .integration/validation/<fresh> [--census]
npx vitest run tests/shp116ShadowLeadRow0.test.ts tests/animation/shp116ShadowPunchTiming.test.ts
```
The runner restages both scenario sets (diff'd), runs fresh probes x2 (r1 == r2, equal to the banked sha256), the lead / body checks on
THIS checkout, the 5 routes and the parity in a base `681da5c10` archive copy and this checkout, and with `--census` the 0..999 census in
base and HEAD copies; `shp116Receipt.py` compares the result with `fixtures/shp116-live-receipt.json` section by section.
