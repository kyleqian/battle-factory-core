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

### ROCK_SLIDE window (2182-2281)

| ticks | phase | evidence |
|---|---|---|
| 2183-2184 | "ONIX used\nROCK SLIDE!" textbox opens | pixel diff spike (193857) at 2184 |
| 2185-2203 | message printing | small oscillating diffs |
| 2204-2246 | **silent** - crit roll (2206), damage-spread roll (2209, `gBattleMoveDamage` locks to 42), `typecalc`/`adjustnormaldamage`, and (per script order) the very start of `attackanimation` (`loadspritegfx`/`monbg`/`shake_mon_or_platform`/the first few rock spawns) | **exact 0 diff every tick**, 43 ticks - see the open finding below, this is longer than expected if rocks were visible from the first `createsprite` |
| 2247-2267 | **falling rocks visible** - repeating ~4-tick pattern (1.29M, 631k, 631k, 631k) matching the script's 2-tick rock-spawn cadence | large repeating diffs |
| 2268-2281 | **hit-flash blink tail** - diffs recur every 4 ticks (2268, 2272, 2276 - window ends at 2281 before a 4th toggle) | matches `hitFlash.spriteBlink`'s exact 4-tick toggle cadence (§3) - truncated by this window's own end (2281 = the dossier's own "HP-bar drain start" boundary, `battle-turn-notes.md` §2) |

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

## 5. Open questions for the S7 engine slice

1. **DOUBLE_TEAM's BLDALPHA ramp mechanism is unidentified** (§4) - the
   script's own `setalpha` is a single fixed value, but the oracle shows a
   smooth fade-in/hold/fade-out envelope. Whatever drives that (not
   `AnimTask_DoubleTeam` itself, per this session's read of its source) is
   needed before an engine slice can reproduce the visual timing exactly;
   the 66-tick oracle-observed envelope is the trustworthy number in the
   meantime, not the ~130-tick clone-motion formula.
2. **ROCK_SLIDE's `shake_mon_or_platform`/`gBattle_BG3_Y` shake was never
   observed in RAM** (§4) despite being a real, unconditional script step -
   needs a source-level trace (not RAM sampling) to confirm whether/how it
   actually manifests.
3. **The falling-rocks visible window (2247-2267, ~20 ticks) is shorter
   than a naive spawn-cadence estimate** (20 rocks x 2-tick spacing = 40+
   ticks just to spawn them all, before each rock's own 48-tick flight) -
   not reconciled this session; possibly later rocks' per-tick pixel
   contribution shrinks once the screen is already saturated with
   overlapping sprites (diminishing marginal diff), or the visible window
   genuinely continues a little past this session's own 2182-2281 probe
   boundary (which was set by the brief, tied to the dossier's existing
   accuracy-roll/bar-drain-start ticks, not to this animation's own actual
   end).
4. **`DISPCNT` bit 15 clearing at tick 2065** (§4) wasn't tied to a source
   line - `AnimTask_DoubleTeam_Step`'s own cleanup only names
   `DISPCNT_BG1_ON`/`BG2_ON` (bits 9/10), which this session's probe never
   saw move at all. Possibly an unrelated, coincidentally-timed change (a
   window/HUD element toggling as the message system resumes) rather than
   part of this move's own effect - not chased further.
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

## 6. Verification

`npm test` **444/444** (437 prior + 7 new pins, `tests/
moveAnimAssets.test.ts`), `npm run build` green. Both new extractor outputs
(`battle-anim-rocks.json`, `battle-move-anim-scripts.json`, `battle-move-
anim-tables.json`) re-run twice, byte-identical both times. Oracle traces
(the two densified windows + the register probe) were scratch runs, not
committed - re-derivable from `tools/compare/traces-groundtruth/
battle1-turn1.json`'s own committed `segments` plus this doc's own cited
tick ranges.
