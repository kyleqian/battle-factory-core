# S10A gates53: the census's "case-local" consumer gates, by exact condition

Worker step (integration lane, base master `28f1f1ee4`, production src tree `d71d9924`). Instrument: `tools/integration/gates53GateCensus.ts`;
reports `tools/integration/fixtures/gates53-gate-census-seeds0-{299,999}.json`; receipt `tools/integration/fixtures/gates53-live-receipt.json`.

## Results

**No consumer gate was lifted. Production `src/` is unchanged (tree `d71d9924` = master).** The "unclassified (case-local gate)" bucket
is not made of case-local consumer conditions. On seeds 0..999 it is 320 commands / 53,117 fallback frames after Blizzard landed. Of
those frames, 93.4 % (49,613) fall back because the **order host's lend is unknown**. Most of that (45,874 frames, rows A + B) is a pre-switch
words-deferred lend that `resolveSpriteOrderDeferredLend` cannot resolve. The census classifier could not see this: it evaluates the raw
`spriteOrderInput` and stops at the case's first opaque gate. The only consumer-side condition left is Flatter's `!spriteOrderInput.firstBody`
(3,504 frames / 16 commands). It is a later-body register / allocator gate on a faithful-random adapter and was not proven here, so it
stays.

### Ranking by exact condition (seeds 0..999; 0..299 in brackets)

| # | exact condition (where it fires) | commands | fallback frames | share | verdict |
|---|---|---:|---:|---:|---|
| A | words-deferred lend unresolved: **a unit outside `DEFERRED_REPLAY_UNITS` followed the words unit** (first such unit: faint 35,457 fr; switch-out 3,749; forced-switch-out 1,898; RAIN_CONTINUES / Sand-Attack 28 / Mud-Slap 189 / Rain Dance 240 units at chain depth 0..10). Consumers decline on their own `!spriteOrderInput?.known` (Double Team :2785, Dig :3191, Water Pulse :3289, Silver Wind :3346, Megahorn :3537, Thunderbolt / Seismic Toss / Aurora Beam :2624, Ice Beam :2936, ... 33 move/side pairs) | 247 [76] | 41,104 [12,580] | 77.4 % | (iii) correct at the consumer; host-side, out of scope |
| B | words-deferred lend unresolved: the carry succeeds but the **post-unit replay lend is null** (`spriteOrderTrackerLend`: the replayed tracker is not role-isomorphic to the known entry) | 30 [12] | 4,770 [2,071] | 9.0 % | (iii) host-side, out of scope |
| E | Flatter `!spriteOrderInput.firstBody` (:3638; 3 of the 16 had a resolved words-deferred lend) | 16 [5] | 3,504 [1,095] | 6.6 % | (iii) not proven, left (see below) |
| D | Flatter `!spriteOrderInput?.known` on the raw input, a plain lend-unknown. The census could not reach it because Flatter's first gate reads the case-local `rng` | 11 [1] | 2,409 [219] | 4.5 % | host-side (order lend), out of scope |
| C | Ice Ball `activationOrder === null` (:3821): Ice Ball's OWN deferred lend. A faint followed the earlier Ice Ball body (950 fr), or the case carry returned null with words recorded (380 fr) | 16 [8] | 1,330 [665] | 2.5 % | (iii) host-side (A's allow-list) / case carry, out of scope |
| | **total** | **320 [102]** | **53,117 [16,630]** | | |

- **What the supervisor's start triage got wrong.** Double Team's declines do not come from "`spriteOrderForSlots(..., [3, 4])` null
  after a lend". All 36 case-local Double Team commands (8,280 frames) fire `!spriteOrderInput?.known` at :2785, after the words-deferred resolution
  returned null (row A). The same holds for Water Pulse, Dig, Silver Wind, Megahorn, Ice Beam, Thunderbolt, Seismic Toss, Giga Drain,
  Dragon Dance, Return, Curse, Mud-Slap and Sand-Attack. Their own case gates never ran.
- **Instrument fidelity.** It runs an instrumented copy of the production `liveMoveAnimationPresentation`, imports resolved to the same
  modules. Its null-ness matched production on every call: 3,937,417 calls on 0..999 and 1,167,283 on 0..299, **0 mismatches**. No
  command fired more than one exact gate across its frames. Two runs on seeds 0..299 are byte-identical (sha256 `b511b533`).
- **UNPROVEN lever size for the host lane** (a predictor, never a production input). I replayed every recorded unit with the production
  plans, dropping the allow-list; an unplanned unit still invalidates the tracker. Then I called the production consumer with the
  resulting lend:
  - 156 commands / 25,554 frames would draw (0..299: 53 / 8,695);
  - 121 / 20,320 still get a null lend;
  - 3 / 657 resolve, but Flatter's firstBody gate still declines.
  This is the gain available from widening the deferred replay. It still needs per-frame ROM order proof for faint / send-out /
  switch units replayed after a words unit.

### Census before / after (seeds 0..299, `tools/integration/liveShareCensus.ts` + `prep43CensusDelta.py`)

The final code has the same `src/` as `28f1f1ee4`; `git diff 28f1f1ee4 -- src` is empty. I ran the census twice on the final tree, and
the two reports are byte-identical (report sha256 `ced10f10`, commands jsonl sha256 `a88f3020`):

- **7,970 commands, 7,450 live: 93.48 % by count; 1,108,724 / 1,168,201 frames live: 94.91 % by frames.**
- Delta 0 / 0. 0 live -> fallback regressions, 0 pairing mismatches.
- Battle digest `0fd00eae2078...`, command digest `faf421f5158d...`, identical between the runs.

There are no live-test pin moves, and Scene ON/OFF parity through a lifted gate is not applicable, because no gate was lifted.

### Per-gate verdicts and why each is left (resume conditions)

1. **A (77 %) — deferred replay allow-list.** `resolveSpriteOrderDeferredLend` (`src/engine/spriteOrderEventTransform.ts`) declines when
   any recorded unit after the words body is outside `DEFERRED_REPLAY_UNITS` (action-prompt, actions-committed, move-menu,
   move-animation, hit-animation, stat-animation, status-animation, general-animation). In ordinary play the first offending unit is
   mostly a KO: faint -> party summary -> next-mon-send-out. This is an **order-host replay rule**, not a consumer gate. The file is a
   sprite-order host file, and order-host plans are out of scope for this step, so it was not touched.
   - **Resume:** a host-lane grant on `spriteOrderEventTransform.ts`, plus a lend-chain check (`tools/integration/s10aLendChainCheck.ts`
     design) proving the production faint / send-out / switch-out plans exact when replayed from a post-words free order. That means
     fresh direct-mGBA probes with RAM-read words, a KO after Sand-Attack / Mud-Slap / Rain Dance / RAIN_CONTINUES, both sides.
   - The predictor above bounds the gain at +156 commands / +25.6k frames on 0..999.
2. **B (9 %) — post-unit replay lend null.** The words carry gives a free order, but replaying the recorded units with the production
   plans leaves a tracker that `spriteOrderTrackerLend` will not lend (not role-isomorphic to the known entry). Host-side.
   - **Resume:** the order host's role-relabel for those unit sequences: 189/player, 240/opponent, 28/player, RAIN_CONTINUES/opponent;
     unit lists in the report.
3. **E (6.6 %) — Flatter `firstBody` (:3638): left, not proven.**
   - **What the adapter assumes.** It feeds the first-body register base S0 (WIN0 240 / 161) and the known-entry allocator (spotlight
     tile 305, confetti 433, palette slots 7 / 8). It never reads `spriteAllocatorInput.historyKnown`, so `firstBody` also stands in for
     the allocator claim.
   - **Why later bodies differ.** The production later-body register rule elsewhere (`liveQ2Moves.ts` `registersFor`) is S0 with WIN0
     0 / 0. The Flatter D3 check (`tools/integration/prep35FlatterCheck.ts`) is first-body only: activation order = known entry, S0.
   - **Resume.** All of these are needed:
     - later-body Flatter battle-lab stagings, both sides and at least 2 species, after a non-window predecessor (Tackle) and after a
       WIN0-writing one (a first Flatter);
     - fresh direct-mGBA dense windows run twice;
     - the D3 check extended to the lent activation order (RAM-read words) and the later-body register base;
     - the gate narrowed to `spriteAllocatorInput?.historyKnown` plus the later-body registers.
   - The gain is small: 16 commands / 3.5k frames on 0..999.
4. **D (4.5 %) — Flatter raw lend unknown.** This is an ordinary order-lend gap that the census mislabels. The order host's stop reason
   is in the census's lend-unknown detail.
5. **C (2.5 %) — Ice Ball own deferred.**
   - 950 frames: a faint followed the earlier Ice Ball body, so this is row A's allow-list.
   - 380 frames: the case carry returned null with words recorded (counter / prefix / `postBodyFree`). That is Ice Ball's own rollout
     carry, a separate host-history question.

### Recommendation

`tools/integration/liveShareCensusGates.ts` should resolve the words-deferred lend before walking a case. It can use the exported
production pieces, as `gates53GateCensus.ts` `deferredSubReason` does. With that, the census would report rows A / B as "sprite-order
lend unknown (words-deferred: ...)" rather than "case-local". This step did not change that shared classifier.

### Per move / side (seeds 0..999, case-local bucket only; the consumer gate line each command reached)

| # | move | side | gate line | commands | fallback frames | exact condition (frames) |
|---|---|---|---:|---:|---:|---|
| 1 | FLATTER | player | 3638 | 22 | 4818 | Flatter firstBody 1752; raw lend unknown (behind opaque rng gate) 1533; words-deferred: post-unit replay lend null 876; words-deferred: non-replay unit (first: faint) 657 |
| 2 | WATER PULSE | player | 3289 | 28 | 4480 | words-deferred: non-replay unit (first: faint) 3200; words-deferred: post-unit replay lend null 960; words-deferred: non-replay unit (first: forced-switch-out) 320 |
| 3 | DOUBLE TEAM | player | 2785 | 19 | 4370 | words-deferred: non-replay unit (first: faint) 4370 |
| 4 | DOUBLE TEAM | opponent | 2785 | 17 | 3910 | words-deferred: non-replay unit (first: faint) 2990; words-deferred: non-replay unit (first: switch-out) 920 |
| 5 | DIG | opponent | 3191 | 24 | 3283 | words-deferred: non-replay unit (first: faint) 3283 |
| 6 | FLATTER | opponent | 3638 | 12 | 2628 | Flatter firstBody 1752; raw lend unknown (behind opaque rng gate) 876 |
| 7 | SILVER WIND | opponent | 3346 | 9 | 1764 | words-deferred: non-replay unit (first: faint) 1764 |
| 8 | MEGAHORN | opponent | 3537 | 9 | 1593 | words-deferred: non-replay unit (first: faint) 1593 |
| 9 | RETURN | opponent | 3480 | 5 | 1410 | words-deferred: non-replay unit (first: faint) 1128; words-deferred: non-replay unit (first: forced-switch-out) 282 |
| 10 | SILVER WIND | player | 3346 | 7 | 1351 | words-deferred: non-replay unit (first: forced-switch-out) 579; words-deferred: post-unit replay lend null 386; words-deferred: non-replay unit (first: faint) 386 |
| 11 | ICE BALL | player | 3821 | 16 | 1330 | Ice Ball own deferred: faint after the earlier body 950; Ice Ball own deferred: case carry null 380 |
| 12 | WATER PULSE | opponent | 3289 | 8 | 1280 | words-deferred: non-replay unit (first: faint) 1280 |
| 13 | ICE BEAM | opponent | 2936 | 6 | 1218 | words-deferred: post-unit replay lend null 812; words-deferred: non-replay unit (first: faint) 406 |
| 14 | ICE BEAM | player | 2936 | 6 | 1218 | words-deferred: post-unit replay lend null 609; words-deferred: non-replay unit (first: faint) 406; words-deferred: non-replay unit (first: switch-out) 203 |
| 15 | THUNDERBOLT | opponent | 2624 | 5 | 1185 | words-deferred: non-replay unit (first: faint) 948; words-deferred: non-replay unit (first: forced-switch-out) 237 |
| 16 | GIGA DRAIN | player | 2738 | 5 | 1150 | words-deferred: non-replay unit (first: faint) 1150 |
| 17 | DRAGON DANCE | opponent | 2511 | 8 | 1136 | words-deferred: non-replay unit (first: faint) 1136 |
| 18 | SEISMIC TOSS | player | 2624 | 5 | 1135 | words-deferred: non-replay unit (first: switch-out) 1135 |
| 19 | MUD-SLAP | player | 3254 | 21 | 1071 | words-deferred: non-replay unit (first: faint) 714; words-deferred: post-unit replay lend null 255; words-deferred: non-replay unit (first: forced-switch-out) 102 |
| 20 | CURSE | opponent | 3412 | 6 | 1056 | words-deferred: non-replay unit (first: switch-out) 1056 |
| 21 | SAND-ATTACK | player | 3254 | 18 | 1044 | words-deferred: non-replay unit (first: faint) 754; words-deferred: non-replay unit (first: forced-switch-out) 174; words-deferred: post-unit replay lend null 116 |
| 22 | DIVE | opponent | 3766 | 8 | 920 | words-deferred: non-replay unit (first: faint) 690; words-deferred: post-unit replay lend null 230 |
| 23 | SHOCK WAVE | opponent | 3557 | 3 | 790 | words-deferred: post-unit replay lend null 526; words-deferred: non-replay unit (first: faint) 264 |
| 24 | SKY UPPERCUT | player | 2131 | 4 | 752 | words-deferred: non-replay unit (first: faint) 752 |
| 25 | PETAL DANCE | player | 2195 | 3 | 732 | words-deferred: non-replay unit (first: faint) 732 |
| 26 | PETAL DANCE | opponent | 2195 | 3 | 732 | words-deferred: non-replay unit (first: faint) 732 |
| 27 | GIGA DRAIN | opponent | 2738 | 3 | 690 | words-deferred: non-replay unit (first: faint) 690 |
| 28 | AURORA BEAM | player | 2624 | 3 | 648 | words-deferred: non-replay unit (first: faint) 648 |
| 29 | DESTINY BOND | player | 2078 | 3 | 564 | words-deferred: non-replay unit (first: faint) 564 |
| 30 | CURSE | player | 3412 | 3 | 528 | words-deferred: non-replay unit (first: faint) 528 |
| 31 | LEAF BLADE | player | 2233 | 2 | 448 | words-deferred: non-replay unit (first: faint) 448 |
| 32 | SKILL SWAP | opponent | 3671 | 2 | 392 | words-deferred: non-replay unit (first: faint) 392 |
| 33 | MAGNITUDE | opponent | 2607 | 2 | 380 | words-deferred: non-replay unit (first: faint) 206; words-deferred: non-replay unit (first: switch-out) 174 |
| 34 | SAND-ATTACK | opponent | 3254 | 5 | 290 | words-deferred: non-replay unit (first: faint) 290 |
| 35 | ROCK THROW | opponent | 2265 | 3 | 261 | words-deferred: non-replay unit (first: switch-out) 261 |
| 36 | PERISH SONG | opponent | 2278 | 1 | 259 | words-deferred: non-replay unit (first: faint) 259 |
| 37 | SEISMIC TOSS | opponent | 2624 | 1 | 228 | words-deferred: non-replay unit (first: faint) 228 |
| 38 | MEGA DRAIN | opponent | 2738 | 1 | 218 | words-deferred: non-replay unit (first: faint) 218 |
| 39 | AURORA BEAM | opponent | 2624 | 1 | 216 | words-deferred: non-replay unit (first: faint) 216 |
| 40 | MUD-SLAP | opponent | 3254 | 4 | 204 | words-deferred: non-replay unit (first: forced-switch-out) 204 |
| 41 | SKILL SWAP | player | 3671 | 1 | 196 | words-deferred: non-replay unit (first: faint) 196 |
| 42 | DIG | player | 3191 | 1 | 195 | words-deferred: non-replay unit (first: faint) 195 |
| 43 | HORN DRILL | opponent | 2624 | 1 | 192 | words-deferred: non-replay unit (first: faint) 192 |
| 44 | SKY ATTACK | opponent | 3048 | 1 | 180 | words-deferred: non-replay unit (first: faint) 180 |
| 45 | NIGHTMARE | player | 3588 | 1 | 168 | words-deferred: non-replay unit (first: faint) 168 |
| 46 | SUNNY DAY | opponent | 2738 | 1 | 158 | words-deferred: non-replay unit (first: faint) 158 |
| 47 | RAPID SPIN | player | 3076 | 1 | 130 | words-deferred: non-replay unit (first: faint) 130 |
| 48 | SPIKES | opponent | 2995 | 1 | 113 | words-deferred: non-replay unit (first: faint) 113 |
| 49 | PURSUIT | opponent | 3438 | 1 | 103 | words-deferred: non-replay unit (first: faint) 103 |

## Method

- `gates53GateCensus.ts` copies `src/engine/liveMoveAnimation.ts` into a scratch dir (default `.integration/gates53-census/`, gitignored).
  It rewrites every `if (COND) return null` inside `liveMoveAnimationPresentation` to
  `if (__g53.gate(LINE, [() => d1, () => d2, ...])) return null`, where d1, d2, ... are COND's top-level `||` disjuncts, kept in order
  with the same short-circuit. Every other `return null` records its line. Relative imports become absolute file URLs, so the copy uses
  the production module instances.
- Per presented move frame, the copy and the production function are both called with the census inputs. Battles, input policy and
  presentation seam are `liveShareCensus.ts`'s. Null-ness must agree; the mismatches are counted, and there were 0. The last recorded
  hit of a null call is the gate that fired.
- A command is in the case-local bucket when `liveShareCensusGates.ts` `classifyPresentationDecline` says "unclassified (case-local
  gate)" at its first fallback frame, the census's own rule.
- For a words-deferred input, `deferredSubReason` re-runs the production resolution step by step: the replay allow-list read from the
  production source, the activation recursion, `liveMovePresentationRngWords`, `liveWordsUnitPostFree`, then
  `resolveSpriteOrderDeferredLend`. It names the first step that returns null.
- `resolveWithoutAllowList` is the UNPROVEN predictor described above.

## Commands

```
# exact gate census (~2.5 min / ~8 min)
node --experimental-strip-types --no-warnings tools/integration/gates53GateCensus.ts --seeds=0..299 \
  --out=tools/integration/fixtures/gates53-gate-census-seeds0-299.json [--commands=<file.jsonl>] [--scratch=<dir>]
node --experimental-strip-types --no-warnings tools/integration/gates53GateCensus.ts --seeds=0..999 \
  --out=tools/integration/fixtures/gates53-gate-census-seeds0-999.json
# live-share census before / after (identical src) + delta
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=<a.json> --commands=<a.jsonl>
python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
```
