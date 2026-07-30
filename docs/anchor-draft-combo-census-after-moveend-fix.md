# Anchor-draft census after the move-end item fix

> **Addendum evidence (2026-07-30):** worker HEAD
> `baaffad303a3a2a4e52244a34d3dba428e49af1f`; Battle Scene OFF profile.
> This re-drives only the 10 rows halted in the frozen
> `anchor-draft-combo-census.md`. The policy remains first legal move, first
> legal forced switch, and decline every optional swap. The driver enters
> through `createFactoryAnchorSession` and uses the public round orchestrator
> API with the same anchor selection schedule and construction/battle cursors.

The original C9 ONIX row identified
`ItemBattleEffects(ITEMEFFECT_MOVE_END)`'s restoring branch at
`battle_util.c:3639` with hold effect 4 (poison cure). The original C6 ONIX
Teeter Dance row reached the same construct with hold effect 8 (confusion
cure). After porting that family, **all 10 rows drain: 4 seven-win, 6
legitimate losses, 0 new halts**.

| Combo | Members | Lead | New result | Final battle index | Facility-call cursor | Terminal evidence |
| --- | --- | --- | --- | ---: | ---: | --- |
| C3 | 156 ONIX / 149 MAGBY / 179 HAUNTER | 156 ONIX | legitimate loss | 2 | 1110 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,51,131]` |
| C5 | 156 ONIX / 180 BAYLEEF / 153 BUTTERFREE | 180 BAYLEEF | legitimate loss | 3 | 1817 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,30,131]` |
| C6 | 156 ONIX / 180 BAYLEEF / 179 HAUNTER | 156 ONIX | legitimate loss | 3 | 1640 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,153,153]` |
| C6 | 156 ONIX / 180 BAYLEEF / 179 HAUNTER | 179 HAUNTER | legitimate loss | 5 | 2685 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,27,143]` |
| C8 | 156 ONIX / 153 BUTTERFREE / 179 HAUNTER | 179 HAUNTER | seven-win | 6 | 2624 | `roundComplete`; player HP `[0,112,153]`, opponent HP `[0,0,0]` |
| C9 | 156 ONIX / 153 BUTTERFREE / 181 QUILAVA | 156 ONIX | legitimate loss | 2 | 1254 | `roundLost`; player HP `[0,0,0]`, opponent HP `[0,143,0]` |
| C9 | 156 ONIX / 153 BUTTERFREE / 181 QUILAVA | 181 QUILAVA | legitimate loss | 3 | 1459 | `roundLost`; player HP `[0,0,0]`, opponent HP `[20,0,0]` |
| C18 | 180 BAYLEEF / 153 BUTTERFREE / 181 QUILAVA | 180 BAYLEEF | seven-win | 6 | 2515 | `roundComplete`; player HP `[112,153,151]`, opponent HP `[0,0,0]` |
| C19 | 180 BAYLEEF / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | seven-win | 6 | 3041 | `roundComplete`; player HP `[0,33,0]`, opponent HP `[0,0,0]` |
| C20 | 153 BUTTERFREE / 179 HAUNTER / 181 QUILAVA | 179 HAUNTER | seven-win | 6 | 4241 | `roundComplete`; player HP `[0,3,151]`, opponent HP `[0,0,0]` |
