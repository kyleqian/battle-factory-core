# Class-(iii) family diagnosis: what the large multi-region mismatches in turn5-confirm/resolve are made of (ISSUES #97-B)

**2026-08-18, bounded SIDE worker.** Drills into `docs/turn5-bounce-recalibration-probe.md`
§8g's trace-level bbox classification, which left the six `turn5-confirm-off-*`
/ `turn5-resolve-off-*` traces' **class (iii)** frames (the overwhelming
majority of all six traces' mismatches) as "other/unknown ... this session
did not trace and cannot attribute." This step reads actual app/oracle/diff
PNGs frame-by-frame to name what's really in them. **No fix attempted, no
`src/` edit** (`git diff -- src/` empty throughout).

## 0. Repro — counts unchanged from §8g (PP fix has not landed yet)

Fresh `npm run compare -- <trace> --summary` for all six traces reproduces
§8g's counts byte-for-byte: `confirm-off-a` 8/132, `confirm-off-b` 0/132,
`resolve-off-a` 7/196, `resolve-off-b` 71/196, `resolve-off-c` 149/196,
`resolve-off-d` 0/196. The parallel MAIN-lane PP-digit fix had not landed as
of this session, so nothing here reflects it yet (see §5 for what it would
and would not change).

All six traces share **byte-identical 76-segment button scripts**
(`sha256`-truncated `97accadc6d75` for every one, confirmed by hashing
`tools/compare/traces/*.json`'s `segments` array) — they are the SAME
canonical replay, differing only in `captureFrames`. This rules out a
"different script" confound outright: tick `t`'s app-side render is
identical state machine input across all six files, so a bug reproduced at
tick 6053 in `confirm-off-a` is the same bug at tick 6053 if any other trace
happened to capture it.

## 1. Method

For each trace, read 3-6 representative `app-*.png` / `oracle-*.png` /
`diff-*.png` triples spanning the mismatch window (start, a large-diff
frame, and — where the trace has one — the point where matches resume) with
the Read tool, and describe what's actually drawn: message-box text content,
HP numbers, HP-bar fill, sprite identity/pose, status-box presence. Findings
below cite exact frame numbers so they're independently re-renderable via
`npm run compare -- <trace> --capture-range <a>:<b>`.

## 2. Finding, stated up front: this is NOT bounce, NOT PP digits, NOT a small phase shift

Every representative frame read below shows a **large, qualitative content
difference** — different message-box text, different HP numbers by tens of
points, sprites present in one image and absent in the other, whole UI
elements (status boxes) missing — not a 1-2px sprite/healthbox offset (the
sine-bounce mechanism `docs/turn5-bounce-recalibration-probe.md` already
diagnosed) and not a single wrong glyph (the PP-digit confound). Candidate
(d) from the brief (whole-window phase shift, matches at `t±1..3`) is also
ruled out by inspection: the app sits on the **same** message-box text for
hundreds of consecutive ticks while the oracle advances through several
real turn-transitions in that span — no small `t±k` shift makes those equal.

## 3. Per-trace evidence

### 3a. `turn5-confirm-off-a` (5958-6089, 8/132 matched)

- **Frame 6053** (first-listed mismatch, `bbox=41,8-229,111`, 15.03%): both
  app and oracle show `"Foe GROVYLE used\nENDEAVOR!"` — text CONTENT already
  matches here. But GROVYLE's own HP bar (top-left box) differs in fill
  color/length between app and oracle, and the GROVYLE sprite itself (top
  right) is a **solid full-silhouette diff** in the diff PNG — not an
  edge-only outline (which the sine-bounce mechanism produces), a
  whole-sprite mismatch.
- **Frames 6079-6089** (`bbox=44,49-229,111`, 8.47-8.49%, spans BOTH the
  ONIX sprite region and the healthbox region simultaneously — exactly
  §8g's "class (iii)" shape): read the ONIX healthbox digits directly.
  Oracle's ONIX HP **drains visibly across this exact span**: 88 (6053) →
  85 (6078) → *sprite vanishes one frame* (6079) → 83 (6080) → 80 (6083) →
  74 (6089). The **app's ONIX HP stays frozen at `88/117` for the entire
  window**, all the way to the last captured frame (6089). This single fact
  — a live, ticking HP-drain-and-flicker sequence in the oracle against a
  static pre-drain number in the app — explains the multi-region bbox shape
  directly: the healthbox digits/bar differ (healthbox portion of the bbox)
  AND the sprite's hit-flash flicker frame differs (sprite portion of the
  bbox), from the SAME root cause, not two separate mechanisms.
- **Caveat on §8g's "5 healthbox-only, class (ii) shape" sub-claim**: §8g
  bucketed 6078/6083-6086 as matching the bounce mechanism's known bbox
  shape (`127,7x-229,11x`). Reading 6083 directly shows the ONIX HP DIGIT
  itself differs (`88` app vs `80` oracle) — a content difference, not a
  sub-pixel Y-shift. These 4 frames' bbox coincidentally lands in the same
  screen region the sine-bounce mechanism also touches (both drive pixels
  in the healthbox strip), but the pixel-level cause here is this HP-freeze
  mechanism, not bounce. **This corrects §8g's shape-only classification**
  for those 4 frames specifically — flagging it, not editing the probe doc
  (out of scope per the brief).
- The 4 frames §8g called genuinely bounce-shaped and onix-sprite-only
  (6066-6069, `bbox=44,49-99,111`, matching `turn6-reopen-off`'s own known
  onix-only signature) are NOT re-litigated here — HP stayed unchanged
  (88/117 both sides) at nearby frames, consistent with them being the
  actual sine-bounce mechanism, separate from this freeze.

### 3b. `turn5-confirm-off-b` (6090-6221, 0/132 matched)

- **Frame 6193**: app still shows `"Foe GROVYLE used\nENDEAVOR!"` with ONIX
  at `117/117` (full — a DIFFERENT, later-refreshed value than -a's frozen
  88, see §4 note). Oracle shows `"ONIX used"` (a brand new message — ONIX's
  own move, a full turn later) with ONIX HP crashed to `1/117` (a red,
  nearly-empty bar).
- **Frame 6221** (last frame in this window): app is **still** on
  `"Foe GROVYLE used\nENDEAVOR!"` / `117/117`. Oracle has advanced further
  still, to `"ONIX used\nROCK SLIDE!"` with HP still `1/117`.
- Across this entire 132-frame window the app's message box and HP box
  **never change** — a hard stall, not a lag of N ticks. `bbox=16,91-221,149`
  (near-constant, ~2.5%) is exactly the message-banner + HP-box rows this
  stall touches.

### 3c. `turn5-resolve-off-a` (6222-6417, 7/196 matched)

- **Frame 6389**: app shows `"ONIX used\nROCK SLIDE!"` with GROVYLE's status
  box at full HP. Oracle's GROVYLE status box is **gone entirely**, replaced
  by `"Foe GROVYLE"` (mid-print of the fainted line) over a plain
  white/gray background — the real hardware's faint-flash scene transition.
- **Frame 6417** (last frame in window): app **still** on `"ONIX used\nROCK
  SLIDE!"`. Oracle now reads `"Foe GROVYLE fainted!"` with the heart icon,
  same plain background.
- Same stall, continuing uninterrupted from -b.

### 3d. `turn5-resolve-off-b` (6418-6613, 71/196 matched)

- **Frame 6514**: app **still** on `"ONIX used\nROCK SLIDE!"` (unchanged
  since frame ≈6389 — over 300 ticks / ~5s of real time with zero app-side
  progress). Oracle: `"Foe GROVYLE fainted!"`.
- **Frame 6542**: app has now caught up — it also shows `"Foe GROVYLE
  fainted!"` with the heart icon, matching oracle. This is the moment the
  71/196 matches begin.
- **This is the mechanism behind §8g's "shrinking bbox ... looks like a
  text-reveal timing lag" description** — it is not a per-character typing
  cadence issue; it's the **tail of the same stall converging**, as the
  app's own delayed dispatch chain finally reaches the branch the oracle
  has been sitting on. The "shrinking" bbox is the app's own fainted-text/
  heart-icon draw catching up to oracle's already-static frame, frame by
  frame, until they coincide exactly.

### 3e. `turn5-resolve-off-c` (6614-6809, 149/196 matched)

- Frames 6614-6762 (149 frames) **match** — the app genuinely caught up
  during this stretch (BUG CATCHER DESTIN's trainer-switch dialogue,
  presumably rendered by already-verified generic code).
- Mismatches are **exactly** the trailing 47 frames, 6763-6809 (confirmed
  via full mismatch-frame enumeration — a contiguous run, not scattered).
- **Frame 6781/6786**: text CONTENT now matches both sides
  (`"BUG CATCHER DESTIN sent\nout PIDGEOTTO!"`) — but oracle already shows
  PIDGEOTTO's name/HP status box (top-left, `PIDGEOTTO Lv50`, full bar);
  **the app has not drawn that status box at all** at 6781, still missing
  at 6786, and **still missing at 6809** (the window's last frame — doesn't
  resolve before the capture cuts off). This is a second, narrower instance
  of the same family: a UI element (here, the newly-sent-out mon's status
  box) appearing late relative to the oracle.
- **Frame 6768** (the largest single diff in this window, 45.45%,
  `bbox=0,1-239,111`): both app and oracle show PIDGEOTTO's pink
  send-out-flash silhouette (same animation phase), but the diff PNG shows
  **horizontal striping across the entire upper background**, not just the
  sprite — a background dither/gradient pattern that differs row-by-row
  between app and oracle during this specific animation moment, layered
  on top of the missing status box. Flagged as a secondary, narrower
  mechanism (background-dither timing during the send-out flash); not
  traced further this session (time).

### 3f. `turn5-resolve-off-d` (6810-7005, 0/196 matched)

- **Frame 6977** (window start): app **still** shows
  `"BUG CATCHER DESTIN sent\nout PIDGEOTTO!"` with ONIX at `1/117`. Oracle
  has moved on to `"ONIX's SITRUS BERRY\nrestored health!"` with ONIX at
  `26/117`.
- **Frame 6996**: app is **still** frozen on the send-out message (ONIX
  shown with a sparkle overlay but still reading `1/117`). Oracle has
  progressed to the `"What will ONIX do?"` FIGHT/BAG/POKéMON/RUN action
  menu with ONIX at `31/117`.
- The stall never resolves inside this window — 0/196 matched, and the
  largest bboxes (18-22%, `bbox=9,71-238,158`) are exactly where the
  oracle's action-menu box now occupies screen real estate the app's still-
  frozen battle-message screen doesn't have content for.
- Source-side note (see §4): `TURN5_SITRUS_HEAL_TEXT_START_TICK`,
  `TURN5_SITRUS_MENU_REDRAW_TICK`, `TURN5_SITRUS_TEXT_CLEAR_TICK`, and
  `drawTurn5SitrusSettledMenuChrome` (`battleScene.ts`, ~40+ call sites)
  already exist in the source and appear to model exactly this
  "what will ONIX do" resettled-menu content — so this is very unlikely to
  be *missing* code; it looks like a **dispatch/reachability** bug (the
  branch that should select this content isn't being reached for these
  ticks), not an unimplemented gap.

## 4. Named mechanism (one dominant, one secondary)

**Dominant — "turn-resolution dispatch stall."** The app's battle-scene
renderer sits on one message/HP/sprite state for a large, non-fixed number
of consecutive ticks while the oracle's real hardware advances through
several genuine turn-transitions (HP drain → faint → send-out → item-heal →
return-to-menu) in that same span, then — at an unpredictable later point —
snaps to whatever content the CURRENT tick's dispatch branch produces,
sometimes catching all the way up to the oracle (3d, 3e's first 149 frames)
and sometimes not (3f, still stalled at the window's end). This is not the
sine-bounce mechanism (`docs/turn5-bounce-recalibration-probe.md`), not the
PP-digit confound, and not a small phase shift — it is qualitatively
different content, frozen for a large tick span, not a small pixel offset.

This does **not** match any of the brief's candidates (a)-(d) as stated; it
is closest in spirit to (b) but far larger in scale (whole messages/HP
values, not per-character typing speed) — naming it **(f) turn-resolution
dispatch stall**, evidence-named per the brief's "(e) other, evidence-named"
option.

**Secondary — "send-out status-box + background-dither lag"** (3e only,
frames 6763-6809): once the dominant stall has resolved for a stretch, a
narrower, separate lag appears specifically during PIDGEOTTO's send-out:
its status box appears late, and the background shows row-striped dither
differences during the pink send-out-flash frame. Distinct code path
(status-box slide-in + background palette-cycle timing), not traced to a
specific function this session.

## 5. Table: trace × mechanism × frames explained × expected-after-PP-fix

| trace | dominant mechanism frames | secondary/other frames | expected after PP-digit fix lands |
|---|---|---|---|
| `confirm-off-a` (132) | ~120 dispatch-stall (6053-6065, 6070-6077, 6079-6089 minus the 5 corrected in §3a) | 4 bounce-shaped (6066-6069, likely genuine sine-bounce — unverified this session) + 5 reclassified from "bounce-shape" to dispatch-stall (§3a caveat) | **No change** to dispatch-stall frames (unrelated mechanism); the 4 genuine bounce frames may move to match per the already-landed window-B fix, not re-verified this session |
| `confirm-off-b` (132) | 132/132 dispatch-stall (full window, never advances) | none observed | **No change** — PP digits never appear in any read frame; this trace's whole mismatch is message/HP content, not PP |
| `resolve-off-a` (196) | 189/196 dispatch-stall (the 7 matches are almost certainly frames that happen to precede the stall's onset or land on content both sides already share) | none observed | **No change** |
| `resolve-off-b` (196) | ~125/196 dispatch-stall, then convergence tail (the 71 already-matched frames ARE the stall resolving, see §3d) | none observed | **No change** — the 71/196 already matching is not a PP effect, it's the stall's own natural convergence |
| `resolve-off-c` (196) | 47/196 (6763-6809: 149 already match — app caught up earlier in this window) | some fraction of the 47 is the secondary send-out/background-dither mechanism (§3e), not separately quantified this session | **No change** — no PP digits appear in any read frame (move-name/HP-number/status-box content only) |
| `resolve-off-d` (196) | 196/196 dispatch-stall (never resolves inside this window) | none observed | **No change** |

**No frame read this session shows a PP digit anywhere** (no move-selection
submenu is on screen in any of the representative frames — these traces sit
entirely in message-box/HP-drain/faint/send-out/menu-return content). The
parallel MAIN-lane PP-digit fix is **orthogonal to this entire family**; it
should not be expected to move any of these six traces' counts.

## 6. Code path and fix shape (dominant mechanism)

**Dispatch chain** (`src/engine/battleScene.ts`), read but not modified:
- `drawFightSubmenuWindow`'s `sm.confirmElapsed !== null` branch
  (~line 8525) computes `pressTick` and, once `t >= textStart`, for
  `turn5Active` calls `drawTurn5EndeavorText(fb, t, pressTick,
  latestCompletedCommandHandoff, trainerPresentation)` and **returns** —
  this is the sole entry point for all of turn 5's post-confirm content.
- `drawTurn5EndeavorText` (`battleScene.ts:10389`) itself dispatches
  onward: `if (t >= rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK))
  drawTurn5RockSlideWindow(...)`, else computes a live `onixHp =
  endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to)`
  (`battleMenu.ts:2721`) and draws the still-draining HP overlay.
- Further downstream, well-named constants/functions for the ENTIRE rest of
  the sequence already exist and are wired somewhere in this file:
  `TURN5_FAINTED_TEXT_DELAY`, `TURN5_ICONBAR_CREATE_TICK` /
  `_FADE_START_TICK` / `_DESTROY_TICK`, `drawTurn5PidgeottoMaterialize` /
  `drawTurn5SwitchinSprite` (~11112-11201), `TURN5_SITRUS`,
  `TURN5_SITRUS_HEAL_TEXT_START_TICK` / `_MENU_REDRAW_TICK` /
  `_TEXT_CLEAR_TICK`, `drawTurn5SitrusSettledMenuChrome` (40+ call sites),
  and turn 6's own `TURN6_FEATHERDANCE_LINE1/2`, `turn6KickoffBounceTick`,
  `drawTurn6ActionMenuIdleWindow` / `drawTurn6RockSlideAttack` /
  `drawTurn6RockSlideWindow`. **The content is not missing** — the dispatch
  chain that should walk through it for THESE six traces' captured tick
  range is either not reaching the right branch or reaching it with stale
  inputs (e.g. a `pressTick`/`TURN5_ROCKSLIDE_PRESS_TICK`-family anchor that
  doesn't match what these traces' shared 76-segment script actually needs).

**Fix shape (not attempted here):** this needs a live instrument, not a
guess — extend the exact pattern
`tools/probe/analyze-turn5-6-reopen-bounce-app-series.ts` already
established (drive the real engine via `createInitialState`/`tick`, read
`state.battleScene` directly, no `src/` edit) across the FULL 5958-7005
range at ~50-100 tick resolution, logging which top-level branch
(`turn5Active`/`turn5SettledWindowActive`/etc.), which `drawTurn5*`
function, and that function's own key inputs (`pressTick`, `t - pressTick`,
`onixHp`) are selected at each sampled tick. Diff that against the RAM
ground truth (`dump-turn5-6-reopen-bounce-driver.py`-style probe, or a new
probe reading `gBattleTextBuff1`/message-state + `gBattleMons[].hp`/`gBattlerSpriteIds`
faint/switch-in state directly) for the SAME ticks. The two together will
show exactly which branch's entry condition is wrong (a tick boundary
that's too late, or an anchor tick computed from the wrong upstream event)
— that comparison is the sharpest next instrument, and is a precondition
for any actual fix (the fix shape itself — likely correcting one or more
`TICK`/`DELAY` constants' anchors, or a dispatch condition's boundary — is
data-shaped, not guessable from pixels alone).

## 7. Next instrument (secondary mechanism, not traced to a fix shape)

For §3e's status-box-lag + background-dither finding (`resolve-off-c`,
6763-6809): RAM-probe PIDGEOTTO's `gHealthboxSpriteIds[1]`/status-box OAM
visibility and the background palette-cycle index across ticks 6760-6810,
compared against the app's own `drawTurn5PidgeottoMaterialize`/
`drawTurn5IconBar` inputs at the same ticks — same instrument shape as §6,
narrower window, not run this session (time).

## 8. Verdict

The class-(iii) majority across all six traces is **one dominant,
previously-unattributed mechanism** — a turn-resolution dispatch stall
where the app freezes on stale message/HP/sprite content for large,
unpredictable tick spans while the oracle's hardware advances through
real turn-transitions, occasionally catching up and sometimes not within a
given capture window — plus one narrower secondary mechanism (send-out
status-box + background-dither lag) local to `resolve-off-c`'s tail. Neither
is the sine-bounce mechanism, the PP-digit confound, or a small phase
shift; the parallel PP-digit fix is orthogonal to this entire family and
should not be expected to move any of these six traces' scores. §6 names
the exact dispatch chain and the concrete next instrument (a live tap
extending the existing `analyze-turn5-6-reopen-bounce-app-series.ts`
pattern across the full 5958-7005 range) required before a fix is
attemptable.

**Superseded by §9-§13 below** (next bounded SIDE session, same branch
stack): the live tap this section called for has now run across the FULL
5958-7005 range, and — contrary to this section's own framing — the
top-level dispatch chain (`turn5Active`, `sm.confirmElapsed`,
`rockSlideTextStartTick`) is **not** stalled at all; it walks its four
message-phase boundaries (6222/6523/6687/7078) exactly on schedule for
every sampled tick. The "stall" is real in the rendered pixels but has
**two distinct, more surgical, non-dispatch-reachability causes** — see §9-13.

## 9. App-side dispatch tap, full range (instrument 1 of §6, run this session)

New script `tools/probe/analyze-turn5-resolve-dispatch-app-series.ts`
extends `analyze-turn5-6-reopen-bounce-app-series.ts`'s exact pattern
(`createInitialState`/`tick`, read `state.battleScene`, no `src/` edit) —
but instead of re-deriving the bounce-only formulas that script targets,
it re-evaluates the REAL top-level message dispatch
`drawFightSubmenuWindow`/`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`
use, importing the real exported symbols (`isTurn4LatestCompletedCommandLifecycleActive`,
`rockSlideTextStartTick`, `turn5FaintedTextStartTick`,
`SWITCHIN_SENTOUT_TEXT_START_TICK`, `TURN5_SITRUS_HEAL_TEXT_START_TICK`,
`endeavorHp`) — every tick 5958-7005 (1048 rows, dumped to
`artifacts/turn5-resolve-dispatch-app-series.json`, gitignored — the table
below is the receipt). Run: `node --experimental-strip-types
tools/probe/analyze-turn5-resolve-dispatch-app-series.ts`.

**Result: `turn5Active` is `true` for every single tick in 5958-7005** (it
never flips false — confirmed by scanning all 1048 rows, not sampling), and
the top-level branch walks its four calibrated absolute-tick boundaries
exactly on schedule, with zero drift from the trace's own real
`sm.confirmElapsed` (`endeavorPressTick = TICK0 + sm.confirmElapsed = 5959`,
matching `TURN5_CONFIRM_PRESS_TICK` bit-exact):

| tick | branch selected | sub-phase |
|---|---|---|
| 5958 | `drawTurn5EndeavorText` | (pre-confirm, `onixHp` still null) |
| 5959-6221 | `drawTurn5EndeavorText` | ENDEAVOR-hold; `onixHp` computed live: **88(5959) → 88(6089, unchanged) → 50(6150) → 7(6193) → 1(6220)** |
| 6222-6522 | `drawTurn5RockSlideWindow` | `attackText` ("ONIX used\nROCK SLIDE!") |
| 6523-6686 | `drawTurn5RockSlideWindow` | `faintedText` ("Foe GROVYLE fainted!") |
| 6687-7005 (window end, never advances) | `drawTurn5RockSlideWindow` | `sentOutText` ("BUG CATCHER DESTIN sent out PIDGEOTTO!") — **still this phase at tick 7005**, the entire `resolve-off-d` capture window |

The four boundaries are `rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK=5829)=6222`,
`turn5FaintedTextStartTick(5829)=6523`, `SWITCHIN_SENTOUT_TEXT_START_TICK=6687`
(all three module-level absolute constants, **not** derived from this
trace's own `sm.confirmElapsed=5959`/`TICK0+4919`), and
`TURN5_SITRUS_HEAL_TEXT_START_TICK=7078` (also absolute, past the
captured window's own end at 7005).

## 10. Two distinct root causes found (not one dispatch-reachability bug)

### 10a. Root cause 1 — `onixHp` is computed correctly but never reaches the screen (`confirm-off-a`/`-b`, ticks ~5959-6221)

The tap's own `onixHp` column (§9 table) proves `endeavorHp(t, pressTick=5959,
from=88, to=1)` drains correctly and LIVE the entire ENDEAVOR-hold window —
this directly contradicts §3a/§3b's own pixel reads, which found the
app's RENDERED healthbox frozen at a stale value (88 the whole window in
`confirm-off-a`, then a DIFFERENT stale value, 117/117, in `confirm-off-b`).
The formula is right; the render call that should consume it is being
skipped. Reading `drawTurn5EndeavorText` (`battleScene.ts:10389-10414`):

```
const onixHp = endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to);
if (drawEndeavorSquish(fb, t, pressTick, TURN4_ROCKSLIDE_HP.to, bounceTick, ROCK_SLIDE_MOVE_POWER)) {
  drawPlayerHealthboxHpOverlay(fb, onixHp, endeavorHealthboxBounceY2(t, pressTick));
} else {
  drawActionMenuIdleContentFromLatest(fb, bounceTick, latestCompletedCommandHandoff, onixHp);
}
```

`drawEndeavorSquish` (`battleScene.ts:9372-9374`) returns `true` only for a
short table-bounded window right after `pressTick` (`local = t - pressTick -
ENDEAVOR_SQUISH_START_DELAY` inside `[0, ENDEAVOR_SQUISH_TABLE.length)`) —
false for nearly this entire 263-tick hold, so the `else` branch is what
actually renders for almost the whole window. Reading
`drawActionMenuIdleContentFromLatest` (`battleScene.ts:8178-8194`):

```
function drawActionMenuIdleContentFromLatest(fb, bounceTick, latest, playerHpOverride?) {
  drawMenuIdleBaseWithOpponentHpFromLatest(fb, latest);
  const resolvedPlayerHp = playerHpOverride ?? latest?.content?.field.player.hp.current ?? anchorPlayerAfterTurnHp;
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick);
  drawTwoStateBounceRect(fb, menuIdleOnixBounce, onixY2);
  drawTwoStateBounceRect(fb, menuIdleHealthboxBounce, healthboxY2);
  if (turn2FightCommandPresentationFromLatest(latest) !== null || turn3FightCommandPresentationFromLatest(latest) !== null) {
    drawPlayerHealthboxHpOverlay(fb, resolvedPlayerHp, healthboxY2);   // <-- gate
  }
}
```

**The bug**: the HP-overlay draw is gated behind
`turn2FightCommandPresentationFromLatest(latest) !== null ||
turn3FightCommandPresentationFromLatest(latest) !== null` — these two
helpers (`turn2ResolutionAdapter.ts:187`, `turn3ResolutionAdapter.ts:191`)
narrow `latest` to turn-3's and turn-4's own specific real-move shapes
respectively (matched by `content.upcoming.moves[...]` identity, e.g. the
DOUBLE_TEAM/ROCK_SLIDE pair). This function was written for turns 2/3's own
use of it as their idle-window renderer. Turn 5 reuses the SAME function as
`drawTurn5EndeavorText`'s no-squish fallback, but by turn 5's window
`latest` is turn 4's completed-command receipt — its move shape matches
**neither** the turn2 nor turn3 narrowing, so the gate is `false` for
(within measurement resolution) the entire ENDEAVOR-hold span, and
`drawPlayerHealthboxHpOverlay` — the ONLY call that would paint the live
`onixHp`/`resolvedPlayerHp` value into the framebuffer — is never invoked.
Whatever pixels are already sitting in the healthbox region from a PRIOR
draw call stay on screen unchanged: exactly the "static/stale, not
draining" pixel behavior §3a/§3b independently observed (and why the stale
value differs between the two traces — 88 vs 117 — it's whatever the
LAST actual paint left behind, not a designed value).

**This is a real missing-case bug, not a wrong tick constant**: no
`TICK`/`DELAY` anchor is involved; the fix (not applied here, out of
scope) is extending the gate to also cover turn 4/5's own presentation
shape (a `turn4FightCommandPresentationFromLatest`-equivalent check, or
loosening the gate for this call site specifically).

### 10b. Root cause 2 — `TURN5_SITRUS_HEAL_TEXT_START_TICK=7078` anchored too late (`resolve-off-d`, the entire 196/196 window)

§9's table shows the app dispatch sits in `drawTurn5RockSlideWindow`'s
`sentOutText` sub-phase for the ENTIRE `resolve-off-d` capture window
(6810-7005) without exception — it cannot reach the Sitrus-heal phase
before `TURN5_SITRUS_HEAL_TEXT_START_TICK=7078`, which is past the
window's own end (7005). This is **not** a reachability bug — the branch
condition (`battleScene.ts:14838`, `if (t < TURN5_SITRUS_HEAL_TEXT_START_TICK)`)
is doing exactly what it's coded to do — it is a **wrong anchor value**.
Oracle ground truth (§3f, already-established pixel evidence this session,
re-cited here as this instrument's oracle-side timeline per the brief's
step 2 — a live RAM re-probe was not run this session, time; see §13's
caveat):

- oracle tick 6977: **already** showing `"ONIX's SITRUS BERRY\nrestored
  health!"`, ONIX at 26/117 — the Sitrus-heal message is ALREADY the
  current screen content, **101 ticks before** the app's own
  `TURN5_SITRUS_HEAL_TEXT_START_TICK=7078` boundary would even let it try.
- oracle tick 6996: already at the `"What will ONIX do?"` action menu,
  ONIX at 31/117 — TWO phases past Sitrus-heal (heal text → blank hold →
  settled menu chrome, the three-tick chain
  `TURN5_SITRUS_HEAL_TEXT_START_TICK`/`_TEXT_CLEAR_TICK`/`_MENU_REDRAW_TICK`
  models) — **82 ticks before** the app's heal-text boundary alone.

So the real oracle transition to the Sitrus-heal message is somewhere at
or before tick 6977 — this session did not narrow it further (needs a
dense `npm run compare -- turn5-resolve-off-d --capture-range 6900:6980`
sweep or a `gBattleTextBuff1`/message-state RAM probe over 6900-6996, not
run this session, time). Taking 6977 as an upper bound, the anchor is
wrong by **at least 101 ticks, late**. Since
`TURN5_SITRUS_TEXT_CLEAR_TICK=7216` (+138 from heal-start) and
`TURN5_SITRUS_MENU_REDRAW_TICK=7222` (+6 more) are both defined as their
own absolute literals in `battleSceneCanonical.ts` rather than as offsets
computed from `TURN5_SITRUS_HEAL_TEXT_START_TICK` in-file, whether they
need the exact same ~101-tick shift or a different one is **not
verified this session** — flagged, not resolved (§13's PASS/FAIL covers
only the heal-text boundary itself, the one directly instrumented here).

## 11. What §10 does and does not explain, per trace

| trace | §10a (HP-overlay gate) | §10b (Sitrus-heal anchor) | net this session |
|---|---|---|---|
| `confirm-off-a` (132, 8 matched) | **Yes** — directly explains the frozen-88 HP finding in §3a; message text already matches independently | n/a (window ends 6089, well before 6222) | HP-overlay fix predicted to move some fraction of the ~120 dispatch-stall frames; exact count NOT verified (needs the oracle's own real HP-drain schedule for cross-check, not run this session) |
| `confirm-off-b` (132, 0 matched) | **Partially** — explains the stale-117 HP finding in §3b | n/a | **Unresolved tension**: §3b's own frame read shows the oracle ALREADY on `"ONIX used..."` text (a new message) by tick 6193, 29 ticks BEFORE the app's own `rockSlideTextStartTick=6222` boundary — a boundary this session's tap confirms is exactly where the app's dispatch is coded to wait until. If that oracle read is accurate, `rockSlideTextStartTick`'s own calibration (previously oracle-pixel-confirmed for a DIFFERENT trace, `turn5-action-off.json` — same 76-segment script, confirmed by hash) may ALSO be off for this trace family, OR the §3b frame read needs re-verification (a single Read-tool pixel description, not a RAM probe). Flagged, not resolved — see §13 |
| `resolve-off-a` (196, 7 matched) | No — different code path (`drawTurn5RockSlideWindow`'s attack phase calls `drawPlayerHealthboxHpOverlay` unconditionally at `battleScene.ts:14808`, not gated) | n/a (window is 6222-6417, well before 7078) | Not explained by either root cause this session; the 189/196 dispatch-stall frames in this window (§5) likely track GROVYLE's own healthbox/faint-sink timing (§3c), a code path not traced this session |
| `resolve-off-b` (196, 71 matched) | No (same as above) | n/a | Not explained by either root cause; §3d's own "convergence tail" (the 71 already-matched frames) is consistent with the `faintedText` boundary (6523) being close-to-correct, unlike heal-text |
| `resolve-off-c` (196, 149 matched) | No | n/a (window is 6614-6809, before 7078) | Not explained; the trailing 47-frame mismatch is §3e/§7's OWN separate secondary mechanism (status-box + dither lag), out of scope here |
| `resolve-off-d` (196, 0 matched) | No | **Yes — fully.** §9's table shows the app never leaves `sentOutText` anywhere in this window; §10b's ~101+-tick-late anchor is sufficient on its own to explain all 196 mismatched frames | Full-window fix predicted **if** the corrected anchor's downstream siblings (`_TEXT_CLEAR_TICK`/`_MENU_REDRAW_TICK`) are shifted consistently — unverified this session |

## 12. Reframing §4/§8's "dispatch stall" characterization

§4/§8 (previous session) named ONE mechanism, "turn-resolution dispatch
stall," implying the dispatch chain itself fails to REACH the right
branch. §9's full-range tap disproves that framing directly: `turn5Active`
never flips false, and every top-level branch transition (6222/6523/6687)
fires exactly where its own hardcoded constant says it should — reachability
is not the bug. What IS real, per §10, is narrower and belongs to (at
least) two independent mechanisms that happen to LOOK like the same
"frozen content" symptom from pixels alone:

- **§10a is a genuine missing-case gate** inside a shared rendering helper
  (`drawActionMenuIdleContentFromLatest`) — zero tick constants involved,
  a boolean condition never extended to turn 5's own reuse of the function.
- **§10b is a genuine wrong-anchor bug** — one absolute tick constant
  (`TURN5_SITRUS_HEAL_TEXT_START_TICK`, possibly its two downstream
  siblings too) calibrated ~101+ ticks too late for this specific trace
  family's real oracle timeline.

This directly answers the brief's §3/step-4 question ("ONE upstream anchor
slipping... vs several independent boundaries"): the evidence points to
**several independent boundaries**, not one shared upstream anchor — §10a
and §10b are unrelated code paths (a rendering gate vs. a phase-transition
tick), and even within §10b's own family, whether the sibling ticks share
one shift or need independent correction is unverified (§10b, last
paragraph).

## 13. Rerunnable PASS/FAIL for the fix worker

1. **§10a fix check** — after extending
   `drawActionMenuIdleContentFromLatest`'s HP-overlay gate to also permit
   turn 5's own presentation shape (or an equivalent targeted fix), rerun
   `tools/probe/analyze-turn5-resolve-dispatch-app-series.ts` and confirm
   `onixHp` is unchanged (it already computes correctly — this fix must
   not touch the formula) — the check is entirely in `npm run compare --
   turn5-confirm-off-a --summary` / `turn5-confirm-off-b --summary`: PASS
   if the previously-frozen-HP frames in `confirm-off-a` (6053-6089) now
   show a draining HP bar matching the oracle's own drain schedule; FAIL
   (or partial) if the drain rate itself still mismatches (a separate,
   unverified concern per §11's `confirm-off-a` row).
2. **§10b fix check** — first RE-VERIFY the real oracle Sitrus-heal
   transition tick precisely (dense `npm run compare -- turn5-resolve-off-d
   --capture-range 6900:6996` sweep, or a `gBattleTextBuff1` RAM probe,
   neither run this session) before picking a corrected
   `TURN5_SITRUS_HEAL_TEXT_START_TICK` value — do not guess-shift by
   exactly 101 (that's only a same-tick upper bound from §10b, not the
   exact transition tick). After correcting, rerun `npm run compare --
   turn5-resolve-off-d --summary`: PASS if 196/196 now match (§11 predicts
   full-window recovery IF the two sibling ticks are shifted consistently);
   investigate further if a partial mismatch remains near the window's own
   tail (would indicate the siblings need independent correction).
3. **§11's `confirm-off-b` open tension** — before trusting
   `rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK)=6222` for this trace
   family, re-render frames 6180-6222 with `npm run compare --
   turn5-confirm-off-b --capture-range 6180:6222` and read the oracle PNGs
   directly (or RAM-probe `gBattleTextBuff1`) to confirm/refute §3b's
   "oracle already on ONIX's move by 6193" reading. If confirmed, `6222`
   itself needs correction for this family despite its earlier
   oracle-pixel-confirmed calibration (against a byte-identical script,
   per this session's own sha256 check) — the discrepancy would then need
   its own root-cause pass.
4. **resolve-off-a/-b/-c's remaining un-explained frames** (§11) are
   explicitly NOT covered by this session's two root causes — a
   GROVYLE-healthbox/faint-sink-timing instrument (parallel to §10a/§10b
   but for the opponent side) is the next bounded step, not attempted here
   (time).

## 14. GROVYLE-side RAM ground truth, ticks 6100-6810 (this session, ISSUES #97-B continuation)

New script `tools/probe/dump-turn5-resolve-grovyle-side-driver.py` (same
direct-`EmeraldOracle`/`factory-battle-scene-off.json`/`turn5-resolve-off-a.json`
pattern `dump-turn5-6-reopen-bounce-driver.py` already established) reads,
every tick, both battlers' `gBattleMons[]` hp/species (struct offsets from
`dump-battler-full.py`), `gDisplayedStringBattle` (decoded via
`probe-gate6-r2-off.py`'s own char table), `gBattlerSpriteIds`/
`gHealthboxSpriteIds`, and the `B_WIN_MSG` `sTextPrinters[0]` struct (fixed
EWRAM link address `0x020201B0`, pinned by
`dump-win-terminal-swap-textprinter.py` on this SAME ROM build — a
compile-time constant, not scenario-dependent). Two runs: the full union
window (6185-6810, `artifacts/turn5-resolve-grovyle-side-driver.json`) and a
dense early re-check (6100-6190, `artifacts/turn5-resolve-grovyle-side-driver-early.json`,
both gitignored — this table is the receipt). Run:
`python3 tools/run-mgba-probe.py <out.json> -- tools/probe/dump-turn5-resolve-grovyle-side-driver.py <out.json> [startTick endTick]`.

**Real oracle transitions** (collapsed from all message/species/HP/printer
state changes across both runs):

| real tick | event |
|---|---|
| ≤6100 | `"Foe GROVYLE used\nENDEAVOR!"`, ONIX hp draining 88→1 |
| 6164 | ONIX hp reaches 1 (Endeavor crash complete) |
| **6184** | message flips to `"ONIX used\nROCK SLIDE!"`, printer `active=1` (starts typing) |
| 6204 | printer `active→0` (attack text fully typed/settled) |
| **6285** | GROVYLE (`battler1`) hp reaches **0** |
| **6378** | message flips to `"Foe GROVYLE\nfainted!"`, printer `active=1` |
| 6397 | printer `state 0→2` |
| 6561 | printer `state 2→0` |
| 6562 | printer `active→0` (fainted text settled) |
| 6684 | `battler1` species flips 278(GROVYLE)→17(PIDGEOTTO), hp jumps to 156 (RAM send-out swap, precedes the message) |
| **6686** | message flips to `"BUG CATCHER DESTIN sent\nout PIDGEOTTO!"`, printer `active=1` |
| 6723 | printer `active→0` (sent-out text settled) |
| 6762 | `gDisplayedStringBattle` switches to raw `PIDGEOTTO`-name status-box text (name-plate draw, not a dialogue message) |

## 15. App vs. real: three distinct anchor errors, not one growing drift

Comparing §9's app boundaries against §14's real transitions, restricted to
the three boundaries both instruments cover in this window:

| phase boundary | app constant (§9) | real oracle tick (§14) | delta (app − real) |
|---|---|---|---|
| attack-text start | `rockSlideTextStartTick(5829)=6222` | **6184** | **+38 (late)** |
| fainted-text start | `turn5FaintedTextStartTick(5829)=6523` | **6378** | **+145 (late)** |
| sent-out-text start | `SWITCHIN_SENTOUT_TEXT_START_TICK=6687` | **6686** | **+1 (essentially exact)** |

**This directly answers the brief's growing-vs-independent question: the
deltas do NOT grow monotonically through the window (38 → 145 → 1) — they
spike and then reset to near-zero.** A single shared upstream cadence bug
(e.g. the app running one continuous typing/animation clock slightly slower
than real hardware) would predict a delta that keeps growing or stays
roughly constant across consecutive boundaries; instead the third boundary
is calibrated almost perfectly while the second is off by nearly 4×the
first. This is **independent per-boundary anchor error**, not one cadence
rule — consistent with, and now sharpened beyond, §10b's own finding for
the (separate, later) Sitrus-heal anchor.

## 16. Root cause 3 — GROVYLE's own HP overlay is a step function frozen at the wrong value, not a live drain (`resolve-off-a`/`-b`, the dominant unexplained mechanism)

§11 flagged `resolve-off-a`'s 189/196 mismatch as untraced, guessing at "a
GROVYLE-healthbox/faint-sink-timing code path." That code path exists and
is live (`drawTurn5RockSlideAttack`, `battleScene.ts:10870-10876`, called
unconditionally every tick via `drawTurn6FieldBase` →
`drawTurn5RockSlideWindow`'s own top-of-function call, `battleScene.ts:14831`
— contrary to a plausible-but-wrong hypothesis this session initially formed
and then disproved by reading `drawTurn6FieldBase`'s own body in full):

```
const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick);
const opponentHp = rockSlideOpponentHp(t, pressTick, TURN4_ROCKSLIDE_HP.to, TURN5_ROCKSLIDE_OPPONENT_TO_HP);
if (t < GROVYLE_HEALTHBOX_VANISH_TICK) {
  const opponentContent = opponentHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  ...
}
```

New script `tools/probe/analyze-turn5-resolve-grovyle-hp-formula.ts`
re-evaluates `rockSlideOpponentHp`/`faintSinkRowsAndY2` with their real
exported inputs. Result: `TURN4_ROCKSLIDE_HP.to = 1` (GROVYLE's HP carried
over from turn 4) is used as `rockSlideOpponentHp`'s `startHp`, and the
formula returns exactly **`1` for every tick from 6184 through 6501** —
**it never drains at all** — then hard-steps to `0` at `t=6502`
(`GROVYLE_FAINT_SINK_START_TICK`), with the healthbox itself drawn until
`GROVYLE_HEALTHBOX_VANISH_TICK=6521`, after which it stops being drawn
entirely:

| tick | app `opponentHp` | app sink `keptRows` |
|---|---|---|
| 6184-6417 (covers all of `resolve-off-a`'s window) | **1 (frozen)** | 8 (full sprite, no sink) |
| 6502 | 0 (step) | 8 |
| 6521-6523 | 0 | 0 (sprite fully sunk, healthbox stops drawing) |

Against §14's real ground truth (GROVYLE hp reaches **0 at tick 6285**,
**217 ticks before** the app's own step at 6502; the fainted-flash/healthbox
removal begins around the real **6378** fainted-text transition, **143-236
ticks before** `GROVYLE_HEALTHBOX_VANISH_TICK=6521`/`GROVYLE_FAINT_SINK_START_TICK=6502`):
this is a **third, independent anchor error**, clustered with (but distinct
from) the fainted-text-start error (§15's row 2, +145). `GROVYLE_FAINT_SINK_START_TICK`
(6502), `GROVYLE_HEALTHBOX_VANISH_TICK` (6521), and `turn5FaintedTextStartTick`
(6523) sit within 21 ticks of each other — internally self-consistent as a
single "GROVYLE-faints" event family — but that whole family is anchored
**~140-240 ticks later** than the real oracle's own GROVYLE-faints event.
This fully explains `resolve-off-a`'s 189/196 (GROVYLE's healthbox shows a
static full/near-full HP bar the entire window while the real oracle's bar
is already empty from tick 6285 on) and a large share of `resolve-off-b`'s
mismatched span before the app's own catch-up at ≈6523/6542 (§3d).

## 17. Consolidated fix spec (per the brief's item 3 — evidence supports it for the boundaries traced this session and last)

**Ordered edit list** (not applied — analysis only, `git diff -- src/` empty
throughout this session):

1. **`rockSlideTextStartTick`'s anchor** (currently
   `TURN5_ROCKSLIDE_PRESS_TICK`-derived, resolves to 6222) needs to resolve
   to **6184** for this trace family (−38 ticks). Re-derive from
   `TURN5_ROCKSLIDE_PRESS_TICK`'s own relationship to real tick 6184, not a
   flat re-literal (other traces/turns may share this function; check for
   regressions per §13 item 3's own caveat before changing the shared
   helper vs. adding a trace-family-specific override).
2. **The GROVYLE-faints cluster** — `TURN4_ROCKSLIDE_HP.to` (currently `1`,
   used as `rockSlideOpponentHp`'s frozen `startHp`), `GROVYLE_FAINT_SINK_START_TICK`
   (6502), `GROVYLE_HEALTHBOX_VANISH_TICK` (6521, itself
   `GROVYLE_FAINT_SINK_START_TICK + GROVYLE_FAINT_SINK.healthboxVanishFrame`),
   and `turn5FaintedTextStartTick(pressTick)` (6523) all need shifting
   toward the real **6285 (hp-zero)** / **6378 (fainted-text/flash-start)**
   cluster — a ~140-240-tick correction depending which sub-anchor. Whether
   `rockSlideOpponentHp` should gain a genuine live drain curve (matching
   ENDEAVOR's own `endeavorHp` live-formula shape) between 6184 and the
   real hp-zero tick 6285, or stays a step function moved earlier, is
   **not resolved this session** — needs the real drain SHAPE, not just its
   endpoint (a `rockSlideOpponentHp`-focused RAM sweep at ~6184-6290, not
   run this session, time).
3. **§10b's Sitrus-heal cluster** (unchanged from the prior session):
   `TURN5_SITRUS_HEAL_TEXT_START_TICK=7078` needs the dense
   `6900-6996` sweep §13 item 2 already specifies.
4. **`SWITCHIN_SENTOUT_TEXT_START_TICK=6687`**: confirmed accurate (real
   6686, §15) — **do NOT touch**, it is correct as-is.
5. **§10a's HP-overlay gate** (`confirm-off-a`/`-b`, unchanged from the
   prior session): extend as previously specified.

**Per-trace predicted counts after the above (evidence-based, not
guaranteed without live rerun)**: `confirm-off-a`/`-b` per §10a/§13 item 1
(unchanged); `resolve-off-a` (196 total) — item 1+2 together are predicted
to explain the large majority of the 189 currently-mismatched frames (exact
count depends on the still-unresolved drain-shape question in item 2);
`resolve-off-b` (196) similarly, with its own already-matching 71/196 tail
unaffected (item 2's fix should only widen the matching region earlier, not
disturb the existing convergence); `resolve-off-c` (196) — items 1-5 do
**not** touch its already-diagnosed secondary mechanism (§3e/§7's status-box
+ background-dither lag on the trailing 47 frames), which stays
unexplained; `resolve-off-d` (196) per §10b/§13 item 2 (unchanged).

**Do NOT touch**: the already-landed bounce corrections
(`docs/turn5-bounce-recalibration-probe.md`'s own window fixes); any
boundary this session or the last confirmed accurate
(`SWITCHIN_SENTOUT_TEXT_START_TICK`, `turn5Active`'s own dispatch
reachability — never broken, §9/§12); §8d rounding; the PP-digit fix (out
of scope, orthogonal per §5).

**Rerunnable PASS/FAIL**: after any edit above, rerun
`tools/probe/analyze-turn5-resolve-dispatch-app-series.ts` and
`tools/probe/analyze-turn5-resolve-grovyle-hp-formula.ts` to confirm the
corrected constants compute as intended, THEN `npm run compare --
turn5-resolve-off-a --summary` / `-b` / `-c` (PASS = counts strictly
improve toward 196/196, with `-c`'s trailing 47 expected to remain
unresolved per the note above) — no live rerun of any fix performed this
session (analysis only, per the brief).

## 18. Verdict (this session)

Both required goals are resolved to concrete numbers. **Goal 2 (6193-vs-6222
tension)**: neither figure was right — the real oracle transition to
`"ONIX used\nROCK SLIDE!"` is **tick 6184**, RAM-confirmed exactly (§14);
the prior session's `6193` pixel-read was itself a ~9-tick-late upper bound,
and the app's `rockSlideTextStartTick=6222` is late by 38 ticks. **Goal 1
(growing vs. independent)**: **independent, clustered per-anchor errors,
not one cumulative cadence rule** — three boundaries measured this session
show deltas of +38, +145, and +1 ticks respectively (§15), and a THIRD,
previously-unattributed root cause was found and fully diagnosed (§16):
GROVYLE's own HP overlay is a step function frozen at `1` for the entire
`resolve-off-a` window, snapping to `0` only at `t=6502` — 217 ticks after
the real oracle's own hp-zero tick 6285. This single mechanism, clustered
with the already-known fainted-text-start error, is sufficient to explain
`resolve-off-a`'s previously-unattributed 189/196 and a large share of
`resolve-off-b`'s. `resolve-off-c`'s trailing 47-frame secondary mechanism
(§3e/§7) remains untraced — out of this session's time budget. §17 gives
the ordered fix list; no `src/` edit was made (`git diff -- src/` empty).

## 19. §17 item 5 landed (2026-08-18, bounded MAIN worker) — per-caller audit, fix, and measured result

**Per-caller audit of `drawActionMenuIdleContentFromLatest`** (12 real call
sites at the commit this session started from, `battleScene.ts` lines
8240/8338/8533/8830/9559/9678/9776/9954/10102/10200/10444/15053 — the
brief's own 13th cite, 8656, is a doc-comment reference, not a call).
Column "override?" is the 4th positional arg (`playerHpOverride`); "gate
today" is whether `turn2FightCommandPresentationFromLatest(latest) !== null
|| turn3FightCommandPresentationFromLatest(latest) !== null` is satisfied
in that caller's own reachable window, established by tracing what `latest`
narrows to at each call site (not guessed):

| line | caller / window | override? | gate today | effect of adding a turn4 arm |
|---|---|---|---|---|
| 8240 | `drawActionMenuIdleWindow`, `reopenedFromClose` branch (turns 2-5's own FIGHT-submenu reopen-after-close) | no | true when `latest` is turn2/3-shaped; false once turn4 evicts it | **no-op** — the same function already redraws this exact value manually right after (`reopenOverlayPlayerHp`, line ~8252), same `resolvedPlayerHp` value, same `healthboxY2` (both use `t - FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`, offset 0) — double-paints an identical pixel |
| 8338 | `drawActionMenuIdleWindow`, main branch (turns 2-5's own reopened-idle content) | no (explicit `undefined`) | same split as above | **no-op**, same reasoning — the "Slice 9" manual overlay (`overlayPlayerHp`, line ~8343) already covers the turn4-evicts-turn2/3 case with the identical value/Y2/`bounceIndexOffset` |
| 8533 | `drawFightSubmenuWindow`, close-reveal branch (`sm.closeElapsed`) | no | false whenever `latest` is turn4-shaped (no turn2/3 match) | **only call site where this is a genuine new paint, not a duplicate** — no manual follow-up exists here (immediate `return`). Newly paints `latest.content.field.player.hp.current` — the mathematically correct value for that receipt — wherever it was previously skipped. Empirically: `turn5-action-off` 32/32 and `turn6-reopen-off` 22/46 are both byte-identical before/after (measured below), so either this branch isn't reached with a turn4-shaped `latest` inside those traces' own capture windows, or it was already pixel-silent (the frozen base harvest already agreed with the now-painted value) |
| 8830 | `drawTurnKickoffText` | no | `latest` is literal `null` → all three arms false regardless | none |
| 9559 | `drawDragonBreathTurnEndSettledMenu` (turn 2's own settled menu) | no | true — `latest` is turn2-shaped by construction (called only after turn2Content resolves) | none — turn2 arm already covers it |
| 9678 | `drawTurn2KickoffText`, pre-DRAGON_BREATH branch | no | `latest` is turn2-shaped or earlier (pre-turn-2-completion); turn2 arm already the deciding one where it fires | none |
| 9776 | `drawTurn3EndeavorText` (turn 3's own ENDEAVOR-hold — the exact turn-earlier analogue of turn 5's bug) | **yes** (`onixHp`) | **true** — reached only pre-turn-3-reset, when `latest` is still turn2-shaped (guarded by an explicit `turn2Content === null` throw above) | none — already painting live `onixHp` today via the turn2 arm; this is the working precedent the turn5 fix generalizes one turn further |
| 9954 | `drawTurn3RockSlideTurnEndSettledMenu` (turn 3's own settled menu) | **yes** (`playerHp`) | true — `latest` is turn3-shaped (guarded by `turn3Content === null` throw) | none — turn3 arm already fires; the caller's own explicit follow-up redraw (line 9956, identical value/Y2) was already redundant before this fix too |
| 10102 | `drawTurn4KickoffText`, pre-reset branch | **yes** (`turn3Content.field.player.hp.current`) | true — reached only pre-turn-4-reset, `latest` still turn3-shaped (guarded by `turn3Content === null` throw) | none |
| 10200 | `drawTurn4RockSlideTurnEndSettledMenu` (turn 4's own settled menu) | **yes** (`playerHp`) | **false today** — `latest` is turn4-shaped (guarded by `turn4Content === null` throw), matches neither turn2 nor turn3 | **was already pixel-correct despite the false gate** — the caller's own explicit follow-up (line 10202, `drawPlayerHealthboxHpOverlay(fb, playerHp, menuIdleBounce(bounceTick).healthboxY2)`) unconditionally paints the identical value at the identical Y2 right after returning. Adding the turn4 arm makes the internal draw ALSO fire, painting the same value a second time — a no-op, not a regression. This is the caller the brief flagged to check "whether painting their override is pixel-correct there" — confirmed yes, byte-for-byte, because the caller already draws that same override unconditionally today |
| 10444 | `drawTurn5EndeavorText`, no-squish else-branch — **the bug itself** | **yes** (`onixHp`, live-draining) | **false throughout** — `latest` is turn4-shaped (turn 5 hasn't completed its own command yet) the entire ENDEAVOR-hold span, matches neither arm | **this is the fix** — the turn4 arm now fires, `drawPlayerHealthboxHpOverlay(fb, onixHp, healthboxY2)` runs, and the live-draining `onixHp` §10a already proved was computed correctly finally reaches the framebuffer |
| 15053 | `drawTurnEndSettledMenu` (turn 1's own settled menu) | no | `latest` is literal `null` → all three arms false | none — turn 1's own player HP never changes this turn by design (doc comment on this function) |

**Fix shape chosen: (a), not (b).** §10a offered two candidates: (a) add a
turn4-shape narrowing to the OR-gate, mirroring the existing turn2/turn3
arms one turn further; (b) loosen the gate to paint whenever an explicit
`playerHpOverride` is supplied. The audit above shows (b) would have been
**observably wider than necessary and harder to reason about**: three
callers (9776, 9954, 10102) pass an override *and* already satisfy the
existing turn2/turn3 arms — fine either way — but 8240/8338 pass **no**
override at all and rely on the internal `latest?.content?.field.player.hp
.current` fallback, so shape (b) would leave their turn4-evicts-turn2/3
case exactly as broken as today (still gated out, since there's no
override to trigger a loosened override-gate) while doing nothing shape (a)
doesn't already do more precisely. Shape (a) is also the direct
generalization of an already-working, already-proven pattern: turn 3's own
`drawTurn3EndeavorText` (line 9776) paints its live `onixHp` correctly
*today* specifically because `latest` is turn2-shaped during turn 3's own
ENDEAVOR-hold and the turn2 arm already covers it — turn 5's window is
structurally identical, just one `latest`-epoch further along (turn4-shaped
instead of turn2-shaped), so adding the turn4 arm is the same rule applied
one more turn, not a new mechanism. Rejected alternative (b) was not
attempted in code.

**Callers 9954/10200 pre-check (per the brief's explicit ask):** both
already draw their own `playerHpOverride` unconditionally via a manual
`drawPlayerHealthboxHpOverlay` call immediately after the
`drawActionMenuIdleContentFromLatest` call (lines 9956/10202), at the same
HP value and the same bounce-derived `healthboxY2`. Painting that override
inside the gate too is therefore pixel-correct (idempotent) for both,
confirmed by the unchanged 256/256 exact match on `turn4-doubleteam-off`/
`turn4-rockslide-off` and unchanged 32/32 on `turn5-action-off` below.

**Fix applied**: `battleScene.ts`, `drawActionMenuIdleContentFromLatest`'s
gate — added `|| turn4FightCommandPresentationFromLatest(latest) !== null`
as a third OR arm. Tier-1 pin: `tests/battleSceneFightCommandPresentation
Turn1Through4.test.ts`'s "slice 3" describe block, which previously pinned
"turn 4: does NOT fire" for the generic-ABI shim (the exact expression this
fix edits) — that assertion is now split into two: the retired
positional-ABI body's own historical `false` stays pinned unchanged (it's
dead code, not what runs today), and a new case pins the current shim
returning `true` for a turn4-shaped `latest`, citing this section.

**Measured result** (oracle re-run this session, `npm run compare --
<trace> --summary`):

| trace | before (brief's cite) | after | verdict |
|---|---|---|---|
| `turn5-confirm-off-a` | 15/132 | **60/132** | improved — the ENDEAVOR-hold frames now paint live `onixHp` instead of stale pixels |
| `turn5-confirm-off-b` | 0/132, residual 689px/1.79% bbox=16,124-75,149 | 0/132, residual unchanged: 689px/1.79% bbox=16,124-75,149 (ticks 6204-6221) | unchanged, attributed: this window's own `rockSlideTextStartTick` resolves to 6184 (`TURN5_ROCKSLIDE_PRESS_TICK=5829` + `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355`, item 1), so every tick ≥6184 — including the entire 6204-6221 residual span — dispatches through `drawTurn5RockSlideWindow`'s attack/text phase (`drawTurn6FieldBase`'s own unconditional HP paint), a code path `drawActionMenuIdleContentFromLatest` is never called from at all. This is the "second residual mechanism" the acceptance criteria anticipated — confirmed a different function, out of this item's reach by construction. Frames 6090-6183 (still inside the ENDEAVOR-hold, before 6184) individually shrank versus their own pre-fix magnitude at the same ticks (spot-checked: several dropped to 30-100px), just not enough to cross into exact-match for any single frame in this particular trace |
| `turn5-resolve-off-d` | 0/196, residual 258px/0.67% bbox=44,71-195,104 | 0/196, residual unchanged: 258px/0.67% bbox=44,71-195,104 | unchanged (no decrease) — this residual sits in the settled post-menu-redraw span (past tick 6991), which ISSUES.md #97-C already flagged as "likely the ONIX sprite/HP-overlay during the settled Sitrus chrome... needs its own instrument" — not `drawActionMenuIdleContentFromLatest`'s own gate (confirmed by this session's dispatch trace: ticks in this span are inside `drawTurn5RockSlideWindow`'s own settled-menu tail, past the `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK` branch, not the ENDEAVOR-hold fallback this fix touches) |
| `turn5-reset-off` | 256/256 | 256/256 | unchanged (control) |
| `turn5-action-off` | 32/32 | 32/32 | unchanged, exact (must-stay-exact criterion met) |
| `turn6-reopen-off` | 22/46 | 22/46 | unchanged |
| `turn6-menu` | 34/44 | 34/44 | unchanged |
| `turn5-resolve-off-a` | 25/196 | 25/196 | unchanged |
| `turn5-resolve-off-b` | 88/196 | 88/196 | unchanged |
| `turn5-resolve-off-c` | 149/196 | 149/196 | unchanged |
| `turn4-doubleteam-off` | 256/256 | 256/256 | unchanged, exact |
| `turn4-rockslide-off` | 256/256 | 256/256 | unchanged, exact |

Zero decreases anywhere in the guard family. `turn5-confirm-off-a` strictly
improved (15→60/132); `turn5-confirm-off-b` and `turn5-resolve-off-d` held
their match count at 0 with their cited residual magnitude unchanged and
attributed to code paths this fix cannot reach (different functions
entirely, not a gate this section's edit touches) — both satisfy the
acceptance criteria's OR clause. `npm test` and `npm run build` green (see
`PROGRESS.md` for the exact counts this session).

**Remaining, still open** (unchanged by this fix, not attempted):
`turn5-confirm-off-b`'s own 689px residual (a `drawTurn5RockSlideWindow`
attack/text-phase mechanism, not this gate); `turn5-resolve-off-d`'s own
258px residual (a settled-Sitrus-chrome ONIX overlay, not this gate);
`resolve-off-c`'s trailing 47-frame secondary mechanism (§3e/§7, untouched
by construction); `turn6KickoffBounceTick`/the 7318+ dispatch (a parallel
side-lane continuation, untouched).
