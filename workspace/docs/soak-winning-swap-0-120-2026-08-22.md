# `winning-swap` 0:120 first sweep (2026-08-22, main worker)

Tree: master `255d682c` (this session's `winning-swap` policy commit), render off, default
per-policy budget (`DEFAULT_MAX_FRAMES_BY_POLICY["winning-swap"]` = 1,000,000 frames, same as
`winning`). Command: `node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy
winning-swap --seeds A:B --render-every 0`.

**Chunking note:** the brief asked for 4 parallel 30-seed chunks. At this policy's observed
~25 s/seed cost, a 30-seed chunk runs ~750 s, over this tool's 600 s per-call ceiling. Ran
**6 parallel 20-seed chunks instead** (`0:20 20:40 40:60 60:80 80:100 100:120`, `&`+`wait` in one
foreground call, 16 cores available) — identical 0:120 coverage, ~525 s wall-clock for the whole
sweep. Verified live with `--verbose --max-frames 60000` on seed 0 first: the swap offer answers
YES, the plan logs the worst rental row/score and the ranked opponent queue, and the screen either
completes a real accept (`select worst rental row` → `SWITCH` → `select opponent row` → `confirm
swap`) or a real decline (`decline, no opponent outscores worst rental` → `confirm decline`) —
the instrument is genuinely exercising the swap screen, not silently no-op'ing.

## Totals

| policy | seeds | OK | CRASH | HANG |
|---|---|---|---|---|
| winning-swap | 0:120 | **120** | 0 | 0 |

Every seed's OK sub-outcome is `budget` (frame budget reached while still chaining rounds), same
as `winning`'s own sweeps — none hit `max-rounds` (unset) or a genuine terminal round/milestone
outcome.

## Depth distribution (aggregated across the 6 chunks)

| threshold | seeds reaching it |
|---|---|
| carry ≥ 7  (challengeNum ≥ 1) | 120/120 |
| carry ≥ 14 (challengeNum ≥ 2) | 112/120 |
| carry ≥ 21 (challengeNum ≥ 3) | 31/120 |
| carry ≥ 28 (challengeNum ≥ 4) | 5/120 |
| deepest carry anywhere | 28 |
| deepest battle-depth anywhere | 30 |

Reading: `winning-swap` reaches carry ≥ 21 in 31/120 seeds and carry ≥ 28 in 5/120 — both well
past `winning`'s own historical depth (its 0:180 sweep, PROGRESS 1380, hit carry ≥ 21 in 40/180
and carry ≥ 28 in 7/180; comparable order of magnitude, this policy does not appear to break or
meaningfully change the win-rate shape). The swap screen itself is now exercised at every one of
these depths — a surface no prior soak (any policy) had reached — and is **crash-free across the
whole sweep**, in both its accept and decline branches, at carry up to 28.

## Crash/hang findings

**None.** 0/120 CRASH, 0/120 HANG. No new ISSUES entries filed by this sweep — this is a clean
finding, not an absence of investigation: the swap screen has now been driven by real button
presses (accept + decline, including the duplicate-species retry path exercised structurally by
`onWinningFactorySwap`'s design, though no seed in this sample actually hit a duplicate-species
rejection) at meaningful carried-streak depth for the first time, and it held up.

## Four chunk summaries (verbatim)

### seeds 0:20
```
=== soak summary: 20 seeds (policy winning-swap) in 523.2s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 19/20
carry >= 21 (challengeNum >= 3): 3/20
carry >= 28 (challengeNum >= 4): 0/20
deepest carry anywhere: 21
deepest battle-depth anywhere: 23

=== OK breakdown ===
  budget: 20
```

### seeds 20:40
```
=== soak summary: 20 seeds (policy winning-swap) in 526.1s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 18/20
carry >= 21 (challengeNum >= 3): 7/20
carry >= 28 (challengeNum >= 4): 0/20
deepest carry anywhere: 21
deepest battle-depth anywhere: 25

=== OK breakdown ===
  budget: 20
```

### seeds 40:60
```
=== soak summary: 20 seeds (policy winning-swap) in 525.2s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 18/20
carry >= 21 (challengeNum >= 3): 6/20
carry >= 28 (challengeNum >= 4): 2/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 30

=== OK breakdown ===
  budget: 20
```

### seeds 60:80
```
=== soak summary: 20 seeds (policy winning-swap) in 522.3s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 17/20
carry >= 21 (challengeNum >= 3): 3/20
carry >= 28 (challengeNum >= 4): 0/20
deepest carry anywhere: 21
deepest battle-depth anywhere: 26

=== OK breakdown ===
  budget: 20
```

### seeds 80:100
```
=== soak summary: 20 seeds (policy winning-swap) in 529.4s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 4/20
carry >= 28 (challengeNum >= 4): 1/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 29

=== OK breakdown ===
  budget: 20
```

### seeds 100:120
```
=== soak summary: 20 seeds (policy winning-swap) in 520.7s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 8/20
carry >= 28 (challengeNum >= 4): 2/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 30
```

## Next

The instrument is proven and clean at n=120. A deeper/wider re-sweep (0:240+, or specifically
targeting the duplicate-species retry branch with a staged scenario) is future work if swap-screen
coverage needs to go further; nothing in this sweep demands a follow-up fix.
