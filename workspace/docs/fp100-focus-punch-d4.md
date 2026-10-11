# fp100 — Focus Punch 264: the age-131 restore lag as a D4 faithful-timing entry

Integration lane, base master `406bfc999` (production src `e3c8092c`). Production code commit `6bd25b1f0` (src tree `aaf3d215`).
Presentation only: no gameplay, RNG, damage, turn order or facility state changed. Shipped under the user's standing D4 approval
(ROADMAP S10A; ANIMATION_VERIFICATION.md "CPU-load timing integration — user-approved D4"; docs/faithful-timing.md). It follows the
Light Screen 113 precedent (lsbz) and the Faint Attack 185 restorebg-lag precedent (fa185).

## Results first

**Phase table** (`tools/integration/fixtures/fp100/receipts/phase.tsv`):
- Fresh direct mGBA, `ctl95Probe.py`. Explicit lab seeds 305419897 / 38177486. Twice fresh, r1 == r2 on 13 / 13 scenarios.
- 29 doll-free bodies, 8 species pairs, first and later bodies.
- "event" means a lag at age 131: `gRng2Value` repeats between body rows 130 and 131, and the ROM body is 154 active rows. Without it the body is 153.
- px = production's render through `ctl95ControlCheck.ts`, every row, both runs. Base `406bfc999` -> final `6bd25b1f0`.

| lab (scenario) | side | pair | bodies: phase | base px per window | final px per window |
|---|---|---|---|---|---|
| fp100-opponent-machamp-snorlax (seed A) | opp | MACHAMP -> SNORLAX | b0, b1 lag | 271,424 (132..147) | **0** |
| fp100-opponent-hitmonchan-steelix (seed B) | opp | HITMONCHAN -> STEELIX | b0, b1 lag | 284,912 (132..147) | **0** |
| fp100-player-heracross-lapras (seed A) | ply | HERACROSS -> LAPRAS | b0 lag | 0 | **0** |
| fp100-player-machamp-skarmory (seed B) | ply | MACHAMP -> SKARMORY | b0, b1 lag; b2 **no lag** | 0; b2 274,576 | **0**; b2 274,576 (132..147) |
| ctl95-fp-opponent-persian | opp | PERSIAN -> SLOWBRO | b0..b2 lag; b3 **no lag** | 280,624; b3 0 | **0**; b3 280,624 (132..147) |
| ctl95-fp-opponent-golbat | opp | GOLBAT -> LAPRAS | b0, b1 lag; b2 **no lag** | 289,680; b2 0 | **0**; b2 289,880 (132..147 + 154) |
| ctl95-fp-opponent-breloom | opp | BRELOOM -> STARMIE | b0..b2 lag | 292,272 | **0** |
| ctl95-fp-player-persian | ply | PERSIAN -> SLOWBRO | b0, b1 lag; b2, b3 **no lag** | 0; 271,552 | **0**; 271,552 (132..147) |
| ctl95-fp-player-gengar | ply | GENGAR -> SLOWBRO | b0, b1 lag; b2, b3 **no lag** | 0; 272,160 | **0**; 272,160 (132..147) |
| doll81-att-focus-punch-opponent (doll-free body) | opp | PERSIAN -> SLOWBRO | lag | 280,624 | **0** |
| doll81-att-focus-punch-opponent-golbat (doll-free body) | opp | GOLBAT -> LAPRAS | lag | 289,680 | **0** |
| doll81-att-focus-punch-player (doll-free body) | ply | PERSIAN -> SLOWBRO | lag | 0 | **0** |
| accepted `focus-punch-opponent-breloom-player-starmie` (banked) | opp | BRELOOM -> STARMIE | no lag (153) | 0 | 292,272 (132..147) |
| accepted `focus-punch-player-breloom-opponent-starmie` (banked) | ply | BRELOOM -> STARMIE | lag (154) | 0 | **0** |

**Counts:**
- Opponent attacker: lag in 14 of 16 fresh bodies; with the accepted fixture, **14 : 3**.
- Player attacker: lag in 8 of 13; with the accepted fixture, **9 : 5**.
- The lag is the dominant phase on both sides.
- The fresh fp100 labs alone: opponent 4 : 0, player 3 : 1.
- Every body also lags at 30 and at 151, 152 (152, 153 after the age-131 lag).
- The pattern: in every lab, bodies 0 and 1 lag. The 153-row bodies are all third or fourth bodies, yet BRELOOM's third body lags. Nothing production knows decides it, so it is a CPU phase. ctl95 s3 ablated side, species, body index, doll history and personality.

**Dominant-phase windows** (final code, every row, two fresh runs, r1 == r2): opponent **14 / 14** and player **8 / 8** are **0 px on all 155 rows**. Before fp100, the 14 opponent windows were off by 271,424..292,272 px each, on rows 132..147.

**Minority-phase residual** (final code): the documented rows only.
- **Rows 132..147** in all 7 fresh windows and the accepted opponent fixture, 16 whole-field rows. Per row: MACHAMP ply 17,161; PERSIAN opp 17,539; GOLBAT opp 18,105; PERSIAN ply 16,972; GENGAR ply 17,010; accepted BRELOOM opp 18,267.
- Source cause: without the lag, `Task_FadeToBg` starts the hardware fade-in back to the field at 132 instead of 133. Each fade-in row in the ROM is then one BLDY step brighter than the lag-phase render.
- **Elevated opponent attacker (GOLBAT) also on row 154**, 200 px. Its shadow returns on the row after the first inactive row, and in the 153-row phase that row (154) falls inside the 155-row window.
- `alternatePhaseResidual` in the live-status entry: ages 132..147 + 154, max 18,267 px/row.

**Accounting** (the lsbz precedent, applied the same way):
- `264` leaves `LIVE_MOVE_ANIMATION_IDS` and joins `LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS`.
- The live-status entry moves from `implementedAdapters` to `faithfulTimingAdapters`. It carries `timingParameters` = the policy, the residual and the evidence.
- `implementedCount` 239 -> **238**, `faithfulTimingCount` 24 -> **25**.
- `remainingAdaptersCensus --write --doc`: **239 + 13 + 24 -> 238 + 13 + 25 = 276**.
- Factory acceptance and the 276 total are unchanged. `ANIMATION_PROGRESS.md` / `ANIMATION_COVERAGE.json` are not touched.
- The accepted fixtures' exact proofs stay valid in their proved scope:
  - the player fixture is the policy phase, 155 / 155 rows at 0 px;
  - the opponent fixture (153) is now the documented other phase.

**Census** (seeds 0..999, base `406bfc999` vs final `6bd25b1f0`; 10 `--index-from` shards each, `hist73Merge.py`, `land82CensusCheck.py`, `ctl95CensusPair.py`, `fp100CensusFocus.py`; `receipts/census-*.txt`):
- live **26,209 -> 26,209 commands**; live frames **3,913,028 -> 3,913,047 (+19)**;
- Focus Punch: opponent live **19 commands 154 -> 155 frames**; player live 8 commands 155 -> 155 (already the lag phase);
- Focus Punch fallbacks unchanged: opponent 9 attacker-doll + 2 defender-doll, player 1 attacker-doll, 32 frames each;
- **0 live -> fallback**; **0 other commands** changed status, frames or duration;
- command KEY sequence identical: 27,515 = 27,515 commands, 0 key mismatches;
- `battleDigestExcludingFrames` identical;
- stalls 434 / 796 / 881 in both runs, no truncated tails (no budget-cut difference);
- `ctl95CensusPair.py`: 19 pairing mismatches (the 19 frame changes above), 0 regressions.

**Scene ON / OFF parity** (`land82Parity.ts 417 40 264:opponent`, final code; `receipts/parity-417.json`):
- 49 ON requests including Focus Punch opponent;
- boundaries (scene hit-marker masked), RNG cursor, outcome, facility and prompt (action-menu) all equal;
- not stalled.

**Substitute-swap Focus Punch cell.** It is **not in production**, before or after fp100. `LIVE_SUBSTITUTE_SWAP_BODY_CELLS` has no 264. doll90 declined it pending exactly this D4 entry. In the census its 10 commands still fall back, unchanged.
- The doll81 framing `{155, 0}` (rows = activation .. first inactive) equals the policy phase: `liveMoveTimingBodyRows(264, side) + 1` = 155 on both sides. A landed cell would follow the policy through `liveMoveAnimationDuration` with no separate constant.
- Subbed doll81 bodies in these fresh probes (swap-in rows + body):
  - player 196, 196, 195, 196, 196: lag in 4 / 5; GENGAR's 2nd has no lag, as doll90 found;
  - opponent 194 x 3: lag in 3 / 3.
- So the 4 lagged player swap windows doll90 measured at 0 px are in the policy phase. Landing the cell (a new swap cell, census +10 live) is outside this grant. It is a follow-up.

## Source and change

- `Move_FOCUS_PUNCH` ends `waitforvisualfinish; restorebg; waitbgfadein`.
  - `Task_FadeToBg` fades to black (BLDY 1..16 at ages 113..128).
  - It then calls `LoadDefaultBg()` (the battle-terrain LZ decompress) and starts the fade-in.
  - When that frame overruns VBlank, one main-loop pass is lost (age 131). The fade-in, the target-mon-BG cleanup and the first inactive row then all come one row later.
- The old adapter keyed this on the target side (opponent target 154 / player target 153): the two accepted fixtures' phases.
- `focusPunch.ts`:
  - `restoreLag` replaces that split: fade-in 133 / 132, last fade row 148 / 147, mon-BG cleanup 150 / 149, first inactive 154 / 153;
  - the default (`targetSide === "opponent"`) keeps the accepted per-side bodies, so the Factory reducer and its evidence tests are unchanged;
  - `focusPunchFirstInactiveAge(restoreLag)`.
- `sceneOnPresentation.ts`: `SceneOnFocusPunchConfig.restoreLag` (optional) is passed to the reducer.
- `liveMoveAnimation.ts`:
  - case 264 sets `restoreLag = liveMoveOptionalLagAge(264, side) !== null`;
  - the duration is `liveMoveTimingBodyRows(264, side) + 1` = 155 on both sides.
- `liveMoveTimingPolicy.ts` 264, two `optional-lag-age` parameters (opponent, player):
  - age 131, `fixedLagAges` [30, 151, 152] (the no-event frame), iterations 150;
  - alternatives: event 154 / no-event 153;
  - chosen "event", no tie.

## Pins (Tier 1) and revert experiments

- **`tests/animation/fp100FocusPunchTiming.test.ts`** (15 tests):
  - the banked phase table: lag ages per phase, body rows, 4 fresh pairs;
  - the policy recomputed from the table + the accepted fixtures (dominant, per side);
  - the duration (155 x 2) and `restoreLag` on both sides through `liveMoveAnimationPresentation`;
  - the reducer: the phases differ only at 132..147, 149 and 153; the default keeps the accepted bodies;
  - accounting: ids, live-status counts and entry, census `238+13+25+0+0=276`;
  - **9 committed ROM windows** (`fixtures/fp100/windows`, `ctl95ControlCheck.ts --emit` format, re-rendered by `ctl95ControlFixture.ts`): 6 policy-phase at 0 rows bad, and 3 other-phase with exactly 132..147 (+ 154 for GOLBAT).
- **Moved pins** (intentional):
  - `factoryAnimationInventory.test.ts`: `implementedCount` 238;
  - `liveStatusImplementedCount.test.ts`: 238;
  - `liveBasicMoveAdapters.test.ts`: 264 is no longer in `LIVE_MOVE_ANIMATION_IDS`; durations 155 / 155.
- **Reverts** (each fails pins; 5 files: fp100, liveMoveTimingPolicy, liveStatusImplementedCount, factoryAnimationInventory, liveBasicMoveAdapters):
  - R1, opponent `chosen: "no-event"`: 11 fail (fp100 9, liveMoveTimingPolicy 1 = chosen is not the dominant phase, liveBasicMoveAdapters 1);
  - R2, case 264 without `restoreLag`: 7 fail (fp100 windows + config);
  - R3, 264 back in `LIVE_MOVE_ANIMATION_IDS` and out of the faithful list: 5 fail (inventory 1, fp100 1, liveBasic 1, liveStatusImplementedCount 2);
  - R4, duration back to the per-side 155 / 154: 2 fail (fp100 1, liveBasic 1).

## Gates (final code)

Tested code `7eff6d899` (production `6bd25b1f0`, src tree `aaf3d215`). The receipt / doc commit after it changes no code. All gates ran serialized, with no census running.

- **Targeted**: 64 files, 2,162 tests passed. The brief's grep (264 / Focus Punch / focusPunch / liveMoveTimingPolicy / faithfulTiming) plus `factoryAnimationInventory`, `playableAnimationIntegration`, `liveStatusImplementedCount`, `liveBasicMoveAdapters`, `ctl95DollFreeControls`, `substituteSwapAttdollCells`.
- `npm run typecheck`: exit 0.
- `npm run test:smoke`: 448 / 448.
- **Full suite**, two foreground shards, four workers, 0 failed:
  - shard 1: 812 files, 6,970 passed / 119 skipped;
  - shard 2: 812 files, 6,380 passed / 104 skipped.
- `npm run build`: exit 0.
- `compare:differential fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 406bfc999`: **PASS, 624 / 624 captures byte-identical**.
- `git diff --check`: clean.
- **Runner** `fp100Run.sh`, run twice into fresh dirs on src `aaf3d215`. Each run: same scenarios, 13 / 13 r1 == r2, **same phase.tsv**, the accepted fixtures as above.

## Reproduce

```sh
sh tools/integration/fp100Run.sh .integration/validation/<fresh>             # probes x2, checks, phase.tsv (cmp receipt), accepted fixtures
sh tools/integration/fp100Run.sh .integration/validation/<fresh> --census    # + base / final censuses (or --census-only)
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 417 40 264:opponent
npx vitest run tests/animation/fp100FocusPunchTiming.test.ts
```

Receipts: `tools/integration/fixtures/fp100-live-receipt.json`; `tools/integration/fixtures/fp100/receipts/` (phase, phase-base,
census-check, census-focus, census-prep43, parity-417). Scenarios: `tools/integration/fixtures/fp100/scenarios/` (`fp100Scenarios.py`).
