# asl155 (S10A side lane, 2026-10-13): Astonish 310 words unit LIVE; Extrasensory 326 player later bodies LIVE under D4 faithful timing

Base: `ecd8e8f02` (includes the ret165 / rng146 engine changes). Presentation only: no rules / RNG / gameplay-timing change. Evidence and method:
`docs/ord149-astonish-extrasensory.md` (A law, B1 split instrument) and `docs/next-adapters-scan93.md` (patch B lag entry). Direct mGBA only.

## Results

| Part | Result | Receipts (`tools/integration/fixtures/asl155/`) |
|---|---|---|
| **A** Astonish 310 words unit (ord149 banked patch, applied byte for byte) | `WORDS_ORDER_UNIT_MOVE_IDS` += 310, `liveAstonishWordsPlanText` / `liveAstonishWordsPostFree`, the carry branch; `land87` words-list pin + the ord149 evidence pin move. New test `tests/ordl149AstonishWordsUnit.test.ts`: production plan text exact per window on **36 / 36** ROM bodies (and == `ord149PlanText`), static `D1,2` revert fails **21 / 36**, `310:player` marks + defers, `310:opponent` drops its marker (prep45 row). | — |
| A census 0..999 (base arm = landed with the ord149 diff reversed, measured at `5b5774b8c`) | live **27,016 -> 27,022 (+6)** / 27,196 commands, frames **4,135,135 -> 4,136,118 (+983)** / 4,151,788. Lend unknown **19 / 3,667 -> 14 / 2,755**. 7 changed commands, **all after a player Astonish body** in their battle (4 `lend unknown` lifts: 394 Tri Attack, 428 Silver Wind, 615 Sand-Attack, 923 Will-O-Wisp; 2 `allocator history unknown` lifts: 615 Light Screen, 871 Protect; 923 Revenge moves to its case-local gate). **0 regressions**, 0 pairing mismatches, `battleDigest` identical. Same delta as ord149 predicted (+6 / +983) on the new base. | `asl155-census-delta-a.json`, `asl155-census-check-a.json`, `asl155-attr-{base-a,landed}.json` |
| A windows after the bodies (6 routes, 26 windows, two fresh probe batches) | **CHAIN lend == ROM `sSpriteOrder` 26 / 26 landed** (base arm 20 / 26), r1 == r2 26 / 26, live-0px 23 (the 3 non-zero are ord149's pre-existing Golbat Mega Punch / opponent Astonish windows). Both texts byte-identical to ord149's patched / base receipts. | (compared with `fixtures/ord149/ord149-windows-{patched,base}.txt`) |
| **B** policy (D4 option (b), `liveMoveTimingPolicy.ts` 326 player later) | (1) `optional-lag-age` 142: **event 9 : 2** (scan93 patch B's entry) -> 162 rows. (2) `scanline-split-line` (age 98): the per-row split S is a CPU phase (ord149 B1); per (stage, data[1]) over the 5 measured SHUCKLE-class later bodies the **dominant display class is S <= 26 (== S = 0) on 69 / 69 rows** (68 strict majorities + 1 tie at stage 3 data[1] 1: S<=26 2 / S27 2 / S28 1, resolved by the policy's tie rule). The first-body fitted row (stage 3 data[1] 5: lines <= 28 show the preceding row) measured **0 of 5** later bodies -> S = 0 there too (`scanoutSplitRow: false`). | `asl155-xs-policy.json` |
| B target class (production-derived) | The dominance holds only when the target's first visible monbg line V >= 27: V 27 69 / 69 rows, V 26 68 / 69, V 24 67 / 69, GOLEM's V 18 50 / 69 (no dominant S on 19 rows). V comes from the production pic (`liveFieldArtTopLine`: first opaque pic row + unelevated origin) and reproduces the measured lines (**SHUCKLE 27, GOLEM 18**; prep30 s1.4). Gate: player later body live iff known scanline history, rest-free battlers, **non-elevated** target and **V >= 27**. | `tests/asl155ExtrasensoryPlayerLater.test.ts` |
| B dense windows (production path, two fresh direct-mGBA probes each, r1 == r2) | 12 SHUCKLE-class later windows live: **5 at 0 px** (xs-2 / splash-2 / psywave-2, later58 growl-2 / splash-2; patch B: 16 px each), xs-1 / splash-1 / psywave-1 / later58 growl-1 / splash-1 **39 px on 2 rows (95, 101)** (patch B 55 px, 3 rows), qa-2 **2 px, 1 row (95)** (patch B 18 px), the two measured no-lag windows qa-0 / qa-1 **298,050 / 298,086 px = 1 / 4 split rows + the 16 lag rows 143..158** (the lag alternate). Declining: CROBAT (elevated) 2, GOLEM-class later 4, Dragon Dance history 2. First bodies unchanged (SHUCKLE 0 px, GOLEM 1,433 px documented). | `asl155-windows-b.json` |
| B census 0..999 | Base arm = the A-landed census (`5b5774b8c` source == the landed tree with the B diff reversed); landed = `75d9c13d5`. Live **27,022 -> 27,029 (+7)**, live frames **4,136,118 -> 4,137,273 (+1,155)**: player later Extrasensory on NIDORINA (V 30), GLOOM (28), IVYSAUR (28), SEALEO x4 (27). **0 regressions**; status and frame changes **only** on player Extrasensory commands (`changedOutsidePlayerExtrasensory` 0). Presented frames 4,151,788 -> 4,151,813 (**+25**: all 25 player later Extrasensory bodies +1 lag row, 164 -> 165; land82 `pairingMismatches` 25 = exactly those). The `later-body` bucket 25 / 4,100 -> **0**; the 18 still declined now report `unclassified (case-local gate)` (the census classifier cannot evaluate the new gate's locals): 15 by target class (V < 27: GIRAFARIG, SCEPTILE, KINGLER x2, FURRET, ONIX, LILEEP, SCYTHER, MANTINE, DRAGONAIR x2, METANG; elevated: CROBAT, CHIMECHO, MISDREAVUS), 3 with V >= 27 (QWILFISH, PLUSLE, GROWLITHE) by the history / rest gate. Lend unknown stays 14 / 2,755. | `asl155-census-delta-b.json`, `asl155-census-check-b.json` |
| Accounting | Extrasensory 326 was already a faithful-timing adapter (D4c first bodies): **faithful-timing adapter count unchanged**; the live-status 326 entry gains the 2 player-later parameters and 4 documented player-later residual windows (`tools/integration/asl155StatusUpdate.py`, rewrites only that entry). | `docs/animation-integration-live-status.json` |
| Gates | `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base ecd8e8f02`: **PASS, 641 / 641 captures byte-identical**. Full `npm test` (on `75d9c13d5`): 1,662 files passed, **2 failed** -> both re-pinned (below) and re-run green; `npm run typecheck` / `test:smoke` green. Re-pins: `tests/land96ScanlineHistory.test.ts` (scan93's 'player later bodies still decline' -> SHUCKLE live, CROBAT declines) and `tools/integration/fixtures/sgl138-live-receipt.json` **19-on frames 42,218 -> 42,222** (regenerated by `sgl138Live.ts`; the only changed key; all 15 anchors unchanged; 19-off unchanged since Scene OFF plays no move body). Census battle 19 holds 2 player later Extrasensory bodies (commands 74 / 81, +1 lag row each); the other +2 route frames are not individually attributed. | — |

## B: residual per window (rows where the ROM split class differs from the rendered one; ord149's instruction-stepped S)

Rows of each measured SHUCKLE-class later body (column) when production renders the policy, scan93 patch B (the first-body fitted row), or
another measured body's per-row S (every alternate phase that was measured):

| ROM body (window) | **policy S = 0** | patch B | as xs-1 | as xs-2 | as qa-0 | as qa-1 | as qa-2 | dense px under the policy |
|---|---|---|---|---|---|---|---|---|
| xs-1 (`xs-pla-nuzleaf-shuckle-xs-1`) | **2** (95, 101) | 3 | 0 | 2 | 2 | 6 | 2 | 39 |
| xs-2 | **0** | 1 | 2 | 0 | 1 | 4 | 1 | 0 |
| qa-0 | **1** (95) | 2 | 2 | 1 | 0 | 5 | 0 | 298,050 (1 + 16 lag rows) |
| qa-1 | **4** (99, 102, 108, 117) | 5 | 6 | 4 | 5 | 0 | 5 | 298,086 (4 + 16 lag rows) |
| qa-2 | **1** (95) | 2 | 2 | 1 | 0 | 5 | 0 | 2 |
| total over the 5 bodies | **8** | 13 | 12 | 8 | 8 | 20 | 8 | — |

S = 0 is never worse than any single measured phase (best 8 = xs-2's / qa-0's / qa-2's phase, which are S = 0 except one row each).

## Not lifted (named)

- **CROBAT class (elevated opponent target)**: its residual is not the split alone; prep30's generated distortion window for elevation 6
  (8 / 72 vs the ROM 2 / 66; ord149 s2.3). Declines (`liveOpponentElevation` != 0).
- **GOLEM class (V < 27)**: the split is the residual, but S = 0 is not the dominant per-row phase (at V 18 every stage-3 row is S >= 18 in
  5 / 5 bodies, with no dominant S). Declines. Dense at S = 0 for the record (gate removed): 1,361..1,598 px on 23..24 rows (55..117), the
  same class as GOLEM's documented first-body alternate (1,433 px).
- **Unknown scanline history** (an unmodelled writer such as Dragon Dance since the battle began): declines (scan93).
- The player-later lag policy makes every player later Extrasensory body 162 rows (also when its adapter declines): presentation timing only.

## Reproduce (from `workspace/`; direct mGBA only)

```
sh tools/integration/asl155Run.sh .integration/validation/<fresh>                               # A + B, 3 census arms (~40 min loaded)
ASL155_PARTS="windows-a windows-b" sh tools/integration/asl155Run.sh .integration/validation/<fresh>   # windows only (~6 min)
python3 tools/integration/asl155XsPolicy.py <out.json>        # the per-row policy receipt from fixtures/ord149/xs (hermetic)
python3 tools/integration/asl155StatusUpdate.py               # the live-status 326 entry from the policy (idempotent)
```

Arms: landed = `git archive HEAD`; A base = landed with `fixtures/ord149/ord149-astonish-words-unit.diff` reversed; B base = landed with
`fixtures/asl155/asl155-extrasensory-later.diff` reversed. Census comparisons are normalized (status deltas, not absolute totals or gate source
lines), so they reproduce on a later HEAD. Validated in this step: `census-a` (at `5b5774b8c`), `windows-a`, `windows-b` through the runner;
the B census from the A run's landed census (== the B base arm's source) and one census of the B-landed tree (`asl155CensusDelta.py`).

Tests: `tests/ordl149AstonishWordsUnit.test.ts`, `tests/asl155ExtrasensoryPlayerLater.test.ts`; moved pins: `tests/land87WordsOccupancyReseed.test.ts`,
`tests/ord149AstonishExtrasensory.test.ts`, `tests/animation/d4laterTiming.test.ts`, `tests/animation/later58LiveGates.test.ts`,
`tests/animation/liveFaithfulTimingAdapters.test.ts` (route 42/7 STANTLER: 162 rows).
Tools: `asl155Run.sh`, `asl155XsPolicy.py`, `asl155CensusDelta.py`, `asl155StatusUpdate.py`; reused `ord149*`, `stg107Census.sh`,
`ord124Attribution.py`, `land82CensusCheck.py`, `audit20*`, `aud110Align.py`, `stf115*`, `later58Check.sh`.
