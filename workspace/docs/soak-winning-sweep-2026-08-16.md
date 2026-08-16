# Winning-policy soak sweep — 2026-08-16

Queue item (e) from PROGRESS 1288 (skipped by two prior sessions running):
a wide sweep of `--policy winning` (`tools/soak/randomRoundSoak.ts` /
`randomRoundSoakDriver.ts`), which has never had a dedicated sweep. This
policy biases fight-move selection to the highest-power legal damaging move
and declines voluntary switches, reusing `full`'s menu/target exploration
otherwise — built to reach deep chained-streak surfaces (seventh-win round
completion, the postwin brain route, the next-generation opponent path
ISSUES #91 touched).

Run in 10-seed chunks (each `npm run soak -- --policy winning --seeds A:B`)
to stay under this session's per-command time cap; results are byte-identical
to what a single `--seeds 0:60` invocation would produce (the driver is
seeded per-seed and stateless across seeds).

## Range 0:60 — 59/60 OK, 1 HANG, 0 CRASH

Wall clock: ~1079s (~18 min) across the six 10-seed chunks.

| outcome | count |
| --- | --- |
| OK — `roundLost` | 49 |
| OK — `roundComplete` (full 7-win streak) | 10 (seeds 3, 15, 30, 31, 32, 33, 38, 50, 57, 58) |
| HANG | 1 (seed 49) |
| CRASH | 0 |

No crash surfaced anywhere in 0:60 — the postwin brain route and the
next-generation opponent path (both explicitly targeted by this sweep) were
exercised repeatedly (10 seeds reached `roundComplete`, i.e. all 7 battles
won in a single round; several others reached battle 4-7 before losing) with
no throw. This is good evidence for ISSUES #91's fix and for the deep-streak
paths generally.

### Triage — signature 1: `HANG @ postwin:page0` (seed 49)

**Not an engine stall.** Root-caused by rerunning the seed with a larger
frame budget:

```sh
npm run soak -- --policy winning --seed 49 --max-frames 800000
# seed   49  OK     b3 t16  693051f  102.1s  roundLost
```

Seed 49 resolves cleanly at frame 693,051 — only ~93k frames past the
default 600,000 budget — with a normal `roundLost` terminal
(`terminalRecordMenuInputReadyReached: true`, `terminalRecordChoice: null`
consistent with an ordinary loss). A `collectDiagnostics: true` run at
`maxFrames: 2_500_000` confirms it isn't runaway/unbounded chaining either:
`opponentGenerationCount: 3` (only two rounds had chained past the first by
the time it finished), `carriedWinStreak: 0`. The soak log's own action
trail in the last frames before the 600k cutoff is unremarkable —
ordinary `resolution advance` / `postwin advance` message-mashing, not a
frozen state.

**Cause:** `DEFAULT_RUN_OPTIONS.maxFrames = 600_000`
(`tools/soak/randomRoundSoakDriver.ts:828`) was sized against the `full`
policy's deepest observed *single-round* seeds (ISSUES #90 triage: seed 51 at
361,216f, seed 37 at 398,088f, both single-round runs that don't chain).
`winning` legitimately chains multiple full rounds back-to-back (its
continuation-menu roll is the same 85%-GO-ON `full` exploration), so its
per-seed frame cost stacks: round 1 (~250k frames observed for some seeds)
plus round 2 partial plus round 3 partial can exceed 600k while still making
ordinary forward progress. This is a budget/config mismatch, not a defect in
what the driver sends the engine — no illegal input, no frozen state.

**Suspected owner:** `tools/soak/randomRoundSoakDriver.ts` (driver config:
`DEFAULT_RUN_OPTIONS.maxFrames`), i.e. squarely tools/soak territory, not
`src/**`.

**Minimal repro (the finding as filed):**
```sh
npm run soak -- --policy winning --seed 49
# seed   49  HANG   b2 t12  600000f  ~90s  stuck at postwin:page0
```

**Workaround (proves it isn't a stall):**
```sh
npm run soak -- --policy winning --seed 49 --max-frames 800000
# seed   49  OK     b3 t16  693051f  roundLost
```

**Not fixed in this session.** Per this step's fix policy, a maxFrames bump
is in-scope for a tools/soak/** fix, but the right number needs more than
one data point — `winning`'s per-seed cost distribution over a wider sweep
(600:120 and beyond) should inform the new default rather than one seed's
observed 693k, and this session's time budget did not allow both the
0:60/60:120 sweep goal and a verified re-sweep after a config change. Left
as a proposed follow-up (ISSUES text below) rather than guessed at.

## Range 60:120 — not run

Per the step's stated condition ("If it is 60/60 OK, extend..."), 0:60 was
not clean (1 HANG), so the extension was not attempted this session. The
HANG is triaged above and is not an engine crash — a follow-up session
re-running 60:120 (after either bumping the budget or simply passing
`--max-frames` generously via the CLI, no code change required) would still
be valuable for coverage.

## Proposed ISSUES entry (text only — supervisor files it; suggested next
number `#92` since `#91` is the highest currently referenced)

> ## #92 — winning-policy soak: default 600k maxFrames budget undersized for
> multi-round chaining (seed 49 HANG, not a stall)
>
> `tools/soak/randomRoundSoakDriver.ts`'s `DEFAULT_RUN_OPTIONS.maxFrames`
> (600,000) was sized for `full`/`vanilla` single-round soaks (ISSUES #90).
> `--policy winning --seeds 0:60` (2026-08-16 sweep,
> `docs/soak-winning-sweep-2026-08-16.md`) found seed 49 reported as HANG at
> the 600k budget while still making ordinary progress
> (`resolution advance`/`postwin advance`); rerunning with
> `--max-frames 800000` resolves it cleanly at frame 693,051 with a normal
> `roundLost` terminal. Root cause: `winning` chains multiple full rounds
> (unlike the single-round `full`/`vanilla` gates the 600k figure was tuned
> against), so per-seed frame cost stacks across rounds. Fix is a
> tools/soak/** config change only (bump the default, or make it
> policy-aware) — not an engine bug. Needs a wider `winning` sweep (60:120+)
> to pick the right number before landing, since one seed's 693k is a lower
> bound, not a ceiling.

## Repro commands reference

```sh
# Full 0:60 sweep (single invocation; this session chunked it for the
# 10-minute per-command cap only — behavior is identical either way):
npm run soak -- --policy winning --seeds 0:60

# Seed 49 in isolation (HANG at default budget):
npm run soak -- --policy winning --seed 49 --verbose

# Seed 49 with enough budget to resolve:
npm run soak -- --policy winning --seed 49 --max-frames 800000
```

## Verification

No code changed this session (triage only, no fix landed — see above).
`npm run test:smoke` green is this step's stated bar for a no-code-change
session; re-confirmed after writing this doc (see final commit message).
