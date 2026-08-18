# `turn5-resolve-off-a`/`-b` mismatch-class census and mechanism diagnosis (ISSUES #97)

ANALYSIS ONLY — `git diff -- src/` is empty throughout this session (side-lane
contract, no production edits). Fresh `npm run compare` runs, RAM probes, and
direct pixel sampling of the saved diff/oracle/app PNGs, this session.

## 0. Baselines (fresh, this session, at `38134745`+later-merged-parent)

```
npm run compare -- turn5-resolve-off-a --summary   -> 44/196
npm run compare -- turn5-resolve-off-b --summary   -> 88/196
```

Both match the brief's cited numbers exactly (44/196, 88/196) — no drift
since the last landed fix. `turn5-resolve-off-a` mismatches span trace ticks
**6248–6416** (152 frames, contiguous with small gaps); `turn5-resolve-off-b`
mismatches span **6426–6560** (108 frames, contiguous with small gaps). Both
windows sit entirely inside the same real-oracle span this family's prior
sessions already RAM-timelined (`docs/turn5-family-class3-diagnosis.md` §14):
ONIX's ROCK_SLIDE text (real 6184) → GROVYLE hp-zero (real 6285) → GROVYLE
fainted-text (real 6378) → fainted-text settle (real 6562) → PIDGEOTTO
send-out text (real 6686, **past both windows' own end** — `resolve-off-b`
ends at 6613, 73 ticks before the send-out even starts, so neither window's
own remainder is a PIDGEOTTO/send-out mechanism).

## 1. Census method

Per the brief: build the census from the diff PNGs/manifest data *before*
probing RAM. Both fresh runs' `manifest.json` (`diffPixels`/`bounds` per
frame) plus every `diff-*.png`/`oracle-*.png`/`app-*.png` were read; bboxes
were clustered, then representative frames were cropped/zoomed (Python/PIL,
scratch, not committed — the committed artifact is this doc plus one new
probe script) and diffed pixel-by-pixel to name content. RAM was probed
*after* the census pointed at specific objects (GROVYLE's front sprite/
healthbox, the fainted-message wait-cursor), using the proven
`dump-turn5-resolve-grovyle-side-driver.py` pattern plus one new script,
`tools/probe/dump-turn5-resolve-ab-healthbar-driver.py` (committed), which
extends it with the on-screen HP-bar's own animated internals
(`gBattleSpritesDataPtr->battleBars[]`, `struct BattleBarInfo`,
`include/battle.h:580`) — needed to run down an initial false lead (§2).

## 2. False lead, resolved (record per the brief's "flag loudly" instruction — NOT a contradiction of any landed anchor)

A low-resolution glance at `oracle-06249.png` etc. looked like GROVYLE's HP
bar was rendering **full/green** in the real oracle while the app rendered
it near-empty/red — which would have directly contradicted the landed
Sweep-A finding (`GROVYLE hp` flat at 1 from tick ≤6180 through 6284, ISSUES
#97-C). A fresh RAM re-probe (`dump-turn5-resolve-grovyle-side-driver.py`,
6180–6420) **reconfirmed Sweep A exactly**: `gBattleMons[1].hp` flat `1`
(`maxHP=143`) from 6180 through 6284, stepping to `0` at 6285 — no change,
no contradiction. A second probe of the bar's own animated struct
(`dump-turn5-resolve-ab-healthbar-driver.py`) additionally confirmed the
**visual bar's own internal drain state** (`oldValue`/`receivedValue`/
`currValue`) already matches `hp=1` well before tick 6180 (a small
41→1 drain, already `currValue=0`/"done" by 6180) — i.e. the bar-animation
struct agrees with the stat, not with my initial misreading. A 6× zoomed
crop of the same frames (`/tmp/bar_strip_oracle.png` vs `/tmp/bar_strip_app.png`,
scratch) showed both oracle and app render the same thin, near-empty
red-sliver bar — my "full green" read was a thumbnail misjudgment (bright
cream healthbox-background color, not bar fill). **No landed anchor is in
question.** The real, un-thumbnail-misread mismatch is entirely in the
sprite/healthbox-position/cursor mechanisms below.

## 3. Census table

| class | frames (resolve-off-a) | frames (resolve-off-b) | bbox family | content |
|---|---|---|---|---|
| **A — ROCKSLIDE_PROFILE** (hit-flash blink + healthbox wobble mis-anchored, spurious Y2 shake) | 112 (ticks 6248–6359) | 0 | `13,0-230,73` (healthbox+sprite region), 2 sub-shapes: ~1400px (wobble-only) and ~2700-3900px (wobble+blink), plus 6 huge spikes 12000-13874px (`0,0-239,111`, blink+shake compounding) | GROVYLE's front sprite present/absent and vertically shaking when it should be static, plus a 1px healthbox-outline wobble out of phase |
| **B — SINK-TAIL residual** (transition into the already-correctly-anchored faint-sink, not independently re-diagnosed) | 17 (ticks 6360–6376) | 0 | `13,16-227,73` shrinking to `118,26-226,73` | GROVYLE sprite/healthbox mid-sink; likely dominated by class A's own shake contaminating the hand-off, not confirmed standalone |
| **C — CURSOR_FREEZE** (fainted-message wait-cursor stops after climbing to offset 2 instead of continuing the real perpetual 4-phase bounce) | 3 confirmed direct hits (6398, 6407, 6416) + overlaps the tail of the 23-frame 6377–6416 span | **108 (100% of window, ticks 6426–6560)** | `61,140-67,147`/`61,140-67,148` (fixed 6×7-8px box) | The small heart-icon "waiting" cursor beside "Foe GROVYLE fainted!" — Y-offset wrong by 1-2px on 3 of every 4 nine-tick phases |

`resolve-off-b` has **only 2 distinct bboxes across all 108 mismatched
frames**, both exactly the cursor box — this window is a single-class
window, fully explained by C.

## 4. Class A — `drawTurn5RockSlideAttack` uses the wrong (default) hit-reaction profile

### 4a. Evidence

`drawTurn5RockSlideAttack` (`src/engine/battleScene.ts:10904`) calls all
three of the shared generic hit-reaction helpers
(`rockSlideMonBlinkInvisible`, `rockSlideMonShakeY2`,
`rockSlideHealthboxWobbleY2` — `src/engine/battleMenu.ts:2151-2186`) **with
no `profile` argument**, i.e. the shared default
`ROCK_SLIDE_ANIMATION_PROFILE` (`battleMenu.ts:1948`, `hitFlashAnchorAge:
562`, `targetShakeStartAge: 443`, `targetShakeEndAge: 536`). Every sibling
turn that reuses these same helpers on its own Rock-Slide-family hit
(`TURN1/TURN3/TURN4/TURN9/TURN10/TURN11_OFF_ROCKSLIDE_ANIMATION_PROFILE`,
`battleSceneCanonical.ts:1021-1029,1679,1811,1889,2004`) already gives
itself a **scoped profile object** overriding `hitFlashAnchorAge` to its own
RAM-measured value — turn 5's own call site is the one turn in this family
that never got one.

Fresh per-tick pixel sampling of GROVYLE's front-sprite region
(`x∈[135,215], y∈[5,65]`, oracle vs. app, `run-2026-08-18-19-42-09Z-16486`):

**Real oracle** (`TURN5_ROCKSLIDE_PRESS_TICK=5829`):
- Sprite visible continuously 6222–6248.
- **Blinks 4-on/4-off exactly 4 times**: invisible 6249-52, visible
  6253-56, invisible 6257-60, visible 6261-64, invisible 6265-68, visible
  6269-72, invisible 6273-76, then **visible continuously from 6277
  onward** (checked through 6299; the sink takes over at 6360).
- **Never shakes** — a fixed reference pixel (sprite's top row, sampled at
  x=165) sits at row 21 for the *entire* window 6222-6359 whenever the
  sprite is visible; the only row change is the already-landed sink onset
  at 6360 (row climbs 21→29→37→45→53, exactly matching
  `GROVYLE_FAINT_SINK_START_TICK=6360`).

**App (current, buggy)**:
- Sprite visible **continuously**, no blink at all, from 6222 through 6369
  (own diff-detected disappearance only once the sink consumes it) —
  because the default profile's `hitFlashAnchorAge=562` places the blink
  window at `t∈[6393,6424]`, entirely outside this compare window (past
  where the sink/vanish gate has already turned the draw off).
- **Does shake**: the same reference pixel alternates `21,21,26,26`
  (a period-4 `[5,5,0,0]` pattern, i.e. `rockSlideMonShakeY2`'s own table)
  from **exactly 6272 through 6358/6360** — matching
  `pressTick+targetShakeStartAge = 5829+443 = 6272` and
  `pressTick+targetShakeEndAge = 5829+536 = 6365` (the sink takes over
  fractionally before natural end) to the tick.

Both the wobble (`rockSlideHealthboxWobbleY2`, already-established doc
comment: `d = t-1-(pressTick+hitFlashAnchorAge)`, active `d∈[0,19]`) and
blink (`rockSlideMonBlinkInvisible`, `d∈[1,32]`, 4-tick half-periods) share
the **same** `hitFlashAnchorAge` field. Solving the blink's own 8 measured
transition ticks against `d=t-1-(pressTick+age)`:

| real transition tick | predicted `d` at `age=418` | phase |
|---|---|---|
| 6249 (first invisible) | 1 | invisible (floor(0/4)=0, even) |
| 6253 (visible) | 5 | visible (floor(4/4)=1, odd) |
| 6257 (invisible) | 9 | invisible (floor(8/4)=2, even) |
| 6261 (visible) | 13 | visible |
| 6265 (invisible) | 17 | invisible |
| 6269 (visible) | 21 | visible |
| 6273 (invisible) | 25 | invisible |
| 6277 (visible, and stays) | 29 | visible; d=33 at t=6281 exceeds the 32-tick window → permanently visible |

**All 8 transitions match `age=418` exactly** (`pressTick+age = 5829+418 =
6247`). This is the fix value.

### 4b. Fix shape

Add one new scoped profile (mirrors the 5 existing sibling constants
exactly) and thread it through turn 5's own 3 calls:

```ts
// battleSceneCanonical.ts, next to TURN1/TURN3/TURN4_OFF_ROCKSLIDE_ANIMATION_PROFILE
export const TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 418, // RAM/pixel tick 6247 (blink+wobble anchor) - pressTick(5829), §4a
  targetShakeStartAge: 0,
  targetShakeEndAge: -1, // real GROVYLE never shakes during this hit (§4a) - disables rockSlideMonShakeY2 (t<0||t>-1 is always true for t>=0)
};
```

```ts
// battleScene.ts:10910, 10983 (drawTurn5RockSlideAttack)
if (!rockSlideMonBlinkInvisible(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
  drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y + rockSlideMonShakeY2(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE));
}
...
const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE);
```

(`rockSlideMonShakeY2` at line 10911 currently passes no profile either —
thread the same one through so the disabled shake ages actually apply.)

### 4c. Regression-risk check (do this before landing — mandatory, per this family's own "spot-check before landing" convention)

`drawTurn5RockSlideAttack` has exactly **2** call sites
(`grep -n "drawTurn5RockSlideAttack(" battleScene.ts`): line 11533 (turn
13's own Murkrow/DRAGON_BREATH reuse, passing turn13's own much-larger
absolute `t`) and line 14953 (inside `drawTurn6FieldBase`, itself reused by
turns 5/6/9/10/13). The blink/shake code is gated by
`sink.keptRows >= GROVYLE_FAINT_SINK_STEPS` (`faintSinkRowsAndY2(t)`,
turn-5-specific formula) and the wobble's own paint is gated by
`t < GROVYLE_HEALTHBOX_VANISH_TICK` (~6379, also turn-5-specific) — both
keyed to the **same fixed** `TURN5_ROCKSLIDE_PRESS_TICK=5829` window
regardless of caller. Every other turn's own `t` when it reaches this
function is far outside `[6180,6380]` (turn 9 ~10800+, turn 13 ~15800+), so
both gates should already evaluate false for those calls **independent of
which profile is passed** — the profile swap should be a no-op for every
non-turn-5 caller by construction. This reasoning was **not verified with a
live compare rerun** (analysis-only session) — the fix worker must confirm
`turn13-switchin` stays at its own guarded 242/242 and the turn 6/9/10
guard-family entries (`turn6-reopen-off` 46/46, `turn6-menu-off.json`
47/47) stay byte-identical before landing.

### 4d. Predicted count

Class A's own active window is ticks 6248-6280 (blink+wobble) unioned with
6272-6365 (shake) = **6248-6365**, all 112 of which are currently
mismatched. Fixing the anchor should close all 112 to 0px, and should also
substantially shrink or close class B's 17-frame tail (6360-6376, see §5)
since the erroneous shake value was contaminating exactly the hand-off into
the sink. **Conservative prediction: `resolve-off-a` 44/196 → at least
**156/196** (112 newly exact), possibly higher if class B folds in for
free.**

## 5. Class B — sink-transition tail (6360-6376), NOT independently re-diagnosed

17 frames, declining diff magnitude (2373px → 259px) as GROVYLE's sprite
sinks into its healthbox. The sink's own onset tick
(`GROVYLE_FAINT_SINK_START_TICK=6360`) is **already RAM-confirmed exact**
against real oracle (§4a's own row-climb check: real row climbs
21→29→37→45→53 starting exactly at 6360) — this constant is not in
question. The residual is most likely simply class A's own wrong shake
value (`26` instead of `21`) still being added into the sprite's Y-position
at the exact moment the sink formula takes over (6360-6362), which class
A's own fix (disabling the shake) should eliminate as a side effect — but
this was **not proven independently this session** (no isolated RAM/pixel
check with the shake hypothetically already fixed). **Next instrument, if
this doesn't close for free**: rerun the same top-row pixel sweep
(`/tmp` scratch script, §4a's method) after landing §4's fix, restricted to
6358-6378; if a residual remains, dense-probe `faintSinkRowsAndY2`'s own
formula against fresh RAM in that 20-tick span.

## 6. Class C — the fainted-message wait-cursor freezes instead of continuing its own generic perpetual bounce

### 6a. Evidence

`drawTurn5RockSlideWindow` (`battleScene.ts:15014-15016`) draws the
"Foe GROVYLE\nfainted!" wait-cursor via a **turn-5-bespoke** function:

```ts
// battleSceneCanonical.ts:1138
export function turn5FaintedCursorYOffset(t: number, start: number): number {
  return Math.min(2, Math.floor((t - start) / 9));
}
```

This function's own doc comment (`battleSceneCanonical.ts:1124-1137`)
explicitly says it was pixel-fit against a **shorter** trace
(`turn5-faint.json`) that stopped 26 ticks after the KO-dismiss press, and
flags the exact open question this session answers: *"Whether it eventually
resumes a bounce loop past 6587... is NOT known - this slice's own window
doesn't run long enough past the press to observe it."*

The real mechanism already exists, generalized, and is **already
documented as intended for this exact reuse** — `cursorState`
(`battleScene.ts:3196-3212`):

```ts
const CURSOR_Y_OFFSETS = [0, 1, 2, 1] as const; // sDownArrowYCoords, src/text.c:75 - 4-phase, 9 ticks/phase, 36-tick period
export function cursorState(t: number, startTick: number = CURSOR_START_TICK): { visible: boolean; yOffset: number } {
  if (t < startTick) return { visible: false, yOffset: 0 };
  const phase = Math.floor((t - startTick) / 9) % CURSOR_Y_OFFSETS.length;
  return { visible: true, yOffset: CURSOR_Y_OFFSETS[phase]! };
}
```

whose own doc comment already states: *"turn 5's own post-faint... hold
re-triggers this same 4-phase/9-tick-per-phase cycle from its OWN local
start tick... the phase math is reused verbatim, just re-anchored"* — and
turns 13/15 already reuse `cursorState` for their own analogous
fainted-cursor (`battleScene.ts:14834`, `:15887`). Turn 5's own call site
(line 15016) is the one holdout still calling the bespoke,
proven-incomplete `turn5FaintedCursorYOffset`.

`resolve-off-b`'s fresh census (108/108 mismatched frames, **all** in the
`61,140-67,147/148` bbox) shows the exact repeating structure this predicts:
a **36-tick supercycle** = 27 ticks mismatched + 9 ticks exact-match,
repeating identically 3 times across the window (blocks at
6426-6452/6462-6488/6498-6524/6534-6560, each internally
9-ticks-24px/9-ticks-38px/9-ticks-24px then a 9-tick gap). This is *exactly*
what "app frozen at offset 2, real cycling `[...,1,0,1,2]`" predicts:
- Real phase 3 (offset 1, app shows 2 → -1 diff) → small, 24px
- Real phase 0 (offset 0, app shows 2 → -2 diff) → bigger, 38px
- Real phase 1 (offset 1, app shows 2 → -1 diff) → small, 24px again
- Real phase 2 (offset 2, app shows 2 → **exact match**) → the 9-tick gap

The magnitude ORDER (24, 38, 24, match) matches the predicted offset
sequence exactly, confirmed by direct pixel diff at t=6430 (a 1-row
vertical shift of the heart-icon glyph, `oracle` vs `app`, sampled
byte-for-byte). `resolve-off-a`'s own tail shows the same class at ticks
6398/6407/6416 (all `61,14x-67,14x` bbox) — the sparser, single-tick
pattern there (rather than the full 27/9 block) is consistent with this
being the early edge of the same cycle (the climb-then-first-wrap
transition); not fully resolved to the tick, see §6c.

### 6b. Fix shape

Replace the bespoke call with the generic, already-correct, already-proven
mechanism (minimal-diff, reuses an existing, tested function):

```ts
// battleScene.ts:15016
if (t >= cursorStart) drawCursor(fb, cursorState(t, cursorStart).yOffset, TURN5_FAINTED_CURSOR_X);
```

`turn5FaintedCursorYOffset` becomes unreferenced after this
(`grep -rn "turn5FaintedCursorYOffset"` shows only its own definition and
this one call site plus the two barrel im/export lines,
`battleScene.ts:1351-1352`) — delete the function and its export/import
lines together with the call-site edit (checked: **no test file
references `turn5FaintedCursorYOffset`** — `grep -rln
"turn5FaintedCursorYOffset" tests/` is empty — so no test needs
retargeting; `cursorState` itself already has its own pinned regression
tests, `tests/battleScene.test.ts:557-571`, covering the exact `[0,1,2,1]`
36-tick-repeat behavior this fix now relies on for turn 5's own call).

### 6c. Regression-risk check

None expected — `cursorState`'s own default `startTick=CURSOR_START_TICK`
is not used here (turn 5's own call always passes its own `cursorStart`
explicitly), and `cursorState` is a pure function with no shared mutable
state. The only open item is the exact tick where `resolve-off-a`'s own
sparse single-tick residuals (6398/6407/6416) sit relative to
`cursorStart+27` (the old code's own freeze-onset) — this doc's own
evidence supports the mechanism but the fix worker should confirm via
rerun that these 3 ticks (and any neighbors) close to 0px, and if 1-2
ticks right at a phase boundary don't, check for a render-lag convention
(`t` vs `t-1`) at the transition edge — every other generic mechanism in
this family uses a `t-1` basis at its OWN call site, not inside the shared
helper, so this is a likely place a 1-tick discrepancy could hide.

### 6d. Predicted count

`resolve-off-b`: **88/196 → 196/196** (100% of the window is this one
class, per §3's bbox census). `resolve-off-a`: at least the 3 confirmed
direct hits (6398, 6407, 6416) close; the remaining ~20 frames in
[6377,6397] are a mix of this class and the already-accepted 1-tick
`GROVYLE_HEALTHBOX_VANISH_TICK` granularity (ISSUES #97-C, "within 1 tick
of the RAM-exact fainted-text-start 6378" — a previously-accepted,
unrelated residual, not re-litigated here).

## 7. Combined predicted counts and rerunnable PASS/FAIL

| trace | before | after §4 alone | after §4+§6 |
|---|---|---|---|
| `turn5-resolve-off-a` | 44/196 | ≥156/196 (112 closed) | ≥159/196, likely higher once §5's 17-frame tail is checked |
| `turn5-resolve-off-b` | 88/196 | 88/196 (unaffected, §4's window ends at 6365, before this window starts) | **196/196** |

**PASS/FAIL** (after landing §4's profile + §6's `cursorState` reuse):
```sh
cd workspace   # WORKTREE GOTCHA - verify with `npm prefix` first
npm run compare -- turn5-resolve-off-a --summary   # PASS: count strictly > 44/196, ticks 6248-6365 all exact
npm run compare -- turn5-resolve-off-b --summary   # PASS: 196/196 exact
npm run compare -- turn5-resolve-off-c --summary   # PASS: unchanged 173/196 (disjoint window, main-lane owns 6763-6785)
npm run compare -- turn5-resolve-off-d --summary   # PASS: unchanged 66/196 (disjoint window, main-lane owns the rotation span)
npm run compare -- turn5-action-off --summary      # PASS: unchanged 32/32 (hard guard)
npm run compare -- turn5-reset-off --summary       # PASS: unchanged 256/256 (hard guard, control)
npm run compare -- turn6-reopen-off --summary       # PASS: unchanged 46/46
npm run compare -- turn13-switchin --summary        # PASS: unchanged 242/242 (§4c's own mandatory spot-check - drawTurn5RockSlideAttack's other caller)
```
FAIL on any decrease anywhere in the guard family, or on `resolve-off-a`/`-b`
not strictly improving.

## 8. Regression guards for the fix worker

- `TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE` is a **new, scoped** constant —
  do not edit the shared `ROCK_SLIDE_ANIMATION_PROFILE` default or any
  sibling turn's own scoped profile.
- Thread the profile through **all 3** calls inside `drawTurn5RockSlideAttack`
  (blink at 10910, shake at 10911, wobble at 10983) — passing it to only
  1-2 of the 3 would leave a partial, harder-to-diagnose residual.
- `turn13-switchin` (242/242) is the load-bearing guard for §4c's reuse
  concern — check it FIRST, before the rest of the family, since a
  regression there means the "gates make this a no-op for other callers"
  reasoning in §4c was wrong and the fix needs to gate on the caller
  instead (e.g. thread `profile` as a new optional parameter into
  `drawTurn5RockSlideAttack`'s own signature, defaulting to
  `ROCK_SLIDE_ANIMATION_PROFILE` for turn 13's call, with only turn 5's own
  call — inside `drawTurn6FieldBase`, or a new dedicated wrapper — passing
  the override).
- Deleting `turn5FaintedCursorYOffset` is optional/cosmetic (it becomes
  dead code, not a correctness issue if left in place) — the load-bearing
  edit is the call-site swap to `cursorState(t, cursorStart).yOffset`.
- Do not touch `GROVYLE_FAINT_SINK_START_TICK` (6360), `TURN5_FAINTED_TEXT_DELAY`
  (549), `rockSlideOpponentHp`, or any Sitrus/PIDGEOTTO-side constant — all
  confirmed correct this session (§2, §5), out of scope for both classes here.

## 9. What's still open after landing §4+§6

- §5's 17-frame sink-tail (6360-6376) — predicted to fold in for free,
  unverified; next instrument named there if it doesn't.
- `resolve-off-a`'s own [6377,6397] partial residual (~20 frames) — a
  probable mix of class C's own edge and the already-accepted
  `GROVYLE_HEALTHBOX_VANISH_TICK` 1-tick granularity; not a new mechanism,
  not re-investigated further this session.
- Neither window reaches PIDGEOTTO's own send-out (real tick 6686, past
  both windows' own end) — no PIDGEOTTO-side mechanism is in scope here,
  contrary to what the shared-mechanism framing in the brief might suggest;
  the two windows' own shared mechanism is entirely GROVYLE-side
  (classes A/B) plus the generic cursor helper (class C), not anything
  about the opponent's next mon.

## 10. Landed addendum (2026-08-18, bounded MAIN worker, fix session)

**Class A landed as specified** (§4b's literal fix shape, unmodified) —
`turn5-resolve-off-a` 44/196 -> 56/196. `turn13-switchin` spot-checked
FIRST per §4c, unaffected (242/242).

**§4d's own >=156/196 prediction did NOT hold** — attributed, not a
contradiction of §4a's blink-anchor math (independently RAM-reconfirmed
this session, `tools/probe/dump-registers.py`). The dominant residual in
Class A's own predicted window is a **previously-unknown, separate
mechanism**: at render ticks 6259/6260/6263/6264/6267/6268 (exactly the
ticks where `rockSlideBg3Y`'s own `-7` shake value is active), the app's
whole-background pixels mismatch oracle by ~30% of the frame, small
per-pixel deltas (dithered near-white shades). A live RAM probe of
`gBattle_BG3_Y` at ticks 6245-6270 against `turn5-resolve-off-a.json`
came back **bit-exact** against `rockSlideBg3Y`'s own formula (shared
default `rockAnchorAge`, untouched by this session) at all 26 sampled
ticks — ruling out a timing/anchor bug in that formula. A best-fit
cross-correlation on a single background column suggested a ~1-row
vertical misalignment, but no integer shift fully explained the observed
deltas either. **This is NOT Class A, NOT Class B, and NOT named
anywhere in §3's census** (the census's own "6 huge spikes... blink+shake
compounding" bucket, §3's class-A row, mis-attributed this residual —
its true cause is unrelated to GROVYLE's own blink/shake at all). Left
unfixed per this family's "do not guess" discipline. **Next instrument:**
check `staticBgPixel`'s own extracted JSON asset for the `-7`-shifted row
range (possible extraction gap), or a denser per-pixel oracle sweep
across ticks 6255-6270 to characterize the exact misalignment before
touching `drawStaticBgShiftedY`.

**Class B (§5) was not independently verified** — blocked by the same
new residual above dominating its own 6360-6376 span.

**Class C (§6) was implemented exactly per §6b, then reverted.** The
`cursorState(t-1, cursorStart)` swap closed `resolve-off-b`'s own
6426-6560 span exactly as §6d predicted (with the `t-1` correction §6c
flagged as a likely need), but **regressed the hard guard
`turn5-resolve-off-c` 195/196 -> 140/196**. §7's own PASS/FAIL table
assumed `resolve-off-c` was a "disjoint window" unaffected by this fix —
**that assumption is wrong**: `resolve-off-c`'s own capture window
(6614-6958) reaches through the same cursor-active dispatch branch
(`drawTurn5RockSlideWindow`, `t < TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK`)
before the Sitrus-heal text ever starts. Root cause, confirmed before
reverting: the trace's own button schedule has a KO-dismiss `A` press at
tick 6561-6562 (right at the real fainted-text settle tick), and the
real cursor's own phase visibly re-anchors/freezes past that point — a
mismatch pattern that still varies by phase (ruling out a simple
constant-offset freeze). This is the same class of mechanism turn 13's
own analogous cursor already solves via
`opponentFaintPresentationOwner.dismiss`/`frozenCursorTick`
(`drawTurn13SwitchinWindow`) — genuinely NOT reproducible from a fixed
pixel/RAM constant the way `turn5FaintedCursorYOffset`'s own table is,
since the real freeze/re-anchor tick depends on when a per-session
dismiss input actually lands, not a fixed offset from `pressTick`.
Reverted the call site and function deletion; `turn5FaintedCursorYOffset`
is back in place with this finding recorded in its own doc comment.
**Next instrument:** thread `opponentFaintPresentationOwner`-style
dismiss data into `drawTurn5RockSlideWindow` (mirroring turn 13's own
`dismiss.cursor.frozenAtElapsed` pattern) before retrying the
`cursorState` swap — and re-verify against `resolve-off-c`'s own window
in the SAME session as any retry, not just `resolve-off-a`/`-b`.

**Standing lesson for the next session:** §7's own PASS/FAIL table is
necessary but not sufficient — always rerun the FULL guard family (not
just the traces a diagnosis doc's predictions section names) before
trusting a "disjoint window" claim.

## 11. Side-lane instrument session (2026-08-18): the real cursor-freeze
timeline (Class C's own next instrument) + the Class B static-background
residual's real mechanism

ANALYSIS ONLY, side lane, Battle Scene OFF oracle — `git diff -- src/` is
empty throughout. Two new committed probes:
`tools/probe/dump-turn5-resolve-cursor-driver.py` (RAM-exact wait-cursor
timeline) and `tools/probe/dump-turn5-resolve-offa-sprite-census.py` (full
OAM census, rules rock-prop sprites in/out). Everything below is fresh RAM/
pixel evidence gathered this session; no landed anchor is re-litigated.

### 11.1 Mechanism (A): the real fainted-message cursor freezes at a genuine
per-session `JOY_NEW(A_BUTTON|B_BUTTON)` accept edge — pinned across BOTH
`resolve-off-b` and `resolve-off-c`

**RAM ground truth.** `struct TextPrinterSubStruct` (`reference/pokeemerald/
include/text.h:53-61`) packs `downArrowDelay:5` and `downArrowYPosIdx:2` into
one byte, `sTextPrinters[0]` (`0x020201B0`) `+0x15` (LSB-first bitfield
packing: `downArrowDelay` bits 0-4, `downArrowYPosIdx` bits 5-6). Driving
`turn5-resolve-off-a.json`'s own 76-segment button script (sha256-identical
across all four `resolve-off-{a,b,c,d}` traces, already established) through
`dump-turn5-resolve-cursor-driver.py` over ticks 6420-6970 gives the real,
unambiguous timeline:

| ram tick | downArrowYPosIdx | downArrowDelay | active | newKeys A | note |
|---|---|---|---|---|---|
| 6425,6434,...,6551 | cycles 0,1,2,3 (period 9) | resets to 8 each transition | 1 | 0 | free-running 4-phase/9-tick bounce, matches `CURSOR_Y_OFFSETS` exactly |
| 6560 | 3 | 8 | 1 | 0 | **last live transition** — this tick's own blit (pre-increment idx) is the last one that ever paints |
| 6561 | 3 | 7 | **0** | **1** | `TextPrinterWaitWithDownArrow` (`text.c:849-863`) sees the real accepted A edge and returns TRUE; the printer is deactivated the SAME tick |
| 6562–6685 | 3 | 7 | 0 | 0 | frozen bit-for-bit, no further writes to this struct at all, for the entire remainder of the "Foe GROVYLE\nfainted!" window |
| 6686 | 0 | 0 | 1 | 0 | a wholly DIFFERENT printer instance (DESTIN's own sent-out text) — unrelated re-init, not a continuation |

`TextPrinterDrawDownArrow` (`text.c:787-833`) blits using `downArrowYPosIdx`
**before** incrementing it, so the value shown on screen at RAM-sample tick
T is `CURSOR_Y_OFFSETS[(idx(T) - 1) mod 4]`, not `CURSOR_Y_OFFSETS[idx(T)]`
directly. At the freeze (idx frozen at 3 forever), the real shown offset is
therefore `CURSOR_Y_OFFSETS[(3-1)%4] = CURSOR_Y_OFFSETS[2] = 2` — **not** 1
as a naive same-index read would suggest. This is independently
cross-validated two ways: (1) it is self-consistent against every free-
running transition tick in the table (the shown-offset sequence it predicts,
1,0,1,2,1,0,1,2,…, exactly matches the periodic pattern §6a's own census
already found), and (2) the currently-landed `turn5FaintedCursorYOffset`
(`Math.min(2, floor((t-start)/9))`, saturates at 2 forever) is — by this same
math — **accidentally correct for the frozen tail**, which is exactly why
`resolve-off-c`'s own baseline (195/196, zero mismatches in the cursor bbox)
already passes today: both the buggy formula and the real hardware converge
on the same constant 2 once the climb saturates. The formula is simply wrong
for the *actively cycling* portion before the freeze (`resolve-off-b`'s own
100%-mismatched 6426-6560 span), which is the whole reason Class C existed.

**Why bare Class C (no freeze) regressed `resolve-off-c`, and likely also
part of `resolve-off-b`'s own tail.** `resolve-off-b`'s own capture window is
6418-6613 (196 frames), but its reported 108 mismatches are ALL inside
6426-6560 — meaning the remaining 88 frames (6418-6425 pre-cursor, plus
6561-6613 post-freeze) already match today, precisely because the frozen
region's real value (2) coincides with the old formula's own saturated
value there. `cursorState(t-1, cursorStart)` has no freeze concept: it keeps
extrapolating the SAME 9-tick-bucket cycle forever. Because the bucket
containing the last live transition (6560) naturally spans about 9 ticks,
the *first* several post-freeze ticks (~6561-6568) still coincidentally read
2 under bare `cursorState`, but the very next bucket (~6569 on) rolls the
formula onward to 1, 0, 1, 2, 1, 0, 1, 2, … — diverging from the real,
now-frozen constant 2 for the rest of `resolve-off-b`'s own 6569-6613 tail
too. **This was not independently re-verified against a live rerun this
session** (Class C is reverted; re-landing it and re-diffing is out of scope
for an analysis-only session) — flagged here as a *predicted*, mechanism-
grounded consequence, not a re-measured fact, but it sharpens the ISSUES
entry's own "must satisfy both windows simultaneously" lesson: the reverted
fix's own blast radius likely was not fully "just `resolve-off-c`" either.

**Turn 13's own mechanism, and why it can't be reused verbatim.**
`opponentFaintPresentationOwner.ts`'s `OpponentFaintDismissEdge`/
`storeOpponentFaintDismiss` is exactly the right SHAPE (a real, input-driven
`acceptedElapsed` captured once, freezing `dismiss.cursor.frozenAtElapsed`
for `drawFaintedOpponentWindow`/`drawTurn13SwitchinWindow` to clamp against,
`battleScene.ts:14880-14923,11627-11689`) — but it is NOT a generic,
reusable owner: `createOpponentFaintPresentationOwner` bakes in
`resolveTurn13ResolutionAdapter()`/`resolveTurn13SwitchInAdapter()`
(`Turn13ResolutionAdapter`/`Turn13SwitchInAdapter`), and `battleScene`
carries exactly **one** `opponentFaintPresentationOwner` slot
(`battleScene.ts:2916`), created once (`core.ts:1425-1433`, gated on
`opponentFaintDismissEligible`, itself hardcoded to
`TURN13_DRAGONBREATH_PRESS_TICK`) and then a **one-shot latch** —
`storeOpponentFaintDismiss` refuses to overwrite an existing `dismiss`.
Turn 5's own fainted-cursor fires at real tick ~6561, turn 13's at ~16000+,
in the SAME continuous battle-scene state; if turn 5's dismiss consumed the
shared slot, `battleScene.opponentFaintPresentationOwner !== null` would
already be true by the time turn 13's own eligibility window arrives, and
`createOpponentFaintPresentationOwner()` would never fire for turn 13 at
all — silently breaking its own currently-passing 242/242. **Do not thread
turn 5's dismiss through the existing `opponentFaintPresentationOwner`
slot or type.**

**What turn 5 actually needs already half-exists.** `turn5RockSlideKoDismiss
Eligible` (`battleSceneCanonical.ts:2537-2539`) is the exact turn-5 analog of
`opponentFaintDismissEligible` — defined, exported, even re-exported through
`battleScene.ts`'s own barrel (`battleScene.ts:1355-1356`) — but has **zero
call sites** anywhere in `src/` (`grep -rn "turn5RockSlideKoDismissEligible("
src/` matches only its own definition). It was clearly staged for exactly
this fix and never wired up. The lightest-diff idiom to wire it to is
`sendOutPressElapsed`'s own flat-scalar pattern (`battleScene.ts:2875-2901`,
"created directly, same tick already reflects it," no owner object needed
since turn 5's own switch-in continuation is already handled by
`drawTurn5RockSlideWindow`'s own fixed dispatch, not a generic
"automatic-opponent-switch-in" continuation the way turn 13's owner drives).

**Fix shape** (three small, additive edits, all new/optional so every
existing call site is unaffected):

```ts
// battleScene.ts, BattleSceneState — next to sendOutPressElapsed (2901)
/** The real accepted A edge that dismisses turn 5's own GROVYLE fainted-text
 * cursor (mirrors sendOutPressElapsed's own "captured directly" idiom —
 * turn 5 needs nothing from the heavier OpponentFaintPresentationOwner
 * shape, see docs/turn5-resolve-ab-pools-diagnosis.md §11.1). */
turn5FaintDismissElapsed: number | null;
```

```ts
// core.ts, next to the existing sendOutPressElapsed / opponentFaintPresentationOwner block (~1413-1440)
if (
  battleScene.turn5FaintDismissElapsed === null &&
  newKeys.has("A") &&
  turn5RockSlideKoDismissEligible(SCENE_TICK0 + battleScene.elapsed + 1)
) {
  battleScene = { ...battleScene, turn5FaintDismissElapsed: battleScene.elapsed + 1 };
}
```

```ts
// battleScene.ts:15048-15049 (drawTurn5RockSlideWindow) — replace the
// turn5FaintedCursorYOffset call with a freeze-aware cursorState call
const cursorStart = pressTick + TURN5_FAINTED_CURSOR_START_DELAY;
if (t >= cursorStart) {
  const naturalTick = t - 1; // same t-1 basis §6b/Class C already proved exact for the free-running span
  const cursorTick = turn5FaintDismissElapsed === null
    ? naturalTick
    // RAM-confirmed freeze (§11.1): clamp at the LAST LIVE tick's own
    // natural input, not the accept-edge tick itself — PIN this exact
    // constant against resolve-off-b's FULL window (not just its old
    // 6426-6560 span) before trusting it against resolve-off-c, per
    // ISSUES #97-J's own standing lesson.
    : Math.min(naturalTick, SCENE_TICK0 + turn5FaintDismissElapsed - 2);
  drawCursor(fb, cursorState(cursorTick, cursorStart).yOffset, TURN5_FAINTED_CURSOR_X);
}
```

`turn5FaintDismissElapsed` must be threaded as a new parameter alongside the
already-threaded `opponentFaintPresentationOwner` down the existing call
chain `drawFightSubmenuWindow` (`battleScene.ts:8462-8470`, already reads
`state.opponentFaintPresentationOwner` at its own top-level call site,
`battleScene.ts:17664-17672`) → the `turn5Active` branch's own
`drawTurn5EndeavorText` call (`battleScene.ts:8569-8581`, currently passes
NO owner/dismiss data at all) → `drawTurn5EndeavorText` → `drawTurn5RockSlideWindow`
(`battleScene.ts:10440-10450,15019-15024`).

**The `-2` constant is a hand-derivation, not oracle-pinned — the fix
worker must confirm it via a live rerun before trusting it.** Derivation:
the real freeze is first visible starting render tick 6561 (RAM `active`
1→0); the last tick whose *natural* (`t-1`) `cursorState` input is
independently known-correct is 6560 (its own `t-1`=6559, and
`cursorState(6559,cursorStart)` must equal the real shown offset 2 there,
since that tick is inside Class C's own already-proven-exact 6426-6560
span). Clamping every later tick's input at that same value (6559 =
6561-2) reproduces the frozen constant for all `t >= 6561`. This chain is
internally consistent but was never run through an actual `npm run
compare` (analysis-only constraint) — a one-tick error here is exactly the
class of bug this whole family's docs repeatedly warn about, so pin it
live, not by re-reading this derivation.

**Predicted counts (structural, not re-measured this session):**

| trace | current | after this fix, predicted |
|---|---|---|
| `turn5-resolve-off-a` | 56/196 | ≥59/196 (the 3 confirmed direct-hit ticks from §6d, `[6398,6416]`) — unaffected by the freeze itself (the accept edge at 6561 is outside `-a`'s own 6222-6417 window) |
| `turn5-resolve-off-b` | 88/196 | 196/196 — the ENTIRE window is class C (free-running span fixed by the proven `t-1` `cursorState` swap, frozen tail preserved by the new clamp, closing the gap this doc's own §11.1 predicts bare Class C would have left) |
| `turn5-resolve-off-c` | 195/196 | 195/196 unchanged (still just the unrelated 6763 residual) — the frozen clamp reproduces today's own accidentally-correct constant-2 tail exactly, so this window should see ZERO change, not just "no regression" |

**Rerunnable PASS/FAIL** (after landing):
```sh
cd workspace   # WORKTREE GOTCHA - verify with `npm prefix` first
npm run compare -- turn5-resolve-off-b --summary   # PASS: 196/196 exact (the load-bearing check — this is the window the fix targets)
npm run compare -- turn5-resolve-off-c --summary   # PASS: unchanged 195/196, ONLY the pre-existing 6763 residual — any OTHER mismatch means the freeze clamp is wrong
npm run compare -- turn5-resolve-off-a --summary   # PASS: strictly >= 56/196, ticks 6398/6407/6416 close
npm run compare -- turn5-resolve-off-d --summary   # PASS: unchanged 142/196 (disjoint window)
npm run compare -- turn5-action-off --summary      # PASS: unchanged 32/32 (hard guard)
npm run compare -- turn5-reset-off --summary       # PASS: unchanged 256/256 (hard guard, control)
npm run compare -- turn13-switchin --summary        # PASS: unchanged 242/242 — the load-bearing guard for the "new, disjoint state slot" claim; a regression here means turn5FaintDismissElapsed leaked into turn 13's own owner somehow
```
FAIL on any decrease anywhere, or if `resolve-off-b` doesn't hit exactly
196/196, or if `resolve-off-c` picks up ANY new mismatch beyond 6763.

**Regression guards for the fix worker:**
- `turn5FaintDismissElapsed` must be a **new, disjoint** state field — never
  reuse `opponentFaintPresentationOwner`'s own slot or type (§11.1's own
  "why bare reuse breaks turn 13" analysis).
- Gate creation on `turn5RockSlideKoDismissEligible`, not a hand-rolled tick
  comparison — it already exists and is already exported for this purpose.
- The `-2` clamp constant is unverified — treat it as a starting point, pin
  it against `resolve-off-b`'s FULL 196-frame window (not just the old
  6426-6560 span) in the SAME session as `resolve-off-c`, per the standing
  lesson two sections up.
- Do not touch `turn5FaintedCursorYOffset` itself beyond removing its call
  site — its own doc comment already records this session's finding.

### 11.2 Mechanism (B): the `resolve-off-a` 6248-6365 static-background
residual — not fadeY, not a row shift, not missing rock sprites; the real
background barely moves despite `gBattle_BG3_Y`'s RAM-confirmed `-7`

**fadeY ruled out cleanly.** `drawTurn5RockSlideAttack`'s own call site
(`battleScene.ts:10920-10921`) passes `bgFadeYOverride=undefined`, falling
through to `turn5BgFadeY(t)` (`battleScene.ts:10640-10642`), which indexes
`TURN5_PIDGEOTTO_BG_FADE_Y` from `TURN5_BG_FADE_START_TICK = 6746`
(`battleSceneCanonical.ts:184`) — **500+ ticks past** the 6248-6365 residual
window, so `fadeY = 0` (no white-blend) for the entire window. The
"dithered near-white shades" framing in the prior session's own finding is
real (confirmed below), but it is not `blendComponentToWhite` at all.

**No integer row shift resolves it (reconfirmed, sharper method).** Fresh
`npm run compare -- turn5-resolve-off-a --capture-range 6255:6270 --summary`
reconfirms the flagged ticks (6259/6260/6263/6264/6267/6268, all
`bbox=0,0-239,111`, 28-31% of the frame, `ssimMin` slightly negative —
genuine structural mismatch, not just dither noise). A full row-by-row
best-fit-shift scan (all 240 columns × rows 0-111, `app` vs `oracle` PNGs
from that run) against every integer delta in `[-4,4]` tops out at **67% at
delta=-1** — no shift, integer or otherwise, gets close to exact, matching
and sharpening the prior session's own "no integer shift fully explained
it" finding.

**Missing rock-slide props ruled out.** `drawTurn5RockSlideAttack`
(`battleScene.ts:10918-10985`, read in full this session) never calls any
rock-sprite draw function at all — `ROCK_SLIDE_ROCK_TABLE`/
`gFallingRockSpriteTemplate` exist in `battleMenu.ts` but have no renderer
call site anywhere in `battleScene.ts`. A fresh full-OAM census
(`dump-turn5-resolve-offa-sprite-census.py`, all 64 `gSprites[]` slots, 12
ticks spanning 6248-6268) confirms this matches REAL oracle behavior, not
just app scope: only 9-10 sprites are ever active, every one mapping to an
already-known, positionally-stable battler/icon-bar/UI sprite (Grovyle's own
front sprite toggling its already-understood blink at slot 8, x=176/y=44;
icon-bar sprites at fixed x=44-248, y=30-88 with only ±1 `y2` bounce
jitter) — **no rock-shaped or rock-moving sprite is ever present**. This
independently reconfirms, for turn 5 specifically, the same finding turn
1's own dossier already recorded for the `HITMARKER_NO_ANIMATIONS`
substitution (`battleScene.ts:15105-15120`): ROCK_SLIDE's own rock-prop
animation is suppressed under Battle Scene OFF. Ruling this out narrows the
residual to the static-BG tilemap/scroll mechanism alone.

**New finding: the real background barely moves at all.** A clean
oracle-vs-oracle comparison, controlling for Grovyle's own blink state
(both 6258 and 6259 sampled `downArrowYPosIdx`-analog — actually here,
sprite slot 8's own `invisible` flag — **identically True**, confirmed by
the same sprite census, so this is NOT a blink confound):

```
oracle-06258.png (shiftY=0, per rockSlideBg3Y's own table)
  vs
oracle-06259.png (shiftY=-7, one of the 6 flagged huge-diff ticks)
```

Best-fit row-shift scan restricted to rows 10-50 (the genuinely-differing
band once Grovyle's blink is controlled for) across deltas `[-10,10]`:
**delta=0 wins outright at 81.5% exact match** — every other tested delta,
including -7 (the "obvious" candidate matching `rockSlideBg3Y`'s own RAM
value) and -8 (one row off), scores far worse (19-57%). In other words: the
real oracle's own visible background is **almost unchanged** between a
shiftY=0 tick and a shiftY=-7 tick, despite `gBattle_BG3_Y` genuinely
differing by RAM (already independently confirmed bit-exact by the prior
session's own probe). This directly contradicts `drawStaticBgShiftedY`'s own
modeling, which applies a full uniform whole-screen vertical scroll by the
raw register value. The residual 18.5% at delta=0 is consistent with the
already-known, already-modeled icon-bar `y2` bounce jitter (±1px, visible in
the same sprite census) bleeding into a couple of rows — not a second
undiscovered mechanism.

**Working hypothesis, not yet confirmed:** `rockSlideBg3Y`'s shared helper
pair (`rockSlideBg3Y`/`drawStaticBgShiftedY`) is reused by every sibling
ROCK_SLIDE turn's own attack window (§4a's own citation, turns 1/3/4/9/10/
11), but turn 1's own dossier (`battleScene.ts:15105-15120`) explicitly
records `gBattle_BG3_Y` **flat at 0 for its entire window** under
`HITMARKER_NO_ANIMATIONS`. If every sibling shares that same suppression
(not independently checked this session — see next instrument), turn 5
would be the **first and only currently-exercised window** where
`drawStaticBgShiftedY`'s own nonzero-`shiftY` code path is pixel-tested at
all — i.e. "shared, sibling-proven" (§4a's own framing) may be true only for
the blink/wobble helpers, not for this vertical-scroll path, which could
have been silently wrong since it was written and simply never triggered
anywhere else.

**Next instrument (not run this session, named per the brief's own "honest
partial beats a rushed pin"):**
1. Cheap, no-probe check: for each sibling turn's own `pressTick` and its
   own capture window, compute whether any captured tick lands inside
   `ROCK_SLIDE_SHAKE_SEQUENCE`'s own active `d` range (`battleMenu.ts:1706`)
   — if none do, "shared/sibling-proven" is confirmed to exclude this path
   entirely, strengthening the hypothesis above from "working" to "load-
   bearing."
2. RAM probe: read `DISPCNT`'s own BG-enable bits and each `BGxCNT`'s own
   priority/char-base/screen-base at one of the 6 flagged ticks, to confirm
   which background layer is actually the one carrying the visible sky/
   ground art in this specific composited scene — if it is not BG3 (or BG3
   is layered under something else at this moment), shifting `BG3VOFS`
   would have exactly the "barely visible" effect this session measured,
   and the real fix is elsewhere (a different layer's own offset, or no
   shift application here at all).

**Not fixed.** This is a named, evidence-backed partial per the brief's own
priority ordering — (A) was the larger, higher-priority pool and consumed
the bulk of this session's budget.

## 12. Landed addendum (2026-08-18, bounded MAIN worker, fix session): §11.1's mechanism (A) landed, the `-2` constant corrected to `-1`

Landed exactly the fix shape §11.1 specified: a new, disjoint
`turn5FaintDismissElapsed: number | null` field on `BattleSceneState`
(next to `sendOutPressElapsed`), set once in `core.ts` on the real
`newKeys.has("A")` edge gated by `turn5RockSlideKoDismissEligible`
(mirroring `sendOutPressElapsed`'s own "captured directly" idiom, and
explicitly NOT threaded through `opponentFaintPresentationOwner` per
§11.1's own "why bare reuse breaks turn 13" analysis), threaded as a new
trailing parameter down the existing call chain
`drawFightSubmenuWindow` → `drawTurn5EndeavorText` →
`drawTurn5RockSlideWindow` (made optional/defaulted `null` at every hop,
rather than the doc's own literal non-optional field, so the many
pre-existing raw-`BattleSceneState`-literal test fixtures that predate
this field keep compiling without a mass edit — `advanceBattleScene`
still normalizes it to `null` every tick either way). The cursor-draw
call site was extracted into a small, independently-testable pure
function, `turn5FaintDismissCursorTick(t, dismissTick)`, rather than
inlined at the call site — matching this codebase's own established
pattern for this class of small pure helper (`turn5RockSlideKoDismiss
Eligible`, `faintSinkRowsAndY2`, etc.), and giving the freeze-clamp
arithmetic a direct Tier-1 pin independent of the render pipeline.

**MANDATORY live-pinning caught a real bug.** §11.1 explicitly flagged
its own hand-derived `-2` freeze-tick offset as unverified. Live-pinning
it first (a temporary debug print of the real landing tick of
`turn5FaintDismissElapsed`, confirmed exactly RAM tick 6561 as §11.1
predicted, plus a fresh `npm run compare -- turn5-resolve-off-b
--summary`) found the `-2` constant produced a CONSTANT 24px mismatch
across the entire frozen tail 6561-6613 — the doc's own derivation had
an off-by-one: the last NATURAL (`t-1`) input independently confirmed
correct by the free-running span's own unbroken match is render tick
6560 itself (not 6559, `turn5FaintDismissElapsed`'s landing tick minus
1, not minus 2) — `cursorState(6559, cursorStart)` evaluates to offset 1
where the real frozen value is 2; `cursorState(6560, cursorStart)`
evaluates to the correct 2. Corrected
`TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET` to **1**; re-ran the full
rerunnable PASS/FAIL block after the correction, not just the target
trace.

**Numbers, exactly as predicted once the constant was corrected:**
`turn5-resolve-off-b` 88/196 → **196/196** (exact — §11.1's own
prediction held once the constant was fixed). `turn5-resolve-off-c`
unchanged **195/196** (only the pre-existing 6763 residual — the hard
guard that sank the original bare Class C attempt is untouched).
`turn5-resolve-off-a` 56/196 → **58/196** — 1 short of §11.1's own ≥59
prediction: 2 of the 3 named direct-hit ticks (6407, 6416) close exactly
as predicted, but 6398 remains mismatched. This is NOT a new defect —
6398 is the pre-existing, already-accepted 1-tick `GROVYLE_HEALTHBOX_
VANISH_TICK` granularity residual §6d's own prediction table separately
flagged as unrelated (ISSUES #97-C). Full guard family re-verified with
zero decreases: `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
`turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
`turn5-confirm-off-a` 128/132, `turn5-confirm-off-b` 131/132,
`turn5-resolve-off-d` 159/196, `turn13-switchin` 242/242 (the
load-bearing guard for the new, disjoint state slot claim — unaffected,
confirming turn 5's dismiss did not leak into turn 13's owner),
`turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.

**Test fallout, fixed in the same commit.** Landing this surfaced two
pre-existing tests (`describe("rank-3 turn-5 KO dismiss mirror
retirement"...)`, `tests/battleScene.test.ts`) that had pinned the
OLD, since-superseded finding that a KO-dismiss A-press at trace ticks
6561/6591 was "presentation-inert" — true of the prior, never-consumed
mirror this doc's own §11.1 replaces, but now literally false (the real
mechanism this fix lands DOES change state at exactly those ticks).
Updated both to assert the new, correct behavior (the press registers
`turn5FaintDismissElapsed` and changes nothing else) rather than
deleting them — they remain a live regression pin against the dismiss
edge's own isolated blast radius. `turn5FaintedCursorYOffset` itself was
left defined but unreferenced, per §11.1's own explicit guard.

**Still open, unchanged by this landing:** mechanism (B) (§11.2, the
`resolve-off-a` 6248-6365 static-background residual) — out of this
step's scope, side-lane territory, next instrument named in §11.2 above.
`resolve-off-a`'s own 6398 residual (ISSUES #97-C, pre-existing,
unrelated). `resolve-off-c`'s 6763 residual and `resolve-off-d`'s
6970-6988/6989-7005 residuals (ISSUES #97 sub-entries I/K) — untouched.

## 13. Side-lane instrument session (2026-08-18, second): §11.2's own
"working hypothesis" FALSIFIED - the whole-screen-scroll mechanism is
proven correct elsewhere; the real turn-5 residual is an occlusion/
compositing difference, not a `rockSlideBg3Y`/`drawStaticBgShiftedY` bug

ANALYSIS ONLY, side lane, Battle Scene OFF oracle - `git diff -- src/` is
empty throughout this session. One new committed probe,
`tools/probe/dump-turn5-resolve-offa-bglayer-census.py` (DISPCNT, all four
BGxCNT decoded, all four `gBattle_BGn_X/Y` shadow globals, the real hardware
BGnHOFS/VOFS registers, windowing (`WIN0/1H/V`, `WININ/WINOUT`) and blend
(`BLDCNT/BLDALPHA/BLDY`) registers, per tick). Baseline reconfirmed fresh at
session start: `turn5-resolve-off-a` 58/196 (106 of its 138 mismatches inside
the assigned 6248-6365 span; the remaining 32 are the already-attributed
sink-tail/`GROVYLE_HEALTHBOX_VANISH_TICK` residuals, §5/§9, out of this
span).

### 13.1 §11.2's own instrument #1, run: the vertical-scroll path is NOT
"untested elsewhere" - it is exercised twice, and passes bit-exact both times

§11.2's own working hypothesis was: "turn 5 would be the first and only
currently-exercised window where `drawStaticBgShiftedY`'s own nonzero-`shiftY`
code path is pixel-tested at all... [it] could have been silently wrong since
it was written and simply never triggered anywhere else." This is **false**,
confirmed by direct oracle reruns, not just static analysis of capture
windows (the doc's own §11.2 named a cheaper, capture-window-only check;
this session ran the actual traces instead, which is strictly stronger
evidence):

`drawTurn6RockSlideAttack` (`battleScene.ts:11876`) and
`drawTurn7RockSlideAttack` (`battleScene.ts:12153`) both call
`rockSlideBg3Y(t, pressTick)` / `drawStaticBgShiftedY(fb, shiftY, ...)`
**unmodified, unscoped, with no profile override** - the identical function
pair `drawTurn5RockSlideAttack` uses. Fresh reruns:

```
npm run compare -- turn6-rockslide-a --summary   -> 255/255 (ticks 7765-8019)
npm run compare -- turn6-rockslide-b --summary   -> 105/105 (ticks 8020-8124)
npm run compare -- turn7-rockslide-a --summary   -> 256/256 (ticks 8593-8848)
npm run compare -- turn7-rockslide-b --summary   -> 256/256 (ticks 8849-9104)
npm run compare -- turn7-rockslide-c --summary   -> 256/256 (ticks 9105-9360)
npm run compare -- turn7-rockslide-d --summary   -> 19/19   (ticks 9361-9379)
npm run compare -- battle2-turn1-rockslide --summary -> 190/191 (one unrelated residual at tick 6970, far outside any shake window)
```

`ROCK_SLIDE_SHAKE_SEQUENCE`'s own active window (`d = (t-1) - (pressTick+428)
in [0,10]`, `rockAnchorAge=428` is the shared, never-overridden default for
every turn including turn 5's own `TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE` -
only `hitFlashAnchorAge`/`targetShakeStartAge`/`targetShakeEndAge` are ever
scoped) lands at `t in [7801,7811]` for turn 6 (`pressTick=7372`) and
`t in [8835,8845]` for turn 7 (`pressTick=8406`) - both **entirely inside**
the passing traces' own capture ranges above. Per-tick manifest check at the
exact nonzero-`shiftY` ticks (`d=1,2,5,6,9,10`, matching turn 5's own flagged
6259/6260/6263/6264/6267/6268 pattern exactly):

```
turn6: ticks 7799-7812 all diffPixels=0 (includes 7802,7803,7806,7807,7810,7811, the shiftY=-7 ticks)
turn7: ticks 8833-8846 all diffPixels=0 (includes 8836,8837,8840,8841,8844,8845, the shiftY=-7 ticks)
```

**This is decisive, not merely suggestive**: the exact same code, exact same
shared static-bg asset (`staticBgPixel`/`battleBg.static`, a pure function of
`(mapX, mapY, paletteOverride)` with no per-turn parameter - confirmed by
reading `battleScene.ts:3054-3067`), exact same nonzero `shiftY` values,
render bit-exact for two other turns. `rockSlideBg3Y`, `drawStaticBgShiftedY`,
and the static asset's own wraparound math (`BG3_VERTICAL_PERIOD=256`,
`battleScene.ts:15193-15211`) are **proven correct**, not "possibly silently
wrong." The turn-5 residual is a **turn-5-specific** problem, not a shared-
mechanism problem.

### 13.2 §11.2's own instrument #2, run and extended: hardware registers are
IDENTICAL between the working (turn 6) and broken (turn 5) cases - except one

RAM/hardware probe (`dump-turn5-resolve-offa-bglayer-census.py`) at the
flagged ticks, turn 5 (6255-6270) vs. turn 6 (7798-7812):

- **`gBattle_BG3_Y` shadow AND the real hardware `REG_BG3VOFS`** (0x0400001E)
  both read `-7` (as a 9-bit signed register, `505` unsigned) at turn 5's own
  flagged ticks, confirming the value genuinely reaches the hardware register
  - ruling out a "shadow-to-hardware copy skipped" hypothesis outright.
  `VBlankCB_Battle` (`reference/pokeemerald/src/battle_main.c:2085-2098`)
  copies all four `gBattle_BGn_X/Y` shadows to hardware unconditionally every
  vblank; nothing gates this per-turn.
- **DISPCNT** (`0x3f40`, mode 0, all 4 BGs enabled) - byte-identical between
  turn 5 and turn 6 at every sampled tick.
- **Windowing** (`WIN0H/V`, `WIN1H/V`, `WININ=WINOUT=0x3f3f`) and **blend**
  (`BLDCNT=BLDALPHA=BLDY=0`) - all zero/inactive, byte-identical, in both
  cases. Rules out a window mask or a hardware alpha-blend as the
  differentiator.
- **Palette RAM** (`0x05000000`, 512 bytes, BG palette): a fresh dump across
  the entire turn-5 flagged window (6248-6270) shows **zero byte changes**
  tick-to-tick throughout. Rules out a software palette fade
  (`BeginNormalPaletteFade`-style, which writes PLTT directly and would not
  show up in `BLDCNT`/`BLDALPHA`) as the mechanism.
- **BG0CNT/BG1CNT/BG3CNT**: identical priority/char-base/screen-base between
  turn 5 and turn 6 (`BG0`: priority 0, screenBase 24; `BG1`: priority 2,
  screenBase 28; `BG3`: priority 3, screenBase 26, charBase 2).
- **BG2CNT is the one register that differs**: turn 5's own window shows
  `BG2` **priority 0** (tied with `BG0`, both in front of `BG3`) throughout
  6180-6260 (no transition observed inside that range - already 0 at the
  earliest sampled tick); turn 6's own window shows `BG2` **priority 2**
  (tied with `BG1`, still in front of `BG3` either way) at the analogous
  tick. Same `screenBase=30`/`charBase=0` in both cases - only the priority
  field differs. This changes `BG2`'s own z-order relative to `BG1` (in
  front of `BG1` for turn 5, behind `BG1` for turn 6) but does **not**, by
  itself, change whether `BG2` occludes `BG3` (priority 0 or 2 both beat
  `BG3`'s 3) - flagged as the one concrete, RAM-confirmed hardware
  difference found this session, not yet proven to be causal.

### 13.3 The real, decisive new evidence: turn 5's own real background is
**provably 100% static** at some rows for the ENTIRE shake window, not just
"mostly unchanged"

Direct pixel sampling of the real oracle's own row 0 and row 10 (both purely
background rows - above `GROVYLE_CORNER.y=12`, and `drawTurn5IconBar` is a
no-op the entire window, active range `[6587,6742)` per its own constants,
nowhere near 6248-6365) across **every tick 6256-6265** (the full
active-shake sub-window, `d=0..9`):

```
row 0:  (255,255,255) at EVERY tick 6256-6265, no exceptions
row 10: (231,239,239) at EVERY tick 6256-6265, no exceptions
```

Despite `gBattle_BG3_Y`/`REG_BG3VOFS` genuinely cycling `0,-7,-7,0,0,-7,-7,...`
underneath (§13.2), the real displayed pixels at these rows **never change**,
across the *entire* window - not "mostly" static (the prior session's own
81.5%-at-delta-0 framing), but **exactly** static at these specific rows,
every single sampled tick. Cross-check against turn 6's own analogous rows at
its own shiftY=-7 tick (7802) shows those rows **do** visibly change from
their own shiftY=0 baseline (7801): row 0 goes `(255,255,255)` ->
`(222,231,231)`, matching **exactly** what the app itself already computes
for `shiftY=-7` at that pixel (confirmed identical to the app's own
mis-attributed prediction for turn 5's row 0, `app-06259.png`) - i.e. the
app's `staticBgPixel`/`drawStaticBgShiftedY` computation is not just
"probably right," it is bit-for-bit the value real hardware shows **when
the shift is actually visible** (turn 6). Turn 5's own real screen simply
never shows it, at these rows, for this whole window.

Because `staticBgPixel` takes no per-turn parameter (§13.1), and the
hardware register genuinely differs (§13.2's `BG3VOFS` read), the only
remaining explanation is **compositing**: something opaque, in front of
`BG3`, is covering these rows in turn 5's own real screen and is either
absent or transparent there in turn 6's. `BG2`'s differing priority
(§13.2) is the one confirmed register-level candidate, but this session did
not trace it to specific VRAM tile content before the time budget ran out.

### 13.4 What this means for the fix, and what's still unproven

**The originally-suspected mechanism is wrong.** This is not a
`rockSlideBg3Y` timing bug, not a `staticBgPixel` extraction/wraparound gap,
not a missing row-shift correction, not a window/blend/palette effect. The
shared ROCK_SLIDE background-shake code is correct and turn 5 must not have
its own scoped variant of it (unlike Class A's `hitFlashAnchorAge`, this is
not a per-turn constant-tuning problem).

**Most turn 5-relevant precedent already exists in this exact file**: turns
3/4/9/10/11 (`battleScene.ts:9873,10135,13081,13439,13694`) do **not** call
`rockSlideBg3Y` at all for their own `drawStaticBgShiftedY` calls - they pass
a hardcoded `0`, each with its own doc comment recording an independent
RAM-confirmed finding that the real background is flat for their own window.
Given §13.3's own finding (turn 5's real background is **exactly** static at
the sampled rows for the *entire* shake window, not just "close to" static),
**turn 5 may belong in that same bucket, not the turn-1/6/7 bucket** - i.e.
the fix may be as simple as `drawTurn5RockSlideAttack`'s own
`drawStaticBgShiftedY(fb, shiftY, ...)` call (`battleScene.ts:10891`)
becoming `drawStaticBgShiftedY(fb, 0, ...)` (dropping the `rockSlideBg3Y`
call entirely for this one turn), mirroring turns 3/4/9/10/11's own already-
landed pattern.

**This is NOT proven and must not be landed on this session's evidence
alone**: §11.2's own row-15-44 sampling (the prior session, a band this
session did not re-derive) showed a genuine, nonzero (if smaller-than-
currently-modeled) difference between the real oracle's shiftY=0 and
shiftY=-7 ticks there (~4.6-6.6% of the full frame, not 0%) - a flat
`shiftY=0` fix would leave that band's own real, small residual unaddressed,
and would need its own separate instrument (most likely: `BG2`'s or `BG0`'s
own tile content in that row band specifically, to see whether ANY of the
real change there is `BG3`-sourced at all, or whether it too has a
non-`BG3` explanation).

**Next instrument** (not run this session, named per the family's own
"honest partial" discipline): VRAM tile/tilemap dump for `BG2` (screenBase
30, charBase 0) and `BG0` (screenBase 24, charBase 0) at one of the flagged
turn-5 ticks (e.g. 6259) vs. the analogous turn-6 tick (7802), to identify
what content those layers actually carry at these rows and whether it
changes between the two turns (this session confirmed the *registers*
`BG0CNT`/`BG3CNT` don't differ, but never read the underlying tile
indices/screen-entry data itself for `BG0`/`BG2`). If `BG2`'s own tile data
turns out to be identical between turn 5 and turn 6 too, the flat-static
finding in §13.3 would need re-explaining from OAM/sprite occlusion instead
(re-run `dump-turn5-resolve-offa-sprite-census.py` at these exact ticks,
checking every sprite's own screen bbox against rows 0-14, not just the
mons already accounted for).

### 13.5 Rerunnable guards (fresh, this session)

```sh
cd workspace   # WORKTREE GOTCHA - verify with `npm prefix` first
npm run compare -- turn5-resolve-off-a --summary   # 58/196, unchanged (ANALYSIS ONLY - no src/ edit this session)
npm run compare -- turn6-rockslide-a --summary     # 255/255 - regression guard for §13.1's own claim (turn 6's ROCK_SLIDE bg-shift window)
npm run compare -- turn6-rockslide-b --summary     # 105/105
npm run compare -- turn7-rockslide-a --summary     # 256/256
npm run compare -- turn7-rockslide-b --summary     # 256/256
npm run compare -- turn7-rockslide-c --summary     # 256/256
npm run compare -- turn7-rockslide-d --summary     # 19/19
npm run compare -- battle2-turn1-rockslide --summary # 190/191 (pre-existing, unrelated tick-6970 residual)
```

**Not fixed.** `git diff -- src/` remains empty. This is a named,
evidence-backed partial: §11.2's own standing hypothesis is falsified with
strong, reproducible evidence (§13.1-§13.2), a sharper, RAM-confirmed
candidate mechanism is identified (§13.3's occlusion finding plus §13.2's
`BG2CNT` priority difference), and a concrete, minimal candidate fix shape is
named (§13.4) but explicitly flagged as unverified and NOT to be landed
without the VRAM-tile next instrument closing the row-15-44 gap first.

## 14. Side-lane instrument session (2026-08-18, third): §13.4's own named
VRAM-tile next instrument, run - BG0/BG2 definitively ruled out as the
occluder (fully transparent, byte-identical both turns); BG1 carries real
but narrow, non-explanatory content; rows 0/10's exact-static mystery is
UNRESOLVED, not closed by any BG-layer occlusion

ANALYSIS ONLY, side lane, Battle Scene OFF oracle - `git diff -- src/` is
empty throughout this session. New committed probe,
`tools/probe/dump-turn5-resolve-offa-bg02-vram-census.py` (BG0/BG1/BG2
tilemap + 4bpp tile pixel content, full HOFS/VOFS scroll-wraparound
accounting across up to 4 screenblocks per layer, plus the 512-byte BG
palette and HBlank-IRQ enable state, per requested tick). Baseline
reconfirmed fresh at session start and again after: `turn5-resolve-off-a`
58/196 (unchanged), `turn6-rockslide-a` 255/255, `turn5-resolve-off-b`
196/196, `turn5-resolve-off-c` 195/196, `turn5-resolve-off-d` 194/196,
`turn5-reset-off` 256/256, `turn5-action-off` 32/32 - all bit-for-bit the
same as the 758107d9 baselines this step's brief named.

### 14.1 BG0 and BG2 are provably, byte-identically TRANSPARENT across the
entire flagged region, in both turns - the BG2CNT priority-field difference
is NOT causal

§13.4's own named next instrument: dump BG0 (screenBase 24) and BG2
(screenBase 30) tile/tilemap content at a flagged turn-5 tick vs. the turn-6
analog, to see what those layers actually carry. Run at turn 5's own
baseline/shifted-tick pair (6258/6259, plus 6263/6264 for stability) and
turn 6's own analog pair (7801/7802, plus 7806/7807):

- Both layers' HOFS/VOFS are 0 in both turns (matches §13.2's own already-
  recorded hardware read).
- Sampling the FULL visible screen region for both layers (240x64px, i.e.
  tile rows 0-7 / cols 0-29 - covers rows 0/10, §13.3's own proven-static
  rows, and the entire unresolved row-15-44 residual band with margin)
  shows **every single entry, in both layers, in both turns, at every
  sampled tick, is tile index 0 with all-zero (fully transparent) 4bpp
  pixel data** - not "mostly empty," literally zero opaque pixels anywhere
  in the sampled region. `bg0`/`bg2` bbox-of-opaque-content is empty
  (`(999,-1,999,-1)`) for both turns.
- This is **decisive, not suggestive**: BG0 and BG2 contribute **nothing
  visible** at these rows in either turn, so BG2CNT's priority field (0 for
  turn 5, 2 for turn 6 - §13.2's own "one confirmed register-level
  candidate, not yet proven causal") **cannot be the occluder** - a
  transparent layer occludes nothing regardless of its z-order. §13.2's own
  flagged candidate is now **proven non-causal**, not merely undemonstrated.

### 14.2 BG1 carries real, RAM-confirmed content and its own genuine ~7px
VOFS difference between turns - but it is too narrow and starts too low to
explain rows 0/10, or the full-width residual

BG1 (priority 2 in both turns, CNT otherwise identical per §13.2) was not
part of §13.4's own named instrument but was added this session once
BG0/BG2 turned out empty, since it is the only remaining opaque-content BG
candidate. Findings, same tick pairs:

- **BG1's own VOFS genuinely differs between the two turns**: raw hardware
  register reads 500 (turn 5) vs. 493 (turn 6) at every sampled tick in each
  window (HOFS identical, 368, in both) - a real, previously-unremarked
  hardware difference. (§13.2's own prior probe recorded this value in its
  raw JSON output but its written summary only called out CNT-register
  equality, not VOFS/HOFS - this session is the first to act on it.)
- BG1's opaque content is a single narrow object: bbox rows 16-63 / cols
  18-25 (turn 5), rows 25-63 / cols 19-24 (turn 6) - i.e. roughly 48-64px
  wide, starting at x=144px, and **never present above row 16 in either
  turn**.
- Comparing turn 5's content at screen row Y against turn 6's content at
  screen row Y+7 (matching the two turns' own 7px VOFS delta) matches on
  tile index/flip at 982/1230 = 80% of cells in the overlapping band (rows
  16-56) - consistent with this being the **same object**, merely
  repositioned by the same real VOFS delta, not a different object.
- BG1 uses palette bank 8 exclusively (plus bank 0's transparent index), and
  bank 8's own 16 colors differ completely between turn 5 and turn 6 (all 16
  entries, not a subset) - the object's color, not just its position,
  differs between turns.
- **This does not explain §13.3's own rows-0/10 exact-static finding**:
  nothing from BG0, BG1, or BG2 is present at rows 0 or 10 in EITHER turn
  (BG1's own content starts at row 16 at the earliest). Those two rows are
  100% BG3-sourced in both turns, with no occluding layer above them at all.

### 14.3 One cheap remaining lead checked and ruled out: HBlank IRQ is
disabled throughout both windows

A once-per-tick RAM snapshot (this probe's own method, and §13.2's own
prior probe) cannot see a mid-frame scanline-split scroll rewrite (a
standard GBA technique: an HBlank IRQ handler that changes BGnVOFS partway
down the frame, so only some scanlines show a shift even though the
end-of-frame/shadow value reads uniformly). This session added a direct
check: `REG_IE` bit 1 (HBlank IRQ enable) and `REG_DISPSTAT` bit 4 (HBlank
IRQ enable) are both **False** at every sampled tick in both turns. This
doesn't prove no mid-frame effect exists (a handler could enable/disable the
IRQ faster than our once-per-tick sampling cadence), but there is no
positive evidence for one, and it rules out the simplest, standing-enabled
form of that hypothesis.

### 14.4 What this means for the fix: the row-0/10 gap is NOT closed; the
candidate fix remains unverified, now for a sharper reason

**§13.4's own instrument is complete, and it does not close the gap it was
named to close.** The prior session's own framing was: "if BG2's own tile
data turns out to be identical between turn 5 and turn 6 too, the
flat-static finding in §13.3 would need re-explaining from OAM/sprite
occlusion instead." That antecedent is now true (BG2 - and BG0 - are
identical, empty, in both turns), so its own consequent applies: **the
explanation is not a BG-layer occlusion difference at all.** Every
hardware-visible BG-layer signal (registers, tilemap, tile pixels, palette)
that could occlude BG3 at rows 0/10 has now been read directly and is
either absent (BG0/BG2) or geometrically excluded (BG1, which never reaches
row 16). The mystery §13.3 raised - the real screen not moving at rows 0/10
despite BG3VOFS genuinely, RAM-confirmedly cycling -7, using rendering code
proven bit-exact elsewhere - is **unresolved by this session**, not merely
"not yet proven."

**The candidate fix named in §13.4 (turn 5's
`drawStaticBgShiftedY(fb, shiftY, ...)` becoming
`drawStaticBgShiftedY(fb, 0, ...)`) must still NOT be recommended as
landable on this session's evidence.** It remains empirically consistent
with the two proven-static rows (0 and 10 both show what a flat shiftY=0
would produce - true in both turns, an outcome-level match) and would leave
the row-15-44 residual (§13.4's own ~4.6-6.6%, not fully re-derived this
session) only PARTIALLY addressed at best: BG1's own narrow blob (cols
18-25 only, ~1/4 of the screen width) cannot account for a full-width
residual, so most of that band's real cause is still unidentified even
after this session.

**Next instrument, named precisely per the family's own "honest partial"
discipline, and the one the doc has pointed at since §13.4 without yet
running it:** the OAM/sprite census `dump-turn5-resolve-offa-sprite-
census.py` already exists (§11.2's own citation) but its prior run only
checked already-known battler/icon-bar sprites' positions, not every
sprite's bbox against rows 0-63 specifically for occlusion purposes. Re-run
it at the same tick pairs used here (6258/6259/6263/6264 vs.
7801/7802/7806/7807), this time computing each of the 64 `gSprites[]`
slots' own screen bbox (including any not-yet-attributed slot) and
intersecting against rows 0-63 for both turns - if a sprite occupies rows
0/10 in one turn and not the other (or with different opacity/priority),
that is the closing piece of evidence. If OAM also turns out empty/
identical at those exact rows in both turns, the remaining candidate is the
mid-frame HBlank-toggle hypothesis (§14.3) - which would need an
instruction-level or multiple-reads-per-frame probe that this probe family
has not yet built (not confirmed unavailable in the harness - just not
attempted by any probe so far, this one included).

### 14.5 Rerunnable guards (fresh, this session)

```sh
cd workspace   # WORKTREE GOTCHA - verify with `npm prefix` first
npm run compare -- turn5-resolve-off-a --summary   # 58/196, unchanged (ANALYSIS ONLY - no src/ edit this session)
npm run compare -- turn6-rockslide-a --summary     # 255/255
npm run compare -- turn5-resolve-off-b --summary   # 196/196
npm run compare -- turn5-resolve-off-c --summary   # 195/196 (pre-existing 6763 residual)
npm run compare -- turn5-resolve-off-d --summary   # 194/196
npm run compare -- turn5-reset-off --summary       # 256/256
npm run compare -- turn5-action-off --summary      # 32/32
```

Probe rerun (writes fresh JSON per turn; an mGBA teardown SIGSEGV after
valid JSON is written is expected and benign per `tools/run-mgba-probe.py`'s
own docstring):

```sh
python3 tools/run-mgba-probe.py /tmp/vram-turn5.json -- \
  tools/probe/dump-turn5-resolve-offa-bg02-vram-census.py \
  tools/compare/traces/turn5-resolve-off-a.json /tmp/vram-turn5.json 6258 6259 6263 6264
python3 tools/run-mgba-probe.py /tmp/vram-turn6.json -- \
  tools/probe/dump-turn5-resolve-offa-bg02-vram-census.py \
  tools/compare/traces/turn6-rockslide-a.json /tmp/vram-turn6.json 7801 7802 7806 7807
```

**Not fixed.** `git diff -- src/` remains empty. §13.4's own next instrument
is run in full and its own conditional "re-explain from OAM/sprite occlusion
instead" branch is now the live path: BG0/BG2 are proven non-occluders
(transparent, identical), BG1 is real but geometrically excluded from rows
0/10, and the row-0/10 exact-static mystery central to this whole residual
remains open. The next session's fix worker should NOT land the §13.4
candidate fix from this doc alone without first running the OAM/sprite
census named in §14.4 above - if that also comes back empty at rows 0/10,
the doc should say so explicitly and escalate to the HBlank/scanline-split
hypothesis, which needs a new instrument this probe family cannot yet
provide.
