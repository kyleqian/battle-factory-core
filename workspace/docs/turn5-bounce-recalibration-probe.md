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
live, §7b).
