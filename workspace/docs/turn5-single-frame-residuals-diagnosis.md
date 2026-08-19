# Turn 5 single/few-frame residual groups — 2026-08-18 diagnosis (ISSUES #97 remainder)

Bounded MAIN-lane worker, Battle Scene OFF oracle. Scope per this step's
brief: pixel-first (then RAM where ambiguous) diagnosis of the four named
residual groups PROGRESS 1342 open item (b) left after ISSUES #97's
assembly-line session — `turn5-resolve-off-c` (195/196, tick 6763),
`turn5-resolve-off-d` (194/196, ticks 6850/6996), `turn5-confirm-off-a`
(128/132, ticks 5959-5961/5968), `turn5-confirm-off-b` (131/132, tick 6184).
All four baselines were verified fresh, unchanged, before touching anything
(`npm run compare` output below matches the brief's own cited counts
exactly). One fix was attempted (confirm-off-a) and **empirically
falsified** — reverted, `git diff -- src/` is clean at the end of this
session. All four residuals are **BANKED**, not fixed; each has a concrete
next probe below. I own this file; do not confuse it with
`docs/turn5-resolve-offc-tail-diagnosis.md` (the -c tick's own prior,
now-superseded "AA-class" framing lives there — this doc supersedes that
framing with decisive new OAM evidence) or
`docs/turn5-resolve-ab-pools-diagnosis.md` (READ ONLY this round, owned by
a parallel side-lane worker instrumenting `resolve-off-a`'s 6262-6354 band
— not edited here).

## 0. Baselines (fresh, this session, before any change)

```
npm run compare -- turn5-resolve-off-c --summary   -> 195/196 (tick 6763)
npm run compare -- turn5-resolve-off-d --summary   -> 194/196 (ticks 6850, 6996)
npm run compare -- turn5-confirm-off-a --summary   -> 128/132 (ticks 5959,5960,5961,5968)
npm run compare -- turn5-confirm-off-b --summary   -> 131/132 (tick 6184)
```

All four match the brief's own cited counts exactly — no drift from other
lanes' concurrent work.

## 1. `turn5-resolve-off-c` tick 6763 — BANKED, new decisive OAM evidence supersedes the old "AA-class" framing

### 1.1 The old framing was wrong

`docs/turn5-resolve-offc-tail-diagnosis.md` §14's own landed addendum
characterized this residual as "the same class of isolated
anti-aliasing/rounding-adjacent single-channel miss already accepted
elsewhere in this family." Direct pixel sampling this session
(`tools/probe/analyze-residual-family-sample.ts`, bbox `0,41-2,43`)
contradicts that framing outright — this is not a rounding fringe:

```
(0,41) app=(123,148,132) oracle=(255,255,255)
(0,42) app=(82,107,99)   oracle=(255,255,255)
(1,42) app=(123,148,132) oracle=(255,255,255)
(0,43) app=(82,107,99)   oracle=(255,255,255)
(1,43) app=(82,107,99)   oracle=(255,255,255)
(2,43) app=(123,148,132) oracle=(255,255,255)
```

Solid, saturated content (a green-gray pair, `(123,148,132)`/`(82,107,99)`)
where the oracle is flat white — a structural content-presence difference,
not an anti-aliasing/rounding fringe. Confirmed transient and isolated: the
SAME bbox is 0 diffs at ticks 6760-6762 and 6764-6765 (both sides agree,
white) — only render 6763 (the healthbox slide-in's own first onset tick,
`TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK=6763`, §3c of the tail
diagnosis doc) shows this patch.

### 1.2 Root cause, decisively pinned: our software's healthbox draw uses a wider single canvas than the real hardware's sprite

`drawSendOutHealthbox` (`battleScene.ts:7627-7646`) blits
`composeOpponentHealthbox`'s content — a single **128×32** canvas
(`FRAME_SIZE`, `healthboxAssembly.ts:169`) — anchored at
`HEALTHBOX_FRAME_ORIGIN = FRAME_ORIGIN = {x:12, y:14}`
(`healthboxAssembly.ts:168,612`), translated by `dx`. At the onset tick,
`dx=-110`, so the canvas spans screen `x = 12-110 .. 12-110+127 = -98..29`
— column `px=98..100` (canvas-local) lands at screen `x=0..2`, exactly the
mismatch bbox.

A fresh RAM probe (`tools/probe/dump-turn5-resolve-offc-tail-probe.py`,
rerun this session, window `[6755,6770]`) reads the REAL healthbox sprite's
own OAM fields directly:

```
RAM 6761: x=44 x2=0    invisible=True  shape=1 size=3
RAM 6762: x=44 x2=-110 invisible=False shape=1 size=3   <- onset
RAM 6763: x=44 x2=-110 invisible=False shape=1 size=3   <- held
RAM 6764: x=44 x2=-105 invisible=False shape=1 size=3
```

`shape=1, size=3` is a GBA OBJ **64×32** sprite (not 128 wide), based at a
FIXED screen `x=44` (not our software's `origin.x=12`). At the onset tick,
real screen span is `x = 44-110 .. 44-110+63 = -66..-3` — **entirely
off-screen** (max `x=-3`), so the real hardware genuinely shows nothing —
matching the oracle's own flat white read exactly. Our software's wider,
differently-anchored 128px canvas model happens to let a fragment of its
own far column range peek onto screen at this one extreme-negative-`dx`
tick, purely a byproduct of the two models' geometry not matching, not a
timing/anchor bug in `TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK` itself
(already independently RAM-confirmed correct for the other 22 slide ticks
in the tail diagnosis doc's own §3c/§7 verification).

### 1.3 Why this is BANKED, not fixed

The real hardware's healthbox is evidently composed from (at least) this
one 64-wide "frame" sprite (name/level text) — the OTHER half (HP bar,
per `composeOpponentHealthbox`'s own `HP_BAR_SUBSPRITE_CORNERS`) is a
SEPARATE real sprite this session did not probe (`gHealthboxSpriteIds[1]`
only tracks the ID this probe already reads; the HP-bar sub-sprite's own
ID/base-X is untouched). A correct fix needs the real per-sprite screen
boundaries for BOTH halves so `drawSendOutHealthbox` can clip like real
hardware does (per-sprite, not one wide canvas) — not a one-line constant
change, and every OTHER tick in this 23-tick slide (6764-6785, already
oracle-verified exact per §3c/§7 of the tail diagnosis doc) would need to
keep matching under any reshaped draw. Given the residual is a single
6px/0.02% patch on one tick, restructuring the draw call within this
session's remaining budget risked the family's own "no regression" bar for
a very small gain — banked per the brief's own "genuinely ambiguous frame,
don't force a speculative fix" guidance.

**Next probe** (named, not run this session): RAM-scan all 64 `gSprites[]`
slots at RAM tick 6762 for a second sprite whose `x`/`x2` track in lockstep
with `gHealthboxSpriteIds[1]` (same callback family, same per-tick `x2`
step) — that is PIDGEOTTO's own HP-bar sub-sprite. Once its own real base
`x` is known, `drawSendOutHealthbox` can clip each conceptual half of the
128-wide canvas to its own real 64px hardware boundary before drawing,
which should make this tick (and any other extreme-`dx` tick elsewhere in
the family reusing this same draw call) match without touching the
already-verified 6764-6785 span.

## 2. `turn5-resolve-off-d` tick 6850 — BANKED, same accepted "PNG(T) shows RAM(T-1)" boundary class as 6184/etc

### 2.1 Pixel evidence

`tools/probe/analyze-residual-family-sample.ts`, bbox `16,124-144,149`
(the row of oracle-06850.png closest to the message-box text baseline):

```
(16,124) app=(107,165,165) oracle=(255,255,255)
(20,124) app=(107,165,165) oracle=(107,90,115)
(23,124) app=(107,165,165) oracle=(255,255,255)
(27,124) app=(107,165,165) oracle=(107,90,115)
...
```

The app shows a **solid, uniform** fill (`107,165,165`, the new heal-text
box's own background color, zero characters revealed) across the whole
row; the oracle shows a mostly-white background with sparse
`(107,90,115)` pixels at specific x-positions — the glyph pattern of OLD
text still lingering. `TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK = 6850`
(`battleSceneCanonical.ts`) is this window's own dispatch-gate anchor —
tick 6850 is the FIRST tick the app's new branch fires at all. This is
byte-for-byte the same shape as `turn5-confirm-off-b`'s own already-banked
tick 6184 (§4 below) and every other hard-cut dispatch-gate boundary this
family has already accepted elsewhere (`docs/turn5-confirmb-resolved-
residuals.md` §1.5's own "PNG(T) shows RAM(T-1)" framing, cited repeatedly
throughout that doc for identical single-tick artifacts).

### 2.2 Why this is BANKED

The oracle's own captured pixel at render tick T reflects real RAM state as
of T-1 (the family's own established, RAM-confirmed display-basis
convention — restated at `battleScene.ts:14829-14835`'s own doc comment).
At a genuine dispatch-gate transition, the app (a pure function of `t`)
switches content the instant `t` crosses the anchor, while the oracle's
own captured frame at that exact tick still reflects the PRIOR RAM state
one tick longer. This is architecturally inherent to a hard cutover, not a
bug in the anchor tick itself — moving `TURN5_OFF_SITRUS_HEAL_TEXT_START_
TICK` would only shift WHICH tick shows this same one-frame artifact, and
would desync the other 35 already-matching ticks in this window (the
`turn5SitrusOffHealTextVisibleChars`/`turn5OffSitrusOnixHp` formulas this
family already RAM-pinned and landed against this exact anchor, ISSUES
#97 sub-entry H/§9-10 of `docs/turn5-confirmb-resolved-residuals.md`).
Matches this family's own precedent exactly (6184, and every other
accepted boundary tick already recorded across this dossier) — not
independently re-chased.

**Next probe**: none named — this is the same architecturally-inherent
class already accepted at 6184 and elsewhere; a future session would need
a NEW capture-basis convention (not a tick shift) to close it, out of
scope for a single-tick, already-understood artifact.

## 3. `turn5-resolve-off-d` tick 6996 — BANKED, current bbox contradicts the inherited "cursor-adjacent" label

### 3.1 The "cursor-adjacent, do not touch" framing is stale

`docs/turn5-confirmb-resolved-residuals.md` §9.1's own table (measured
against a 159/196 baseline, BEFORE §9/§10's own three fixes landed) flagged
tick 6996 as bbox `43,71-229,110` — a region that touched `y>=115`, i.e.
overlapped the button-grid/cursor area, and multiple sessions since have
carried that "do not touch anything cursor-related" caution forward
verbatim without re-measuring. This session's fresh baseline (194/196,
post-fix) shows the bbox has SHRUNK and MOVED: **`127,74-229,110`** — every
row is `y<=110`, entirely inside the on-field sprite/background region, not
the button-grid/cursor chrome (which lives at `y>=115..149`) at all. The
old "cursor-adjacent" framing no longer describes this tick's own current
content.

### 3.2 What the pixels show now

Sampling the bbox directly (`analyze-residual-family-sample.ts`) finds TWO
separate color relationships depending on row:

```
y=74 (top of bbox):  app=(82,107,99) [constant across x=140-196]  oracle=gradient (214,214,198 -> 189,189,156, terrain-textured)
y=110 (bottom):       app=(247,247,255) [background]               oracle=(82,107,99)/(123,148,132) [the SAME teal pair]
```

The same `(82,107,99)`/`(123,148,132)` pair implicated in §1's own
resolve-off-c tick-6763 finding reappears here, on the OPPOSITE side of the
app/oracle relationship (app paints it at the top row here; oracle paints
it at the bottom row) — consistent with a real, textured content shape
that's mispositioned rather than a missing/spurious flat fill. This trace's
own capture window (6810-7005) is entirely inside the "settled" post-menu-
redraw scene, reusing the SAME `drawTurn5SwitchinSprite`/background draw
path PROGRESS 1342's own open item (a) already names for `resolve-off-a`'s
own OUT-OF-SCOPE 6262-6376 static-background/rock-sprite residual (this
step's brief explicitly walls off `resolve-off-a`'s own band and
`drawTurn5RockSlideAttack`'s background path).

### 3.3 Why this is BANKED

Given the shared-draw-path overlap with the explicitly out-of-scope
resolve-off-a band, and this step's own explicit instruction ("If a
candidate fix for one of YOUR residuals would change code that alters
turn5-resolve-off-a's count, STOP that fix, bank the diagnosis instead"),
this residual is banked without attempting a fix regardless of what the
underlying mechanism turns out to be — touching the shared background/
sprite draw path risks moving `resolve-off-a`'s own pinned 60/196 guard
count, confirmed unchanged throughout this session (§5 below).

**Next probe** (named, not run this session): a fresh full-OAM census
(`dump-turn5-resolve-offa-sprite-census.py`'s own pattern, already proven
in `docs/turn5-resolve-ab-pools-diagnosis.md` §11.2) at the RAM tick
corresponding to render 6996 for THIS trace specifically, to identify which
real sprite (if any) occupies the `x=127-229,y=74-110` screen region and
whether its real position/content matches what our software draws there —
run in the SAME session as whichever session next tackles resolve-off-a's
own static-background residual, since they plausibly share a root cause
and a shared fix risks moving both counts together.

## 4. `turn5-confirm-off-b` tick 6184 — BANKED, confirmed instance of the family's own already-accepted boundary class

Pixel evidence (`analyze-residual-family-sample.ts`, bbox `16,124-105,149`)
is byte-for-byte the same shape as §2's own resolve-off-d tick 6850: app
shows a solid, uniform new-box fill (`107,165,165`); oracle shows a mostly-
white background with sparse old-text glyph pixels (`107,90,115`) at
specific x-positions. `docs/turn5-confirm-pools-diagnosis.md` §0's own
census already named this exact tick "class 4 (accepted, not chased) — the
`rockSlideTextStartTick=6184` hard-cut's own one-tick 'PNG(T) shows
RAM(T-1)' transition edge — same accepted class as every other hard-cut
boundary in this family." This session's fresh pixel read confirms that
classification directly rather than taking it on faith — no new mechanism,
no new instrument needed. **BANKED**, same reasoning as §2.2.

## 5. `turn5-confirm-off-a` ticks 5959-5961, 5968 — attempted fix EMPIRICALLY FALSIFIED, reverted; residual re-characterized as a compound of (at least) two disjoint regions

### 5.1 The precedent-matched hypothesis, and why it looked promising

`turn5KickoffBounceTickFromLatest`'s own non-null branch
(`battleScene.ts:10315-10340`) reduces, in the pre-freeze-delay case, to
the EXACT SAME formula chain as `turn5SubmenuBounceTickFromLatest`
(`turn5LegacyResettledBounceTickFromLatest(t, latest) -
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`) — but the SIBLING call site (the
"idle-wait" reopened-submenu branch, `battleScene.ts:8735-8737`) calls it
with an explicit `t - 1` display-basis correction AND a `+109` raw-sine-
index offset (`docs/turn5-bounce-recalibration-probe.md` §8c/§8f,
oracle-RAM-proven for this exact turn-5 window), while the CONFIRM-WAIT
call site (`confirmWaitBounceTick = turn5KickoffBounceTickFromLatest(t,
pressTick, latestCompletedCommandHandoff)`, `battleScene.ts:8681-8682`,
feeding `drawMenuIdleBounceOverlay(fb, confirmWaitBounceTick)` with no
offset argument) has NEITHER correction. Direct pixel sampling at tick
5959 (bbox `44,49-99,99`, the Onix-sprite sub-region only) showed a clean
vertical-shift signature consistent with a one-step bounce-offset error:
`app(58,49) == oracle(58,50)` (app's content one row above where the
oracle shows it).

### 5.2 The experiment, and its decisive negative result

Applied the sibling's exact treatment to the confirm-wait call site (new
`confirmWaitBounceIndexOffset = turn5Active ? 109 : 0`, `t - 1` passed to
`turn5KickoffBounceTickFromLatest`, threaded through both
`drawMenuIdleBounceOverlay` and the HP-overlay's own `menuIdleBounce`
call). Result:

```
before: turn5-confirm-off-a 128/132 (mismatches: 5959, 5960, 5961, 5968)
after:  turn5-confirm-off-a 125/132 (mismatches: 5962, 5963, 5964, 5965, 5966, 5967, 5968)
```

**Net regression** — 5959-5961 newly matched, but 5962-5967 (six
PREVIOUSLY-MATCHING frames) broke, and 5968's own diff grew from
10930px/28.46% to 13290px/34.61%. Reverted immediately (`git diff -- src/`
confirmed clean after revert; guard family re-verified in §6 below, all
unchanged).

### 5.3 What the failure reveals: the frozen-phase value is ALREADY correct, so this isn't a bounceTick-value bug at all

`FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY = 3` (`battleMenu.ts:1184`),
`pressTick = 5959`. Before this session's edit, the freeze condition `t <
pressTick + 3 = 5962` means renders 5959-5961 use `sourceTick = t` (live)
while renders 5962+ use `sourceTick = pressTick = 5959` (frozen). Critically,
render 5959's own LIVE `sourceTick` (5959) and every frozen render's own
`sourceTick` (also 5959) are **the same value** — `turn5KickoffBounceTickFromLatest`
is a pure function of `sourceTick`, so it necessarily returns the IDENTICAL
result for render 5959 and for every render from 5962 on. Since renders
5962-5967 already match the oracle **using that exact value**, the value
itself cannot be what's wrong at render 5959 — despite the clean-looking
vertical-shift pixel signature in §5.1, the bounce formula is not the
actual defect. (This is new evidence the earlier speculative framing in
`docs/turn5-confirm-pools-diagnosis.md` §3.1 — "consistent with the same
sine-bounce-index-offset family... not confirmed this session" — did not
have: that hypothesis is now empirically ruled out, not merely unconfirmed.)

### 5.4 The residual is a compound of two disjoint screen regions, not one mechanism

A wider bbox scan at tick 5959 (`44,49-229,110`, the full reported mismatch
box) shows the 2360 mismatched pixels split into two **completely
disjoint** x-ranges with a clean gap between them:

- **x=44-99** (Onix sprite silhouette region): the vertical-shift-looking
  pattern from §5.1.
- **x=127-229** (a much larger region, no mismatch at all in x=100-126):
  a separate content difference this session did not further isolate.

These two regions are far enough apart (28px gap, zero diffs in between)
that they are very unlikely to be one mechanism — most likely two
independent, currently-conflated defects. Tick 5968's own huge, separate
spike (`bbox=1,113-238,158`, 10930px/28.46%, both app and oracle showing
totally different solid fill colors — `(41,49,49)` vs `(74,66,82)` sampled
at the bbox's own corner) is consistent with a THIRD, distinct mechanism:
5968 is the last tick before `turnKickoffTextStartTick(pressTick) = 5969`
(`FIGHT_CONFIRM_TEXT_DELAY=10`, `battleMenu.ts:1162,1172`) — the same
"PNG(T) shows RAM(T-1)" hard-cut-boundary class as §2/§4 above, on a much
larger scale (a whole submenu-to-kickoff-text content swap, not just a
message box).

### 5.5 Why this is BANKED

Three ticks (5959-5961) are a still-unidentified defect in a region NOT
explained by the bounce formula (ruled out by §5.3's own direct
experiment); a fourth, disjoint region (x=127-229) at the same ticks is
completely uncharacterized; tick 5968 is likely (not confirmed) the same
accepted boundary-artifact class as §2/§4. None of these four sub-findings
is a decisively-pinned, single-mechanism fix — landing anything here now
would be exactly the "curve-fitting a single frame" this family's own
discipline warns against. Banked per the brief's own "genuinely ambiguous
frame" guidance, with the falsified hypothesis recorded so a future
session doesn't re-try it.

**Next probe** (named, not run this session): a full 64-slot `gSprites[]`
OAM census (same pattern as §1.2's probe / `dump-turn5-resolve-offa-
sprite-census.py`) at RAM ticks 5957-5967 of `turn5-confirm-off-a.json`,
specifically identifying (a) whether GROVYLE's own front sprite (not just
Onix's) has any active content/position change in this window that would
explain the x=127-229 region, and (b) what real mechanism — if not the
bounce — produces the x=44-99 Onix-region mismatch at exactly 5959-5961
only. `tools/probe/dump-turn5-confirma-bounce-driver.py` (committed this
session, window widened to 5955-5970) already has the bounce driver's own
sinIndex/y2 fields available for a quick cross-check once a candidate
mechanism is named.

## 6. Full guard family (fresh, this session, after the revert — zero decreases anywhere)

```
turn5-resolve-off-a        60/196   (unchanged — the out-of-scope guard bar)
turn5-resolve-off-b       196/196
turn5-resolve-off-c       195/196   (unchanged — banked, §1)
turn5-resolve-off-d       194/196   (unchanged — banked, §2/§3)
turn5-reset-off           256/256
turn5-action-off            32/32
turn6-reopen-off             46/46
turn6-menu-off.json fixture  47/47
turn5-confirm-off-a        128/132   (unchanged — banked, §5)
turn5-confirm-off-b        131/132   (unchanged — banked, §4)
turn6-rockslide-a          255/255
turn6-rockslide-b          105/105
turn7-rockslide-a          256/256
turn13-switchin            242/242
turn4-doubleteam-off       256/256
turn4-rockslide-off        256/256
```

`git diff -- src/` is empty at the end of this session — every fix
attempted was verified live and reverted on failure, per this family's own
"confirmed by direct experiment, not curve-fit" discipline. Two new
committed probes: `tools/probe/analyze-residual-family-sample.ts` (generic
bbox pixel-diff dumper, reusable for any future residual in this family)
and `tools/probe/dump-turn5-confirma-bounce-driver.py` (the bounce
driver's own RAM fields, windowed to `turn5-confirm-off-a`'s own
5955-5970 span).

## 7. Verdict

All four named residual groups are diagnosed with concrete, decisive
evidence (three with new RAM/pixel ground truth that supersedes or
corrects prior sessions' own speculative framing; one with a direct,
falsifying experiment) and BANKED — none met this family's own "decisively
pinned, not curve-fit" bar for a landed fix within this session's scope
and time budget. Every next probe above is concrete and rerunnable. No
landed anchor was contradicted; §1 and §5 both correct *prior sessions'
own speculative* framing (not landed fixes) with fresh, decisive evidence.
