# dt60: Double Team (104) clone phase — ISSUES #158

Status: MECHANISM + PREDICTION (committed before the check grid). Results are appended below in later commits.

## 1. Mechanism (RAM evidence + source)

`AnimTask_DoubleTeam` (`battle_anim_effects_1.c:5173-5206`) makes its two clones with `CloneBattlerSpriteWithBlend(0)`
(`battle_anim_mons.c:1626-1645`), which is a **whole `struct Sprite` copy** of the attacker's battler sprite
(`gSprites[i] = gSprites[spriteId]`). The task then sets only `data[0] = 0`, `data[1] = i << 7`, `data[2] = taskId` and the
callback. `AnimDoubleTeam` (`battle_anim_effects_1.c:5223-5243`) steps its motion with `if (++sprite->data[3] > 1) { data[3] = 0;
data[0]++; }` — so its 2-frame step counter **starts at the battler sprite's own `data[3]`**:

- battler `data[3] == 0`: first call 0 -> 1, no step (the accepted phase: ONIX -> GROVYLE, prep7);
- battler `data[3] >= 1`: first call already steps (`data[0] = 1`): the clone motion is **one call ahead** and the clones are destroyed
  one frame earlier (`data[0] > 64` one call sooner); everything after is unchanged (the script's `waitforvisualfinish` /
  `clearmonbg` / end / stat banner run at the same rows);
- battler `data[3] < 0`: |d| calls behind (not observed).

The battler sprite's `data[3]` is left by its **send-out mon animation**: `Task_HandleMonAnimation` zeroes `data[2..7]` before the first
anim callback and restores only `data[0]`, `data[2]` (and clears `data[1]`) when it ends (`pokemon_animation.c:911-939`), so whatever the
`Anim_*` callback chain last wrote into `data[3]` stays for the rest of the battle (until another send-out). Opponent: the species' front
anim (`sMonFrontAnimIdsTable`); player: the back anim `sBackAnimationIds[3 * backAnimSet + sBackAnimNatureModTable[nature]]`
(`pokemon_animation.c:956-970`; species AND nature). Double Team itself never writes the battler sprite (a second body inherits the same value).

This is not task-slot / RunTasks order (the clone task is slot 0, `Task_UpdateMonBg` slot 2 in every probe) and not a lag phase.

RAM (`tools/integration/dt60Probe.py`, direct mGBA, receipts `tools/integration/fixtures/dt60/probes/`): battler `data[3]` on the
frame before activation, and the clones' `data[0]` / `data[3]` after their first callback (row 1):

| Scenario | Attacker (side) | battler data[3] | clone data[0] / data[3] at row 1 | sSpriteOrder (slots 6, 8, 3, 4) row 1 |
|---|---|---|---|---|
| prep7 onix-grovyle-firstbody | ONIX (player) | 0 | 0 / 1 | 6 4 3 8 |
| prep7 player-dragonair-onix | DRAGONAIR (player) | **3** | **1 / 0** | 6 4 3 8 |
| prep7 opponent-dragonair-onix | DRAGONAIR (opponent) | 0 | 0 / 1 | 6 8 4 3 |
| audit-16 ctl-double-team-ply (body 1 and 2) | CHANSEY (player) | **6** | **1 / 0** | 6 4 3 8, then 6 3 4 8 |
| audit-16 ctl-double-team-opp (body 1 and 2) | CHANSEY (opponent) | **124** | **1 / 0** | 6 8 4 3, then 6 8 3 4 |
| audit-16 i152-arbok-double-team | ARBOK (opponent) | 0 | 0 / 1 | **6 8 3 4** |

Non-attacker battler sprites: GROVYLE opp 0, SNORLAX opp 0, ONIX opp 0, CATERPIE ply 0, SNORLAX ply **2**.
Lifecycle (`-long` probes): CHANSEY clones gone at row 129, ONIX at row 130; `Task_ClearMonBg` row 132, script end row 158 and
`StatsChangeAnimation` row 162 in both.

**ARBOK is NOT this mechanism**: its battler `data[3]` is 0 (accepted phase). Its first-body ROM `sSpriteOrder` has clone slot 3 ahead
of slot 4 (`frontClone` "a"), where every other first body has 4 ahead of 3 ("b").

## 2. Source-derived classification (`tools/integration/dt60MonAnimData3.py`)

Static call graph of `pokemon_animation.c` from each `sMonAnimFunctions` entry (direct calls and `sprite->callback = F`): an animation that
never writes `data[3]` leaves the battler sprite at `data[3] == 0`. 96 / 151 animations never write it ("zero"); 55 do ("writes": the
final value is not derived here). Against the 11 measured battler sprites: every "zero" animation measured 0 (ONIX ply V_SHAKE_BACK_FAST,
DRAGONAIR opp V_SHAKE, ARBOK / GROVYLE opp V_STRETCH, SNORLAX opp SWING_CONCAVE, CATERPIE ply H_SLIDE_SLOW, ONIX opp RAPID_H_HOPS) and every
measured non-zero value is a "writes" animation (CHANSEY ply CONCAVE_ARC_SMALL 6, CHANSEY opp V_SQUISH_AND_BOUNCE_SLOW 124, DRAGONAIR ply
TRIANGLE_DOWN_TWICE 3, SNORLAX ply H_DIP_TWICE 2). Factory Double Team sets (68): opponent 47 zero / 21 writes; player 28 zero / 40 writes.

## 3. Prediction (recorded before the grid)

P1. Every attacker whose send-out animation is "zero" (either side) renders Double Team at production's accepted phase: **0 px** through
the production renderer (absent an unrelated order / field difference).
P2. A "writes" attacker with final `data[3] >= 1` is one call ahead: production (d = 0) shows the CHANSEY-class residual on the clone
rows; the d >= 1 phase = production's own profile with `cloneAnchorAge: -1` (table index n + 1) and `cloneVisibleEndAge: 128`
(destroyed one frame earlier), everything else unchanged -> 0 px.
P3. ARBOK's 49,405 px (ages 6..45) is the clone tie order, not the phase: rendering its window with clone A in front (ROM slots 3 before 4)
-> 0 px; production's `frontClone` follows the lent first-body order (4 before 3 -> "b").
P4. Grid (both sides, Factory Double Team users): zero class — opponent UMBREON (V_SHAKE), SCYTHER (H_VIBRATE), WALREIN (H_SHAKE); player
UMBREON BOLD (SHRINK_GROW_VIBRATE), METAGROSS ADAMANT (V_SHAKE_BACK_FAST), DUSCLOPS IMPISH (H_VIBRATE_FASTEST): all 0 px under
production. Writes class — opponent GARDEVOIR (V_SQUISH_AND_BOUNCE), CLEFABLE (BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW); player SCYTHER ADAMANT
(TRIANGLE_DOWN_TWICE), SHUCKLE CAREFUL (H_DIP_FAST): battler `data[3] != 0`, non-zero under production's d = 0 phase.
