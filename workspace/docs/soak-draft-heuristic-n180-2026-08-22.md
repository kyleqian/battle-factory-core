# `winning` draft-by-strength heuristic — n=180 re-measurement (2026-08-22)

Measurement-only side-lane step (worktree `worker/side-20260822-135030`,
Battle Scene OFF oracle). Re-measures the withheld draft-by-strength
heuristic (`wip/mb-step2b-draft-heuristic`) at a larger, non-anchor-biased
sample so the supervisor can make the fold/withhold call. History: this
heuristic measured WORSE at n=60 (2026-08-20 morning, pre-#104) and NEUTRAL
at n=30 on the #104-fixed tree (§6 of
`docs/soak-winning-loss-analysis-2026-08-20.md`) — both samples explicitly
flagged as too small to trust, especially past the carry>=21 threshold.

This lane only measures the heuristic arm (`--policy winning` with the
heuristic applied). The baseline arm (same seeds, master without the
heuristic) was run separately by the supervisor on an identical base for a
like-for-like comparison; it is not reproduced here.

## Method

1. Rebased `wip/mb-step2b-draft-heuristic`'s three commits (`04f57634` feat,
   `33290378` test rebase, `18222b3a` §6 doc) onto this worktree's base
   (master `96a64a8e`). The rebase was conflict-free: `git rebase --onto`
   auto-merged the feature/test commits against the round-identity reset in
   `trackProgress` and the new ISSUES #104 pins because the two diffs touch
   disjoint regions of `randomRoundSoakDriver.ts` / `randomRoundSoak.test.ts`.
   The third commit (`18222b3a`, the §6 doc text) dropped as "already
   upstream" — that content is already on master via `4a9b2636`.
   `npm run test:smoke` (444/444) and the full `tests/randomRoundSoak.test.ts`
   (38/38) both green post-rebase, landing as `6487ecff` (feat) and
   `b7b89e1c` (test fix) on `worker/side-20260822-135030`.
2. Measured `node --experimental-strip-types tools/soak/randomRoundSoak.ts
   --policy winning --seeds 0:180 --render-every 0` as four parallel 45-seed
   chunks (`0:45`, `45:90`, `90:135`, `135:180`), each run to completion
   (~1110-1133s / ~18.5-18.9 min wall each, run concurrently).

## Chunk summaries (verbatim)

### seeds 0:45

```
=== soak summary: 45 seeds (policy winning) in 1111.5s ===
OK 45  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 45/45
carry >= 14 (challengeNum >= 2): 44/45
carry >= 21 (challengeNum >= 3): 3/45
carry >= 28 (challengeNum >= 4): 0/45
deepest carry anywhere: 21
deepest battle-depth anywhere: 23

=== OK breakdown ===
  budget: 45
```

### seeds 45:90

```
=== soak summary: 45 seeds (policy winning) in 1120.8s ===
OK 45  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 45/45
carry >= 14 (challengeNum >= 2): 45/45
carry >= 21 (challengeNum >= 3): 2/45
carry >= 28 (challengeNum >= 4): 0/45
deepest carry anywhere: 21
deepest battle-depth anywhere: 21

=== OK breakdown ===
  budget: 45
```

### seeds 90:135

```
=== soak summary: 45 seeds (policy winning) in 1133.0s ===
OK 45  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 45/45
carry >= 14 (challengeNum >= 2): 45/45
carry >= 21 (challengeNum >= 3): 1/45
carry >= 28 (challengeNum >= 4): 0/45
deepest carry anywhere: 21
deepest battle-depth anywhere: 21

=== OK breakdown ===
  budget: 45
```

### seeds 135:180

```
=== soak summary: 45 seeds (policy winning) in 1117.9s ===
OK 45  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 45/45
carry >= 14 (challengeNum >= 2): 44/45
carry >= 21 (challengeNum >= 3): 1/45
carry >= 28 (challengeNum >= 4): 0/45
deepest carry anywhere: 21
deepest battle-depth anywhere: 21

=== OK breakdown ===
  budget: 45
```

## Combined (n=180)

| | OK | CRASH | HANG | carry>=7 | carry>=14 | carry>=21 | carry>=28 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| + draft heuristic (0:45) | 45/45 | 0 | 0 | 45/45 | 44/45 | 3/45 | 0/45 |
| + draft heuristic (45:90) | 45/45 | 0 | 0 | 45/45 | 45/45 | 2/45 | 0/45 |
| + draft heuristic (90:135) | 45/45 | 0 | 0 | 45/45 | 45/45 | 1/45 | 0/45 |
| + draft heuristic (135:180) | 45/45 | 0 | 0 | 45/45 | 44/45 | 1/45 | 0/45 |
| **Total (n=180)** | **180/180 (100%)** | **0** | **0** | **180/180 (100%)** | **178/180 (98.9%)** | **7/180 (3.9%)** | **0/180 (0%)** |

Deepest carry anywhere: 21 (all four chunks). Deepest battle-depth anywhere:
23 (chunk 0:45; the other three chunks each capped at 21).

## Crash signatures

None. All 180 seeds finished `OK` (`budget` — frame budget reached while
still progressing; no seed hit `max-rounds` since none was set, no seed
crashed or hung). This is a change from §6's n=30 finding, which saw 2/30
crash on the `STRINGID_PKMNSUBSTITUTEFADED`/`{B_DEF_NAME_WITH_PREFIX}`
`battleStringResolver` gap (seeds 27 and 29 in that sample's own seed
numbering) — that gap was filed as ISSUES #107 and is fixed on this
session's base, so its absence here is expected and not itself new evidence
about the heuristic.

No seed in this sweep hit a crash signature at all, so there is nothing new
to compare against the #102/#106/#107/#108/#112/#113 fixed-signature list
and no new ISSUES candidates from this run.

## Note on carry>=21/28 vs. the baseline

This lane does not run the baseline arm (the supervisor runs it separately
on an identical base) and therefore draws no fold/withhold conclusion here.
For scale, §3's n=60 pre-#104 baseline-vs-heuristic comparison and §6's
n=30 post-#104 comparison are the only baseline numbers on file; a
like-for-like n=180 baseline from the supervisor's parallel run is needed
before this sample's carry>=14 (98.9%) / carry>=21 (3.9%) / carry>=28 (0%)
figures can be read as better, worse, or neutral. **Fold decision remains
the supervisor's call.**

## Baseline arm + verdict (supervisor, 2026-08-22 14:20)

Baseline = master `96a64a8e` WITHOUT the heuristic, same seeds 0:180, same budgets, run in a
clean worktree concurrently with the heuristic arm (4 × 45-seed chunks):

| arm | OK | CRASH | HANG | carry ≥ 7 | ≥ 14 | ≥ 21 | ≥ 28 |
|---|---|---|---|---|---|---|---|
| baseline (`winning`, master) | 180/180 | 0 | 0 | 180 | **163** (90.6%) | **40** (22.2%) | **4** (2.2%) |
| draft heuristic (this branch) | 180/180 | 0 | 0 | 180 | **178** (98.9%) | **7** (3.9%) | **0** |

Per-chunk baseline (0:45 / 45:90 / 90:135 / 135:180): ≥ 14 = 41/40/43/39, ≥ 21 = 7/10/13/10,
≥ 28 = 1/0/2/1.

**Verdict: WITHHELD — do not fold.** The heuristic buys a second-round completion (+15 at ≥ 14)
and loses the third and fourth (−33 at ≥ 21, −4 at ≥ 28); at n = 180 the ≥ 21 gap (40 vs 7) is
far outside sampling noise (the 08-20 n=60 "worse" reading was right, the n=30 "neutral" one was
underpowered). Drafting by raw base-stat/STAB-power picks rentals that the challenge-3+ opponents
(opponent fixed IVs 9-12, `CHECK_BAD_MOVE` AI from challengeNum 2) beat. The branch
`wip/mb-step2b-draft-heuristic` now points at this rebased measurement head (`1f500a92`) as the
record; ISSUES carries no entry — this is a closed policy experiment, not debt.

This baseline sweep doubles as the session's depth number on the fully-fixed tree (all of #102,
#106-#108, #111-#113 folded): **winning 0:180 → 180/180 OK, 0 CRASH, 0 HANG; carry ≥ 28 in 4/180
(2.2%)** — consistent with 1370's 7/240 (2.9%) on the 08-20 tree.
