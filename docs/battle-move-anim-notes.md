# Move-animation groundwork: ROCK_SLIDE + DOUBLE_TEAM (S7)

S7 groundwork (extraction-only worktree lane, follow-up to `docs/
battle-turn-notes.md` §7 item 5). **No engine code was written** - this
banks assets, a decoded script step list, and oracle-pixel/register ground
truth for the two move animations turn 1 of `tools/compare/
traces-groundtruth/battle1-turn1.json` actually plays: Onix's **ROCK_SLIDE**
(falling rocks + generic hit-flash on Grovyle) and Grovyle's **DOUBLE_TEAM**
(afterimage clones, self-targeted). Do not confuse this doc with `docs/
battle-anim-assets.md` (the send-out/intro animation inventory, a different
and separately-owned doc) - this one covers **move** animations, played
mid-turn from the action menu, not send-out.

Sources: `reference/pokeemerald/data/battle_anim_scripts.s` (the two moves'
programs), `src/battle_anim_rock.c`, `src/battle_anim_normal.c`,
`src/battle_anim_mons.c`, `src/battle_anim_mon_movement.c`,
`src/battle_anim_effects_1.c`, `src/battle_controller_opponent.c`,
`src/pokeball.c`, `data/battle_scripts_1.s`, `asm/macros/
battle_anim_script.inc` (the script bytecode's opcode table). All line
numbers cite this pinned checkout.

## 1. Asset inventory + extraction status

| asset | move | status | where |
|---|---|---|---|
| `rocks.png` tiles/palette (`gFallingRockSpriteTemplate`, `ANIM_TAG_ROCKS`) | ROCK_SLIDE | **extracted** (new) | `src/assets/gen/battle-anim-rocks.json` |
| Grovyle's front sprite (the thing DOUBLE_TEAM clones) | DOUBLE_TEAM | **already extracted** (prior session) | `src/assets/gen/battle-opponent-front-sprites.json` (`GROVYLE` key) |
| generic hit-flash (healthbox wobble + mon blink) | both (shared, engine-generic) | **no art needed** - reuses the existing healthbox/mon sprites, just toggles position/visibility | formulas in `src/data/gen/battle-move-anim-tables.json`'s `hitFlash` |
| decoded script step lists | both | **extracted** (new) | `src/data/gen/battle-move-anim-scripts.json` |
| per-tick motion/blend formulas | both | **extracted** (new) | `src/data/gen/battle-move-anim-tables.json` |

**Why DOUBLE_TEAM needed zero new tile/palette extraction**: its clones
aren't a distinct sprite sheet. `AnimTask_DoubleTeam`
(`src/battle_anim_effects_1.c:5173-5206`) calls `CloneBattlerSpriteWithBlend`
(`src/battle_anim_mons.c:1626-1645`), which is a **struct copy** of the
attacker's own already-rendered `struct Sprite` (`gSprites[i] =
gSprites[spriteId]`) into a free slot, not a new gfx load - so Grovyle's
existing front-sprite art (already committed) is the only asset it needs.
The "afterimage" look comes entirely from a palette blend + the `ST_OAM_
OBJ_BLEND` OAM flag (§3).

**Needs-only, out of scope**: `rocks.png`'s 6 total 32x32 frames only 3
(indices 2/3/4) belong to `gFallingRockSpriteTemplate`; frames 0/1/5 belong
to other rock-move templates (ROCK_TOMB/ROCK_BLAST family, `src/
battle_anim_rock.c`'s `sAnim_Rock_Biggest/Bigger/Big` sequence) - not
decoded this session, flagged as an adjacent need if a future slice covers
those moves. The extracted JSON includes the full 96-tile sheet regardless
(cheap, contiguous data), just labels which frames ROCK_SLIDE/DOUBLE_TEAM
actually use.

## 2. Decoded script step lists

`src/data/gen/battle-move-anim-scripts.json` - hand-transcribed (the source
assembly text is fixed, so this is deterministic the same way this run's
other "literal constant table" extractions are - see the extractor's own
header comment) from `data/battle_anim_scripts.s`. Opcode field names mirror
`asm/macros/battle_anim_script.inc`'s macros 1:1; every step cites its exact
source line.

**ROCK_SLIDE** (`Move_ROCK_SLIDE` :2119-2141 + `RockSlideRocks` subroutine
:2143-2168, called twice): `loadspritegfx ANIM_TAG_ROCKS` -> `monbg
ANIM_DEF_PARTNER` (no-op here, no attacker/target partner in a single
battle) -> `shake_mon_or_platform` (background shake, decoded below) -> 4
`createsprite gFallingRockSpriteTemplate` calls (each followed by
`playsewithpan SE_M_ROCK_THROW` + `delay 2`) -> 2 `createvisualtask
AnimTask_ShakeMon` (mon bounce, target + def-partner-as-no-op) -> `delay 2`
-> `call RockSlideRocks` **twice** (8 more rock spawns each call, same
create+playse+delay(2) pattern) -> `waitforvisualfinish` -> `clearmonbg` ->
`end`. **20 total falling-rock sprites** (4 + 8×2), each an independent
`createsprite` with its own `[xOffset, animNum, velocity, useAveragePos]`
argv (decoded from `AnimFallingRock`, `src/battle_anim_rock.c:297-318` -
`useAveragePos` nonzero routes through `SetAverageBattlerPositions`, so
every rock starts from the midpoint between Onix and Grovyle's sprites,
offset by `xOffset`).

**DOUBLE_TEAM** (`Move_DOUBLE_TEAM` :2778-2803): `createvisualtask
AnimTask_DoubleTeam` (spawns the clones, C-side - §3) -> `setalpha 12, 8`
-> `monbg ANIM_ATK_PARTNER` (no-op, no attacker partner) -> 9
`playsewithpan SE_M_DOUBLE_TEAM` calls on a decaying delay schedule (32,
24, 16, 8, 8, 8, 8, 8, then none before `waitforvisualfinish`) -> `clearmonbg`
-> `blendoff` -> `delay 1` -> `end`. Notably the script itself never touches
BLDALPHA past the single `setalpha 12,8` call - see §4's register finding,
which shows the real hardware register doing something the script alone
doesn't explain.

Both step lists + the argv-to-field mapping (`createspriteArgvMapping`) are
in the committed JSON; Tier-1 pins (`tests/moveAnimAssets.test.ts`) lock the
rock/delay counts.

## 3. Per-tick motion/blend formulas (`battle-move-anim-tables.json`)

- **Falling rock arc** (`AnimFallingRock`/`_Step`, both driving
  `TranslateSpriteInEllipse`, `src/battle_anim_mons.c:516-531`): phase 1
  (16 ticks) sweeps `y2 = Cos(circlePos, -70)` with `circlePos` 0->60 in
  steps of 4 (`x2` pinned to 0, `amplitudeX=0`) - an arc-down. Phase 2 (32
  ticks, starts immediately after) applies the rock's `velocity` argv as a
  one-time `x +=` step, then `x2 = Sin(circlePos, velocity)` with
  `circlePos` restarting at 192, `y2 = Cos(circlePos, -24)` - a settling
  wobble before the sprite is destroyed. **48 ticks total per rock**,
  staggered every 2 ticks by the script's own spawn cadence, so many rocks
  overlap mid-flight at once.
- **Screen shake** (`shake_mon_or_platform velocity=7, shake_timer=1,
  shake_duration=11, type=SHAKE_BG_Y`, `src/battle_anim_normal.c`
  `AnimShakeMonOrBattlePlatforms`/`_Step`): targets **`gBattle_BG3_Y`**, a
  background **scroll** register - not BLDALPHA, not mosaic. Decoded
  behavior: `+-7` applied roughly every other tick across an 11-tick
  window (~5 writes), then restored to its pre-effect value. **Not
  confirmed in RAM this session** - §4 flags this as an open finding
  (sampled the register every tick across the whole trace and never saw a
  nonzero value).
- **Mon shake** (`AnimTask_ShakeMon`, `src/battle_anim_mon_movement.c:
  92-140`): toggles the target's sprite `y2` between 0 and the given
  offset every `frameDelay` ticks, `numTimes` times. ROCK_SLIDE's call
  (`ANIM_TARGET, 0, 5, 50, 1`) bounces Grovyle's sprite `y2` 0<->5 every
  tick for 50 ticks.
- **Generic hit-flash** (`hitFlash`, fires for *any* damaging move that
  reaches the `hitanimation` battle-script opcode, not ROCK_SLIDE-specific -
  `data/battle_scripts_1.s:236-261` `BattleScript_EffectHit`, reached via
  `BattleScript_EffectFlinchHit`'s `goto` for ROCK_SLIDE's own
  `EFFECT_FLINCH_HIT`): two concurrent effects on the target - (1) the
  healthbox sprite wobbles `y2` +-1px every tick for 21 ticks
  (`DoHitAnimHealthboxEffect`/`SpriteCB_HitAnimHealthoxEffect`,
  `src/pokeball.c:1284-1306`); (2) the mon sprite's `invisible` flag toggles
  every 4 ticks for 32 ticks total = 4 blink cycles
  (`DoHitAnimBlinkSpriteEffect`, `src/battle_controller_opponent.c:
  440-455`, the opponent-side controller path relevant to Grovyle). Battle-
  script order confirms **this fires only after ROCK_SLIDE's own
  `attackanimation` (the falling rocks) has fully finished**, not
  concurrently with it (`attackanimation, waitanimation, effectivenesssound,
  hitanimation, waitstate, healthbarupdate` - :251-259).
- **DOUBLE_TEAM clone setup + motion** (`AnimTask_DoubleTeam`/`_Step`,
  `AnimDoubleTeam`, `src/battle_anim_effects_1.c:5173-5243`): allocates a
  scratch palette (tag `ANIM_TAG_BENT_SPOON`, reused opportunistically -
  not actually a spoon-related asset), copies the attacker's own palette
  into it, blends that copy **11/16 of the way toward RGB_BLACK** (the dark
  afterimage tint), then clones the attacker's rendered sprite into up to 2
  free slots with `ST_OAM_OBJ_BLEND` set. Each clone's sine-wave x-offset
  motion: a counter advances by 1 every 2 ticks (0..64, ~130 ticks total
  before the clone self-destroys); every tick, `amplitude =
  gSineTable[counter]/6` and `phaseSpeed = gSineTable[counter]/13` are
  recomputed from the current counter, a running phase advances by
  `phaseSpeed` (wrapping mod 256, seeded 0 for one clone / 128 for the
  other - a half-cycle stagger so they swim out of sync), and `x2 =
  Sin(phase, amplitude)`. **This ~130-tick source-derived lifetime does NOT
  match the ~65-tick lifetime actually observed in oracle pixels/registers
  - see §4's open finding.**

## 4. Oracle ground-truth: phase timeline + register findings

Probed via two scratch traces (not committed - `battle1-turn1.json`'s own
`segments` replayed with `captureFrames` densified to every tick across
each window, same convention as `docs/battle-anim-assets.md` §4) plus a
scratch `ram-probe.py` spec watching `DISPCNT` (`0x04000000`), `BLDCNT`
(`0x04000050`), `BLDALPHA` (`0x04000052`), `MOSAIC` (`0x0400004C`),
`BG3VOFS` (`0x04000018`), and `gBattle_BG3_Y` across the whole trace
(1920-2620) in one pass. Phase boundaries below come from per-tick
whole-frame pixel-diff sums (large diff = visibly different frame) cross-
checked against the register trace; not a per-tick pixel table (not
required by this step's brief).

### DOUBLE_TEAM window (1928-2173)

| ticks | phase | evidence |
|---|---|---|
| 1928-1929 | "Foe GROVYLE used\nDOUBLE TEAM!" textbox opens | pixel diff spike (2.83M) at 1929 |
| 1929-1956 | message printing character-by-character | small oscillating diffs (~6-11k/tick) |
| 1957-2003 | message held, screen static | **exact 0 diff every tick**, 47 ticks |
| 1999-2064 | **clone animation window** (see register findings below) | large diffs (13k-192k), peaking ~2020-2044 |
| 2063-2074 | quiet | exact 0 diff |
| 2075 | 2nd textbox opens ("Foe GROVYLE's evasiveness\nrose!" - the stat-stage message; `gBattleMons[1].statStages[EVASION]` itself flips 6->7 back at tick 1959 per `battle-turn-notes.md` §7 point 2, RAM-confirmed by a prior session - the *text* for that change only appears here, ~116 ticks later) | pixel diff spike (199885) |
| 2076-2104 | message printing | small oscillating diffs |
| 2105-2173 | held/settled through window end | exact 0 diff |

**Register findings (the clone window, 1999-2064)**:
- `BLDCNT` jumps from `0x0000` to `0x3F42` at tick 1999 and holds constant
  through 2064: target1 = BG1 only (bit1), target2 = **all** layers
  (`0x3F`, every BG + OBJ + backdrop), mode = alpha blend (`01`). This is
  the `monbg`-composited copy of the attacker (moved onto BG1, per the
  script's own `monbg ANIM_ATK_PARTNER`-adjacent mechanism - the attacker
  itself, not just its partner, is what actually gets BG-composited by the
  wider `Cmd_monbg` machinery, `src/battle_anim.c:591-647`) blending
  against literally everything else on screen.
- `BLDALPHA` **ramps smoothly**: `eva=0/evb=16` (tick 1999) -> steps of
  1 unit every 2 ticks -> `eva=10/evb=6` (reached tick 2022, held flat
  through tick 2043 - 22 ticks) -> ramps back down, symmetric, reaching
  `eva=0/evb=16` again at tick 2064, then both registers zero at 2065.
  A clean fade-in / hold / fade-out envelope, 66 ticks total (1999-2064).
- `DISPCNT` bit 15 (`ObjWin` per the standard GBA layout) clears at tick
  2065 and stays cleared for the rest of the trace (2065-2620) - the ONE
  register change this session couldn't tie back to a specific line of
  source (`AnimTask_DoubleTeam_Step`'s own cleanup only touches
  `DISPCNT_BG1_ON`/`DISPCNT_BG2_ON`, bits 9/10, which this probe never saw
  move at all across the whole trace - see the open question below).
- `gBattle_BG3_Y`/`BG3VOFS`: **flat 0 for the entire 1920-2620 trace** -
  see the ROCK_SLIDE section below, same open finding applies here (this
  window's own `monbg` calls don't use SHAKE_BG_Y, so 0 is expected here;
  it's ROCK_SLIDE's own shake command that's the surprise).

**Open finding**: the smooth `BLDALPHA` ramp (~23 ticks fading in, a 22-tick
hold at the peak, ~21 ticks fading back out) is **not** what the script's
single `setalpha 12,8` opcode
alone produces (that opcode sets one fixed value, no animation) - so some
OTHER mechanism (not identified this session - candidate: a generic
fade-in/out wrapper around `attackanimation` itself, or logic inside the
wider `monbg`/`Task_UpdateMonBg` machinery, `src/battle_anim.c:520-589`,
not traced this deep) is actively driving the ramp. The clone motion
formula (§3) predicts a ~130-tick clone lifetime; the observed blend
window is only ~66 ticks - roughly half. Both point at the same gap: this
session traced `AnimTask_DoubleTeam`'s own sprite-motion code exactly, but
something else (still unidentified) governs the blend's actual on-screen
timing/duration. Flagged for whichever engine slice implements this -
timing the visual off the **register envelope** (66 ticks, oracle-
confirmed) rather than the naively-computed 130-tick source formula is the
safer bet until this gap is resolved.

**RESOLVED (S7 worktree lane, RNG/BG3_Y follow-up session)**: the BLDALPHA
ramp is **not** driven by `Move_DOUBLE_TEAM`/`AnimTask_DoubleTeam` at all -
it's `General_StatsChange`'s `InitStatsChangeAnimation`/
`StatsChangeAnimation_Step1-3` (`src/battle_anim_utility_funcs.c:415-628`),
the **generic** stat-stage-change arrow/banner effect that fires for *any*
stat boost, dispatched by a completely different battle-script command
(`playanimation BS_EFFECT_BATTLER, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1`,
`data/battle_scripts_1.s:511`, reached via `BattleScript_EffectEvasionUp ->
BattleScript_EffectStatUp -> ... -> BattleScript_StatUpAttackAnim
(attackanimation, waitanimation) -> BattleScript_StatUpDoAnim ->
BattleScript_StatUp`) that happens to run in the same script slot right
after DOUBLE_TEAM's own `attackanimation` step. Exact match, both source-
and RAM-derived:
- `StatsChangeAnimation_Step1` (`:442-443`) writes `BLDCNT =
  BLDCNT_TGT1_BG1 | BLDCNT_TGT2_ALL | BLDCNT_EFFECT_BLEND` = **`0x3F42`**,
  byte-for-byte the value this dossier's own §4 table reports; and
  `BLDALPHA = BLDALPHA_BLEND(0, 16)` (eva=0/evb=16), matching the RAM-
  observed value at tick 1999 exactly.
- `StatsChangeAnimation_Step3`'s case 0 (`:571-583`) increments `tBlend`
  by 1 every 2 ticks (`tFadeTimer++ > 0` gate) until it hits `tTargetBlend`
  (10 for a non-"sharply" +1 stage change - DOUBLE_TEAM's own
  `EFFECT_EVASION_UP`, not `_2`), writing `BLDALPHA_BLEND(tBlend, 16-
  tBlend)` each step - reproduces the observed 10-step/20-tick ramp to
  eva=10/evb=6 exactly. Case 1 holds for `tWaitTime=20` ticks. Case 2
  mirrors the ramp back down. Case 3 (`:603-627`) resets `BLDCNT`/
  `BLDALPHA` to 0 and **toggles `DISPCNT_OBJWIN_ON`** (`^=`, i.e. clears
  the bit `StatsChangeAnimation_Step1` set) - this is what this dossier's
  §5 item 4 (DISPCNT bit 15) actually is; not DOUBLE_TEAM-related at all.
- RAM-verified two ways: (1) a fresh, densified per-tick `BLDALPHA`
  re-probe reproduces the dossier's own table exactly (`eva/evb` = `0/16`
  @1999, ramping to `10/6` held 2022-2043, back to `0/16` @2063-2064, `0`
  @2065); (2) `tools/probe/dump-task-and-sprite-callbacks.py` (new,
  committed) dumped every `gTasks[]` slot's function pointer every tick
  1900-2070 and, bisected against `arm-none-eabi-nm`'s full (static-
  symbol-inclusive) table, shows task slot 1 running
  `StatsChangeAnimation_Step2` then `_Step3` for exactly the observed
  ramp window, and task slot 0 running `Task_ClearBitWhenBattleTableAnimDone`
  (`src/battle_gfx_sfx_util.c:493` - the generic "wait for a
  `TryHandleLaunchBattleTableAnimation`-launched anim to finish" tracker,
  confirming `General_StatsChange` was launched through that path, not
  through `Cmd_createvisualtask`).

**A deeper finding this same probe surfaced**: `AnimTask_DoubleTeam`'s own
task (and its `AnimDoubleTeam`-callback clone sprites) **never appear at
all** - `tools/probe/dump-task-and-sprite-callbacks.py` scanned all 16
`gTasks[]` slots every tick 1900-2070 and all 64 `gSprites[].callback`
slots every tick 1920-2070 and found zero matches for
`AnimTask_DoubleTeam`/`AnimTask_DoubleTeam_Step`/`AnimDoubleTeam` anywhere.
Root cause (RAM-confirmed, §6 below): this canonical save has **Battle
Scene: OFF** (`gSaveBlock2Ptr->optionsBattleSceneOff == TRUE`), which sets
`gHitMarker`'s `HITMARKER_NO_ANIMATIONS` bit at battle init
(`battle_main.c:3085`) and makes `Cmd_attackanimation`
(`battle_script_commands.c:1742-1747`) skip **every** move's own custom
attack-animation script (substituting a short generic pause,
`BattleScript_Pausex20`) - so `Move_DOUBLE_TEAM` (clones, `setalpha 12,8`,
the whole script) never runs in this trace. `Cmd_playanimation`
(`:4009-4018`) special-cases `B_ANIM_STATS_CHANGE` (and
`B_ANIM_SNATCH_MOVE`/`B_ANIM_SUBSTITUTE_FADE`) as **exempt** from that
gate, which is exactly why the stats-change banner still played while the
clones didn't. This also fully explains why the clone-motion formula's
~130-tick prediction never matched the observed ~66-tick window (§3/this
section's old open finding) - there was no clone motion to match against;
the 66 ticks are 100% the (unrelated) stats-change banner's own envelope.
See §6 for the full root-cause writeup (shared with the ROCK_SLIDE findings
below) and the exact RAM evidence.

### ROCK_SLIDE window (2182-2281)

| ticks | phase | evidence |
|---|---|---|
| 2183-2184 | "ONIX used\nROCK SLIDE!" textbox opens | pixel diff spike (193857) at 2184 |
| 2185-2203 | message printing | small oscillating diffs |
| 2204-2246 | **silent** - crit roll (2206), damage-spread roll (2209, `gBattleMoveDamage` locks to 42), `typecalc`/`adjustnormaldamage`, and (per script order) the very start of `attackanimation` (`loadspritegfx`/`monbg`/`shake_mon_or_platform`/the first few rock spawns) | **exact 0 diff every tick**, 43 ticks - see the open finding below, this is longer than expected if rocks were visible from the first `createsprite` |
| 2247-2267 | **falling rocks visible** - repeating ~4-tick pattern (1.29M, 631k, 631k, 631k) matching the script's 2-tick rock-spawn cadence | large repeating diffs |
| 2268-2281 | **hit-flash blink tail** - diffs recur every 4 ticks (2268, 2272, 2276 - window ends at 2281 before a 4th toggle) | matches `hitFlash.spriteBlink`'s exact 4-tick toggle cadence (§3) - truncated by this window's own end (2281 = the dossier's own "HP-bar drain start" boundary, `battle-turn-notes.md` §2) |

**RESOLVED/REFRAMED (S7 worktree lane, RNG/BG3_Y follow-up session) - the
"2247-2267 falling rocks visible" row above is not rocks**: per this same
session's root-cause finding (this section, above, and §6), ROCK_SLIDE's
`attackanimation` (rocks included) never runs in this trace at all - so
there is nothing rock-related to see in this window's pixels. A fresh
`tools/probe/dump-task-and-sprite-callbacks.py` run confirms directly:
zero `gSprites[]` slots ever carry `AnimFallingRock`/`AnimFallingRock_Step`
(`src/battle_anim_rock.c:55-63`, the rock sprite's own callback) at any
tick 2180-2320, while `SpriteCB_HitAnimHealthoxEffect`
(`src/pokeball.c` - the healthbox-wobble half of the generic hit-flash,
§3) is confirmed **active in a sprite slot from tick 2246 through 2265**
- i.e. one continuous tick earlier than this dossier's own "2247" boundary,
within normal one-tick alignment slop. The generic hit-flash (healthbox
wobble, 21 ticks, `DoHitAnimHealthboxEffect`) and mon-sprite blink (32
ticks, `DoHitAnimBlinkSpriteEffect`) **both start together around tick
2246** and simply overlap - this dossier's own separately-drawn
"2247-2267" and "2268-2281" rows are two halves of that **one** effect,
not two different phenomena, and the "20-spawn cadence vs ~20-tick visible
window" discrepancy this dossier's §5 item 3 asked to reconcile does not
exist because there was never a rocks-visible window to reconcile against.
This also closes §5 item 3 outright rather than needing the extended-
capture follow-up it proposed.

**Register findings**: `BLDCNT`/`BLDALPHA`/`MOSAIC` are **`0x0000` for the
entire window** (and the entire 1920-2620 trace outside the DOUBLE_TEAM
window above) - confirming ROCK_SLIDE's animation uses **no alpha blend at
all**, matching its script (no `setalpha` opcode anywhere in `Move_
ROCK_SLIDE`/`RockSlideRocks`). `gBattle_BG3_Y`/`BG3VOFS` are also flat 0
throughout - see the open finding immediately below.

**Open finding - the BG3_Y shake never showed up**: `shake_mon_or_platform
velocity=7, shake_timer=1, shake_duration=11, type=SHAKE_BG_Y` should write
`gBattle_BG3_Y` to `-7`/`0` alternately across an 11-tick window (§3) - this
session watched that address (and the corresponding hardware `BG3VOFS`
mirror) at **every single tick** from 1920 through 2620 and it read exactly
0 the entire time, including within the 2204-2246 window where the shake's
sprite (created immediately after `monbg`, before any rock spawns) should
be active. Two honest possibilities, neither confirmed: (a) the register
write happens and reverts within a span this probe's tick-granularity
genuinely can't separate from 0 (each write is only 1 tick before the next
call flips the sign again, and if the probe's sample point sits at a
different point in the frame than the write, it could always catch the
"flipped back" half - though the shake's own `sTimer`-driven schedule
should still leave at least one nonzero tick per pulse by this session's
own hand-derived math, §3), or (b) something about this specific matchup/
scene suppresses or reroutes the effect. Not resolved this session -
flagged as the clearest concrete follow-up if an engine slice needs the
exact shake timing (a source-level breakpoint trace, not just RAM
sampling, would settle it).

**RESOLVED (S7 worktree lane, RNG/BG3_Y follow-up session) - option (b), not
(a)**: confirmed via a fresh, independent `gBattle_BG3_Y`/`gBattle_BG3_X`
re-probe (both hardware-mirror-equivalent EWRAM vars,
`bin/oracle symbols gBattle_BG3_Y gBattle_BG3_X` = `0x2022e22`/`0x2022e20`,
correct addresses double-checked, ruling out possibility (a)'s "wrong
symbol" guess) across ticks 2180-2580: **both stay exactly 0 the entire
window, no exceptions**. `tools/probe/dump-task-and-sprite-callbacks.py`'s
same run scanned all 64 `gSprites[].callback` slots every tick and found
**zero** matches for `AnimShakeMonOrBattlePlatforms`/`_Step`
(`src/battle_anim_normal.c:853-916`, the shake's own sprite callback) -
the shake sprite (`gShakeMonOrPlatformSpriteTemplate`) never gets created
at all. This is the exact same root cause as DOUBLE_TEAM's missing clones
above: `Cmd_attackanimation` skips ROCK_SLIDE's entire `attackanimation`
step (rocks, `AnimTask_ShakeMon`'s mon-bounce, and this BG shake all
together) because `HITMARKER_NO_ANIMATIONS` is set for this save. Hand-
verified the shake's own write schedule would otherwise be trivially
RAM-visible if it ran (not a granularity problem, closing option (a) on
its own terms too): simulating `AnimShakeMonOrBattlePlatforms_Step`
(`velocity=7, shake_timer=1, shake_duration=11` -> internally
`sShakeDuration` is set from the `shake_timer` **arg**, a pret naming
quirk, not a bug) call-by-call gives the register value sequence `0, -7,
-7, 0, 0, -7, -7, 0, 0, -7, -7` across the sprite's 11 active calls (a
write lands every other call, alternating sign, each value held for 2
calls before the next write flips it), then a final 12th call restores it
to `0` and destroys the sprite - i.e. `gBattle_BG3_Y` would sit at `-7`
for 6 of those 11 calls, easily caught by 1-tick-granularity sampling, not
a single-tick blip. See §6 for the shared root-cause writeup.

## 5. Open questions for the S7 engine slice

1. ~~**DOUBLE_TEAM's BLDALPHA ramp mechanism is unidentified**~~ **RESOLVED
   (S7 worktree lane follow-up)** - it's the generic `General_StatsChange`/
   `InitStatsChangeAnimation` stat-arrow-banner effect
   (`src/battle_anim_utility_funcs.c:415-628`), not `Move_DOUBLE_TEAM`
   itself; see §4's correction block and §6 for the full root cause
   (`Move_DOUBLE_TEAM`'s own `attackanimation` never runs at all in this
   trace - Battle Scene is OFF for this save).
2. ~~**ROCK_SLIDE's `shake_mon_or_platform`/`gBattle_BG3_Y` shake was never
   observed in RAM**~~ **RESOLVED (S7 worktree lane follow-up)** - same
   root cause as item 1: `attackanimation` never runs for this save, so the
   shake sprite is never created. See §4's correction block and §6.
3. ~~**The falling-rocks visible window (2247-2267, ~20 ticks) is shorter
   than a naive spawn-cadence estimate**~~ **RESOLVED/REFRAMED (S7
   worktree lane follow-up)** - there is no falling-rocks window; the rocks
   never spawn (same root cause). The pixels this dossier attributed to
   rocks are the generic hit-flash (healthbox wobble + mon blink), which
   starts around tick 2246 regardless. See §4's correction block and §6.
4. **`DISPCNT` bit 15 clearing at tick 2065** (§4) wasn't tied to a source
   line - `AnimTask_DoubleTeam_Step`'s own cleanup only names
   `DISPCNT_BG1_ON`/`BG2_ON` (bits 9/10), which this session's probe never
   saw move at all. **RESOLVED (S7 worktree lane follow-up)**: this is
   `StatsChangeAnimation_Step3`'s own cleanup (case 3,
   `src/battle_anim_utility_funcs.c:613`:
   `SetGpuReg(REG_OFFSET_DISPCNT, GetGpuReg(REG_OFFSET_DISPCNT) ^
   DISPCNT_OBJWIN_ON)`), toggling off the `DISPCNT_OBJWIN_ON` bit
   `StatsChangeAnimation_Step1` set at the start of the same effect (§4) -
   unrelated to `AnimTask_DoubleTeam` as suspected, and now fully
   explained by item 1's resolution.
5. **DOUBLE_TEAM's `monbg`-vs-`CloneBattlerSpriteWithBlend` interaction**
   is documented at the level both mechanisms' own source shows (§3) but
   the exact BG-vs-OBJ compositing pipeline (how the attacker's real OBJ
   sprite, the BG-layer copy `monbg` creates, and the two additional
   `CloneBattlerSpriteWithBlend` OBJ clones all avoid double-rendering
   simultaneously) was not traced end-to-end - flagged as engine-slice-time
   work, not extraction-time.
6. **Needs-only, adjacent, not extracted**: BIND/DRAGON_BREATH/SANDSTORM
   (Onix's other 3 moves) and ENDEAVOR/BRICK_BREAK (Grovyle's other 2) all
   have their own move-animation scripts, untouched this session - same
   status as `battle-turn-notes.md` §8 risk 2's existing "unprobed" list,
   just noting the animation-asset angle specifically now exists as a
   template (this doc + its extractor) for whichever session picks one up.

## 6. Root cause (S7 worktree lane follow-up): this save has Battle Scene OFF

Questions 1-4 above all trace back to a single mechanism, RAM-confirmed
directly rather than inferred:

- `gHitMarker` (`0x2024280`) has bit 7 (`HITMARKER_NO_ANIMATIONS`,
  `include/constants/battle.h:184`) **set for the entire trace** (checked
  ticks 1900/2000/2200/2250, all read `1`).
- `gSaveBlock2Ptr->optionsBattleSceneOff` (a 1-bit field, bit 10 of the
  packed `u16` at offset `0x14` of `struct SaveBlock2`,
  `include/global.h:520-523`; `gSaveBlock2Ptr` itself a pointer,
  `0x3005d90`, one deref) is **`1` (TRUE)** at every sampled tick - i.e.
  this canonical anchor's underlying save (the GameFAQs SharkPortSave
  import, `battle-turn-notes.md` §1's own provenance note) has the in-game
  **Options -> Battle Scene** setting turned **OFF**.
- `battle_main.c:3084-3086` sets `HITMARKER_NO_ANIMATIONS` in `gHitMarker`
  at battle init whenever `optionsBattleSceneOff == TRUE` (and it isn't a
  link battle). `Cmd_attackanimation` (`battle_script_commands.c:1742-
  1747`) checks that bit and, if set, **substitutes a short generic pause
  (`BattleScript_Pausex20`) for the move's own custom attack-animation
  script** - for every move except `TRANSFORM`/`SUBSTITUTE`. This is why
  neither `Move_DOUBLE_TEAM` (clones) nor `Move_ROCK_SLIDE` (rocks + BG
  shake) ever actually run in this trace, despite both being read
  correctly from the script tables (§2) and both having genuine,
  unconditional script steps that *would* produce the RAM effects this
  dossier originally went looking for.
- Two effects still show up because they're **exempt** from this gate by
  design, not because the flag doesn't apply to them: `Cmd_playanimation`
  (`battle_script_commands.c:4009-4018`) special-cases
  `B_ANIM_STATS_CHANGE`/`B_ANIM_SNATCH_MOVE`/`B_ANIM_SUBSTITUTE_FADE` as
  always-play regardless of `HITMARKER_NO_ANIMATIONS` (the DOUBLE_TEAM
  BLDALPHA ramp, §4), and the generic hit-flash
  (`DoHitAnimHealthboxEffect`/`DoHitAnimBlinkSpriteEffect`) is dispatched
  by the battle script's own separate `hitanimation` command, which isn't
  gated by this flag at all (the ROCK_SLIDE "falling rocks" pixels, §4).
- Evidence tooling: `tools/probe/dump-ai-and-hitmarker.py` (new,
  committed) reads `gHitMarker`'s bit and `gSaveBlock2Ptr`'s option bit
  every tick (plus the AI-struct fields used in
  `battle-turn-notes.md`'s RNG-cluster resolution, same script); re-run
  twice, byte-identical output both times, confirmed against a fresh
  from-scratch scratch probe of the same two addresses before the script
  was written.

**Implication for a future engine slice**: this run's canonical anchor
save plays with move animations off, so any engine slice that faithfully
matches *this* trace's pixels should likewise skip custom move-animation
art (rocks/clones/shake) and only implement the generic, always-on effects
(hit-flash, HP bar, stat-change banner, the short `BattleScript_Pausex20`-
equivalent pause) - the custom move-animation asset extraction this doc's
§1-§3 banked is still correct and reusable groundwork (e.g. for a mode
that honors `optionsBattleSceneOff == FALSE`, or a future trace against a
save with Battle Scene ON), just not exercised by the specific committed
`battle1-turn1.json` trace this dossier's own ground-truth table is built
from.

## 7. Verification

`npm test` **444/444** (437 prior + 7 new pins, `tests/
moveAnimAssets.test.ts`), `npm run build` green. Both new extractor outputs
(`battle-anim-rocks.json`, `battle-move-anim-scripts.json`, `battle-move-
anim-tables.json`) re-run twice, byte-identical both times. Oracle traces
(the two densified windows + the register probe) were scratch runs, not
committed - re-derivable from `tools/compare/traces-groundtruth/
battle1-turn1.json`'s own committed `segments` plus this doc's own cited
tick ranges.

**S7 worktree lane follow-up session (RNG cluster / BG3_Y / BLDALPHA
resolution)**: `npm test` still green (see the top-level run log below);
no engine code touched, no new extractors, no new Tier-1 pins needed (pure
research). New committed probes:
`tools/probe/dump-task-and-sprite-callbacks.py` and
`tools/probe/dump-ai-and-hitmarker.py`, both re-run twice with
byte-identical output. All numeric claims in §4/§6's correction blocks
above are backed by a fresh, independent re-probe this session (not a
re-read of the prior session's own numbers) - see each correction block's
own "confirmed via" sentence for which probe.

## 8. CORRECTION BLOCK (S7 worktree lane, oracle v5 regen — Battle Scene ON): the animations actually run now

Per PROGRESS #76/#77 the oracle's canonical bootstrap moved to Battle Scene
ON (v5). §4/§6 above document that under v3 (Battle Scene OFF) neither
`Move_DOUBLE_TEAM` nor `Move_ROCK_SLIDE` ever actually ran — this section is
the re-verified **real** timeline now that `HITMARKER_NO_ANIMATIONS` and
`gSaveBlock2Ptr->optionsBattleSceneOff` are both confirmed **clear** for the
entire trace (re-probed via `dump-ai-and-hitmarker.py` against the new
`battle1-turn1.json`, twice, byte-identical — see `battle-turn-notes.md` §9
point 5). §1-§3's asset/decode work (script step lists, motion formulas) is
now genuinely exercised; §4/§6's account of what v3 showed is left
unmodified as the historical OFF-state record. All tick numbers below are
this session's new trace numbering (`battle-turn-notes.md` §9's tick-mapping
table); a scratch per-tick register probe (`BLDCNT`/`BLDALPHA`/`DISPCNT`/
`gBattle_BG3_Y`/`gBattle_BG3_X`, 0x04000050/0x04000052/0x04000000 +
`bin/oracle symbols gBattle_BG3_Y gBattle_BG3_X`) was run once against the
committed trace's own segments (deterministic replay, re-derivable, not
committed as a separate trace file).

**DOUBLE_TEAM's clone animation now genuinely plays, and resolves §4's old
open finding outright**: `BLDCNT=0x3F40`/`BLDALPHA` **flat** at `eva=12,
evb=8` for ticks **1964-2094 (130 ticks)** — this is exactly the script's
own literal `setalpha 12,8` opcode (§2), a fixed value with no ramp, and its
**130-tick duration matches §3's clone-motion-formula-derived prediction
almost exactly** (the old ~130-tick vs ~66-tick mismatch §4 flagged is fully
resolved: the 66-tick window it measured under v3 was never the clone at
all, it was only the always-on stat banner running alone). Immediately
after, the **stat-change banner runs separately**, ticks **2127-2193** (66
ticks): `BLDCNT=0x3F42`, `BLDALPHA` ramps `eva=0/evb=16` → `eva=10/evb=6`
(reached ~2150, held) → back to `eva=0/evb=16` at 2190, zero at 2193 — same
envelope shape and same exact register values `battle-turn-notes.md`'s old
§4 (this doc's) table already decoded from the v3 trace's exempt-from-the-
gate banner, just now running *after* a real clone animation instead of
being the only thing that ran. `DISPCNT` bit 15 (`DISPCNT_OBJWIN_ON`) sets
at clone start and clears at 2193 exactly as §4's `StatsChangeAnimation_
Step3` source citation predicts.

**ROCK_SLIDE's BG shake now genuinely fires** — resolves §4's other old
open finding (option (a) vs (b); this reconfirms (b) was right about the
*mechanism*, but the effect itself was never actually absent, only gated):
`gBattle_BG3_Y` alternates **0 / 0xFFF9 (-7 as s16)** across ticks
**~2348-2358** (~10 ticks, sampled at stride 2 — matches §3's hand-derived
`0,-7,-7,0,0,-7,-7,0,0,-7,-7` write schedule within this probe's sampling
granularity), landing exactly in the "silent" window between the damage
roll locking (tick 2337, `battle-turn-notes.md` §9) and the HP-bar drain
start (tick 2516) — i.e. inside `Move_ROCK_SLIDE`'s own `attackanimation`
window, as §2's decoded script predicted. This session did not additionally
re-derive the falling-rocks sprite-callback timing or the generic
hit-flash's exact sub-window boundaries within this now-much-longer
silent-to-bar-drain span (2337-2516, 179 ticks) — flagged as the natural
follow-up for whichever session next needs ROCK_SLIDE's precise rock-spawn
cadence under v5 (the §2/§3 script/formula groundwork is unchanged and
still the right starting point; only the *root cause that suppressed it*
has flipped).

**Implication for a future engine slice — reversed from §6's old
conclusion**: this run's canonical anchor now plays with move animations
**on**, so an engine slice faithfully matching *this* trace's pixels needs
the real custom move-animation art (rocks/clones/shake) this doc's §1-§3
banked, not just the generic always-on effects §6 previously said were
sufficient. §1's asset inventory (rocks.png, the decoded script step lists,
the per-tick motion/blend formulas) is load-bearing groundwork now, not just
banked-for-later.

**Verification**: `npm test` 454/454, `npm run build` green (see `battle-
turn-notes.md` §9's verification note — same commit). No new extractors or
Tier-1 pins this session (pure re-probing); the register/RNG claims above
are backed by this session's own fresh probe runs, re-run where noted for
determinism.

