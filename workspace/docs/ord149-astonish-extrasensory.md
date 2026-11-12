# ord149 (S10A side lane, 2026-10-13): Astonish 310 player order (words law + banked words-unit patch) and the Extrasensory 326 player later-body scanout split (precise negative)

Base: master `1c801184b` (Return is Frustration; census numbers re-attributed on this base). Evidence and banked patches, new files only:
no tracked file was edited. Every tree is a git-archive copy of `1c801184b`. The patched copy also gets
`tools/integration/fixtures/ord149/ord149-astonish-words-unit.diff`. Direct mGBA only. The lab seed is pinned in every job.
Runner: `sh tools/integration/ord149Run.sh <fresh-out-dir>` (§4). Two fresh runs reproduced every receipt (**ALL SAME**).

## Results

| Part | Result | Receipts (`tools/integration/fixtures/ord149/`) |
|---|---|---|
| **A1** Astonish 310 law (predicted from source, committed first in `cf06f8e1e`) | The two droplets die in one frame and free in **ascending rise** order. Ties keep the lend order. The rise is `sum_{j<30} ((d1 - 32 j) >> 8)`, with `d1 = 896 +/- v2` (`v2 = word & 0x7f`). Plan text: `Cf;D0;Cff;D1,2/P<rise1>,<rise2>`. **ROM: exact per allocation window on 36 / 36 bodies** (18 player, 18 opponent; 6 first / 12 later per side; one rise tie). All 8 source rise classes {22..48} were observed on both sides. Two fresh batches gave units r1 == r2, and A == B on all 18 jobs. | `ord149-prediction.md`, `ord149-units.json`, `ord149-check.json` |
| A1 controls | Static `D1,2`: 15 / 36. Static `D2,1`: 21 / 36. Reversed words: 1 / 36 (only the tie). **The production row `310:opponent` (`D1,2/P537,537`, tied) is exact on only 8 / 18 opponent bodies** (pre-existing; see §1.4). | `ord149-check.json` `controlsExact` |
| **A2** banked patch | Astonish becomes a words unit (Dive / Flatter pattern), 2 files, +34 / -1: `WORDS_ORDER_UNIT_MOVE_IDS` += 310, and `liveAstonishWordsPlanText` / `liveAstonishWordsPostFree` (carry branch). No table row: `310:player` has none, so its marker starts. `310:opponent` keeps its row, so its marker drops. The patched copy typechecks. One existing pin moves (`ord149-fold-test-pins.diff`, land87). | `ord149-astonish-words-unit.diff`, `ord149-fold-test-pins.diff` |
| A2 windows after the bodies | 6 routes (Harden / Mega Punch defenders, both sides), 26 windows. **CHAIN lend == ROM `sSpriteOrder`: patched 26 / 26** (base 20 / 26: the 6 player after-Astonish windows have an unknown lend). audit21Check: 26 live, 23 at 0 px in both copies, r1 == r2 26 / 26. The player after-Astonish windows are 6 / 6 at 0 px. The 3 non-zero windows are byte-identical in base and patched: two Golbat Mega Punch first windows (270,496 / 17,984 px, the ord124 §3 FINDING class) and one opponent Astonish window (9 px). | `ord149-windows-*.txt`, `ord149-windows-lends-*.jsonl`, `ord149-windows-derive.txt` |
| A2 census 0..999 | base 27,075 / 27,256 live, 4,138,675 / 4,155,309 frames -> patched **27,081 (+6), 4,139,658 (+983)**. Lend unknown 19 / 3,667 -> **14 / 2,755** (the whole `body 310:player` group leaves). 7 commands change, **all after a player Astonish body in their battle**: 4 of the 5 body-310 commands lift; the 5th (Revenge, battle 923) moves to Revenge's own case-local gate; 2 `sprite allocator history unknown` commands lift (615 Light Screen, 871 Protect: the words marker's occupancy shadow, reseed85). **0 regressions**, 0 pairing mismatches; `battleDigest` and `commandKeyDigest` identical. | `ord149-census-delta.json`, `ord149-census-check.json`, `ord149-attr-{base,patched}.json` |
| **B1** Extrasensory player later bodies: ROM behaviour | `AnimTask_ExtrasensoryDistortion_Step` rewrites both scanline buffers **during scanout**, on every write row of first and later bodies alike (entry VCOUNT 0..38 over 648 write rows). On each displayed row, lines `data[14]..S` show the **previous row's word** and lines `S+1..data[15]` show this row's word. S is the split line, determined by when the write loop passes the beam. Instruction-stepped mGBA (VCOUNT + HBlank bit at every loop iteration) on 3 player routes x 3 bodies; fresh A == B on all. | `xs/*.json`, `ord149-xs-split.json` |
| B1 is S production-derivable? | **No.** At the same (stage, row), S differs between bodies of one route. Agreeing row keys: 7 / 72 on NUZLEAF->SHUCKLE after XS, 7 / 72 after QA, 0 / 72 on ESPEON->CROBAT (e.g. stage 3 row 0: S = 30 / 40 / 42; the fitted row: 28 first vs 25 / 23 later). S follows the CPU time the main loop spends before the task (a CPU phase, D4 `scanline-split-line`). No rule keyed by row and body class reproduces it. | `ord149-xs-split.json` |
| B1 residual explained | Rule: a row differs on screen exactly when the ROM S differs from the renderer's single fitted split (lines <= 28 at stage 3, `data[1]` 4 -> 5) **and** reaches line 27 (prep30 §1.4: SHUCKLE exact at every S <= 26). This predicts scan93's gate-lifted (patch B) residual rows **exactly on 6 / 6 NUZLEAF->SHUCKLE bodies**, in count and in displayed age (write row + 1): first 0; xs-1 3 (95 / 98 / 101 = span 95..101); xs-2 1 (98); qa-2 2 (95 / 98); qa-0 2 + 16 lag; qa-1 5 + 16 lag (98..117). | `ord149-xs-predict.json`, `ord149-xs-join.json` |
| **B2** | **Honest negative: no patch banked.** No source-derived rule makes the later bodies 0 px on every row. The remainder is §3. | — |

## 1. Part A: Astonish 310

### 1.1 Source (prediction, `ord149-prediction.md`)

`Move_ASTONISH` (battle_anim_scripts.s:9411) runs as follows:
- the lunge controller (`Cf;D0`);
- then two `gSprayWaterDropletSpriteTemplate` droplets, created in one frame (`Cff`, droplet 1 = the lower slot), both at the TARGET's
  `(X, Y + 32)`.

`AnimSprayWaterDroplet` draws `v1 = Random2() & 0x1ff`, then `v2 = Random2() & 0x7f`, per droplet. Only `v2` enters y:
- `data[1] = 896 +/- v2`;
- each step does `y2 -= data[1] >> 8; data[1] -= 32`;
- the 31st step destroys the droplet.

The last `SortSprites` before the same-frame destroy sees 30 steps. With equal priority words, the larger `oam.y` goes first, and equal keys
never swap. The rise difference is monotone (every term has one sign), so the pair leaves in ascending rise order, and ties leave in
creation (lend) order. The production cursor sorts a `D` group by its `P` words, with ties by F index at creation. So the law is
`D1,2/P<rise1>,<rise2>`.

### 1.2 ROM (`ord149Probe.py` / `ord149Extract.py` / `ord149Check.ts`)

The probe set has 18 jobs:
- both sides;
- (attacker, target) pairs Loudred -> Onix, Snorlax -> Golbat, Golbat -> Snorlax;
- lab seeds 0 / 7 / 11;
- three turns.

Every job ran A / B in fresh processes, in two batches. Per body, `rise = oam.y(creation row) - oam.y(the row before the destroy)`, plus 3:
the creation row already shows the first step, which is 3 px for every word. Every observed rise is one of the 8 classes. The
law's text is exact per window on all 36 bodies. plans69's "flips with the lab seed" are the rise order.

### 1.3 The patch (`ord149-astonish-words-unit.diff`)

- `src/engine/wordsOrderUnits.ts`: `WORDS_ORDER_UNIT_MOVE_IDS` = `[28, 189, 240, 260, 291, 301, 310]`. 310 is already in
  `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`, the shadow's license.
- `src/engine/liveMoveAnimation.ts`:
  - `liveAstonishDropletRise(v2)`;
  - `liveAstonishWordsPlanText(words)`: 4 words, else null;
  - `liveAstonishWordsPostFree(activationFree, words)`: the plan applied with the production cursor, as `liveDiveWordsPostFree`;
  - a carry branch before the dirt branch in `liveWordsOrderDeferredCarry`. It is species-free, because both droplets start at one point.
- No host change. `markLiveSpriteOrderDeferredBody` already records a marker for every `DEFERRED_LEND_MOVE_IDS` body. The body's own event keeps
  it only when the tracker goes unknown, i.e. only for `310:player`, which has no row. The `310:opponent` row stays the known path, so
  opponent behaviour is unchanged.
- The adapter words are the same 4 presentation words the live Astonish adapter already draws (`liveMovePresentationRng.ts` 310).
  In the window checks, audit20Check pins the host at the ROM `gRng2Value`. So the after-body lends compare with ROM directly.

### 1.4 FINDING (pre-existing, not this patch): the `310:opponent` row is a tied-word row

`Cf;D0;Cff;D1,2/P537,537` (prep45) says "lend order". It is exact on 8 / 18 opponent bodies. The census counts those commands as live,
but whenever the rise order disagrees with the lend, the free order after the body is wrong. The fix is the same words unit for both sides:
- drop the `310:*` keys from the table (`spriteOrderProductionTable.ts` rows / prep45 verify map);
- re-run the census.

That changes opponent lends (not statuses), so it was kept out of this step's "body-310 only" delta.

## 2. Part B: Extrasensory 326 player later bodies

The gate is at `liveMoveAnimation.ts:4260` at this base (case 326): `!spriteOrderInput.firstBody && attacker.geometry.side !== "opponent"`.

### 2.1 Instrument (`ord149XsLineProbe.py`, the scan93 resume condition)

The probe steps every frame of a 326 body instruction by instruction. Inside `AnimTask_ExtrasensoryDistortion_Step`:
- the write loop's head PC is the PC seen exactly `data[15] - data[14] + 1` times;
- the k-th hit writes line `L = data[14] + k`;
- REG_VCOUNT and DISPSTAT's HBlank bit are recorded at that moment.

Line L is HBlank-DMA'd in the HBlank of line L - 1. A write at VCOUNT `v < 160` therefore shows on this frame only if `v < L - 1`, or if
`v == L - 1` and the HBlank has not started yet. Otherwise line L still shows the previous row's word. Routes: scan93's
`xs-pla-nuzleaf-shuckle-{xs,qa}` and `xs-pla-espeon-crobat-xs` (3 bodies each).

### 2.2 What the ROM does

- The task always runs in the scanout: entry VCOUNT 0..38 (648 write rows).
- First bodies split too. They are exact only because SHUCKLE's monbg content starts below line 26 (prep30 §1.4), except at the one row the renderer
  already fits (S = 28).
- In later bodies, S moves row by row: up to 40 / 42 at stage 3 row 0, 31 at stage 3 row 7, and 25 / 23 at the fitted row.
- Player-target bodies (window 48..112) never show a previous-row line.

### 2.3 Why no patch

S is not keyed by (stage, row) across bodies (7 / 72, 7 / 72, 0 / 72). It is the main loop's CPU load before `RunTasks` reaches the
task: other tasks, sprite callbacks and the battle controller. Production does not model that. The per-row rule in §Results (B1 residual
explained) proves that the split is the whole residual on the SHUCKLE class. It does so only with the ROM's S as input, and that input is
not available to production. CROBAT (elevation 6) additionally carries prep30's wrong generated window (8 / 72 vs the ROM 2 / 66).

## 3. Exact remainder (Part B)

These numbers come from scan93's committed patch-B dense windows (`fixtures/scan93/check-B.json`), now explained row by row:

| window (player later Extrasensory) | residual | rows | cause (this step) |
|---|---|---|---|
| NUZLEAF -> SHUCKLE `xs-1` / `splash-1` / `psywave-1` | 55 px each | 3 (95, 98, 101) | ROM S = 28 / 25 (fitted 28) / 31 |
| `xs-2` / `splash-2` / `psywave-2` | 16 px each | 1 (98) | ROM S = 23 at the fitted row (renderer 28) |
| `qa-2` | 18 px | 2 (95, 98) | S = 27 / 24 |
| `qa-0` / `qa-1` | 298,066 / 298,102 px | 2 / 5 split + 16 lag rows 143..158 | split as above; the lag rows are patch B's player-later lag policy (`event`) against a measured `no-event` |
| ESPEON -> CROBAT `qa-0` / `xs-1` | 9,825 / 11,293 px | 69 (43..117) | the split (S 4..41 per row) plus prep30's generated-window error for elevation 6 |

The census bucket is unchanged at 23 commands / 3,772 frames on 0..999 (`later-body (order lend not a first body)`, 11 battles).

## 4. LANDING RECIPES

### Part A (land step; presentation only)

1. Apply `tools/integration/fixtures/ord149/ord149-astonish-words-unit.diff` (2 files). If line drift breaks the patch, the edits are
   self-contained:
   - the 3 functions go before `liveDiveWordsPostFree`'s doc line;
   - the carry branch goes immediately before `const dirt = …` in `liveWordsOrderDeferredCarry`;
   - add 310 to the list.
2. Apply `ord149-fold-test-pins.diff` (`tests/land87WordsOccupancyReseed.test.ts`: the words-list pin gains 310). With it, the 5 words-unit
   test files pass in the patched copy: land87 8 / 8; wordsOrderDeferredLend, ice72, land86 and prep65 unchanged.
3. Tests to add (`tests/ordl149AstonishWordsUnit.test.ts`):
   - `liveAstonishWordsPlanText` on each receipt body's words reproduces `ord149PlanText(rise1, rise2)`, and is exact per window on the 36
     bodies of `ord149-units.json`. Use `ord149CheckUnit`; the rises come from `v2` via `liveAstonishDropletRise`, which equals
     `ord149DropletRise`.
   - `liveAstonishWordsPostFree` returns null without 4 words.
   - A `310:player` body marks and defers; a `310:opponent` body drops its marker (known row).
   - Revert experiment: the static `D1,2` text fails 21 / 36.
4. Re-run `ORD149_PARTS="census windows" sh tools/integration/ord149Run.sh <dir>` on the landed tree. Use `git archive HEAD` with the diff
   reversed as the base arm, as ordl126 did. Expect +6 / +983, lend unknown 19 / 3,667 -> 14 / 2,755, 0 regressions, and windows 26 / 26
   lend == ROM.
5. Accounting (`docs/live-share-census.md`): headline on this base 27,075 -> 27,081 commands, 4,138,675 -> 4,139,658 frames. Lend
   unknown 19 / 3,667 -> 14 / 2,755. Residual lend unknown: Hyper Beam `63:player` 12 / 2,229 and the battle-355 summary 2 / 526.
6. Optional follow-up (§1.4): extend the words unit to `310:opponent` by dropping its table row, with its own census delta. The
   opponent lends then follow the rises (8 / 18 -> 18 / 18 exact).

### Part B (nothing to land)

- Keep the gate.
- Record in the ledgers: "Extrasensory player later bodies: the per-row scanout split S is a CPU phase (ord149 B1: not keyed by
  stage/row across bodies; it explains scan93's residual rows 6 / 6). Open under D4 only: ship patch B with documented split rows
  (+12 commands, scan93) or keep the decline."
- A renderer could take S per row only from a cycle model of the main loop. That is out of scope.

## 5. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/ord149Run.sh .integration/validation/<fresh>                       # everything, ~9 min
ORD149_PARTS="a1 windows b1" sh tools/integration/ord149Run.sh .integration/validation/<fresh>   # ~2.5 min
ORD149_PARTS="census" sh tools/integration/ord149Run.sh .integration/validation/<fresh>          # ~5.5 min
ORD149_TYPECHECK=1 ...                                                                    # + npm run typecheck in the patched copy
```

Each run builds git-archive copies of `1c801184b` (base, and base + the diff), then:
- A1: probes x2 (`same units`), then the check;
- census: x2 copies, attribution, `ord149CensusDelta.py`, `land82CensusCheck.py`;
- windows: `ord149Stage.py`, audit20Probes x2, lends in both copies (r1 == r2), aud110Align, audit21Check / stf115Summary;
- B1: `ord149XsLineProbe.py` A / B on 3 routes, then split / join / predict.

Every receipt prints `same` / `DIFF` against `tools/integration/fixtures/ord149/`. Two fresh runs (`a1 windows b1`, `census`) printed only
`same`.

Tests: `tests/ord149AstonishExtrasensory.test.ts` (hermetic; committed receipts).

Tools:
- `ord149Probe.py`, `ord149Extract.py`, `ord149Check.ts`, `ord149Stage.py`, `ord149CensusDelta.py`, `ord149XsLineProbe.py`,
  `ord149XsSplit.py`, `ord149XsJoin.py`, `ord149XsPredict.py`, `ord149Run.sh`.
- Reused: `prep43Probe` / `prep43Extract`, `plans69Probe.scenario`, `stg107Census.sh`, `hist73Merge.py`, `ord124Attribution.py`,
  `land82CensusCheck.py`, `audit20*`, `aud110Align.py`, `stf115Check.sh` (audit21Check), `stf115Summary.py`, scan93 scenarios / check-B.
