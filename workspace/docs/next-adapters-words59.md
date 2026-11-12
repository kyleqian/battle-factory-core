# S10A words59: the dirt words-deferred carry at the body's displayed species; RAIN_CONTINUES words after the last command

Worker step (integration lane, base master `b3160da57`, production src tree `8d3b44bb`). Production commits `12a0131e7` (marker /
carry) and `df21b6464` (tick seam). Final production src tree **`7c49e0c3`**; later commits change tools / tests / fixtures / docs
only. Receipt: `tools/integration/fixtures/words59-live-receipt.json`. Tests: `tests/words59DeferredBodySpecies.test.ts` and
`tests/words59RainTrailingWords.test.ts`.

## Results

**Sand-Attack 28 / Mud-Slap 189 markers now record the species displayed at their body. The dirt carry aims at those pic points, so
the words-deferred replay passes the words57-proven battle units (opponent KO + summary + send-out, the AI's recall, Roar / Whirlwind
send-ins) for the dirt units too. The RAIN_CONTINUES "words null" gap was a tick-seam timing hole: an end-turn rain that is the last
event of its resolution. It is fixed render-pure.**

- **Marker (1).** `SpriteOrderDeferredLend.bodySpecies?: { player, opponent }` holds species ids only: word-free, no frames, no
  words. The orchestrator's `markLiveSpriteOrderDeferredBody(...)` call site (`factoryRoundBattleOrchestrator.ts`) passes the species
  of `battleResolutionMoveAnimationField(segment, command.eventSequence)`. That is the field the live renderer draws the body on, the
  same lookup gdgeo uses for its body plans. `liveSpriteOrderHost.ts` records it for 28 / 189 only. Unit appends and nesting spread
  the marker, so it survives.
- **Carry (2).** `liveWordsOrderDeferredCarry`: a dirt marker with `bodySpecies` takes its anchors from them
  (`liveBattlerAnchors(...).picOffsetPoint` of the body species; Y_PIC_OFFSET reads only the species, also for the Substitute doll).
  It no longer declines past a replacement. A species-free marker (tests, legacy) keeps words57's decline. The memo key (marker object
  + host body list) is now complete for dirt markers, because their result no longer depends on the consumer's field.
- **Vectors (4).** All 79/79 words57 ROM vectors resolve to the ROM order. That includes the 27 dirt-before-replacement vectors that
  declined. Each marker is given the body species the words57 chain check carried it with: `speciesInferred` (4 bodies), else the leads.
  The same 27 still decline with words57's species-free marker. Species swap: 3 pinned vectors where the consumer shows another species
  (Spearow 21 / Raticate 19 / Charizard 6):
  - recorded body species give the ROM order;
  - the species-free marker declines;
  - lifting the decline with the consumer's field gives a non-ROM order;
  - a wrong recorded species gives a non-ROM order.

  words59's own probes add 16/16 vectors (11 past a send-out) that resolve to the ROM order. Revert experiment: with
  `liveMoveAnimation.ts` reverted, the words59 vector test fails (2 failed / 1 passed).
- **(5) RAIN_CONTINUES words null.** `tickLiveMovePresentationRngSession` records a RAIN_CONTINUES sub-stream at the first command at
  or after the event. An end-turn rain that is the last event of its resolution has no such command, so its key was never recorded and
  every later consumer of its marker declined. Examples (`words59RainWordsDiag.ts`):
  - census battle 52: `general:8:0:87` after `message@86`;
  - census battle 282: `general:9:0:116` after `message@115`.

  Fix: at the last segment's final command, `through = +Infinity`, so the trailing event is recorded at that command's activation. That
  is where the order host applies the segment's trailing events and marks it (`isFinalCommand`). The record is non-consuming (state =
  the per-frame step only). Trailing events of an earlier segment keep the next segment's first command, so no existing word moves. In
  the seven affected battles, 54/54 rain events are now recorded (before: 2 missing). Census 0..299 "no recorded presentation words":
  15 / 2,737 frames → 0. Revert experiment: `tests/words59RainTrailingWords.test.ts` fails 1 of 2.
- **Census seeds 0..299 (`liveShareCensus.ts`, b3160da57 vs final).**
  - **Live:** 7,524 → 7,581 commands (**94.40 % → 95.12 %**) and 1,117,704 → 1,126,402 frames (**95.68 % → 96.42 %**), i.e.
    **+57 commands / +8,698 frames**.
  - **0 live → fallback regressions**, 0 pairing mismatches, identical command sequence, battle digest `0fd00eae2078…`. The only other
    differences are gate line numbers in 334 decline records.
  - **Faithful-random history (D3): 172 / 29,188 → 237 / 38,898 (+65 / +9,710).** That is the 57 new live commands plus 8 that were
    already live and now read the resolved lend: Flamethrower ×4, Rock Slide ×4, both documented order-independent by words57.
  - Marker only (`12a0131e7`): +42 / +5,961. The tick-seam fix adds +15 / +2,737.
  - The before report sha256 `8477f8ca…` equals words57's committed "after".
- **gates53 row A** (words57's definition; it reproduces words57's committed 67 / 10,051 and 208 / 32,186):
  - **seeds 0..299:** 67 / 10,051 → **12 / 1,509**. Row B unchanged (12 / 2,071). Case-local 89 / 13,740 → 34 / 5,198.
  - **seeds 0..999:** 208 / 32,186 → **46 / 6,841** (−162 / −25,345). Row B unchanged (30 / 4,770). Case-local 270 / 43,249 →
    108 / 17,904.
  - Fidelity is 1,167,283 / 3,937,417 calls with 0 mismatches on every run.
  - What remains under the production rules (`words59GateDiag.ts`, 0..299): post-unit replay lend null 20 / 3,219 (row-B type: Rain
    Dance ×7, Sand-Attack ×8, Mud-Slap ×5 chains) and Ice Ball's own markers 8 / 665. No "no recorded words" remain.
- **ROM.**
  - `words57Run.sh` is byte-identical: 47/47 chains, 161,079 frames, and `chain.json` / `units-summary.txt` /
    `words57-lend-vectors.json` all "same".
  - `words59Run.sh` covers 3 new jobs: an opponent's Mud-Slap or Sand-Attack, the slower player's consumer move KOs it, summary +
    send-out, then the consumers. Jobs ran A == B 3/3: 5/5 chains exact, 30,381 frames, 514 windows, and 11/11 consumers after the
    battle unit exact (Water Pulse, Silver Wind, Tackle). A fully fresh second batch reproduced all three receipts byte-identically.
- **Dense production windows** (`words57Windows.ts`, two fresh direct-mGBA runs each, RAM words pinned through the fixture hook,
  whose body steps now carry the dirt body species):
  - Water Pulse after opponent Sand-Attack + KO + summary + send-out (Slowpoke → Lickitung): **160/160 rows, 0 px**.
  - Water Pulse after Mud-Slap ×2 (nested) + KO + send-out: **160/160, 0 px**.
  - Silver Wind after Mud-Slap ×2 + KO + send-out (Snorlax → Lickitung): **193/193, 0 px**.
  - Both runs had identical digests on every window.
  - **Caveat (acceptance not met as asked):** the words-free entry-lend control is ALSO pixel-exact on all three windows. Water Pulse
    and Silver Wind pixels do not depend on the order in these windows, so like words57's Swift windows they prove the live path with
    body species end to end, not the lend itself. The lend is proven by the ROM chains and the vector tests. A Double Team consumer (an
    order-reading adapter) was tried, but the probe's cursor step did not select it (below).
- **Parity (`words57Parity.ts`):**
  - census battle 183 (Mud-Slap → Silver Wind ×3 live through the dirt replay): 24 decision snapshots;
  - census battle 264 (Mud-Slap → Water Pulse ×3): 22 decision snapshots.

  In both, the snapshots are identical across Scene ON seed A, ON seed A again, ON seed `0xfeed0042` and Scene OFF, and final RNG /
  facility state is identical. Faithful-random frames (681 / 691) are identical between the fresh seed-A runs and differ under seed B.
- **Gates (final code).**
  - Full suite on `df21b6464` (src `7c49e0c3`): 1,592 files passed / 44 skipped, 13,101 tests passed / 223 skipped.
  - Targeted: 22 files / 152 tests.
  - Tests importing the touched fixture harness: 34 files / 464 tests.
  - Smoke 448 passed; typecheck, build and `git diff --check` clean.
  - `compare:differential` (base b3160da57): PASS, 624 captures byte-identical across 3 traces.

## Notes

- The words57 tests (`tests/words57DeferredBattleUnits.test.ts`), `tests/spriteOrderDeferredLend.test.ts` and the words46 tests
  (`tests/wordsOrderDeferredLend.test.ts`) are unchanged and green. words57's dirt-decline assertions hold for its species-free
  fixture markers.
- Gameplay is untouched: the marker field is presentation-host only, and the tick-seam record is non-consuming (no draw moves). The
  census command sequence, battle digest and parity runs confirm it.
- Probe papercut: words57Probe's cursor step (`RIGHT` on a later turn) did not select move slot 1 in the Snorlax Swift / Double Team
  job, so the consumer move fills all four slots instead.

## Commands

```
OUT=/tmp/w59 REC=/tmp/w59-rec sh tools/integration/words59Run.sh   # ~30 s: 3 jobs x 2 fresh, extract, words57Chain.ts; same/DIFF
OUT=/tmp/w57 REC=/tmp/w57-rec sh tools/integration/words57Run.sh   # unchanged receipts
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=<a.json> --commands=<a.jsonl>
python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
node --experimental-strip-types --no-warnings tools/integration/gates53GateCensus.ts --seeds=0..299 --out=<g.json> --scratch=<dir>    # also 0..999
node --experimental-strip-types --no-warnings tools/integration/words59GateDiag.ts --seeds=0..299 --out=<d.json> --scratch=<dir>     # production-rule sub-reasons
node --experimental-strip-types --no-warnings tools/integration/words59RainWordsDiag.ts --seeds=0..299 --only=52,282                 # unrecorded rain keys
# fixtures: tools/run-mgba-probe.py <rgb>/<job>.json -- python tools/probe/run-battle-lab-rgb.py tools/integration/fixtures/words59/scenarios/<job>.json <rgb>/<job>.json <rgb>/<job>-rgb
python3 tools/integration/words59Fixtures.py /tmp/w59 <rgb> /tmp/w59-rec/chain.json /tmp/w59-rec/words59-lend-vectors.json tools/integration/fixtures/words59/live
node --experimental-strip-types --no-warnings tools/integration/words57Windows.ts <out.json> tools/integration/fixtures/words59/live/*.json
POKEBENCH_LIVE_WORDS_CHAIN=entry-lend node ... words57Windows.ts <out.json> ...   # control (exact too here: see caveat)
node --experimental-strip-types --no-warnings tools/integration/words57Parity.ts 183 <out.json>    # and 264
```
