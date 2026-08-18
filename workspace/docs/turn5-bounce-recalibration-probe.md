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

## 6. Continuation (2026-08-17, bounded SIDE worker): window B call path recovered

Executes this step's assigned goals 1 and 2 (window-B tracing pass). Method:
temporary `console.error` taps at the entry of every candidate dispatcher
(`drawLatestCompletedCommandWindow`, `drawActionMenuIdleWindow`,
`drawTurn5RockSlideWindow`, `drawTurn6FightSubmenuWindow`, the region-A onix
branch inside `drawTurn5RockSlideAttack`, and `drawTurn6FieldBase` itself),
gated on `t` in `[7299, 7318]`, run once via
`npm run compare -- turn6-reopen-off --summary` (drives `tools/compare/appTrace.ts`
in-process through `node --experimental-strip-types`). **All taps were
reverted before this commit** - `git diff src/` is empty; the tap transcript
below is this session's own captured stderr, not re-derivable without
re-adding the same lines.

### 6a. Recovered call path, ticks 7305-7318

Two *different* dispatchers render this window, splitting exactly at 7313
(turn 6's own reopen-press registration tick, confirmed live:
`sm.openElapsed` reads `6273` starting at `t=7313`, and
`TICK0 (1040) + 6273 = 7313`, matching §1's RAM hold start exactly):

**7305-7312 (still turn-5-descended, confirming §2b's inference):**
`drawFightSubmenuWindow`'s `turn5Active` branch -> `drawTurn5EndeavorText`
(`t >= rockSlideTextStartTick`) -> `drawTurn5RockSlideWindow`
(`battleScene.ts:14781`) -> `drawTurn6FieldBase(fb, t, latestCompletedCommandHandoff)`
(the **object**, not a number) -> `battleScene.ts:14744`'s
`bounceTick = typeof bounceTickOrLatest === "number" ? ... : t` resolves to
the **raw, unshifted live `t`** - i.e. the live formula for this whole span
is exactly `menuIdleBounce(turn5SitrusResettledBounceTick(t))`, doc §2b's
own "candidate 1" (live `t`, no shift). This is now empirically confirmed as
the *actual* dispatch, not just a plausible guess - the trace log shows
`drawTurn5RockSlideWindow t=7305..7312` firing every tick with
`latestHandoffPresent=true`, landing in `drawTurn6FieldBase` with
`bounceTickOrLatestIsNumber=false, bounceTick=t` each time.

**7313-7317 (turn-6's own DMA-wait hold, a *third* code path not named in
§2b):** once `isLatestCompletedCommandHandoffReady(...) && ...Epoch === null`
flips true at `t=7313`, `drawFightSubmenuWindow` switches to
`drawLatestCompletedCommandWindow` -> `drawTurn6FightSubmenuWindow`
(`battleScene.ts:11804`). Turn 6's own `sm.openElapsed=6273` is now set but
`sm.confirmElapsed` is still `null`, so this hits the `t < revealTick` DMA-wait
branch (`revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY(5)
= 7313 + 5 = 7318`, confirmed live - the branch is active for exactly
`t=7313..7317`, matching `drawTurn6FightSubmenuWindow`'s own reveal tick
comment pattern already established for window A):
`drawTurn6ActionMenuIdleWindow(fb, t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT(2))`
(`battleScene.ts:11592`, called from `battleScene.ts:11818` inside
`drawTurn6FightSubmenuWindow`) -> `drawTurn6FieldBase(fb, t, bounceTick=t-2)`.
**Critically: `bounceTick` here increments by exactly +1 every tick with NO
freeze at all** - the trace shows `bounceTick=7311,7312,7313,7314,7315` for
`t=7313,7314,7315,7316,7317` respectively, a plain, uninterrupted `t-2`. This
is goal 2's answer: **the turn-6 sibling of the reopen-press special case
does not exist in source at all yet** - it's not a wrong formula, it's a
missing branch.

### 6b. Per-tick app-vs-oracle table (live-traced this session)

| tick | live app dispatcher | app bounceTick fed to `menuIdleBounce` | app (onixY2, hbY2) | oracle (onixY2, hbY2) | compare verdict |
|---|---|---|---|---|---|
| 7305 | `drawTurn5RockSlideWindow` | `t` (=7305) | (0, 0) | (1, 0) | sprite-only MISMATCH |
| 7306 | `drawTurn5RockSlideWindow` | `t` (=7306) | (1, 0) | (1, 1) | **fully MATCHES (unexplained, see 6c)** |
| 7307-7312 | `drawTurn5RockSlideWindow` | `t` | (1, 0) | (1, 1) | healthbox-only MISMATCH |
| 7313-7317 | `drawTurn6FightSubmenuWindow`'s DMA-wait -> `drawTurn6ActionMenuIdleWindow` | `t-2` (7311..7315, unfrozen) | (1, 0) through 7316; (1,1) at 7317 | (1, 1) throughout | healthbox-only MISMATCH through 7316, MATCH at 7317 |
| 7318 | same, `revealTick` now reached, `drawTurn6FightSubmenuWindow`'s own `bounceTick=7316` (still `t-2`, un-frozen) -> `drawTurn6FieldBase` directly | `t-2` (=7316) | (1, 1) | (0-ish, per raw JSON `onixY2=0` at 7318) | MISMATCH resumes (different bbox: `127,75-229,111`) |

(Oracle column cross-checked directly against the raw receipt
`src/data/gen/turn5-6-reopen-bounce-probe.json` this session, not just the
doc's own summarized table - confirms hbY2 is exactly `0` at 7305, exactly
`1` for every tick 7306-7316 inclusive, `2` at 7317, and onixY2 flips to `0`
at 7318.)

**Formula, precisely, per span:**
- 7305-7312: `{onixY2, healthboxY2} = menuIdleBounce(turn5SitrusResettledBounceTick(t))` - raw `t`, no shift, no special case. This is a real, in-source, already-active formula (not hypothetical) - it is simply *wrong* relative to oracle by a span-dependent amount (see 6c).
- 7313-7317: `{onixY2, healthboxY2} = menuIdleBounce(turn5SitrusResettledBounceTick(t - 2))` - same function, `t` shifted by the pre-existing `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` constant, again with **no** reopen-press freeze applied (goal 2's missing branch).

### 6c. New finding: the reopen-hold fix alone will NOT close window B's healthbox band

This corrects an implicit assumption in §4 item 2 ("apply this doc's same
'extend the hold' fix at turn 6's own analogous reopen-press" as the
complete window-B fix). Measured this session:

- The healthbox-only mismatch band spans **7307-7316** continuously,
  straddling *both* dispatchers (turn-5-descended 7307-7312 AND turn-6
  DMA-wait 7313-7316) with **the same wrong value** (`healthboxY2=0`)
  throughout - the 7313 dispatcher handoff is invisible in the app's own
  output at this field.
- Applying goal 2's fix (freeze `bounceTick` for `t` in `[7313, 7315]` at
  its `t=7313` value, `7311`) changes **nothing** about `healthboxY2` in
  that sub-range, because the *unfrozen* value there (`7311, 7312, 7313`)
  and the *frozen* value (`7311, 7311, 7311`) both fall in the exact same
  `menuIdleBounce` healthbox plateau (both far below the `1841`-ish input
  needed for `healthboxY2=1` - see next point) - the freeze only matters
  where a plateau boundary sits inside the 3-tick hold window, which is not
  the case here.
- The real defect is a **~11-tick input lag** local to the healthbox field
  only: app's `healthboxY2` output transitions `0 -> 1` at `t=7317`
  (`turn5SitrusResettledBounceTick(7317)=1841` is the first input value
  that yields `1`), but oracle's transition happens at `t=7306` - 11 ticks
  earlier. The onix field's own transition (well, its single 1-tick notch
  down to `0` exactly at `t=7305`, back to `1` at `t=7306`) is comparatively
  well-aligned with oracle (which never dips - oracle onix is `1` for the
  entire window). A uniform whole-window offset applied to `t` cannot fix
  both fields at once: shifting by +11 to fix healthbox's 7306 transition
  would ALSO shift onix's `t=7305` notch to `t=7316`, breaking a tick that
  currently already matches. This reconfirms §3a/§3b's "not a pure
  phase/offset shift" verdict for window B - now with a concrete measured
  magnitude (11 ticks) instead of just three ruled-out candidates.
- **Practical implication for the fix step:** window B needs **two
  independent corrections**, not one - (1) goal 2's reopen-press freeze
  (fixes the onix-only single-tick notch pattern IF it recurs identically
  to window A's shape elsewhere in the family, not exercised by this
  specific trace's own bbox since the notch here is a **different**
  mechanism, see 6d) and (2) a still-unrecovered healthbox-specific lag
  correction local to `drawTurn6FieldBase`'s `healthboxY2` derivation (or
  to `turn5SitrusResettledBounceTick` itself) that a single `t`-shift does
  not explain. This second correction is NOT located this session - it
  needs its own tracing pass into `turn5SitrusResettledBounceTick` and
  `menuIdleBounce`'s own two-field (onix vs healthbox) internals to find
  why the healthbox half specifically lags by ~11 ticks relative to the
  onix half's much smaller (1-tick) discrepancy, when both are fed the
  *same* `bounceTick` input from the *same* call site.

### 6d. Open puzzle, explicitly flagged (not resolved this session)

Frame 7306 is reported as a **full pixel match** by the live compare run
(absent from the mismatch list; re-confirmed fresh this session, not just
cited from the prior run). But the traced app formula gives
`healthboxY2=0` at `t=7306` while oracle's raw JSON gives `1` - the same
disagreement that DOES show up as a mismatch at every neighboring tick
(7305 sprite-only, 7307-7312 healthbox-only). Since `healthboxY2` is
identically `0` at both 7306 and 7307 in the app trace, and identically `1`
at both in the oracle JSON, the raw-value disagreement is indistinguishable
between the two ticks - yet only one of them mismatches on screen. One
candidate explanation was tested against the full observed match/mismatch
sequence (7305 mismatch, 7306 match, 7307-7316 mismatch, 7317 match, 7318
mismatch) and fits all six transitions: real hardware's sprite-Y2 RAM value
for tick N is read by the probe *after* that tick's `DoBounceEffect` task
runs, but the *displayed* frame N was already composited from the *previous*
tick's Y2 (a standard "logic updates land one vblank after they're
computed" ordering) - i.e. oracle's true *displayed* value for frame N
equals the RAM probe's own tick-`(N-1)` reading, not tick-N's. Checked
against all six pixel transitions in the mismatch list, this hypothesis is
consistent throughout - but it was not independently confirmed (e.g. by
probing the RAM value on the tick immediately preceding a captured
screenshot, which this session's probe script does not do), so it is named
here as a **lead for the fix step**, not a proven mechanism. It does not
change 6c's magnitude conclusion (an ~11-tick app-side lag remains either
way, since shifting the *oracle* comparison basis by 1 tick cannot explain
an 11-tick app-side gap).

### 6e. §5 PASS/FAIL check extension (window B acceptance criteria)

```sh
# After BOTH corrections in 6c land (goal-2 freeze + the still-unrecovered
# healthbox lag fix), turn6-reopen-off should move from 11/46 to at least
# 16/46 matched (7305, 7307-7316 newly matching - 11 frames - on top of the
# already-matching 11; 7318+ needs the SAME healthbox lag fix applied to
# `drawTurn6FightSubmenuWindow`'s own confirmed-bounceTick branch,
# `turn6KickoffBounceTick`, not exercised by this session's trace and NOT
# claimed fixed here):
npm run compare -- turn6-reopen-off --summary
#    expect: frames 7305, 7307, 7308, 7309, 7310, 7311, 7312, 7313, 7314,
#    7315, 7316 to no longer appear in the mismatch list.

# Goal-2's freeze alone (without the healthbox lag fix) is NOT expected to
# change this count at all per 6c - if a fix step lands ONLY the freeze and
# reruns this check expecting a count increase, that is a sign the freeze's
# effect was not verified against 6c's plateau-overlap finding first.
```

### 6f. Verdict for this continuation

**Goal 1 (recover window B's live formula): DONE**, decisively, for
7305-7318 - two dispatchers, four call frames, exact file:line, exact
constants (`TICK0=1040`, `FIGHT_SUBMENU_OPEN_DELAY=5`,
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT=2`), and a per-tick table cross-checked
against the raw RAM receipt (§6b). The doc's own §2b "candidate 1" is
confirmed as the *actual* live formula for 7305-7312 (not merely a
plausible guess that happened to be ruled out by a stale full-match
requirement at 7306 - see §6d for why that requirement's premise needs a
second look).

**Goal 2 (locate turn-6's reopen-press special-case sibling): DONE.**
`battleScene.ts:11804`'s `drawTurn6FightSubmenuWindow`, its `t < revealTick`
branch (around line 11816-11819) calling `drawTurn6ActionMenuIdleWindow(fb,
t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)` - this branch has **no**
`t === turn6ReopenPressTick` special case at all (`turn6ReopenPressTick =
TICK0 + sm.openElapsed`, live-confirmed `= 7313`). The fix shape mirrors
window A's (§4 item 1): freeze the fed `bounceTick` at its `t=turn6ReopenPressTick`
value for `t` in `[turn6ReopenPressTick, turn6ReopenPressTick+2]` (i.e.
`[7313,7315]`), matching §1's RAM-proven 3-tick sinIndex hold at those exact
ticks.

**Goal 3 (stretch): NOT attempted** - budget was spent on goals 1/2 per the
step's own priority order; not started, not claimed.

**Can ONE combined fix step now close both headline traces?** NO - not
in one shot. Window A (turn5-action-off) is fully specified and ready
(§4 item 1, unchanged by this session). Window B (turn6-reopen-off) now has
its reopen-hold sibling **located** (goal 2) but that fix, applied alone,
provably does NOT close the 7307-7316 healthbox band (§6c) - a second,
separate, still-unrecovered healthbox-lag correction is needed for window B
specifically. A combined fix step can land window A complete plus window
B's reopen-hold half, but should expect turn6-reopen-off to still show a
healthbox-only mismatch band after that lands, and should budget a further
tracing pass into `turn5SitrusResettledBounceTick`/`menuIdleBounce` before
attempting the second half.

## 7. Continuation 2 (2026-08-17, bounded SIDE worker): display basis CONFIRMED, corrected re-tabulation, mechanism narrowed

Executes this step's goals 1 (required, DONE) and 2 (required, PARTIALLY
DONE - narrowed with concrete ruled-out candidates, exact file:line not
landed). Goal 3 (stretch) not attempted - budget went entirely to 1/2 per
the step's own priority order. No `src/` file was edited this session
(`git diff -- src/` is empty at commit time); all evidence below comes from
a new read-only probe script plus live `npm run compare` reruns.

### 7a. Goal 1: the display-basis hypothesis is CONFIRMED, directly, by pixel evidence

**Protocol-identity check first.** `oracle/server.py`'s `run_trace` (the
function every `npm run compare` call ultimately drives) calls
`ORACLE.advance(buttons)` once per frame and, only if `ORACLE.frame in
wanted`, captures `screen_rgb()`/`screen_png()` **in that same iteration,
immediately after the `advance()` call that produced that frame number**
(`oracle/server.py:119-123`). This is byte-for-byte the same protocol both
`dump-turn5-6-reopen-bounce-driver.py` (§1) and this session's new probe use
for their own RAM reads (`oracle.advance()` then `record()` in the same
loop iteration). **This rules out a probe-methodology artifact as the
source of any N-vs-N-1 disagreement** - both the official compare captures
and every RAM probe in this doc read from the exact same simulation instant
for a given tick number, so any disagreement between "RAM value at tick N"
and "pixels actually shown at tick N" is a genuine property of the emulated
hardware/task-ordering, not a probe bug.

**Direct pixel probe.** New script `tools/probe/dump-turn6-reopen-display-basis-probe.py`
(receipt `/tmp/turn6-display-basis.json`, not committed - trivially
rerunnable, see command below) extends the RAM read with a sha256 of the
raw-RGB crop over each of the compare tool's own reported bbox regions
(onix `44,49-99,110`, healthbox `127,74-229,110`) at the SAME tick, for
`t` in `[7302,7320]`. Comparing consecutive-tick RAM-value transitions
against consecutive-tick crop-hash transitions in that same run:

| field | RAM value changes at tick | crop pixels visibly change at tick | lag |
|---|---|---|---|
| healthbox | 7306 (0->1) | 7307 | **+1** |
| healthbox | 7317 (1->2) | 7318 | **+1** |
| healthbox | 7318 (2->1) | 7319 | **+1** |
| onix | 7318 (1->0) | 7319 | **+1** |

**All four observed transitions in this window lag the RAM write by
exactly one tick, with zero exceptions.** This directly confirms §6d's
hypothesis, not merely by re-checking consistency of already-known numbers
(as §6d itself did) but by independently measuring the pixels: **the
oracle's displayed frame N shows the sprite-Y2 RAM state as of tick N-1,
not tick N's own value** - `displayed(T) = RAM(T-1)`. Mechanistically this
is the standard GBA "OAM writes made during frame N's own trailing VBlank
task-processing are scanned out starting frame N+1, not frame N" ordering
(frame N's own visible scanlines, drawn during the SAME `run_frame()` call
that also runs frame N's vblank tasks, are already committed before that
vblank's `DoBounceEffect` write lands in the OAM shadow buffer). This is
the SAME real-hardware phenomenon `menuIdleBounce`'s own doc comment
(`battleMenu.ts:824`, "screenTick T shows RAM tick T-1's sprite state")
already documents and bakes in via its internal `ramTick = t - 1` - but
that internal shift models a DIFFERENT thing (menuIdleBounce's own
age-relative RAM-setup-tick alignment) and is orthogonal to, not a
duplicate of, this oracle-capture-vs-RAM lag: both corrections are real and
both are needed simultaneously for the numbers below to close (confirmed
by the exact-match anchors in 7b, which already include `menuIdleBounce`'s
own internal shift and STILL require the external `T-1` correction to
match oracle).

**Corrected basis, stated explicitly for the rest of this document:**
every table above (§1, §2a, §2b, §6b) that compared "app value computed for
trace tick T" against "oracle RAM value recorded at tick T" used the WRONG
basis. The correct comparison is app(T) vs **RAM(T-1)** - i.e. shift the
oracle column of every existing table in this doc back by one tick before
reading it as "what should the app produce at tick T."

Rerun command (fresh, ~15s, no bootstrap/state changes):
```sh
python3 tools/run-mgba-probe.py /tmp/check-basis.json -- \
  tools/probe/dump-turn6-reopen-display-basis-probe.py /tmp/check-basis.json
python3 -c "
import json
d = json.load(open('/tmp/check-basis.json'))
t = d['transitions']
assert {'kind':'ram','tick':7306,'from':0,'to':1} in t['healthbox']
assert {'kind':'pixels','tick':7307} in t['healthbox']
assert {'kind':'ram','tick':7318,'from':1,'to':0} in t['onix']
assert {'kind':'pixels','tick':7319} in t['onix']
print('display-basis PASS: pixel transitions lag RAM transitions by exactly 1 tick')
"
```

### 7b. Window B re-tabulated on the corrected basis - PERFECTLY reproduces the live compare output, zero new code

Re-deriving app(T) from the ALREADY-established §6a dispatch formulas
(unchanged this session - `menuIdleBounce(turn5SitrusResettledBounceTick(t))`
for 7305-7312, same with `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` for
7313-7317, computed live this session via
`node --experimental-strip-types` importing the real exported symbols -
not hand-copied arithmetic) against `displayed(T) = RAM(T-1)`:

| tick | app (onixY2,hbY2) | displayed = RAM(T-1) | predicted verdict | **live `npm run compare` verdict (reconfirmed this session)** |
|---|---|---|---|---|
| 7305 | (0,0) | RAM(7304)=(1,0) | onix-only mismatch | onix-only mismatch, bbox `44,49-99,110` ✓ |
| 7306 | (1,0) | RAM(7305)=(1,0) | **FULL MATCH** | **absent from mismatch list** ✓ |
| 7307-7316 | (1,0) | RAM(7306..7315)=(1,1) | healthbox-only mismatch | healthbox-only mismatch, bbox `127,74-229,110`, all 10 ticks ✓ |
| 7317 | (1,1) | RAM(7316)=(1,1) | **FULL MATCH** | **absent from mismatch list** ✓ |
| 7318 | (1,1) | RAM(7317)=(1,2) | healthbox-only mismatch (off by 1, bbox grows 1 row) | mismatch resumes, bbox `127,75-229,111` ✓ |

**Every one of these 12 predictions matches the live, freshly-rerun
`npm run compare -- turn6-reopen-off --summary` output exactly** (rerun
this session: still 11/46, same frame list as §0/§6). This is a complete,
tick-for-tick reproduction of the real match/mismatch pattern using
**zero additional formula changes** beyond correcting the comparison basis
- i.e. §6a's dispatch-formula recovery was already complete and correct;
the entire remaining puzzle is in the MAGNITUDE of the healthbox-specific
error, not in the call path.

**Corrected lag magnitude:** oracle's real (displayed-basis) healthbox
0->1 transition is at tick **7307** (not 7306 as the uncorrected §6c
computed). App's own healthbox 0->1 transition is at tick 7317 (unchanged -
directly recomputed this session, matches §6c's citation). **Corrected lag:
exactly 10 ticks** (7317 - 7307), not the previously-stated ~11.

### 7c. Goal 2: candidate (a) is now DEFINITIVELY ruled out with anchor evidence; exact mechanism still not pinned to file:line

**Ruling out a uniform additive time/phase shift, precisely:** the SAME
already-published, zero-modification dispatch formula exactly matches
oracle at BOTH anchor ticks 7306 and 7317 (§7b). Any proposed uniform
correction to the shared `bounceTick` input (adding/subtracting a constant
`C`) would shift EVERY field's transition tick by the same `C` - which
would necessarily break at least one of these two already-exact anchor
matches (a `C != 0` cannot leave two already-correct points correct while
also fixing the 10 intervening healthbox ticks, since `menuIdleBounce`'s
onix/healthbox outputs are both monotonic step functions of the SAME
shared input over this span). This is a stronger, more direct version of
§3a/§6c's prior "not a pure phase shift" conclusion - previously argued
from three ruled-out candidate formulas (§2b) and a plateau-overlap
argument (§6c); now proven directly from two independently-reconfirmed
exact-match data points that bracket the entire defective span.

**What this rules IN:** the defect is in the *shape/rate* of the
healthbox-specific transition between the two anchors, not a shared-input
timing offset. Candidate (a) (a wrong per-field phase/epoch constant
applying uniformly) is refuted by the same anchor argument - a wrong
epoch constant is just another additive shift on the shared input. The
remaining candidates from the step brief:
- **(b) render-site per-field lag convention:** NOT reached this session -
  `drawTurn6FieldBase`'s exact per-field OAM/compositor write order
  (`battleScene.ts:14743` and its callers) was not re-instrumented; this is
  named as the sharpest next instrument (a temporary tap distinguishing
  whether onix's and healthbox's `y2` fields are written/read through
  genuinely different code paths at the render site, vs. both purely
  reading `menuIdleBounce`'s return value uniformly - if genuinely uniform,
  (b) is refuted too and only (c)/(d) remain).
- **(c) stale-epoch input specific to `turn5SitrusResettledBounceTick`:**
  PARTIALLY supported. Computed this session: under the shared seed offset
  alone (onix seed 192, healthbox seed 128, a difference of 64 steps at
  +7/tick - the SAME real-hardware constants §1 RAM-confirmed), healthbox's
  transition should trail onix's by `64/7 ≈ 9.14` ticks if BOTH fields
  were driven by the SAME continuous input with no dispatcher switch. Onix
  crosses to Y2=1 at t=7306 under the live formula; the natural phase-only
  prediction for healthbox's crossing would then be ~t=7315
  (`7306+9`) - and indeed, computing the UNSHIFTED `t`-only formula
  continuously past 7312 (ignoring the real 7313 dispatcher switch) gives
  healthbox crossing to 1 exactly at t=7315, matching this phase-offset
  prediction closely. But oracle's REAL transition is at t=7307 - **8
  ticks earlier than even this natural continuous-phase model predicts**,
  not just earlier than the app's actual (dispatcher-switched) t=7317.
  This residual (~8 ticks, beyond what the shared 64-step seed offset
  alone explains) is NOT accounted for by the seed-offset mechanism and
  points at `turn5SitrusResettledBounceTick`'s own anchor (grid-searched
  as a single global `-5474` shift, per its doc comment, against "the
  17-sample healthbox y2 sequence" from what is almost certainly a
  DIFFERENT call site/window than this one) being miscalibrated
  specifically for the healthbox field's use in the 7305-7312
  `drawTurn5RockSlideWindow` span - not proven to file:line this session,
  but now bounded to an ~8-tick residual after subtracting the
  well-evidenced 64-step/9-tick seed-offset component.
- **(d) something else:** not identified beyond (b)/(c) above.

**Sharpest next instrument for the fix step:** a temporary tap on
`menuIdleBounce`'s own `n` value (the shared input after the `ramTick - 1748`
step) at each of 7305-7318, cross-referenced against the SAME tap at
whatever call site turn 5's own settled-menu redraw (`TURN5_SITRUS_MENU_
REDRAW_TICK=7222`) uses `turn5SitrusResettledBounceTick` for - if that
OTHER window's `n` sequence at the SAME absolute healthbox RAM values lands
on a different `n` than this window's, the `-5474` anchor is confirmed
miscalibrated for this specific call site and the fix is a second,
window-B-local additive correction to the healthbox `n` (or to
`turn5SitrusResettledBounceTick`'s single input before the seed-specific
sine lookup) - not attempted this session (time budget).

### 7d. Window A re-tabulated on the corrected basis - corrects a prior claim

Re-applying `displayed(T) = RAM(T-1)` to window A (ticks 5927-5931, RAM
values pulled fresh from `src/data/gen/turn5-6-reopen-bounce-probe.json`
this session) against §2a's unchanged app table:

| tick | app (onixY2,hbY2) | displayed = RAM(T-1) | onix | healthbox |
|---|---|---|---|---|
| 5927 | (1,0) | RAM(5926)=(1,1) | MATCH | mismatch (off by 1) |
| 5928 | (1,0) | RAM(5927)=(1,1) | MATCH | mismatch (off by 1) |
| 5929 | (1,0) | RAM(5928)=(1,1) | MATCH | mismatch (off by 1) |
| 5930 | (1,0) | RAM(5929)=(1,1) | MATCH | mismatch (off by 1, corrected from §2a's uncorrected "off by 2") |
| 5931 | (1,0) | RAM(5930)=(1,2) | **MATCH** (corrected from §2a's "NO") | mismatch (off by 2) |

**Live-reconfirmed this session** (`npm run compare -- turn5-action-off --summary`):
frame 5931's mismatch bbox is `127,74-229,111` - **still confined to the
healthbox x-range (127-229), NOT extending to onix's own x-range
(44-99)**. Onix's own bbox only appears starting frame **5932**
(`bbox=44,49-229,133`, a different, larger, out-of-domain mismatch past
this window's own `revealTick=5932` boundary - already flagged in §2a as
outside the pinned domain). **This corrects §2a/§3a's claim that "onix ALSO
starts mismatching... at 5931."** That claim used the uncorrected basis
(RAM(5931) directly); on the corrected basis, onix matches at every tick
5927-5931, and the bbox's 1-row growth at 5931 is fully and only explained
by healthbox's own error widening from off-by-1 to off-by-2 (matching
`RAM(5930)=(1,2)` vs the flat `RAM(5926..5929)=(1,1)`) - not a second,
independent onix defect.

**Practical implication for the fix step:** window A's defect is now shown
to be a SINGLE-FIELD (healthbox-only), uniform-shape error across all five
ticks 5927-5931 - off by exactly 1 for 5927-5930, off by exactly 2 at 5931
(tracking `RAM(T-1)`'s own healthbox value exactly). §4 item 1's proposed
fix (freeze the legacy bounceTick for `[press, press+2]`, matching the
RAM-proven 3-tick sinIndex hold) was designed against the OLD, uncorrected
table and should be re-validated against this corrected one before
implementation - in particular it must reproduce healthbox=1 for
5927-5930 AND healthbox=2 at 5931 (not just "get 5930 right" as §4's own
hedge worded it), and since onix is now proven to already match throughout
with zero fix needed, the fix step should NOT touch onix's formula for
this span at all.

### 7e. §5/§6e PASS/FAIL corrections

**§5's window-A expected count, corrected:** if the healthbox-only fix
described in §7d lands correctly (reproducing `hbY2=1` for 5927-5930 and
`hbY2=2` at 5931, onix untouched), `turn5-action-off` should move from
1/32 to **5/32** matched (5927, 5928, 5929, 5930, AND 5931 - not "4/32,
5931 uncertain" as §5 previously stated; 5931 was only uncertain under the
uncorrected basis's mistaken onix-mismatch belief, corrected in §7d).
Frame 5932 remains unresolved (outside this window's pinned domain, past
`revealTick`) and is not claimed by this correction.

**§6e's window-B expected count: UNCHANGED in headline number** (still
11/46 -> at least 16/46 if both corrections land), but the MECHANISM
description is corrected: the "healthbox lag" is now precisely 10 ticks
(7307->7317), not ~11, and is now known to require a healthbox-specific
correction of magnitude ~8 ticks beyond what the shared 64-step onix/
healthbox seed-offset already explains (§7c) - not a from-scratch
unexplained 10-11 tick gap. The goal-2 freeze fix's own effect is
UNCHANGED by this correction (§6c's finding that the freeze doesn't touch
this healthbox sub-range at all still holds exactly, re-verified with the
corrected-basis table in §7b: the freeze only matters at a plateau
boundary, and none sits inside `[7313,7315]` for either basis).

### 7f. Verdict for this continuation

**Goal 1 (confirm/refute §6d's display-basis hypothesis): CONFIRMED**,
directly, via a new pixel-level probe (`tools/probe/dump-turn6-reopen-display-basis-probe.py`)
- not by re-checking existing numbers for consistency (as §6d itself had
to settle for), but by independently measuring RAM-transition ticks against
crop-pixel-transition ticks in the same run: 4/4 observed transitions lag
by exactly 1 tick, zero exceptions. Corrected basis stated explicitly:
`displayed(T) = RAM(T-1)`. Applying it (§7b) reproduces the ENTIRE live
`npm run compare -- turn6-reopen-off` match/mismatch pattern for
7305-7318 exactly, with no formula changes - and (§7d) corrects a prior
claim about window A (onix does NOT mismatch at 5931; only healthbox does,
confirmed against a live rerun's bbox).

**Goal 2 (locate the ~11-tick, now ~10-tick, healthbox lag mechanism):
NARROWED, not landed to file:line.** Candidate (a) (uniform phase/offset)
is now DEFINITIVELY ruled out (not just "not established" as §3a left it)
by the two exact-match anchors bracketing the whole defective span - a
uniform shift cannot both preserve two exact matches and fix 10
intervening mismatches. ~9 of the ~10 remaining ticks are explained by the
real, RAM-confirmed 64-step onix/healthbox seed-offset (an intentional,
correct asymmetry, not a bug); an ~8-tick residual beyond that is
attributed (not yet proven to file:line) to `turn5SitrusResettledBounceTick`'s
single shared `-5474` anchor being calibrated against a different call
site/window than this one. §7c names the exact next instrument (a tap on
`menuIdleBounce`'s internal `n` compared across call sites) to close this
gap - not run this session (time budget spent on goal 1's required direct
confirmation and the corrected re-tabulation of both windows).

**Goal 3 (stretch): NOT attempted**, as instructed by the step's own
priority order.

**Can the fix step now close turn6-reopen-off fully?** NO. Window A can
now close to 5/32 (corrected from 4/32, §7e) once §4 item 1's fix is
re-validated against §7d's corrected table. Window B's reopen-hold half
(goal 2 from the prior continuation) remains a real, needed fix (unaffected
by this session's corrections) but, applied alone, still does not close
the 10-tick healthbox band (§6c/§7e, unchanged). That band's fix now has a
narrower, quantified target (~8 residual ticks after the seed-offset
component) and a named next instrument (§7c) rather than an open-ended
"trace `menuIdleBounce`'s internals" - but was not landed this session.
Expect turn6-reopen-off to reach **16/46** once BOTH the goal-2 freeze AND
a healthbox-specific correction land; 11/46 unchanged today (reconfirmed
live, §7b). **Continuation 3 (§8) supersedes this 16/46 figure** - the
correction is a raw-sine-index constant (+67), not a healthbox-only one
(it applies identically to onix), and the corrected prediction is ~20/46
with important composition caveats - see §8f.

## 10. Continuation 5 (2026-08-18, bounded SIDE worker): `turn6KickoffBounceTick`'s call path traced, no new constant - a missing shift and a second, previously-unpatched call site instead

Executes this step's goal 1 (required: trace `turn6KickoffBounceTick`'s
call path, measure the raw-index delta for displayed frames 7318+, verdict
on its own constant) - **DONE**, with a corrected premise: this span does
**NOT** have its own field-agnostic `+K3`. Goal 2 (required: explain the
9 currently-matching frames and their fate under upcoming fixes) - **DONE**,
live-verified, and it **directly refutes** this step's own brief hypothesis
for sub-goal (a) ("the +67 fix... should be nothing... different call
site"). Goal 3 (stretch) not attempted - budget went entirely to 1/2, both
required, and a live-verification detour that paid for itself (§10c). All
taps (two temporary `console.error`s plus a temporary `indexOffsetTAP97B5`
parameter added to `menuIdleBounce` and threaded through two call sites)
were reverted before this commit - `git diff -- src/` is empty.

### 10a. Call path, confirmed live (source read + a live tap, `NTAP97B5`-gated)

`drawTurn6FightSubmenuWindow` (`battleScene.ts:11804`), once past
`revealTick` and not yet in the FEATHER_DANCE kickoff text:
```
const bounceTick = sm.confirmElapsed !== null
  ? turn6KickoffBounceTick(t, TICK0 + sm.confirmElapsed)
  : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;                    // battleScene.ts:11827
drawTurn6FieldBase(fb, t, bounceTick);                       // battleScene.ts:11828
```
`turn6KickoffBounceTick` itself (`battleSceneCanonical.ts:1313-1316`):
```
if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t;   // FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY = 3
return pressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET;               // TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET = 4
```
A live tap at `battleScene.ts:11827` (`NTAP97B5=1 npm run compare --
turn6-reopen-off --summary`) resolves the open question directly: for
`turn6-reopen-off.json`'s own script, `sm.confirmElapsed` stays `null`
through `t=7344` - turn 6's real ROCK_SLIDE confirm press is **not** yet
registered - so `turn6KickoffBounceTick` is **not actually reached** until
`t=7345`, where `confirmElapsed` flips to `6305` (`pressTick = TICK0 +
6305 = 7345`). Concretely, the live `bounceTick` sequence is:
- `t` in `[7318, 7344]`: `bounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
  (`= t - 2`) - the **`else` branch**, not `turn6KickoffBounceTick` at all.
  This is the literal same formula already governing 7313-7317 (§6a) - the
  DMA-wait branch never actually ends at `revealTick=7318` in terms of
  *which formula* is live, only in which `if` branch of the caller executes
  it.
- `t` in `[7345, 7347]`: `turn6KickoffBounceTick`'s **raw branch** now
  finally executes (`t < pressTick+3=7348`), returning **unshifted `t`**
  (live-tapped: `bounceTick=7345,7346,7347`).
- `t` in `[7348, 7350]`: the **frozen branch**, `bounceTick = pressTick - 4
  = 7341` (live-tapped, constant).

`drawTurn6FieldBase` (`battleScene.ts:14743`) then feeds this SAME
`bounceTick` to **two separate `menuIdleBounce` calls**, not one - this
corrects §8a's "only ONE call site" framing, which was true for the
*healthbox* field's dispatch chain but never checked the *onix* field's own
chain:
- healthbox: `drawTurn6FieldBase`'s own `const bounce =
  menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick))`
  (`battleScene.ts:14768`, the call §8f already named).
- **onix (not previously traced by this doc): `drawTurn5RockSlideAttack`'s
  own, independent call**, `const onixY2 =
  menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick)).onixY2 +
  onixY2Extra` (`battleScene.ts:10829`), reached via
  `drawTurn6FieldBase`'s unconditional `drawTurn5RockSlideAttack(fb, t,
  bounceTick, ...)` call. This function's own doc comment
  (`battleScene.ts:10820-10828`) already documents a **prior, separate**
  fix in this exact spot ("`drawTurn6FieldBase` already freezes region
  B/the healthbox but never threaded the same freeze into this function" -
  closing a 7348-7404 residual) - i.e. this call site has its own
  fix history, independent of `drawTurn6FieldBase`'s, and needs its own
  `indexOffset` too (§10c).

### 10b. Per-tick raw-index delta vs receipt - no new constant, a missing `-2` shift instead

Receipt coverage confirmed sufficient - `src/data/gen/turn5-6-reopen-bounce-probe.json`
already covers ticks 7300-7351 (52 rows) in full; no probe extension
needed. Computing `(RAM_raw - model_raw) mod 256` with `model_raw = seed +
7*(bounceTick - 7223)` (no offset) against the receipt's own
`onixSinIndex`/`healthboxSinIndex`, using the LIVE `bounceTick` values from
§10a:

| span | live `bounceTick` | delta needed | verdict |
|---|---|---|---|
| `[7318, 7344]` | `t - 2` | **+67** (constant, both fields, 27/27 ticks) | the SAME already-established §8 constant - this sub-span isn't `turn6KickoffBounceTick`'s domain at all |
| `[7345, 7346]` | `t` (raw, unshifted) | **+53** (constant, both fields) | **NOT** a new constant: `53 = 67 - 14 = 67 - 2*7` - exactly the raw-index footprint of the missing `- FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (`2`) that the sibling `else` branch one line above already applies. Substituting `bounceTick = t - 2` here instead of raw `t` makes **+67 match exactly** (checked directly against the receipt: onix/healthbox raw index both exact at 7345, 7346) |
| `7347` | `t` (raw) | not computable | real hardware's driver is **already torn down** in RAM at this tick (`onixSinIndex=0`, `delta=0` literal, receipt-confirmed) - 7346 is the last tick with live dynamic sine data, matching §8c's own stated boundary exactly |
| `[7348, 7350]` | `7341` (frozen) | not computable | same reason - no dynamic RAM ground truth exists in this window to calibrate a frozen-branch constant against; the frozen anchor's correctness can only be judged via displayed-Y2 comparison (§10d), not a raw-index delta |

**Verdict for goal 1: there is no own, distinct, field-agnostic `+K3` for
this span.** It decomposes into three regimes, only one of which is new
territory:
1. `[7318,7344]` reuses the existing `+67` exactly, unconditionally -
   `turn6KickoffBounceTick` is not yet even called here.
2. `[7345,7347]` (its raw/un-frozen branch, finally exercised) needs the
   *same* `+67`, but only once a **second, tiny, source-level bug** is
   fixed: `turn6KickoffBounceTick`'s `t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`
   branch returns bare `t` where its sibling (`drawTurn6FightSubmenuWindow`'s
   own `else` branch, one line above the call) returns `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`.
   This is the same *class* of defect §6f named for the reopen-press freeze
   ("a missing branch," not a wrong formula) - here it's a missing
   `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` term, not a missing freeze.
3. `[7348,7350]` (the frozen branch) has no dynamic ground truth in this
   receipt to validate any constant against at all - flagged, not resolved.

**Composition rules, answered directly:** no freeze applies in this span
(the goal-2 reopen-press freeze is scoped to `[7313,7315]` only, confirmed
by construction - unaffected here). The display basis
(`displayed(T)=RAM(T-1)`) is unchanged/still applicable (not independently
re-verified at these specific ticks this session, but no mechanism exists
that would suspend it here - same oracle capture protocol throughout).

### 10c. Live pixel verification: §8f's fix shape under-specified by one call site - now corrected and confirmed

Rather than trust the closed-form math alone, this session temporarily
added a defaulted `indexOffsetTAP97B5` parameter to `menuIdleBounce`
(`battleMenu.ts:825`) and threaded `process.env.NTAP97B5 ? 67 : 0` through
**both** call sites, then re-ran `NTAP97B5=1 npm run compare --
turn6-reopen-off --summary` after each edit (reverted before this commit):

| patched call site(s) | live score | notes |
|---|---|---|
| none (baseline) | 11/46 | matches §0/§8's own reconfirmed baseline |
| healthbox only (`battleScene.ts:14768`, §8f's own named site) | 24/46 | **not** what §8f's fix shape alone would produce - onix stays broken |
| **healthbox + onix** (`battleScene.ts:14768` AND `:10829`) | **32/46** | matches this session's own closed-form model (§10d) exactly, tick-for-tick, once both sites carry the offset |

**This corrects §8f's fix shape**: `indexOffset=67` must land at **two**
call sites, not one - `drawTurn6FieldBase`'s own healthbox computation
(`:14768`) AND `drawTurn5RockSlideAttack`'s independent onix computation
(`:10829`), both reachable through the SAME `drawTurn6FieldBase(fb, t,
bounceTick)` dispatch. A fix step that only patches the site §8f named
would land onix visibly broken across the whole `turn6-reopen-off` family
- this was not previously live-tested (§8h's own PASS/FAIL check is a pure
raw-index arithmetic check against the receipt, never a live pixel compare,
so it could not have caught a missing call site). **Whether this same
gap exists for window A's own `+116` fix (§9) was not checked this
session** - flagged as a needed pre-flight check before that fix lands
too, since `turn5LegacyResettledBounceTickFromLatest`/`turn5SubmenuBounceTickFromLatest`
may have the same two-call-site (onix vs healthbox) split.

### 10d. Goal 2: the 9-frame regression map, live-confirmed

The currently-matching frames outside `[7305,7317]` are, live-reconfirmed
this session: `{7326, 7327, 7335, 7336, 7344, 7345, 7348, 7349, 7350}` (9
frames) - identical to §8e's list. Why each matches TODAY (unfixed code,
closed-form model cross-checked tick-for-tick against the live compare
tool's exact pass/fail pattern for all of `[7305,7350]`, not just these 9):

| frame(s) | raw index (unfixed) distance from nearest table 1/4-boundary | mechanism |
|---|---|---|
| 7326, 7335, 7344 | 3, 2, 1 (onix); same for hb | the SAME §8d/§9e "every 9 ticks" table-peak-adjacent class already flagged - genuinely plausible rounding-tolerance coincidences |
| 7327, 7336 | 10, 9 | one tick past the peak cluster above - still inside the same wide plateau bucket, a weaker/wider version of the same tolerance, not as tightly peak-bound |
| 7345 | 22 | **not** table-peak-related at all - this is the regime-boundary tick where `turn6KickoffBounceTick` first executes; its match is a coincidence of raw-index *magnitude* landing in the right bucket, unconnected to §8d's mechanism |
| 7348, 7349, 7350 | 6 (frozen branch) | a **third, distinct** coincidence: real hardware's driver is fully torn down (flat literal 0) here, while the model still computes a stale frozen-`bounceTick` sine value that happens to floor to the same `(0,0)` bucket by table geometry - unrelated to both other mechanisms |

**(a) Fate under the `+67` fix already landing (main lane): NOT a no-op -
live-confirmed regression, all 9.** This directly refutes the step brief's
own framing ("should be nothing - different call site; confirm"). §10a
shows it is the identical dispatch chain (through `drawTurn6FieldBase`),
and §10c's live run proves it: with `+67` correctly landed at **both**
call sites, all 9 frames (plus 7318, a 10th, previously-matching-adjacent
frame not in the original 9-list but immediately outside it) flip from
match to mismatch, while a disjoint set of 23 frames in `[7319,7350]`
become newly matching. Net for the family: strongly positive (11→32
overall, live-confirmed §10c), but every one of these specific 9 is a
regression, not preserved - **a fix step landing `+67` should expect and
report this specific list flipping, not treat it as a bug in the fix.**
**If only the healthbox call site is patched (missing §10c's onix-site
correction), the picture is worse and messier** (24/46, a different,
overlapping-but-not-identical mismatch pattern) - underscoring why both
sites must land together, not sequentially with a gap.

**(b) Fate under a future fix to `turn6KickoffBounceTick`'s missing `-2`
shift (§10b's "own constant" answer):** no additional effect on these 9
specifically, live-modeled - the shift only touches `bounceTick` for
`t` in `[7345,7347]`, and (checked via the closed-form model) does not
by itself restore any of the 9 to matching once `+67` has already broken
their current coincidence; it only affects *how close to correct* the
already-broken frames 7345-7347 land, not whether they flip back to a
match. Restoring correctness at those specific ticks needs `+67` AND the
shift fix AND (per §8e's own established pattern for the anchor frames)
likely the display-basis correction too - not independently confirmed for
this exact sub-list this session (flagged as open, consistent with §8e's
own caveat for the analogous 7305-7317 span).

**(c) Fate under a future §8d rounding-artifact fix:** relevant only to
the `{7326, 7327, 7335, 7336, 7344}` subset (the table-peak-adjacent
group) - and even there, moot in isolation: `+67` alone (§10c, already
confirmed live) already destroys their current match *before* any rounding
fix would apply, since the rounding fix only changes behavior exactly at a
table peak, and `+67`'s job is to relocate WHICH raw index each tick lands
on in the first place. The rounding fix's relevance to this group is
real but conditional - it becomes relevant again only after `+67` +
the shift fix + (likely) the display-basis fix are ALL composed and
re-measured fresh; asserting today whether it would restore these frames
to matching is not evidenced (correctly flagged as unresolved, not
guessed).

### 10e. Verdict for this continuation

**Goal 1: DONE.** `turn6KickoffBounceTick`'s call path is traced to
file:line (§10a) and its own raw-index delta is measured per-tick against
the committed receipt (§10b, no probe extension needed - coverage was
already sufficient). **There is no distinct `+K3` for this span** - most
of it (`[7318,7344]`) is still governed by the already-known `+67`/`else`-branch
formula and doesn't exercise `turn6KickoffBounceTick` at all; the small
slice that does (`[7345,7347]`) needs the same `+67` plus a separate,
tiny, already-precedented "missing shift" fix, not a new constant; the
frozen tail (`[7348,7350]`) has no dynamic RAM ground truth in this window
to calibrate anything against. A live pixel-diff detour (§10c) additionally
found and corrected a real gap in §8f's own fix shape (two call sites, not
one) - proven, not modeled, via a temporary before/after live compare.

**Goal 2: DONE, live-verified.** The 9 currently-matching frames are
explained (three distinct coincidence mechanisms, §10d) and their fate
under the `+67` fix is **directly measured, not predicted**: it is a
guaranteed regression for all 9 (plus 7318), contradicting this step's own
brief hypothesis - flagged loudly per this doc's established convention
(§8e already flagged the *general* risk of `+67` looking like a regression
without the display-basis fix; this session confirms it concretely for
this exact frame list and this exact call-site gap).

**Goal 3: NOT attempted**, per the step's own priority order - required
goals 1/2 consumed the full budget, plus the live-verification detour that
uncovered §10c's real fix-shape gap.

**What should the next fix rung(s) land, in what order?** (1) The
two-call-site `+67`/`indexOffset` fix (§10c: `battleScene.ts:14768` AND
`:10829`, landed together - not one without the other). (2) The
`turn6KickoffBounceTick` missing-shift fix (§10b: its raw branch should
return `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`, matching its sibling). (3)
Separately and orthogonally, the display-basis fix (owned elsewhere,
§7a/§8e) - needed before the 9-frame regression in (a) can be *recovered*
correctly rather than just relocated. (4) The §8d/§9e table-peak rounding
fix, last, and only re-measured once (1)-(3) are all composed - not before
(§10d's own finding: measuring it in isolation against today's baseline
would misattribute credit, since most of the "every 9 ticks" coincidences
it might seem to explain are destroyed by step (1) regardless of whether
(4) ever lands). **Before landing window A's own `+116` fix (§9), check for
the SAME two-call-site gap this session found for window B (§10c)** - not
checked this session, a real risk given the structural similarity
(`drawTurn5RockSlideAttack`'s onix call is shared code, not window-B-specific).

## 8. Continuation 3 (2026-08-17, bounded SIDE worker): the §7c instrument run, a dead-end cross-reference, and the raw-index anchor correction landed to an exact number

Executes this step's goal 1 (required: run the §7c `n`-tap instrument and
land the healthbox correction to a number) - **DONE, but with a corrected
premise**: the instrument as specified in §7c ("cross-reference this
window's `n` against the turn-5 settled-menu-redraw window's own `n` at
the same call site") turns out to be **comparing one call site against
itself** - see §8a. The real, load-bearing measurement this session is a
**direct RAM-receipt cross-check** (§8b) that lands the correction to an
exact closed-form number: **`+67`, added to the raw (pre-mod-256,
pre-table-lookup) sine index shared by BOTH onix and healthbox** - not a
healthbox-only correction as §7c hypothesized. Goal 2 (family
classification) is started but not completed to per-frame granularity -
§8g. No `src/` file is committed edited (`git diff -- src/` is empty at
commit time); the tap used to gather §8a/§8c's live numbers was reverted
before this commit, exactly as in every prior continuation.

### 8a. The `n`-tap: only ONE call site exists for this window, not two

§7c's own text framed the next instrument as: tap `menuIdleBounce`'s `n`
at window B's own call site AND at "whatever call site turn 5's own
settled-menu redraw (`TURN5_SITRUS_MENU_REDRAW_TICK=7222`) uses
`turn5SitrusResettledBounceTick` for," then compare. Reading
`drawTurn5RockSlideWindow` (`battleScene.ts:14781-14820`) end to end
answers this directly: **the settled-menu-redraw window IS window B's own
call site.** `drawTurn6FieldBase(fb, t, latestCompletedCommandHandoff)` is
called **unconditionally** at the top of `drawTurn5RockSlideWindow`
(line 14788), before ANY branch on `t` - the same call fires for every
tick from turn 5's own confirm press through 7312 (and, per §6a, its
turn-6-DMA-wait sibling `drawTurn6ActionMenuIdleWindow` continues feeding
the exact same `menuIdleBounce(turn5SitrusResettledBounceTick(...))`
formula through 7317). `TURN5_SITRUS_MENU_REDRAW_TICK` (7222) only gates
which **message text** is drawn afterward (`t < TURN5_SITRUS_MENU_REDRAW_
TICK) return;` at line 14818) - the field-base bounce draw above it is
unconditional. So "tap the settled-menu-redraw window's own `n`" and "tap
window B's own `n`" are **the same tap on the same line**
(`battleScene.ts:14765`), confirmed live: a temporary `console.error` at
that line, gated `t>=7300 && t<=7318`, run once via `NTAP=1 npm run
compare -- turn6-reopen-off --summary` and once via `NTAP=1 npm run
compare -- turn5-sitrus-d --summary` (a legacy trace whose own captured
window, 7180-7312, spans the settled-menu-redraw era), printed **byte-
identical `n`/`onixY2`/`hbY2` values at every shared tick** (7305-7312).
**Verdict on §7c's own framing: there is no second call site to
cross-reference against** - the "-5474" anchor cannot be "miscalibrated
for window B specifically vs. some other window" because window B's own
early span (up to 7306, already a live exact-match anchor per §7b) and
the disputed 7307-7316 band are rendered by the literal same line of code.

### 8b. A dead-end noticed and corrected before it produced a wrong conclusion: `turn5-sitrus-d.json` runs on the WRONG oracle

The `n`-tap cross-reference above was first attempted using
`turn5-sitrus-d.json` as the "known pixel-correct" comparison trace (it
captures 7180-7312, squarely covering the disputed span, and scored
**133/133 matched** on a live rerun). Before trusting that as ground
truth, oracle PNGs from both runs were diff'ed directly
(`shasum -a 256` + a numpy pixel diff): the APP's own rendered PNG at
frame 7307 is byte-identical between the two runs (confirms §8a - same
formula, same `t`, same output), but the **ORACLE's own PNG differs** -
1579px, exactly the healthbox bbox. Root cause: `turn5-sitrus-d.json`
(and its `-a/-b/-c` siblings) predate this lane's `oracleProfile` field
convention and **do not set `"oracleProfile": "battle-scene-off"`** -
`tools/compare/run.ts:74` defaults missing `oracleProfile` to
`"battle-scene-on"` (documented in `AGENTS.md`: "Historical traces
without that field remain ON-profile traces"). So `turn5-sitrus-d.json`'s
133/133 was scored against the **Battle Scene ON** oracle
(`127.0.0.1:8012`), a different profile with different move/animation
timing - **not a valid ground-truth cross-reference for this OFF-profile
lane's own window B.** This is flagged explicitly as a trap for future
sessions: **always check a trace's own `oracleProfile` field (or its
absence) before treating its PASS/FAIL as ground truth for a specific
lane's oracle** - a trace name alone ("turn5-sitrus-*") gives no signal.
Discarding this cross-reference entirely (per §8a, it was never a second
call site anyway, so nothing of value is lost), the actual instrument that
lands the correction is the ALREADY-COMMITTED, correctly-OFF-profile RAM
receipt from §1 (`src/data/gen/turn5-6-reopen-bounce-probe.json`),
re-read directly rather than re-probed (no new oracle call needed).

### 8c. The correction, landed to an exact number: `+67` on the shared raw sine index

For every tick `t` in the receipt's window-B range (7300-7346, RAM ticks,
`src/data/gen/turn5-6-reopen-bounce-probe.json`), compute the model's raw
(pre-mod-256) sine index the same way `menuIdleBounce`/`onixSinIndex`/
`healthboxSinIndex` do (`battleMenu.ts:812-819,825-833`): `n = t - 7223`
(i.e. `turn5SitrusResettledBounceTick(t) - 1 - MENU_BOUNCE_RAM_SETUP_TICK`,
folding the doc's own `-5474` anchor and `menuIdleBounce`'s internal
`ramTick-1`/`-1748` steps into one closed form), `onixRaw = 192 + 7n`,
`hbRaw = 128 + 7n`. Comparing `(RAM_raw - model_raw) mod 256` against the
receipt's own `onixSinIndex`/`healthboxSinIndex` fields at every one of
14 consecutive ticks 7300-7313:

```
tick: 7300 7301 7302 7303 7304 7305 7306 7307 7308 7309 7310 7311 7312 7313
diff:   67   67   67   67   67   67   67   67   67   67   67   67   67   67
```

**Exactly 67, for BOTH onix and healthbox, at every one of the 14 ticks,
zero exceptions.** This directly falsifies §7c's "candidate (c)"
(a healthbox-*specific* anchor miscalibration) - the correction is
IDENTICAL for both fields, so it belongs upstream of where the seeds
(128 vs 192) diverge, i.e. it is an offset on the shared `n`-derived raw
index itself (equivalently: a `+67` fold-in wherever `7*n` is computed,
NOT a change to either seed constant). At 7314-7315 the diff shrinks to
60 then 53 - **exactly** accounted for by the ALREADY-KNOWN, separately-
scoped 3-tick reopen-press hold (goal 2 from continuation 1/2: RAM holds
constant for 2 transitions, 7313->7314 and 7314->7315, while an unfrozen
model keeps advancing by 7/tick, so the gap shrinks by 7 per unmatched
transition: 67, 67-7=60, 60-7=53) - and from 7315 through the end of the
driver's active window (7346, the last tick before "kickoff text takes
over" per §1) **the diff stays locked at exactly 53, for all 32
consecutive ticks, zero exceptions**, confirming the hold is fully
absorbed as a permanent 2-tick lag once both corrections are combined (see
formula below) - not a fresh, unexplained drift.

**Combined closed-form validated against the RAM receipt, all 47 ticks
7300-7346 (not just the disputed band - per this step's own instruction):**
```
tEff(t) = t                              for t < 7313
        = 7313                            for 7313 <= t <= 7315   (goal-2 freeze)
        = t - 2                           for t > 7315             (permanent lag)
n = tEff(t) - 7223
onixRaw = 192 + 7n + 67   (mod 256, then table lookup, then +1 for Y2)
hbRaw   = 128 + 7n + 67   (mod 256, then table lookup, then +1 for Y2)
```
Checked against the receipt's own `onixSinIndex`/`healthboxSinIndex` raw
fields (not just the derived Y2): **47/47 ticks match exactly, zero
exceptions** - the `+67` correction, combined with the already-scoped
freeze, reproduces real hardware's raw sine-index driver state perfectly
for the entire probed window. This is a materially stronger and
differently-shaped result than §7c's own hypothesis (an "~8-tick residual
beyond the seed-offset component" was the *magnitude* estimate there,
but this session's 67-unit constant is not expressible as a whole-tick
`t`-shift at all - `67 / 7 = 9.57`, not an integer, so no "evaluate N
ticks earlier/later" formula could ever have reproduced it; only a
constant folded in *after* the `7*n` multiplication, before the table
lookup, works. This also confirms *why* every earlier small-integer-`t`-
offset candidate in §2b/§7c was cleanly falsified - none of them were the
right *kind* of correction, not just the wrong magnitude).

### 8d. A second, separate, narrower residual: a sine-table-peak rounding artifact (not this correction's job)

Checking the same 47 ticks at the **derived Y2** level (not raw index)
surfaces 6 exceptions: ticks (raw, pre-display-shift) 7305, 7316, 7317,
7326, 7335, 7344 - each exactly 9 ticks apart, i.e. wherever a field's
`+67`-corrected raw index lands exactly on a table quarter-boundary (0,
64, 128, 192 mod 256 - the sine table's zero-crossings/peaks). At these
specific indices the model's `floor(table[i]/256)+1` computation disagrees
with the RAM-recorded Y2 by exactly 1 (e.g. raw index 64: `table[64]=256`
literal per `trig.c`, `floor(256/256)=1`, model Y2=2; RAM's own recorded
`healthboxMainY2` at that exact tick is 1). **The raw sine index itself is
still exactly correct at all 6 of these ticks** (confirmed against the
receipt directly - only the table-to-Y2 rounding step disagrees) - this is
the SAME class of artifact `battleMenu.ts:770-785`'s own doc comment
already names for a different window/table version ("a spurious
`table[62]=256` flips y2 from 1 to a phantom 2... that the oracle never
actually shows"), now observed recurring at a peak of the CURRENT literal
table too. **This is out of scope for the `+67` correction and is not
fixed by it** - named here as a second, narrower, already-somewhat-
precedented defect for a future session (likely: real hardware's
`Sin(index, amplitude)` clamps or truncates differently right at the
table's exact peak/trough than a naive `floor(table[i]/256)+amplitude`
does). It affects a small, periodic (~1-in-9) subset of ticks, not the
bulk of the window.

### 8e. Composed prediction for `turn6-reopen-off` - corrects continuation 2's "16/46" claim

§7e/§7f's "16/46" figure predates this session's finding that the
correction is a raw-index constant, not a healthbox-only tick offset, and
(more importantly) did not account for the interaction between this
correction and the already-established `displayed(T) = RAM(T-1)` basis
(§7a) at the two anchor frames. Composing all three pieces precisely,
scoped to the span this session actually traced (displayed frames
7305-7317, rendered via `drawTurn5RockSlideWindow`/`drawTurn6FightSubmenu
Window`'s DMA-wait branch - both confirmed in §6a/§8a to share the exact
formula this correction targets; frames 7318+ dispatch through a
*different*, unexplored call site, `turn6KickoffBounceTick`, per §6e -
out of scope):

- **`+67` alone (no freeze, no display-basis fix) or freeze alone: neither
  is sufficient** - already established (§6c/§7e for the freeze; §8c's
  own diff table for `+67` alone would still be off by a full tick's
  render-lag at every point).
- **Freeze + `+67`, WITHOUT the display-basis fix** (i.e. if a fix step
  lands only the `menuIdleBounce`/`turn5SitrusResettledBounceTick`-side
  correction and the goal-2 freeze, but the separate `displayed(T)=RAM
  (T-1)` rendering-lag correction from continuation 2 §7a is not also
  applied at this call site): predicted matches in [7305,7317] = **9**
  frames (7307-7315) - UP from the current 2 (7306, 7317), but those 2
  anchors themselves flip to mismatching (the current formula's "accidental"
  1-tick-early alignment, per §7c/§7f, is exactly what makes them pass
  today; a raw-index-correct-but-not-display-lag-corrected formula no
  longer benefits from that accident). Net for this span: 11-2+9=**18/46**
  overall (assuming the 9 currently-matching frames outside this span,
  listed below, are unaffected).
- **Freeze + `+67` + the display-basis fix, all three composed** (the
  intended end state): predicted matches in [7305,7317] = **11 of 13**
  frames (7305, 7307-7316) - the 2 exceptions are displayed frames 7306
  and 7317 themselves, whose basis tick (7305 and 7316 respectively) are
  two of §8d's own 6 residual ticks. Net for this span: 11 (was 2). Total
  = 11 (currently matching, all OUTSIDE this span - see below) + 11 (this
  span, up from 2) = **20/46**, with 7306 and 7317 as the two
  newly-introduced (but narrowly-scoped, §8d-explained) failures.

**The 9 currently-matching frames outside [7305,7317]**, confirmed via a
fresh live rerun this session (`npm run compare -- turn6-reopen-off
--summary`, full 46-frame list cross-checked against `captureFrames`):
`{7326, 7327, 7335, 7336, 7344, 7345, 7348, 7349, 7350}`. Frames 7326,
7335, 7344 are - strikingly - the SAME "every 9 ticks" residual cadence as
§8d's own list, strongly suggesting the *same* table-peak artifact (or its
mirror) is already coincidentally in play past 7318 too, through the
UNEXPLORED `turn6KickoffBounceTick` call site - **not traced this
session**, so whether the display-basis fix (if implemented as a broader,
non-call-site-local change) would perturb these 9 frames is a real,
flagged unknown for the fix step, not asserted either way here.

**Best-supported single number: ~20/46**, contingent on (a) the
display-basis fix landing at this call site specifically (owned
elsewhere, per this step's brief, by a parallel main-lane freeze
worker - confirm its scope before relying on this figure) and (b) frames
7318+ being genuinely unaffected by whatever that fix touches. If the
display-basis fix does NOT land alongside `+67`+freeze, expect **18/46**
instead, with frames 7306/7317 as REGRESSIONS from their current passing
state - **a fix step landing `+67` without ALSO confirming the
display-basis correction is active at this call site would look like a
partial regression on a live rerun**, worth flagging loudly rather than
silently accepting a lower number than hoped.

### 8f. Fix shape and exact location

The correction belongs in `battleMenu.ts`'s `onixSinIndex`/
`healthboxSinIndex` (lines 813-819) OR in `menuIdleBounce` itself
(line 825-833) - **not** in `turn5SitrusResettledBounceTick`
(`battleSceneCanonical.ts:1019-1020`, unchanged/correct) and **not** via
any change to the `t`/`bounceTick` argument threaded through
`drawTurn6FieldBase` (§8c: a `t`-domain shift cannot express a
non-multiple-of-7 correction). Because `menuIdleBounce` is shared by
~20 other call sites across `battleScene.ts` (turns 3, 7, 8, 9, 10, the
kickoff-bounce family, etc.), most already oracle-pinned, **the `+67`
must NOT be a global change to `onixSinIndex`/`healthboxSinIndex`'s
seed constants** - it needs a new, defaulted parameter (idiom already
established throughout this file: "generalize a hardcoded value into a
defaulted param, every pre-existing call site unaffected"), e.g.
`menuIdleBounce(t, indexOffset = 0)` adding `indexOffset` to both raw
indices before the mod/table-lookup step, with `drawTurn6FieldBase`'s own
call (`battleScene.ts:14765`) passing `67` explicitly - the ONLY call
site this session traced needing it. Whether ticks 7318+
(`turn6KickoffBounceTick`'s own call path) need the SAME or a different
offset is unresolved (out of scope, §8e). The goal-2 freeze itself
(3-tick hold at `turn6ReopenPressTick`) is unchanged from continuation
2's own fix shape (§6f) and composes with `+67` exactly as modeled in
§8c - implement the freeze first (it is the smaller, self-contained
change), then re-verify against §8c's 47-tick table before adding the
offset, since the offset's own correctness was validated ASSUMING the
freeze is present.

### 8g. Goal 2 (family classification): started, not completed to per-frame granularity

Fresh `npm run compare --summary` reruns of all six named traces
(all confirmed `"oracleProfile": "battle-scene-off"` - no §8b-style trap):

| trace | captureFrames | matched | bbox signature |
|---|---|---|---|
| `turn5-confirm-off-a` | 5958-6089 (132) | 8/132 | MIXED: 4 frames onix-only (`44,49-99,111`, 6066-6069 - class (i) shape), 5 frames healthbox-only (`127,7x-229,11x`, 6078/6083-6086 - class (ii) shape), remainder large multi-region bboxes (up to `44,49-229,111`, 8%+ diff) - class (iii) |
| `turn5-confirm-off-b` | 6090-6221 (132) | 0/132 | Almost entirely ONE large, near-constant bbox (`16,91-221,149`, ~2.5% diff, unchanged across ~18 consecutive frames) - class (iii), not this doc's mechanism at all (region includes text/banner rows, not just sprite/healthbox) |
| `turn5-resolve-off-a` | 6222-6417 (196) | 7/196 | Large bboxes only (`13,15-206,149` etc, 8-13% diff) - class (iii) |
| `turn5-resolve-off-b` | 6418-6613 (196) | 71/196 | Large-ish bboxes (`16,91-78,149`-shaped, shrinking smoothly over ~15 frames - looks like a text-reveal timing lag, not bounce) - class (iii) |
| `turn5-resolve-off-c` | 6614-6809 (196) | 149/196 | Large bboxes (`13,16-199,73`, ~10% diff, upper-screen - icon bar/banner region) - class (iii) |
| `turn5-resolve-off-d` | 6810-7005 (196) | 0/196 | Large bboxes (`16,71-195,149` then `9,71-238,158`, up to 22% diff) - class (iii) |

**Classification verdict:** only `turn5-confirm-off-a` (and marginally
`-b`, if its own frames just past 6090 continue `-a`'s tail pattern - not
confirmed) shows the small onix-only/healthbox-only bbox signature this
whole document's mechanism produces; even there it is a **minority** of
that trace's own 124 mismatching frames (9 of 124). **The overwhelming
majority of mismatches across all six traces are class (iii) other/
unknown** - large, multi-region bboxes (spanning text lines, banners, or
icon-bar rows well outside the `44,49-99,11x`/`127,7x-229,11x` regions
this doc's mechanism touches) that this session did not trace and cannot
attribute. **Predicted counts after (freeze+`+67`+display-basis) land:**
only derivable for the 9 small-bbox frames in `turn5-confirm-off-a`
(plausibly move to match, by the same mechanism as §8e, not individually
re-verified this session due to time) - the remaining ~85% of mismatches
across the family are blocked on a completely separate investigation
(large-region text/banner rendering, not bounce/healthbox timing) that
this step's budget did not reach. This is explicitly the SAME conclusion
§3c/§7 already flagged ("does NOT obviously predict turn5-confirm-off-*/
turn5-resolve-off-* moving to full") - confirmed, not merely repeated,
by this session's fresh per-trace bbox evidence.

### 8h. §5/§6e/§7e PASS/FAIL update

Rerunnable check for the `+67` correction (no oracle call needed - reads
the already-committed receipt):
```sh
python3 -c "
import json, math
d = json.load(open('src/data/gen/turn5-6-reopen-bounce-probe.json'))
rows = {r['tick']: r for r in d['ticks']}
GBA=[0,6,12,18,25,31,37,43,49,56,62,68,74,80,86,92,97,103,109,115,120,126,131,136,142,147,152,157,162,167,171,176,181,185,189,193,197,201,205,209,212,216,219,222,225,228,231,234,236,238,241,243,244,246,248,249,251,252,253,254,254,255,255,255,256,255,255,255,254,254,253,252,251,249,248,246,244,243,241,238,236,234,231,228,225,222,219,216,212,209,205,201,197,193,189,185,181,176,171,167,162,157,152,147,142,136,131,126,120,115,109,103,97,92,86,80,74,68,62,56,49,43,37,31,25,18,12,6,0,-6,-12,-18,-25,-31,-37,-43,-49,-56,-62,-68,-74,-80,-86,-92,-97,-103,-109,-115,-120,-126,-131,-136,-142,-147,-152,-157,-162,-167,-171,-176,-181,-185,-189,-193,-197,-201,-205,-209,-212,-216,-219,-222,-225,-228,-231,-234,-236,-238,-241,-243,-244,-246,-248,-249,-251,-252,-253,-254,-254,-255,-255,-255,-256,-255,-255,-255,-254,-254,-253,-252,-251,-249,-248,-246,-244,-243,-241,-238,-236,-234,-231,-228,-225,-222,-219,-216,-212,-209,-205,-201,-197,-193,-189,-185,-181,-176,-171,-167,-162,-157,-152,-147,-142,-136,-131,-126,-120,-115,-109,-103,-97,-92,-86,-80,-74,-68,-62,-56,-49,-43,-37,-31,-25,-18,-12,-6]
def bounceTickEff(t):
    if t<7313: return t
    if t<=7315: return 7313
    return t-2
ok=0
for t in range(7300,7347):
    n=bounceTickEff(t)-7223
    r=rows[t]
    assert (192+7*n+67-r['onixSinIndex'])%256==0
    assert (128+7*n+67-r['healthboxSinIndex'])%256==0
    ok+=1
print(f'raw-index PASS: +67 (freeze-composed) exact-matches RAM for all {ok}/47 ticks 7300-7346')
"
```
**§5's window-A count (5/32) is unaffected** - window A uses the
"legacy"/"submenu" formulas, not `turn5SitrusResettledBounceTick`, per
§2a/§7d; this session's correction does not touch that code path.
**§6e/§7e's window-B count is corrected to ~20/46** (from freeze alone
~18/46 if the display-basis fix isn't co-landed at this call site) per
§8e, superseding "16/46" - the mechanism itself is a raw-sine-index
constant shared by both fields, not a healthbox-only tick lag, and the
two current exact-match anchor frames (7306, 7317) are expected to become
new (but explained, §8d) failures rather than staying matched, unless the
display-basis fix is ALSO active at this exact call site.

### 8i. Verdict for this continuation

**Goal 1: DONE**, to an exact number. The `+67` raw-sine-index correction
(shared by onix and healthbox, applied after `seed + 7n`, before the
table lookup) is proven, not estimated - 47/47 raw-index ticks in the
committed RAM receipt match exactly once composed with the already-scoped
freeze. §7c's own "healthbox-specific anchor" framing is falsified (the
correction is field-agnostic); its "second call site" framing is also
corrected (there is only one). A second, separate, narrower defect (a
sine-table-peak rounding artifact, §8d) is newly surfaced and explicitly
left unfixed. The predicted count is corrected from continuation 2's
"16/46" to **~20/46** (or 18/46 without a co-landed display-basis fix),
with the exact number contingent on a fix owned outside this session's
scope (the display-basis correction, §7a) - named precisely enough
(§8f) for a fix step to implement and re-verify against §8h's check.

**Goal 2: PARTIALLY DONE.** All six family traces reconfirmed on the
correct oracle profile; bbox-shape classification done at the trace
level; only `turn5-confirm-off-a` shows this mechanism's own signature,
and only in a minority (9/124) of its own mismatching frames. The
remaining ~85% of the family's mismatches are class (iii)
(other/unknown, large multi-region bboxes suggesting text/banner
rendering, not bounce timing) - not investigated this session, named
explicitly as the blocker for predicting the family's other counts.

## 9. Continuation 4 (2026-08-17, bounded SIDE worker): window A's own raw-index constant (+116), display basis extended, §8d generalized

Executes this step's goal 1 (required: apply §8's raw-index method to
window A) - **DONE, landed to an exact number, `+116`** - and goal 2
(required: characterize §8d) - **DONE to the extent evidence supports**.
Goal 3 (stretch, `turn6KickoffBounceTick`) NOT attempted, per the step's
own priority order and the time budget. Method: two temporary
`console.error` taps (`NTAP97B4`-gated, one at `drawActionMenuIdleWindow`'s
`bounceTick` line, one at `drawFightSubmenuWindow`'s `idleWaitBounceTick`
line) run once via `NTAP97B4=1 npm run compare -- turn5-action-off
--summary`, plus one new read-only RAM/pixel probe (`tools/probe/dump-
turn5-action-display-basis-probe.py`, adapted from §7a's own script with
`TICK_RANGE` moved to window A's own onset, `TRACE_PATH` already pointed
at `turn5-action-off.json` upstream - unchanged). **Both taps reverted
before this commit** - `git diff -- src/` is empty. New committed receipt:
`src/data/gen/turn5-action-display-basis-probe.json`.

### 9a. Window A's own call-site map, confirmed live (extends §2a past its own pinned [5927,5931] edge)

The live tap resolved the open question from this step's brief ("the span
past 5931 dispatches through what call site?") for free, in the same run:

- `t == turn5ReopenPressTick` (5927 only): `drawActionMenuIdleWindow`'s
  legacy branch, `turn5LegacyResettledBounceTickFromLatest(t, latest)` -
  unchanged from §2a.
- `t` in `[5928, 5931]` (pre-reveal DMA-wait): same function's submenu
  branch, `turn5SubmenuBounceTickFromLatest(t, latest)` - unchanged from
  §2a.
- `t` in `[5932, 5957]` (post-reveal, pre-confirm - `sm.confirmElapsed`
  stays `null` this entire span, confirmed live: the confirm-wait branch
  never fires): **`drawFightSubmenuWindow`'s own `idleWaitBounceTick`**
  (`battleScene.ts:8668-8683`), turn5Active branch:
  `turn5SubmenuBounceTickFromLatest(t, latest)` again - **the literal same
  formula**, called from a second, different line, with **zero
  discontinuity** at the `revealTick=5932` boundary (live-tapped sequence
  is a single unbroken `+1`/tick run, 2088 at 5928 through 2117 at 5957).
  This means §2a's "fully pinned [5927,5931]" domain was too conservative -
  the SAME formula (and, by extension, this session's correction) governs
  the entire `turn5-action-off` captureFrames span from 5928 through 5957.
- `t = 5920-5926` (before the reopen press): **not traced this session**
  (a third, untapped call site - the tap fired nothing before 5927, so
  whatever draws these six pre-press ticks is neither of the two dispatch
  points above). Out of scope for the fix (frame 5926, the one captured
  tick in this sub-span, already matches live today per §9c - untouched by
  either correction below) - named, not chased, per this step's own time
  budget.

### 9b. The raw-index constant, landed to an exact number: `+116`

Same method as §8c, applied to window A's own formula chain. For every
tick `t` in `[5927, 5957]`, using the live-tapped `bounceTick` (§9a) fed
through `menuIdleBounce`'s own internal `n = bounceTick - 1749` (folding
its `ramTick = bounceTick - 1` and `n = ramTick - MENU_BOUNCE_RAM_SETUP_TICK
(1748)` steps into one closed form, exactly as §8c did for window B's
`turn5SitrusResettledBounceTick`), comparing `(RAM_raw - model_raw) mod
256` against the committed receipt's own `onixSinIndex`/`healthboxSinIndex`
fields:

```
tick:  5927 5928 5929 5930 5931 5932 ... 5957  (using the OBSERVED,
diff:   116  123  116  116  116  116 ...  116   un-frozen bounceTick)
```

**Exactly 116, for BOTH onix and healthbox, at every tick except 5928**
(where the diff bumps to 123 = 116+7). The single exception is fully
explained, not a residual: it is the ALREADY-KNOWN §1/§4 defect - the
live `bounceTick` sequence dips to 2088 at 5928 before continuing (the
"legacy tick uses the unshifted formula, then resumes shifted" artifact),
one tick lower than the smooth continuation, which shifts the raw index by
exactly one delta-step (7). Applying the ALREADY-SCOPED §4 item 1 freeze
(hold `bounceTick` at its `t=5927` legacy value, 2089, for `t` in
`[5927,5929]`) removes this single exception - re-run with the frozen
sequence, **the diff is exactly 116 at all 31 ticks 5927-5957, zero
exceptions**. Composed closed form (mirrors §8c's box for window B):

```
tEffApp(t) = bounceTick(t)                          # per 9a's live-tapped map
bounceTickEff(t) = 2089                              for t in [5927,5929]  (freeze)
                  = bounceTick(t)                     otherwise (unchanged)
n = bounceTickEff(t) - 1749
onixRaw = 192 + 7n + 116   (mod 256, then table lookup, then +1 for Y2)
hbRaw   = 128 + 7n + 116   (mod 256, then table lookup, then +1 for Y2)
```

**This answers the brief's core question directly: window A has its OWN
exact field-agnostic raw-index constant, `+116`, distinct from window B's
`+67`.** Like `+67`, `116` is **not a multiple of 7** (`116/7 ≈ 16.57`) -
no integer number of "evaluate N ticks earlier/later" against `t` could
ever reproduce it; only a constant folded in after the `7*n` step, before
the table lookup, works. **This directly explains the MAIN-lane rung-1
refutation cited in this step's brief**: enumerating every reachable
`bounceTick` in `~2069-2097` for a `healthboxY2=1` fix could never
succeed, because the correct fix is not a `bounceTick`-domain value at
all - it's an index-domain additive constant that no `bounceTick` input
can express through the existing formula. The two "refuted" freeze
variants were missing exactly this term.

### 9c. Display basis, verified (not assumed) at window A's own ticks

New probe (`tools/probe/dump-turn5-action-display-basis-probe.py`,
`TICK_RANGE=[5918,5940]`, same protocol-identity guarantees §7a already
established for `oracle/server.py`'s capture loop) records RAM Y2 plus a
crop-hash of the same two compare-tool bboxes (onix `44,49-99,110`,
healthbox `127,74-229,110`, confirmed applicable to window A too by this
session's own live rerun, §9d) for every tick 5918-5940. Comparing
consecutive-tick RAM transitions against consecutive-tick crop-hash
transitions in that same run (receipt: `src/data/gen/turn5-action-
display-basis-probe.json`):

| field | RAM value changes at tick | crop pixels visibly change at tick | lag |
|---|---|---|---|
| healthbox | 5919 (0->1) | 5920 | **+1** |
| healthbox | 5930 (1->2) | 5931 | **+1** |
| healthbox | 5931 (2->1) | 5932 | **+1** |
| onix | 5931 (1->0) | 5932 | **+1** |

**All four observed transitions lag the RAM write by exactly one tick,
zero exceptions** - the same `displayed(T) = RAM(T-1)` basis §7a proved
for window B is independently confirmed at window A's own ticks, not
assumed by analogy. This is expected (the lag is a property of the
oracle's own capture protocol / real GBA OAM-scanout ordering, uniform
across every window it captures), but per this step's own instruction it
is verified here from window-A-specific evidence, not inferred.

### 9d. Composed prediction for `turn5-action-off`

Two scenarios, mirroring §8e's own split (the display-basis correction is
owned by a parallel effort - confirm it is active at this call site before
trusting the higher figure):

**Freeze + `+116`, WITHOUT the display-basis fix co-landed at this call
site** (app(T) compared directly against oracle's true RAM(T-1)-basis
display): predicted matches for `t` in `[5927,5957]` = **24/31** (7
tick-level failures: 5927, 5928, 5929 - the SAME single frozen `bounceTick`
value, 2089, whose raw healthbox index lands exactly on table index 64 - a
§8d-class artifact tripled by the freeze itself, not a new defect; plus
5930, 5939, 5948, 5957, each 9 ticks apart, the same periodic table-peak
cadence §8d already named for window B). Plus frame 5926 (already
matching today, outside either correction's domain, untouched). **Total:
25/32.**

**Freeze + `+116` + the display-basis fix, all three composed** (the
intended end state, assuming the display-basis correction is wired at
this call site too): predicted matches for `t` in `[5928,5957]` = **24/30**
(6 failures: 5928-5931 - the same frozen-value table-peak cluster, now
straddling the display shift - plus 5940, 5949, each landing one tick
after 9-apart peaks 5939/5948 per the T-1 basis). Frame 5927 is
**not conclusively resolved this session** - its target is `RAM(5926)`,
which needs the app's own `bounceTick` at `t=5926`, a call site §9a left
untraced; a numeric extrapolation (continuing the plain submenu formula
one tick further back, `bounceTick(5926)=2086`) predicts a match
(`model=(1,1)` vs `RAM(5926)=(1,1)`) but is **not source-confirmed**,
named as an open edge rather than claimed. If it holds, plus frame 5926
(already matching): **total 26/32**; if it doesn't, **25/32**.

**Both scenarios land in the same narrow 25-26/32 band** (up from the
current 1/32) - the display-basis fix's presence/absence barely moves
window A's count, unlike window B where it mattered more (§8e's 18 vs 20
of 46), because most of window A's span sits on wide sine plateaus where a
1-tick basis shift doesn't cross a Y2 boundary. **§5's prior "5/32"
estimate (from continuation 2, before the raw-index method existed) is
superseded** - it under-counted because it didn't yet know about the
`+116` constant or the table-peak residual; it's also now known to be
achievable only up to ~25-26/32, not the full 32/32, because of the
permanent §8d-class residual named above.

### 9e. §8d generalized: it is a real hardware sine-table/rounding disagreement, not a table-transcription error, and it is not healthbox-only

**Is the app's `GBA_SINE_TABLE_256` itself wrong, or is the derivation's
rounding rule wrong?** The table is not wrong: `GBA_SINE_TABLE_256[64] =
256` (literal, `battleMenu.ts:787-804`) is an EXACT copy of
`reference/pokeemerald/src/trig.c`'s own `gSineTable[64]` entry (both
sessions that built this table cross-checked it against the vendored
source, per the table's own doc comment, `battleMenu.ts:770-785` - not
re-verified against `trig.c` fresh this session, but no new evidence
contradicts it). The disagreement is in the **derivation rule**:
`bounceSin` computes `y2 = floor(table[index]/256) + 1`, a plain
arithmetic floor-then-add. At `index=64` this gives `floor(256/256)+1 =
2`. Real hardware (per every RAM receipt row checked, both windows)
produces `1` at this exact index, every time. Since `256/256` is exactly
`1` with **zero fractional remainder** - not a rounding-direction
ambiguity (which would flip between two adjacent integers depending on
tie-breaking) - the real GBA `Sin(index, amplitude)` function
(`trig.c:515-518`) most likely computes something subtly different at the
table's own literal peak (index 64, value 256) than
`gSineTable[index] >> 8` naively suggests - e.g. a signed/unsigned
interpretation of the `Q8.8` peak value that clamps `256` to `255` before
the shift, or an amplitude multiply-then-shift ordering that isn't
associative with a literal `256` input. **Not resolved to the exact
hardware rule this session** (would need reading `trig.c`'s actual
`Sin()`/`Cos()` C implementation, not just its table - not done, time
budget) - named as the next instrument for whoever picks up the actual
fix.

**Is it healthbox-only?** NO - confirmed field-agnostic at BOTH windows
now. Window A's own peak cluster hits healthbox at index 64 (5927-5929)
and BOTH onix+healthbox together at 5930 (a different, simultaneous
crossing - onix's raw index 135 and healthbox's raw index 71 are 64 apart,
the fixed onix/healthbox seed gap, and both happen to cross a rounding
edge in the same tick here), then onix alone at 5948 and healthbox alone
at 5939/5957 - i.e. it hits whichever field's raw index happens to be near
a table quarter-boundary at a given tick, consistent with §8d's own
"~1-in-9" cadence and NOT a healthbox-specific mechanism at either window.

**Fix shape and blast radius, extended:** confirms §8f's proposed shape
(a defaulted `menuIdleBounce(t, indexOffset = 0)` parameter) generalizes
cleanly to window A - window A's call sites (`drawActionMenuIdleWindow`'s
`bounceTick` line, `battleScene.ts:8323`; `drawFightSubmenuWindow`'s
`idleWaitBounceTick` line, `battleScene.ts:8684`; and, if the domain
extends there too but NOT traced this session, its `confirmWaitBounceTick`
line, `battleScene.ts:8639`) would pass `indexOffset=116` explicitly - a
**different** literal from window B's `67`, since it is a different
formula chain (`turn5LegacyResettledBounceTickFromLatest`/
`turn5SubmenuBounceTickFromLatest`, not `turn5SitrusResettledBounceTick`).
This keeps the change call-site-local: `menuIdleBounce`'s other ~18
already-pinned callers keep the default `indexOffset=0` and are
byte-identical. The table-peak rounding fix itself (whatever it turns out
to be - §9e's own open item) is a SEPARATE, smaller change inside
`bounceSin`/`menuIdleBounce` proper - since it depends only on the
resolved raw index value (already `mod 256`, after any `indexOffset` is
folded in), it is automatically shared correctly by every caller once
fixed there once; it does not need to be call-site-local itself.

**Exact frames this class of artifact explains or must not regress,
consolidated across both windows:**
- Window B (§8d, already-known): raw ticks 7305, 7316, 7317, 7326, 7335,
  7344, plus anchors 7306/7317 (the two frames that currently accidentally
  MATCH today only because of the OLD, un-K-corrected formula - §8e already
  flags these as expected to flip to new, but explained, failures once
  `+67` lands).
- **Outside-span, currently-matching frames that a broad (non-call-site-
  local) rounding fix must not regress:** `{7326, 7335, 7344}` - these are
  currently in the "9 currently-matching frames outside [7305,7317]" list
  (§8e) and dispatch through the STILL-UNEXPLORED `turn6KickoffBounceTick`
  call site (goal 3, not attempted this or any prior session). **How to
  avoid regressing them:** land the table/rounding fix (whatever its exact
  form) as a pure function of the resolved post-`indexOffset` raw index,
  with NO call-site gating of its own - if `turn6KickoffBounceTick`'s own
  raw index formula is EXACTLY correct already (unverified - it is
  unexplored, not confirmed correct) and these three frames' current match
  is coincidental rather than exact, a rounding-only fix could still
  change them; the safe order is: land `indexOffset` (call-site-local,
  zero-risk to unrelated callers) FIRST, re-run `npm run compare --
  turn6-reopen-off --summary` to confirm `{7326,7335,7344}` are still
  exact matches (they are untouched by any `indexOffset` change since that
  call site isn't listed as touched), THEN attempt the rounding fix and
  immediately re-check the same three frames as a regression gate.
- Window A (new this session): raw ticks 5927, 5928, 5929 (one shared
  cluster - the frozen `bounceTick=2089`'s healthbox index sits exactly on
  table index 64), 5930 (both fields, a coincident onix+healthbox
  crossing), 5939, 5948, 5957 (single-field, 9-tick cadence, same class).
  No currently-matching frames in `turn5-action-off`'s own family are at
  risk from this class today (the trace is 1/32 now - matching frame 5926
  is outside this mechanism's domain entirely, per §9a).

### 9f. §5/§8h PASS/FAIL update

Rerunnable check for the `+116` correction (no oracle call needed - reads
the already-committed receipt):
```sh
python3 -c "
import json
d = json.load(open('src/data/gen/turn5-6-reopen-bounce-probe.json'))
rows = {r['tick']: r for r in d['ticks']}
def bt(t):
    if t == 5927: return 2089
    if t in (5928, 5929): return 2089          # goal-2-style freeze, already scoped in §4
    return t - 3840                             # plain submenu continuation, t>=5930
ok = 0
for t in range(5927, 5958):
    n = bt(t) - 1749
    r = rows[t]
    assert (192 + 7*n + 116 - r['onixSinIndex']) % 256 == 0
    assert (128 + 7*n + 116 - r['healthboxSinIndex']) % 256 == 0
    ok += 1
print(f'window-A raw-index PASS: +116 (freeze-composed) exact-matches RAM for all {ok}/31 ticks 5927-5957')
"
```
**§5's window-A count is corrected again**, superseding continuation 2's
"5/32" (§7e): expect **25/32** once freeze+`+116` land WITHOUT a co-landed
display-basis fix at this call site, or **~25-26/32** with it (§9d) - not
32/32, because of the permanent, separately-scoped §8d/§9e table-peak
residual (7 raw-basis / 6 display-basis ticks, bounded and named above,
not part of this correction's job).
**§8h's window-B count (~20/46) is unaffected** - window A uses a
completely different formula chain and a different constant (`116` vs
`67`); nothing in this continuation touches window B's own numbers.

### 9g. Verdict for this continuation

**Goal 1: DONE**, to an exact number. Window A's own field-agnostic
raw-sine-index constant is **`+116`** (distinct from window B's `+67`),
proven (not estimated) against the committed RAM receipt with zero
exceptions once composed with the already-scoped 3-tick freeze. The
display basis `displayed(T) = RAM(T-1)` is independently CONFIRMED at
window A's own ticks (new probe, 4/4 transitions lag by exactly one tick,
zero exceptions) - not assumed by analogy to §7a's window-B result. The
composed prediction is **25-26/32** for `turn5-action-off` (up from 1/32),
contingent on the same external display-basis fix scope caveat §8e
already flagged for window B. This result directly explains the MAIN-lane
rung-1 fix step's refutation cited in this step's brief: `116` (like
`67`) is not a multiple of 7, so no `bounceTick` value in any enumerated
range could ever have produced the right answer - the missing term is a
raw-index-domain constant, not a tick-domain one.

**Goal 2: DONE to the extent time allowed.** The §8d artifact is
field-agnostic (not healthbox-specific) at both windows, traced to
`bounceSin`'s `floor(table[index]/256)+1` rule disagreeing with real
hardware specifically at the table's own literal peak/trough entries
(`256`/`-256`) - the table's own values are not in question, only the
derivation rule at those exact entries. Fix shape (a defaulted
`menuIdleBounce(t, indexOffset=0)` parameter, window A passing `116` and
window B passing `67` at their own call sites) is call-site-local and
does not touch `menuIdleBounce`'s ~18 other already-pinned callers. The
rounding/table fix itself is NOT call-site-local (it is a property of the
resolved raw index alone) - the exact hardware rule was not identified
this session (needs `trig.c`'s real `Sin()` source, not just its table),
and the regression-avoidance order for `{7326,7335,7344}` (§9e) is named
precisely enough for a fix step to follow.

**Goal 3 (stretch, `turn6KickoffBounceTick`): NOT attempted**, per the
step's own priority order - all budget went to goals 1/2, both required.

**Can a fix step now close `turn5-action-off` fully?** NO, and this is
now precisely quantified rather than open-ended: landing the freeze +
`+116` (± the display-basis fix) closes it to **25-26/32**, not 32/32 -
the remaining 6-7 frames are the permanently-out-of-scope §8d/§9e
table-peak residual, which needs its own separate rounding-rule fix
(named but not landed, §9e) to close further. This mirrors window B's own
situation exactly (§8i: ~20/46, not 46/46, for the identical reason).
