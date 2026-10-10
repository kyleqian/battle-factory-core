# S10A flat77: Flatter 260 at LATER bodies (evidence + temp patch; the landing is the next step)

Bounded main-lane worker, evidence only, new files only. Base: master `dd00bdd6e` (production src `d73cf1af`). Every measurement ran on
git-archive copies of `dd00bdd6e` in the scratch dir: `base`, and `patched` = base + `tools/integration/fixtures/flat77/flat77-temp-src.diff`.
The checkout's tracked files never changed. Direct mGBA only (Scene ON, `flat77Probe.py` via `tools/run-mgba-probe.py`), never the shared
HTTP oracles. Every scenario pins lab seed 305420349 (ISSUES #154), and every probe ran twice fresh in one batch.
Receipts: `tools/integration/fixtures/flat77/`. Runner: `tools/integration/flat77Run.sh <fresh-out-dir>`.

## Results

- **The later Flatter bodies whose order lend AND allocator history are known go live with 0 px.** 4 / 4 later-body windows after a
  non-window predecessor (Quick Attack 98 + its hit), both attacker sides, consumers NIDORINA and NIDORINO (the Factory Flatter users),
  render **0 px on 219 / 219 rows** through the production live renderer in the patched copy. The two fresh probe processes agree
  (r1 == r2), the lent activation order == the ROM `sSpriteOrder`, and the allocator claim matches 431 / 431 rows.
- The 6 first-body controls in the same scenarios are also 0 px, r1 == r2, with registers exact on 218 / 218 rows.
- **Two shapes cannot go live through the production hosts, and the narrowed gate keeps them declined.**
  - **After a Flatter body** (24 windows: the consumer's own earlier Flatter, or the foe's): the production order host has **no lend**.
    `lends-base.txt`: lend null in 24 / 24. The ROM's free order there differs from window to window (`...,7,9,36` / `...,28` / `...,24`):
    Flatter's 38 confetti free their slots in a words-dependent order. **Flatter is effectively a words order unit.**
  - **After Tackle 33** (`tk-*` turn 0, 4 windows): the lend is known and == ROM, but **Tackle is not in the audited allocator net-zero
    set** (`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`), so the allocator host is unknown and the gate declines.
- **Census seeds 0..999** (one process each, base vs patched): (pending: census running at this commit)
- **ON / OFF parity**: (pending)

### Windows (`check/`, `summary.txt`; chain lend = the production hosts fed as the orchestrator feeds them)

| window(s) | consumer side | consumer / foe | predecessor (history) | live (patched) | rows | px (r1) | r1 == r2 | D3 registers | order == ROM | allocator |
|---|---|---|---|---|---:|---:|---|---|---|---|
| qa-nidorina-golem-opp-c0 | opponent | NIDORINA / GOLEM | Quick Attack, HIT | **yes** | 219 | **0** | yes | 0 / 218 exact: only BG2CNT 0x5e02 vs 0x5e00 | yes | 431 / 431 |
| qa-nidorino-snorlax-opp-c0 | opponent | NIDORINO / SNORLAX | Quick Attack, HIT | **yes** | 219 | **0** | yes | as above (BG2CNT) | yes | 431 / 431 |
| qa-nidorina-golem-ply-c0 | player | NIDORINA / GOLEM | Quick Attack, HIT | **yes** | 219 | **0** | yes | 0 / 218: only BG1CNT 0x5c02 vs 0x9c00 | yes | 431 / 431 |
| qa-nidorino-snorlax-ply-c0 | player | NIDORINO / SNORLAX | Quick Attack, HIT | **yes** | 219 | **0** | yes | as above (BG1CNT) | yes | 431 / 431 |
| ff-*-c0 (4), tk-nidorino-snorlax-*-c0 (2) | both | all four pairs | none (FIRST body) | yes (unchanged) | 219 | **0** | yes | 218 / 218 | yes | 431 / 431 |
| tk-nidorina-golem-*-c0 (2) | both | NIDORINA / GOLEM | Tackle, HIT | no: allocator unknown | 219 | fallback | yes | - | lend == ROM (base) | host unknown |
| every window after a Flatter (24) + tk/qa c1 / c2 | both | all | earlier Flatter (+ STATS_CHANGE, CONFUSION, QA / Tackle) | no: order lend null | 219 | fallback | yes | - | lend null | - |

- **Register residual: display-neutral history, not modelled.** The D3 register file differs from the ROM ONLY in the BG priority bits
  that Quick Attack's `monbg ANIM_ATK_PARTNER` leaves set: BG2CNT priority 2 when the opponent used Quick Attack, BG1CNT 0x5c02 when the
  player did (probe: Quick Attack `pre` 0x5e00, Flatter `at` 0x5e02). Flatter never writes BGnCNT, so the value holds on every row. The
  BG1 / BG2 maps are empty after `clearmonbg`, so the priority changes no pixel (0 px on every row). later58 recorded the same class for
  Bonemerang ("BG1CNT 0x9c01 / 0x5c02 ... the pixels never show it").
- **WIN0 at row 0 (prediction P1): confirmed.** Every later activation reads WIN0H = WIN0V = 0 (`at.registers`; LaunchBattleAnimation
  battle_anim.c:260). The temp patch feeds that base (`registersFor(false)`), so row 0 is exact. Without it, row 0 would carry 240 / 161,
  which is also display-neutral (WININ == WINOUT == 0x3f3f).

### Predictions vs probes (`predictions.md`, committed before any probe in `a89c17dda`)

| prediction | probe |
|---|---|
| P1 later row 0 = S0 with WIN0 0 / 0 | confirmed in all 34 later windows (`at.registers`) |
| P1 DISPCNT 0x3f40 (OBJWIN off) after an earlier Flatter | confirmed: `at.registers.dispcnt` 0x3f40 after a Flatter body; display-neutral and never live (lend null) |
| P2 qa / tk turn-0 lends `[3,5,4,21,...]` / `[3,4,21,20,5,...]` | confirmed 8 / 8 == ROM free order (`lends-base.txt`) |
| P2 after a Flatter: lend unknown | confirmed 24 / 24 (lend null), and the ROM order varies with the words |
| P3 ROM allocator = the known entry at every later window | confirmed (431 / 431 allocator rows in each live window) |
| P3 production allocator unknown after Tackle | confirmed (`allocKnown` false in the tk-nidorina-golem windows) |
| P4 `spriteAllocatorInput?.historyKnown` alone never fires for Flatter | confirmed by source: `prepareLiveMoveSpriteAllocator` returns no input for a planless net-zero move |
| P5 every newly live window 0 px | confirmed 4 / 4 (+ 6 / 6 first-body controls) |
| NOT predicted | BG1CNT / BG2CNT priority left by Quick Attack's monbg (display-neutral) |

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

1. Apply: `git apply tools/integration/fixtures/flat77/flat77-temp-src.diff` (it was cut against `dd00bdd6e` src `d73cf1af`; check
   `git diff dd00bdd6e -- src/engine/liveMoveAnimation.ts src/engine/liveOamMoves.ts src/engine/liveMoveSpriteAllocator.ts` is empty first).
2. Pins a fold must move (`tests-patched-summary.txt`; the related test files run in the patched copy): **none**: the 44 related test files (`tests-related-files.txt`) pass on the patched copy (43 passed, 1 skipped = factoryAiCheckBadMoveParity, which needs the core-rs wasm build; 1,522 tests passed). The existing later-body Flatter pins pass no allocator input, so they still decline.
3. Add a Tier-1 test (e.g. `tests/flat77FlatterLaterBody.test.ts`) that pins:
   - the gate cases (later + allocator known -> live; later + allocator unknown -> null; first body -> live as before);
   - the claim set membership {260};
   - row-0 WIN0 0 / 0 at a later body;
   - for the four qa windows: the ROM RGB per row, or the 0-px receipt hashes.
   The `check/` receipts carry the per-row digests.
4. Gates: smoke, full `npm test`, `npm run build`, typecheck, differential, the census (expect the flat77 census delta below, key sequence + digest
   identical, 0 regressions), and ON / OFF parity on the lifted route (`flat77Parity.ts`).

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
