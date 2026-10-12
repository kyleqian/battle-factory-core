# stf115 (S10A main lane, 2026-10-11): the remaining Struggle 165 declines — order lends (rung 1), doll cells (rung 2)

Base: FIXED master `7390bf8ca` (Struggle live since stl109). This step adds evidence and a banked patch, new files only. Every tree is a
git-archive copy of `7390bf8ca`, plus `tools/integration/fixtures/stf115/stf115-struggle-doll.diff` for the patched copy. Direct mGBA only;
the lab seed is pinned (stg107Stage.SEED 305420349). Runner: `sh tools/integration/stf115Run.sh <fresh-out-dir>` (§4).

## Results

| Rung | Census Struggle declines (0..999) | Windows (production renderer, two fresh probes, r1 == r2) | Verdict |
|---|---|---|---|
| base `7390bf8ca` | 149 = lend unknown 106 + attacker doll 24 + defender doll 19 | — | — |
| **1** order after a Struggle | 149 -> **149** (a Struggle plan lifts 0) | CHAIN lend == ROM sSpriteOrder **66 / 66** (24 / 24 after a Struggle); **54 / 54 live 0 px** (19 / 19 after a Struggle) | the plan exists and is exact; the 106 come from other bodies (below) |
| **2** doll cells (patched copy) | 149 -> **106** (all 43 doll declines lift; only the 106 lend declines remain) | defender doll **5 / 5** 0 px on every row; attacker doll (swap composite) **6 / 6** 0 px on every row + tail rows; no other window changes (59 / 59 live 0 px) | **BANKED** -> fold |

- **Rung 1: the premise does not hold, and no plan is missing.** stg107 §3.1 / §3.5 says Struggle has no end-order plan entry. That is
  wrong. `src/engine/spriteOrderProductionPlans.ts` `SPRITE_ORDER_PRODUCTION_BODIES` has **both** `"165:player": 94` and
  `"165:opponent": 94`. Plan 94 is `Cff;D0,1/P540,540;Cf;D2`. `165:player` comes from `fixtures/sprite-order-body-plans-ext.json`
  (EXACT-PLAN, `live: false`). `165:opponent` is absent from that fixture but present in the table's appended block.
  `SPRITE_ORDER_PRODUCTION_ANIMS` (the non-move table) has no Struggle key and needs none. No table lacks anything for Struggle.
  - **Prediction (from source; it equals the in-tree plan 94, committed before this step):** the waves take slots 3 / 4 (subpriority
    attacker − 2 → word 540 player / 550 opponent) and are destroyed at age 75. The hitsplat reuses slot 3 (attacker − 3 → 539 / 549) and is
    freed at 86. Slot 3 has the lower stale word, so it sorts before slot 4. The free order a Struggle body leaves begins `[3, 4, 21, 20, 5,
    19, …]`, with the rest unchanged.
  - **ROM RAM:** sSpriteOrder at every next activation, two fresh probe batches (`lends1 == lends2`). The production CHAIN lend equals the
    ROM free order on **66 / 66 windows**. **24 / 24** of them follow a Struggle body: both sides, after first and repeated Struggles,
    Taunt / Harden / Mean Look / Substitute before and after, KO and recoil-faint battles. Every Struggle body in these routes ends at
    `[3, 4, 21, 20, 5, …]` (`fixtures/stf115/rung1-lends.jsonl`, `rom` field).
  - **Production render (unpatched `7390bf8ca`; aud110-aligned windows, audit21Check):** **54 / 54 live windows are 0 px on every row.**
    That includes **19 / 19 live windows after a Struggle**: repeated Struggle bodies, and Taunt / Harden / Substitute after a Struggle.
    r1 == r2 holds on 66 / 66. The 12 non-live windows are named gates: defender doll (Struggle 7 + Taunt 2) and stg107's ONIX later-body
    rest gate (3 PP-route bodies). Receipt `fixtures/stf115/rung1-windows-base.txt`.
  - **Where the census's 106 `sprite-order lend unknown` Struggle declines come from.** Census 0..999 on `7390bf8ca`, receipt
    `fixtures/stf115/census-base-declines.json`; `stf115Declines.py` reads the order host's own invalid reason.
    - **101** are in ONE battle (705, CHANSEY vs WOBBUFFET). There, the player's **Metronome called Odor Sleuth 316** (command 16), a
      fallback body with **no order plan**: `316:player` / `316:opponent` are ABSENT from `sprite-order-body-plans-ext.json`. The host
      stays invalid for the rest of the battle: 106 declines, 101 of them Struggle.
    - **5** are in battle 729, after a player **Hyper Beam 63** (`63:player` NEEDS-KEYS, "equal priority word, different y"; 12 declines
      across battles 644 / 729, 5 of them Struggle).
    - **So a Struggle plan lifts 0 of the 106.** Lifting them needs order units that are not Struggle work (§3, residual).
- **Rung 2: the doll cells lift.** The banked patch draws Struggle's battlers through the doll-aware `liveSceneOnBattlerArt` and composes
  the doll palette bank (`composeLiveFieldPalettes`, doll90's Psych Up rule). It then admits 165 for both sides in
  `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS` and `LIVE_SUBSTITUTE_SWAP_BODY_CELLS`. The art change alone (stg107's suggestion) left 604..610 px
  on every row: the doll box had the species palette (ROM 7b8c5a, live 94847b). With the palette composed, every window is exact.
  - Census 0..999 on the patched copy: **+43 Struggle commands live, 0 non-Struggle status changes.** Live share 98.80 % / 99.27 % ->
    **98.95 % / 99.44 %**; Struggle 883 / 1,032 -> **923 / 1,029** live.
  - land82CensusCheck: command keys identical outside the stalled tails, `battleDigestExcludingFrames` identical, played / terminal /
    stalled 1000 / 997 / 3 in both arms, live -> non-live 0.
  - The 3 fewer commands (27,458 -> 27,455) are the stalled Struggle-only battles' budget-cut tails: 796 (200 -> 198) and 881 (268 -> 267).
    The newly live doll bodies are longer than the fallback, and the 200,000-frame budget is fixed (stl109's mechanism).
  - Receipts: `census-summary.json`, `census-check.json` / `.txt`, `census-patched-declines.json`.

## 1. Rung 1 detail

| Census 0..999 on `7390bf8ca` (stg107Census.sh) | value |
|---|---|
| commands / live / live frames | 27,458 / 27,128 (98.80 %) / 4,031,756 of 4,061,256 (99.27 %) |
| Struggle commands / live / fallback | 1,032 / 883 / 149 |
| `sprite-order lend unknown` after `316:player` (battle 705, Metronome → Odor Sleuth, fallback) | 101 Struggle (+5 other bodies) |
| `sprite-order lend unknown` after `63:player` (battle 729, Hyper Beam) | 5 Struggle (+7 other bodies; battle 644 adds 0 Struggle) |
| `attacker doll: swap body cell unproven` | 24 (battles 587, 796) |
| `defender doll: unproven body cell` | 19 (battles 497, 587, 796, 881) |

`310:player` (Astonish) also invalidates the host, for 5 non-Struggle bodies in 4 battles. The receipt lists it; it is not Struggle.

Routes (`tools/integration/stf115Stage.py`): stg107's 11 forced-Struggle routes plus 5 doll routes. The doll routes are real moves only,
three complete legal members per side, no transient state:
- `psub`: PP route; the Pressure target knows Substitute x4, so its doll is up from T1 and the struggler's T4 / T5 Struggles hit the doll.
  Three jobs: player Onix -> opponent Dusclops; opponent Onix and opponent Snorlax -> player Dusclops.
- `tsub`: Taunt route; the struggler is faster and knows Substitute x4. T1 raises its doll, then the slower target's Taunt lands, so the
  T2 / T4 / T6 Struggles come from a doll attacker. Two jobs: player Onix -> Jolteon, opponent Snorlax -> Onix.

## 2. Rung 2 detail (patched copy = `7390bf8ca` + `stf115-struggle-doll.diff`)

**Defender doll** (`fixtures/stf115/rung2-windows-patched.txt`, audit21Check, two fresh probes per scenario):

| Window | Attacker -> doll | Base | Patched |
|---|---|---|---|
| stg107-opp-143-42-sub c2 | opponent Snorlax -> player Golbat's doll (stg107's window) | decline (91,455 px as fallback) | live, **112 / 112 rows 0 px**, r1 == r2 |
| stf115-ply-psub-95-362 c2 / c3 | player Onix -> opponent Dusclops's doll, first + repeated | decline | live, **0 px** every row, r1 == r2 |
| stf115-opp-psub-143-362 c2 / c3 | opponent Snorlax -> player Dusclops's doll, first + repeated | decline | live, **0 px** every row, r1 == r2 |
| stf115-opp-psub-95-362 c2 / c3 | opponent ONIX -> player Dusclops's doll | decline | decline: stg107's ONIX later-body rest gate (case-local, pre-existing, not doll) |

No other window's status or px changes between base and patched (the receipts differ only on these 5 lines and the totals).

**Attacker doll** (Struggle by a doll attacker: SUBSTITUTE_TO_MON, the body on the mon, MON_TO_SUBSTITUTE). prep40Probe.py runs twice per
scenario, fresh processes, byte-identical (r1 == r2). attdollLiveCheck.ts runs in the patched copy, every composite row against both runs
plus the tail rows k+1 / k+2 (`fixtures/stf115/rung2-attdoll.txt`):

| Route | Windows | Rows (= production duration) | ROM body / adapter | px (run 1 / run 2) | k+1 / k+2 |
|---|---|---|---|---|---|
| stf115-ply-tsub-95-135 (player Onix doll) | 3 (T2 / T4 / T6) | 197 | 111 / 112 (no framing needed) | 0 / 0 every row | 0 / 0 |
| stf115-opp-tsub-143-95 (opponent Snorlax doll) | 3 | 193 | 111 / 112 | 0 / 0 every row | 0 / 0 |

### Gates on the patched copy

- `npm run typecheck`: pass.
- Touched tests, 11 files (ctl95DollFreeControls, doll90DollCells, land82DollCells, land97IdleLeadRows, stl109Struggle,
  substituteDollAdapterDecline, substituteDollDefenderLive, substituteSwapAttdollCells, substituteSwapPresentation, liveShadowRows,
  liveStatusImplementedCount): **222 / 224 pass**. The 2 failures are the expected pins this patch moves:
  - `tests/stl109Struggle.test.ts` "a Substitute doll declines on either side": the gate this patch lifts;
  - `tests/substituteDollDefenderLive.test.ts` "the proven-cell allowlist is exactly …": the list gains `165:opponent`, `165:player`.

## 3. FOLD INSTRUCTIONS (land step)

1. Apply `tools/integration/fixtures/stf115/stf115-struggle-doll.diff` with `patch -p1` to `src/` (3 files, 3 hunks, presentation only):
   - `battleScene.ts`: the STRUGGLE branch's `artFor` -> `liveSceneOnBattlerArt`;
   - `liveMoveAnimation.ts`: case 165 `composeLiveFieldPalettes`, plus `[165, both]` in `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS`;
   - `liveSubstituteSwap.ts`: `[165, BOTH]` in `LIVE_SUBSTITUTE_SWAP_BODY_CELLS`.

   With no doll on either side, `composeLiveFieldPalettes` returns `composeLiveArtPalettes`' value and `liveSceneOnBattlerArt` returns the
   same species sheet as before, so doll-free Struggle is unchanged. Rung 1's 54 doll-free live windows render 0 px both before and after.
2. **Pins to move:**
   - `tests/stl109Struggle.test.ts`: replace "a Substitute doll declines on either side" with "a Substitute doll is live on either side".
     Defender doll, both attacker sides: `liveMoveSubstituteDollDeclines` false and a non-null presentation; attacker doll:
     `liveSubstituteSwapApplies` true and `liveMoveAnimationDuration` = `substituteSwapCompositeDuration(side, 112)` (197 player /
     193 opponent, matching the ROM rows above). Keep "both battlers shown as dolls" declining.
   - `tests/substituteDollDefenderLive.test.ts`: allowlist += `"165:opponent"`, `"165:player"` (comment: stf115).
3. **Tests to add** (`tests/stf115StruggleDoll.test.ts`):
   - the cells (165 in both maps, both sides);
   - the palette rule: case 165 with a defender doll carries `gSubstituteDollPal` in the doll side's OBJ bank 16 / 17; without a doll it
     equals `composeLiveArtPalettes`;
   - the composite length 197 / 193 vs `rung2-attdoll.txt`.

   Revert experiments, each must fail a named test:
   - `composeLiveArtPalettes` back in case 165 (the doll palette test);
   - drop `[165, …]` from either map (cells);
   - `artFor` back to the species maps. That needs a renderer-level check: a defender-doll Struggle frame whose doll box differs from the
     species sheet. Alternatively, pin `stf115Run.sh`'s receipt.
4. **Accounting:** none. Struggle is already the one additional required body (stl109); this widens its live share only.
   `docs/live-share-census.md` gets the new headline: 98.95 % / 99.44 %, Struggle 923 / 1,029.
5. **Residual (named, not Struggle work):**
   - the 106 lend declines need an order plan for **Odor Sleuth 316** (both sides absent: two `CloneBattlerSpriteWithBlend` clones copy
     the target's whole sprite, priority word AND y, so their sSpriteOrder place is decided by SortSprites' tie rule; then two
     gHorizontalLunge sprites), and Hyper Beam 63's y keys (`63:player` NEEDS-KEYS).
   - Odor Sleuth reaches Factory play only via Metronome (one census battle, 705). That battle carries 101 of the remaining Struggle
     declines because its stall runs to Struggle.
   - Still declining: the ONIX later-body rest gate (stg107), shiny, and both battlers shown as dolls.

## 4. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/stf115Run.sh .integration/validation/<fresh>                   # rung 1 + rung 2 receipts, `same` vs fixtures/stf115 (~6 min)
STF115_CENSUS=1 sh tools/integration/stf115Run.sh .integration/validation/<fresh>   # + census 0..999, base and patched copies (~+5 min)
```

The runner works as follows:
1. It makes git-archive copies of `7390bf8ca` (base, and base + the diff).
2. It stages the 16 routes, runs two audit20Probes batches (lends r1 == r2), aligns the windows (aud110Align.py), and renders them with
   audit21Check in both copies.
3. It runs prep40Probe.py x2 + attdollLiveCheck.ts for the attacker-doll routes.
4. It compares every receipt with `tools/integration/fixtures/stf115/` (`same` / `DIFF`).

Tools: `stf115Stage.py`, `stf115Check.sh`, `stf115Summary.py` (`--attdoll`), `stf115Declines.py`, `stf115Run.sh`.
