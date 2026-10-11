# S10A flat84: Flatter 260 as a words-order unit (evidence + temp patch; banked for landing)

Bounded main-lane worker, evidence only, new files only. Base: master `b05d384ca` (production src `4c4fe4c7`). Every measurement ran on
git-archive copies of `b05d384ca` in the scratch dir: `base`, and `patched` = base + `tools/integration/fixtures/flat84/flat84-temp-src.diff`.
The checkout's tracked files never changed. Direct mGBA only (Scene ON), never the shared HTTP oracles. Lab seeds are explicit (ISSUES
#154): 305420349 for the flat84 scenarios, 305419897 (words57Probe `LAB_SEED`) for the KO chain job. Every probe ran twice fresh, with both
runs in one batch. Receipts: `tools/integration/fixtures/flat84/`. Runner: `tools/integration/flat84Run.sh <fresh-out-dir>`.

## Results

- **The plan comes from the words: plan == ROM endOrder on 47 / 47 Flatter bodies.**
  - Coverage: 23 player and 24 opponent bodies; 14 first bodies and 33 later bodies, 12 of them a Flatter directly after a Flatter
    (`ff-*`); 33 distinct activation `gRng2Value`s, 34 distinct post-body orders (`plan-check.txt`).
  - The KO chain's Flatter body is also exact (`ko-chain/chain.txt`: `post true`).
- **The production lend == the ROM activation free order for 61 / 63 consumer windows in the patched copy** (`lends-patched.txt`). Base: 18 / 63
  (`lends-base.txt`, where every lend after a Flatter is null).
  - 45 patched lends are deferred Flatter-unit lends resolved at the render seam: Flatter ×31, Mega Drain ×4, Water Pulse ×6, Spark ×2,
    Quick Attack ×2.
  - The 2 non-matching rows (`ko-water-pulse-ply-c3` / `-c4`) are a limit of the flat77-style fixture history, not a production result.
    `flat84Fixtures.py` derives turns from animation bodies only, so the faint / party-summary / send-out units between the KO and the
    next turn are missing.
  - The same shape is **EXACT** in the words57 / ice72 KO chain (`ko-chain/`): the Flatter carry, then the production replay through faint +
    summary + send-out (+ a second faint). That covers 207 / 207 windows and 14,841 frames with 0 mismatches. **9 / 9 consumers** match,
    8 of them past the battle units (Water Pulse ×3 and the sent-out LICKITUNG's Tackle ×5 + 1). r1 == r2 on every artefact.
- **Windows through the PATCHED production live renderer** (`check/`, `summary.txt`): 63 windows, 59 live, two fresh probe processes per scenario.
  - **37 / 37 after-a-Flatter windows: 0 px on every row, r1 == r2.** By consumer: Flatter 28 (12 `ff`, 16 in consumer scenarios), Mega Drain 4,
    Spark 2, Water Pulse 2, Quick Attack (opponent) 1. Both sides.
  - The 13 first-body controls are also 0 px.
  - Residuals that do not come from the Flatter unit:
    - Player Quick Attack 98 (NIDORINA → NIDORINO): 14,223 px at ages 14..32, in the target box (ROM `f7f7ff` vs live `bd63bd`). The value is
      identical at the turn-0 FIRST body (no Flatter before it), after a Flatter, and with the entry lend. So it is a **pre-existing Quick Attack
      residual for this staging**, independent of the lend (see "Open").
    - The 7 `ko-*` windows: px only in healthbox glyphs. The opponent / player level digit is at (89..93, 21..25) / (211..215, 79..83), and the
      sent-out EXPLOUD's gender symbol is at (55..59, 21..28). The fixture view assumes level 50 and the leads' genders (the ROM has a level-30
      NIDORINO and a female 372). This is a harness field-profile limit. The move-body rows are otherwise exact.
  - 4 declines, unchanged: a Flatter after Tackle 33. The allocator history is unknown because Tackle is not net-zero (flat77's shape).
- **Census seeds 0..999** (`census/`): 10 shards per side (`--seeds=100k..100k+99 --index-from=100k`), merged with `hist73Merge.py`, delta with
  `prep43CensusDelta.py`, gates from `flat84CensusCheck.py`.
  - **+44 commands / +6,401 frames**: by count 25,809 → 25,853 = 93.79 % → **93.95 %**; by frames 3,848,512 → 3,854,913 = 97.37 % →
    **97.54 %**. The base equals master's day-final census.
  - Identity: **0 live → fallback**, 0 pairing mismatches. The command KEY sequence (battle, kind, moveId, side, attacker, target), frames per
    command, all 10 shard `battleDigest`s and `battleDigestExcludingFrames`, and the `commandKeyDigest` `26489b387dcfa50e` are identical. 0 render
    throws.
  - Gained by move: Water Pulse 15, Mud-Slap 11, Flatter 8, Dive 2, Silver Wind 2, Mega Drain / Petal Dance / Psywave / Spark / Pursuit /
    Grudge 1 each.
  - Gained by BEFORE decline: "unclassified (case-local gate)" 29 / 4,067; "no EXACT plan: body 260:opponent" **10 / 1,570** and
    "body 260:player" **3 / 556** (both stops → 0); "branch-local gate" 2 / 208.
  - Flatter 260: 34 commands; fallback 17 / 3,723 → **9 / 1,971**. The 9 remaining are all at the case-local gate, in battles 94, 446, 673,
    735 and 802: an unknown lend or allocator history, e.g. battle 446's unaudited predecessor (flat77).
- **ON / OFF parity** (`parity-735.json`, `parity-936.json`; `flat77Parity.ts` in the patched copy). Both are census battles with lifted
  Flatter-unit commands:
  - battle 735 (seed 735, streak 0; 4 Flatter + 7 Water Pulse + 7 Mud-Slap lifted): 34 action-menu boundaries;
  - battle 936 (seed 936, streak 6): 25 boundaries.
  - RNG, rules and boundary are equal at every boundary.
- **Test pins: none move.** The 24 related test files (`tests-related-files.txt`: words-unit / deferred-lend / order-host / Flatter tests)
  pass on the patched copy: **24 files, 199 tests, 0 failed** (`tests-patched-summary.txt`).

### Plan == ROM (`plan-check.txt`; the vectors with full orders are in `flatter-vectors.json`)

| scenarios | side | first bodies | later bodies | after a Flatter | plan == ROM |
|---|---|---:|---:|---|---|
| ff-nidorina-nidorino-{ply,opp}, ff-nidorino-nidorina-{ply,opp} (4 cycles) | both | 4 | 12 | every later body (Flatter + STATS_CHANGE 18 + Status_Confusion ± self-hit) | 16 / 16 |
| c-{tackle,quick-attack,water-pulse,mega-drain,spark}-{ply,opp} (3 cycles) | both | 8 | 20 | every later body (the consumer's body in between; the c-quick-attack first Flatters follow a Quick Attack) | 28 / 28 |
| ko-water-pulse-{ply,opp} (5 cycles) | both | 2 | 1 | the later one | 3 / 3 |
| **total** | 23 player / 24 opponent | 14 | 33 | | **47 / 47** |

(First = the activation free order is the known entry order; later = any other, i.e. after at least one move body.)

### Windows (`summary.txt`; rows = the adapter's rows; px = run 1, r1 == r2 = the per-row digests of two fresh probe processes)

| windows | side(s) | consumer | before it | live (patched) | rows | px every row | r1 == r2 |
|---|---|---|---|---|---:|---:|---|
| ff-*-c1..c3 (12) | both | FLATTER | Flatter (+ STATS_CHANGE / confusion) | yes (deferred lend) | 219 | **0** | yes |
| c-*-c2.. Flatter (16) | both | FLATTER | the consumer's body after the previous Flatter | yes (deferred lend) | 219 | **0** | yes |
| c-mega-drain-{ply,opp}-c1, c3 (4) | both | MEGA_DRAIN | Flatter + STATS_CHANGE + confusion | yes (deferred lend) | 218 | **0** | yes |
| c-water-pulse-{ply,opp}-c1 (2) | both | WATER_PULSE | same | yes (deferred lend) | 160 | **0** | yes |
| c-spark-{ply,opp}-c1 (2) | both | SPARK | same | yes (deferred lend) | 115 (age 0 = activation + 9) | **0** | yes |
| c-quick-attack-opp-c2 (1) | opponent | QUICK_ATTACK | same | yes (deferred lend) | 33 | **0** | yes |
| first-body controls (13) | both | FLATTER ×12, QUICK_ATTACK opp ×1 | none | yes (as before) | 219 / 33 | **0** | yes |
| c-quick-attack-ply-c0, c2 (2) | player | QUICK_ATTACK | none / a Flatter | yes | 33 | 14,223 (pre-existing; same at the first body and with the entry lend) | yes |
| ko-water-pulse-* (7) | both | FLATTER / WATER_PULSE | first / Flatter / + KO + send-out | yes | 219 / 160 | 10 / 24 per row in healthbox glyphs only (fixture level / gender) | yes |
| c-tackle-*-c1, c2 (4) | both | FLATTER | Tackle (+ a Flatter) | no: allocator history unknown | - | fallback | yes |

## Derivation (source; `predictions.md`)

- **Creation.** Move_FLATTER (`data/battle_anim_scripts.s:8412`) runs 19 `call CreateFlatterConfetti` with no delay, which makes 38 confetti.
  Each takes the lowest free slot, after the spotlight and the second vertical dip. Each draws three Random2 words
  (AnimFlatterConfetti, `battle_anim_effects_3.c:3033`):
  - word 1: the tile offset;
  - word 2: x speed `data[0] = 0x5e0 ± (w & 0x1ff)`;
  - word 3: y speed `data[1] = 0x480 ± (w & 0xff)`.
  - The ROM spreads the creations over three frames (14 / 15 / 9: the KO chain's ROM windows `Cf;Cf;Cf;D1;C×14;C×15;C×9;D2;D…`), and the
    adapter already models this.
- **Destruction.** AnimFlatterConfetti_Step destroys each confetti on `++data[3] == 31`, so all 38 free in ONE window.
- **Order.** SortSprites, a stable insertion sort on (priority, subpriority, y), runs every frame. It permutes the live confetti by their y
  (word 3). Freed entries carry one dummy key, so they keep the order of their last live frame.
- **=> A words-order unit.** The post-body free order is a function of the activation free order and the 114 words. It is exactly the order
  the production Flatter adapter already carries for its own pixels: `liveFlatterHardwareOamRows`, `carryLiveSpriteOrder` +
  `sortGbaSpriteOrder`, at its last row (218), minus the known-entry occupied slots.
- **Species.** Battler sprites are live entries, and a stable sort never reorders two free entries, so the value does not depend on the
  species. The carry still reads the body's species for the adapter's inputs (anchors, palettes), as Ice Ball's does.

## The temp patch (`flat84-temp-src.diff`, 3 files, +52 / -4; cut against `b05d384ca`, src `4c4fe4c7`)

1. `wordsOrderUnits.ts`: `WORDS_ORDER_UNIT_MOVE_IDS` = `[28, 189, 240, 260, 291, 301]`. `DEFERRED_LEND_MOVE_IDS` follows, so a Flatter body
   arms the word-free deferred marker and ANY later consumer takes it (`lendLiveSpriteOrder`).
2. `liveSpriteOrderHost.ts`: `markLiveSpriteOrderDeferredBody` records `bodySpecies` for 260 too.
3. `liveMoveAnimation.ts`:
   - new `liveFlatterWordsPostFree(unit, activationFree, words, bodySpecies)`, which builds `liveFlatterInputs` at the body's species, words
     and activation order, takes `animationInputsAt(FLATTER_ROWS - 1).spriteOrder`, and drops the occupied slots;
   - `liveWordsOrderDeferredCarry` routes 260 through it. Without `bodySpecies` it declines.
   - The render seam's generic `resolveWordsOrderLend` resolves the marker for every consumer, and `LIVE_WORDS_ORDER_DEFERRED_REPLAY`
     replays the ROM-checked battle units after it.
4. **Flatter's case-local gate needs no narrowing**, as predicted (P3). After a Flatter, the resolved lend is `known` without `firstBody`.
   The allocator host stays known: Flatter is the land79 / flat77 net-zero history-claim move, and STATS_CHANGE / Status_Confusion are
   audited net-zero. So `!known || (!firstBody && !historyKnown)` already admits a Flatter after a Flatter. A resolved lend makes the
   command a per-command D3 faithful-random history claim, as for the other words units.

Gameplay, RNG, damage, turn order and facility state are untouched. The words come only from the presentation host. The census key
sequence and battle digests are identical, and so is ON / OFF parity.

## FOLD INSTRUCTIONS (next round)

1. **The patch.**
   - First check that `git diff b05d384ca -- src/engine/wordsOrderUnits.ts src/engine/liveSpriteOrderHost.ts src/engine/liveMoveAnimation.ts`
     is empty. If not, re-cut the three hunks by hand: they are small and self-contained.
   - Then `git apply tools/integration/fixtures/flat84/flat84-temp-src.diff`.
2. **The pins: none move.** The 24 related files pass on the patched copy (199 tests).
3. **Add a Tier-1 test** (e.g. `tests/flat84FlatterWordsUnit.test.ts`). It must fail without the src hunks:
   - membership: `WORDS_ORDER_UNIT_MOVE_IDS` / `DEFERRED_LEND_MOVE_IDS` include 260;
   - plan == ROM on the 47 vectors of `fixtures/flat84/flatter-vectors.json`. For each row, call `liveFlatterWordsPostFree({ attackerSide },
     activationFree, words, bodySpecies)`, where `words` = `liveMovePresentationRngWords` of `createPresentationRngHostAt(
     createPresentationRngState(rng2, "pinned"))` activated for `battleMoveAnimationRequest(attacker, target, ["260","0","0","0","70","0"])`
     (`flat84Plan.ts`). Assert `== romPostFree`;
   - a Flatter marker records `bodySpecies`; a species-free 260 marker declines (null lend);
   - a Mega Drain / Water Pulse consumer after a Flatter marker gets the resolved lend. Use `fixtures/flat84/fixtures/c-mega-drain-opp-c1.json`
     with its `lends-patched.txt` row (`same: true`), or the KO chain vectors `ko-chain/lend-vectors.json`.
4. **Census expectation** (seeds 0..999 relative to a base whose Flatter / 260-stop rows equal `b05d384ca`'s): **+44 commands / +6,401
   frames**, 0 regressions, key sequence + both digests identical. `census/census-check.txt` lists the gains by move and by BEFORE decline.
5. **Parity routes:** `flat77Parity.ts --seed=735 --streak=0` and `--seed=936 --streak=6` (== `parity-*.json`).
6. **Gates:** smoke, full `npm test`, `npm run build`, typecheck, the differential, the census, parity.
7. **Ledger wording.** "Flatter 260 is a words-order unit (flat84): its post-body free order is the adapter's own carried order at its words
   (plan == ROM 47 / 47). Any consumer after a Flatter takes the resolved deferred lend (lends == ROM 61 / 63 fixtures, the 2 others are a
   fixture-history limit, EXACT in the words57 KO chain 9 / 9). 37 / 37 after-a-Flatter windows 0 px. D3 faithful random history."

## Protocol notes (what was committed when)

- **Batch 1.** The plan and predictions (`predict-plan.txt`, `predict-lends.txt`, `predictions.md`) were committed in `37e176b89`, before any
  comparison. `flat84Plan.ts`'s predict mode never reads `endOrder`. The lend predictions are the production columns of the LENDS_ONLY pass,
  extracted and committed before its `same` / `rom` columns were read.
- **Batch 2** (`ko-water-pulse-*`) was staged after batch 1's comparison. Its predictions were committed in `381b3d2eb` before its comparison.
- **KO chain.** `ko-chain/predictions-v1.json` (`2f2a4e85c`) came from the ice72 walker before one tool fix. That walker mapped every
  unlabelled body to the accuracy −1 stat animation, so Flatter's Status_Confusion bodies (`Cfffff;D1,2,0,3,4`) were mis-modelled, and its
  first check showed 3 consumer mismatches.
  - The fix maps those bodies to the production `status-animation CONFUSION` unit (`flat84KoChain.ts`). It is a tool fix, not production.
  - `predictions.json` is the corrected walker's output, written AFTER the v1 comparison. It then checked EXACT.
- **Spark windows.** The first window check started at the ROM activation. The Spark adapter's age 0 is activation + 9 (`case 209`; spark62),
  so `flat84Fixtures.py` now sets Spark windows to activation + 9 .. + 123, found by `bodyStartFrame`. Lends are unaffected.

## Open (not lifted / not proven here)

- **Player Quick Attack 98 residual (pre-existing, not Flatter):** 14,223 px at ages 14..32 in the opponent box, at the FIRST body of
  `c-quick-attack-ply` (NIDORINA → NIDORINO, lab seed 305420349) and identical with the entry lend.
  - Where it is: the rows of `AnimTask_ShakeMon` on the target (`delay 4` then the shake). The bbox alternates x 152 / 157, with 636..639 px
    per row on ages 14..23, then a constant 872 px on ages 24..32. The ROM shows background (`f7f7ff`) where live draws the NIDORINO
    (`bd63bd`), i.e. a target-shake offset or phase difference.
  - A candidate for an ISSUES entry: a first-body player Quick Attack on an opponent NIDORINO renders this in production today.
- **The player-side KO** (the player's Flatter target faints): `ko-water-pulse-opp` stalls at the forced party menu, because the probe
  trace has no menu input. Only the opponent-side faint + summary + send-out is proven here.
- **The 9 remaining census Flatter fallbacks** sit at the case-local gate (an unknown lend or allocator history). An allocator audit of
  their predecessors (Tackle-like; flat77 resume) is the next step.
- **Not done:** an ice72-style chain predictor.

## Rerun

    sh tools/integration/flat84Run.sh <fresh-out-dir>      # ~8 min; FLAT84_CENSUS=1 (+ ~10 min), FLAT84_TESTS=1 (+ ~6 min)
    python3 tools/integration/flat84Stage.py <dir>         # == fixtures/flat84/scenarios
    sh tools/integration/flat84Probes.sh <dir>             # 16 scenarios x2 fresh (flat77Probe.py), r1 == r2
    python3 tools/integration/flat84Fixtures.py <dir>/r1 <fx>
    node --experimental-strip-types --no-warnings tools/integration/flat84Plan.ts <dir>/r1        # in the PATCHED copy (FLAT84_PREDICT=1: plan only)
    FLAT77_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/flat77Check.ts <fx> <scenario> /dev/null
    node --experimental-strip-types --no-warnings tools/integration/flat84Check.ts <fx> <scenario> <out.json>   # PATCHED copy, 2 fresh probes
    python3 tools/integration/flat84KoProbe.py <dir> && python3 tools/integration/flat84KoExtract.py <dir> <dir>/units.json
    ICE72_OUT=<dir> node --experimental-strip-types --no-warnings tools/integration/flat84KoChain.ts <dir>/units.json <out.json> <vectors.json>
    sh tools/integration/flat84Census.sh <base-copy> <patched-copy> <out>                          # census 0..999, 10 shards each
    node --experimental-strip-types --no-warnings tools/integration/flat77Parity.ts --seed=735 --streak=0 --out=p.json  # PATCHED copy
