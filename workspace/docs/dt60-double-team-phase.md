# dt60: Double Team (104) clone phase — ISSUES #158

**Branch (A): fixed from source.** Master df6e26a7e (src 1af9db01) -> code commit `966878ca8` (src tree `f50b5b3d`), test-fixture
follow-up `1146ea844` (tests only).

## 0. Results

- **Mechanism (RAM + source, §1):** `CloneBattlerSpriteWithBlend` copies the whole attacker battler sprite, so `AnimDoubleTeam`'s 2-frame
  step counter `data[3]` starts at the battler sprite's `data[3]`, which the attacker's **send-out mon animation** leaves behind
  (`Task_HandleMonAnimation` zeroes `data[2..7]` only before it). `>= 1` -> the clones run **one call ahead** and are destroyed one frame
  earlier; everything else (ClearMonBg row 132, script end 158, stat banner 162) is unchanged. Not task-slot / RunTasks order, not lag.
- **Derivation:** opponent = front anim `sMonFrontAnimIdsTable[species]`; player = back anim
  `sBackAnimationIds[3 * set + sBackAnimNatureModTable[personality % 25]]`. `dt60MonAnimData3.py` (a) statically proves 96 / 151 animations
  never write `data[3]` and (b) EXECUTES every animation's source (`dt60MonAnimData3Sim.c`: host clang build `#include`-ing
  `pokemon_animation.c` + `trig.c`; only matrix / palette / task externals stubbed) to get the hand-off value `finalData3`
  (`src/data/gen/dt60-mon-anim-data3.json`): 96 + 6 animations end at 0, 47 at >= 1, 2 at -1 (`TUMBLING_FRONT_FLIP*`). **17 / 17 RAM-probed
  animations equal it** (6, 124, 3, 2, 120, 1 and 11 zeros), both classes, both sides.
- **Fix (`liveMoveAnimation.ts` case 104 + `liveDoubleTeamAttackerStepCounter`):** `data[3] >= 1` -> `cloneAnchorAge -1` (table index
  age + 1), `cloneVisibleEndAge 128`; `0` -> the accepted profile (0, 129); `< 0` (MAGNEMITE's front anim; no Factory Double Team user) or a
  player field without a personality -> decline. Presentation only: the command duration (230) and gameplay are unchanged.
- **Windows (final code; `dt60Check.ts` = audit16Check through the production renderer and hosts, chain lend, two fresh direct-mGBA
  probe processes per window, r1 == r2 digests on every window; `receipts/final/`): 34 / 36 Double Team windows 0 px**, all live:
  CHANSEY ply / opp controls c0 + c1 (4), the 9 Outrage chains (CHANSEY, both sides), grid opp UMBREON / SCYTHER / WALREIN / CLEFABLE /
  GARDEVOIR and ply UMBREON / METAGROSS / DUSCLOPS / SCYTHER / SHUCKLE (both bodies each: 20), the ONIX accepted route at the accepted
  framing (`onix-dt-c1`), the ARBOK window and the activation-framing control (+ 4 Outrage later-body windows in the same scenarios, 0 px).
  The 2 non-zero: `onix-dt-c0` (the deliberately
  wrong activation framing control, 300,881 px, unchanged) and **ARBOK i152 49,405 px = the clone tie order, not the phase** (§4).
  Before the fix (`receipts/base/`, master code): CHANSEY 188,618 / 236,200 (audit 16), GARDEVOIR 298,099 / 296,987, SCYTHER ply 293,520 /
  291,824, SHUCKLE ply 163,754 / 163,566; every zero-class window already 0.
- **Census seeds 0..299 (df6e26a7e vs final):** live 7617 -> 7617 commands, 1,130,929 -> 1,130,929 live frames (**delta 0 / 0**), 0
  regressions, 0 pairing mismatches, command key sequence identical, **battle digest identical** (`79313389…`); the command digest differs
  only by decline `gate` line numbers (records identical after stripping them). 214 live Double Team commands: 128 render the 0 phase
  (unchanged pixels), **86 now render the one-call-ahead phase** (opp 30: MURKROW / CHANSEY / GARDEVOIR / VENUSAUR / BLISSEY / ELECTRODE /
  SUNFLORA / MILTANK; ply 56 by the species' Factory-set natures), which master drew one frame off. 0 new declines.
- **Scene ON/OFF parity:** census battle 33 (seed 33, streak 20; two live CHANSEY opponent Double Teams in the ahead phase):
  `words57Parity.ts 33` -> Scene OFF logical identical, presentation seed B logical identical, 17 decision snapshots
  (`parity-battle33-double-team.json`; exit 1 is only words57's own faithful-random-consumer criterion: none in this battle).
- **Prediction vs grid (§3, committed in `f788be882` before the grid):** P1 (zero class 0 px) 7 / 7 species; P2 (one-call-ahead profile
  -> 0 px) 5 / 5 measured `d >= 1` species; P3 (ARBOK = tie order) confirmed (swap34 -> 0 px); P4 zero class all measured 0 and every
  measured non-zero is a "writes" animation, but **CLEFABLE (BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW, "writes") measured 0, not non-zero as
  P4 said** — the static class is only a sufficient condition for 0; the executed `finalData3` (0) is what production uses.

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

## 4. ARBOK (audit 16's 49,405 px, ages 6..45)

ARBOK's battler `data[3]` is 0 (accepted phase; V_STRETCH executes to 0). Its ROM first-body `sSpriteOrder` has free slot 3 ahead of 4
(clone A in front) where every other first body in this lab has 4 ahead of 3. Rendering the window with slots 3 / 4 swapped in the lent order
(`DT60_VARIANT=swap34 dt60Check.ts`, `receipts/exp/check-i152-arbok-double-team-swap34.json`) is **0 px**. The i152 scenario's ARBOK has
ability slot 0 = INTIMIDATE, whose entry animation runs during `BattleLab.prepare` (before the probe's frame 0) and so is absent from the
fixture's `precedingTurns`; the host therefore lends the pristine first-body order. Likely a fixture-history artifact (the orchestrator sees
the Intimidate event in real play); the Double Team renderer itself is exact. Not changed here (order host out of scope).

## 5. Patch proof of the one-call-ahead profile (before the derivation was wired)

`receipts/exp/writers-phase.patch` (case 104 with `cloneAnchorAge -1, cloneVisibleEndAge 128` for every attacker), run on the `d >= 1`
windows only: CHANSEY ctl ply / opp (c0, c1), 9 Outrage chains, GARDEVOIR, SCYTHER ply, SHUCKLE ply: all 0 px, r1 == r2
(`receipts/exp/check-*-dge1.json`).

## 6. Reproduction (from workspace/; direct mGBA only)

```
python3 tools/integration/dt60MonAnimData3.py --check src/data/gen/dt60-mon-anim-data3.json         # static class + executed source (clang)
python3 tools/integration/dt60Probe.py <scenario.json> <out.json> [N]                                  # RAM: battler / clone data, tasks, order
python3 tools/integration/dt60Stage.py <dir>                                                           # == tools/integration/fixtures/dt60/scenarios
python3 tools/run-mgba-probe.py <p.json> -- <venv-python> tools/integration/prep48Probe.py <scenario> <p.json> <rgb-dir>   # per scenario
python3 tools/integration/dt60Fixtures.py <probe-dir> <fixture-dir>                                    # == tools/integration/fixtures/dt60/fixtures
node --experimental-strip-types --no-warnings tools/integration/dt60Check.ts tools/integration/fixtures/dt60/fixtures dt60-ply-shuckle <out.json>
node --experimental-strip-types --no-warnings tools/integration/dt60Check.ts tools/integration/fixtures/audit-16/fixtures ctl-double-team-opp <out.json>
DT60_VARIANT=swap34 node --experimental-strip-types --no-warnings tools/integration/dt60Check.ts tools/integration/fixtures/audit-16/fixtures i152-arbok-double-team <out.json>
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=<a.json> --commands=<a.jsonl>   # base tree and final tree
python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
node --experimental-strip-types --no-warnings tools/integration/words57Parity.ts 33 <out.json>
```

Limits: the checker window is the ROM script window (activation .. first inactive, 159 rows); the stat-banner tail (rows 159..229 of the
230-row presentation) is untouched by this change (its parameters are unchanged; RAM shows `StatsChangeAnimation` at row 162 in both
phases). Battler `data[3]` writers other than the send-out animation were checked by grep only (no battle-anim script writes a battler
sprite's `data[3]`; Double Team itself does not: second bodies inherit the same value). A live adapter is not whole-playable
arbitrary-history exactness.
