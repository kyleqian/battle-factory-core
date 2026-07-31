# ISSUES #56 item 2: frames 444/536 isolated via OAM RAM reads (2026-07-31, side lane)

Evidence-only step per this step's brief (NEW FILES ONLY: no production code,
no existing docs/traces/ledgers edited). New files this step:
`tools/probe/dump-issue56-frames-444-536-oam.py` (RAM probe, combines the
`dump-arbitrary-intro-bounce-driver.py` in-process `BattleLab.prepare()`
idiom with `dump-switchin-materialize-affine.py`'s OAM-byte decode),
`tools/probe/analyze-issue56-frames-444-536-app-series.ts` (drives the real
app engine, read-only, to log the exact per-tick values the render call
sites use — no `src/` file touched), and this doc. Fixture used throughout:
`factory-arbitrary-intro-yoshi-off` (COMBUSKEN opponent, GRIMER player lead);
its own baseline (reproduced fresh this session, unchanged) is:

```
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /tmp/issue56-frames-probe/yoshi-full --summary
  -> 699/751 frames matched
```

Both frames' fix is **described, not implemented** — no `src/` file was
touched this step.

## Frame 444 — RESOLVED (RAM-confirmed root cause + precise described fix)

### The named next step, executed

`docs/issue56-residual-probe.md` Q1 named the next step as "a RAM read of
the specific sprite's OAM `x`/`x2`/`affineParam` at the oracle-absolute
frame (444+1171=1615)". Ran exactly that, widened to a +/-15-frame window
for context (`preCheckpointFrameOffset` for this fixture is **1171**, per
its own compare-trace JSON):

```
python3 tools/run-mgba-probe.py /tmp/issue56-oam-yoshi.json -- \
  tools/probe/dump-issue56-frames-444-536-oam.py /tmp/issue56-oam-yoshi.json \
  tools/battle-lab/factory-arbitrary-intro-yoshi-off.json 1600:1623,1696:1716
  # wrote /tmp/issue56-oam-yoshi.json (45 frames, slots scanned=64)
```

(Both ranges probed in one run: `1600:1623` covers app-relative 429-452
around frame 444; `1696:1716` covers app-relative 525-545 around frame 536,
below.)

### RAM series: `gSprites[6]` (opponent status-summary bar) around frame 444

A 64-slot scan across app-relative 429-452 found exactly one sprite at
`y=40` with a steadily-incrementing `x2` (the diagonal ball-status-bar's own
entrance-then-exit slide, non-affine, `matrixNum` field stale/unused since
`affineMode=0`) — slot **6**:

| app-rel | abs | x | y | x2 | note |
| --- | --- | --- | --- | --- | --- |
| 429 | 1600 | 8 | 40 | 36 | alive, sliding +2/tick |
| ... | ... | 8 | 40 | (+2/tick) | ... |
| 442 | 1613 | 8 | 40 | 62 | alive |
| **443** | **1614** | **8** | **40** | **64** | **last alive tick** |
| **444** | **1615** | **176** | **59** | **0** | **destroyed/slot reused** |
| 445 | 1616 | 176 | 59 | 0 | reused (particle-burst cluster, `animCmdIndex` cycling) |
| 446-452 | 1617-1623 | 176 | 59 | 0,0,-2,-4,... | reused, unrelated animation |

`x2` climbs by **exactly +2 every tick** for at least 15 consecutive ticks
(429-443, matching `playerSummaryBarExitDx`'s own sibling-formula shape:
"`data[1]+=32` then `x2 += data[1]>>4`... collapsing to a flat `+2`/tick").
At the very next probed tick (444) the slot is **destroyed and reused**: `x`
jumps to 176, `y` jumps from 40 to 59, `x2` resets to 0, and `animCmdIndex`
starts cycling 0-5 (a particle/spin effect sharing the same anchor as
several other slots, unrelated to the bar). **The opponent's own party ball
icons (slots 51/52/53, `y=36`, the `OPP_SUMMARY_ICON_BASE` row) are
destroyed at the exact same tick** (present with `x2` matching
`opponentIconExitX`'s triangular-sum formula through app443, absent from
app444 onward) — this is a single, simultaneous widget-teardown event, not
two coincidental ones.

### App series: `opponentSummaryExitElapsed` (`battleScene.ts:6739-6752`)

`tools/probe/analyze-issue56-frames-444-536-app-series.ts` drives the real
`beginFactoryRoundBattleStartIntro`/`tick()`/`render()` engine (verbatim copy
of `appTrace.ts`'s YOSHI stage construction, since that file doesn't export
its stage registry) and logs the exact per-tick values `battleScene.ts`'s
own render call sites compute, cross-checked against `render(state)`'s own
pixels at the doc's previously-recorded diff coordinates:

```
node --experimental-strip-types tools/probe/analyze-issue56-frames-444-536-app-series.ts
```

| app-rel frame | `rawElapsed` (`t-handoffTick-1`) | `elapsed` (current code) | px(158,40) | px(160,40) |
| --- | --- | --- | --- | --- |
| 443 | 30 | 30 | (255,255,255) white | (255,181,247) pink |
| 444 | 31 | **31** (`generated-initial-release` override fires) | (255,181,247) pink | (255,255,255) white |
| 445 | 32 | 31 (ordinary formula) | (255,181,247) pink | (255,255,255) white |

(`handoffTick=412` app-relative, the already-established opponent-release
handoff for this fixture, `docs/trainer-pic-off-window-scout.md` §D round
4/5.) The app's own frame-444/445 pixels exactly reproduce the ORIGINAL
`docs/issue56-residual-probe.md` Q1 sample (`app=(255,181,247)` at
158/159, `app=(255,255,255)` at 160/161) — confirming this script's model
matches production `battleScene.ts` exactly, not a re-derivation error.

**The divergent sub-step, exact:** `opponentSummaryExitElapsed`
(`battleScene.ts:6739-6752`) computes, for `lifecycle ===
"generated-initial-release"` (this fixture's own lifecycle,
`renderGeneratedBattleStartOpponentRelease`'s call at line ~4492):

```ts
if (lifecycle === "generated-initial-release" && rawElapsed === 31) {
  return 31;                      // <- fires at app-relative 444
}
const stallAt = encounter === "jenson" ? 31 : 30;
return rawElapsed <= stallAt ? rawElapsed : rawElapsed - 1;
```

The *ordinary* (non-special-cased) branch already implements exactly the
one-tick freeze the RAM proves is real: `rawElapsed=30 -> elapsed=30`,
`rawElapsed=31 -> elapsed=30` (frozen — same value as the previous tick),
`rawElapsed=32 -> elapsed=31` (resumes). That freeze-for-one-extra-tick
shape is the same "OAM slot reused but the old OBJ-VRAM tile content is
still what's displayed for one more frame" pattern this codebase has
already independently documented elsewhere (`battleScene.ts`'s own
"exactly the `open.png` runtime-VRAM-overwrite pattern" note, and the
`drawPlayerSummaryBarExit` doc comment describing the canonical clock's
own `gPlttBufferFaded`-tileNum-jump one tick after a frozen tick). **The
`generated-initial-release` special case skips that freeze** — it advances
`elapsed` from 30 straight to 31 one tick early (at `rawElapsed=31`,
app-relative 444), which is precisely why the app's rendered tip-tile
position at 444 is one 2px step (`barExitX2`'s own `2*(elapsed+1)` term)
further right than the oracle wants.

**RAM-vs-pixel reconciliation:** the RAM shows the real widget's *last
animated* tick is app443 (`x2=64`) and the slot is torn down by app444 — not
"still alive with a new position" at 444. That is fully consistent with the
pixel evidence wanting app444 to render *identically* to app443 (not a
new, further-advanced position): the freeze formula (`elapsed` pinned at
30 for both rawElapsed 30 and 31) is exactly "draw the last-alive frame one
extra tick while the real OBJ-VRAM content catches up to the destroy",
which is what the ordinary formula already models correctly for every
other lifecycle/encounter combination.

### Described (not implemented) minimal fix

Remove (or narrow) the `lifecycle === "generated-initial-release" &&
rawElapsed === 31` special case in `opponentSummaryExitElapsed`
(`battleScene.ts:6747-6749`) so this fixture's `rawElapsed=31` falls
through to the ordinary `stallAt` formula, yielding `elapsed=30` (frozen)
instead of `31`. This reproduces the oracle's frame-444 pixels exactly
(verified above against all 4 originally-sampled diff pixels) and touches
neither frame 443 (`rawElapsed=30` never reaches the special case) nor 445
(`rawElapsed=32` also bypasses it, and already computes `elapsed=31` via
the ordinary formula either way) — a single-frame-scoped fix by
construction. **Caveat, honestly flagged:** the special case's own comment
("The typed initial release has no persistent sprite-slot state to carry
the canonical DESTIN destroy/reuse stall") implies it was added to fix some
*other* frame for this lifecycle; this step's RAM probe directly
contradicts that premise (the stall **is** present in this fixture's real
RAM trace too), but *why* the override was believed necessary was not
re-derived this session (no git-blame/history dig, time-boxed) — whoever
implements this fix should re-run the full 751-frame comparison to confirm
no other frame regresses, not just trust this analysis.

## Frame 536 — falsified (RAM contradicts the assumed mechanism entirely)

### RAM series: player status-bar/icon sprites (`y=88..96` region) around frame 536

Same probe run, second range (`1696:1716`, app-relative 525-545). Candidate
slots identified by position/spacing (6 icons 10px apart at `y=92`, matching
the player ball-icon row; one bar sprite at `y=96`, matching
`drawBallStatusBar`'s player anchor):

| app-rel | abs | slot5 (bar) x/x2 | slots 54-59 (icons) x2 |
| --- | --- | --- | --- |
| 530 | 1701 | 232 / **0** | all **0** |
| 531-541 | 1702-1712 | 232 / **0** (unchanged, every tick) | all **0** (unchanged, every tick) |
| 542 | 1713 | 232 / **0** | all **0** |

**Zero movement on every probed tick, 530 through 542 inclusive** (13
consecutive frames spanning well past 536). No other slot in the full
64-slot scan shows a `y` near 88-96 with a non-zero/changing `x2` either.

### App series: `playerSummaryFadeEva`/`playerSummaryIconExitDx`/`playerSummaryBarExitDx`

The same `analyze-issue56-frames-444-536-app-series.ts` run logs the actual
values `drawBallIcons`'s player-side branch computes at each tick (`t =
generatedBattleIntroSourceClock(elapsed)`, compared against the flat,
non-route-adjusted `PLAYER_SUMMARY_FADE_START_TICK = BRENDAN_THROW_START_TICK
= 1574`, `battleMenu.ts:64,188`):

| app-rel | `t` | `eva` | `iconExitDx(icon 0)` | `barExitDx` |
| --- | --- | --- | --- | --- |
| 535 | 1574 | 16 (unblended) | 0 | 0 |
| **536** | **1575** | **15** | **-3** | **-2** |
| 537 | 1576 | 15 | -9 | -4 |
| ... | ... | (continues sliding/fading every tick) | | |

The app model starts fading/sliding these widgets at **exactly app-relative
536** and keeps moving them every subsequent tick — directly contradicted by
the RAM, which shows **no movement at all through app-relative 542** (6
ticks past the app's own assumed onset). This is the same species/route-
dependent-timing shape already extensively documented elsewhere in this
run (`docs/trainer-pic-off-window-scout.md`'s dispatch-delay/ready-lag
findings): `PLAYER_SUMMARY_FADE_START_TICK` is a flat constant reused
verbatim inside a per-route clock (`generatedBattleIntroSourceClock`)
without a species/route adjustment, and the RAM proves the real onset for
*this* fixture (COMBUSKEN opponent, GRIMER player lead) is later than
app-relative 542 — an even sharper falsification than the prior two
pixel-only rounds' "shade+position, likely blend offset" characterization
(`docs/trainer-pic-off-window-scout.md` rounds 5/7), which never
established whether the mechanism had even started yet.

### Verdict for frame 536: **not resolved this step — RAM falsifies the current model, real onset tick not yet found**

**What fact would decide it:** extend this same probe's range past
app-relative 542 (this step's own time budget did not allow it) until the
real `slot5`/`54-59` `x2` values start moving, then compare that onset tick
against `PLAYER_SUMMARY_FADE_START_TICK`'s predicted 536 the same way
`docs/trainer-pic-off-window-scout.md`'s cry-duration triangulation found
the opponent-side dispatch delay's real species term — this widget's true
start tick is very likely `BRENDAN_THROW_START_TICK` plus the same kind of
player-lead-species offset (`cryDurationTicks`/line-length term) already
proven for the sibling `generatedPlayerVisualLag`/`generatedPlayerReadyLag`
mechanisms in that doc, not a wholly new mechanism — but this step did not
extend the RAM window far enough to pin the exact tick, so no fix is
described for 536 (an honest stop, not a guess).

## Summary for the supervisor

| Frame | Verdict | Confidence |
| --- | --- | --- |
| 444 | **Root cause pinned via RAM.** `opponentSummaryExitElapsed`'s `generated-initial-release` special case skips a one-tick VRAM-freeze the RAM proves is real (opponent bar+icons destroyed at app-relative 444, last alive at 443); described fix (remove/narrow the special case) reproduces all 4 originally-sampled oracle pixels exactly. Not implemented (new-files-only constraint); needs a full 751-frame regression check before landing. | High — RAM-confirmed destroy tick + exact pixel reproduction |
| 536 | **Falsified, not resolved.** RAM shows zero movement on the player bar/icon sprites through app-relative 542, directly contradicting the app's assumed fade/slide onset at 536. Real onset tick is later than probed; likely a species-lead-dependent term on `PLAYER_SUMMARY_FADE_START_TICK`, same shape as already-fixed sibling mechanisms, but not pinned this step. | Medium — RAM disproves the current hypothesis cleanly, but the true tick is still unknown |

No production code, existing docs, or existing traces modified. New files:
this doc, `tools/probe/dump-issue56-frames-444-536-oam.py`,
`tools/probe/analyze-issue56-frames-444-536-app-series.ts`. Scratch RAM
dump (`/tmp/issue56-oam-yoshi.json`) and pixel captures (`/tmp/issue56-frames-probe/`)
are not committed, reproducible from the command lines above.

## Round 2 (2026-07-31, main lane): Part A investigated - RAM/pixel-verified sub-fix found, but a new MAGNETON regression blocks landing it

### Part A — the described fix, RAM/pixel-verified for its own targeted 4 pixels, but NOT landed

Applied exactly the described fix (remove the `generated-initial-release &&
rawElapsed === 31` special case in `opponentSummaryExitElapsed`) and
re-derived its original fitted window first, per this round's brief:
`git log -S opponentSummaryExitElapsed` finds exactly one commit,
`0c4dab29` ("fix: advance generated intro summary tail"), whose own
PROGRESS entry (#743) says it was fitted to **frame 1492** of the
*canonical-anchor* fixture `interactive-generated-intro-off` (711/715 →
712/715). That fixture is already in this round's required acceptance set,
so re-running it directly re-exercises the special case's original window.

**Confirmed exact for its own targeted pixels.** With the special case
removed, YOSHI's frame 444 px(158-161,40) — the 4 pixels
`docs/issue56-residual-probe.md` Q1 originally sampled and this doc's own
RAM probe targeted — flip to byte-exact matches with the oracle (verified
directly, not just via the aggregate count). Frame 444's total diff drops
219px → 207px, same bbox (0,40-196,85).

**But the frame does not flip to a full match.** The remaining 207px sit at
x=163-196 (plus 6 stray px at x=0-2), a region `docs/issue56-residual-probe.md`
Q1 *separately* characterized as the opponent's own affine-emerge
materialize sprite showing "a small, single-tick horizontal-position/
sub-step misalignment" — a **second, distinct, previously-flagged-but-
never-RAM-diagnosed defect** at the same frame, never in scope of "the
described fix" (which only ever targeted the status-bar/icon widget, per
this doc's own Frame 444 section above). Closing it needs its own RAM
probe of the opponent's materialize sprite's OAM affine params at this
exact tick — out of this round's budget.

**Removing the special case outright regresses two currently-passing
fixtures**, confirming the brief's own warning: `interactive-generated-
intro-off` 715/715 → 714/715 (frame 1492, exactly its original fitted
window) and, newly discovered, `factory-arbitrary-intro-magneton-off`
703/751 → 702/751 (frame 437 — MAGNETON's own analogue of YOSHI's frame
444, at the same `rawElapsed=31` tick).

**Narrowing via `isCanonicalAnchorIntro` (the existing route discriminator
`generatedPlayerReadyLag` already uses for exactly this canonical-anchor-
vs-generated split) restores `interactive-generated-intro-off` to
715/715 — but MAGNETON's frame 437 still regresses (702/751).** MAGNETON is
not the canonical-anchor route, so it gets the same (RAM-confirmed-for-
YOSHI) stall formula as YOSHI — and MAGNETON's own oracle pixels want the
**opposite** behavior at that tick: `pre-fix diff count at 437: 0`
(pixel-exact under the OLD unconditioned special case), broken by the
narrowed fix (10px diff, same shifted-pink-block shape as YOSHI's own
frame 444 evidence, but in the opposite direction — app's block ends up
2px right of where oracle wants it, the mirror of YOSHI's 2px-left error).

**Verdict: NOT landed, reverted to the original unmodified special case.**
`isCanonicalAnchorIntro` is not the right discriminator — it fixes the
canonical-anchor window but the special case's true condition depends on
something that differs between COMBUSKEN (YOSHI, wants no special case)
and MAGNETON (wants the special case) at this same `rawElapsed=31` tick,
not just canonical-vs-generated. This needs a **second RAM probe, this
round scoped to MAGNETON's own `gSprites[6]` around its own frame 437**
(the same technique this doc's Frame 444 section already used for YOSHI) to
find the real per-fixture/species discriminator — not attempted this round
(would have consumed the budget needed for Part B, which resolved cleanly).
`src/engine/battleScene.ts`'s `opponentSummaryExitElapsed`/
`drawOpponentSummaryExit` are unchanged from before this round; frame 444
remains an open, two-defect residual (status-bar widget sub-fix pinned
here but not shipped, pending the discriminator fix; materialize column
shift undiagnosed).
