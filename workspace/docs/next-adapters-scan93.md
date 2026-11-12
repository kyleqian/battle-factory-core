# S10A scan93: scanline-buffer history for later Extrasensory 326 / Memento 262 bodies (side lane, evidence only)

Base: master `a444b39ef` (production src `a9290e8d`). This lane adds new files only. The production change is a **temporary patch**,
applied only to git-archive copies under `.integration/validation/`. Every ROM number comes from independent direct-mGBA
`prep48Probe.py` processes (Scene ON), never the shared HTTP oracles. Every scenario carries an explicit lab `"seed"` (ISSUES #154).
Each one ran twice fresh in one batch: r1 == r2 byte-identical, 22/22. Every window then ran through the PATCHED production renderer
(`liveAdapterFramebuffer.ts`) in two more fresh probes each, and the two digests agreed.

## Results

1. **The history is exact.** At 67/67 activations where the fold says the history is known, the RAM `gScanlineEffect` plus both
   320-word `gScanlineEffectRegBuffers` banks equal the prediction. The prediction was committed before any probe ran.
   - The comparison is canonical up to the intro's bank relabel (below).
   - 57/67 also match without the relabel.
   - The 36 activations after a Memento or a Dragon Dance are *invalidated*: the fold says unknown, and consumers decline.
   - Receipt: `tools/integration/fixtures/scan93/history-receipt.json`.
2. **The history is display-neutral.** All 28 later windows were rendered a second time with the history replaced by the first-body
   S0 entry. The live renders are byte-identical (same per-row live hashes) in 28/28 windows: `check-control-s0.json`.
   - Extrasensory's init rewrites lines `lo..lo+64` of both banks before the first HBlank DMA.
   - Memento's init rewrites lines 0..111.
   - So the entry lines a later body could display are always its own. Lines outside the window lie outside the monbg layer's content.
3. **Memento later bodies (patch A): exact.** 5/5 later windows are 0 px on all rows (175 / 180 / 182 rows), both runs, both sides.
   The predecessors are a Quick Attack, a Psywave, and an Extrasensory of the other side.
   - Gate: the history is known (no unmodelled writer since the battle start) and both battlers' front-idle rests are {0,0}.
   - Why the rest condition: `mem-pla-weezing-onix-qa-0` (opponent ONIX, rest x2 1) costs 194,914 px on every row. ONIX's own Quick
     Attack resets its x2 to 0 in RAM, but production's x2 tracker still lends the rest. That is an x2-tracker gap, not scanline;
     see `check-v1.json`.
   - **Census +4 commands / +713 frames.** This is exactly the assigned "Memento 262 player later body 4 / 713".
4. **Extrasensory player later bodies: a precise negative (patch B quantifies it).** The residual is the scanout split CPU phase
   (prep30 §1.4, D4 `scanline-split-line`), **not history**. Point 2 proves this: the history-fed and S0-fed renders are identical.
   - The split measured `event` in **11/11** player later windows. It was `no-event` in the first bodies (4/6, prep30).
   - NUZLEAF → SHUCKLE: **16..55 px on 1..5 rows within 95..117**.
     - Lag windows under the B lag policy: 16 / 55 / 18 px on rows 98 / 95..101 / 95..98.
     - No-lag windows (patch v1, `check-v1.json`): 18 px on rows 95..98 and 54 px on rows 98..117.
   - ESPEON → CROBAT, elevated target, window lines 2..66: **9,825 / 11,293 px on 69 rows 43..117**. This is the same class as the
     prep30 first-body CROBAT P alternate (11,551 px).
   - No constant split S is exact (prep30 sweep), so production cannot render the dominant later phase. Under D4 ("zero residual on
     every window in the selected dominant phase") **player later bodies stay declined in patch A**.
   - Patch B shows what shipping S = 0 with the split rows documented would give: **+16 commands / +2,657 frames**. That is Memento 4
     plus Extrasensory player later 12; the "later-body" stop goes from 27 to 10 + 1. B also adds a measured player-later lag phase:
     task row 142 lags in 9/11 player later windows, policy `event`, the same shape as d4later's opponent-later entry. That makes body
     rows 162, so the census frames rise by 23. This is a D4 policy decision for the supervisor / user.

### Source table: every scanline writer reachable in a Factory battle (`fixtures/scan93/source-table.json`)

| script | code (pret) | Factory sets | banks written | inputs | state at its end | scan93 |
|---|---|---|---|---|---|---|
| battle intro | battle_main.c:645-659, battle_intro.c:217-499 | every battle | both (init); srcBuffer only (slide) | constant | **S0**: one bank = 80 × +2, 80 × −2, zeros; the other = zeros; state 0, BG3HOFS. Measured in BOTH relabelings: srcBuffer 1 with ±2 in bank 0 (18 scenarios), or srcBuffer 0 with ±2 in bank 1 (the 4 `mem-pla-weezing-onix-*` scenarios; r1 == r2) | entry |
| Move_EXTRASENSORY | battle_anim_psychic.c:954-1040 | 3 (EXPLOUD, NUZLEAF, STANTLER) | both | target side (BG1 / BG2HOFS); opponent target y = 40 − enemy elevation, player target y = 80; `32 − (x + x2)`; no Random | lines lo..hi = stage-2 step-23 values in both banks; srcBuffer parity unchanged (3 × 24 active VBlanks); state 0 | **modelled** |
| Move_MEMENTO | battle_anim_dark.c:440-765 | 1 (WEEZING) | both (inits, lines 0..111); srcBuffer bank per frame | sprite coords, TOP attr, BG rank, BG Y | lines 0..~112 = the last two shadow frames (one per bank); BG1 / BG2VOFS | invalidates |
| Move_DRAGON_DANCE | battle_anim_dragon.c:340-420 | 22 | both (init); srcBuffer bank per frame | attacker side / elevation / BG X, parity | attacker window (65 lines) | invalidates |
| Move_RAPID_SPIN | battle_anim_effects_3.c:1800-1880 | 1 | both | attacker coords | attacker band | invalidates |
| Move_ACID_ARMOR | battle_anim_effects_3.c:3330-3420 | 4 | both + srcBuffer bank | attacker coords, sine | 32-bit band | invalidates |
| Move_DIG | battle_anim_ground.c:458-494 | 26 | both | attacker band | band and below | invalidates (its own Dig lend is unchanged) |
| Move_SURF / MUDDY_WATER | battle_anim_water.c:814, 959-1018 | 68 / 0 | both + srcBuffer bank | wave sprite y per frame | two-level window | invalidates |
| Move_SPITE | battle_anim_ghost.c:660 → ScanlineEffect_InitWave | 2 | both (wave task) | target y | sine band | invalidates |
| Move_SKETCH | battle_anim_effects_2.c:2410-2470 | 0 | both | target coords | target band | invalidates |

Psywave 149 is **not** a writer. It has no scanline call, and the measurement agrees: Memento after Psywave sees S0 on both sides.
No General_ / Status_ / Special_ battle script writes the buffers.

### The history: design and prediction == RAM (`tools/integration/scan93History.ts`, production port `liveScanlineHistory.ts` in the patch)

- **Carried state**: the attacker sides of the Extrasensory bodies since the battle began, or null (invalidated). It lives in the order
  host (`LiveSpriteOrderHost.scanline`) and is lent as `LiveMoveSpriteOrderInput.scanlineHistory` on later lends.
- **Invalidated by**: an unmodelled writer's move-animation (262, 349, 229, 151, 91, 57, 330, 180, 166); a party menu; a skipped
  resolution ("previous resolution not fully applied"); a faint / switch-out / switch-in / send-out once the list is non-empty, because
  the window is the then-current target's.
- **Value**: S0, folded through `scan93AfterExtrasensory` with the current species of each side. Canonical srcBuffer is 1.
  `(s, [b0, b1])` and `(s ^ 1, [b1, b0])` display identically, because every HBlank DMA reads `banks[srcBuffer]` and then flips.
- It reads only presentation inputs and never touches gameplay or RNG.

| predecessor class (bodies at activation) | activations | prediction == RAM (canonical / exact) | RAM (canonical srcBuffer 1) |
|---|---|---|---|
| battle start (intro residue) | 22 | **22 / 18** | S0; 4 relabelled (`mem-pla-*`) |
| non-scanline bodies only (Quick Attack, Splash, Psywave) | 7 | **7 / 5** | S0 |
| after a player Extrasensory (+ non-scanline) | 18 | **18 / 18** | 65 lines differ (opponent-target window), BG1HOFS |
| after an opponent Extrasensory (+ non-scanline) | 19 | **19 / 15** | 65 lines differ (player window 48..112), BG2HOFS |
| after both sides' Extrasensory (CROBAT window 2..66 + player window) | 1 | **1 / 1** | 111 lines differ |
| after a Dragon Dance | 22 | invalidated | 65 lines (attacker window) |
| after a Memento | 14 | invalidated | 112..160 lines, BGnVOFS |

Each class has activations from both attacker sides. The consumers include Extrasensory, Memento, Dragon Dance, Quick Attack, Splash,
Psywave and the stat animations.

### Windows through the patched production renderer (`check-B.json`, `check-A.json`; two fresh probes per window, digests equal)

| window | move / attacker | preceding bodies | base | rows exact / rows | px r1 / r2 | residual ages | measured lag |
|---|---|---|---|---|---|---|---|
| `mem-opp-weezing-onix-psywave-0` | Memento o | Psywave p | declined | 175/175 | 0/0 | - | - |
| `mem-opp-weezing-onix-qa-0` | Memento o | Quick Attack p | declined | 175/175 | 0/0 | - | - |
| `mem-opp-weezing-onix-xs-0` | Memento o | Extrasensory p | declined | 175/175 | 0/0 | - | - |
| `xs-opp-nuzleaf-shuckle-memento-0` | Memento p | Extrasensory o | declined | 182/182 | 0/0 | - | - |
| `xs-pla-nuzleaf-shuckle-memento-0` | Memento o | Extrasensory p | declined | 180/180 | 0/0 | - | - |
| 12 opponent later Extrasensory (`xs-opp-*` qa / splash / psywave / xs / dd, `xs-pla-espeon-crobat-xs-0`) | Extrasensory o | own XS / QA / Splash / DD + stat | live | 162/162 each | 0/0 each | - | event (d4later policy) |
| `xs-pla-nuzleaf-shuckle-qa-0` | Extrasensory p | Quick Attack o | declined | 159/161 (v1) | 18/18 (v1) | 95..98 (split) | no-event |
| `xs-pla-nuzleaf-shuckle-qa-1` | Extrasensory p | QA, XS p, QA | declined | 156/161 (v1) | 54/54 (v1) | 98..117 (split) | no-event |
| `xs-pla-nuzleaf-shuckle-qa-2` | Extrasensory p | QA, XS, QA, XS, QA | declined | 160/162 | 18/18 | 95..98 (split) | event |
| `xs-pla-nuzleaf-shuckle-{splash,xs,psywave}-1` | Extrasensory p | own XS (+ Splash) | declined | 159/162 | 55/55 | 95..101 (split) | event |
| `xs-pla-nuzleaf-shuckle-{splash,xs,psywave}-2` | Extrasensory p | own XS ×2 (+ Splash) | declined | 161/162 | 16/16 | 98 (split) | event |
| `xs-pla-espeon-crobat-qa-0` | Extrasensory p (CROBAT, elevation 6) | Quick Attack o | declined | 93/162 | 9,825/9,825 | 43..117 (split) | event |
| `xs-pla-espeon-crobat-xs-1` | Extrasensory p (CROBAT) | XS p, XS o | declined | 93/162 | 11,293/11,293 | 43..117 (split) | event |

Under B the two no-lag windows render the lag phase: rows 143..158 = 298,066 / 298,102 px. That is the documented lag alternate plus
the split rows.

Not fixtured: bodies after a faint + send-in. The later58 recipe cannot carry those units, and the class is invalidated anyway.
The `xs-*-xs` / `xs-*-psywave` NUZLEAF bases have no foe body: NUZLEAF is Dark, so the foe's Psychic moves fail. Those classes are
covered by `xs-pla-espeon-crobat-xs` and `mem-*-psywave` / `mem-*-xs`.

### Census 0..999 (10 shards, `--index-from`, `hist73Merge.py`, `prep43CensusDelta.py`, `scan93CensusCheck.py`)

| | live by count | live frames | gains | live → fallback | command KEY digest | battleDigestExcludingFrames (10 shards) | battleDigest |
|---|---|---|---|---|---|---|---|
| base `a444b39ef` | 26,144 / 27,516 = 95.01 % | 3,896,776 / 3,952,109 = 98.60 % | | | `907bc059…` | | `b2f924fd…` |
| **A** | 26,148 = 95.03 % | 3,897,489 = 98.62 % | **+4 / +713 (262:player 4)** | **0** | identical | identical | identical (0 pairing mismatches) |
| B | 26,160 = 95.07 % | 3,899,433 / 3,952,132 = 98.67 % | +16 / +2,657 (262:player 4, 326:player 12) | **0** | identical | identical | differs: 23 player-later Extrasensory bodies are 162 rows under the B lag policy (presentation timing only) |

Both patches were censused twice. The two runs gave identical summaries and deltas.

## FOLD INSTRUCTIONS

**Recommended: patch A** (`tools/integration/fixtures/scan93/scan93-temp-src-A.diff`; `.gitattributes`: `*.diff -whitespace`).

1. Apply A on master: `git apply tools/integration/fixtures/scan93/scan93-temp-src-A.diff`.
   - New `src/engine/liveScanlineHistory.ts`.
   - `liveSpriteOrderHost.ts`: a `scanline` field, folded in `advanceLiveSpriteOrderHost`; null at a party menu or a skipped
     resolution; lent as `scanlineHistory` on later lends only.
   - `liveMoveSpriteAllocator.ts`: the type.
   - `liveOamMoves.ts`: `liveExtrasensoryInputs` takes `scanline0`.
   - `liveMoveAnimation.ts`:
     - case 262: a later body needs a known history and rest-free battlers.
     - case 326: an opponent later body reads the history; a player later body still declines.
     - `liveMementoReducerConfig` takes the entry.
   - `tools/integration/liveAdapterFramebuffer.ts`: fixtures with `precedingBodies` carry the same history.
2. Move the pins. A fails exactly 2 tests (run on the patched copy: 76 related files, 1,686 passed + 80 parity, 2 failed):
   - `tests/animation/liveExtremeSpeedMementoAdapters.test.ts:173` "a later body (after Psywave) … declines". Now live: the history is
     known (Psywave is not a writer) and the battlers are rest-free. Pin the decline after a Dragon Dance instead, plus a known-history
     later body live; the ROM windows are `fixtures/scan93/live/mem-*`.
   - `tests/animation/liveExtremeSpeedMementoAdapters.test.ts:210` route 127/28 WEEZING "the later Memento body declines". Now active;
     re-pin it as active with the battle continuing.
3. Add a Tier-1 pin test (`tests/animation/scan93ScanlineHistory.test.ts`):
   - the fold: S0, identity, after-Extrasensory banks equal to `history-receipt.json`'s `ram.digest` per class;
   - invalidation by 349 / 262 / a party menu / a switch after an XS body;
   - the case 262 / 326 gate matrix;
   - ROM RGB sha256 rows of two Memento later windows.
4. Ledgers (supervisor): Memento later body lifted (+4 / +713 on 0..999), "Not lifted" in later58 updated:
   - Memento: done.
   - Extrasensory player: the residual is the scanout split, not history (§ Results 2 and 4).

**Optional: patch B** = A + the Extrasensory player later body live + a player-later `optional-lag-age` entry (event, 9 : 2).
- It ships documented split rows: 16..55 px on rows 95..117 for SHUCKLE-class targets, about 10k px on 43..117 for CROBAT.
- That needs a D4 decision, because the split's later-body dominant phase (`event`, 11/11) is not renderable.
- B's extra pins (5 tests): the `d4laterTiming.test.ts` parameter list and durations (2); `later58LiveGates.test.ts:94`;
  `liveFaithfulTimingAdapters.test.ts:194` (route EXTRASENSORY 42/7 STANTLER: 162 rows); and `:542` (the status JSON must gain the
  policy entry: `docs/animation-integration-live-status.json`).

**Resume conditions (not lifted)**

- Extrasensory player later bodies need a per-row split line. Instrument: an mGBA store hook on `AnimTask_ExtrasensoryDistortion_Step`'s
  buffer writes that records `REG_VCOUNT` per write (S per row). Then show S is a production-derivable function of (row, body class),
  or settle a D4 decision.
- Memento as a predecessor: fold `reduceMemento`'s final row (`memento.ts` already has the per-row banks; the field checks are exact in
  prep34). Unmodelled until a consumer needs it.
- Dragon Dance and the other writers: same, from their task code.
- Memento after an opponent's own Quick Attack (ONIX rest): the x2 tracker must zero the attacker's rest after its own lunge (qa91 class).

## Reproduce

    sh tools/integration/scan93Run.sh .integration/validation/scan93-run            # everything but the census (~5 min)
    sh tools/integration/scan93Run.sh .integration/validation/scan93-run2 --census   # + base / A / B census 0..999 (~25 min)

`scan93Run.sh` regenerates the scenarios and predictions (byte-identical) and runs the probes (22 × 2), the history compare
(== `history-receipt.json`), the fixtures (== `live/`), and the A / B / S0-control copies (git archive of HEAD + the diff). It then
runs `--live-only` and the dense windows (`later58Check.sh`; render digests == `check-B.json` / `check-control-s0.json`; A == B on A's
live set). With `--census` it also runs `census-summary-{A,B}.json` and compares them.
