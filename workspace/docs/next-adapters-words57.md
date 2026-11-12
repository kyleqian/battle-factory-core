# S10A words57: the words-deferred sprite-order replay past a faint, a recall and a forced switch-out

Worker step (integration lane, base master `841d54df4`, production src tree `93d0f033`). Final production src tree `10cb692e`
(commit `1f4083d8b`). Tools / receipts: `tools/integration/words57*.{py,ts,sh}`, `tools/integration/fixtures/words57/`, receipt
`tools/integration/fixtures/words57-live-receipt.json`; test `tests/words57DeferredBattleUnits.test.ts`.

## Results

**The replay of a words-deferred lend (`resolveSpriteOrderDeferredLend`) now passes the battle units that row A of gates53 stopped at, for
the unit kinds proven on the ROM.** Sand-Attack / Mud-Slap stay declining past a battler replacement (their carry needs the body-time species,
which the word-free marker does not hold: below), so the measured gain on the census comes from Rain Dance / RAIN_CONTINUES chains.

- **ROM proof (`words57Chain.ts`, 24 direct-mGBA jobs, Scene ON, explicit lab seed `305419897`, each job twice in fresh processes per
  batch, A == B in 24/24; a fully fresh second batch reproduced every receipt byte-identically): 47/47 chains exact, 161,079 frames and
  3,454 allocation windows checked, 27 chains through battle units, 30/30 consumers after a battle unit lent the ROM order.**
- **Production:** a marker that opts in (the words-lend resolution's `LIVE_WORDS_ORDER_DEFERRED_REPLAY`: Sand-Attack 28 / Mud-Slap 189 /
  Rain Dance 240 / RAIN_CONTINUES markers) also replays: an **opponent** `faint`, `party-summary-next` / `-hide`, `next-mon-send-out`, the
  Factory AI's recall `switch-out {opponent}`, `forced-switch-out` of either side and `switch-in-start` / `-finish` of either side. A player
  faint, the player's recall, party menus / reshows, invalidations, the win slide and Ice Ball markers still decline. The carry learns
  whether a send-out / switch-in followed its body; the words carry (`liveWordsOrderDeferredCarry`) then declines Sand-Attack / Mud-Slap.
- **Census seeds 0..299 (`liveShareCensus.ts`, 841d54df4 vs final):** live **7,510 → 7,524 commands (94.23 % → 94.40 %)**, **1,114,736 →
  1,117,704 frames (95.42 % → 95.68 %)**: **+14 commands / +2,968 frames, 0 live → fallback regressions, 0 pairing mismatches**, identical
  command sequence (battle, move, side, battlers, frames, duration; only status / liveFrames of the 14 and gate line numbers of 348 declines
  differ) and battle digest `0fd00eae2078…`. Faithful-random history (D3, per command): **153 / 25,599 → 172 / 29,188** (+19 / +3,589): the
  14 new live commands plus 5 commands that were already live and now read the resolved lend (battle 149: Flamethrower ×3, Rock Slide ×2;
  both adapters are documented order-independent in output — Flamethrower "0/130 ages change", Rock Slide "seed-independent 0/40" — so only
  their claim class moves to faithful random).
- **gates53 instrument rerun (seeds 0..299):** row A **80 / 12,941 → 67 / 10,051 (−13 commands / −2,890 frames)**, the same 2,890 frames
  the census delta reports for the case-local bucket; row B unchanged (12 / 2,071); case-local bucket 102 / 16,630 → 89 / 13,740;
  fidelity 1,167,283 calls / 0 mismatches both runs. **Seeds 0..999: row A 258 / 42,054 → 208 / 32,186 (−50 / −9,868)**, row B unchanged
  (30 / 4,770), case-local 320 / 53,117 → 270 / 43,249, fidelity 3,937,417 calls / 0 mismatches both runs (841d54df4's row A is larger
  than gates53's 247 / 41,104 on `d71d9924`: alloc52 landed in between).
- **Dense production windows (twice fresh, RAM words pinned, 0 px):** Swift after Rain Dance + RAIN_CONTINUES + an opponent KO + summary +
  send-out (+ SUN_CONTINUES), two species pairs (Snorlax → Lickitung, Slowpoke → Onix), and Swift after RAIN_CONTINUES + the Factory AI's
  recall + summary + send-out (Mr. Mime → Lickitung): **3/3 windows 78/78 rows, 0 residual pixels, both runs identical digests.**
  Caveat: the words-free entry-lend control is also exact on these three windows (Swift's pixels do not depend on the order here), so the
  windows prove the live path end to end, not the lend; the lend itself is proven by the chain check and the vector test.
- **Parity (`words57Parity.ts`, census battle 40 = seed 40 / streak 48, where Double Team, Dragon Dance and Return go live through the
  replay):** 47 decision snapshots (round rules minus the Scene-OFF hit-marker bit, gameplay RNG, facility state) identical across Scene ON
  seed A, ON seed A again, ON seed `0xfeed0042` and Scene OFF; final RNG / facility identical; 3,236 faithful-random consumer frames identical
  between the two fresh seed-A runs.

### Host-state analysis (what the units need, and whether the deferred replay carries it)

- The units' state (`applyBattleUnit`): faint / forced-switch-out / switch-out need the side's **battler slot**; the summary needs the
  opponent battler gone; the send-out needs `lastUnit == "summary"` (the hide is an adjacency marker); switch-in-start needs
  `lastUnit` recall / reshow and the side's battler gone; switch-in-finish takes the start unit's n1 as the new battler. The **occupant roles**
  (healthbox mains, enemy shadow) are kept by all of them.
- The deferred replay tracker is `createSpriteOrderTracker({ known, free: post })`: battler slots 6 / 8 and roles 0 / 1 / 2, kept because
  the post-body free order (entry labels) leaves exactly the entry role set occupied. **So the replay already carries every piece of state
  these units read; nothing new had to be threaded through the marker for the order.**
- The marker's activation is the lend, i.e. **entry labels** (ρ of `spriteOrderEntryLabelRelabel`), also after an earlier KO / switch.
  Replaying battle units in entry labels lends what the real-slot host lends: 66/66 synthetic chains (`words57RhoCheck.ts`; (every pre-history of KO / Roar /
  player Roared / AI recall / party-menu reshows × KO / Roar / Whirlwind / AI-recall continuations) give the identical lend); on the ROM the
  nested chains after an earlier switch (ρ ≠ identity) were checked with a real-slot tracker per window and the production entry-label
  replay's lend equal to it at the activation and every consumer.
- Party menus never reach the replay: `openLiveSpriteOrderHostPartyMenu` / `returnLiveSpriteOrderHostFromPartyMenu` drop the marker (the
  reset revives the tracker). That is why a player faint or the player's voluntary switch never appear in row A, and why they stay unproven
  and declining.
- **What the replay could NOT get:** the words carry reads the **consumer's** displayed field for its battler anchors
  (`resolveWordsOrderLend`). Before words57 no send-in could separate body and consumer, so they were the body's. Past a send-out / switch-in
  they are the replacement's. Sand-Attack / Mud-Slap aim the dirt at both pic points: a single-species substitution changes the dirt carry's
  post-body free order in 32 of 1,008 trials on the probed bodies (`words57SpeciesSweep.ts`).
  The marker is created at the orchestrator call site (`factoryRoundBattleOrchestrator.ts` `markLiveSpriteOrderDeferredBody(...)`, outside
  this grant and under a sibling's edit), so the body-time species cannot be recorded here: **dirt carries decline past a replacement**
  (`battlerReplacedSince`), rain carries (field-wide drops, no anchors) do not.

### Per-kind verdict (ROM chains through the kind / frames of those chains, all exact; r1 == r2 in every job)

| kind | after 28 | after 189 | after RAIN_CONTINUES / 240 | production |
|---|---|---|---|---|
| faint {opponent} + summary + hide + send-out | 4 / 23,046 (+2 chains via the AI recall) | 4 / 23,059 | 3 / 21,197 (+1 via the AI recall) | replays (rain); dirt declines (species) |
| switch-out {opponent} (Factory AI perish recall) + summary + hide + send-out | 2 / 7,554 | 2 / 7,624 | 1 / 2,395 | replays (rain); dirt declines |
| forced-switch-out {opponent} + switch-in-start / -finish {opponent} (player's Roar, Whirlwind) | 2 / 12,599 | 2 / 12,473 | 2 / 4,725 | replays (rain); dirt declines |
| forced-switch-out {player} + switch-in {player} (opponent's Roar / Whirlwind) | 1 / 5,079 | 1 / 5,088 | 3 / 5,080 | replays (rain); dirt declines |
| faint {player}, the player's recall, party-menu reset / reshow, invalidate, trainer slide | not probed | | | decline (unchanged) |

Species: dirt users Pidgeotto, Sandshrew, Wooper, Electrode, Mr. Mime (player) and Pidgeotto, Sandshrew, Snorlax, Lapras (opponent); rain
users Snorlax, Slowpoke, Mr. Mime (player). Replaced battlers: opponent Onix, Lickitung, Sunkern, Chikorita, Pidgeotto, Sandshrew, Snorlax,
Lapras; player Pidgeotto, Wooper, Slowpoke (Roared / Whirlwinded).

### Remaining row A (seeds 0..299 after the change: 67 commands / 10,051 frames)

gates53's sub-reason reads the base allow-list from the source, so it still prints "non-replay unit (first: faint)" for these. A diagnostic
rerun with the new rules on seeds 24 / 52 / 243 / 291 named the actual step:
- Sand-Attack / Mud-Slap bodies before a send-in (6,658 frames at depth 0/1): declined by design (body-time species; resume: record the
  displayed species in the marker at `markLiveSpriteOrderDeferredBody`'s call site, then replay them; the ROM chains above already prove
  the order through these units).
- RAIN_CONTINUES markers whose sub-stream words were never recorded (`liveMovePresentationRngWords` null for the `general:` key): a
  tick-seam recording gap, not a replay rule.
- An unplanned body inside the chain (`no EXACT plan: body 258:player`, Hail), and Ice Ball's own markers (361 frames, out of scope).

## Method

1. **Probes** (`words57Probe.py`): complete Mechanics Lab parties (`overrides.parties`), explicit lab seed, per-mon levels to time the KO,
   move-slot cursor input (A / RIGHT / DOWN / A). Opponent KO: a frail lead KO'd by Swift after the words unit (same turn for an opponent
   words user, next turn for a player one). Forced: the player's Roar, the opponent's Roar / Whirlwind (priority −6). AI recall: Perish Song
   by a Soundproof player (Mr. Mime / Electrode), the AI active at timer 0 recalls at the turn-4 command boundary. Rain: Rain Dance, then a KO
   (with and without the faster opponent's Sunny Day replacing the rain), Roar, Whirlwind on the rain user, or the AI recall. Per frame
   `sSpriteOrder` + `gRng2Value` (`prep46OrderRngProbe.py`, unchanged).
2. **Units** (`words57Extract.py` = `prep46Extract.units_of`, plus every frame whose observed free order changed).
3. **Chain check** (`words57Chain.ts`): each words body carried with its RAM-read words (prep46Carry.ts models, every frame / window); then
   the production replay exactly as `resolveSpriteOrderDeferredLend` builds it, every unit read off the ROM windows and applied with
   `applySpriteOrderPresentationEvent`; every event's plan walked window by window (created / destroyed / free order), the production
   result equal to the walk; **every frame**: each ROM free-order change is a modelled window with that order. Two ROM shapes the plans
   compress: the ball destroy + 16th particle re-taking its slot in one frame (no mask change: the D/C pair must leave F unchanged), and the
   AI recall's particle destroys interleaving with the summary's creation (checked against one plan built from the two production plans'
   own tokens in the ROM order, plus the production sequence ending in the same order / occupancy). A nested marker after a switch keeps a
   real-slot tracker (carry in entry labels, mapped back by ρ⁻¹) and requires the production entry-label lend to equal it.
4. **Vectors** (`words57-lend-vectors.json`): at every consumer the production-shaped marker (nested as the host nests it), the ROM order /
   occupancy and the RAM words. The test resolves each through production (`LIVE_WORDS_ORDER_DEFERRED_REPLAY`, `liveWordsOrderDeferredCarry`,
   words from the pinned activation value = the RAM rows) and compares with the ROM order relabelled from the ROM occupancy.

## Commands

```
OUT=/tmp/w57 REC=/tmp/w57-rec sh tools/integration/words57Run.sh        # ~1 min: 24 jobs x 2 fresh, extract, chain; prints same/DIFF
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=<a.json> --commands=<a.jsonl>
python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
node --experimental-strip-types --no-warnings tools/integration/gates53GateCensus.ts --seeds=0..299 --out=<g.json> --scratch=<dir>   # also 0..999
python3 tools/integration/words57Fixtures.py <probe-out> <rgb-dir> <lend-vectors.json> tools/integration/fixtures/words57/live
  # rgb-dir: tools/run-mgba-probe.py <rgb>/<job>.json -- python tools/probe/run-battle-lab-rgb.py <scenario> <rgb>/<job>.json <rgb>/<job>-rgb
node --experimental-strip-types --no-warnings tools/integration/words57Windows.ts <out.json> tools/integration/fixtures/words57/live/*.json
POKEBENCH_LIVE_WORDS_CHAIN=entry-lend node ... words57Windows.ts <out.json> ...   # control
node --experimental-strip-types --no-warnings tools/integration/words57Parity.ts 40 <out.json>
node --experimental-strip-types --no-warnings tools/integration/words57Route.ts scan 0 179   # generated-rental routes: none found
node --experimental-strip-types --no-warnings tools/integration/words57RhoCheck.ts          # 66/66 SAME
node --experimental-strip-types --no-warnings tools/integration/words57SpeciesSweep.ts <units.json>   # 32 / 1008 differ
```
