# Idle-bounce PHASE misalignment attribution (side lane, 2026-07-31)

Bounded step per the assigned brief: attribute WHERE the app's idle-bounce
phase diverges from the OFF oracle for the canonical battle's turn-9
pre-move FIGHT-submenu idle window (`docs/rank5-off-ground-truth.md`'s
"menu-window phase" section; `turn9-quickattack-off.json` runs 177/233 with
all 56 misses in ticks 10818-10873). New files only — no `src/` edits.

**Verdict up front: (b).** The phase is inherited from an un-re-timed
upstream turn (turn 8's own `TURN8_MENU_REDRAW_DELAY`, an ON-pinned
animation-driven duration), telescopes down to that single constant for
turn 9's specific window via algebra proven below, and the exact same
"ON-fit constant -> `_OFF_`-suffixed re-fit sibling" pattern is **already
landing elsewhere in this program** (turn 10's own rank-5 slice 2, see
"Corroborating precedent" below) — this is not a new bug class, it is the
next lap of a fix already in motion. It closes automatically as the main
lane re-times turns 6-8 (and, for the turn-11/turn-12 sibling windows,
turns 10-11) the same way turn 10's content already was.

## 1. Oscillator mechanism (RAM-proven)

The bounce is Emerald's `DoBounceEffect`/`SpriteCB_BounceEffect`
(`battle_main.c`), already fully reproduced source-side by this run's own
`menuIdleBounce` (`src/engine/battleMenu.ts:820`, RAM-proven exact per that
function's own doc comment and per ISSUES #56 item 2's Q2 addendum for the
sibling arbitrary-intro case). Two driver sprites exist per settled action
menu: one for the player's own battler sprite (`BOUNCE_MON`, seed 192) and
one for the healthbox (`BOUNCE_HEALTHBOX`, seed 128), both advancing
`sSinIndex += 7` every tick, `y2 = Sin(sinIndex, 1)` (an amplitude-1 sine
lookup via the literal `GBA_SINE_TABLE_256`).

**RAM probe** (new script, `tools/probe/dump-turn9-idle-bounce-off.py`,
combining `dump-turn13-bounce-driver.py`'s driver-chain read —
`gBattleSpritesDataPtr` -> `healthBoxesData[0]` ->
`{battlerBounceSpriteId@+3, healthboxBounceSpriteId@+2}` ->
`gSprites[driverId]`'s own `sSinIndex@+46/sDelta@+48/sAmplitude@+50` —
with `dump-turn9-hitanim-off.py`'s hardcoded-address/OFF-bootstrap idiom):

```sh
python3 tools/run-mgba-probe.py <out.json> -- \
  tools/probe/dump-turn9-idle-bounce-off.py \
  tools/compare/traces/turn9-quickattack-off.json <out.json> <startTick> <endTick>
```

Widened to 9500-10880 to find the true (non-wrapped) reset instant, not just
its value mod 256:

- **Period**: `sinIndex` steps `+7` every tick, `amplitude=1`, `delta=7` —
  matches `menuIdleBounce`'s own hardcoded seeds/step exactly (RAM
  `onixDelta`/`healthboxDelta` read 7 at every live tick in the window,
  `onixAmplitude` reads 1). Since `gcd(7,256)=1` the raw index has a true
  256-tick period; the *visible* `y2 ∈ {0,1,2}` (offset `+1` in the app's
  own closed form) cycles through its small set of values on a much shorter
  effective beat, which is exactly why small (single-digit-to-tens-of-tick)
  absolute phase errors show up as the "9-16 tick, non-monotonic" alignment
  noise the ground-truth doc's live ON-vs-OFF cross-check already
  characterized, not as a huge visible jump.
- **Anchor (real, RAM-measured)**: both drivers are flat/dead
  (`onixSinIndex`/`healthboxSinIndex` both pinned at raw `0`, i.e. not yet
  created) through tick **9859** inclusive, then the FIRST live tick is
  **9860** with `onixSinIndex=199` (`=192+7`, i.e. `n=1`) and
  `healthboxSinIndex=135` (`=128+7`, i.e. `n=1`) — both drivers created
  simultaneously. Solving back: **the real reset instant (`n=0`, `sinIndex`
  = seed) is absolute tick 9859.** This is turn 9's own real,
  Scene-OFF, RAM-true "settled action menu redraw" instant (the same event
  `HandleInputChooseAction`'s setup call fires for).
- Values through the assigned 10818-10873 window (raw `y2`, no `+1` bias):
  `onixY2`/`healthboxY2` cycle between 0 and 1 the whole window (never
  reaching 2, i.e. `bounceSin` stays near its low plateau here) — consistent
  with a slowly-advancing index in this particular sub-range. Full per-tick
  table is in the probe's own JSON output (not committed, reproducible via
  the command above).
- The submenu-close/move-confirm at tick 10871 (`TURN9_QUICKATTACK_PRESS_TICK`,
  already a named app constant) destroys both drivers 2 ticks later
  (`onixSinIndex`/`delta`/`amplitude` all zero from tick 10873 on) — an
  independent confirmation this probe is reading the correct driver chain
  (matches the app's own `FIGHT_SUBMENU_...` close/freeze semantics).

## 2. App-side series

New script `tools/probe/analyze-turn9-idle-bounce-app-series.ts` imports the
**real, exported** production symbols the pre-press branch of
`drawTurn9FightSubmenuWindow` (`battleScene.ts:12294-12327`) actually calls
— `menuIdleBounce`, `turn5SitrusResettledBounceTick`,
`TURN9_REGIME4_TO_REGIME1_SHIFT`, `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` — and
evaluates them directly (no engine tick-drive needed; the call chain for
this window is a pure closed form, confirmed by reading `battleScene.ts`
line-by-line), so its output is exactly what the app renders, not a
paraphrase:

```sh
node --experimental-strip-types tools/probe/analyze-turn9-idle-bounce-app-series.ts
```

Output: `TURN9_REGIME4_TO_REGIME1_SHIFT=-2775`, and solving `menuIdleBounce`'s
own `n=0` condition through the full chain gives **the app's predicted real
absolute tick where the reset lands: t=10000** (vs. the raw
`TURN8_BIND_PRESS_TICK(9425) + TURN8_MENU_REDRAW_DELAY(572) = 9997`; the
extra +3 is `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`(2) plus `menuIdleBounce`'s own
established +1 render-lag convention — legitimate, unrelated to this bug).

**Offset: the app's predicted reset (t=10000) is 141 ticks LATER than the
real RAM reset (t=9859).** Directly diffing the app's own predicted
`(onixY2, healthboxY2)` series against the RAM ground truth for
10818-10870 (53 ticks, the pre-press portion of the assigned window):
**46/53 ticks mismatch** — fully accounts for the pixel-level "0/56 matched,
alternating between the two known bboxes (`44,49-99,110` battler /
`127,74-229,110` healthbox)" result `npm run compare --capture-range
10818:10873 --summary` reproduces fresh this session. The 7/53 accidental
matches are where the two phase-shifted periodic sequences happen to cross.

This offset direction is **consistent with**, not contradicting, the
ground-truth doc's own live ON-vs-OFF hardware comparison (which found
OFF's real content lands "later" than ON's by up to 9 ticks in sha
alignment): the app's own timing is still ON-shaped (built and pixel-fit
before this run's OFF work), so it should behave like a slow/late predictor
relative to real OFF hardware — which is exactly what both independent
comparisons (ON-hardware-vs-OFF-hardware, and App-vs-OFF-hardware) show,
each in their own frame.

## 3. Root-cause algebra: the whole regime chain collapses to ONE pair of constants for turn 9

`drawTurn9FightSubmenuWindow`'s pre-press branch computes (battleScene.ts,
symbols as named there):

```
bounceTick  = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
drawTurn9FieldBase -> drawTurn6FieldBase(t, bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT, ...)
  -> menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT))

turn5SitrusResettledBounceTick(x) = x - TURN5_SITRUS_MENU_REDRAW_TICK + (MENU_IDLE_BLANK_END_TICK + 1)
TURN9_REGIME4_TO_REGIME1_SHIFT   = TURN5_SITRUS_MENU_REDRAW_TICK - (TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY)
```

Substituting, `TURN5_SITRUS_MENU_REDRAW_TICK` **cancels exactly** (it is
added by the regime shift and subtracted right back out by
`turn5SitrusResettledBounceTick`):

```
finalTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT - (TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1)
```

So for turn 9's own pre-move window, **only two named constants matter**:
`TURN8_BIND_PRESS_TICK` (9425) and `TURN8_MENU_REDRAW_DELAY` (572) — every
other regime-chain constant (turn 5's, turn 6's, turn 7's own analogues) is
algebraic noise that cancels. `TURN8_BIND_PRESS_TICK` is a scripted
button-press tick (same segments replayed under both profiles — this
program's own established rule that press ticks land at the same absolute
tick regardless of Scene mode, `docs/rank5-off-ground-truth.md`'s
turn10-aerialace note). `TURN8_MENU_REDRAW_DELAY` is **not** — it is a
pure no-further-input, animation-resolution-gated duration (turn 8's BIND
hit-reaction + HP-drain + message-settle + menu-redraw), exactly the kind
of span Scene OFF shortens throughout this whole program.

Solving the real RAM reset (9859) back through the same chain:
`9859 - TURN8_BIND_PRESS_TICK(9425) = 434` — i.e. the real, OFF, "how long
after turn 8's BIND press until the menu re-settles" duration is **≈434
ticks**, vs. the ON-pinned constant's **572**. **`TURN8_MENU_REDRAW_DELAY`
is overcounted by ≈138 ticks under OFF** (572 → predicted ≈434), which is
the clean version of the 141-tick raw reset-instant delta above (the extra
~3 ticks are the legitimate `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`+render-lag
constants noted above, present in every turn, not part of this residual).

## 4. Corroborating precedent: turn 10 already got this exact fix, for CONTENT — not yet for BOUNCE

`battleScene.ts` (rank-5 slice 2, turn 10's own ROCK_SLIDE window) already
carries the identical pattern one turn downstream:

```
export const TURN10_ROCKSLIDE_MENU_REDRAW_DELAY = 730;       // ON-fit, kept (still consumed elsewhere)
const TURN10_OFF_ROCKSLIDE_MENU_REDRAW_DELAY = 623;           // OFF-fit sibling, -107 ticks
```

Same shape, same order of magnitude as this step's own -138-tick turn-8
finding. **But** `drawTurn10RockSlideAttack`'s own bounce line (battleScene.ts:12914)
still reads:

```
menuIdleBounce(turn5SitrusResettledBounceTick(frozenBounceTick + TURN10_REGIME5_TO_REGIME1_SHIFT))
```

— and `TURN10_REGIME5_TO_REGIME1_SHIFT` is still built from the **ON-fit**
`TURN9_QUICKATTACK_PRESS_TICK + TURN9_MENU_REDRAW_DELAY` (465, itself
un-re-timed), not the new `_OFF_` siblings. I.e. **even turn 10, whose own
visible content is already OFF-retimed, still renders an ON-shaped bounce
phase** — the regime-shift chain that feeds `menuIdleBounce` is a distinct
dependency the content-retiming slices haven't touched yet. This directly
predicts (without needing to re-probe turns 10-12, out of this step's
window per the brief) that turn 11's and turn 12's own menu-phase residuals
are the same mechanism, one turn further downstream each.

## 5. Decision: (b), not (a) or (c)

- **Not (a)** ("one upstream anchor constant fixes the whole class"):
  turns 9/11/12's own menu windows each bottom out at a **different** named
  constant (turn 9 -> `TURN8_MENU_REDRAW_DELAY`; turn 11's analogous chain
  -> `TURN10_ROCKSLIDE_PRESS_TICK`/`TURN10_ROCKSLIDE_MENU_REDRAW_DELAY` via
  `TURN11_REGIME6_TO_REGIME1_SHIFT`; turn 12's -> the turn-11 pair via
  `TURN12_REGIME7_TO_REGIME1_SHIFT`) — a **family** of per-turn constants,
  not one shared value. §4's evidence (turn 10 already has an `_OFF_`
  sibling for content but not for the regime chain) rules this out directly:
  fixing turn 8 alone would close turn 9's window but not turn 11/12's.
- **Verdict: (b)** ("depends on un-re-timed turns and closes automatically
  as later ranks retime them"). §3's algebra shows turn 9's phase is a
  pure function of turn 8's own `..._MENU_REDRAW_DELAY`; §4 shows the exact
  `_OFF_`-suffixed re-fit pattern needed is already the established fix
  shape for this program (turn 10's own content already has it). Whoever
  retimes turn 8's content for OFF (the natural next main-lane rank-5 slice
  after turns 10-12 land) gets an OFF-fit `TURN8_MENU_REDRAW_DELAY`
  essentially for free from the same oracle probe that pins turn 8's own
  message/HP-drain timing — **predicted value ≈434** (derived above,
  ±a few ticks for the small established render-lag constants; not
  independently RAM-probed against turn 8's own window this session, so
  stated as a strong prediction, not a proven pin). The regime-chain call
  sites (`TURN9_REGIME4_TO_REGIME1_SHIFT` and its turn-10/11/12 analogues)
  then need re-pointing at the new `_OFF_` siblings the same way content
  call sites already were.
- **Not (c)** (permanent, cycle-timing-like attribution, cf. ISSUES #5):
  the oscillator itself is proven exactly correct (RAM-confirmed period 7,
  amplitude 1, both drivers) — this is a phase-anchor bug in already-named,
  already-being-retimed upstream constants, with a measured, finite,
  closing-not-growing magnitude, not an unattributable hardware artifact.

## Reproduce

```sh
# RAM ground truth (writes JSON; SIGSEGV-after-write is the known benign teardown)
python3 tools/run-mgba-probe.py /tmp/turn9-idle-bounce-ram.json -- \
  tools/probe/dump-turn9-idle-bounce-off.py tools/compare/traces/turn9-quickattack-off.json \
  /tmp/turn9-idle-bounce-ram.json 9500 10880

# app-side predicted series + predicted reset tick
node --experimental-strip-types tools/probe/analyze-turn9-idle-bounce-app-series.ts

# pixel-level confirmation of the residual this doc explains
npm run compare -- tools/compare/traces/turn9-quickattack-off.json /tmp/idle-bounce-cmp \
  --capture-range 10818:10873 --summary
```

## Scope note

Per the brief, turns 10-12's own content is the concurrent main-lane
worker's window this step — not re-probed here. §4's precedent (turn 10's
content already OFF-fit, its bounce chain still not) is read from the
existing, already-committed `battleScene.ts` source, not a new probe
against turn 10/11/12 content. No `src/` file was touched or is proposed to
be touched this step (evidence-only, per the hard constraint) — the
predicted `TURN8_MENU_REDRAW_DELAY≈434` is named for the supervisor per the
brief's item 4, not implemented.
