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

## 8. 2026-08-18 (side lane) — `turn5-resolve-off-c` tick 6763, §1.3's named probe run: the "two-sprite differential clip" framing is REFUTED (mathematically a no-op); the real gap is elsewhere

Bounded SIDE-lane INSTRUMENT worker, Battle Scene OFF oracle. Scope: run
§1.3's own named next probe (RAM-scan all 64 `gSprites[]` slots to find
PIDGEOTTO's HP-bar sub-sprite tracking `gHealthboxSpriteIds[1]` in
lockstep) and report the fix shape. `git diff -- src/` is empty this
session — INSTRUMENT only, no `src/` edit attempted.

### 8.1 Baseline (fresh, unchanged)

```
npm run compare -- turn5-resolve-off-c --summary  -> 195/196 (tick 6763, bbox 0,41-2,43)
```

### 8.2 The probe: it's THREE real sprites, not two, and both non-`gHealthboxSpriteIds[1]` sprites lockstep perfectly

Source ground truth (`reference/pokeemerald/src/battle_interface.c:851-868`,
own comment): *"Because the healthbox is too large to fit into one sprite,
it is divided into two sprites. healthboxLeft/Main is the left part...
healthboxRight/Other is the right part... There's also a third sprite...
healthbarSprite... visible on the healthbox."* `CreateBattlerHealthboxSprites`
(`battle_interface.c:869-951`) creates and links all three together;
`gSprites[left].oam.affineParam` holds the right sprite's own id,
`gSprites[left].data[5]` (`hMain_HealthBarSpriteId`) holds the healthbar's
own id. Both slave callbacks (`SpriteCB_HealthBar`/`SpriteCB_HealthBoxOther`,
`battle_interface.c:979-1013`) set `sprite->x2 = gSprites[left].x2` every
frame — lockstep BY CONSTRUCTION, not coincidence.

New probe `tools/probe/dump-turn5-resolve-offc-healthbox-halfsprite-census.py`
(modeled on the bootstrap-corrected `dump-turn5-resolve-offa-oam-bg3rows-
census.py`), run against `tools/compare/traces/turn5-resolve-off-c.json`
across ticks 6758-6790 (the whole slide span plus lead-in/settle margin),
independently confirms this from raw RAM — a full 64-slot scan finds
exactly slots 60/61 tracking `left.x2` in lockstep at every single moving
tick (6762-6784), with no other slot ever spuriously matching:

| tick | left.x2 | right(61).x2 | bar(60).x2 | left.invisible |
|---|---|---|---|---|
| 6761 | 0 | 0 | 0 | True (pre-onset) |
| 6762 | -110 | -110 | -110 | False (onset) |
| 6763 | -110 | -110 | -110 | False (residual tick, held) |
| 6764 | -105 | -105 | -105 | False |
| 6774 | -55 | -55 | -55 | False |
| 6784 | -5 | -5 | -5 | False |
| 6785 | 0 | 0 | 0 | False (settled) |

(Full 33-tick table in the probe's own JSON output; every tick not shown
steps `x2` by exactly +5, matching `HEALTHBOX_SLIDE_STEP`,
`battleScene.ts:3591`.)

Per-sprite static fields (identical at every tick, RAM-confirmed):

| sprite | id | x (base) | y | shape/size | px dims | subpriority | `centerToCornerVecX/Y` |
|---|---|---|---|---|---|---|---|
| left (`gHealthboxSpriteIds[1]`) | 1 | 44 | 30 | 1/3 | 64x32 | 1 | -32/-16 |
| right (`oam.affineParam`) | 61 | 108 (=44+64) | 30 | 1/3 | 64x32 | 1 | -32/-16 |
| **healthbar (`data[5]`)** | **60** | **52 (=44+8)** | **30** | **1/1** | **32x8** | **0** | **-16/-4** |

**Headline number: PIDGEOTTO's own HP-bar sub-sprite (slot 60) has measured
base `x=52`** (`left.x + 8`, matching `SpriteCB_HealthBar`'s opponent-side
`hBar_Data6=2` case exactly, `battle_interface.c:993-997`), `y=30`, shape
1/size 1 (32×8px), subpriority 0, `centerToCornerVecX/Y = (-16,-4)`. (A
bonus second finding beyond what was asked: slot 61, the right FRAME half,
base `x=108`.)

### 8.3 The centerToCornerVec correction (a latent gap in every prior session's model)

Every prior session's screen-position math for these sprites (§1.2 above;
`dump-turn5-resolve-offc-tail-probe.py`'s own prior reads) used
`screenX = sprite.x + x2` directly. The REAL formula
(`UpdateOamCoords`, `reference/pokeemerald/src/sprite.c:339-359`) is:

```
oam.x = sprite.x + x2 + centerToCornerVecX   (+ gSpriteCoordOffsetX iff coordOffsetEnabled — confirmed FALSE for all 3 sprites here)
```

This session's follow-up probe (`tools/probe/dump-turn5-resolve-offc-
healthbox-halfsprite-vram.py`) read `centerToCornerVecX/Y` directly and
found `(-32,-16)` for left/right, `(-16,-4)` for the healthbar — exactly
half each sprite's own width/height, the standard GBA center→corner
convention. Plugging in: **left's own real corner = 44 + x2 - 32 = 12 +
x2** — which exactly equals `FRAME_ORIGIN.x` (`healthboxAssembly.ts:168`)
plus `x2` (i.e. `dx`, since this session also reconfirmed `dx` at each
app tick numerically equals real RAM `x2` one tick earlier, matching the
family's own established "PNG(T) shows RAM(T-1)" display-basis convention
— `battleScene.ts:14829-14835`). This is not a coincidence: it's why the
already-oracle-exact 6764-6785 span works at all. **Right's own real
corner = 108 + x2 - 32 = 76 + x2 — exactly 64px right of left's corner, at
every shared `x2`** (since both share the identical `x2` every tick, per
§8.2). The healthbar's own real corner = 52 + x2 - 16 = 36 + x2.

### 8.4 The fix shape this step's brief anticipated (per-sprite clip) is a mathematical NO-OP — REFUTES the inherited "differential clip" framing

The brief's framing (this step's own prompt, and §1.3 above): our
`drawSendOutHealthbox` (`battleScene.ts:7627-7646`) draws one continuous
128px-wide canvas (`FRAME_SIZE`, `healthboxAssembly.ts:169`) at
`HEALTHBOX_FRAME_ORIGIN.x + dx + px`, while real hardware clips two
independent 64px sprites to their own screen bounds — implying a
per-sprite-clip reshape should fix extreme-`dx` ticks like 6763.

§8.3's own corrected math refutes this directly. Real left span at any
shared `x2`: `[12+x2, 75+x2]` (64px). Real right span: `[76+x2, 139+x2]`
(64px). These are **immediately adjacent with zero gap and zero overlap**,
at every `x2`, because both origins (12, 76) differ by exactly 64 and both
move by the identical `x2` every tick. Their union is therefore always the
single contiguous range `[12+x2, 139+x2]` — **exactly** the current
canvas's own unsplit span (`FRAME_ORIGIN.x+dx .. FRAME_ORIGIN.x+dx+127`,
128 = 64+64). A per-sprite clip (draw canvas px 0-63 only within
`[12+dx,75+dx]`, canvas px 64-127 only within `[76+dx,139+dx]`) recombines
to the byte-identical screen range as today's single unclipped blit, at
**every** tick, not just the already-matching ones. It cannot change tick
6763's rendered pixels at all — the two framings are mathematically
equivalent, not just empirically close.

**Paper-check (canvas px → screen, `FRAME_ORIGIN.x=12`), current vs.
per-sprite-clip, at 4 ticks including 6763/6764:**

| tick | dx | canvas span (current, px0-127) | left-clip span (px0-63) | right-clip span (px64-127) | union (clipped) | same as current? |
|---|---|---|---|---|---|---|
| 6763 | -110 | [-98, 29] | [-98, -35] | [-34, 29] | [-98, 29] | **yes** |
| 6764 | -105 | [-93, 34] | [-93, -30] | [-29, 34] | [-93, 34] | **yes** |
| 6774 | -55 | [-43, 84] | [-43, 20] | [21, 84] | [-43, 84] | **yes** |
| 6785 | 0 | [12, 139] | [12, 75] | [76, 139] | [12, 139] | **yes** |

Every tick, clipped and unclipped unions are identical (adjacent-zero-gap
spans always recombine to the same union) — so the already-exact
6764-6785 span is trivially preserved by construction (not something that
needs re-verifying per candidate fix), **and so is 6763's own mismatch**:
a per-sprite-clip reshape predicts **zero pixel change**, confirmed by
direct arithmetic, not just untested. This step's own inherited "the halves
clip differently than real hardware" framing (this step's prompt; §1.3
above) is REFUTED — same "prior speculative framing corrected by fresh
evidence" move §1.1 and §5 already made elsewhere in this doc.

### 8.5 What actually happens at the mismatch pixel: content is ALSO byte-exact — the gap is neither clip nor content

Given clipping is ruled out, the remaining candidate was a content/harvest
error in the canvas itself. Direct check: `dump-turn5-resolve-offc-
healthbox-halfsprite-vram.py` decodes the right sprite's own OBJ VRAM tile
(4bpp, `tileNum=188`, confirmed `156+32` = exactly `CreateBattlerHealthbox
Sprites`'s own opponent-side `tileNum += 32`, `battle_interface.c:893`) at
its real local position for the mismatch. The residual bbox (screen
`0,41`-`2,43` at tick 6763) maps, via §8.3's corrected formula
(`localCol = screenX - 76 - x2`, `localRow = screenY - 14`), to right-local
`(col 34-36, row 27-29)` — **not** `(col 2-4, row 11-13)`, the naive
pre-centerToCornerVec mapping an earlier draft of this same probe used
before catching the omission.

Decoded real tile indices there (palette bank 5): `(34,27)=5, (35,27)=0,
(36,27)=0` / `(34,28)=6, (35,28)=5, (36,28)=0` / `(34,29)=6, (35,29)=6,
(36,29)=5`. Cross-checked against the app's own rendered pixels at the
corresponding screen cells (`(0,41)=idx5, (1,41)=bg, (2,41)=bg` /
`(0,42)=idx6,(1,42)=idx5,(2,42)=bg` / `(0,43)=idx6,(1,43)=idx6,(2,43)=idx5`,
sampled via `npm run compare -- turn5-resolve-off-c /tmp/offc-run
--capture-range 6760:6768`) — **byte-exact, cell-for-cell, including which
cells are transparent**. Palette index 5 = `0x424f` = `(123,148,132)`,
index 6 = `0x31aa` = `(82,107,99)` — the EXACT colors §1.1 reported as the
app's own mismatch content. Our canvas is not inventing content; it is
faithfully reproducing the real right sprite's own tile bitmap, correctly
positioned.

**This means neither the clip boundary (§8.4) nor the harvested content
(§8.5) is wrong.** Both independently, decisively match real hardware's
own OAM-level and VRAM-level data. Yet the oracle's own captured pixel at
that exact screen location is flat white. The discrepancy is not visible
anywhere in the software `gSprites[]` bookkeeping this session's probes
read.

### 8.6 Ruled out this session (so a future probe doesn't re-chase them)

- **Invisible-flag timing**: left/right/bar's own `invisible` bit flips
  `True->False` at the identical tick (6762) for all three — not a
  differential-reveal timing bug.
- **Palette fade**: `gPaletteFade` (`dump-turn5-resolve-offc-tail-
  probe.py`, rerun this session for ticks 6758-6768) shows an active
  fade-to-white (`y=16`, `blendColor=32767`) only through tick 6759,
  `softwareFadeFinishing=1` (tearing down, non-applying) from 6760
  onward — already inactive two ticks before the residual, not a
  coincident flash.
- **Sub-sprite occlusion**: the healthbar's own real span (`[36+x2,
  67+x2]`, 32px) doesn't reach screen col 0-2 at tick 6763
  (`36-110=-74` max) — can't be occluding the right sprite there.

### 8.7 What remains unproven + the exact named next probe

A raw **hardware** OAM census (0x07000000, all 128 slots — as opposed to
the software `gSprites[]` bookkeeping table every probe above reads) at
tick 6762, added to `dump-turn5-resolve-offc-healthbox-halfsprite-vram.py`
this session, found **zero** of the three healthbox sprites' own tile
numbers (156 left / 188 right / 292 bar) among the ~20 non-default
(non-tileNum-0) entries actually present in the built hardware OAM buffer
at that tick — despite the software struct clearly showing all three
`inUse`, `invisible=False`, correctly positioned. This is a genuine,
unresolved gap: either (a) a one-frame lag between when
`UpdateOamCoords`/`BuildOamBuffer` (`sprite.c:339-359` and its caller)
actually run relative to this probe's own `oracle.advance()` sampling
point, (b) an OAM-slot-budget/sort-order effect specific to this crowded
send-out frame, or (c) a probe-harness timing artifact independent of the
game itself. Two tile numbers in the same numeric neighborhood as the
healthbar's own subsprite chunks (284, 288 — `292-8`/`292-4`, plausible
subsprite `tileOffset`s given `AddSubspritesToOamBuffer`'s per-subsprite
tile arithmetic) turned up at OAM slots 0/1 with `x=158`/`x=190` — screen
positions that do NOT match this session's own corner math at all, an
unresolved loose end rather than a confirmed lead.

**Next probe** (named, not further run this session — the geometry/content
questions §1.3 actually asked for ARE closed; this is a new, deeper
question §8.5 surfaced): a **hardware** OAM census (0x07000000, all 128
slots, not `gSprites[]`) at BOTH tick 6761 (pre-onset) and 6762
(onset) — same tick pair, both software-side and hardware-side reads in
one probe run — to determine whether the software `gSprites[]` write and
the hardware OAM copy are simply on different per-frame schedules (in
which case reading hardware OAM one tick later/earlier than this session
did would resolve the mismatch trivially), before concluding anything
more exotic. If that closes it, re-run §8.4's paper-check with the
corrected hardware-frame-relative tick and confirm whether that shifts
WHICH software tick's geometry the oracle's PNG(6763) truly reflects.

### 8.8 Predicted count effect

**None recommended.** §8.4 proves a per-sprite-clip `drawSendOutHealthbox`
reshape is a no-op for 6763 (and everywhere else, since it's a no-op
identically at every tick) — it would not move `turn5-resolve-off-c`'s
195/196 count and is not worth the risk/churn of touching a widely-reused
draw call for zero predicted gain. No other fix shape is evidenced yet;
§8.7's hardware-OAM probe must land first.

### 8.9 Other family windows reusing this draw call

`drawSendOutHealthbox`/`healthboxSlideDx` is shared by GROVYLE's own
send-out slide (`HEALTHBOX_SLIDE_START_TICK=1495`, `battleScene.ts:3589`,
same `-110` start `dx`, same 23-tick linear slide) — already independently
**pixel-brute-force-confirmed with ZERO mismatch** across its own onset
tick (`battleScene.ts:3578-3588`'s own doc comment: "every tick 1495-1523
matches... zero pixel mismatch"). Since the draw-call mechanism is
identical and Grovyle's own onset has no residual, whatever ultimately
explains PIDGEOTTO's tick 6763 is content/scene-specific to this exact
window (or the §8.7 hardware-OAM effect, which could plausibly be
frame-load/sprite-count-specific to this busier scene), **not** a generic
bug in the shared draw call — reinforcing §8.8's "don't touch the shared
draw call" conclusion. The other `pidgeottoHealthboxContentForHp` call
sites (`battleScene.ts:11916`, `12064`, `12193`, `12238`, `12406`,
`12436`, `13268`, `13297`, `13529`, `13674`, `13786`, `13922`, `14009`,
...) all pass `dx=0` (post-slide HP-drain windows) and are unaffected
regardless.

### 8.10 Rerunnable guards

```
npm run compare -- turn5-resolve-off-c --summary   # expect 195/196, tick 6763
npm run test:smoke
npm run compare -- turn5-resolve-off-a --summary   # expect 60/196, unchanged (out-of-scope guard)

python3 tools/run-mgba-probe.py /tmp/out.json -- \
  tools/probe/dump-turn5-resolve-offc-healthbox-halfsprite-census.py \
  tools/compare/traces/turn5-resolve-off-c.json /tmp/out.json 6758,6759,...,6790

python3 tools/run-mgba-probe.py /tmp/out2.json -- \
  tools/probe/dump-turn5-resolve-offc-healthbox-halfsprite-vram.py \
  tools/compare/traces/turn5-resolve-off-c.json /tmp/out2.json 6762
```

Both probes committed this session under `tools/probe/`. `git diff --
src/` is empty at the end of this session — INSTRUMENT step, no fix
attempted (§8.4 proves the originally-anticipated fix shape would not
have worked anyway).

## 9. 2026-08-18 (side lane, second) — `turn5-confirm-off-a`'s 4-frame
residual, mechanism pinned: (i)+(ii) are ONE shared root cause (not two),
(iii) is a fixable off-by-one, NOT the accepted boundary class

Bounded SIDE-lane INSTRUMENT worker, Battle Scene OFF oracle. Scope: §5's
own named next probe (a full OAM census at ticks 5958-5962, plus mechanism
attribution for the 5959-5961 two-region split and a verdict on 5968's
boundary-class hypothesis). `git diff -- src/` is empty at the end of this
session — a temporary debug `console.error` was added to
`turn5KickoffBounceTickFromLatest` mid-session to read its own live
`sourceTick`/`epochAge`/`bounceTick` values directly (the cleanest ground
truth for a pure function three call layers deep), then reverted via
`git checkout -- src/engine/battleScene.ts` before this commit — confirmed
clean (`git diff --stat -- src/` empty) before every commit below.

### 9.0 Baseline (fresh, unchanged)

```
npm run compare -- turn5-confirm-off-a --summary
frame 5959: DIFF 2360px (6.15%) bbox=44,49-229,110
frame 5960: DIFF 2360px (6.15%) bbox=44,49-229,110
frame 5961: DIFF 2360px (6.15%) bbox=44,49-229,110
frame 5968: DIFF 10930px (28.46%) bbox=1,113-238,158
128/132 frames matched
```

### 9.1 Source read: regions (i) and (ii) are ONE draw call's two assets, not two mechanisms

`menu-idle-onix-bounce.json`'s own header: `{x:44, y:49, width:56,
height:63}` → screen columns 44-99 (region i, exactly). `menu-idle-
healthbox-bounce.json`'s own header: `{x:127, y:74, width:103, height:38}`
→ screen columns 127-229 (region ii, exactly, 28px gap from region i
because the asset bboxes themselves have that gap). Both are `Menu
IdleBounceTwoStateAsset`s (a baked `y1`-patch and a baked `y2`-patch,
`drawTwoStateBounceRect`, `battleScene.ts:8135-8141`: draws nothing at
`y2===0`, the `y1` patch at `y2===1`, the `y2` patch at `y2>=2`), and BOTH
are drawn by a SINGLE call, `drawMenuIdleBounceOverlay(fb,
confirmWaitBounceTick)` (`battleScene.ts:8701`, inside `drawFightSubmenu
Window`'s confirm-wait branch, `confirmWaitBounceTick` assigned at
`battleScene.ts:8681-8682` from `turn5KickoffBounceTickFromLatest(t,
pressTick, latestCompletedCommandHandoff)`):

```ts
function drawMenuIdleBounceOverlay(fb: Uint8Array, bounceTick: number, bounceIndexOffset: number = 0): void {
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick, bounceIndexOffset);
  drawTwoStateBounceRect(fb, menuIdleOnixBounce, onixY2);
  drawTwoStateBounceRect(fb, menuIdleHealthboxBounce, healthboxY2);
}
```

`menuIdleBounce` (`battleMenu.ts:825-833`) derives both `onixY2` and
`healthboxY2` from the SAME `bounceTick` input (`onixSinIndex`/`healthbox
SinIndex`, `battleMenu.ts:812-819`, differ only by their sine seed - 192 vs
128 - stepping `+7` per tick identically). So regions (i) and (ii) cannot
be independent defects: any bug in the single `confirmWaitBounceTick`
value poisons BOTH regions simultaneously, at every affected tick. §5.4's
"two disjoint regions" framing was a symptom-level read (correct that the
PIXELS are disjoint - the two assets' bboxes really don't overlap) that
this session's source read shows is ONE mechanism underneath, not two.
`commandMenuBounceY2`'s own doc (`battleMenu.ts:849-851`) independently
confirms which real hardware sprites these represent: *"Only the player
battler sprite and player healthbox bounce - `DoBounceEffect(gActive
Battler, ...)` targets the player side in singles."* Player-side active
mon this trace = ONIX. So region (i) = Onix's own battler (back) sprite,
region (ii) = Onix's own healthbox - not background, not the opponent
(GROVYLE) side, matching §5's own hedge exactly.

### 9.2 Hardware ground truth: the real `DoBounceEffect` driver is still live through RAM tick 5960, destroyed at RAM tick 5961 - the app already shows the destroyed state 2-3 ticks too early

`dump-turn5-confirma-bounce-driver.py` (pre-existing, re-run fresh this
session against `turn5-confirm-off-a.json`, RAM ticks 5955-5970):

| RAM tick | onixSinIndex | onixY2 | healthboxSinIndex | healthboxMainY2 | driver fields (sinIndex/delta/amplitude/bouncerTarget) |
|---|---|---|---|---|---|
| 5958 | 75 | 1 | 11 | 1 | live |
| 5959 | 82 | 1 | 18 | 1 | live |
| 5960 | 89 | 1 | 25 | 1 | live |
| 5961 | 0 | **0** | 0 | **0** | **all zeroed - driver destroyed** |
| 5962-5970 | 0 | 0 | 0 | 0 | stays zeroed (frozen tail) |

Under this family's own established "screen tick T shows RAM tick T-1"
display-basis convention (re-stated at `battleScene.ts:14829-14835`), real
hardware's own rendered `(onixY2, healthboxY2)` by screen tick are:
5959→RAM5958→(1,1); 5960→RAM5959→(1,1); 5961→RAM5960→(1,1); 5962→RAM5961→
(0,0), staying (0,0) through the rest of the window. Direct pixel
classification of the app's and oracle's own captures against the two
baked assets' `y1`/`y2` patches (a `bg` reference sampled from app-05963,
a known-matching frozen tick) confirms this exactly:

| tick | region | oracle state (px classified) | app state (px classified) |
|---|---|---|---|
| 5958 | onix | y1 (769/3528px) | y1 (769/3528px) — **match** |
| 5958 | healthbox | bg (0 overlay) | bg (0 overlay) — **match** |
| 5959 | onix | y1 (769/3528px) | **bg (0/3528px)** |
| 5959 | healthbox | y1 (1536/3914px, +5 y2 +50 other) | **bg (0/3914px)** |
| 5960 | onix | y1 (769px) | **bg (0px)** |
| 5960 | healthbox | y1 (1536px) | **bg (0px)** |
| 5961 | onix | y1 (769px) | **bg (0px)** |
| 5961 | healthbox | y1 (1536px) | **bg (0px)** |
| 5962 | onix | bg | bg — **match** |
| 5962 | healthbox | bg | bg — **match** |

This directly explains §5.1's own "one row above" pixel signature as a
misread: it isn't a vertical-shift bug at all - it's a **binary
overlay-present-vs-absent** mismatch (oracle draws the `y1` patch, app
draws nothing/background) that merely *looks* like a 1-row shift because
`y1`'s own baked content differs from the plain background by exactly the
bounce's own 1px amplitude in a narrow band. §5.3's own "pure function of
sourceTick, so ticks 5959 and 5962+ must return the SAME value" reasoning
is confirmed correct (it does), but the conclusion drawn from it (that the
bounce formula can't be the culprit because 5962+ already match) doesn't
follow: 5962+'s own (0,0) IS what real hardware shows there too (driver
already destroyed by RAM 5961) - the SAME shared `bounceTick` value is
simply being reused at LIVE screen ticks 5959-5961 where it does NOT
apply, because real hardware's driver hasn't been destroyed yet at RAM
ticks 5958-5960.

Direct instrumentation (temporary `console.error` in `turn5KickoffBounce
TickFromLatest`, `battleScene.ts:10330-10339`, reverted before commit)
confirms the exact live values:

```
t=5959 pressTick=5959 sourceTick=5959 epochAge=607 bounceTick=2119
t=5960 pressTick=5959 sourceTick=5960 epochAge=608 bounceTick=2120
t=5961 pressTick=5959 sourceTick=5961 epochAge=609 bounceTick=2121
t=5962..5970 sourceTick=5959 (frozen) epochAge=607 bounceTick=2119   (same value as t=5959's own live call)
```

`menuIdleBounce(2119|2120|2121)` all evaluate to `{onixY2:0, healthbox
Y2:0}` - confirming the pixel classification table above arithmetically,
not just visually. A brute-force sweep of `menuIdleBounce` over
`bounceTick ∈ [1740, 2300]` for the exact target `(onixY2, healthbox
Y2)=(1,1)` (the state oracle needs at all three live ticks) finds windows
at **2097-2105** and **2134-2142** (9 ticks wide each, ~37-tick period) -
the app's actual 2119-2121 sits in the trough BETWEEN them, 14-22 ticks
from either. This is not a small/off-by-one correction like §5.2's own
falsified `+109`/`t-1` experiment (which nudged the SAME shared formula's
constants directly and broke 6 previously-matching frames) - it would
require a materially different sourceTick→bounceTick mapping for the LIVE
sub-window specifically, while leaving the FROZEN branch (sourceTick=
pressTick, unchanged) exactly as-is, since that branch's own (0,0) output
is independently confirmed correct for ticks 5962+.

### 9.3 Full-OAM census (new probe, `dump-turn5-confirma-oam-census.py`) - hardware-confirms region (ii) is Onix's own healthbox (3 real sprites), not background, cross-checking §9.1's source-only read

Raw hardware OAM (0x07000000, all 128 slots) at ticks 5958-5962 (this
probe drops the caution `gBattlerSpriteIds`/`gHealthboxSpriteIds` naively:
those are `gSprites[]` SOFTWARE indices, not hardware OAM slot numbers -
`BuildOamBuffer` re-sorts/re-slots per frame, so a same-numbered hardware
OAM slot is coincidental, not identity - real sprites are identified below
by tile number, size, and the 1px bounce-lockstep instead):

| tick | slot | x | y | size | tileNum | pal | identity |
|---|---|---|---|---|---|---|---|
| 5958 | 9 | 40 | 49 | 64×64 | 369 | 0 | **Onix battler (region i)** |
| 5959-5961 | 9 | 40 | 49 | 64×64 | 369 | 0 | (unchanged; y bounces to 48 at 5962, one-frame-lagged vs. the driver read - a known OAM-vs-`gSprites` read-order artifact, §8.7's own already-flagged class, not re-chased) |
| 5958,5962 | 5 | 126 | 72 | 64×64 | 28 | 5 | **Onix healthbox, left half (region ii)** |
| 5959-5961 | 5 | 126 | **73** | 64×64 | 28 | 5 | (y2-bounces +1px in lockstep with slot 6 and 0/1 below) |
| 5958,5962 | 6 | 190 | 72 | 64×64 | 92 | 5 | **Onix healthbox, right half (region ii)** — adjacent to slot 5, 126-239 combined |
| 5959-5961 | 6 | 190 | **73** | 64×64 | 92 | 5 | (same lockstep bounce as slot 5) |
| 5958,5962 | 0 | 158 | 88 | 32×8 | 284 | 6 | **Onix healthbar sub-sprite** (analogous to §8.2's 3rd-sprite finding, player side) |
| 5959-5961 | 0 | 158 | **89** | 32×8 | 284 | 6 | (same lockstep bounce) |
| 5958,5962 | 1 | 190 | 88 | 32×8 | 288 | 6 | Onix healthbar sub-sprite, other half |
| 5959-5961 | 1 | 190 | **89** | 32×8 | 288 | 6 | (same lockstep bounce) |

(Slots 2/3/7/8, tileNum 292/296/156/188, `y=14-30`, are GROVYLE's own
top-of-screen healthbox halves + healthbar - present every tick, outside
both mismatch regions' `y=49-110` band, listed by the probe's own X-only
overlap check but excluded here after a manual Y-range filter the probe
itself doesn't apply.)

This directly answers the brief's own question ("healthbox? HP overlay?
window tiles?") at the hardware level: **region (ii) is Onix's own
healthbox - a real, on-screen, 3-sprite compound (left half + right half +
HP-bar sub-sprite, exactly the same `battle_interface.c`-documented
3-sprite healthbox structure §8.2 already established for PIDGEOTTO's
opponent-side healthbox) - not background, not a window tile, not an HP
overlay.** No BG-register read was needed (contra the brief's own
contingency) since this rules out background content directly. `git diff
--stat -- src/` confirmed empty after this probe.

### 9.4 Mechanism attribution and fix shape for (i)+(ii) - pinned to file:line, NOT applied this session (INSTRUMENT ONLY)

**One shared root cause, two symptom regions.** `confirmWaitBounceTick`
(`turn5KickoffBounceTickFromLatest`, `battleScene.ts:10315-10340`, called
at `battleScene.ts:8681-8682`) is a pure function of `(t, pressTick,
latestCompletedCommandHandoff)` reused for BOTH the live pre-freeze window
(`t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`, sourceTick=`t`) and
the frozen tail (sourceTick=`pressTick`, constant). Its own affine
sourceTick→bounceTick mapping (`battleScene.ts:10330-10339`) happens to
place `sourceTick=pressTick` exactly at the real driver's own POST-
DESTRUCTION phase (correct for the frozen tail, which needs exactly that
value) - but the SAME mapping, evaluated live at `sourceTick=t` for
`t=pressTick..pressTick+2`, ALSO lands in that same post-destruction
region instead of tracking the driver's still-live RAM state through RAM
tick 5960. Both `drawTwoStateBounceRect` calls inside `drawMenuIdleBounce
Overlay` (`battleScene.ts:8701`) - one per region - consume this single
wrong value, so both regions go wrong on the same three ticks.

**Fix shape** (named, NOT applied - would need the live sub-window's own
sourceTick→bounceTick mapping corrected without disturbing the frozen
branch's own already-correct `sourceTick=pressTick` value, which several
OTHER call sites of this same shared function also depend on - rock slide
kickoff text at `battleScene.ts:10410`, the turn-13 switch-in echo at
`battleScene.ts:10998`, and any other reuse of `turn5KickoffBounceTick
FromLatest`. §5.2's own falsified experiment already shows a blind
constant tweak to this function regresses other, currently-matching
ticks; §9.2's own 14-22-tick-wide required correction rules out a small
nudge). The next probe below is scoped specifically to avoid repeating
that mistake.

**Predicted count effect**: closing this correctly would flip ticks 5959,
5960, 5961 from mismatch to match (128/132 → 131/132 combined with §9.5's
own 5968 finding, if both land) - not independently verified this
session (no fix attempted).

### 9.5 Tick 5968: REFUTES the "accepted boundary class, no fix needed" hypothesis - it's the SAME mechanism class but with a MISSING, already-precedented -1 correction

`turnKickoffTextStartTick(pressTick) = pressTick + FIGHT_CONFIRM_TEXT_DELAY`
(`battleMenu.ts:1172-1174`, `FIGHT_CONFIRM_TEXT_DELAY=10`) gives `5959+10
=5969` for this trace. `drawFightSubmenuWindow`'s own dispatch
(`battleScene.ts:8591-8593`):

```ts
const inTurn4DoubleTeamWindow = turn4Active && !turn5Active;
const textStart = (sm.cursor === 2 || turn3Active) && !inTurn4DoubleTeamWindow
  ? turn2KickoffTextStartTick(pressTick)
  : turnKickoffTextStartTick(pressTick);
if (t >= textStart) { /* ... turn5Active → drawTurn5EndeavorText ... */ }
```

Turn 5's own branch (`turn5Active`, `sm.cursor !== 2`, `turn3Active` false)
falls to the generic, uncorrected `turnKickoffTextStartTick(pressTick)=
5969` - turn 5 was never added to the `-1`-corrected side of this ternary.

Direct pixel evidence (fresh capture, `app-0596{8,9}.png`/`oracle-05968
.png`, `/tmp/confirma-run2`):

```
app(5968) vs app(5969):     10929px differ, bbox (1,113)-(239,159)   — app's OWN content flips branches between these two ticks
oracle(5968) vs app(5968):  10930px differ, bbox (1,113)-(239,159)   — the reported mismatch (app still shows the OLD confirm-wait branch)
oracle(5968) vs app(5969):     32px differ, bbox (22,127)-(28,134)   — oracle(5968) is ALREADY almost byte-identical to app's OWN NEW-branch content
```

The 32px residual is the SAME glyph-vs-blank signature §2/§4 already
established for this family's "PNG(T) shows RAM(T-1)" class (`oracle=
(107,165,165)` solid box fill at every one of the 32 pixels; `app(5969)=
(255,255,255)`/`(107,90,115)` glyph pixels already drawn there) - i.e.
oracle at 5968 is a hair BEHIND app's own tick-5969 content (one
character's own reveal sub-timing, not a whole-branch difference).

**This is the opposite polarity from §2/§4's own established class**,
which needs restating carefully: in §2/§4, the APP switches to the NEW
branch content exactly at its own anchor tick while the ORACLE still
shows OLD content for one more tick (oracle lags). Here, the ORACLE
already shows (99.7% of, 10898/10930px) the NEW branch's content a full
tick before the APP's own anchor fires (app lags, oracle leads) - real
hardware's own dispatch is not "architecturally, inherently" one tick
after the app's anchor; it's genuinely one tick BEFORE it. **This directly
refutes §5's own hedge that 5968 is "likely (not confirmed) the same
accepted boundary-artifact class as §2/§4" in the sense of "nothing to
fix here"** - it IS the same general mechanism class (a hard dispatch-gate
cutover producing a single-tick artifact under this family's display-basis
convention), but turn 5's own anchor is simply missing a correction this
codebase has ALREADY landed, oracle-confirmed, for the identical situation
on turn 2 (`turn2KickoffTextStartTick`, `battleMenu.ts:2659-2673`, own doc:
*"Turn 2's own kickoff message hard-cuts in 1 tick EARLIER than
`turnKickoffTextStartTick`'s general formula predicts... A pixel-fit
correction... plausible unverified guess: the reopened-submenu's own extra
DMA-wait state costs this transition 1 tick"*). Turn 5's own confirm-wait
window is not a reopened submenu, so the SAME root cause is not
guaranteed, but the SHAPE of the fix (append `|| turn5Active` to
`battleScene.ts:8592`'s own ternary condition, so turn 5 also gets
`turn2KickoffTextStartTick(pressTick)` instead of the raw generic formula)
is exactly precedented and was NOT applied - most likely a simple gap (the
ternary was written when turn 2/3 were the only known cases) rather than a
turn-5-specific reason to exclude it.

**Fix shape** (named, NOT applied):

```ts
// battleScene.ts:8592, was:
const textStart = (sm.cursor === 2 || turn3Active) && !inTurn4DoubleTeamWindow
  ? turn2KickoffTextStartTick(pressTick)
  : turnKickoffTextStartTick(pressTick);
// candidate:
const textStart = (sm.cursor === 2 || turn3Active || turn5Active) && !inTurn4DoubleTeamWindow
  ? turn2KickoffTextStartTick(pressTick)
  : turnKickoffTextStartTick(pressTick);
```

(`inTurn4DoubleTeamWindow = turn4Active && !turn5Active` is `false`
whenever `turn5Active` is `true`, so this is a pure widening - no
existing turn2/turn3/turn4 behavior changes.)

**Predicted count effect**: should resolve ~99.7% of tick 5968's own
28.46% diff (10898/10930px, per the direct measurement above) - very
likely flips 5968 from mismatch to match, though the residual 32px
sub-character-timing difference is not itself explained by this shift
alone and could reappear as a much smaller separate diff if the two don't
fully cancel. Not independently verified this session (no fix attempted -
this function is reused by every other `drawFightSubmenuWindow` caller;
committing to "safe" without running the full guard family is exactly the
mistake §5.2 already burned a session on for a different call site).

### 9.6 What remains unproven + exact named next probes

- **(i)+(ii) fix formula**: not derived. Next probe: extend `dump-turn5-
  confirma-bounce-driver.py`'s own pattern to ALSO dump `sSinIndex` at the
  exact RAM tick `DoBounceEffect`'s setup call fires for turn 5's own
  confirm-wait bounce (distinct from `MENU_BOUNCE_RAM_SETUP_TICK`'s turn-1
  anchor that `menuIdleBounce`'s own formula is built around) - i.e. find
  the real re-seed tick this specific bounce driver instance started from,
  which `epochAge`'s own affine chain is trying (and, per §9.2, failing)
  to reconstruct indirectly. Once that real re-seed tick is known, a
  LIVE-only correction (scoped to `t < pressTick + FIGHT_CONFIRM_BOUNCE_
  FREEZE_DELAY` only, leaving the frozen branch's `sourceTick=pressTick`
  path untouched) can be derived and grid-checked against the 2097-2105 /
  2134-2142 target windows from §9.2 before landing.
- **(iii) fix**: named in §9.5, not applied or guard-family-verified. Next
  step for a FIX-authorized session: apply the one-line ternary widening,
  then run the FULL guard family below (not just this trace) before
  trusting it, exactly as this family's own discipline requires.
- **Whether (i)+(ii)'s fix and (iii)'s fix compose without interaction**:
  not tested (both are analysis-only this session, no code changed).

### 9.7 Rerunnable guards (fresh, this session)

```sh
npm prefix   # WORKTREE GOTCHA - verify cwd first
npm run compare -- turn5-confirm-off-a --summary   # 128/132 (mismatches 5959,5960,5961,5968), unchanged
npm run compare -- turn5-confirm-off-b --summary   # 131/132, unchanged
npm run compare -- turn5-reset-off --summary       # 256/256, unchanged
npm run test:smoke

python3 tools/run-mgba-probe.py /tmp/out.json -- \
  tools/probe/dump-turn5-confirma-bounce-driver.py /tmp/out.json

python3 tools/run-mgba-probe.py /tmp/out2.json -- \
  tools/probe/dump-turn5-confirma-oam-census.py /tmp/out2.json
```

One probe committed this session: `tools/probe/dump-turn5-confirma-oam-
census.py` (new). `git diff -- src/` is empty at the end of this session -
INSTRUMENT step, no fix attempted (mechanism pinned to file:line for both
(i)+(ii) and (iii); (iii) additionally has a fully precedented one-line
candidate fix, named but not landed).

## 10. 2026-08-19 (main lane) — both §9 mechanisms LANDED: `turn5-confirm-off-a` CLOSED 128/132 -> 132/132

Bounded MAIN-lane worker, Battle Scene OFF oracle. Scope: land §9.5's
precedented one-liner (tick 5968) and §9.6's own named next probe (ticks
5959-5961), in that order, full guard family after each.

### 10.1 Step 1 (§9.5): the one-line ternary widening, landed exactly as named

Applied `battleScene.ts:8592`'s own predicted fix verbatim: widened
`(sm.cursor === 2 || turn3Active)` to `(sm.cursor === 2 || turn3Active ||
turn5Active)`. `turn5-confirm-off-a` **128/132 -> 129/132** (tick 5968
closes exactly, zero new mismatches). New Tier-1 pin
(`pixelAtTurn5Confirm`, `tests/battleScene.test.ts`) red-verified against
pre-fix code via `git stash -- src/engine/battleScene.ts`. Full guard
family reran with zero decreases (see 10.4). Committed
(`0c81b971`) before starting step 2.

### 10.2 Step 2 (§9.6's own named probe): the real re-seed tick is turn 1's own `MENU_BOUNCE_RAM_SETUP_TICK` - there is no turn-5-specific reseed

Extended `dump-turn5-confirma-bounce-driver.py` with two new scans across
every tick 1-5970 (free: the emulator already advances every frame
regardless of what gets recorded) - `reseedEvents` (ticks where the live
driver's own `sSinIndex` reads exactly `(192, 128)`, the literal
`DoBounceEffect` seed write, `battle_main.c:2923,2930`) and
`idChangeEvents` (ticks where the live onix/healthbox driver's own sprite
slot IDs change at all, a strictly more general/robust signal than
`sSinIndex`'s own value alone, which real hardware masks `& 0xFF` every
frame, `battle_main.c:2978`, so it cycles with period 256 and can't alone
distinguish "freshly reseeded" from "the same instance, further along").

**Decisive result: exactly ONE `idChangeEvents` entry in the whole
1-5970 range** - `{tick: 1748, prevIds: [0,0], newIds: [4,3]}` - i.e. the
ONLY sprite-instance creation in this entire window is turn 1's own
original `MENU_BOUNCE_RAM_SETUP_TICK` (1748, `battleMenu.ts:822`). The
SAME driver instance (ids 4/3) is still alive, unchanged, through RAM tick
5960 (destroyed at 5961, per §9.2). **§9.6's own premise - "distinct from
`MENU_BOUNCE_RAM_SETUP_TICK`'s own turn-1 anchor" - does not hold: there
is no turn-5-specific reseed to find.** The `reseedEvents` scan
independently confirms this (8 periodic `(192,128)` recurrences at
2603, 2859, 3492, 3748, 4467, 4723, 5607, 5863 - all under the SAME ids
4/3, spaced by the driver's own 256-tick wrap period whenever it's
actively ticking, with irregular longer gaps in between from real
hardware's own idle-only ticking schedule pausing the driver across
non-idle phases spanning turns 2-5).

### 10.3 Deriving the LIVE-only correction directly from the real driver's own raw `sSinIndex`, not from a reconstructed reseed tick

Since there is no fresh reseed tick to re-anchor an affine formula on, the
correction instead came directly from matching the LIVE branch's own
output against the real driver's own already-probed raw values (§9.2's
own table: RAM ticks 5958/5959/5960 read `onixSinIndex=75/82/89`,
`healthboxSinIndex=11/18/25`). Fresh instrumentation this session (a
standalone script reproducing `turn5KickoffBounceTickFromLatest`'s own
exact formula, no source edits) confirmed the live branch's current
output is unchanged from §9.2's own recorded values
(`bounceTick(5959,5960,5961) = 2119,2120,2121`, `menuIdleBounce` at each
= `{onixY2:0, healthboxY2:0}`, wrong - the required state is `(1,1)`).
Solving `(192 + 7n) mod 256 = 75` (onix) directly gives `n ≡ 93 (mod
256)`; feeding that through `menuIdleBounce`'s own `ramTick=bounceTick-1,
n=ramTick-1748` relation and checking against §9.2's own found
`(onixY2,healthboxY2)=(1,1)` windows (2097-2105/2134-2142) gives
`bounceTick=2098` for screen tick 5959 - inside the first window, and
**exactly** reproducing the real hardware's own raw `sSinIndex` values (not
merely landing in the `y2=1` plateau): `menuIdleBounce(2098)` through
`menuIdleBounce(2100)` (ticks 5959-5961) reproduce `{onixY2:1,
healthboxY2:1}` exactly, verified directly against the current formula's
own output (`2119,2120,2121`) - a **constant -21** difference, matching
§9's own "14-22 ticks away" estimate at its far edge, but derived from an
exact raw-index match this time, not a blind grid-search guess.

**Landed**: `battleScene.ts`'s `turn5KickoffBounceTickFromLatest` now
subtracts 21 from the live branch's own `bounceTick` output only (`t <
pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`); the frozen branch and the
`latestCompletedCommandHandoff === null` branch are byte-identical to
before. Confirmed safe against the two OTHER call sites of this shared
function (`battleScene.ts:10410`'s rock slide kickoff text,
`battleScene.ts:10998`'s turn-13 switch-in echo): both always pass `t`
values far past `pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` for their
own respective windows (turn 5's rock slide window starts at
`TURN5_ROCKSLIDE_PRESS_TICK=5829`+ various delays, always >5961; turn 13's
switch-in echo runs even later), so the live branch never fires there -
confirmed empirically by the unchanged `turn13-switchin` (242/242) and
`turn6-rockslide-a`/`-b` guard results below, not just by inspection.

`turn5-confirm-off-a` **129/132 -> 132/132 - CLOSED**. Two new Tier-1
pins (`tests/battleScene.test.ts`, Onix sprite pixel (58,49) and Onix
healthbox pixel (139,74), both live-vs-frozen at tick 5962) red-verified
against pre-fix code via `git stash -- src/engine/battleScene.ts` (both
fail at exactly the predicted pre-fix values).

### 10.4 Full guard family (fresh, this session, after BOTH steps - zero decreases anywhere)

```
turn5-confirm-off-a       132/132   (CLOSED - was 128/132)
turn5-confirm-off-b       131/132   (unchanged - banked, §4)
turn5-resolve-off-a       193/196   (unchanged - out-of-scope guard bar, side lane owns 6283/6284/6398)
turn5-resolve-off-b       196/196
turn5-resolve-off-c       195/196   (unchanged - banked, §1)
turn5-resolve-off-d       194/196   (unchanged - banked, §2/§3)
turn5-reset-off           256/256
turn5-action-off            32/32
turn6-reopen-off             46/46
turn6-menu-off.json fixture  47/47
turn6-rockslide-a           255/255
turn6-rockslide-b           105/105
turn7-rockslide-a           256/256
turn13-switchin              242/242
turn4-doubleteam-off         256/256
turn4-rockslide-off          256/256
```

Full `npm test` (10,099 passed, +4 new pin blocks) and `npm run build`
green. `docs/turn5-resolve-ab-pools-diagnosis.md`'s own 6283/6284/6398
residuals (out of scope this session, owned by a parallel side-lane
worker) untouched.

## 11. 2026-08-18 (side lane, third) — `turn5-resolve-off-c` tick 6763: PARK, confirmed; `turn5-resolve-off-d` tick 6996: ACCEPT, new decisive mechanism (oracle's own transient 1-scanline capture glitch, not an app defect)

Bounded SIDE-lane INSTRUMENT worker, Battle Scene OFF oracle. Scope: run
§8's own named next probe for `resolve-off-c` 6763 (hardware-OAM-vs-
software-`gSprites[]` timing cross-check), and do a fresh from-scratch
pixel characterization of `resolve-off-d` 6996 (the old "cursor-adjacent"
and "shares resolve-off-a's mechanism" framings are both stale/disproven
per this step's own brief). `git diff -- src/` is empty this session —
INSTRUMENT only, no `src/` edit attempted.

### 11.1 Baselines (fresh, unchanged)

```
npm run compare -- turn5-resolve-off-c --summary   -> 195/196 (tick 6763)
npm run compare -- turn5-resolve-off-d --summary   -> 194/196 (ticks 6850, 6996)
```

### 11.2 Part 1 — `turn5-resolve-off-c` tick 6763: PARK

New probe `tools/probe/dump-turn5-resolve-offc-hwoam-schedule-probe.py`
(committed this session) runs §8.7's own exact named next step: at EACH of
ticks 6760-6765 in one probe run, read BOTH the software `gSprites[]`
struct for PIDGEOTTO's three healthbox sprites (left/right/bar) AND a full
128-slot raw hardware OAM scan (0x07000000), so the two views can be
compared tick-for-tick with zero cross-run bootstrap drift. Result:

| software tick | sw.invisible | sw.x2 | tile# found in hw OAM? |
|---|---|---|---|
| 6760 | True | 0 | no |
| 6761 | True | 0 | no |
| 6762 | **False** (onset) | -110 | no |
| 6763 | False (held) | -110 | no |
| 6764 | False | -105 | **yes** (all 3 sprites, exact tile#/x/y match) |
| 6765 | False | -100 | yes |

The three healthbox sprites' own tile numbers (156/188/292) are absent
from the raw hardware OAM buffer at BOTH software ticks 6762 and 6763 —
the software struct already shows correct `invisible=False`/`x2=-110` at
6762, yet the hardware copy doesn't pick the sprites up until software-tick
6764, by which point `x2` has already advanced to -105 (i.e. **the
hardware OAM buffer, read this way, never shows `x2=-110` for these
sprites at all** — it jumps straight from "absent" to "present at -105").

This picture cannot be reconciled with this doc's own independently
pixel-verified fact (§1.2/§1.3/§8, extensively re-confirmed) that render
tick 6764 exactly matches content computed from software-tick-6763's state
(`x2=-110`, still held) — the already-oracle-exact 6764-6785 span is real
and unshaken. If hardware OAM genuinely never contained `x2=-110` for this
sprite, render 6764 could not show it. The only consistent explanation is
that this probe's own hardware-OAM read, taken immediately after each
`oracle.advance()` call returns, samples at a POINT WITHIN THE FRAME that
does not line up with whatever point `BuildOamBuffer`'s real VBlank-DMA
copy runs at — i.e. a **probe-methodology ceiling**, not a new game
mechanism: `oracle.advance()`'s single-call granularity cannot distinguish
"hardware OAM was rebuilt already this frame" from "hardware OAM reflects
last frame's build," so a hw-OAM census at this granularity cannot itself
resolve why 6763 shows white. This is exactly the option (c) ("a
probe-harness timing artifact independent of the game itself") §8.7 named
as one of three untested possibilities — now the only one left standing,
since (a)/(b) would have to produce a hw-OAM timeline consistent with the
already-proven 6764 pixel match, and neither does.

**Verdict: PARK.** Three probe sessions (original diagnosis, §8, this one)
have each closed off a candidate mechanism with decisive evidence
(per-sprite clip is a mathematical no-op, §8.4; harvested content is
byte-exact, §8.5; and now, the hardware-OAM census that could have
explained the gap is itself unable to resolve it at this probe's
granularity) without ever finding an actionable fix shape. Per this step's
own explicit guidance, park is the correct call rather than manufacturing
a speculative fix on a 6px/0.02% single frame. Any further progress needs
frame-precise (sub-tick, pre/post-VBlank) emulator stepping control this
harness's `oracle.advance()`/probe API does not expose — out of scope for
another whole-OAM-census-style probe at this granularity.

```
npm run compare -- turn5-resolve-off-c --summary   # expect 195/196, tick 6763 - unchanged
python3 tools/run-mgba-probe.py /tmp/out.json -- \
  tools/probe/dump-turn5-resolve-offc-hwoam-schedule-probe.py \
  tools/compare/traces/turn5-resolve-off-c.json /tmp/out.json \
  6760 6761 6762 6763 6764 6765
```

### 11.3 Part 2 — `turn5-resolve-off-d` tick 6996: ACCEPT, mechanism identified

Fresh crop-diff (`analyze-residual-family-sample.ts` plus a direct
Pillow-based per-pixel sweep, `npm run compare -- turn5-resolve-off-d
/tmp/offd-run --capture-range 6993:6999`) confirms the current bbox
`127,74-229,110` exactly (1579px/4.11%) and visually identifies the
differing element as ONIX's own (the player's) settled healthbox — name
plate, HP bar, level text — NOT Pidgeotto's sprite/shadow (a sliver of
which only grazes the bbox's very top edge). This supersedes §3's own
still-open "which element" question.

**Row-by-row diff sampling found a clean, uniform 1-scanline vertical
displacement**: shifting the ORACLE image down by 1px before comparing
(`app(x,y)` vs `oracle(x,y+1)`) drops the bbox's mismatch count from
1579/3811 to 166/3811 — checked independently for the upper sub-region
(Pidgeotto-shadow sliver, y=74-87: 544->87) and the lower sub-region (Onix
healthbox body, y=88-110: 1035->79), both showing the same ~85-95%
reduction, i.e. one coherent shifted element, not two coincidentally
aligned defects.

**Decisive follow-up (settles content vs. position cleanly): this is a
TEMPORAL, not spatial, effect.** Directly comparing whole frames in the
bbox across the three captured ticks:

```
app-06996  vs oracle-06995:  0/3811 mismatches (EXACT)
app-06996  vs oracle-06996:  1579/3811 mismatches (the reported residual)
app-06996  vs oracle-06997:  0/3811 mismatches (EXACT)
app-06995  vs app-06996:     0/3811 (app is byte-identical across all 3 ticks)
app-06996  vs app-06997:     0/3811
```

The app renders the **exact same, unchanging** healthbox at 6995, 6996,
and 6997 (correct: nothing in game state changes there — HP isn't
draining, no bounce is active, per §11.4 below). The oracle **also**
shows byte-identical content at 6995 and 6997 (confirming the box really
is static on real hardware too) — but at 6996, and ONLY 6996, the oracle's
own captured frame shows that exact same content shifted down by 1
scanline, then reverts on the very next tick. Our software isn't missing
a real, reproducible piece of game state; the real hardware/oracle capture
itself has a genuine one-frame anomaly that our software (correctly
computing a static scene) does not and should not reproduce.

### 11.4 Draw-formula check (read-only): confirms nothing in our own model varies at 6996

`turn5-resolve-off-d` is driven by `drawTurn5RockSlideWindow`
(`battleScene.ts:15039`), which unconditionally calls `drawTurn6FieldBase`
(`battleScene.ts:15051`, `bounceIndexOffset=60` per the ISSUES #97-B
correction) every tick before dispatching to the message/chrome text
switch. Tracing the player healthbox's own `y` offset
(`battleScene.ts:15002-15006,15023-15026`): `bounceTick = t - 1` (since
`latestCompletedCommandHandoff` isn't a raw number here) ->
`turn5SitrusResettledBounceTick(bounceTick)` (`battleSceneCanonical.ts:
1135`, `= bounceTick - TURN5_SITRUS_MENU_REDRAW_TICK(7222) +
MENU_IDLE_BLANK_END_TICK+1(1748)`) -> `menuIdleBounce(...)`
(`battleMenu.ts:825`). For render tick 6996 this resolves to
`resettled=1521`, `ramTick=1520`, which is `< MENU_BOUNCE_RAM_SETUP_TICK`
(1748) — so `menuIdleBounce` returns `{onixY2:0, healthboxY2:0}`
**identically at 6995, 6996, and 6997** (the resettled bounce cycle for
this window doesn't start until render tick ~7224, well outside this
capture). `onixHp = turn5OffSitrusOnixHp(t)` also reads the same HP value
across this narrow span (no drain/climb active here — `TURN5_OFF_SITRUS_
ONIX_HP_CLIMB_START_TICK=6952`/`_JUMP_TICK` both already resolved well
before 6995, per §2). `drawTurn5SitrusSettledMenuChrome`
(`battleScene.ts:11722`, first fires at `t>=TURN5_OFF_SITRUS_MENU_REDRAW_
TICK=6995`) only repaints `y>=112` (the bottom FIGHT/BAG/etc chrome),
never touching this bbox's `y=74-110` span. Every formula this session
traced is provably flat across 6995-6997 — matching the app's own observed
byte-for-byte stability and confirming there is no missed per-tick input
this session overlooked; the discrepancy is 100% on the oracle capture's
own side at exactly one tick.

### 11.5 Why ACCEPT (not a fix, not a blind park)

The render tick immediately following this window's own hard chrome
redraw (`TURN5_OFF_SITRUS_MENU_REDRAW_TICK=6995`, itself documented
elsewhere in this file as an "atomic off-screen draw + BG0-scroll reveal"
event, `battleMenu.ts:767`'s doc on the analogous `MENU_DRAW_TICK`)
showing a one-scanline-only capture tear that reverts by the very next
tick is consistent with a genuine real-hardware/capture-timing artifact
tied to that redraw, not a persistent game-state difference — the same
"real hardware momentarily shows something our deterministic, pure-`t`
model has no principled way to predict" character this family already
accepts elsewhere (§2.2/§4), just manifesting as a spatial 1px tear rather
than a content swap, so it doesn't fit those sections' own "PNG(T) shows
RAM(T-1)" boundary class verbatim — it is its own, new, evidence-backed
accepted class ("post-redraw single-scanline capture tear"), not merely
asserted: polarity proven the same way §9.5 proved its own (app is
provably static and correct at all three ticks; oracle is provably
identical at the two neighbors and uniquely, transiently offset at the
one residual tick). No fix is recommended: reproducing this would require
inventing an unmotivated one-tick spatial jitter with no game-state driver
behind it, exactly the "manufactured speculative fix" this family's own
discipline warns against.

### 11.6 Guard family (fresh, this session — zero decreases anywhere)

```
npm run compare -- turn5-resolve-off-c --summary   -> 195/196 (unchanged)
npm run compare -- turn5-resolve-off-d --summary   -> 194/196 (unchanged)
npm run test:smoke                                  -> green
```

`git diff -- src/` is empty at the end of this session — INSTRUMENT step,
both residuals characterized to a decisive conclusion (PARK / ACCEPT)
without a code change.

