# Turn 3 residual probe notes (S7 bounded worker session, RAM/oracle probing only — no engine changes)

Root-cause probe for the two excluded-tick residual families named in the
brief: `docs/battle-turn-notes.md` §20's shake asymmetry (family A) and §19's
two menu-idle ticks (family B). Both instruments named in the brief were run
this session. **No `src/engine/` changes** — this file is the mechanism
report; the supervisor briefs any fix separately.

Methodology note: both probes reuse `tools/probe/ram-probe.py` (the generic
tool, no new script needed) via three new spec files under
`tools/probe/specs/` (`turn2-endeavor-shake-power.json`,
`turn3-endeavor-shake-power.json`, `turn3-menu-bounce-watch.json`), each
embedding the relevant committed trace's own `segments` verbatim (`turn2-
endeavor-drain.json`/`turn3-endeavor.json`/`turn3-menu.json`) plus a `watch`
list and `startTick`. Outputs committed under `src/data/gen/` (three files,
each **twice-run byte-identical** — diffed after a second independent
interpreter run, 0 bytes different in all three). Per this run's own
established validation discipline, family A's probe was run against turn 2's
**known-good** window first (already-modeled symmetric ±3, RAM-confirmed by
S7 slice E1 before this session) before trusting the turn-3 numbers.

## Family A: the shake asymmetry — MECHANISM FOUND, formula derived and verified against BOTH turns

### Headline

`AnimTask_ShakeTargetBasedOnMovePowerOrDmg`'s amplitude input
(`gAnimMovePower`, already RAM-confirmed non-obvious by S7 slice E1) is
itself sourced from `gBattleMovePower` — a global that is **only ever
written inside `CalculateBaseDamage`** (`reference/pokeemerald/src/
pokemon.c:3120/3122`) and is **never reset between moves**. `EFFECT_ENDEAVOR`
does not call `CalculateBaseDamage` at all (already established in
`docs/battle-turn-notes.md` §12: "does NOT exercise `calculateBaseDamage` at
all"; it uses `setdamagetohealthdifference` instead), so every time ENDEAVOR
fires, `gBattleMovePower` still holds whatever the **last power-calculated
move** left there — not ENDEAVOR's own listed power (0) and not a fixed
placeholder. This one is a real, source-provable stale-global bug in the
original game, faithfully reproducible, not a guess:

- **Turn 2's ENDEAVOR** (Grovyle) is preceded by **turn 1's ROCK_SLIDE**
  (Onix, `.power = 75`, `reference/pokeemerald/src/data/battle_moves.h:2047`)
  as the last move to run `CalculateBaseDamage`. RAM-probed this session
  (`src/data/gen/turn2-endeavor-shake-power-probe.json`, ticks 2940-3132,
  spanning both shake rounds): **`gBattleMovePower` == `gAnimMovePower` ==
  75 for the ENTIRE window**, never once different between the two globals.
- **Turn 3's ENDEAVOR** (Grovyle again) is preceded by **turn 2's
  DRAGON_BREATH** (Onix, `.power = 60`, `battle_moves.h:2931`) as the last
  power-calculated move (ROCK_SLIDE doesn't run again until turn 3's own
  second half, well after this window). RAM-probed this session
  (`src/data/gen/turn3-endeavor-shake-power-probe.json`, ticks 3885-4086,
  spanning both shake rounds and the `gCurrentMove` transitions to ENDEAVOR
  (3897) and later ROCK_SLIDE (4073)): **`gBattleMovePower` ==
  `gAnimMovePower` == 60 for the ENTIRE window** — NOT 75, and nowhere near
  ENDEAVOR's own listed power of 0.

`gAnimMoveDmg` was also watched in both probes as a sanity check that the
shake task isn't secretly reading the damage-based branch instead: it holds
16 (turn 2) / 13 (turn 3) throughout — a different value from `gAnimMovePower`
in both windows, confirming the power-based branch (already established) is
really what's live.

### The formula, source-derived and RAM-verified (not curve-fit)

`reference/pokeemerald/src/battle_anim_mon_movement.c:975-998` (`AnimTask_
ShakeTargetBasedOnMovePowerOrDmg`'s setup):

```c
data[15] = clamp(gAnimMovePower / 12, 1, 16);   // amplitude
data[14] = data[15] / 2;                          // downStep
data[13] = data[14] + (data[15] & 1);             // upStep
```

...and the step function (`:1011-1039`) toggles `data[12]` each round-trip
(2 RAM ticks per toggle, matching `ENDEAVOR_SHAKE_STEP`'s own already-
established cadence), writing **`+data[13]` (upStep) on the odd toggle, then
`-data[14]` (downStep) on the even toggle**, repeating — i.e. the sequence is
always `+upStep, -downStep, +upStep, -downStep, ...`, never symmetric by
construction; turn 2's own observed ±3 was a **coincidence** of `75/12=6`
being even (`downStep=upStep=3`), not evidence the mechanism is symmetric in
general.

Plugging in the two RAM-confirmed power values:

| turn | power (stale, prior move's own) | amplitude (`power//12`, clamp 1-16) | downStep | upStep | sequence |
|---|---|---|---|---|---|
| 2 | 75 (ROCK_SLIDE) | 6 | 3 | 3 | `+3,-3,+3,-3,...` (symmetric, matches existing `ENDEAVOR_SHAKE_STEP`) |
| 3 | 60 (DRAGON_BREATH) | 5 | 2 | 3 | `+3,-2,+3,-2,...` (matches the brief's own observed asymmetry exactly) |

**Verified computationally this session** (not just by hand): replaying
`ENDEAVOR_SHAKE_ROUND_RAM_OFFSET`/`ENDEAVOR_SHAKE_RENDER_LAG`'s own already-
committed timing (unchanged) with `downStep=2/upStep=3` instead of the
current literal `ENDEAVOR_SHAKE_STEP=3` symmetric constant reproduces **the
exact 12 excluded ticks and no others** — `3958,3959,3962,3963,3966,3967,
3984,3985,3988,3989,3992,3993` — as the only ticks where the two formulas
diverge (script run inline this session, not committed — trivial closed-form
replay, see the tick list match below). Feeding `power=75` through the same
derived formula for turn 2's own window reproduces the **existing, already-
green** `ENDEAVOR_SHAKE_STEP=3` behavior with **zero** differences across the
whole window — i.e. the derived formula is a strict generalization, not a
turn-3-only special case.

### Verdict: MECHANISM FOUND, formula derived, cross-verified against both turns' own RAM

The corrective rule (not applied — out of scope this session): replace the
literal `ENDEAVOR_SHAKE_STEP=3` with a `downStep`/`upStep` pair computed from
`gBattleMovePower`'s own RAM-confirmed value at ENDEAVOR-launch time (75 for
turn 2's instance, 60 for turn 3's instance — i.e. a new anchor constant
analogous to `anchorPlayerAfterTurn3Hp`, sourced from the PRECEDING move's
own `.power` field, not ENDEAVOR's). The render-lag convention already
encoded (`ENDEAVOR_SHAKE_RENDER_LAG=2`, i.e. render = RAM+2) is untouched by
this finding — the amplitude/step values are fixed once per shake-task
instantiation (at the move's own `attackanimation` script command, well
before the shake window itself begins), not read tick-by-tick, so there was
nothing render-lag-sensitive to re-pin here.

## Family B: the two menu-idle ticks — divergence precisely localized, NOT a constant-offset bug (ruled out by direct test)

### What was probed

`tools/probe/specs/turn3-menu-bounce-watch.json` replays `turn3-menu.json`'s
own committed button script verbatim (ends tick 3896, the trace's own
boundary) watching `gSprites[6]` (ONIX's own battler sprite, the `BOUNCE_MON`
driver target) and `gSprites[0]`/`gSprites[62]`/`gSprites[63]` (the player
healthbox MAIN sprite plus its two mirror sprites, the `BOUNCE_HEALTHBOX`
driver targets) — same slot assignments `menu-idle-bounce.json`/`menu-player-
healthbox.json` already established and this session re-confirmed are still
current at turn 3 (`onixCallback`/`healthboxMainCallback` read stable
`0x08007429` throughout 3870-3896, i.e. neither sprite was destroyed/recreated
between turns). Output: `src/data/gen/turn3-menu-bounce-probe.json`.

### The render-lag rule, pinned from the data (not assumed)

`menuIdleBounce`'s own doc already claims "screenTick T shows RAM tick T-1's
sprite state" for this specific mechanism (a real GBA OAM-double-buffering
artifact, not a DMA-copy lag). This session **confirmed that rule is still
the correct one for turn 3's own window** (not the `RAM+2` lag that applies
to the unrelated ENDEAVOR-shake mechanism above) by direct cross-check: the
RAM-probed sequence, shifted by exactly this `+1` rule, reproduces the
**currently-passing 24/26 ticks** (3871-3896 minus the 2 named residuals) of
the ALREADY-VERIFIED `turn3-menu.json` render output bit-for-bit, with
mismatches landing at precisely 3879 and 3888 and nowhere else — the same
two ticks the trace already excludes. This is strong internal validation
that both the probe's addressing and the `+1` mapping are correct; had
either been wrong, the mismatch pattern would not line up this cleanly with
the pre-existing, independently-verified trace result.

### The actual divergence, per tick

| trace tick T | region | real (RAM tick T-1) | `turn3SubmenuBounceTick`+`menuIdleBounce` model | 
|---|---|---|---|
| 3878 | onix | 1 | 1 (match) |
| **3879** | **onix** | **1** | **0 (MISMATCH — model transitions 1 tick early)** |
| 3880 | onix | 0 | 0 (match — model already "caught up") |
| 3887 | healthbox | 1 | 1 (match) |
| **3888** | **healthbox** | **1** | **0 (MISMATCH — model transitions 1 tick early)** |
| 3889 | healthbox | 0 | 0 (match) |

At both residuals the **model predicts the sine-table step's NEXT value one
tick before the real hardware actually shows it** — the real bounce sprite's
own `y2` field (per `SpriteCB_BounceEffect`, `battle_main.c:2967-2979`) is
still holding the prior plateau value for one extra tick relative to what
`turn3SubmenuBounceTick`'s composed anchor (`dragonBreathResettledBounceTick`
- `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`) predicts.

### Ruled out: a systematic 1-tick offset fix — tested directly, does NOT work

The obvious hypothesis (the whole `turn3SubmenuBounceTick` chain is off by a
constant 1 tick for this branch) was tested computationally this session by
recomputing every tick 3871-3896 with `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
reduced by 1 (shift=1 instead of 2). Result: it does **not** fix either named
residual (3879 and 3888 **both still mismatch** under the shifted formula —
the transition just moves earlier in the underlying `n` sequence, landing on
a different-but-still-wrong value) and it **introduces three new mismatches**
(3878, 3887, 3896) that the current (unshifted) formula gets right. A
uniform tick-shift cannot fix both residuals simultaneously without breaking
currently-passing ticks — this is conclusively **not** a constant-offset bug.

### Verdict: divergence precisely localized, mechanism NOT fully pinned — needs the raw bouncer-sprite state, not just the resultant y2

This session identified **exactly which RAM value diverges and by how much**
(the resultant `y2` field is one plateau-step "ahead" of real hardware at
exactly 2 ticks, isolated, both immediately following the same-tick's own
step transition) and **conclusively ruled out** the natural constant-offset
explanation. It did **not** fully root-cause WHY those 2 specific ticks (out
of the ~250 in this window) are special: the resultant `y2` alone can't
distinguish "the closed-form phase mapping is subtly wrong at a table
boundary" from "the real invisible bouncer sprite's own `sSinIndex`/`data[]`
accumulator (not itself probed this session — its own sprite slot is
allocated dynamically via `CreateInvisibleSpriteWithCallback` and identified
only indirectly through `gBattleSpritesDataPtr->healthBoxesData[battler].
{healthbox,battler}BounceSpriteId}`, a further pointer-chase this session's
probe didn't reach) ticks on a slightly different cadence than the resultant
sprite it drives, e.g. an update-order artifact (whether the invisible
sprite's own callback runs before or after the frame's OAM buffer is built,
for these 2 specific frames only). This is the same **previously-uncatalogued
"hardware quirk at a bounce extremum" class** `docs/battle-turn-notes.md`
§19 already named by analogy to ticks 3337/3465/3721 elsewhere in this
dossier (also never root-caused) — this session adds hard evidence it is a
real, isolated, non-systematic divergence rather than a modeling bug, but a
full explanation needs the bouncer sprite's own raw `data[]` words, not just
its target's resultant `y2`.

**Next instrument for whoever picks this up**: resolve `gBattleSpritesDataPtr`
(deref) -> `healthBoxesData[0]` struct -> `battlerBounceSpriteId`/
`healthboxBounceSpriteId` fields (offsets not extracted this session — the
struct isn't in this dossier's committed symbol notes yet) to find the two
invisible bouncer sprites' own slot indices, then watch their own `data[0]`
(`sSinIndex`) directly at ticks 3877-3889 RAM-side. If `sSinIndex`'s own
`+=7`-per-tick progression shows a genuine 1-tick stall/skip at exactly this
point (as opposed to the resultant `y2` merely reading a table boundary
differently), that would fully close this out as a corrective single-tick
data table (the `BALL_SPIN_TABLE`/`MATERIALIZE_Y2_TABLE` precedent this run
already uses for exactly this residual class), not a formula change.

## Summary for the supervisor

- **Family A (shake asymmetry): SOLVED.** Root cause is a genuine stale-global
  read in the original game (`gBattleMovePower` not reset between moves,
  `EFFECT_ENDEAVOR` never writes it), RAM-confirmed byte-exact at 75 (turn 2)
  and 60 (turn 3), and the standard `AnimTask_ShakeTargetBasedOnMovePowerOrDmg`
  amplitude formula (`downStep=amplitude/2`, `upStep=downStep+(amplitude&1)`)
  reproduces turn 3's exact 12-tick excluded set AND turn 2's existing
  symmetric behavior from the same formula, verified computationally this
  session. Ready for a follow-up engine slice (add the `downStep`/`upStep`
  pair + the preceding-move-power anchor; no further probing needed).
- **Family B (menu-idle ticks): partially pinned, needs different/deeper
  tooling.** The divergence is real, isolated to exactly the 2 named ticks,
  and conclusively NOT a constant-offset bug in the composed bounce-tick
  formula (tested and ruled out this session) — but the full mechanism needs
  the invisible bouncer sprite's own task-like state (a further pointer-chase
  through `gBattleSpritesDataPtr`, not reached this session), not just its
  target's resultant `y2` (which is all this session's probe reached). A
  follow-up session should resolve that struct's offsets first.

## Verification

`npm test` unaffected (docs/data/probe files only, `src/engine/` untouched) —
re-ran to confirm no regression. `npm run build` green. No `tools/compare/`
trace changed; the two families' excluded-tick counts are unchanged from
`docs/battle-turn-notes.md` §19/§20's own committed state.
