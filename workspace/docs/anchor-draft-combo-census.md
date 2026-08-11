# Anchor-draft combination census

> **Frozen evidence (2026-07-30):** run HEAD
> `a6a8489c85f185a00ff59b651477ed0ccb79911f`; Battle Scene OFF profile
> (`http://127.0.0.1:8014`, verified once with `bin/oracle info`). The sweep
> is pure kernel and made no oracle call per row. Its fresh scratch driver and
> JSON output remain uncommitted under
> `tools/compare/scratch/draft-combo-census.9hHtnV/`.

This census enumerates all `C(6,3) = 20` member combinations of the real
anchor pool (`156 ONIX`, `149 MAGBY`, `180 BAYLEEF`, `153 BUTTERFREE`,
`179 HAUNTER`, and `181 QUILAVA`) and drives each of the three members as
lead: **60 of 60 rows**, with no sampling and no cap cuts. After the lead,
the two bench records retain anchor-pool order; bench-order permutations are
outside the requested combination-by-lead space.

Every row enters through `createFactoryAnchorSession` with the same pinned
selection schedule, three construction cursors, and post-transition fresh
battle cursor from `factoryAnchorSession.ts`. Only the ordered current rental
party changes. The policy is the first legal move at every player command,
the first legal required replacement at every forced switch, and decline at
every optional swap. A halt means the ordinary path threw or published a
machine barrier. The facility-call cursor is `facilityRngCalls` at terminal
state, or immediately before the rejected player decision for a thrown halt.

## Per-row evidence

| Combo | Members | Lead | Result | Final battle index | Facility-call cursor | Terminal / halt evidence |
| --- | --- | --- | --- | ---: | ---: | --- |
| C1 | 156 ONIX / 149 MAGBY / 180 BAYLEEF | 156 ONIX | seven-win | 6 | 3072 | `roundComplete` |
| C1 | 156 ONIX / 149 MAGBY / 180 BAYLEEF | 149 MAGBY | seven-win | 6 | 1704 | `roundComplete` |
| C1 | 156 ONIX / 149 MAGBY / 180 BAYLEEF | 180 BAYLEEF | legitimate loss | 4 | 1742 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,88]` |
| C2 | 156 ONIX / 149 MAGBY / 153 BUTTERFREE | 156 ONIX | legitimate loss | 2 | 1061 | `roundLost`; player HP `[0,0,0]`, opponent HP `[39,143,131]` |
| C2 | 156 ONIX / 149 MAGBY / 153 BUTTERFREE | 149 MAGBY | legitimate loss | 5 | 1684 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,75]` |
| C2 | 156 ONIX / 149 MAGBY / 153 BUTTERFREE | 153 BUTTERFREE | legitimate loss | 2 | 1077 | `roundLost`; player HP `[0,0,0]`, opponent HP `[94,22,117]` |
| C3 | 156 ONIX / 149 MAGBY / 179 HAUNTER | 156 ONIX | halt | 2 | 1072 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 86 instructions; active `[2,1]`, player HP `[0,0,39]`, opponent HP `[0,96,131]` |
| C3 | 156 ONIX / 149 MAGBY / 179 HAUNTER | 149 MAGBY | legitimate loss | 5 | 2083 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,40,0]` |
| C3 | 156 ONIX / 149 MAGBY / 179 HAUNTER | 179 HAUNTER | legitimate loss | 2 | 1155 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,35,0]` |
| C4 | 156 ONIX / 149 MAGBY / 181 QUILAVA | 156 ONIX | legitimate loss | 2 | 1079 | `roundLost`; player HP `[0,0,0]`, opponent HP `[38,143,131]` |
| C4 | 156 ONIX / 149 MAGBY / 181 QUILAVA | 149 MAGBY | legitimate loss | 2 | 916 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,138,65]` |
| C4 | 156 ONIX / 149 MAGBY / 181 QUILAVA | 181 QUILAVA | seven-win | 6 | 2659 | `roundComplete` |
| C5 | 156 ONIX / 180 BAYLEEF / 153 BUTTERFREE | 156 ONIX | legitimate loss | 0 | 474 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,32,0]` |
| C5 | 156 ONIX / 180 BAYLEEF / 153 BUTTERFREE | 180 BAYLEEF | halt | 2 | 1199 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 93 instructions; active `[2,1]`, player HP `[0,0,153]`, opponent HP `[0,117,126]` |
| C5 | 156 ONIX / 180 BAYLEEF / 153 BUTTERFREE | 153 BUTTERFREE | legitimate loss | 1 | 852 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,151]` |
| C6 | 156 ONIX / 180 BAYLEEF / 179 HAUNTER | 156 ONIX | halt | 3 | 1554 | HALT `BattleScript_TeeterDanceDoMoveEndIncrement` pc 1858, `Cmd_moveend`, 89 instructions; active `[2,2]`, player HP `[0,0,138]`, opponent HP `[0,153,153]` |
| C6 | 156 ONIX / 180 BAYLEEF / 179 HAUNTER | 180 BAYLEEF | seven-win | 6 | 2219 | `roundComplete` |
| C6 | 156 ONIX / 180 BAYLEEF / 179 HAUNTER | 179 HAUNTER | halt | 3 | 1375 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 86 instructions; active `[0,0]`, player HP `[138,117,153]`, opponent HP `[177,151,142]` |
| C7 | 156 ONIX / 180 BAYLEEF / 181 QUILAVA | 156 ONIX | seven-win | 6 | 3011 | `roundComplete` |
| C7 | 156 ONIX / 180 BAYLEEF / 181 QUILAVA | 180 BAYLEEF | seven-win | 6 | 2405 | `roundComplete` |
| C7 | 156 ONIX / 180 BAYLEEF / 181 QUILAVA | 181 QUILAVA | legitimate loss | 3 | 1406 | `roundLost`; player HP `[0,0,0]`, opponent HP `[20,0,173]` |
| C8 | 156 ONIX / 153 BUTTERFREE / 179 HAUNTER | 156 ONIX | legitimate loss | 5 | 2138 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,86,0]` |
| C8 | 156 ONIX / 153 BUTTERFREE / 179 HAUNTER | 153 BUTTERFREE | legitimate loss | 2 | 1135 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,13,0]` |
| C8 | 156 ONIX / 153 BUTTERFREE / 179 HAUNTER | 179 HAUNTER | halt | 6 | 2573 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 154 instructions; active `[0,1]`, player HP `[16,117,153]`, opponent HP `[0,45,144]` |
| C9 | 156 ONIX / 153 BUTTERFREE / 181 QUILAVA | 156 ONIX | halt | 1 | 730 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 93 instructions; active `[1,0]`, player HP `[0,116,151]`, opponent HP `[16,138,163]` |
| C9 | 156 ONIX / 153 BUTTERFREE / 181 QUILAVA | 153 BUTTERFREE | legitimate loss | 2 | 1332 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,40,0]` |
| C9 | 156 ONIX / 153 BUTTERFREE / 181 QUILAVA | 181 QUILAVA | halt | 3 | 1386 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 93 instructions; active `[2,1]`, player HP `[0,0,153]`, opponent HP `[20,10,173]` |
| C10 | 156 ONIX / 179 HAUNTER / 181 QUILAVA | 156 ONIX | legitimate loss | 6 | 3119 | `roundLost`; player HP `[0,0,0]`, opponent HP `[13,144,144]` |
| C10 | 156 ONIX / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | legitimate loss | 2 | 1211 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,5,0]` |
| C10 | 156 ONIX / 179 HAUNTER / 181 QUILAVA | 181 QUILAVA | legitimate loss | 4 | 1705 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,57]` |
| C11 | 149 MAGBY / 180 BAYLEEF / 153 BUTTERFREE | 149 MAGBY | legitimate loss | 3 | 1636 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,11,0]` |
| C11 | 149 MAGBY / 180 BAYLEEF / 153 BUTTERFREE | 180 BAYLEEF | legitimate loss | 0 | 418 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,142,156]` |
| C11 | 149 MAGBY / 180 BAYLEEF / 153 BUTTERFREE | 153 BUTTERFREE | legitimate loss | 3 | 1735 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,120]` |
| C12 | 149 MAGBY / 180 BAYLEEF / 179 HAUNTER | 149 MAGBY | legitimate loss | 2 | 1074 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,137,23]` |
| C12 | 149 MAGBY / 180 BAYLEEF / 179 HAUNTER | 180 BAYLEEF | legitimate loss | 0 | 455 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,142,156]` |
| C12 | 149 MAGBY / 180 BAYLEEF / 179 HAUNTER | 179 HAUNTER | legitimate loss | 0 | 450 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,34]` |
| C13 | 149 MAGBY / 180 BAYLEEF / 181 QUILAVA | 149 MAGBY | seven-win | 6 | 2395 | `roundComplete` |
| C13 | 149 MAGBY / 180 BAYLEEF / 181 QUILAVA | 180 BAYLEEF | legitimate loss | 0 | 460 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,75,0]` |
| C13 | 149 MAGBY / 180 BAYLEEF / 181 QUILAVA | 181 QUILAVA | seven-win | 6 | 4166 | `roundComplete` |
| C14 | 149 MAGBY / 153 BUTTERFREE / 179 HAUNTER | 149 MAGBY | legitimate loss | 0 | 427 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,142,30]` |
| C14 | 149 MAGBY / 153 BUTTERFREE / 179 HAUNTER | 153 BUTTERFREE | seven-win | 6 | 2570 | `roundComplete` |
| C14 | 149 MAGBY / 153 BUTTERFREE / 179 HAUNTER | 179 HAUNTER | legitimate loss | 0 | 429 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,122]` |
| C15 | 149 MAGBY / 153 BUTTERFREE / 181 QUILAVA | 149 MAGBY | legitimate loss | 1 | 968 | `roundLost`; player HP `[0,0,0]`, opponent HP `[33,143,272]` |
| C15 | 149 MAGBY / 153 BUTTERFREE / 181 QUILAVA | 153 BUTTERFREE | legitimate loss | 1 | 824 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,138]` |
| C15 | 149 MAGBY / 153 BUTTERFREE / 181 QUILAVA | 181 QUILAVA | legitimate loss | 4 | 3566 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,71,0]` |
| C16 | 149 MAGBY / 179 HAUNTER / 181 QUILAVA | 149 MAGBY | legitimate loss | 6 | 1878 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,149,49]` |
| C16 | 149 MAGBY / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | legitimate loss | 6 | 2463 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,154,38]` |
| C16 | 149 MAGBY / 179 HAUNTER / 181 QUILAVA | 181 QUILAVA | legitimate loss | 3 | 3254 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,35]` |
| C17 | 180 BAYLEEF / 153 BUTTERFREE / 179 HAUNTER | 180 BAYLEEF | legitimate loss | 0 | 652 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,49]` |
| C17 | 180 BAYLEEF / 153 BUTTERFREE / 179 HAUNTER | 153 BUTTERFREE | legitimate loss | 0 | 485 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,95,0]` |
| C17 | 180 BAYLEEF / 153 BUTTERFREE / 179 HAUNTER | 179 HAUNTER | legitimate loss | 0 | 507 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,106]` |
| C18 | 180 BAYLEEF / 153 BUTTERFREE / 181 QUILAVA | 180 BAYLEEF | halt | 2 | 1141 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 93 instructions; active `[1,2]`, player HP `[0,87,151]`, opponent HP `[0,0,126]` |
| C18 | 180 BAYLEEF / 153 BUTTERFREE / 181 QUILAVA | 153 BUTTERFREE | legitimate loss | 3 | 1531 | `roundLost`; player HP `[0,0,0]`, opponent HP `[21,123,133]` |
| C18 | 180 BAYLEEF / 153 BUTTERFREE / 181 QUILAVA | 181 QUILAVA | legitimate loss | 3 | 1358 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,153]` |
| C19 | 180 BAYLEEF / 179 HAUNTER / 181 QUILAVA | 180 BAYLEEF | legitimate loss | 2 | 1197 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,39,135]` |
| C19 | 180 BAYLEEF / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | halt | 3 | 1648 | HALT `BattleScript_MoveEnd` pc 26, `Cmd_moveend`, 86 instructions; active `[0,1]`, player HP `[102,153,151]`, opponent HP `[0,98,122]` |
| C19 | 180 BAYLEEF / 179 HAUNTER / 181 QUILAVA | 181 QUILAVA | legitimate loss | 3 | 1387 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,93]` |
| C20 | 153 BUTTERFREE / 179 HAUNTER / 181 QUILAVA | 153 BUTTERFREE | legitimate loss | 1 | 857 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,0,45]` |
| C20 | 153 BUTTERFREE / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | halt | 6 | 4111 | HALT `BattleScript_TeeterDanceDoMoveEndIncrement` pc 1858, `Cmd_moveend`, 89 instructions; active `[0,2]`, player HP `[41,153,151]`, opponent HP `[0,159,154]` |
| C20 | 153 BUTTERFREE / 179 HAUNTER / 181 QUILAVA | 181 QUILAVA | legitimate loss | 4 | 2134 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,85,0]` |

## Halt census and frequency ranking

All ten halts are explicit `machine-barrier` boundaries surfaced by
`factoryRoundBattleOrchestrator.ts`'s ordinary driver. None is a driver-budget
exhaustion, throw outside the kernel, or suspicious terminal continuation.
The emitted barrier payload classifies them at the following two exact
`B_SCR_OP_MOVEEND` / `Cmd_moveend` script positions:

| Rank | Barrier position | Rows | Frequency |
| ---: | --- | --- | ---: |
| 1 | `BattleScript_MoveEnd`, program counter 26, opcode 73 `B_SCR_OP_MOVEEND` | C3 ONIX; C5 BAYLEEF; C6 HAUNTER; C8 HAUNTER; C9 ONIX; C9 QUILAVA; C18 BAYLEEF; C19 HAUNTER | 8/60 |
| 2 | `BattleScript_TeeterDanceDoMoveEndIncrement`, program counter 1858, opcode 73 `B_SCR_OP_MOVEEND` | C6 ONIX; C20 HAUNTER | 2/60 |

The common implementation owner is `src/engine/battleScriptMoveEndOpcode.ts`;
the wrapper that publishes the evidence is
`src/engine/factoryRoundBattleOrchestrator.ts:860`. The public barrier payload
does not expose a narrower `unsupported-branch` source construct, so this
census does not speculate beyond the exact opcode, script label, program
counter, instruction count, active slots, and HP state that it emitted. No
halt is fixed here.

## HAUNTER-lead result

Every HAUNTER-containing combination was also run with set 179 HAUNTER as
lead: **10 rows total, 0 seven-win, 6 legitimate losses, and 4 halts**.
The losses were C3 at battle index 2/cursor 1155, C10 at 2/1211, C12 at
0/450, C14 at 0/429, C16 at 6/2463, and C17 at 0/507. The halts were C6 at
`BattleScript_MoveEnd` index 3/cursor 1375, C8 at the same site index
6/cursor 2573, C19 at the same site index 3/cursor 1648, and C20 at
`BattleScript_TeeterDanceDoMoveEndIncrement` index 6/cursor 4111.

## Outcome classification

**9 of 60** rows completed all seven wins. **41 of 60** ended in ordinary
`roundLost`; every one has all three player records at 0 HP and at least one
opponent record above 0 HP. **10 of 60** halted at the two ranked machine
barriers above. All 20 member combinations and all three lead choices ran;
zero requested rows were cut by the cap.
