# Gate-6 seeded-rounds soak artifact — 2026-08-10

**HEAD:** `6508fbf07a8ab511a3d30c34e85ed739c856a09a` (branch
`worker/side-20260810-002219`, engine-behaviorally final for this artifact —
see below).

This artifact satisfies Gate 6's "multiple seeded legal Factory rounds run
end-to-end" clause at family granularity, per the ROADMAP S10 **Soak +
evidence policy (user-directed 2026-08-09)**: `npm run soak`
(`tools/soak/randomRoundSoak.ts` — seeded random legal play through the
production path, full rounds) is the standing instrument for this clause.
Both sweeps below were run serially from this worktree against HEAD.

## Engine-behaviorally-final argument

This worktree's HEAD is engine-behaviorally final for the two sweeps below
because the concurrent main-lane steps running alongside this one are
census/manifest/test proof work only (ability/move census bookkeeping and
`gate6-coverage-manifest` regeneration) and are explicitly forbidden from
changing engine behavior, so no in-flight sibling work can invalidate these
results between capture and commit.

## Invocation 1 — vanilla policy, seeds 0:20 (gate: 20/20 OK, 0 CRASH, 0 HANG)

```
$ npm run soak -- --policy vanilla --seeds 0:20
```

Full stdout committed verbatim at
[`docs/gate6-soak-vanilla-0-20-20260810.log`](gate6-soak-vanilla-0-20-20260810.log).

**Summary line:**

```
=== soak summary: 20 seeds (policy vanilla) in 41.1s ===
OK 20  CRASH 0  HANG 0
```

**Per-seed outcomes:**

| Seed | Outcome | Battle | Turn | Frames | Elapsed | End state |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 0 | OK | 1 | 16 | 8581 | 1.8s | roundLost |
| 1 | OK | 1 | 16 | 16968 | 2.5s | roundLost |
| 2 | OK | 1 | 16 | 8583 | 1.6s | roundLost |
| 3 | OK | 1 | 16 | 16891 | 2.4s | roundLost |
| 4 | OK | 1 | 16 | 8575 | 1.5s | roundLost |
| 5 | OK | 1 | 16 | 16977 | 2.4s | roundLost |
| 6 | OK | 1 | 16 | 8618 | 1.5s | roundLost |
| 7 | OK | 1 | 16 | 16901 | 2.5s | roundLost |
| 8 | OK | 1 | 16 | 16872 | 2.5s | roundLost |
| 9 | OK | 1 | 16 | 16872 | 2.8s | roundLost |
| 10 | OK | 1 | 16 | 8547 | 2.1s | roundLost |
| 11 | OK | 1 | 16 | 8528 | 1.9s | roundLost |
| 12 | OK | 1 | 16 | 8517 | 1.8s | roundLost |
| 13 | OK | 1 | 16 | 8568 | 1.8s | roundLost |
| 14 | OK | 1 | 16 | 8629 | 2.0s | roundLost |
| 15 | OK | 1 | 16 | 8542 | 2.0s | roundLost |
| 16 | OK | 1 | 16 | 8511 | 2.2s | roundLost |
| 17 | OK | 1 | 16 | 8594 | 1.9s | roundLost |
| 18 | OK | 1 | 16 | 8638 | 1.7s | roundLost |
| 19 | OK | 1 | 16 | 8616 | 2.0s | roundLost |

## Invocation 2 — full policy, seeds 0:60 (banked headline: 60 OK / 0 CRASH / 0 HANG from 2026-08-09)

```
$ npm run soak -- --policy full --seeds 0:60
```

Full stdout committed verbatim at
[`docs/gate6-soak-full-0-60-20260810.log`](gate6-soak-full-0-60-20260810.log).

**Summary line:**

```
=== soak summary: 60 seeds (policy full) in 281.9s ===
OK 60  CRASH 0  HANG 0
```

**Completions: 60/60** — no regression against the 2026-08-09 banked
headline of 60 OK / 0 CRASH / 0 HANG.

**Per-seed outcomes:**

| Seed | Outcome | Battle | Turn | Frames | Elapsed | End state |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 0 | OK | 1 | 20 | 12046 | 2.2s | roundLost |
| 1 | OK | 1 | 27 | 15510 | 2.5s | roundLost |
| 2 | OK | 1 | 21 | 20451 | 2.7s | roundLost |
| 3 | OK | 3 | 52 | 72345 | 10.3s | roundLost |
| 4 | OK | 1 | 20 | 21121 | 2.5s | roundLost |
| 5 | OK | 1 | 28 | 25645 | 3.2s | roundLost |
| 6 | OK | 2 | 88 | 84825 | 11.9s | roundLost |
| 7 | OK | 2 | 24 | 44291 | 5.8s | roundLost |
| 8 | OK | 1 | 23 | 12885 | 2.2s | roundLost |
| 9 | OK | 1 | 26 | 22013 | 2.9s | roundLost |
| 10 | OK | 2 | 15 | 32664 | 4.6s | roundLost |
| 11 | OK | 1 | 33 | 20203 | 3.2s | roundLost |
| 12 | OK | 5 | 20 | 93847 | 13.1s | roundLost |
| 13 | OK | 5 | 8 | 72341 | 9.2s | roundLost |
| 14 | OK | 1 | 20 | 20078 | 2.4s | roundLost |
| 15 | OK | 1 | 30 | 19799 | 2.8s | roundLost |
| 16 | OK | 4 | 37 | 91394 | 12.6s | roundLost |
| 17 | OK | 2 | 40 | 48723 | 6.6s | roundLost |
| 18 | OK | 1 | 22 | 12881 | 1.9s | roundLost |
| 19 | OK | 3 | 14 | 49602 | 7.2s | roundLost |
| 20 | OK | 1 | 21 | 21366 | 2.7s | roundLost |
| 21 | OK | 3 | 28 | 51464 | 7.5s | roundLost |
| 22 | OK | 2 | 32 | 39888 | 5.7s | roundLost |
| 23 | OK | 2 | 20 | 29562 | 4.2s | roundLost |
| 24 | OK | 1 | 21 | 11422 | 1.7s | roundLost |
| 25 | OK | 2 | 41 | 38081 | 5.9s | roundLost |
| 26 | OK | 2 | 16 | 40368 | 5.4s | roundLost |
| 27 | OK | 2 | 16 | 24829 | 3.6s | roundLost |
| 28 | OK | 1 | 33 | 16011 | 2.5s | roundLost |
| 29 | OK | 2 | 13 | 34647 | 4.9s | roundLost |
| 30 | OK | 1 | 22 | 16654 | 2.6s | roundLost |
| 31 | OK | 2 | 29 | 35801 | 5.2s | roundLost |
| 32 | OK | 1 | 20 | 19826 | 2.5s | roundLost |
| 33 | OK | 2 | 12 | 21937 | 3.2s | roundLost |
| 34 | OK | 2 | 25 | 31740 | 4.7s | roundLost |
| 35 | OK | 2 | 16 | 27366 | 3.9s | roundLost |
| 36 | OK | 2 | 44 | 53765 | 8.1s | roundLost |
| 37 | OK | 2 | 43 | 40287 | 6.0s | roundLost |
| 38 | OK | 2 | 16 | 25171 | 3.7s | roundLost |
| 39 | OK | 1 | 23 | 13664 | 2.0s | roundLost |
| 40 | OK | 4 | 13 | 49381 | 6.9s | roundLost |
| 41 | OK | 1 | 19 | 12812 | 1.8s | roundLost |
| 42 | OK | 1 | 22 | 14703 | 2.3s | roundLost |
| 43 | OK | 3 | 26 | 40689 | 5.9s | roundLost |
| 44 | OK | 2 | 35 | 42005 | 6.2s | roundLost |
| 45 | OK | 1 | 31 | 18726 | 2.8s | roundLost |
| 46 | OK | 1 | 39 | 24574 | 3.6s | roundLost |
| 47 | OK | 2 | 24 | 28410 | 4.3s | roundLost |
| 48 | OK | 1 | 27 | 14815 | 2.2s | roundLost |
| 49 | OK | 1 | 18 | 21064 | 2.7s | roundLost |
| 50 | OK | 2 | 13 | 28152 | 4.0s | roundLost |
| 51 | OK | 1 | 23 | 20364 | 2.8s | roundLost |
| 52 | OK | 1 | 26 | 13898 | 2.1s | roundLost |
| 53 | OK | 3 | 23 | 63548 | 8.7s | roundLost |
| 54 | OK | 1 | 24 | 22313 | 2.7s | roundLost |
| 55 | OK | 2 | 26 | 29442 | 4.2s | roundLost |
| 56 | OK | 2 | 24 | 34947 | 4.7s | roundLost |
| 57 | OK | 2 | 31 | 43166 | 6.1s | roundLost |
| 58 | OK | 5 | 13 | 73890 | 10.3s | roundLost |
| 59 | OK | 1 | 29 | 16078 | 2.4s | roundLost |

## Crash-class history

For the crash signatures this sweep family has surfaced and closed over
time (differential re-runs, closed signatures, and the current standing
crash wall tracked by ISSUES #85), see
[`docs/soak-crash-catalog.md`](soak-crash-catalog.md).

## Disposition

Both sweeps are clean (0 CRASH, 0 HANG across all 80 seeds run). This
artifact — HEAD hash, both invocations, both summary lines, and complete
per-seed tables — is the Gate-6 seeded-rounds evidence at family
granularity: it demonstrates the standing `npm run soak` instrument runs
multiple seeded legal Factory rounds end-to-end from the rental draft
through round resolution via the real production tick/render path, not a
single canonical replay.
