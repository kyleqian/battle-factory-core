# Generated-seed sweep 61–90: blocker census

> **Frozen evidence (2026-07-30):** run HEAD
> `a6a8489c85f185a00ff59b651477ed0ccb79911f`; Battle Scene OFF profile
> (`http://127.0.0.1:8014`, verified with `bin/oracle info`). This is a
> docs-only extension of the Gate-5 progress meter. The ordinary driver is
> `driveGeneratedRoundToCompletion` in
> `tests/factoryRoundBattleOrchestrator.test.ts:66-119`, with its entry-689
> `facilityState: { rentsCount: 0 }` input shape retained exactly. Scratch
> runner and its uncommitted output were kept under the fresh
> `tools/compare/scratch/seed-sweep-61-90.iW3yLk/` directory. The sweep is a
> pure kernel run and makes no oracle calls per row.

The fixed player records are the driver's own `664/678/527` set IDs; every
player turn chooses its first legal move (except the driver's established
party-index-1 first-turn slot-3 preference), accepts each required forced
switch, and declines each optional swap. A row is a **halt** only if that
ordinary path throws or reaches an unsupported barrier. The facility-call
cursor is `facilityRngCalls` at terminal state.

## Per-seed evidence

| Seed | Result | Final battle index | Facility-call cursor | Halt / terminal evidence |
| ---: | --- | ---: | ---: | --- |
| 61 | seven-win | 6 | 1976 | `roundComplete` |
| 62 | seven-win | 6 | 1156 | `roundComplete` |
| 63 | seven-win | 6 | 2206 | `roundComplete` |
| 64 | seven-win | 6 | 1566 | `roundComplete` |
| 65 | legitimate loss | 5 | 2057 | `roundLost`; player `[0,0,0]`, opponent `[138,117,183]` |
| 66 | seven-win | 6 | 1177 | `roundComplete` |
| 67 | seven-win | 6 | 1815 | `roundComplete` |
| 68 | legitimate loss | 3 | 843 | `roundLost`; player `[0,0,0]`, opponent `[0,24,0]` |
| 69 | seven-win | 6 | 1618 | `roundComplete` |
| 70 | seven-win | 6 | 2138 | `roundComplete` |
| 71 | seven-win | 6 | 1458 | `roundComplete` |
| 72 | seven-win | 6 | 1324 | `roundComplete` |
| 73 | seven-win | 6 | 1672 | `roundComplete` |
| 74 | seven-win | 6 | 1618 | `roundComplete` |
| 75 | seven-win | 6 | 1752 | `roundComplete` |
| 76 | seven-win | 6 | 1430 | `roundComplete` |
| 77 | seven-win | 6 | 1254 | `roundComplete` |
| 78 | legitimate loss | 1 | 819 | `roundLost`; player `[0,0,0]`, opponent `[0,0,54]` |
| 79 | seven-win | 6 | 1657 | `roundComplete` |
| 80 | seven-win | 6 | 1816 | `roundComplete` |
| 81 | seven-win | 6 | 1686 | `roundComplete` |
| 82 | seven-win | 6 | 1525 | `roundComplete` |
| 83 | seven-win | 6 | 1186 | `roundComplete` |
| 84 | seven-win | 6 | 1550 | `roundComplete` |
| 85 | seven-win | 6 | 1547 | `roundComplete` |
| 86 | seven-win | 6 | 1669 | `roundComplete` |
| 87 | seven-win | 6 | 1685 | `roundComplete` |
| 88 | seven-win | 6 | 1605 | `roundComplete` |
| 89 | seven-win | 6 | 1612 | `roundComplete` |
| 90 | seven-win | 6 | 1844 | `roundComplete` |

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

**27 of 30** new seeds completed all seven wins. The other three (65, 68, and
78) are ordinary terminal losses: each returns `roundLost` with all three
player records at 0 HP and at least one opponent record still above 0 HP. No
loss has the source-suspicious 0-HP-but-continues shape, and no other
post-terminal continuation or barrier was observed.
