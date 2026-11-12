# Soak deep sweep — 2026-08-20 FINAL (Milestone M-B final re-sweep)

The milestone's final acceptance artefact: `winning`-policy soak, seeds
0:480 (double the 0:240 range that first reached the carry ≥ 21 bar), on
the completed M-B tree — every folded lever present (step 2a type-aware
fight-move choice, swap-decline `3064e24e`, ISSUES #99/#100/#101/#103
fixes) and both #101/#103 verified fixed, #102 verified not currently
reproducible. Master HEAD at the start of this session: `2e656f84`.
Measurement + triage only.

All raw per-seed lines for every chunk are in
`docs/soak-deep-sweep-2026-08-20-final.log`, in seed order, exactly as the
CLI printed them (each chunk's own `=== soak summary ===` / `=== depth
distribution ===` block). Verbose per-seed logs used for the chain
confirmation below are **not committed** (~20-50k lines each); short
excerpts are quoted inline.

## Commands run

24 twenty-seed chunks, `--render-every 0`, run as six back-to-back batches
of four parallel foreground processes (never backgrounded past a turn):

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 0:20    --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 20:40   --render-every 0
... (24 total, 20-seed steps, covering 0:480)
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 460:480 --render-every 0
```

## `winning` policy, seeds 0:480

- **OK/CRASH/HANG: 480 OK, 0 CRASH, 0 HANG.** Zero crashes anywhere in the
  doubled range — both ISSUES #101 (seed 90) and #103 (seed 36) stay fixed,
  and #102 (seed 154) still does not reproduce (see the named-seed check
  below). No seed exhausted the `winning` budget (1,000,000 frames); the
  highest frame count observed was 561,000 (seed 409), so this remains not
  a budget-tuning question.
- **carry ≥ 7  (challengeNum ≥ 1):** 205/480 (42.71%)
- **carry ≥ 14 (challengeNum ≥ 2):** 54/480 (11.25%)
- **carry ≥ 21 (challengeNum ≥ 3):** **5/480 (1.04%) — seeds 125, 271, 328,
  406, 409.**
- **carry ≥ 28 (challengeNum ≥ 4):** **0/480 — not observed.** No seed's
  `factoryWinStreak` was ever sampled at 28; see the chain analysis below
  for how close the three deepest seeds got.
- **Deepest carry anywhere:** 21 (the five seeds above; none exceeded it).
- **Deepest battle-depth anywhere:** **27 — seeds 125, 328, 409** (carry 21
  + battleIndex 6, i.e. battle 7 — the final battle of the challenge
  entered at carry 21). This beats the previous deepest (25, seed 99,
  0:240 sweep) by two battles: these three seeds reach the **full width**
  of the carry-21 challenge, not just partway into it.

## Chunk-by-chunk breakdown

| seeds | OK | CRASH | HANG | carry≥7 | carry≥14 | carry≥21 | deepest carry | deepest depth |
|---|---|---|---|---|---|---|---|---|
| 0:20 | 20 | 0 | 0 | 11/20 | 6/20 | 0/20 | 14 | 20 |
| 20:40 | 20 | 0 | 0 | 12/20 | 3/20 | 0/20 | 14 | 20 |
| 40:60 | 20 | 0 | 0 | 13/20 | 2/20 | 0/20 | 14 | 20 |
| 60:80 | 20 | 0 | 0 | 8/20 | 1/20 | 0/20 | 14 | 15 |
| 80:100 | 20 | 0 | 0 | 8/20 | 2/20 | 0/20 | 14 | 20 |
| 100:120 | 20 | 0 | 0 | 8/20 | 1/20 | 0/20 | 14 | 17 |
| 120:140 | 20 | 0 | 0 | 11/20 | 3/20 | **1/20 (125)** | **21** | **27** |
| 140:160 | 20 | 0 | 0 | 4/20 | 0/20 | 0/20 | 7 | 13 |
| 160:180 | 20 | 0 | 0 | 9/20 | 2/20 | 0/20 | 14 | 18 |
| 180:200 | 20 | 0 | 0 | 7/20 | 1/20 | 0/20 | 14 | 18 |
| 200:220 | 20 | 0 | 0 | 7/20 | 1/20 | 0/20 | 14 | 14 |
| 220:240 | 20 | 0 | 0 | 13/20 | 5/20 | 0/20 | 14 | 17 |
| 240:260 | 20 | 0 | 0 | 8/20 | 3/20 | 0/20 | 14 | 20 |
| 260:280 | 20 | 0 | 0 | 5/20 | 1/20 | **1/20 (271)** | **21** | 21 |
| 280:300 | 20 | 0 | 0 | 7/20 | 1/20 | 0/20 | 14 | 14 |
| 300:320 | 20 | 0 | 0 | 8/20 | 0/20 | 0/20 | 7 | 13 |
| 320:340 | 20 | 0 | 0 | 11/20 | 4/20 | **1/20 (328)** | **21** | **27** |
| 340:360 | 20 | 0 | 0 | 10/20 | 2/20 | 0/20 | 14 | 20 |
| 360:380 | 20 | 0 | 0 | 7/20 | 2/20 | 0/20 | 14 | 20 |
| 380:400 | 20 | 0 | 0 | 5/20 | 2/20 | 0/20 | 14 | 15 |
| 400:420 | 20 | 0 | 0 | 9/20 | 4/20 | **2/20 (406,409)** | **21** | **27** |
| 420:440 | 20 | 0 | 0 | 10/20 | 3/20 | 0/20 | 14 | 16 |
| 440:460 | 20 | 0 | 0 | 3/20 | 1/20 | 0/20 | 14 | 14 |
| 460:480 | 20 | 0 | 0 | 11/20 | 4/20 | 0/20 | 14 | 19 |
| **total** | **480** | **0** | **0** | **205/480** | **54/480** | **5/480** | **21** | **27** |

## Deepest-seed chain confirmation (goal 2)

`randomRoundSoakDriver.ts`'s `maxCarriedWinStreak`/`maxBattleDepth` are each
the **peak** value sampled across a seed's *entire* run (which typically
continues through several more chained rounds after the deep one), not the
run's final state — matching the 0:240 sweep's seed-99 methodology. Round
boundaries were located via each seed's `draft confirm: YES` marker (the
end of the 3-mon rental draft, logged with the *previous* round's final
`b`/`t` still attached before the new round's intro resets them), not the
`draft: open menu on slot 1` shorthand used in the prior doc (drafts don't
always open slot 1 first — this run cross-checked both and prefers the
marker that never misses a round).

**Seed 328 — unambiguous, the cleanest confirmation available:** exactly 4
`draft confirm: YES` markers (fresh start + 3 round-ends), so the 4th round
is the last thing this seed's run plays before terminating — its own
`roundComplete` result is directly that round's outcome, no later round to
disambiguate against.

```
[f=212    b1 t0]  draft confirm: YES  -- fresh start, carry 0
[f=69262  b7 t10] draft confirm: YES  -- round 1 WON (b7)  -> carry 7
[f=134616 b7 t15] draft confirm: YES  -- round 2 WON (b7)  -> carry 14
[f=191908 b7 t26] draft confirm: YES  -- round 3 WON (b7)  -> carry 21
seed 328 terminates here: b7 t14, 249367f, roundComplete, carry<=21 depth<=27
```

Round 4 (entered at carry 21, `challengeNum = floor(21/7) = 3`, the
`CHECK_BAD_MOVE`-only AI tier) plays the **full 7 battles and wins all of
them** — `depth 21 + 6 = 27`, matching `maxBattleDepth`. This is the first
time in any sweep to date that a seed clears the entire carry-21 challenge
rather than losing partway through it.

**Seeds 125 and 409 — same depth-27 ceiling, reached by falling at the last
hurdle instead:** both have many more draft markers (10 and 13
respectively — several early losses before the winning streak begins), and
in both cases the round entered at carry 21 is followed by *another* round
in the same run, so their own final `roundComplete`/`roundLost` line
reflects a later, lower-carry round, not the carry-21 peak. The peak
round's own fate has to be inferred from the ceiling itself: if the
carry-21 round had been *won*, `factoryWinStreak` would read 28 and
`maxBattleDepth` would read at least 28 (21+7 or more) for the remainder of
that seed's run — neither ever appears in either seed's output
(`maxCarriedWinStreak` caps at 21, `maxBattleDepth` at 27 exactly). The only
value of `battleIndex` consistent with that ceiling is 6 (battle 7) with
the round then ending in a **loss**, not a win — i.e. both seeds reach
battle 7 of the carry-21 challenge and lose that final battle, one battle
short of banking the streak to 28:

```
seed 125 round chain (draft confirm: YES markers, previous round's ending b/t):
  carry 0 -> 5 early losses (rounds ending b3/b4/b4/b1/b4) -> still carry 0
  [f=189321 b7 t4] round WON  -> carry 7
  [f=263061 b7 t8] round WON  -> carry 14
  [f=315463 b7 t9] round WON  -> carry 21
  [f=382735 b7 t15] round entered at carry 21 reaches battle 7 -- LOST (implied: carry
    resets, maxCarriedWinStreak stays 21, maxBattleDepth stays 27) -> carry 0
  (one more round is then played and WON before the run ends: final line
   "roundComplete carry<=21 depth<=27" belongs to that later, unrelated round)

seed 409: identical shape (10 early markers before the streak, carry
  0->7->14->21 through three wins, then a loss at battle 7 of the carry-21
  round -- same 21/27 ceiling), followed by two further chained rounds
  before the run's actual final state (roundLost, a much later round).
```

**Headline:** carry ≥ 28 (the full `CHECK_BAD_MOVE` + AI-triad tier,
`challengeAtLeast4` in `factoryAiMaskSelection.ts`) was **not reached** in
this 480-seed sweep. The closest approach is exact and now three-seeds
deep: battle 7 (the last battle) of the challenge entered at carry 21 —
seed 328 wins that battle and the whole round (still doesn't push the
*next* round's play far enough to sample carry 28 before its run ends);
seeds 125 and 409 lose that same battle 7 and fall back to carry 0. No
seed in this sweep's range ever plays a single frame at `factoryWinStreak
= 28`.

## Named-seed check (goal 3)

The three previously-crashing seeds are all in-range (0:480) and clean:

| seed | prior issue | this sweep | notes |
|---|---|---|---|
| 90 | #101 (Lock-On missing `messageLines` case) | OK, `roundLost carry<=0 depth<=3` | fixed in `c4f3c74d`'s sibling commit `f9f13a9b`; RNG trajectory shifted post-fix, now a short shallow loss, no crash |
| 154 | #102 (`switchhandleorder` no decided `monToSwitchIntoId`) | OK, `roundLost carry<=0 depth<=5` | still not reproducing on HEAD, consistent with PROGRESS 1364's diagnosis-only finding; #102 stays open (diagnostic remainder, no live repro) |
| 36 | #103 (`AI_CV_DefenseUp`/`SpDefUp` indexed `gBattleMoves[0xFFFF]`) | OK, `roundComplete carry<=14 depth<=20` | fixed in `c4f3c74d`; now runs deep and clean |

## Triage

**No new crash or hang signatures.** 0/480 CRASH, 0/480 HANG — nothing to
file. Next free issue number was confirmed as **#104** (`git log -p --
ISSUES.md | grep -o "^+## #[0-9]*" | sort -t'#' -k3 -n | tail -1` → `#103`)
but no entry was needed this session.

## Before/after table (winning policy)

| when | code state | seeds | OK | carry≥7 | carry≥14 | carry≥21 | carry≥28 | deepest carry | deepest battle-depth |
|---|---|---|---|---|---|---|---|---|---|
| 2026-08-19 | pre-#99-fix, pre-2a | 0:180 | 180/180 | 64/180 (35.6%) | 10/180 (5.6%) | 0/180 (0%) | 0/180 | 14 | 16 (seed 61) |
| 2026-08-20 (1361) | post-#99/#100-fix + 2a, pre-swap-decline | 0:240 | 238/240 | 105/240 (43.75%) | 33/240 (13.75%) | 1/240 (0.4%) | 0/240 | 21 | 25 (seed 99) |
| **this sweep (final)** | **post-#99/#100/#101/#103-fix + 2a + swap-decline** | **0:480** | **480/480 (100%)** | **205/480 (42.71%)** | **54/480 (11.25%)** | **5/480 (1.04%)** | **0/480 (0%)** | **21** | **27 (seeds 125, 328, 409)** |

Crash rate is the headline improvement: 2/240 (0.83%) in the pre-#101/#103
sweep down to **0/480 (0%)** here, at double the range. `carry ≥ 21`'s rate
more than doubled (0.4% → 1.04%), and the deepest reach grew from "one
battle into the carry-21 challenge, then lose" (depth 25, seed 99) to "the
full 7-battle width of the carry-21 challenge" (depth 27, three seeds, one
of which — 328 — wins it outright). `carry ≥ 7`/`carry ≥ 14` rates are
within normal sampling noise of the 0:240 baseline (a wider seed range
naturally regresses toward the underlying rate rather than the luckier
0:240 draw); the stretch metrics (`carry ≥ 21`, deepest depth) are what
moved, and they moved in the right direction.

## M-B final-sweep headline

`carry ≥ 21` is confirmed again at a wider sample (5/480 vs. 1/240), the
crash count for the fixed issues (#101, #103) is verified at **zero** across
the full doubled range, #102 remains non-reproducible, and the deepest
reach has advanced from "one battle into the `CHECK_BAD_MOVE` tier" to "the
full width of it, including one clean win of the entire challenge" (seed
328). `carry ≥ 28` (the full AI-triad tier) is **not yet reached** — the
closest any seed gets is exactly its threshold (battle 7, the last battle,
of the carry-21 challenge), confirmed independently by three different
seeds. This is the milestone's acceptance-bar evidence at the wider,
final-sweep range requested; the supervisor's stretch question (does
`winning` reach carry ≥ 28) has a clean, negative-but-close answer rather
than an ambiguous one.
