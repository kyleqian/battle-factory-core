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
