# ISSUES #56 item 2 residual probe (2026-07-31, side lane)

Evidence-only step, NEW FILES ONLY per this step's brief (no production code,
no existing docs/traces/ledgers edited). One new probe script committed
(`tools/probe/dump-arbitrary-intro-bounce-driver.py`); all other artifacts
are scratch under `/tmp/issue56-probe/` (not committed, reproducible from the
commands below).

**Baselines reproduced fresh this session** (both match PROGRESS #775/#776
exactly, confirming nothing regressed underneath this probe):

```
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /tmp/issue56-probe/yoshi-full --summary
  -> 699/751 frames matched
npm run compare -- tools/compare/traces/factory-arbitrary-intro-magneton-off.json /tmp/issue56-probe/magneton-full --summary
  -> 703/751 frames matched
```

## Question 1 — frames 444 and 536 (YOSHI window)

**Command:**
```
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /tmp/issue56-probe/yoshi-444 --capture-range 440:450 --summary
  -> frame 444: DIFF 219px (0.57%) bbox=0,40-196,85 ssimMean=0.9797 ssimMin=0.0762; 10/11 matched
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /tmp/issue56-probe/yoshi-536 --capture-range 530:545 --summary
  -> frame 536: DIFF 394px (1.03%) bbox=134,88-239,99 ssimMean=0.9953 ssimMin=0.0361; 15/16 matched
```

Both frames are confirmed single-frame, isolated (all neighboring frames in
the captured range match exactly). Pixel-level (not just bbox) inspection
via a raw RGB diff of `app-00444.png`/`oracle-00444.png` and
`app-00536.png`/`oracle-00536.png` (PIL, numpy — ad hoc, not committed):

**Frame 444** (opponent affine-emerge materialize window, per
`docs/trainer-pic-off-window-scout.md`'s own prior characterization). Sample
diff pixels at row y=40:
```
(158,40): app=(255,181,247) oracle=(255,255,255)
(159,40): app=(255,181,247) oracle=(255,255,255)
(160,40): app=(255,255,255) oracle=(255,181,247)
(161,40): app=(255,255,255) oracle=(255,181,247)
```
The pink materialize-flash color `(255,181,247)` is IDENTICAL between app and
oracle — only its horizontal position differs, by exactly **2px** (app draws
it at x=158-159, oracle at x=160-161) at this one tick. This is not a color/
tint bug (ruling out a palette or blend-coefficient cause) — it is a small,
single-tick horizontal-position/sub-step misalignment in the affine-emerge
scan, consistent with round 10's own finding that the accumulator/
`MATERIALIZE_Y2_TABLE` schedule is "exactly right" in aggregate (12-tick
brute-force sweep, 0 missing-tint pixels) but leaves a residual at the
column-index granularity for isolated ticks. Not isolated to a specific
source call site this step — the draw site is `drawGeneratedOpponentRelease`
(`battleScene.ts:4329-4517`, per the existing `docs/trainer-pic-off-window-
scout.md` citation), but which sub-step within its affine-blend branch
produces a 1-column early/late sample at exactly this tick was not
determined in the time available.

**Frame 536** (one tick before player release begins at 537, per the same
existing characterization). Sample diff pixels at row y=88:
```
(155,88): app=(85,77,100)   oracle=(255,255,255)
(156,88): app=(85,77,100)   oracle=(255,255,255)
(157,88): app=(85,77,100)   oracle=(255,255,255)
(158,88): app=(255,255,255) oracle=(74,66,90)
(159,88): app=(255,255,255) oracle=(74,66,90)
(160,88): app=(255,255,255) oracle=(74,66,90)
(168,88): app=(85,77,100)   oracle=(74,66,90)
(169,88): app=(85,77,100)   oracle=(74,66,90)
```
Same shape as frame 444: a small dark icon block shifts horizontally by
~3px (app at x=155-157, oracle at x=158-160) and there is also a small shade
difference at the SAME position (168-169: app `(85,77,100)` vs oracle
`(74,66,90)`, a ~11-unit darker shade — likely a one-tick blend-progress
difference riding along with the position shift). This refines (does not
contradict) the existing doc's "shade-pair difference consistent with a
one-tick blend/flash offset" call: the evidence shows BOTH a small position
shift AND a small shade difference at the same tick, both single-tick,
non-persisting. Not isolated to a specific call site this step (candidate
per the existing doc: `drawBallIcons(..., {opponent:false, player:true})`,
un-verified further here).

**Verdict for Q1:** both remain genuine, reproducible, single-frame
residuals, each a small (2-3px) horizontal sub-step misalignment in a
per-tick animation table (materialize affine-emerge for 444, a status-icon
slide/blend for 536) rather than a wrong color, wrong duration, or dropped
frame. Neither recurs anywhere else in either fixture's own captured window
(confirmed: no other frame in the 440-450 or 530-545 ranges mismatches).
Given the tiny (<0.6-1.0%) per-frame pixel cost and single-tick scope, these
are lowest priority of the three questions to chase further; the concrete
next step for either is a RAM read of the specific sprite's OAM
`x`/`x2`/`affineParam` at the oracle-absolute frame (444+1171=1615,
536+1171=1707) using the same monkey-patched-`advance` technique this step
introduces (see Q2 below) to read the real sub-pixel/sub-step state directly
instead of inferring it from pixels.

## Question 2 — idle-menu-bounce family (~9-tick period, YOSHI tail + MAGNETON tail)

**The exact app function:** `menuIdleBounce` (`src/engine/battleMenu.ts:820`),
called through `actionMenuDisplayAtAge` (`battleMenu.ts:843-856`) from
`renderGeneratedBattleCommandPresentation` (`battleScene.ts:17011-17053`),
which reads its local clock from
`presentation.idleBounceElapsed` (`battleCommandPresentation.ts:103`), a
field `advanceBattleCommandPresentation` (`battleCommandPresentation.ts:325-
347`) increments once the `action-enter` phase ends (gated by
`BATTLE_COMMAND_ACTION_ENTER_DELAY = 6`, `battleCommandPresentation.ts:126`).

**Pixel-level characterization (both fixtures, this step):**
```
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /tmp/issue56-probe/yoshi-tail --capture-range 650:751 --summary
npm run compare -- tools/compare/traces/factory-arbitrary-intro-magneton-off.json /tmp/issue56-probe/magneton-full --summary
```
YOSHI: a large (6000-7700px) multi-frame diff at app-relative 678-685 (the
command-ready transition boundary itself — see the caveat below), then from
689 onward a clean **9-tick-period** alternation between two small, fixed
bboxes: `46,73-97,111` (556px, the player battler sprite region, x~46-97
matches RAM slot 6's own x=72) and `127,74-229,110` (1685px — **this is NOT
the opponent sprite**, see below). Pattern: 6 consecutive mismatched frames,
3 matched, repeat (e.g. 689-694 mismatch / 695-697 match / 698-703 mismatch
/ ...), holding to the end of the window (750).
MAGNETON: the identical **9-tick period**, same two bboxes shifted by a
constant (`41,64-102,111` / `127,74-229,110`), but split **7 mismatched / 2
matched** instead of YOSHI's 6/3 — same underlying oscillator, different
phase offset.

**Region identity, resolved via RAM (see below):** bbox `127,74-229,110`
looks like the opponent's own sprite region by x-coordinate alone, but a raw
sprite scan shows sprite slots 0/62/63 (x≈158/174/222 — all inside that
bbox) are the **player's own healthbox** (main sprite + the two HP-bar
sub-sprites `SpriteCB_HealthBar`/`SpriteCB_HealthBoxOther`, matching
`docs/battle-menu-idle-notes.md`'s own derivation) — Emerald's singles UI
puts the *player's* HP box on the screen's right side even though the
player's own battler sprite (slot 6, x≈72) is bottom-left. **Both
mismatching regions are driven by the SAME already-modeled player-side
`menuIdleBounce` mechanism** (`onixY2` for the battler, `healthboxY2` for the
box) — there is no second, unmodeled opponent-side bounce driver. (Checked
directly: a 64-slot RAM scan across the full mismatch window found no other
slot with small-amplitude {0,1,2}-cycling y2 besides 0/6/62/63.)

**RAM probe (new script, this step):**
`tools/probe/dump-arbitrary-intro-bounce-driver.py` drives
`oracle.battle_lab.BattleLab.prepare()` in-process (same class the HTTP
oracle service uses for `factoryLegal` requests) and monkey-patches
`oracle.advance` to record a 64-slot `gSprites[*].y2` scan on every frame in
a requested absolute-frame window — needed because these arbitrary-trainer
fixtures have no flat button-segments file to replay the way
`dump-party-icon-bounce.py`/`dump-destin-bench.py` do (their pre-battle route
is built internally by `BattleLab.prepare()`, not scripted button presses).

```
python3 tools/run-mgba-probe.py /tmp/issue56-probe/yoshi-bounce-ram2.json -- \
  python3 tools/probe/dump-arbitrary-intro-bounce-driver.py /tmp/issue56-probe/yoshi-bounce-ram2.json \
  tools/battle-lab/factory-arbitrary-intro-yoshi-off.json 1831 1931
  # absolute = app-relative + preCheckpointFrameOffset(1171, this fixture)

python3 tools/run-mgba-probe.py /tmp/issue56-probe/magneton-bounce-ram.json -- \
  python3 tools/probe/dump-arbitrary-intro-bounce-driver.py /tmp/issue56-probe/magneton-bounce-ram.json \
  tools/battle-lab/factory-arbitrary-intro-magneton-off.json 1838 1938
  # absolute = app-relative + preCheckpointFrameOffset(1178, this fixture)
```

Both wrote valid JSON (accepted teardown SIGSEGV per the harness convention).
Sprite slots 0/6/62/63 are the only slots showing small-amplitude
`y2` cycling in either fixture's window; slot 6 = battler (region A,
seed 192), slot 0/62/63 = healthbox (region B, seed 128) — the identical
slot roles `docs/battle-menu-idle-notes.md` found for the canonical ONIX
case, i.e. **sprite-slot allocation for the bounce driver is
species-independent** for these two data points.

**Direct fit against `menuIdleBounce`'s own closed form** (literal
`GBA_SINE_TABLE_256`/`bounceSin`/`onixSinIndex`/`healthboxSinIndex`
reproduced verbatim from `battleMenu.ts` in a throwaway analysis script — not
committed): for each fixture, searched integer shifts `n0` and scored
`onixY2(app_frame - n0) == real_slot6_y2` /
`healthboxY2(app_frame - n0) == real_slot0_y2` across the whole RAM-scanned
window.

| Fixture | Player lead | Best `n0` | Match rate |
| --- | --- | --- | --- |
| YOSHI | GRIMER | **611** | 158/166 (95.2%) |
| MAGNETON | DELCATTY | **550** | 135/144 (93.75%) |

Both fits are exact tick-for-tick except a handful of frames right at the
window's own leading edge (YOSHI 678-683, MAGNETON 689-695) where the model
predicts `healthboxY2=1` but the real RAM still reads 0 — explained by
`menuIdleBounce`'s own startup gate (`ramTick < MENU_BOUNCE_RAM_SETUP_TICK
=> {0,0}`), which my throwaway fit script did not reproduce (it applied the
raw sine formula unconditionally); the real function's own clamp almost
certainly closes this remaining gap, so the true match rate is likely
higher still. Excluding that edge, the fit is **tick-exact with zero
mismatches** for the rest of each window (frames 685-750 YOSHI, 697-750
MAGNETON).

**Verdict: the oscillator/curve itself is exactly right and
species-independent — proven against real RAM for two species, not just
pixels.** `menuIdleBounce` is NOT the bug. The entire residual is a single
**integer phase offset** between the app's local `idleBounceElapsed`-derived
clock and the real RAM tick the formula needs, and that offset differs by
**61 ticks** between the two species (611 vs 550). This is NOT itself proof
of a per-species bug in the bounce mechanism — `generatedPlayerReadyLagSpeciesFormula`
is already known (docs/intro-cry-shadow-evidence.md Part 1,
docs/onix-readylag-destin-bench-probes.md Probe 1) to shift the whole
command-ready handoff tick by a similar-magnitude, species-dependent amount
via `cryDurationTicks`, so most or all of the 61-tick gap between GRIMER and
DELCATTY is expected. What this step could **not** determine in the time
available: whether `n0` exactly equals the app's own real command-ready
handoff tick (in which case the mechanism is already fully correct and the
"9-tick-period" mismatches are a one-time reporting artifact of
`--capture-range`'s frame alignment, not a real bug) or whether there is a
residual CONSTANT offset left over on top of the correctly-varying
species term (a real, fixable few-tick bug, plausibly
`BATTLE_COMMAND_ACTION_ENTER_DELAY`'s flat, non-species-aware 6-tick value,
`battleCommandPresentation.ts:126`, which gates when `idleBounceElapsed`
starts incrementing but is never adjusted per species the way
`generatedPlayerReadyLag` is).

**What fact would decide it:** instrument `idleBounceElapsed`'s own start
app-relative-frame directly (e.g. a scratch unit test driving
`beginFactoryRoundBattleStartIntro` + `advanceFactoryRoundBattleStartIntro`
tick-by-tick for both the YOSHI and MAGNETON tuples, logging the frame where
`presentation.lifecycle.phase` first becomes `"action-menu"`) and compare
that directly to this step's own RAM-fitted `n0` per species. If the two
match exactly for both species, the mechanism needs no code change (the
9-tick-period pixel mismatches would then be explained by something else,
e.g. a `--capture-range`/render-lag reporting convention this step didn't
account for); if they differ by a residual CONSTANT (same delta for both
species), that constant is the real, fixable bug and
`BATTLE_COMMAND_ACTION_ENTER_DELAY` is the leading named candidate.

## Question 3 — canonical +6 route term (item 1 leftover)

**Standing evidence** (not re-derived, cited):
`docs/onix-readylag-destin-bench-probes.md` Probe 1 already proved this is
**ROUTE-specific, not species-specific**: a fresh synthetic `factoryLegal`
lab fixture with ONIX as player lead reproduces
`generatedPlayerReadyLagSpeciesFormula` exactly (0-tick residual); only the
canonical `interactive-generated-intro-off` route (which replays a real
captured button-driven route, `battle1-intro.json`, plus manually appended
wait/press segments, rather than `BattleLab.prepare()`'s internal
auto-navigating shortcut) needs the extra +6 (`GENERATED_PLAYER_READY_LAG`
=185 vs the formula's own 179 prediction). Leading candidate already named
there: the real route replays actual pre-battle frames a synthetic
`factoryLegal` construction skips, same shape as ISSUES #55's documented
real-vs-staged construction-timing gap.

**This step's own source check (new, falsifies one candidate mechanism).**
Searched `reference/pokeemerald/src/battle_main.c` for any `battleIndex`-0 or
"first battle"-conditioned intro-timing branch that could plausibly add a
flat +6:
```
grep -n "FIRST_BATTLE\|firstBattle\|IsFirstBattle" reference/pokeemerald/src/battle_main.c
```
Found exactly one hit, `BATTLE_TYPE_FIRST_BATTLE` (`battle_main.c:4078`,
inside `CanRunFromBattle`) — **ruled out**: this flag only gates the "the
battle can't be run from" (`B_MSG_DONT_LEAVE_BIRCH`) check when the player
tries to flee mid-battle (the Route 103 Birch rival-battle tutorial
mechanic), is set only by specific scripted battles elsewhere
(`battle_main.c:5104,5132`, unrelated to the Factory), and has nothing to do
with intro/send-out pacing or the `BeginBattleIntro` task chain. No other
`battleIndex`/"first"-conditioned branch was found in `battle_main.c`'s own
intro chain (`BeginBattleIntro`/`HandleTurnActionSelectionState`/the
`STRINGID_INTRO*` dispatch functions already cited in
`docs/trainer-pic-off-window-scout.md` §A) — the ROM's own intro state
machine has no source-level special-case for the canonical anchor's
`battleIndex 0` at all. This is consistent with (does not contradict) Probe
1's own leading candidate: since the ROM code path is identical either way,
the +6 is very unlikely to be a ROM behavioral difference and is more likely
either (a) a real ambient-frame-count difference from the route actually
being longer (ISSUES #55-shaped), or (b) a trace-alignment artifact in
`battle1-intro.json`'s own manually-appended wait/press segments (the same
class of bug slice 2 of `docs/trainer-pic-off-window-scout.md` found and
fixed for the YOSHI fixture's own ack-handoff — "the trace fixture's
scripted `A`-press placement was simply 4 frames too late").

**Not resolved this step** (time-boxed): distinguishing (a) from (b) needs
either an RNG/frame-count audit of `battle1-intro.json`'s own pre-`P`
frames against a fresh `factoryLegal` replay of the same tuple (checking for
an ambient-`Random()`-tick-style frame-count gap, ISSUES #55's own method),
or re-running slice 2's own dense-diff technique on `battle1-intro.json`'s
specific appended segments to check whether its own `A`-press (or the
`98`/`400`-frame waits around it) is timed to the tick against the real
oracle's own message-box landmarks the same way the YOSHI ack-handoff bug
was found. Both are named, concrete next steps, not vague.

## Question 2 follow-up — the decisive instrument (2026-07-31, main lane)

Ran the decisive step named above verbatim: `tests/issue56ActionMenuHandoffFrame.test.ts`
drives `beginFactoryRoundBattleStartIntro` + `advanceFactoryRoundBattleStartIntro`
tick-by-tick for both fixtures' real tuples (same construction as
`tools/compare/appTrace.ts`'s own stage functions — real `factoryLegal`
rental generation, not synthetic party injection) and logs the first
app-relative frame at which `battleCommandPresentation.lifecycle.phase`
reads `"action-menu"`.

| Fixture | App action-menu frame | RAM-fitted `n0` | Delta |
| --- | --- | --- | --- |
| YOSHI (GRIMER) | **678** | 611 | **+67** |
| MAGNETON (DELCATTY) | **689** | 550 | **+139** |

(678 and 689 independently corroborate this step's own earlier pixel
characterization above: YOSHI's "command-ready transition boundary" was
already located at app-relative 678-685, and MAGNETON's analogous edge at
689-695 — the instrument lands exactly on the first frame of each.)

**Verdict: the third branch of the decision rule.** The deltas are not
equal (67 vs 139, off by 72) and neither is 0 — so neither "no code
change needed" nor "a single flat constant explains both" holds. The
named leading suspect (`BATTLE_COMMAND_ACTION_ENTER_DELAY`'s flat 6-tick)
is independently ruled out on magnitude alone: it could only ever account
for up to 6 ticks, an order of magnitude short of either delta. Per this
doc's own stated decision rule, **no production fix follows from this
instrument** — banking the falsification with the numbers above rather
than guessing. All four mandated pins reconfirmed unchanged (no
production code touched): `factory-arbitrary-intro-yoshi-off` 699/751,
`factory-arbitrary-intro-magneton-off` 703/751,
`interactive-generated-intro-off` 715/715, `battle-command-generated-off`
128/128.

**What would explain a 72-tick delta-of-deltas (not chased further this
step, named for whoever picks this up next):** the RAM-fitted `n0` gap
between species (611−550=61) is itself close to the known
`generatedPlayerReadyLagSpeciesFormula` cry-duration-driven spread, i.e.
real hardware's bounce-zero point moves by species roughly as expected.
But the app's own action-menu-handoff gap between the same two fixtures
is only 689−678=11 ticks — nowhere near 61. That ~50-tick discrepancy in
the *inter-species gap itself* (not just the individual deltas) is the
concrete, falsifiable next question: it suggests the app's generated-intro
species ready-lag term is not fully reproducing the real per-species
spread for at least one of these two tuples, upstream of anything
`idleBounceElapsed`-related. Needs its own dedicated instrument (compare
each fixture's modeled `generatedPlayerReadyLag`-equivalent tick count
against a fresh RAM read of the real command-ready frame per fixture) —
out of scope for this step's brief, which was scoped to the idle-bounce
phase-offset question specifically.

## Summary for the supervisor

| Question | Verdict | Confidence |
| --- | --- | --- |
| Q1 (444/536) | Genuine single-tick, single-column (~2-3px) sub-step misalignment in a per-tick animation table; not a color/duration bug. Draw site named, exact sub-step not isolated. | Medium — pixel-proven, not RAM-proven |
| Q2 (idle-bounce) | **CLOSED, no fix.** `menuIdleBounce` itself is proven exactly correct (RAM-verified, 2 species, tick-exact outside a startup edge). The decisive instrument (below) found app-vs-`n0` deltas of +67 (YOSHI) and +139 (MAGNETON) — unequal, falsifying the flat-constant hypothesis (`BATTLE_COMMAND_ACTION_ENTER_DELAY` ruled out on magnitude alone). No production fix follows; a new, narrower question (inter-species ready-lag gap, 11 app ticks vs 61 RAM ticks) is named for whoever picks this up next. | High — RAM-proven mechanism, decisively falsified fix hypothesis |
| Q3 (+6 route term) | Confirmed route-specific (not species-specific) per existing Probe 1. One candidate mechanism (ROM `BATTLE_TYPE_FIRST_BATTLE` branch) checked and falsified this step. Real-vs-staged frame-count gap (ISSUES #55-shaped) vs a `battle1-intro.json` trace-alignment bug remain the two live candidates, undistinguished. | Low — two candidates, no discriminating evidence yet |

Original round: no production code, existing docs, or existing traces were
modified; new files were this doc and
`tools/probe/dump-arbitrary-intro-bounce-driver.py`. Follow-up round
(2026-07-31, main lane, above): this doc extended with the decisive
instrument's result; new committed file
`tests/issue56ActionMenuHandoffFrame.test.ts`; still no other production
code or existing traces modified.
