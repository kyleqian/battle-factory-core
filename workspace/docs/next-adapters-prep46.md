# S10A prep46 — words-dependent sprite-order units and a seam-resolved deferred lend for ANY later consumer

Evidence only (side lane, new files only). Baseline: master `6a7af5b47` (production src tree `76bb0125`). A sibling integration worker is
landing a Giga Drain geometry plan; it is not in this baseline. The production change was measured with a TEMPORARY patch, kept as
`tools/integration/fixtures/prep46/prep46-temp-src.diff` and reverted before every commit.

**Question.** Some order units leave a sprite order that depends on the unit's own Random2 words. Can production resolve the order after
such a unit for ANY later consumer, not only a later body of the same move? The idea: carry the lent order through the unit's own sprite
program, using the unit's own presentation-RNG words, at the render seam. The seam is render-pure and the order tracker stays word-free.
Production then applies the units that follow with the existing plans.

**Answer: yes**, for Sand-Attack 28, Mud-Slap 189, Rain Dance 240 and the RAIN_CONTINUES general animation (General_Rain).
- Every carry was checked against the ROM on every frame, in every allocation window and at the post-body order. The words were read from
  RAM on both sides, and every probe ran twice in fresh processes.
- The production plans of the units that follow then reproduce the next consumer's ROM activation free order in **15/15** chains.
- The temporary patch (28 / 189 / 240 only) adds **+35 commands / +4,550 frames** live on census seeds 0..299, with 0 regressions.
- RAIN_CONTINUES can be added without moving any existing presentation word if it uses a non-consuming per-event word read (§2). The
  predictor gives it the larger share of the remaining gain.
- Dive 291 was not reached.

## Results

### 1. Per-unit carry verdicts (ROM evidence; `fixtures/prep46/carry.json`, `words.json`, `units-summary.txt`)

**Probes.** `prep46OrderRngProbe.py` is `tools/compare/spriteOrderEventProbe.py` with its rules unchanged, plus a read of `gRng2Value`
(`0x03005d84`) after every frame.
- 12 jobs, each run twice in fresh direct-mGBA processes: **12/12 A == B, byte-identical**.
- A fully fresh second `prep46Run.sh` run reproduced every receipt byte-identically (below).

**Lead species.**

| unit | attacker | defenders on the opponent side | defenders on the player side |
|---|---|---|---|
| Sand-Attack, Mud-Slap | Pidgeotto (Factory sets) | Onix, Nosepass | Onix, Lickitung |
| Rain Dance | Wooper | Onix, Snorlax | Onix, Snorlax |

Each job plays the move, then one more FIGHT turn, so most bodies occur twice and a next consumer follows.

**Words from RAM** (`prep46Words.py`). For each frame f, s(f) is the number of ISO_RANDOMIZE1 steps from `gRng2Value(f-1)` to
`gRng2Value(f)`.
- Per docs/random2-trackability.md §1, `RfuMain1` draws first. A frame with s > 1 therefore drew s − 1 animation words: the upper halves of
  LCG²..LCGˢ(`gRng2Value(f-1)`).
- The draw ages found this way equal the production plans (`LIVE_MOVE_RANDOM2_PLANS`) exactly:

  | unit | draw ages | words per draw | total |
  |---|---|---|---|
  | Sand-Attack | 12 + 4w | 10 | 60 |
  | Mud-Slap | 9 + 4w | 10 | 60 |
  | Rain Dance | 18, 20, 23 … 134 | 4 | 160 |
  | General_Rain | 17, 20 … 74 | 4 | 80 |

- Lag frames inside the bodies are constant: Sand-Attack ages 56/57, none in the others.

**Check method** (`prep46Carry.ts`). Start from the ROM activation free order, prefixed the production way
(`spriteOrderWithOccupiedPrefix` + `KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER`). Drive the adapter's sprite program with the RAM words. Then compare:
- every frame of the body: the model sSpriteOrder vs the ROM sSpriteOrder, entry slots removed;
- every allocation window: created and destroyed sets, and the free order (prep43Check style);
- the post-body free order vs the ROM free order at the next unit.

| unit | bodies (jobs) | frames | allocation windows | post-body free | production program check |
|---|---|---|---|---|---|
| Sand-Attack 28 | 8 (4) | **464/464** | **120/120** | **8/8** | The adapter's own reducer order, seeded with the adapter's `spriteOrderSeed`, equals the model on every dirt-phase age (46/46 per body). The production reducer's returned draw order is cross-checked 46/46 per body. |
| Mud-Slap 189 | 6 (4) | **306/306** | **90/90** | **6/6** | Reducer agreement 42/42 on the 4 first bodies. On both second bodies the adapter **declines** its own lend (below); the generalized carry is exact there. |
| Rain Dance 240 | 4 (4) | **744/744** | **320/320** | **4/4** | The reducer `rainDanceAtAge`, replaying from the RAM activation value, reproduces all 160 RAM words (x % 240, y % 80) in 4/4 bodies. |
| General_Rain (RAIN_CONTINUES, no adapter) | 8 (4) | **960/960** | **320/320** | **8/8** | The new source model `prep46GeneralRain.ts`, driven with the RAM rows. |

**Source rules the carry needs**, all ROM-confirmed per frame:

- **Sand-Attack / Mud-Slap, dirt phase.**
  - The order is the reducer's own `SortSprites` loop (`sandAttack.ts:89-118`, `mudSlap.ts:89-115`) at reducer age = live age +
    `animationAgeOffset` + 1. That is the source latch, as `mudSlapSourceMudAtAge`.
  - Both reducers keep that order private. A production carry needs it exported, for example a `…OrderAtAge` / `postBodyFree` beside the
    sprite list, as Ice Ball's `liveIceBallInputs(...).postBodyFree` does.
- **Sand-Attack / Mud-Slap, before the first dirt.**
  - The two invisible slide helpers (`createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2`) occupy slot 3 with priority 3,
    subpriority = attacker battler 30/40 − 2, and oam.y 160. ROM keys: `[3, 38|28, 160, …, invisible]`.
  - The helpers move slot 3 ahead of the free slots. This is carried with the production `carryLiveSpriteOrder`.
  - The adapter shortcuts this phase. Sand seeds with the activation order, which the first dirt pass makes equivalent (agreement 46/46).
    Mud seeds with a "4 directly followed by 3 → swap" rule.
  - That Mud rule **declines on both second Mud-Slap bodies** (activation orders `[3,4,33,…]` and `[3,4,9,…]`). Replacing it with the
    helper carry is a small adapter fix a fold should include. It is not part of this patch.
- **Rain Dance / General_Rain.**
  - A drop created by `AnimTask_CreateRaindrops` joins `SortSprites` one frame after its birth. `BattleMainCB2` runs `BuildOamBuffer`
    before `RunTasks` (`battle_main.c:1863-1869`).
  - Rain Dance's age-18 pair is created by the script command itself: `Cmd_createvisualtask` runs the task at once
    (`battle_anim.c:414-442`). It is already one pass ahead, as the reducer models.
  - General_Rain's script runs in the task phase. Its first pair (age 17) gets no extra pass, which matches the measured spawn gaps:
    17→20, against 18→20 for Move_RAIN_DANCE.
  - Drop keys are the reducer's software OAM: priority 2, subpriority 4, oam.y = y + y2 − 16.

**Chain to the next consumer** (`prep46Chain.ts`, `chain.json`; the `s10aLendChainCheck.ts` recipe, generalized):
1. Take the ROM activation free order and carry it through the words body with its RAM words.
2. Apply the PRODUCTION tracker's existing plans (`applySpriteOrderPresentationEvent`) for every following unit:
   - the hit-animation blip and the prompt cycle (mapped from the gap's ROM allocation windows);
   - the accuracy −1 stat animation (class 1);
   - for Rain Dance, the General_Rain body, carried with its own words.
3. Compare with the ROM at every unit boundary.

Results:
- **15/15 chains reach the next consumer's ROM activation free order exactly**, with every boundary exact. The consumers were Slam 21,
  Rock Slide 157, Mud-Slap 189, Thunder Wave 86, Dragon Breath 225, Sand-Attack 28, Sandstorm 201 and Tackle 33 (next turn, after
  General_Rain).
- 3 more bodies have no consumer before the trace ends. Their 3/3 boundaries are exact.

### 2. RAIN_CONTINUES (General_Rain) verdict

**The carry reproduces the ROM order with RAM-read words: 8/8 bodies**, every frame, window and post-body order exact (table above).
The plan is 20 spawns × 4 words, at ages 17 + 3k: `GENERAL_RAIN_RANDOM2_PLAN`.

**A word sub-stream keyed to the general-animation event can be added WITHOUT moving any existing presentation word, but only as a
non-consuming read** (`prep46SubStream.ts` → `substream.json`, production host functions):

| variant | how General_Rain gets its words | existing move-body words |
|---|---|---|
| consuming | `activatePresentationRngBody` schedules its 80 draws into the shared stream (`pendingDraws`), as every move body does | **moved** in 0/40 schedules identical; 240 of 320 bodies change (every body after the first rain) |
| sub-stream (non-consuming) | `presentationRngPlanWords(host.state at its activation frame, GENERAL_RAIN_RANDOM2_PLAN)` under its own key (`general:<request>:<segment>:<sequence>`); nothing scheduled | **byte-identical in 40/40 schedules (320/320 bodies)** |

How the non-consuming read is classified:
- The words follow the ROM law **inside** the body: the per-frame step, then draws in source order, from the activation state. The carry
  above is driven by exactly such words.
- The stream does **not** consume the 80 draws afterwards. That is a documented deviation from the ROM step count for the words that
  follow. In ROM terms those later words come from a stream 80 steps short.
- This is harmless to the claim class, because surrogate activation values are not oracle-synchronized anyway
  (docs/random2-trackability.md §0). It must still be stated in the D3 accounting, under "verify the source RNG recurrence, draw
  order/count".
- The consuming variant is the law-faithful one. It changes every existing faithful-random output after a rain end turn, so it needs a
  presentation-RNG policy version bump (`PresentationRngSession.policy`), with legacy exports replayed under the old policy (D3 "documented
  default for legacy exports").

**Plumbing it needs (not built here):**
1. The order host marks a deferred body at the `general-animation RAIN_CONTINUES` event, keyed per event.
2. The tick seam (`tickLiveMovePresentationRngSession`, which today activates only move-animation commands) records the sub-stream words
   when that general animation is presented.
3. The resolver's carry dispatches `generalRainDropsAtAge`.

**Value (predictor).** Clearing RAIN_CONTINUES together with the three bodies predicts **162 commands / 26,931 frames**, against 80 /
10,665 without it (`chains-predict-with-rain.json`). Rain Dance alone clears nothing: its solo count is 0, because every Rain Dance chain
also contains RAIN_CONTINUES.

### 3. Patch shape, census delta, claim accounting

**Patch** (`fixtures/prep46/prep46-temp-src.diff`, 4 files):
- **`src/engine/liveSpriteOrderHost.ts`**
  - `:80` `DEFERRED_LEND_MOVE_IDS` = `[301, 28, 189, 240]`, plus `ANY_CONSUMER_DEFERRED_MOVE_IDS = [28, 189, 240]`.
  - `:114` (`markLiveSpriteOrderDeferredBody`): a words unit's marker is also recorded off the entry labels. Its lend is already in entry
    labels (`spriteOrderTrackerLend` ρ), so the carry and the replay run in entry labels after a KO + send-in. Ice Ball keeps its
    entry-only rule.
  - `:498` (`lendLiveSpriteOrder`): the deferred lend goes to ANY consumer when the marker is a words unit. Ice Ball markers still lend
    only to Ice Ball. `POSTKO_LEND_EXCLUDED_MOVE_IDS` is honoured.
- **`src/engine/liveMoveAnimation.ts:1263`** (top of `liveMoveAnimationPresentation`; the memo map is at `:1249`)
  - For a deferred lend and any consumer except 301, it calls `resolveSpriteOrderDeferredLend` (unchanged).
  - Its carry callback is `liveWordsBodyPostFree`, which reads the earlier body's words from the presentation host by body key.
  - The resolved free order replaces the lend; null leaves it undefined, so the consumer declines as today.
  - The result is memoized per deferred-lend object (a pure memo). Without it, the seam re-carried every frame and the census exceeded
    300 s.
- **`src/engine/liveWordsOrderCarry.ts`** (new): the carry above, Sand / Mud dirt and Rain Dance drops.
- **`src/engine/battleResolutionPresentationRender.ts:1332`**: the render view passes `presentationRng { host, key }` also when the order
  lend is deferred. Today it passes it only to Random2-plan moves, so a non-Random2 consumer could not read the earlier body's words.

`npm run typecheck` is green with the patch.

**Census** (seeds 0..299, `prep45OrderCensus.ts`). Both runs used the same seeds and driver. Pairing is by `prep43CensusDelta.py`:
**0 pairing mismatches, 0 live → fallback regressions**. The battle digest is identical:
`bb30f572…`, 4,093,242 frames, 5,756 player turns. The command digest differs only because it hashes each command's live/decline status.

| | live by count | live by frames |
|---|---|---|
| master `6a7af5b47` | 6753 / 7970 = **84.73 %** | 981034 / 1168273 = **83.97 %** |
| patch (28 / 189 / 240) | **6788 = 85.17 % (+35)** | **985584 = 84.36 % (+4,550)** |

New live commands by first unit (`census-delta-seeds0-299.json`):

| first unit | commands | frames |
|---|---:|---:|
| body 28:opponent | 18 | 2,058 |
| body 28:player | 7 | 1,122 |
| body 189:opponent | 5 | 725 |
| body 189:player | 5 | 645 |
| body 240 | 0 | 0 (its chains contain RAIN_CONTINUES, §2) |

Render sanity: 10,161 / 10,161 sampled live frames rendered with no throw.

**Predictor vs measurement** (`chains-predict.json`; "live iff chain ⊆ cleared"):
- Predicted: 80 commands / 10,665 frames.
- Measured: **34 / 4,332 predicted and live**, **1 / 218 live but not predicted**, and 46 / 6,333 predicted but not live.
- **None of the 46 still declines on the order lend.** They now get a resolved order and stop at the consumer's own gates:
  - 32 / 4,220: "unclassified (case-local gate)", for example Double Team's `spriteOrderForSlots(..., [3, 4])`;
  - 12 / 1,957: "later-body (order lend not a first body)";
  - 2 / 156: "unclassified (no source gate fired)".
- Remaining after the patch: 19 commands whose chain starts at "body 189:opponent" still decline on the lend. Their resolution returned null:
  a non-replayable unit in `deferred.units` (KO, send-in, switch, invalidation), or no recorded marker. They are not broken down further
  here.

**Unchanged under the patch:**
- `tests/spriteOrderDeferredLend.test.ts`: 3/3 pass.
- Turn-keyed corpus replay (`prep45CorpusReplay.ts`): 1366 edges, 1143 known, 1143 exact, 0 mismatched.
- prep45 probe replay: 291 edges, 241 known, 241 exact, 0 mismatched.
- `replay-before.json` == `replay-after.json`.

**Claim class and accounting (ANIMATION_VERIFICATION.md D3).**
- A consumer that goes live through this lend has an order that depends on the earlier words unit's **surrogate** presentation words. The
  per-frame carry is proven with RAM-read (pinned) words. In arbitrary play the activation value is a surrogate, so the consumer's order is
  **faithful random, not oracle-exact**.
- This holds even when the consumer's own adapter is a scoped-exact (`LIVE_MOVE_ANIMATION_IDS`) adapter with no Random2 of its own.
- D3 says: "Count promoted surrogate adapters separately as 'faithful random' … no … exact credit for surrogate randomness". A fold therefore
  needs a **per-command** (not per-adapter) claim flag. For example, a lend that resolved through a deferred words marker marks that
  command's live frames faithful-random. Those frames must be counted in the faithful-random bucket, not in scoped exact. The same applies
  today to Ice Ball's counters 1..4, which are already faithful timing + D3.
- The census above counts them as "live" without that split. A fold must report the +35 / +4,550 as faithful-random frames.
- RAIN_CONTINUES as a non-consuming read additionally carries the §2 stream-count deviation.

**A production fold would need:**
1. The order export from the Sand / Mud / Rain reducers, instead of the duplicated loop in `liveWordsOrderCarry.ts`.
2. The Mud 4/3 seed rule replaced by the slide-helper carry.
3. The faithful-random per-command accounting above.
4. Tests:
   - the marker / lend / resolver for a non-same-move consumer, against these probes;
   - the KO + send-in case (entry-label carry);
   - the render-view `presentationRng` pass-through.
5. For RAIN_CONTINUES: the §2 plumbing, and the policy decision (non-consuming read vs a version bump).

## Instrument and receipts

Files in `tools/integration/`:

| file | role |
|---|---|
| `prep46OrderRngProbe.py` | probe: per-frame order + `gRng2Value` |
| `prep46Probe.py` | 12 jobs × 2 fresh runs |
| `prep46Words.py` | RAM words per body |
| `prep46Extract.py` | units: windows, plus dense per-frame orders and words for the words bodies |
| `prep46Carry.ts` | per-frame carry check |
| `prep46GeneralRain.ts` | General_Rain source model |
| `prep46Chain.ts` | chain check |
| `prep46SubStream.ts` | word-identity check |
| `prep46Run.sh` | reproduction |

Receipts in `fixtures/prep46/` (`.gitattributes`: `*.diff -whitespace`):
- `words.json`, `units-summary.txt`, `carry.json`, `chain.json`, `substream.json`
- `census-{before,after}-seeds0-299.json`, `census-delta-seeds0-299.json`, `chains-before-seeds0-299.json`
- `chains-predict.json`, `chains-predict-with-rain.json`
- `replay-{before,after}.json`
- `prep46-temp-src.diff`

No raw probe rows, RGB or logs.

## Reproduce

    OUT=/tmp/p46-repro REC=/tmp/p46-rec sh tools/integration/prep46Run.sh   # ~4.5 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for every receipt; src is applied from the .diff (adds src/engine/liveWordsOrderCarry.ts) and reverted

This was done twice. The first run reused the probe outputs, with census receipts from the measurement runs. The second was fully fresh
(new probes, both census runs, `OUT=/tmp/p46B`). All 13 receipts were `same`.

## Not reached / caveats

- **Dive 291** was not reached: no probes and no carry. The prep45 scan and the s10a blocker doc are unchanged. Dive's next consumer is its
  own attack body, reached on the locked-turn path, which is out of scope for this step. The setup-body carry would follow the Rain Dance
  pattern: the live setup adapter already builds a slot-level profile (`src/animation/dive.ts`, `liveMoveAnimation.ts` case 291), and
  the remaining steps are s10a design steps 1-4.
- **RAIN_CONTINUES** is evidence plus design only. The predicted +82 commands / +16,266 frames over the patch are not measured.
- **Species.** The attacker species is fixed per unit (Pidgeotto / Wooper); the defender lead varies, two per side. The dirt geometry
  depends on both pic points through the production `liveBattlerAnchors`, so the attacker is covered only through the side.
- **Gap mapping.** `prep46Chain.ts` maps gap units to production events from the ROM windows (blip, prompt pair, commit). The live
  orchestrator emits these from kernel events. The census measured the end-to-end path.
- **Census scope.** One input policy (FIGHT, least-used slot), battle 1 of a challenge per seed, 300 seeds.
