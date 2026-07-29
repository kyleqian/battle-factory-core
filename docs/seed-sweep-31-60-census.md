# Generated-seed sweep 31–60: blocker census

> **Frozen evidence (2026-07-29):** run HEAD
> `dd56dfe177d6e31535dbfa2fa54656761a0de00b`; Battle Scene OFF profile
> (`http://127.0.0.1:8014`, verified with `bin/oracle info`). This is a
> docs-only extension of the Gate-5 progress meter. The ordinary driver is
> `driveGeneratedRoundToCompletion` in
> `tests/factoryRoundBattleOrchestrator.test.ts:66-119`, with its entry-689
> `facilityState: { rentsCount: 0 }` input shape retained exactly. Scratch
> runner and its uncommitted output were kept under a fresh
> `tools/compare/scratch/seed-sweep-31-60.*` directory.

The fixed player records are the driver's own `664/678/527` set IDs; every
player turn chooses its first legal move (except the driver's established
party-index-1 first-turn slot-3 preference), accepts each required forced
switch, and declines each optional swap. A row is a **halt** only if that
ordinary path throws or reaches an unsupported barrier. The facility-call
cursor is `facilityRngCalls` at terminal state.

## Per-seed evidence

| Seed | Result | Final battle index | Facility-call cursor | Halt / terminal evidence |
| ---: | --- | ---: | ---: | --- |
| 31 | legitimate loss | 3 | 1354 | `roundLost`; player `[0,0,0]`, opponent `[51,177,136]` |
| 32 | seven-win | 6 | 1745 | `roundComplete` |
| 33 | seven-win | 6 | 2230 | `roundComplete` |
| 34 | seven-win | 6 | 1363 | `roundComplete` |
| 35 | seven-win | 6 | 1615 | `roundComplete` |
| 36 | seven-win | 6 | 1441 | `roundComplete` |
| 37 | seven-win | 6 | 1916 | `roundComplete` |
| 38 | legitimate loss | 0 | 489 | `roundLost`; player `[0,0,0]`, opponent `[0,44,123]` |
| 39 | seven-win | 6 | 2182 | `roundComplete` |
| 40 | seven-win | 6 | 1462 | `roundComplete` |
| 41 | legitimate loss | 2 | 1647 | `roundLost`; player `[0,0,0]`, opponent `[0,88,143]` |
| 42 | legitimate loss | 5 | 1798 | `roundLost`; player `[0,0,0]`, opponent `[0,138,0]` |
| 43 | seven-win | 6 | 1679 | `roundComplete` |
| 44 | seven-win | 6 | 1445 | `roundComplete` |
| 45 | seven-win | 6 | 1357 | `roundComplete` |
| 46 | seven-win | 6 | 1442 | `roundComplete` |
| 47 | seven-win | 6 | 1665 | `roundComplete` |
| 48 | seven-win | 6 | 1628 | `roundComplete` |
| 49 | seven-win | 6 | 1855 | `roundComplete` |
| 50 | seven-win | 6 | 1639 | `roundComplete` |
| 51 | seven-win | 6 | 1604 | `roundComplete` |
| 52 | seven-win | 6 | 1613 | `roundComplete` |
| 53 | seven-win | 6 | 1387 | `roundComplete` |
| 54 | seven-win | 6 | 1761 | `roundComplete` |
| 55 | seven-win | 6 | 1765 | `roundComplete` |
| 56 | seven-win | 6 | 1490 | `roundComplete` |
| 57 | legitimate loss | 5 | 2175 | `roundLost`; player `[0,0,0]`, opponent `[0,153,156]` |
| 58 | seven-win | 6 | 1639 | `roundComplete` |
| 59 | seven-win | 6 | 1343 | `roundComplete` |
| 60 | seven-win | 6 | 1859 | `roundComplete` |

## Blocker census and retirement order

| Retirement order | Mechanism / exact barrier | Seeds | Frequency | Work-list |
| ---: | --- | --- | ---: | --- |
| — | None — no throw, `unsupported-branch`, or budget exhaustion on the ordinary path | — | 0/30 | No kernel retirement work is opened by this interval. |

There is no top blocker, so there is no owning-file/source-citation/sibling
implementation pattern to hand off. The recommended next step is **not** to
invent one: retain this driver and extend the next disjoint seed interval only
when the supervisor schedules it. If a future row halts, report the emitted
label, opcode, operand/construct, and source location before selecting a
mechanism owner.

## Outcome classification

**25 of 30** new seeds completed all seven wins. The other five (31, 38, 41,
42, and 57) are ordinary terminal losses: each returns `roundLost` with all
three player records at 0 HP and at least one opponent record still above 0
HP. No loss has the source-suspicious 0-HP-but-continues shape, and no other
post-terminal continuation or barrier was observed.
