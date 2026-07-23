# Workstream contract

This is the stable ownership map for Stage 8, not a status ledger. Current
state lives in `PROGRESS.md`; completion gates live in `ROADMAP.md`. The
supervisor owns one integration plan and launches a lane only for bounded,
independent work.

| Lane | Oracle | Owns | Must not own |
| --- | --- | --- | --- |
| **Main** | Battle Scene OFF | `BattleScenario`, the round/battle core, facility progression, and the presentation seam | Another canonical Battle 2 turn/window after tick 33331 |
| **Side** | Battle Scene OFF | Source extraction, generated data, staged fixtures, and file-disjoint test breadth | Shared controller interfaces or supervisor ledgers |
| **Animation** | Battle Scene ON | Move timelines, particles, sprites, presentation assets, and animation traces | Damage, RNG, turn order, round advancement, or facility state |

## Shared rules

- Main defines shared interfaces before another lane depends on them.
- Core commands and committed state flow into presentation; presentation
  reports completion. Scene mode may change timing, never logical outcomes or
  RNG consumption.
- Use staged scenarios and short probes for repeated battle mechanics. Reserve
  full canonical traversal for unique facility transitions and endings.
- Every new compare trace names its oracle profile explicitly. Historical
  traces without one remain Battle Scene ON.
- Side and animation use separate worktrees and do not edit `PROGRESS.md` or
  `ISSUES.md`. The supervisor verifies them, merges one branch at a time, and
  reruns the full suite after each merge.
- Parallel capacity is optional: do not invent work merely to occupy a lane.
