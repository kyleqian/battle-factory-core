# Turn5/turn6 FIGHT-reopen bounce-tick recalibration probe (ISSUES #97-B)

**2026-08-17, bounded SIDE worker.** Executes ISSUES #97-B's banked forward
path option 2 ("treat it as a live calibration problem"): the bisect/regression
framing is closed (a prior rung disproved the assumed-good `c5563c72` ref);
this step instead RAM-probes the CURRENT Battle Scene OFF oracle
(`127.0.0.1:8014`) across both mismatch windows and compares it against the
app's own live formulas, run through `npx tsx`/`node --experimental-strip-types`
imports (no `src/` edit). No fix is attempted here.

## 0. Repro (both headline counts reconfirmed fresh)

```
npm run compare -- turn5-action-off --summary
  -> 1/32 frames matched, first mismatch frame 5927, bbox=127,74-229,110
     (constant through 5930, then grows to 127,74-229,111 at 5931 - the
     healthbox-only bbox widening to also touch the sprite region)

npm run compare -- turn6-reopen-off --summary
  -> 11/46 frames matched, first mismatch frame 7305, bbox=44,49-99,110
     (the ONIX sprite region only - no healthbox rows)
  -> frame 7306 fully MATCHES; 7307-7316 mismatch on bbox=127,74-229,110
     (healthbox only); 7317 fully MATCHES again; 7318+ resumes mismatching.

Control: turn5-reset-off (captureFrames 5300-5555, ends well before either
window) is untouched by this probe - not re-run this session (its own
score is not in question; see §3d for why the diagnosis below cannot
touch its code path).
```

## 1. Oracle RAM ground truth (both windows, one replay)

Probe: `tools/probe/dump-turn5-6-reopen-bounce-driver.py`, run via
`python3 tools/run-mgba-probe.py <out> -- tools/probe/dump-turn5-6-reopen-bounce-driver.py <out>`.
Bootstrap `oracle/bootstrap/factory-battle-scene-off.json` (matches this
lane's oracle profile), button script = `turn5-action-off.json`'s own
76 segments (confirmed byte-identical across `turn5-action-off.json`,
`turn6-reopen-off.json`, and `turn5-reset-off.json` - only `captureFrames`
differs between the three). Reads `gSprites[gBattlerSpriteIds[0]].y2` /
`gSprites[gHealthboxSpriteIds[0]].y2` directly (RAM-ground-truth Y2, not
inferred from pixels), plus each side's `DoBounceEffect` driver
`sSinIndex`, via `gBattleSpritesDataPtr` - the same addressing scheme
`dump-turn13-bounce-driver.py` already established one turn later in this
same canonical battle. Receipt: `src/data/gen/turn5-6-reopen-bounce-probe.json`
(93 rows: 41 for window A, 52 for window B).

**Window A (turn5-action-off), ticks 5920-5960** (`onixSin`/`hbSin` step
+7/tick on a running `DoBounceEffect` task, seeds 192/128):

| tick | onixY2 | hbY2 | onixSin | hbSin | note |
|---|---|---|---|---|---|
| 5920-5926 | 1 | 1 | 79..121 | 15..57 | steady +7/tick |
| **5927** | 1 | 1 | 128 | 64 | **first mismatch frame** |
| 5928 | 1 | 1 | 128 | 64 | **held** (sinIndex unchanged) |
| 5929 | 1 | 1 | 128 | 64 | **held** (sinIndex unchanged) |
| 5930 | 1 | 2 | 135 | 71 | resumes +7/tick |
| 5931 | 0 | 1 | 142 | 78 | +7/tick continues |
| 5932-5939 | 0 | 1 | ...191 | ...127 | +7/tick |
| 5940-5947 | 0 | 0 | ...254 | ...190 | +7/tick |
| 5948-5959 | 0→1 | 0→1 | wraps at 256 | ... | +7/tick, no further holds |

The driver's `sSinIndex` for BOTH sprites is **held constant for exactly 3
ticks** (5927, 5928, 5929) at the reopen, then resumes advancing by +7/tick
with no further gap. This is the real-hardware "reopen press" registering.

**Window B (turn6-reopen-off), ticks 7300-7351:**

| tick | onixY2 | hbY2 | onixSin | hbSin | note |
|---|---|---|---|---|---|
| 7300-7304 | 1 | 0 | 30..58 | 222..250 | steady +7/tick (still turn 5's own carried task - see §2b) |
| **7305** | 1 | 0 | 65 | 1 | **first mismatch frame** |
| 7306-7312 | 1 | 1 | 72..114 | 8..50 | +7/tick, no hold yet |
| 7313 | 1 | 1 | 121 | 57 | turn 6's own real reopen-press tick |
| 7314 | 1 | 1 | 121 | 57 | **held** (sinIndex unchanged) |
| 7315 | 1 | 1 | 121 | 57 | **held** (sinIndex unchanged) |
| 7316 | 1 | 1 | 128 | 64 | resumes +7/tick |
| 7317-7346 | ... | ... | ... | ... | +7/tick |
| 7347-7351 | 0 | 0 | 0 | 0 | driver torn down (kickoff text takes over) |

**New fact not in the ISSUES #97 mechanism paragraph:** the SAME 3-tick
sinIndex hold (2 ticks longer than a naive 1-tick model) recurs at turn 6's
own reopen press (7313-7315), shaped identically to turn 5's own hold
(5927-5929). This is a real, repeatable hardware mechanic - not a one-off
turn-5 quirk - and it was previously undocumented (the #97 mechanism
paragraph only described turn 5's instance and only inferred it from a
single already-known tick, 5927).

## 2. App-side reconstruction (live formulas via import, no `src/` edit)

Script: `tools/probe/analyze-turn5-6-reopen-bounce-app-series.ts`
(`node --experimental-strip-types tools/probe/analyze-turn5-6-reopen-bounce-app-series.ts`).
Drives the REAL engine (`createInitialState`/`tick` from `core.ts`, the
same modules `tools/compare/appTrace.ts` uses) through the trace's own
76-segment script, and at each target tick reads the REAL runtime
`state.battleScene.{fightSubmenu,latestCompletedCommandHandoff}` directly
- no internal state is invented. Receipt:
`src/data/gen/turn5-6-reopen-bounce-app-series.json`.

### 2a. Window A - FULLY PINNED (ticks 5927-5931, the pre-reveal DMA-wait span)

Source-confirmed valid domain: `drawFightSubmenuWindow`'s `revealTick =
TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY` = `5927 + 5 = 5932`
(`battleScene.ts:8505-8513`), so `drawActionMenuIdleWindow`'s `turn5Active`
dispatch (`battleScene.ts:8307-8310`, the ISSUES #97 mechanism paragraph's
own subject) is the exact live code for `t` in `[5927, 5931]`.
`sm.openElapsed` reads 4887 at runtime -> `TICK0 + 4887 = 5927`, confirming
`turn5ReopenPressTick` really is 5927 (matches the doc's own citation).

| tick | app branch | app bounceTick | app (onixY2,hbY2) | oracle (onixY2,hbY2) | onix match | hb match |
|---|---|---|---|---|---|---|
| 5927 | `legacy(pressTick)` | 2089 | (1, 0) | (1, 1) | YES | **NO (off by +1)** |
| 5928 | `submenu(shifted)` | 2088 | (1, 0) | (1, 1) | YES | **NO (off by +1)** |
| 5929 | `submenu(shifted)` | 2089 | (1, 0) | (1, 1) | YES | **NO (off by +1)** |
| 5930 | `submenu(shifted)` | 2090 | (1, 0) | (1, 2) | YES | **NO (off by +2)** |
| 5931 | `submenu(shifted)` | 2091 | (1, 0) | (0, 1) | NO | NO |

This is a clean, complete, hypothesis-free match to the compare tool's own
report: bbox stays `127,74-229,110` (healthbox-only) through 5930, then
widens to also cover the sprite row at 5931 - exactly where onixY2 ALSO
starts mismatching in this table.

**Cause, precisely:** the app's `t === turn5ReopenPressTick` special case
(`battleScene.ts:8307-8310`) freezes the bounce formula for exactly **one**
tick (5927 only, using the unshifted "legacy" formula), then immediately
resumes the `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (`=2`)-corrected "submenu"
formula from 5928 onward. But §1's RAM data shows the real driver is held
for **three** ticks (5927-5929). Because `menuIdleBounce`'s sine-table
plateaus are wide, the app's own bounceTick sequence (2089, 2088, 2089,
2090, 2091...) happens to revisit the same output for 5927-5930 anyway
(masking the 1-vs-3-tick discrepancy for onixY2, which shares a wide
plateau there) - but healthboxY2's plateau boundary sits right at this
span, so the healthbox output visibly falls behind starting immediately at
5927 and grows to a 2-unit miss by 5930, then a full extra step by 5931
once onixY2's own plateau boundary is crossed too.

### 2b. Window B - PARTIALLY PINNED (RAM ground truth solid; exact live app formula NOT recovered this session)

`state.battleScene.fightSubmenu` at ticks 7300-7312 reads
`openElapsed=4887, confirmElapsed=4919` - i.e. **still turn 5's own
`FightSubmenuState`**, unchanged since turn 5's real confirm
(`TICK0+4919=5959`). Turn 6's own fresh reopen (`openElapsed=6273` ->
`TICK0+6273=7313`) only registers at the SAME tick §1's RAM hold begins.
This means the live render dispatch for 7300-7312 is NOT
`drawTurn6FightSubmenuWindow` (this script's own naive `turn6Branch`
column, which unconditionally modeled that function, is INVALID for these
ticks and is not reported here) - it is still some turn-5-descended
window (almost certainly `drawTurn5RockSlideWindow`'s settled tail,
`battleScene.ts:14781-14820`, whose unconditional
`drawTurn6FieldBase(fb, t, latestCompletedCommandHandoff)` call at line
14788 ultimately still lands in `menuIdleBounce(turn5SitrusResettledBounceTick(...))`
- but exactly which tick value feeds that call was not conclusively
recovered this session).

Three candidate formulas were tested against the oracle and each ruled out
by the fully-matching frame 7306 (predicted (1,1) is required there; every
candidate below predicts something else):

| candidate | 7305 predicted | 7306 predicted | 7306 actual (must match) | verdict |
|---|---|---|---|---|
| `menuIdleBounce(turn5SitrusResettledBounceTick(t))` (live `t`) | (0,0) | (1,0) | (1,1) | ruled out |
| same, `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` | (0,0) | (0,0) | (1,1) | ruled out |
| turn-5 kickoff-frozen (`bounceTick` pinned at 2120, hand-derived from `turn5KickoffBounceTickFromLatest`'s freeze branch) | (0,0) | (0,0) | (1,1) | ruled out |

**What IS solid regardless of which candidate:** at the headline frame
7305 itself, RAM ground truth is `(onixY2, healthboxY2) = (1, 0)`
(§1 table), the compare bbox at 7305 is sprite-only (`44,49-99,110`,
confirmed live above), and every candidate formula tried predicts
`onixY2=0` there - so the sign and rough magnitude of the defect (app
under-predicts onixY2 by exactly 1 unit at the first mismatch tick) is
robust to which exact formula is really wired up. Pinning the exact call
path for the surrounding rhythm (match at 7306, mismatch 7307-7316 but
on the *healthbox* field only, match again at 7317) needs one more level
of tracing into `drawFightSubmenuWindow`'s real branch selection between
"still-turn-5" and "now-turn-6" content than remains in this session's
budget - named as the fix step's first task below, not fabricated here.

## 3. Verdict

**(a) Is the divergence a pure phase/offset shift?**
Window A: NO, not a phase shift - it is a **hold-duration undercount**.
The real driver freezes for 3 ticks at the reopen press; the app models
only 1. This is a bounded, single-cause, fully-characterized defect
(§2a), not a constant additive tick offset (there is no single `+N`/`-N`
correction to `t` that reproduces it, because the defect's shape is "stay
at the frozen value 2 ticks longer than modeled," not "evaluate the same
advancing formula N ticks earlier/later").
Window B: NOT ESTABLISHED either way this session (§2b) - none of the
plausible small-offset candidates reproduce the observed match/mismatch
rhythm, so "pure phase shift" cannot be confirmed OR ruled out for this
window from the evidence gathered.

**(b) Is ONE upstream correction consistent with BOTH windows?**
NO, based on what's decisively measured. Window A's defect is a **local,
one-time hold-duration fix** at the reopen-press special case
(`battleScene.ts:8307-8310`, plus its still-undocumented turn-6 sibling
mechanism found in §1). Window B's headline frame occurs **before** its
own local reopen hold (7305 precedes the 7313-7315 hold entirely) and is
rendered through a still-active turn-5-descended path, not the turn-6
dispatch the ISSUES #97 mechanism paragraph's framing assumed applies
uniformly. These are evidenced as two different code regions (one inside
`drawActionMenuIdleWindow`'s single-tick special case; one inside
whichever turn-5-settled window function is still active 1300+ ticks
after turn 5's own confirm) - the mechanism paragraph's "shared upstream
constant/epoch" framing is CONTRADICTED for window B specifically: this
is not a small constant/epoch nudge away from correct, since 3 different
candidate small-offset formulas were all cleanly falsified by frame 7306's
exact full match.

**(c) Does the correction predict the family's other scores moving to full?**
Only partially derivable this session. The **hold-duration fix**
(extend the reopen-press freeze from 1 tick to 3, matching §1's RAM
evidence, and apply the same fix at turn 6's own analogous reopen) should
move turn5-action-off's own 5927-5930 span and turn6-reopen-off's own
7313-7316 span to match, plus any other trace whose capture window
crosses one of these two specific reopen-press instants - a small, bounded
number of frames per reopen, not the bulk of the family. It does NOT
obviously predict `turn5-confirm-off-*`/`turn5-resolve-off-*` moving to
full, since those trace names suggest they probe the SAME long
turn-5-descended span §2b left unresolved (7300-7312's own kind of
window, just at different absolute ticks) - which needs the call-path
tracing named in §2b before any count can be predicted. **What limits the
prediction:** the exact live formula for that long span is not recovered
this session.

**(d) Is it a provable no-op for turn5-reset-off's path?**
YES for the hold-duration fix specifically. `turn5-reset-off.json`'s own
`captureFrames` run 5300-5555 (confirmed in its trace JSON) - entirely
before turn 5's own real confirm press (`TICK0+4919=5959`) and far before
turn 5's own reopen press (5927... wait, 5927 < 5959 but still > 5555,
so also after the capture window ends). Since the hold-duration fix only
changes behavior at `t === turn5ReopenPressTick` and its immediate
neighborhood (absolute ticks >= 5927) plus turn 6's own analogous reopen
(>= 7313), and `turn5-reset-off`'s last captured frame is 5555 - strictly
before either affected tick range - the fix cannot touch any frame this
control trace inspects. Its own button script never even reaches the
reopen-press ticks in a way that could indirectly perturb an earlier
frame (the code paths in question are gated on `t`/`sm.openElapsed`
reaching those specific absolute ticks, not on any state that could
retroactively change earlier rendering). **256/256 stays 256/256.**

## 4. Named fix shape for the consuming fix step

1. **Window A (fully specified, ready to implement):** in
   `battleScene.ts`'s `drawActionMenuIdleWindow` (around line 8307-8310),
   the `t === turn5ReopenPressTick` single-tick special case needs to
   cover **3** ticks, not 1 - i.e. the "legacy" (unshifted) formula should
   apply for `t` in `[turn5ReopenPressTick, turn5ReopenPressTick + 2]`
   inclusive (5927-5929), with the `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
   correction only kicking in from `turn5ReopenPressTick + 3` (5930)
   onward. Verify against §2a's table (5930 real hbY2=2, not 0 - the fix
   must also get 5930 right, so re-check whether the extended-hold tick
   range should be `[press, press+2]` feeding the FROZEN legacy value, vs.
   resuming the advancing legacy formula unshifted for those 2 extra
   ticks; §1's RAM data shows the driver's `sinIndex` is **frozen** (not
   merely delayed-but-advancing) for all 3 ticks, so the fix likely wants
   the bounceTick value ITSELF held constant at
   `turn5LegacyResettledBounceTickFromLatest(turn5ReopenPressTick, latest)`
   for `t` in `[press, press+2]`, not re-evaluated per-tick).
2. **Window B (needs one more tracing pass before it can be fixed):**
   first locate the exact live function/branch rendering ticks
   7300-7312 (confirmed still turn-5-descended per §2b, NOT
   `drawTurn6FightSubmenuWindow`) - the cheapest way is a temporary,
   reverted `console.error` tap inside `drawTurn6FieldBase`
   (`battleScene.ts:14743`) logging `t`/`bounceTickOrLatest`/the resolved
   `bounceTick` while replaying `turn6-reopen-off.json`'s own segments
   through `appTrace.ts`, isolating which caller and constant produces the
   REAL app output at 7305-7317. Then apply this doc's same "extend the
   hold" fix at turn 6's own analogous reopen-press special case (the
   turn-6 sibling of `t === turn5ReopenPressTick`, evidenced live in §1 at
   ticks 7313-7315, but not yet located in source by function name this
   session - grep `battleScene.ts` for whatever turn-6 code reads
   `sm.openElapsed`/`TICK0 + sm.openElapsed` around the
   `drawTurn6FightSubmenuWindow` dispatch once turn 6's content is
   actually active).

## 5. Rerunnable PASS/FAIL check for the fix worker

```sh
# 1. RAM ground truth (re-run if the oracle process restarts; otherwise
#    reuse the committed receipt src/data/gen/turn5-6-reopen-bounce-probe.json):
python3 tools/run-mgba-probe.py /tmp/check.json -- \
  tools/probe/dump-turn5-6-reopen-bounce-driver.py /tmp/check.json
python3 -c "
import json
d = json.load(open('/tmp/check.json'))['ticks']
by = {r['tick']: r for r in d}
assert by[5927]['onixY2'] == 1 and by[5927]['healthboxMainY2'] == 1
assert by[5928]['onixY2'] == 1 and by[5928]['healthboxMainY2'] == 1
assert by[5929]['onixY2'] == 1 and by[5929]['healthboxMainY2'] == 1
assert by[5930]['onixY2'] == 1 and by[5930]['healthboxMainY2'] == 2
assert by[7313]['onixY2'] == 1 and by[7313]['healthboxMainY2'] == 1
assert by[7314]['onixY2'] == 1 and by[7314]['healthboxMainY2'] == 1
assert by[7315]['onixY2'] == 1 and by[7315]['healthboxMainY2'] == 1
print('RAM ground truth PASS (unchanged from this doc)')
"

# 2. After the window-A fix lands, this should go from 1/32 to (at least)
#    5/32 matched (frames 5927-5930 newly matching; 5931 needs window B's
#    still-unresolved mechanism or a further check):
npm run compare -- turn5-action-off --summary
#    expect frames 5927, 5928, 5929, 5930 to no longer appear in the
#    mismatch list (5931 may still mismatch - not claimed fixed by this doc)

# 3. Control must stay exactly 256/256 (provable no-op, §3d):
npm run compare -- turn5-reset-off --summary
#    expect: "256/256 frames matched"
```
