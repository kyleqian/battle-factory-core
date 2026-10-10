# S10A flat77: Flatter 260 at LATER bodies (evidence + temp patch; the landing is the next step)

Bounded main-lane worker, evidence only, new files only. Base: master `dd00bdd6e` (production src `d73cf1af`). Every measurement ran on
git-archive copies of `dd00bdd6e` in the scratch dir: `base`, and `patched` = base + `tools/integration/fixtures/flat77/flat77-temp-src.diff`.
The checkout's tracked files never changed. Direct mGBA only (Scene ON, `flat77Probe.py` via `tools/run-mgba-probe.py`), never the shared
HTTP oracles. Every scenario pins lab seed 305420349 (ISSUES #154), and every probe ran twice fresh in one batch.
Receipts: `tools/integration/fixtures/flat77/`. Runner: `tools/integration/flat77Run.sh <fresh-out-dir>`.

## Results

- **20 / 20 later Flatter bodies with a known order lend AND a known allocator history go live with 0 px under the temp patch.**
  - Predecessors: Quick Attack 98, and the census's own predecessors of the lifted bodies (Light Screen 113, Mega Drain 72, Aerial Ace 332,
    Bite 44, Shock Wave 351, Iron Defense 334, Mud-Slap 189 through its words-deferred lend, Acid 51).
  - Both attacker sides; consumers NIDORINA and NIDORINO, the Factory Flatter users.
  - Through the production live renderer in the patched copy: **0 px on 219 / 219 rows** in every window, two fresh probe processes
    r1 == r2, lent activation order == the ROM `sSpriteOrder`, allocator claim 431 / 431 rows.
  - The 14 first-body controls in the same scenarios are also 0 px and r1 == r2, with registers exact on 218 / 218 rows.
- **Two shapes cannot go live through the production hosts, and the narrowed gate keeps them declined** (30 windows).
  - **After a Flatter body** (28 windows: the consumer's own earlier Flatter, or the foe's): the production order host has **no lend**
    (`lends-base.txt`: null in 28 / 28). The ROM free order there differs from window to window (`...,7,9,36` / `...,28` / `...,24`):
    Flatter's 38 confetti free their slots in a words-dependent order. **Flatter is effectively a words order unit.**
  - **After Tackle 33** (`tk-nidorina-golem-*-c0`, 2 windows): the lend is known and == ROM, but **Tackle is not in the audited allocator
    net-zero set** (`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`). The allocator host is unknown and the gate declines.
- **Census seeds 0..999** (`census/`; one process each on the git-archive copies, `prep43CensusDelta.py` + `flat77KeyCheck.py`):
  - **+17 commands / +3,723 frames**. By count 25,969 -> 25,986 = 94.37 % -> **94.43 %**; by frames 3,880,312 -> 3,884,035 = 98.18 % ->
    **98.27 %**.
  - **0 live -> fallback regressions**, 0 pairing mismatches. Command KEY sequence (battle, kind, moveId, side, attacker, target),
    frames per command, `battleDigest` `cc9e7604ea64a303` and `battleDigestExcludingFrames` `48b2d42bacd93479` are identical.
  - Flatter (`census/flatter-commands.txt`): 34 commands before (all fallback). After: 17 / 3,723 live, 17 / 3,723 still fallback.
    - 15 of the 17 are after an earlier Flatter in the same battle (lend unknown).
    - 2 are battle 446's, where the allocator host is unknown: an unaudited earlier body; `flat77Parity.ts --seed=446` reads
      `allocatorKnown` false at both.
    - The case-local gate bucket loses 17 commands / 3,723 frames.
  - 3 of the 17 are after a Mud-Slap (a words-deferred lend), so `faithfulRandomHistory` goes 1,079 -> 1,082. Flatter is D3 faithful
    random anyway.
- **ON / OFF parity** (`parity-539.json`, `parity-437.json`; patched copy, `land75Parity.ts`'s comparison on the census controller):
  - Battle 539 (seed 539, streak 0): the opponent NIDORINO's Flatter after Mega Drain is lifted live in the census. 21 action-menu
    boundaries, RNG / rules / boundary equal.
  - Battle 437 (seed 437, streak 5): the opponent NIDORINA's Flatter after Aerial Ace + Shock Wave. 29 boundaries, equal.

- **Not proven here.**
  - The 17 census-lifted commands face targets I did not stage at a later body (FLAAFFY, SKIPLOOM, ...). Their target / attacker
    anchors and idle rests come from the same production inputs as the first-body adapter, which species audit 12 (ISSUES #152) proved
    across idle-rest species. The later-body proof is the 20 staged windows (2 consumers x 2 foes, 9 predecessors, both sides).
  - A Flatter after a KO + send-in cannot be lifted: the orchestrator invalidates the allocator host at party-summary / switch-in.

- **Gates (this evidence step).**
  - Every new check passes.
  - `git diff --check` is clean, and `git status` shows no modified tracked file at any commit (new files only).
  - Typecheck is not needed: no TypeScript under `tests/`, and `tools/` is outside `tsc -b`.
  - Checkout `npm test` (HEAD `104156249`, src `d73cf1af`): **1,610 files passed / 44 skipped; 13,235 tests passed, 0 failed**. `npm run build`: passed.
  - Differential (`differential.txt`): **624 / 624 captures byte-identical** for both the checkout and a scratch repo holding the temp
    patch, each vs `dd00bdd6e`.
  - Runner (`flat77Run.sh` into a fresh dir, census included): **50 / 50 receipts byte-identical** (`runner-run1.txt`). It re-staged and re-probed (fresh mGBA), re-derived, re-checked in a fresh patched copy, re-ran parity and both censuses.

### Windows (`check/`, `summary.txt`: 64 windows, 34 live, 34 / 34 live windows 0 px and r1 == r2; chain lend = the production hosts fed as the orchestrator feeds them)

| window(s) | consumer side | consumer / foe | predecessor | live (patched) | rows | px | r1 == r2 | D3 registers (ROM / live) | order == ROM | allocator rows |
|---|---|---|---|---|---:|---:|---|---|---|---|
| qa-nidorina-golem-opp-c0, qa-nidorino-snorlax-opp-c0 | opponent | NIDORINA / GOLEM, NIDORINO / SNORLAX | Quick Attack, HIT | **yes** | 219 | **0** | yes | BG2CNT 0x5e02 / 0x5e00 | yes | 431 / 431 |
| qa-nidorina-golem-ply-c0, qa-nidorino-snorlax-ply-c0 | player | same pairs | Quick Attack, HIT | **yes** | 219 | **0** | yes | BG1CNT 0x5c02 / 0x9c00 | yes | 431 / 431 |
| ex-{acid,aerial-ace,bite}-nidorina-golem-ply-c0 | player | NIDORINA / GOLEM | Acid / Aerial Ace / Bite, HIT | **yes** | 219 | **0** | yes | BG2CNT priority | yes | 431 / 431 |
| ex-{acid,aerial-ace,bite}-nidorino-golem-opp-c0 | opponent | NIDORINO / GOLEM | same | **yes** | 219 | **0** | yes | BG1CNT 0x5c02 | yes | 431 / 431 |
| ex-light-screen-*-golem-{ply,opp}-c0 | both | both | Light Screen (no hit) | **yes** | 219 | **0** | yes | BG1CNT 0x5c02 | yes | 431 / 431 |
| ex-mega-drain-*-golem-{ply,opp}-c0 | both | both | Mega Drain, HIT | **yes** | 219 | **0** | yes | ply: BG1CNT 0x9c01 + BG2CNT 0x5e02; opp: BG1CNT 0x5c02 | yes | 431 / 431 |
| ex-shock-wave-*-golem-{ply,opp}-c0 | both | both | Shock Wave, HIT | **yes** | 219 | **0** | yes | BG1CNT / BG2CNT priority | yes | 431 / 431 |
| ex-iron-defense-*-golem-{ply,opp}-c0 | both | both | Iron Defense, STATS_CHANGE | **yes** | 219 | **0** | yes | **DISPCNT 0x3f40 / 0xbf40 (rows 0..6), 0x7f40 / 0xff40 (7..48)**, BG1CNT 0x1c00, BG1VOFS 3 | yes | 431 / 431 |
| ex-mud-slap-*-golem-{ply,opp}-c0 | both | both | Mud-Slap (words-deferred lend), HIT, STATS_CHANGE | **yes** | 219 | **0** | yes | DISPCNT OBJWIN off before row 49, BG1CNT 0x1c00, BG1VOFS 0x1fd | yes (deferred, resolved) | 431 / 431 |
| ff-*-c0 (4), tk-nidorino-snorlax-*-c0 (2), ex-*-nidorino-snorlax-opp-c0 (8) | both | all | none (FIRST body) | yes (as before) | 219 | **0** | yes | exact 218 / 218 | yes | 431 / 431 |
| tk-nidorina-golem-*-c0 (2) | both | NIDORINA / GOLEM | Tackle, HIT | no: allocator unknown | 219 | fallback | yes | - | lend == ROM (base) | host unknown |
| every window after a Flatter (28: ff c1..c3, qa / tk c1, c2) | both | all | an earlier Flatter (+ STATS_CHANGE, CONFUSION, ...) | no: order lend null | 219 | fallback | yes | - | lend null | - |

- **Register residual: display-neutral history, not modelled.** In every live later window, the D3 register file differs from the ROM
  only in two kinds of history the body never writes before the spotlight:
  - **BGnCNT priority / BG1VOFS**, left by the predecessor's `monbg` / `clearmonbg` (Quick Attack's `pre` 0x5e00 -> Flatter `at` 0x5e02).
    The BG1 / BG2 maps are empty after `clearmonbg`, so no pixel changes. later58 recorded the same class for Bonemerang.
  - **DISPCNT OBJWIN (bit 15) OFF** on rows 0..48 after an XOR-toggling predecessor (Iron Defense, Mud-Slap; also a finished Flatter).
    Flatter's spotlight init sets it again on row 49, and no OBJ-window sprite exists before that, so no pixel changes.
  - Both are exact in pixels: 0 px on every row of every window.
- **WIN0 at row 0 (prediction P1): confirmed.** Every later activation reads WIN0H = WIN0V = 0 (`at.registers`; LaunchBattleAnimation
  battle_anim.c:260). The temp patch feeds that base (`registersFor(false)`), so row 0 is exact. Without it, row 0 would carry 240 / 161,
  which is also display-neutral (WININ == WINOUT == 0x3f3f).

### Predictions vs probes (`predictions.md`: batch 1 committed before any probe in `a89c17dda`; batch 2 in `794b5d824`; batch 3 in `657c7d208`)

| prediction | probe |
|---|---|
| P1 later row 0 = S0 with WIN0 0 / 0; first body 240 / 161; row 1 always 0 | confirmed on all 64 bodies (probe `at.registers` / `rows`): 14 first 240 / 161, 50 later 0 / 0, row 1 = 0 everywhere |
| P1 DISPCNT 0x3f40 (OBJWIN off) after an earlier Flatter, display-neutral | confirmed: 32 later activations read 0x3f40 (after a Flatter, Iron Defense or Mud-Slap); 0 px in the 4 live ones that carry it |
| P2 qa / tk turn-0 lends `[3,5,4,21,...]` / `[3,4,21,20,5,...]` | confirmed 8 / 8 == ROM free order (`lends-base.txt`) |
| P2 after a Flatter: lend unknown | confirmed 28 / 28 (lend null); the ROM order varies with the words |
| P3 ROM allocator = the known entry at every later window | confirmed (431 / 431 allocator rows in each live window) |
| P3 production allocator unknown after Tackle | confirmed (`allocKnown` false in tk-nidorina-golem) |
| P4 `spriteAllocatorInput?.historyKnown` alone never fires for Flatter | confirmed by source: `prepareLiveMoveSpriteAllocator` returns no input for a planless net-zero move |
| P5 / P9 every newly live window 0 px, r1 == r2 | confirmed 20 / 20 later (+ 14 / 14 first-body controls) |
| P7 batch-2/3 lends | 16 / 16 production lends == ROM (Mud-Slap deferred, resolved). The predicted Light Screen lend `[3,7,5,4,...]` MISSED (ROM / production `[7,5,3,4,...]`): the predictor added a HIT after a self-target move |
| batch 2 staging | MISSED: NIDORINO outspeeds SNORLAX, so the 8 `ex-*-nidorino-snorlax-opp` are first bodies (kept as controls; batch 3 re-staged vs GOLEM) |
| NOT predicted | BGnCNT priority / BG1VOFS left by `monbg` / `clearmonbg` predecessors (display-neutral, 0 px) |

## Source reads (Move_FLATTER, data/battle_anim_scripts.s)

| what the body reads or writes | where | what an earlier body can leave different |
|---|---|---|
| WIN0H / WIN0V | LaunchBattleAnimation zeroes them (battle_anim.c:260); AnimFlatterSpotlight writes 0 again (battle_anim_effects_3.c:3093) | every earlier body: 0 / 0 at a later row 0 (first body: the intro's 240 / 161) |
| WININ, WIN1H / WIN1V, DISPCNT WIN1_ON | AnimTask_CreateSpotlight (:1674) / RemoveSpotlight (:1697) | WININ ends 0x3f3f = S0 |
| WINOUT, DISPCNT OBJWIN | spotlight init (SetGpuRegBits) and step 3 (XOR) (:3087-3132) | a finished Flatter leaves OBJWIN OFF (0x3f40); invisible before the spotlight (row 49) |
| BLDCNT / BLDY | AnimTask_HardwarePaletteFade in / out | restored (0) |
| BGnCNT priority | not written | monbg / clearmonbg history (Quick Attack: BG1CNT / BG2CNT priority 2); empty maps, display-neutral |
| tile ranges / palette slots | loadspritegfx SPOTLIGHT (slot 6 [305, 64], palette 7) / CONFETTI (slot 7 [433, 12], palette 8), lowest free | only a non-net-zero history; production claims it only from an audited-known allocator host |
| sSpriteOrder (activation) | CreateSprite lowest free | the production order lend (the chain lend == ROM, 8 / 8) |
| 114 Random2 words | AnimFlatterConfetti x38 | the presentation host (pinned at the RAM gRng2Value of the activation in the fixtures) |

## The narrowed gate (temp patch `flat77-temp-src.diff`, 3 files, +22 / -8)

1. `liveMoveSpriteAllocator.ts`: `LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS = {260}`. When the host is known, a planless net-zero claim move
   gets the history-only input `{ historyKnown: true, wall: -1, sparkles: [] }`. With an unknown host it gets none, as every other move.
   Without this, `spriteAllocatorInput` is ALWAYS undefined for Flatter.
2. `liveMoveAnimation.ts` case 260: `!spriteOrderInput?.known || !spriteOrderInput.firstBody` becomes
   `!spriteOrderInput?.known || (!spriteOrderInput.firstBody && !spriteAllocatorInput?.historyKnown)`. It also passes
   `firstBody: spriteOrderInput.firstBody === true` to `liveFlatterInputs`.
3. `liveOamMoves.ts`: `LiveFlatterInputArgs.firstBody`; `liveFlatterRegisters(row, firstBody)` uses S0 with WIN0 0 / 0 as the base of a
   later body (`liveQ2Moves.ts registersFor(false)`).

The order condition is unchanged. After a Flatter the lend is null, so no rest-free or words guard is needed. The shiny / palette gates
are unchanged.

## FOLD INSTRUCTIONS (next session)

1. **The patch.** `git apply tools/integration/fixtures/flat77/flat77-temp-src.diff` (3 files, +22 / -8). It was cut against
   `dd00bdd6e` src `d73cf1af`. First check that
   `git diff dd00bdd6e -- src/engine/liveMoveAnimation.ts src/engine/liveOamMoves.ts src/engine/liveMoveSpriteAllocator.ts` is empty.
2. **The pins: none move.**
   - The 44 related test files (`tests-related-files.txt`, every test naming Flatter / the allocator seam / `spriteAllocatorInput`) pass
     on the patched copy: 43 files passed, 1 skipped (factoryAiCheckBadMoveParity, which needs the core-rs wasm build); 1,522 tests,
     0 failed (`tests-patched-summary.txt`).
   - The FULL suite on the patched copy: 12,350 passed, 20 failed. All 20 are environmental to the archive copy: 19 factoryAi* /
     factoryTrainerSchedule parity tests need `artifacts/wasm/factory_wasm.wasm`, and `appDifferential` needs git history
     (`tests-patched-full-summary.txt`).
   - The existing later-body Flatter pins pass no allocator input, so they still decline.
   - `tests/liveSpriteAllocator.test.ts` "keeps a known host identical across a net-zero move and creates no input" still passes: it does
     not use 260. Add a 260 case.
3. **Add a Tier-1 test** (e.g. `tests/flat77FlatterLaterBody.test.ts`) that pins:
   - `LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS` = {260}; known host -> input `{historyKnown: true, wall: -1, sparkles: []}`, unknown
     host -> no input;
   - the gate: later body + allocator input -> live; later body without it -> null; first body -> live as before;
   - row-0 WIN0 0 / 0 at a later body (`animationInputsAt(0).registers`) and 240 / 161 at a first body;
   - one later window per side through the production renderer: the per-row digests in `check/check-qa-*.json` /
     `check-ex-mud-slap-*.json` (or ROM RGB sha256 rows, the later58 test style).
   - The test must fail without the src hunks.
4. **Census expectation** (seeds 0..999 on the fold's base; `liveShareCensus.ts` + `prep43CensusDelta.py` + `flat77KeyCheck.py`):
   **+17 commands / +3,723 frames** relative to a base whose Flatter rows equal `dd00bdd6e`'s. Expect 0 regressions, the key sequence and
   both battle digests identical. `census/flatter-commands.txt` lists the 17 lifted commands; their battles are the parity candidates.
5. **Gates**: smoke, full `npm test`, `npm run build`, typecheck, the differential, the census, and ON / OFF parity on the lifted routes
   (`flat77Parity.ts --seed=539 --streak=0` and `--seed=437 --streak=5`, == `parity-*.json`).
6. **Ledger wording.** "Flatter 260 later bodies: live when the order lend and the allocator history are known (20 / 20 later windows
   0 px, r1 == r2; faithful random D3, words from the presentation host). After a Flatter body the lend stays unknown (Flatter is a
   words order unit; resume below)."

## Resume conditions for the rest (not lifted here)

- **Flatter after Flatter** (the largest remaining later-body shape): Flatter 260 becomes a words order unit.
  - Add it to `WORDS_ORDER_UNIT_MOVE_IDS` with a free-order plan from its 114 words: the confetti slots plus their 31-row lifetimes, in
    the prep65 / ice72 method.
  - Prove that plan against the ROM `endOrder` (the probes already record `endOrder` per body), both sides, twice fresh.
  - The register and allocator sides are already shown here: DISPCNT OBJWIN off is display-neutral, and the allocator is net-zero.
- **After Tackle 33** (and any other unaudited predecessor): an allocator net-zero audit of Tackle (the hist73 method). The lend is
  already exact.
- **After a KO + send-in**: the party-summary / send-in commands invalidate the allocator host (orchestrator), so these stay declined.

## Commands

    sh tools/integration/flat77Run.sh <fresh-out-dir>     # everything below, compared with the committed receipts (~25 min with the census)
    python3 tools/integration/flat77Stage.py <dir>        # == fixtures/flat77/scenarios
    sh tools/integration/flat77Probes.sh <dir>            # 12 scenarios x2 fresh, r1 == r2
    python3 tools/integration/flat77Fixtures.py <dir>/r1 <fx>
    node --experimental-strip-types --no-warnings tools/integration/flat77Check.ts <fx> <scenario> <out.json>   # in the PATCHED copy
    node --experimental-strip-types --no-warnings tools/integration/flat77Parity.ts --seed=S --streak=K --out=p.json  # in the PATCHED copy
    python3 tools/integration/flat77CensusFlatter.py base.jsonl patched.jsonl
