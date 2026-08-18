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
