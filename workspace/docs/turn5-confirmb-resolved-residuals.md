# ISSUES #97 remainder: `turn5-confirm-off-b` and `turn5-resolve-off-d`'s untraced residuals

Side-lane instrument session, Battle Scene OFF oracle, at commit `b48e3e90`
(the same commit ISSUES.md's §17 item-5 addendum and `docs/turn5-family-
class3-diagnosis.md` §19 landed on). Analysis only — `git diff -- src/` is
empty throughout; the two new probe scripts under `tools/probe/` and this
doc are the whole deliverable, per the brief's side-lane contract.

**Scope**: the two residuals ISSUES.md #97-C's dated addendum banked as
"not reachable through the [§19] gate" —

- (A) `turn5-confirm-off-b` (window 6090-6221): 0/132, residual
  689px/1.79% bbox=16,124-75,149, attributed to `drawTurn5RockSlideWindow`'s
  attack/text phase.
- (B) `turn5-resolve-off-d` (window 6810-7005): 0/196, residual
  258px/0.67% bbox=44,71-195,104, attributed to "possibly `turn5SitrusOnixHp`,
  a separate anchor from the landed dispatch-gate ticks."

**Method**: per the brief — read the actual diff PNGs (`npm run compare --
<trace> --capture-range A:B --summary`, run fresh in this worktree's own
`workspace/`) before touching any RAM probe, identify what content differs
on each side, then re-evaluate the app's own real exported render formulas
(via new `tools/probe/analyze-*.ts` scripts, the same style as the sibling
instrument `analyze-turn5-resolve-grovyle-hp-formula.ts`) against pixel-read
anchors and the brief's own given RAM facts (6850/6885/6984/6991 — **not**
re-derived here, per the constraint). No live RAM probe was run this
session; every anchor below is either a given fact or a pixel read off a
freshly generated compare-tool PNG (paths cited so they're reproducible by
rerunning the cited `--capture-range` command).

## 1. Residual (A): `turn5-confirm-off-b`, ticks 6184-6221 — PINNED, fix-ready

### 1.1 Residual shape across the window

The 132-tick window (6090-6221) splits cleanly at **6184**, exactly where
ISSUES #97-C item 1's `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355` override moves
the dispatch gate (`drawTurn5EndeavorText`'s own `rockSlideTextStartTick`
check, `battleScene.ts:10447`) from the shared 6222 to 6184:

| span | bbox shape | magnitude | mechanism |
|---|---|---|---|
| 6090-6183 (ENDEAVOR-hold, pre-6184) | `174,91-200,103` (small, top-right) | 30-114px, 0.08-0.30% | the already-flagged §19 residual ("shrank... not enough to cross into exact-match"), **not this instrument's scope** |
| 6184-6221 (ROCK_SLIDE attack/text, post-6184) | `16,124-75,149` (bottom-left, growing then flat) | 44px growing to 689px, plateau from 6204 | **this residual** |

The bbox genuinely changes shape at 6184 (confirmed by direct PNG read,
`out/run-2026-08-18-18-05-49Z-24951`) — two independent, non-overlapping
mechanisms, not one growing drift. Only the post-6184 span is analyzed
further here, per the brief's own framing of residual (A).

### 1.2 What the pixels show

`app-06184.png`/`app-06210.png` (same run dir): the app's message box is
**completely blank** — no text at all — for the entire 6184-6221 span.
`oracle-06184.png` still shows the OLD held "Foe GROVYLE used\nENDEAVOR!"
text (a separate, one-tick transition artifact — see §1.4); from
`oracle-06185.png` on, the oracle is **actively typing** "ONIX used\nROCK
SLIDE!" one character at a time, reaching the full 20-character string by
`oracle-06204.png` and holding it flat through `oracle-06221.png`. Both
GROVYLE's own healthbox (full green) and ONIX's own HP number (`1/117`,
red) already agree between app and oracle throughout this span — this
residual is **only** the message text, confirmed by the diff bbox never
extending past x=75 or above y=124 for any frame 6184-6221.

### 1.3 Named mechanism

`drawTurn5RockSlideWindow` (`battleScene.ts:14873-14916`) is entered once
`t >= rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK,
TURN5_OFF_ROCKSLIDE_TEXT_DELAY)` = 6184 (item 1's fix). Once inside, its own
attack/text branch (`battleScene.ts:14886-14889`) calls:

```ts
drawMessageTextLines(fb, TURN1_ROCKSLIDE_ATTACK_LINE1, TURN1_ROCKSLIDE_ATTACK_LINE2, rockSlideTextVisibleChars(t, pressTick));
```

**`rockSlideTextVisibleChars(t, pressTick)` is called with no `delay`
argument** — it silently falls back to the shared `ROCK_SLIDE_TEXT_DELAY =
393` default (`battleMenu.ts:1685,1692`), not the `TURN5_OFF_ROCKSLIDE_
TEXT_DELAY = 355` override item 1 already threaded into the dispatch gate
one call up. So the text-reveal's own internal start tick is still
`5829+393=6222` — the SAME stale value the dispatch gate used to resolve to
before item 1's fix — while the gate itself now opens 38 ticks earlier
(6184). For all of 6184-6221 (this trace's own tail), `t < 6222`, so
`rockSlideTextVisibleChars` returns **0** every tick: the app draws a blank
message box while the oracle is mid-reveal or fully done.

Item 1's own fix threaded the corrected delay into the **gate** one call up
(`drawTurn5EndeavorText`, line 10447) but not into this **reveal formula**
one call down inside `drawTurn5RockSlideWindow` itself — the two are
separate call sites of two different functions (`rockSlideTextStartTick` vs
`rockSlideTextVisibleChars`) that happen to share the same underlying
`ROCK_SLIDE_TEXT_DELAY` default, and only one was updated.

A second, smaller correction is also needed: the codebase's own established
`t-1` display-basis convention (`drawTurn6FieldBase`'s own doc comment,
`battleScene.ts:14829-14835` — "the oracle's displayed frame T shows the
model's RAM state as of T-1") applies here too. `tools/probe/analyze-
turn5-confirmb-rockslide-text-delay.ts` cross-checks the proposed formula
`rockSlideTextVisibleChars(t - 1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY)`
against 6 independent oracle-read char counts (hand-counted off the PNGs
cited in the script's own header) — **every one matches exactly**:

```
6185: proposed=1  oracle=1   ('O')
6190: proposed=6  oracle=6   ('ONIX u')
6195: proposed=11 oracle=11  ('ONIX used' + 'RO')
6200: proposed=16 oracle=16  ('ONIX used' + 'ROCK SL')
6203: proposed=19 oracle=19  ('ONIX used' + 'ROCK SLIDE')
6204: proposed=20 oracle=20  (full text, plateau starts)
```

Run: `node --experimental-strip-types tools/probe/analyze-turn5-confirmb-rockslide-text-delay.ts`
— prints `PASS`.

### 1.4 App-side fix shape

`battleScene.ts:14888`, one-line change:

```diff
-    drawMessageTextLines(fb, TURN1_ROCKSLIDE_ATTACK_LINE1, TURN1_ROCKSLIDE_ATTACK_LINE2, rockSlideTextVisibleChars(t, pressTick));
+    drawMessageTextLines(fb, TURN1_ROCKSLIDE_ATTACK_LINE1, TURN1_ROCKSLIDE_ATTACK_LINE2, rockSlideTextVisibleChars(t - 1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY));
```

`TURN5_OFF_ROCKSLIDE_TEXT_DELAY` is already imported into `battleScene.ts`
(it's what item 1 used at line 10447) — no new constant needed. This call
site (`battleScene.ts:14888`) is the **only** `rockSlideTextVisibleChars`
call inside `drawTurn5RockSlideWindow`; grep confirms every other call site
(turns 1/3/4/6/7/9/10/11/12, `battleScene.ts:10006,10269,11853,12100,13016,
13436,13690,13920,15009`) is a structurally separate turn-specific branch,
several already passing their own scoped delay (`TURN1/3/4_OFF_ROCKSLIDE_
TEXT_DELAY`) — this edit cannot reach any of them.

### 1.5 Predicted counts

Frame 6184 stays mismatched — a genuine one-tick transition artifact (the
oracle's own pixel still shows the OLD held text at the exact RAM tick the
new message starts, the same "PNG(T) shows RAM(T-1)" edge already
established elsewhere in this family; the fix can't make the app show
"stale old text" on purpose). Frames 6185-6221 (37 frames) are predicted to
become **exact pixel matches** — the probe script shows the char-count
formula is exact at 6 independently-sampled ticks spanning the whole reveal
(partial reveal through full-and-flat), and no other pixel difference
exists anywhere in this bbox region per §1.2.

**`turn5-confirm-off-b`: 0/132 → predicted ~37/132** (frames 6090-6183
unaffected, still gated by the separate small residual noted in §1.1's
table — out of this residual's scope).

**Cross-trace bonus (not this residual's own trace, noted for the fix
worker's own regression pass)**: `turn5-resolve-off-a`'s window
(6222-6417) shares this exact call site for its own opening 19 ticks
(6222-6240 sit inside the same `t < faintedStart(6378)` branch) — its
current 25/196 count already includes a partial catch-up in that span
(confirmed this session: `npm run compare -- turn5-resolve-off-a
--capture-range 6222:6250 --summary` shows the SAME `16,124-75,149`-family
bbox shrinking from 645px at 6222 to 0 (match) by ~6241, because the
CURRENT buggy 6222 reveal-start coincidentally lines up with this window's
own start tick). The proposed fix changes the reveal's start point from
6222 to 6185 (already-mostly-typed by 6222) — this can only let MORE of
6222-6240 match sooner, never fewer; a live rerun after landing is the only
way to get the exact new count, but a decrease is structurally not possible
for this specific span.

### 1.6 Regression guards

- Grep-confirmed single call site (`battleScene.ts:14888`, inside
  `drawTurn5RockSlideWindow`, itself only called from `drawTurn5EndeavorText`
  once `t>=6184`, itself only reachable from turn 5's own render path) — no
  other turn's ROCK_SLIDE window shares this line.
- `TURN5_OFF_ROCKSLIDE_TEXT_DELAY` is already a proven, scoped, turn5-off-
  only constant (item 1's own fix) — reusing it here doesn't touch turns
  1/3/4/6/7/9-12's own independently-scoped delays.
- Traces with windows entirely before 6184 (`turn5-confirm-off-a`,
  5958-6089) or entirely after `faintedStart`(6378) (`turn5-resolve-off-b/
  -c/-d`) cannot reach this call site at all — zero interaction.
- `turn5-action-off`/`turn6-reopen-off`/`turn5-reset-off`/`turn4-doubleteam-
  off`/`turn4-rockslide-off` — none dispatch through `drawTurn5RockSlideWindow`'s
  attack/text branch in their own capture windows (confirmed by the existing
  family table in ISSUES.md #97-C/§19, all unaffected by every prior fix in
  this same function).

### 1.7 Rerunnable PASS/FAIL

```sh
cd workspace   # THIS worktree's own workspace/ — verify with `npm prefix` first
node --experimental-strip-types tools/probe/analyze-turn5-confirmb-rockslide-text-delay.ts   # expect PASS
npm run compare -- turn5-confirm-off-b --summary   # PASS = strictly > 0/132, expected ~37/132
npm run compare -- turn5-resolve-off-a --summary   # PASS = >= 25/196, expected some increase in 6222-6240
npm run compare -- turn5-resolve-off-b --summary   # regression guard, expect unchanged 88/196
npm run compare -- turn5-resolve-off-c --summary   # regression guard, expect unchanged 149/196
npm run compare -- turn5-action-off --summary      # regression guard, expect unchanged 32/32
npm run compare -- turn6-reopen-off --summary       # regression guard, expect unchanged
npm run compare -- turn5-reset-off --summary        # regression guard (control), expect unchanged 256/256
npm run compare -- turn4-doubleteam-off --summary   # regression guard, expect unchanged 256/256
npm run compare -- turn4-rockslide-off --summary    # regression guard, expect unchanged 256/256
```

## 2. Residual (B): `turn5-resolve-off-d`, ticks 6851-7005 — tail PINNED, mid-window partially pinned

### 2.1 Residual shape across the window — bigger than the cited number

The brief's cited "258px/0.67% bbox=44,71-195,104" is the window's own
**final-frame** figure. A dense re-run this session
(`npm run compare -- turn5-resolve-off-d --summary`, no capture-range
override — the trace's own 196 `captureFrames` already cover every tick
6810-7005 densely) shows the window is **not** uniform at that magnitude —
it has three distinct spans:

| span | bbox | magnitude | status |
|---|---|---|---|
| 6810-6849 (pre-Sitrus, switch-in/fainted continuation) | `13,16-198,73` then `0,16-112,43` | 1200-3900px, 3-10% | `resolve-off-c`'s own already-flagged trailing-47-frame secondary mechanism (§3e/§7) carrying over — **not this residual, not re-examined here** |
| **6851-6988** (Sitrus-heal-text phase) | `16,49-120,149` / `16,68-200,149` (wide, tall) | **1100-2800px, 3-7%** — much bigger than the cited 258px | **this residual, §2.3-2.4 — two overlapping mechanisms, one PINNED one flagged** |
| **6989-7005** (post-6991 settled-menu tail, minus the 6991-6994 transition spike) | `42-44,70-71 - 195,104-106` | **226-272px, 0.59-0.71%** — matches the brief's own cited number | **this residual, §2.2 — PINNED** |
| 6991-6994 (MENU_REDRAW transition itself) | `9,71-238,158` | 6223-6248px, 16.2-16.3% | separate single-span transition artifact, not diagnosed this session (§2.5) |

So the brief's own citation (258px) names only the **tail**; the **mid-window**
span is a materially larger, related-but-distinct problem in the same
trace. Both are reported below since they share one root cause.

### 2.2 Tail mechanism (6989-7005) — PINNED, matches the brief's own hypothesis

`app-07005.png` vs `oracle-07005.png` (`out/run-2026-08-18-18-14-57Z-26197`):
identical everywhere **except** ONIX's own healthbox — app shows `1/117`
(red bar), oracle shows `31/117` (already healed). The diff overlay
(`diff-07005.png`) highlights exactly the ONIX sprite/healthbox column, no
menu chrome or text difference anywhere.

**Named mechanism**: `turn5SitrusOnixHp(t)` (`battleScene.ts:10788-10794`),
the DEFAULT `onixHp` param `drawTurn6FieldBase` uses when
`drawTurn5RockSlideWindow` calls it with `undefined` (`battleScene.ts:14884`),
computes `sitrusDisplayedHpAtAge(t - ONIX_SITRUS_IDENTITY_RENDER_TICK, 1,
31)`. `ONIX_SITRUS_IDENTITY_RENDER_TICK = ONIX_SITRUS_PROC_TRIGGER_RAM_TICK
(6872, turn5ResolutionAdapter.ts:181) + 2 = 6874`. `sitrusDisplayedHpAtAge`
(`heldItemHeal.ts:134-144`) only starts climbing once `age >=
SITRUS_ITEM_HP_CLIMB_FIRST_AGE(306)`, i.e. `t >= 6874+306 = 7180` —
**past this entire trace's window** (ends 7005). So `turn5SitrusOnixHp`
returns the flat pre-heal value (1) for every tick in this trace, never
reaching 31 — exactly the frozen-vs-jumped HP the pixels show.

**This is the SAME class of bug as residual A**: ISSUES #97-C item 3 fixed
the *dispatch gate* (`TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK=6850` etc.,
scoped precisely to avoid touching the shared `TURN5_SITRUS_HEAL_TEXT_
START_TICK` triple used by turns 9-14) but did **not** touch this
*separate*, older epoch (`ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`/
`ONIX_SITRUS_IDENTITY_RENDER_TICK`), which still drives the detail-level
render formulas (`turn5SitrusOnixHp`, `turn5SitrusHealTextVisibleChars`,
`onixSitrusRotateMatrix`, the granting-star placements) inside the
newly-corrected branch. The stale epoch (6874) plus its own baked-in
ON-profile age offsets (`SITRUS_ITEM_HP_CLIMB_FIRST_AGE=306`,
`SITRUS_ITEM_HEAL_TEXT_FIRST_AGE=204`) reconstruct almost exactly the
**original, already-diagnosed-and-superseded** anchor
`TURN5_SITRUS_HEAL_TEXT_START_TICK=7078` (§10b of the diagnosis doc:
`6874+204=7078`) — confirming this is the SAME root cause §10b named, just
not fully swept from every downstream consumer when item 3 landed its own
narrower dispatch-gate fix.

**Given ground truth** (not re-derived, per the brief's own CONTEXT): ONIX
hp jumps 1→31 at RAM-exact tick **6984**. Treated as a hard step (matching
the established Scene-OFF precedent that HP changes render as single-tick
steps, not live ramps — `docs/turn5-family-class3-diagnosis.md` §14 Sweep A
for GROVYLE's own drain) — `tools/probe/analyze-turn5-resolved-sitrus-
onixhp-epoch.ts`'s proposed `t < 6984 ? 1 : 31` step matches all 3
oracle-read HP anchors exactly (1900, 6988, 7005 — `PASS (tail mechanism)`).
**Caveat**: the step-vs-short-ramp SHAPE for ONIX's own HP specifically
was not independently re-probed with a live RAM/dense-pixel sweep this
session (only 6988/7005, both already-settled post-jump ticks, were
sampled) — a fix worker should spot-check `--capture-range 6980:6990` (or a
`gBattleMons[0].hp` RAM read) before landing, per the script's own header
comment.

**Fix shape**: `drawTurn5RockSlideWindow`'s own call to `drawTurn6FieldBase`
(`battleScene.ts:14884`) currently passes `undefined` for the `onixHp`
positional arg (5th param), relying on the default. Add a new turn5-off-
scoped step function (mirroring turns 9/10/12's own already-established
"generalize a hardcoded value into a defaulted param" idiom, cited in this
file's own doc comments at lines 14803-14808) and pass it explicitly:

```ts
// battleSceneCanonical.ts, new constant next to TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK:
export const TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK = 6984;

// battleScene.ts, new function next to turn5SitrusOnixHp:
export function turn5OffSitrusOnixHp(t: number): number {
  return t < TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK ? TURN5_SITRUS_HEAL_HP_START : TURN5_SITRUS_HEAL_HP_END;
}

// battleScene.ts:14884, drawTurn5RockSlideWindow's own call:
drawTurn6FieldBase(fb, t, latestCompletedCommandHandoff, undefined, turn5OffSitrusOnixHp(t), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 60);
```

Deliberately a **new** function/constant rather than editing
`ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`/`ONIX_SITRUS_IDENTITY_RENDER_TICK`
in place — that epoch also feeds the tint/rotation (`onixSitrusRotateMatrix`)
and granting-star placement machinery (§2.4), which this session did not
verify end-to-end; moving the shared epoch risks an unverified cascade,
the exact reasoning item 3 already gave for not editing `TURN5_SITRUS_
HEAL_TEXT_START_TICK` directly.

### 2.3 Mid-window mechanism, part 1 (heal text) — PINNED

`app-06900.png` vs `oracle-06900.png`: GROVYLE/PIDGEOTTO status boxes, the
PIDGEOTTO/on-field sprites, and ONIX's own `1/117` HP number all already
agree — the message box is the only difference: **app is blank**, oracle
shows the fully-typed `"ONIX's SITRUS BERRY\nrestored health!"`.

**Named mechanism**: `turn5SitrusHealTextVisibleChars(t)`
(`battleScene.ts:10782-10786`), called at `battleScene.ts:14911` with no
override, computes `sitrusHealTextVisibleCharsAtAge(t -
ONIX_SITRUS_IDENTITY_RENDER_TICK)` — the SAME stale 6874 epoch as §2.2.
`sitrusHealTextVisibleCharsAtAge`'s own `SITRUS_ITEM_HEAL_TEXT_FIRST_AGE=204`
means the reveal doesn't start until `t=6874+204=7078`, past this window —
so the app's heal text stays blank (0 visible chars) for the whole
6850-6990 span the branch is active.

Applying the SAME `t-1`/one-char-per-tick shape residual A already proved
(§1.3), anchored instead at the already-correct `TURN5_OFF_SITRUS_HEAL_
TEXT_START_TICK=6850`: `tools/probe/analyze-turn5-resolved-sitrus-onixhp-
epoch.ts` predicts **full reveal (35 chars) at exactly t=6885** — matching
the brief's own given fact ("settles (fully typed) 6885") **exactly**, with
zero fitting — strong independent confirmation this is the right anchor and
the right per-tick shape. (`44px diff at 6851` — one tick after the anchor
— is the same single-glyph signature residual A's own t=6185 showed.)

**Fix shape**: `battleScene.ts:14911`, change

```diff
-    drawMessageTextLines(fb, TURN5_SITRUS_HEAL_LINE1, TURN5_SITRUS_HEAL_LINE2, turn5SitrusHealTextVisibleChars(t));
+    drawMessageTextLines(fb, TURN5_SITRUS_HEAL_LINE1, TURN5_SITRUS_HEAL_LINE2, turn5SitrusOffHealTextVisibleChars(t));
```

with a new `turn5SitrusOffHealTextVisibleChars(t)` (`battleScene.ts`, next
to `turn5SitrusHealTextVisibleChars`) implementing
`Math.min(HEAL_TEXT_TOTAL, Math.max(0, (t - 1) - TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK + 1))`
(same shape as §1.4's fix, `HEAL_TEXT_TOTAL = TURN5_SITRUS_HEAL_LINE1.length
+ TURN5_SITRUS_HEAL_LINE2.length = 35`) — a new function rather than adding
an override param to the existing one, for the same load-bearing-epoch
reason given in §2.2 (this function's default epoch may still be correct
for whatever other, unverified caller `turn5SitrusHealTextVisibleChars`
might have — grep shows `battleScene.ts:14911` is currently its **only**
call site, so either approach is safe, but a new function keeps the change
minimal and obviously scoped).

### 2.4 Mid-window mechanism, part 2 (sprite/particle overlay) — NOT FULLY PINNED, flagged

Even after accounting for the blank-text bug (§2.3), the mid-window
magnitude (1100-2800px) is larger than the text region alone would produce
(residual A's own equivalent text-only defect topped out at 689px). The
diff overlay at 6900 (`diff-06900.png`) highlights the **ONIX sprite
itself** in solid color, not just the message box — and `app-06988.png`
shows a visible sparkle/particle cluster around ONIX that `oracle-06988.png`
does not show at the same tick. Candidate mechanism: `onixSitrusRotateMatrix`
(rotation+tint) and/or `drawGrantingStars`/`turn5GrantingStarPlacement`
(the star-sparkle effect) — both **also** keyed off the same stale
`ONIX_SITRUS_IDENTITY_RENDER_TICK` epoch (`battleScene.ts:10684-10690,
10733-10739,10755-10760`), so they plausibly fire on the same ~228-tick-late
schedule as the text and would very likely be corrected by the same class
of epoch fix — but this session did **not** isolate this sub-mechanism with
its own pixel cross-check the way §2.2/§2.3 were confirmed, and
`TURN5_SITRUS_STAR_SPAWNS`' own spawn ticks (6968/6978) are absolute RAM
literals (not epoch-relative), so they need their own separate check before
assuming the same fix covers them. **Flagged as the open remainder** — a
follow-up session should: (1) dense-capture `6870:6990` for `turn5-resolve-
off-d`, (2) isolate whether `onixSitrusRotateMatrix`'s own render window
disagrees with the oracle's own tint timing (a direct palette-buffer RAM
read, `gPlttBufferFaded`/`gPlttBufferUnfaded` bank `16+0`, is the proven
instrument per this same constant's own doc comment), and (3) only then
recompute this residual's full predicted count.

### 2.5 6991-6994 transition spike — not diagnosed

Frames 6991-6994 show a much larger, separate 6223-6248px/16% diff
(`bbox=9,71-238,158`) — the MENU_REDRAW hard-cut itself landing on a
different real tick than the app's own 6991, or a multi-tick transition
render lag similar to other single/few-tick transition artifacts already
accepted elsewhere in this family (e.g. residual A's own 6184 edge case,
§1.5). Not instrumented this session — flagged for the fix worker, not
blocking on it (its own 4-frame span is a small fraction of the 196-frame
window).

### 2.6 Predicted counts

Only §2.2 (tail) and §2.3 (mid-window text) are proven fix-ready; §2.4
(sprite/particle) is not. Applying both proven fixes:

- **Tail (6989-6990, 6995-7005 — 13 frames)**: predicted exact match, since
  §2.2's own pixel diff at these ticks shows the HP overlay as the *only*
  difference.
- **Mid-window text span (6851-6988)**: predicted to **shrink substantially
  but likely not reach exact-match** for most frames, since §2.4's
  unpinned sprite/particle component still contributes an unknown share of
  the current 1100-2800px. No specific new match count is claimed here —
  an honest partial, per the brief's own "half-pinned mechanism" guidance.
- **6991-6994 (4 frames)**: unaffected, still mismatched (§2.5).
- **6810-6849 (40 frames)**: unaffected — different, already-flagged
  mechanism (§2.1's table).

**`turn5-resolve-off-d`: 0/196 → predicted at least ~13/196** from the tail
fix alone (§2.2, independently landable and provably safe even without
§2.3/§2.4), with a materially larger but not-precisely-quantified
additional gain from §2.3 once §2.4's own remainder is separately
characterized or shown not to dominate.

### 2.7 Regression guards

- `turn5SitrusOnixHp`/`turn5SitrusHealTextVisibleChars` are `drawTurn6FieldBase`'s
  own DEFAULT values, reused (via explicit override, not the default) by
  turns 9/10/12's own callers — this fix only changes `drawTurn5RockSlideWindow`'s
  own call site (passing an explicit turn5-off value instead of relying on
  the default / calling a new sibling function), so turns 6/7/9/10/12/13's
  own explicit-override call sites are untouched by construction.
- `ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`/`ONIX_SITRUS_IDENTITY_RENDER_TICK`
  themselves are **not** edited by this fix shape (§2.2's own reasoning) —
  the build-time consistency guard at `battleScene.ts:10677-10683` (rotation/
  ring render-lag delta) stays untouched.
- `turn5-resolve-off-a/-b/-c` windows (6222-6809) end before 6850 — cannot
  reach either new function.
- `turn5-action-off`/`turn6-reopen-off`/`turn5-reset-off` — unaffected,
  confirmed by the existing family table (none render past tick ~6221 in
  their own capture windows).

### 2.8 Rerunnable PASS/FAIL

```sh
cd workspace   # THIS worktree's own workspace/ — verify with `npm prefix` first
node --experimental-strip-types tools/probe/analyze-turn5-resolved-sitrus-onixhp-epoch.ts   # expect PASS (tail mechanism)
npm run compare -- turn5-resolve-off-d --summary   # PASS = strictly > 0/196 (tail fix alone should clear ~13)
npm run compare -- turn5-resolve-off-d --capture-range 6980:6990 --summary   # spot-check the step-vs-ramp caveat (§2.2) before landing
npm run compare -- turn5-resolve-off-a --summary   # regression guard, expect unchanged 25/196 (window ends before 6850)
npm run compare -- turn5-resolve-off-b --summary   # regression guard, expect unchanged 88/196
npm run compare -- turn5-resolve-off-c --summary   # regression guard, expect unchanged 149/196
npm run compare -- turn5-reset-off --summary        # regression guard (control), expect unchanged 256/256
```

## 3. Baselines (measured fresh this session, commit `b48e3e90`)

| trace | before | this session |
|---|---|---|
| `turn5-confirm-off-a` | 60/132 | unchanged (not this instrument's scope) |
| `turn5-confirm-off-b` | 0/132 | unchanged (analysis only — see §1.5 for the predicted post-fix count) |
| `turn5-resolve-off-a` | 25/196 | unchanged (spot-checked 6222-6250 for §1.5's cross-trace note, no `src/` edit) |
| `turn5-resolve-off-b` | 88/196 | unchanged |
| `turn5-resolve-off-c` | 149/196 | unchanged |
| `turn5-resolve-off-d` | 0/196 | unchanged (analysis only — see §2.6 for the predicted post-fix count) |
| `turn5-reset-off` | 256/256 | unchanged (control) |
| `turn5-action-off` | 32/32 | unchanged |

## 4. Verdict

**(A) is complete and fix-ready**: one root cause (a missing delay-override
parameter plus the codebase's own standard `t-1` display-basis correction,
in the single call site `battleScene.ts:14888`), confirmed pixel-exact
against 6 independent oracle-read anchors spanning the whole reveal, a
one-line fix, and a predicted count (~37/132, up from 0/132) with a clear
mechanical argument for why the remaining 94 frames (a separate,
already-flagged small residual) and the fix's own safety (single, provably
isolated call site) both hold.

**(B) is half-pinned, honestly reported as such** (per the brief's own
"an honest complete (A) beats two half-pinned mechanisms" guidance — (A)
above is the complete one). Two of its three components are pinned to the
same root-cause class as (A) (a stale, un-swept detail-rendering epoch left
behind when ISSUES #97-C item 3 fixed only the dispatch gate) with
fix-ready shapes and pixel/given-fact cross-checks: the tail HP-freeze
(§2.2, matches the brief's own `turn5SitrusOnixHp` hypothesis exactly) and
the mid-window blank heal-text (§2.3, independently confirmed by an exact
match to the given "settles 6885" fact). The third component — a sprite/
particle-overlay mismatch that also affects the mid-window span — is
identified and localized (§2.4) but not fixed-shape-ready; it needs its own
dense-capture or RAM-probe pass before a full predicted count for the whole
196-frame window can be claimed. Landing §2.2+§2.3 alone is a safe,
regression-guarded partial win (~13+/196, more once live-verified); §2.4 is
banked as the next step, not attempted further this session per the
priority instruction to protect (A)'s completeness.

**No landed anchor was contradicted.** `ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`/
`ONIX_SITRUS_IDENTITY_RENDER_TICK` is a real, load-bearing, pre-existing
constant this session did not previously know about — it was never one of
the "6850/6991 Sitrus overrides, -38/-145 clusters, bounce offsets" the
brief named as already-landed and off-limits to relitigate. Its own value
(6872, an RAM-probed real event — Onix's own proc-triggered identity-pose
rotation start) is not disputed; what's flagged is that its **downstream
age-offset consumers** (`heldItemHeal.ts`'s `SITRUS_ITEM_*_FIRST_AGE`
constants, tuned for a different, longer real timeline) were not re-swept
when item 3 added the OFF-family's own faster dispatch-gate boundaries —
recorded here as new evidence, not a contradiction of prior work.

## 5. Landed addendum (2026-08-18, bounded MAIN worker)

Both fix shapes above landed exactly as this doc specified, commit
`c87c99dd`. (A)'s `battleScene.ts:14888`-era one-line change (current line
drifted with the file, re-grepped fresh) landed verbatim:
`rockSlideTextVisibleChars(t - 1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_
DELAY)`. (B)'s two new turn5-off-scoped siblings landed as §2.2/§2.3
specified: `turn5OffSitrusOnixHp` (hard step at a new
`TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK=6984`) and
`turn5SitrusOffHealTextVisibleChars` (anchored at
`TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK=6850`, same `t-1` shape).

**§2.2's own mandatory pre-landing caveat was resolved, not skipped**: a
fresh RAM probe (`tools/probe/dump-turn5-resolve-offd-onixhp-ram.py`,
adapted from `dump-issue62-hpbar-battlemons-off.py`'s struct layout,
dense sweep of `gBattleMons[0].hp` — ONIX is battler **0**, confirmed
against `dump-turn5-resolve-grovyle-side-driver.py`'s own
`battler0_onix` field name before writing the probe — across ticks
6975-6995 against `turn5-resolve-off-d.json`) found HP flat at 1 through
tick 6983, flat at 31 from tick 6984 on, with **zero intermediate
values** at any sampled tick. This is a clean hard step, confirming
§2.2's given ground truth exactly — no contradiction, no ramp, no
addendum needed beyond this confirmation.

**Live oracle numbers** (fresh `npm run compare` reruns, same commit):

| trace | before this session | after | vs. this doc's own prediction |
|---|---|---|---|
| `turn5-confirm-off-b` | 0/132 | **37/132** | exactly §1.5's ~37/132 |
| `turn5-resolve-off-d` | 0/196 | **50/196** | beats §2.6's ~13/196 tail-only floor — both (B) sub-components landed, not just the tail |
| `turn5-resolve-off-a` | 25/196 | **44/196** | the cross-trace bonus §1.5 flagged, materialized |
| `turn5-resolve-off-b` | 88/196 | 88/196 | unchanged, guard |
| `turn5-resolve-off-c` | 149/196 | 149/196 | unchanged, guard |
| `turn5-confirm-off-a` | 60/132 | 60/132 | unchanged, guard |
| `turn5-reset-off` | 256/256 | 256/256 | unchanged, control |
| `turn5-action-off` | 32/32 | 32/32 | unchanged, guard |
| `turn6-reopen-off` | 46/46 | 46/46 | unchanged, guard |
| `turn6-menu-off.json` fixture | 47/47 | 47/47 | unchanged, guard |
| `turn13-switchin` | 242/242 | 242/242 | unchanged, guard |
| `turn4-doubleteam-off` | 256/256 | 256/256 | unchanged, guard |
| `turn4-rockslide-off` | 256/256 | 256/256 | unchanged, guard |

Zero decreases anywhere. Two new Tier-1 describe blocks in
`tests/battleScene.test.ts` pin both new functions and the
rockslide-text-delay call-site formula against the same oracle-read
anchors §1.3/§2.2/§2.3 used. §2.4 (sprite/particle overlay) and §2.5
(the 6991-6994 transition spike) remain exactly as flagged above — not
attempted this session, per the brief's own scope boundary — recorded in
`ISSUES.md` #97 sub-entry G.

## 6. Follow-up (2026-08-18, bounded SIDE worker, ISSUES #97 remainder):
§2.4/§2.5 re-measured fresh, one pinned, one re-characterized

Scope per this step's brief: re-measure `turn5-resolve-off-d`'s remaining
window fresh (§5's landed fixes moved the baseline from 0/196 to 50/196)
and characterize what actually remains, not what §2's pre-fix tables show.
Fresh baseline confirmed in THIS worktree: `npm run compare --
turn5-resolve-off-d --summary` -> **50/196**, matching the brief's own
cited number exactly. Method: read the diff PNGs first (a fresh
`npm run compare -- turn5-resolve-off-d --summary`, no capture-range
override — the trace's own 196 frames already densely cover 6810-7005),
then direct RGB sampling at specific coordinates, same discipline as §1/§2
above and `docs/turn5-resolve-offc-tail-diagnosis.md` §13's own sibling
instrument (this session's other deliverable). No RAM probe run — pixel
evidence alone was sufficient to either pin or clearly characterize both
items. Analysis only — `git diff -- src/` empty throughout.

### 6.1 Residual shape, re-measured

| span | bbox | magnitude | status |
|---|---|---|---|
| 6810-6825 | `153,15-199,73` | 1146-1402px, 3-3.65% | §2.1's own already-flagged carryover from `resolve-off-c`'s trailing mechanism — **not this residual, not re-examined** |
| 6826-6849, 6851-6874 | (absent from the mismatch list = exact match) | 0px | already fixed — both landed §2.2/§2.3 fixes hold here |
| 6850 | `16,124-144,149` | 1245px, 3.24% | a single-frame transition edge (old text still held one tick past the new anchor) — same shape as §1.5's own already-accepted 6184 artifact, not re-chased |
| **6875-6969** | `39,49-100,111` growing to `39,49-200,111` | **600-1591px, 1.56-4.14%** | **§6.2 below — PINNED** |
| 6970-6988 | `44,71-200,103` shrinking to `44,71-97,105` | 130-232px, 0.29-0.6% | transitional tail of the same mechanism as 6875-6969, shrinking toward the now-fixed HP-jump tick (6984) — same root cause as §6.2, not separately chased |
| **6989-6994** | `9,71-238,158` (widens sharply at 6991) | **1302-6197px, 3.39-16.14%** | **§6.3 below — re-characterized (direction was assumed backwards), NOT PINNED** |
| 6995-7005 | `42,70-99,106` to `43,71-229,110` | 207-1793px, 0.54-4.67% | tail of the same menu-chrome mechanism as §6.3 — not separately chased |

### 6.2 §2.4 (sprite/particle overlay) — PINNED: Onix's own rotation animation is spurious, zero RAM basis, exactly the same class of bug as `turn5-resolve-off-c`'s mechanism (iii)

Direct RGB sampling of `onixSitrusRotateMatrix`'s own render region
(`ONIX_MATERIALIZE_CORNER`-relative, `battleScene.ts:10709-10711`,
consumed by `drawTurn5RockSlideAttack:10917-10931`) at 7 grayscale-toned
coordinates inside Onix's own sprite silhouette (`(74,70)`, `(82,70)`,
`(90,70)`, `(98,70)`, `(66,80)`, `(90,80)`, `(98,80)`), sampled at every
tick from 6826 through 6934:

**The ORACLE's own Onix sprite is byte-identical at all 7 coordinates for
every one of these 108 ticks** — `(74,70)` reads `(222,214,214)` at 6826,
6850, 6860, 6875, 6889, 6905, 6923, AND 6934 alike; same for all 6 other
coordinates. The real hardware never rotates, tints, or otherwise animates
Onix's sprite anywhere in this span — it is flat static, exactly the same
finding `docs/turn5-resolve-offc-tail-diagnosis.md` §11 already made for
PIDGEOTTO's own stretch table ("the real sprite is static... no wobble to
reproduce here, in this profile, for this switch-in").

The APP, meanwhile, actively renders `onixSitrusRotateMatrix(t)`'s own
periodic curve throughout this span (`ONIX_SITRUS_IDENTITY_RENDER_TICK =
TURN5_SITRUS.procTriggerRamTick(6872) + 2 = 6874`, `battleScene.ts:10705-
10706`) — the diff magnitude oscillates in a clean ~30-tick rise-fall cycle
(600px at 6875 -> 1568px peak at 6889-6891 -> 600px at 6904-6905 -> repeats
6909-6934...) that exactly matches a real, well-documented rotation curve
being actively evaluated (this is not noise; `app-06889.png` and
`app-06923.png`, 34 ticks apart, read byte-identical at every one of the 7
sample coordinates — the app's own animation is genuinely periodic, just
with zero basis in this trace's real hardware behavior).

**This is the SAME root cause class §11 already diagnosed for the OTHER
switch-in's stretch table**, and per that same doc's own reasoning, the
most likely explanation is `battle-scene-off`'s own documented behavior
(`bin/oracle info`'s bootstrap description, `AGENTS.md`: "Move/effect and
species front-sprite entrance animations are skipped by the real game" —
plausibly extending to this item-heal rotation flourish too, though that
specific extension isn't independently confirmed this session).

**Named mechanism and fix shape**: `onixSitrusRotateMatrix(t)`
(`battleScene.ts:10709-10711`) should return `null` for this trace's own
6810-7005 window (falling through to `drawTurn5RockSlideAttack`'s own
`else` branch, `:10932-10956`, which already draws Onix's plain static
sprite with the tint/settle handling the rest of this window needs) rather
than evaluating `sitrusRotationAtAge(t - 6874)`'s active curve. **Do NOT
edit `sitrusRotationAtAge`, `ONIX_SITRUS_IDENTITY_RENDER_TICK`, or
`ONIX_SITRUS_ROTATE_RENDER_LAG` directly** — per §2.2's own established
reasoning (this same epoch and its `+1`/`+2` render-lag guard are shared
with `turn5SitrusRingMatrix`/`drawGrantingStars`/`turn5GrantingStarPlacement`,
none of which this session verified) and per the build-time consistency
check at `battleScene.ts:10697-10704` that would need re-auditing if
either constant moved. The minimal, scoped fix is a NEW turn5-off-only gate
at `onixSitrusRotateMatrix`'s own single call site
(`battleScene.ts:10917`), e.g. an explicit `false`/window-scoped override
threaded from `drawTurn5RockSlideWindow`'s own caller (mirroring §2.2/§2.3's
"new call-site parameter, don't touch the shared function" discipline) —
**not fully worked out this session** (which caller-level plumbing is
cleanest wasn't traced end-to-end), but the WHAT (suppress the rotation
branch for this window) is pixel-pinned with high confidence.

**Not verified this session**: whether `turn5SitrusRingMatrix`/
`drawGrantingStars` (the OTHER two consumers of the same
`ONIX_SITRUS_IDENTITY_RENDER_TICK` epoch, per §2.4's own original
candidate list) have the SAME "spurious in this trace" defect, or are
genuinely correct here — the bbox widening to `x=200` at renders 6953-6969
(§6.1's own table) is a plausible sign the star/sparkle effect (spawning
at RAM 6968 per its own doc) contributes separately, but this session
didn't isolate it with its own coordinate sampling. Flagged as the next
instrument if landing the rotation fix alone doesn't close this span.

### 6.3 §2.5 (6991-6994 transition spike) — re-characterized: the app is EARLY, not the oracle; direction was assumed backwards

Direct RGB sampling across the full mismatch bbox (`9,71-238,158`) at
6988/6991/6995 (`out/run-2026-08-18-19-29-04Z-89202`, this session's own
fresh run) shows a clean, consistent split:

- **Left/upper portion (x<=100, and the whole screen for y<115)**: app and
  oracle agree at EVERY sampled tick 6988/6991/6995 alike — this region
  transitions to the new post-heal menu content (or was already there)
  with no mismatch at all.
- **Right/lower portion (x>=130, y>=115 — the action-menu button-grid
  area)**: at **t=6988, BOTH sides still show the OLD (pre-menu, rock-slide-
  window) content** (e.g. `(130,115)`: both `(214,74,57)`). At **t=6991
  (`TURN5_OFF_SITRUS_MENU_REDRAW_TICK`, `battleSceneCanonical.ts:213`),
  the APP has ALREADY switched to the new menu-chrome color at every one of
  these coordinates (e.g. `(130,115)`: app reads `(115,107,132)`), but
  the ORACLE is STILL showing the old content** (`(130,115)`: oracle still
  reads `(214,74,57)`, unchanged from 6988). By **t=6995, both sides agree
  on the new content** (`(130,115)`: both `(115,107,132)`).

**This is the opposite of the brief's own framing** ("the MENU_REDRAW
hard-cut itself landing on a different real tick... or a multi-tick
transition render lag" left the direction unstated) — the pixel evidence
is unambiguous: **the APP's `TURN5_OFF_SITRUS_MENU_REDRAW_TICK=6991` gate
is not wrong for the LEFT/upper portion of the screen (that already
matches at 6991), but the RIGHT/lower action-menu button grid transitions
in the APP a full 4 ticks BEFORE the real hardware does.** `drawTurn5SitrusSettledMenuChrome`
(`battleScene.ts:11649-11658`) draws its own `menuIdleBase` bitmap as a
SINGLE uniform blit once `t >= TURN5_OFF_SITRUS_MENU_REDRAW_TICK` —
consistent with the LEFT portion's own correct behavior, but this session
did not identify why the RIGHT portion specifically lags in the real
hardware (candidates not verified: a second, later real RAM event for
just the button-grid sub-window redraw that the single-bitmap blit
conflates; or `menuIdleBase`'s own asset simply painting the whole region
including both, while the REAL redraw is genuinely two separate window
system calls on real hardware that don't land on the same VBlank).

**NOT PINNED — flagged with its own next instrument**: a RAM probe of the
window-system state (`gBattle_BG0_X`/the action-menu window's own
`WindowId`/tilemap-write completion, the same class of instrument
`dump-turn5-resolve-offc-tail-probe.py` already uses for `gPaletteFade`)
across RAM ticks corresponding to render 6988-6996 would directly show
whether the real hardware's button-grid redraw is a genuinely separate,
later event or an artifact of this specific pixel sample's own coordinate
choice. Until then: the fix shape is NOT claimed here (unlike §6.2, where
the RAM-basis question is already settled by the "static at every one of
108 sampled ticks" finding) — landing a blind "+4" delay without RAM
confirmation risks the same kind of curve-fit-without-basis mistake this
family has explicitly avoided elsewhere (§4e/§11e's own open caveats).

### 6.4 Baselines (measured fresh this session)

| trace | before this session (per the brief) | this session |
|---|---|---|
| `turn5-resolve-off-d` | 50/196 | unchanged (analysis only) |
| `turn5-resolve-off-a` | 44/196 | unchanged, not touched |
| `turn5-resolve-off-b` | 88/196 | unchanged, not touched |
| `turn5-resolve-off-c` | 149/196 | unchanged, not touched (this worktree's own baseline before the parallel main-lane §11 fix lands — see `docs/turn5-resolve-offc-tail-diagnosis.md` §13) |
| `turn5-reset-off` | 256/256 | unchanged, control |

### 6.5 Verdict

§2.4 is now **fully pinned**: Onix's own rotation animation
(`onixSitrusRotateMatrix`) has zero RAM basis anywhere in this trace's
6810-6934+ window — the real sprite is flat static at every one of 108
sampled ticks across 7 coordinates — the same "spurious animation with no
real-hardware basis" root cause `turn5-resolve-offc-tail-diagnosis.md` §11
already found and fixed-shaped for the OTHER switch-in's stretch table.
The exact caller-level plumbing for the fix (which function should thread
a "suppress rotation" flag into `onixSitrusRotateMatrix`'s single call
site) is not fully worked out, and whether the ring/star consumers of the
same epoch share the defect is unverified — both flagged as the next
steps, not blocking on the core finding.

§2.5 is **re-characterized, not newly pinned**: the original framing (an
undiagnosed "transition spike") undersold what pixel evidence now shows
cleanly — a real, reproducible 4-tick lag between the app's own uniform
menu-chrome blit and the real hardware's own (apparently two-part) menu
redraw, with the APP transitioning EARLY rather than late. This reverses
an unstated assumption in the original brief's own framing and is exactly
the kind of "direct RAM/pixel contradiction, change nothing, flag loudly"
case the brief asked for — recorded here, `src/` untouched. A RAM probe of
the window-system state is the named next instrument.

No landed anchor was contradicted by either finding: §6.2 doesn't touch
`ONIX_SITRUS_IDENTITY_RENDER_TICK`'s own value (only whether the ROTATION
branch should fire at all in this trace), and §6.3 doesn't touch
`TURN5_OFF_SITRUS_MENU_REDRAW_TICK`'s own value (only notes that ONE
sub-region governed by it behaves differently from the rest of what it
gates). Both are new evidence about previously-unswept downstream
consumers of already-landed anchors, the same shape §2's own original
verdict (§2, "No landed anchor was contradicted") already established for
this family.

## 7. Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder)

§6.2's fix shape landed as specified: `onixSitrusRotateMatrix`'s own
periodic curve suppressed for this window via a new `suppressSitrusRotate`
flag (default `false`), threaded from `drawTurn5RockSlideWindow`'s own
call site down through `drawTurn6FieldBase`/`drawTurn5RockSlideAttack`
(`battleScene.ts`) - both functions are heavily reused across turns 6-13,
so the flag is a new trailing parameter on each, every pre-existing
caller (grep-confirmed) unaffected. `onixSitrusRotateMatrix`,
`ONIX_SITRUS_IDENTITY_RENDER_TICK`, and `ONIX_SITRUS_ROTATE_RENDER_LAG`
are all untouched, so `turn5SitrusRingMatrix`/`drawGrantingStars` (the
other two consumers of the same epoch, §6.2's own "not verified this
session" flag) and the build-time consistency guard between the rotate
and ring render-lag constants are unaffected by construction.

**Numbers**: `turn5-resolve-off-d` 66/196 -> **142/196**. Per-frame
attribution against §6.1's own table: renders `6810-6825` (the
`resolve-off-c` mechanism-(iv) carryover, closed as a side effect of that
same session's other fix, see `docs/turn5-resolve-offc-tail-diagnosis.md`
§14) and `6826-6952` (the bulk of §6.2's own flagged span) are now exact
match. Two spans remain open, both already named as unverified/out of
scope before this fix landed:

- **`6953-6969`** (`19-54px`, bbox narrowing toward `x∈[175,200]`,
  `y∈[91,103]`) - §6.2's own flagged, unverified "ring/star" residual:
  `turn5SitrusRingMatrix`/`drawGrantingStars` (the granting-star sparkle,
  spawning at RAM `6968`/`6978` per their own doc) were never independently
  checked against real RAM this session or last - not suppressed, and the
  brief for this session scoped the fix to the ROTATION only. Left open,
  matching §6.2's own prediction almost exactly (it named this exact
  render span as the likely site of a separate, not-yet-isolated defect).
- **`6970-6994`, `6995-7005`** - §6.1's own already-named tail-of-the-same-
  mechanism and §6.3's own re-characterized, not-pinned transition-spike
  spans - untouched, per this session's own explicit out-of-scope
  instruction (§6.3/§2.5 is "next instrument named, not fix-ready").

Full guard family, zero decreases: `turn5-resolve-off-a` 44/196,
`turn5-resolve-off-b` 88/196, `turn5-resolve-off-c` 195/196 (this
session's OTHER fix, landed the same session - see that doc's own §14),
`turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
46/46, `turn6-menu-off.json` fixture 47/47, `turn5-confirm-off-a` 60/132,
`turn5-confirm-off-b` 37/132, `turn13-switchin` 242/242 (the critical
guard: `drawTurn6FieldBase`/`drawTurn5RockSlideAttack` are shared with
Murkrow's own turn-13 continuation, and the new flag defaults `false`
there by construction - verified empirically, not just by grep),
`turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.

New Tier-1 pin (`tests/battleScene.test.ts`): exported
`drawTurn5RockSlideAttack` directly for testing; pins (1) that
`onixSitrusRotateMatrix` is genuinely non-null at the sampled tick
(`6900`, inside the doc's own §6.2 citation), so the gate below exercises
a real branch choice; (2) `suppressSitrusRotate=true` visibly changes the
rendered output relative to the default; (3) with the flag on, two ticks
34 renders apart (the same pair §6.2's own RAM sampling used) render
byte-identical, matching the "flat static" claim directly.

`npm test` 1067 files / 10065 passed (+7, shared commit with
`turn5-resolve-off-c`'s own mechanism-(iv) fix above); `npm run
build`/`npm run typecheck` green. Full writeup: `PROGRESS.md` entry
citing this section, `ISSUES.md` #97.

## 8. Follow-up (2026-08-18, bounded SIDE worker, ISSUES #97 remainder): the 6953-7005 residual re-measured — the "ring/star" hypothesis is superseded by a live-climb HP-overlay finding; §6.3's own spike remains uninstrumented

Scope per this step's brief: (B)'s two named remainders — the §2.5/§6.3
transition spike (RAM-probe instrument named but not yet run) and the
6953-6969 ring/star residual (never independently RAM-verified). Fresh
baseline confirmed in THIS worktree: `npm run compare -- turn5-resolve-off-d
--summary` → **142/196**, matching the brief's own cited number. Method:
per the standing discipline, read the diff PNGs first, then direct RGB/
digit pixel reads off fresh `npm run compare --capture-range` PNGs — no
live RAM probe run this session (time; the named window-system probe for
§6.3 specifically was not attempted — see §8.3).

### 8.1 The mismatch span is ONE continuous 53-tick block, not the four sub-spans the stale pre-fix table implied

`npm run compare -- turn5-resolve-off-d --summary` (full 196-frame capture,
no range override) lists exactly 54 mismatched frames: **6850** (the
already-understood single-tick ENDEAVOR-hold-adjacent transition edge,
unrelated, not re-examined) plus **6953-7005 contiguous, no gaps** — every
single tick in that 53-tick span mismatches. §6.1's own table (written
*before* the §6.2 rotation fix landed) split this into four sub-spans by
bbox shape; that table is now stale for the purpose of mechanism
attribution — the span is genuinely one continuous run of mismatches, even
though (per §8.2) it is NOT one continuous mechanism.

### 8.2 6953-~6988: NOT the ring/star sparkle — Onix's own HP digit is live-climbing, and the currently-landed formula assumes a hard step

Direct digit reads off fresh oracle PNGs (`turn5-resolve-off-d
--capture-range 6952:6953` / `6959:6960` / `6979:6980`, this session):

| tick | oracle ONIX hp (read) | linear-fit prediction (rate=1/tick from tick 6952=1) |
|---|---|---|
| 6952 | *(last matching tick — app already shows 1, so oracle is 1 or the diff is sub-pixel)* | 1 |
| 6953 | **2** | 2 |
| 6960 | **9** | 9 |
| 6980 | **29** | 29 |

All three read anchors land EXACTLY on a rate-1-HP/tick linear climb
starting at tick 6952 — the same shape (and same 1-unit/tick rate) as
`endeavorHp`'s own already-correct drain formula
(`docs/turn5-confirm-pools-diagnosis.md` §2). Extrapolating to the cap
(`31`): `1 + (t-6952) = 31 → t=6982` — two ticks before the RAM-exact
proc/jump tick `TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK=6984` this family's own
landed fix uses, well within the same class of small render-lag/anchor
slop already seen everywhere else in this family (e.g. `SWITCHIN_SENTOUT_
TEXT_START_TICK`'s own `+1`, `docs/turn5-family-class3-diagnosis.md` §15).

**This reframes, not confirms, the brief's own "ring/star" framing for this
sub-span**: the dominant, bulk pixel difference across 6953-~6988 (the
`175,91-200,103`-family bbox — the SAME on-screen region, Onix's own status
box, that `docs/turn5-confirm-pools-diagnosis.md` §2's ENDEAVOR-hold digit
mismatch also occupies, since Onix's status box sits in the same screen
position all battle long) is the **HP digit/bar itself failing to
animate**, not the star/sparkle particle effect. `turn5OffSitrusOnixHp`
(`battleScene.ts`, landed this same day per §5/§7 above) is a **hard step**
(`t < TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK ? 1 : 31`) — correct for the RAM
stat (§5's own pre-landing spot-check confirmed `gBattleMons[0].hp` is a
genuine hard step in RAM, no intermediate values, across the *sampled*
window `6975-6995`) but **the DISPLAYED bar is not simply mirroring the RAM
stat** — exactly the same "RAM commits instantly, the animated bar chases
it over subsequent frames" split already established for `endeavorHp`
(`docs/turn5-confirm-pools-diagnosis.md` §2's own closing note). The
6975-6995 RAM probe's own "flat 1 through 6983" finding is **not
contradicted** — that is still the true internal stat every one of those
ticks — but it does not describe what's drawn on screen, which this
session's fresh pixel evidence shows is already climbing well before 6975.

**Named mechanism, not yet fix-shaped**: `turn5OffSitrusOnixHp` needs a
live linear-climb formula (mirroring `endeavorHp`'s own `Math.max(cap,
start ± (t - (anchor+delay)))` shape, direction reversed for healing) in
place of its current hard step, anchored so it reads `1` before ~6952-6953
and climbs at 1 HP/tick to `31` by ~6982-6984. **Not written to an exact
formula this session** (only 3 anchor points sampled, all consistent with
the simplest linear fit, but the exact start tick/anchor relationship
`(TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK` or its own `ONIX_SITRUS_PROC_TRIGGER_
RAM_TICK`-family upstream epoch) was not re-derived from first principles —
a fix worker should confirm the anchor against
`ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`/`TURN5_OFF_SITRUS_HEAL_TEXT_START_
TICK`'s own already-established epoch family before picking the exact
constant, per this family's own "mint a scoped constant matching the real
anchor family" convention).

**The ring/star consumers (`turn5SitrusRingMatrix`/`drawGrantingStars`) are
still unverified** — this session's finding does not rule out a smaller,
separate sparkle-timing defect layered on top of the HP-digit issue (the
bbox does widen toward `x=200` in the later ticks of this span, §6.1's own
observation, consistent with *something* near the status box's right edge
contributing too) — but the DOMINANT signal is the HP digit, confirmed by
direct reads, not the sparkle. A follow-up isolating the ring/star
specifically should re-run AFTER the HP-climb fix lands, since the digit
mismatch's own large, wide bbox currently masks whatever smaller
contribution the sparkle makes (the same "fix the dominant bug first, then
re-measure the residual" sequencing every other multi-mechanism trace in
this family has needed).

### 8.3 ~6989-7005: the already-flagged §6.3 menu-chrome spike, still NOT instrumented (RAM probe not run this session either)

By tick 6995 the mismatch bbox has moved off Onix's own status box
entirely (`43,71-98,106` — the field/sprite region, not `175,91-200,103`),
consistent with the HP digit having already settled to its correct value
by then (§8.2's own extrapolated climb reaches 31 at ~6982-6984, well
before 6995) — the remaining 6989-7005 mismatch is a **different** region
and, per §6.3's own already-recorded pixel evidence (unchanged, not
re-derived this session), the same 4-tick-early menu-chrome button-grid
blit already characterized: `drawTurn5SitrusSettledMenuChrome`
(`battleScene.ts:11649-11658`) draws its own `menuIdleBase` bitmap as a
single uniform blit at `t >= TURN5_OFF_SITRUS_MENU_REDRAW_TICK(6991)`, but
real hardware's own button-grid sub-window redraw lags 4 ticks behind its
own left/upper-portion redraw (`§6.3`'s own split-region RGB sampling,
unchanged).

**The named next instrument (a RAM probe of the window-system state —
`gBattle_BG0_X`/the action-menu window's own `WindowId`/tilemap-write
completion, the same class of instrument `dump-turn5-resolve-offc-tail-
probe.py` already uses for `gPaletteFade`) was NOT run this session** —
time; this step's own priority ordering put (A)'s two confirm windows
first (167 unattributed frames vs. this residual's own ~17 unexplained
ticks once §8.2's HP-climb finding is subtracted out), and the HP-digit
finding in §8.2 turned out to need the bulk of this session's own remaining
budget. Flagged, not attempted — the exact instrument description in §6.3
above is unchanged and still the right next step.

### 8.4 Predicted counts (not landed, no `src/` edit this session)

If `turn5OffSitrusOnixHp` gets the live-climb formula §8.2 names (fix shape
not fully nailed to an exact constant, see caveat above): the bulk of
6953-6988 (36 of 53 ticks in the continuous block) is predicted to close,
modulo whatever small, separately-unverified ring/star contribution
remains layered on top (§8.2's own "widening toward x=200" observation) —
an honest range, not an exact number, since the sparkle component was not
isolated. 6989-7005 (17 ticks) stays open pending §8.3's own RAM probe.
**`turn5-resolve-off-d`: 142/196 → predicted roughly 160-178/196** once the
HP-climb fix lands (wide range reflects the unisolated ring/star
component), with 6989-7005 requiring its own separate RAM-probed fix
before the window can close further.

### 8.5 Regression guards

- `turn5OffSitrusOnixHp`'s only call site remains `drawTurn5RockSlideWindow`'s
  own call to `drawTurn6FieldBase` (`battleScene.ts:14884`, per §2.2 above)
  — a turn5-off-scoped function with one caller, same guard reasoning as
  every other fix in this family.
- `gBattleMons[0].hp`'s own RAM hard-step finding (§5's pre-landing
  spot-check) is not disturbed by this follow-up — §8.2 is about the
  DISPLAYED formula, not the RAM ground truth, and proposes no change to
  any RAM-read anchor.
- `TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK=6984` is not contradicted as a real
  RAM event — only as the sole input to a hard-step DISPLAY formula; a
  fix worker may still need it as the climb's own cap-reached anchor.

### 8.6 Verdict

**No landed anchor was contradicted.** The RAM hard-step finding (§5) and
the rotation-suppression fix (§6.2/§7) both stand unchanged — this
follow-up adds new evidence about a THIRD, previously-unswept consumer of
the same Sitrus-heal event (the HP overlay's own display formula) that
turned out to need a live-climb shape instead of a hard step, superseding
(not contradicting) the brief's own "ring/star" naming for this residual's
dominant component. §8.3's own transition-spike residual remains exactly
as flagged in §6.3 — the named RAM-probe instrument still has not been run
(this session's own time went to the higher-priority (A) census and to
chasing §8.2's own pixel evidence once it turned out to be the dominant
signal in 6953-6988). Honest partial, per this step's own "honest partials
beat rushed pins" priority instruction: one mechanism newly characterized
with a strong, three-point pixel fit and a named (if not fully nailed) fix
shape; one mechanism named but genuinely untouched.

### 8.7 Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder)

§8.2's live-climb formula landed, with the exact anchor this section's own
caveat flagged as unresolved now nailed down: fresh oracle-vs-oracle
pixel-diffing of the HP-digit crop (`npm run compare --capture-range`,
per-tick diffs, NOT just the 3-point curve fit above) found the digit
unchanged through render 6952, then a nonzero diff on **every** tick
6953-6982 (30 consecutive changes, zero skips or repeats), then flat again
from 6982 on — confirming `hp(t) = clamp(1 + (t - 6952), 1, 31)` exactly,
with the cap reached at t=6982 (not the hedged "~6982-6984" range). Landed
as `turn5OffSitrusOnixHp`'s new body plus a new `TURN5_OFF_SITRUS_ONIX_HP_
CLIMB_START_TICK=6952` constant — deliberately NOT derived from
`ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`(6872) or `TURN5_OFF_SITRUS_HEAL_TEXT_
START_TICK`(6850) by a relative offset (neither gives a round or
previously-seen delta), so minted directly from the pixel-confirmed
absolute tick per this family's own convention.

**Numbers:** `turn5-resolve-off-d` 142/196 → **159/196** (+17, strict
improvement). 6953-6969 (17 ticks) now closes exactly. 6970-6988 (19
ticks) still mismatches, but with a much smaller residual (77-177px vs the
pre-fix 130-230px) — §8.2's own "widening toward x=200... separate,
unisolated sparkle contribution" hedge was right: a real ring/star
sparkle-timing defect was layered on top of the digit bug and is now
exposed on its own, still unfixed. 6989-7005 (§8.3's own menu-chrome
spike) is entirely untouched, as flagged — its own RAM-probe instrument
still has not been run. Zero decreases across the full guard family
(rerun in full per ISSUES #97 sub-entry J's own lesson, not just this
trace). One updated Tier-1 pin block (`tests/battleScene.test.ts`, the
`turn5OffSitrusOnixHp` describe block rewritten for the new climb shape).
Full ledger: ISSUES #97 sub-entry K.

**Still open, next instruments unchanged from §8.2/§8.3 above:** the
6970-6988 ring/star residual (isolate `turn5SitrusRingMatrix`/
`drawGrantingStars` now that the dominant digit signal is gone) and the
6989-7005 menu-chrome spike (the named window-system RAM probe, e.g.
`gBattle_BG0_X`/window `WindowId`/tilemap-write completion).

## 9. Follow-up (2026-08-18, bounded SIDE worker, ISSUES #97 remainder): both named instruments run — the "ring/star" hypothesis is FALSIFIED (spurious sprites, zero RAM basis), the menu-chrome spike is PINNED to a source-cited mechanism, and a third, previously-uncounted mechanism (text-clear timing) fell out of decomposing the span

Scope per this step's brief: run the two named-but-never-attempted RAM
instruments for `turn5-resolve-off-d`'s remaining 6970-7005 residual — (A)
the star/ring sparkle hypothesis (§8.2's "widening toward x=200... separate,
unisolated sparkle contribution" flag) and (B) the §6.3/§8.3 menu-chrome
transition-spike window-system probe. Fresh baseline confirmed in THIS
worktree before touching anything: `npm run compare -- turn5-resolve-off-d
--summary` -> **159/196**, matching ISSUES #97 sub-entry K's own cited
number exactly. `git status` / `git diff -- src/` empty throughout — the two
new probes under `tools/probe/` (`dump-turn5-resolve-offd-star-ram.py`,
`dump-turn5-resolve-offd-menu-redraw-ram.py`) and this section are the whole
deliverable.

### 9.1 The 36-tick remaining span decomposes into (at least) three stacked, independently-timed mechanisms, not one

`npm run compare -- turn5-resolve-off-d --capture-range 6985:7005 --summary`
(this session, fresh) shows the post-HP-climb-fix residual is NOT the single
"ring/star" span the brief's own framing implied:

| sub-span | ticks | diff shape | mechanism (this session's finding) |
|---|---|---|---|
| 6970-6988 | 19 | ~175-178px, bbox settles to `44,71-97,105` (Onix's own on-field sprite region) | (A) spurious granting-star sprites — see §9.2 |
| 6989-6990 | 2 | ~1300-1316px, bbox `16,71-120,149` (the ENTIRE message textbox) | NEW, previously-uncounted — see §9.3 |
| 6991-6994 | 4 | ~6172-6197px, bbox `9,70-238,158` (nearly full screen) | (B) menu-chrome reveal, 4 ticks early — see §9.4 |
| 6995 | 1 | 214px, bbox `43,71-98,106` | back to the (A) star-only shape — transition settled |
| 6996 | 1 | 1793px, bbox `43,71-229,110` (adds the button-grid border/cursor outline) | NOT diagnosed — bbox includes the cursor highlight box; per this step's own explicit "do not touch anything cursor-related" constraint, flagged and left alone, not attributed |
| 6997-7005 | 9 | ~207-221px, bbox `42-44,70-99,71-106` | back to (A)'s star-only shape, unchanged |

(6850, one tick, pre-existing and unrelated, untouched — not re-examined
this session.) The **19+2+4+1+1+9 = 36** ticks above plus tick 6850 account
for all **37** of the current 159/196 baseline's mismatches.

### 9.2 (A) 6970-onward "ring/star sparkle" hypothesis: FALSIFIED — `gGrantingStarsSpriteTemplate` sprites never exist in this trace's RAM at all

**Instrument**: `tools/probe/dump-turn5-resolve-offd-star-ram.py`, run via
`python3 tools/run-mgba-probe.py <out.json> -- tools/probe/dump-turn5-
resolve-offd-star-ram.py <out.json>` (default window `[6945,7003]`, chosen
to bracket both stars' own expected active windows — see below). Scans all
64 `gSprites` slots every tick for a template pointer equal to
`gGrantingStarsSpriteTemplate` (`bin/oracle symbols
gGrantingStarsSpriteTemplate` -> `0x08592b7c`) or
`gThinRingExpandingSpriteTemplate` (`0x0859381c`, the ring, reusing the
already-confirmed-correct pointer from `dump-sitrus-ring-sprite.py`, ISSUES
#26).

**Result: zero matches, at every one of the 59 sampled ticks, for either
template.** A cross-check dump of every in-use sprite slot at tick 6980
(`/tmp/dump_all_slots.py`, same struct layout, not committed — a one-off
sanity check, not a named instrument) found only **8** sprites ever in use
at that tick, none matching either pointer: two battler mon sprites, two
runtime-generated (EWRAM-pointer, `0x0202499c`) healthbox-family sprites,
and four more with ROM pointers in the `0x0832c1xx` range (icon/name-plate
family, not the sparkle effect). **The granting-star sprites this family's
own §6.2 doc comment cites (`spawning at RAM 6968/6978`) do not exist
anywhere in this trace's own replay** — that citation (from an earlier,
unrelated S7 slice, per its own doc comment "RAM-probed fresh this
session") was evidently measured against a DIFFERENT trace (almost
certainly a Battle-Scene-ON replay of the same Sitrus proc, where
`GrantingStarsEffect`'s battle-anim-script actually runs) and was never
independently re-verified for `turn5-resolve-off-d` specifically until now.

**Why this matches the pixel evidence exactly**: `onixSitrusRotateMatrix`'s
own epoch (`ONIX_SITRUS_IDENTITY_RENDER_TICK = ONIX_SITRUS_PROC_TRIGGER_RAM_
TICK(6872) + ONIX_SITRUS_ROTATE_RENDER_LAG(2) = 6874`) feeds
`drawGrantingStars` too (`battleScene.ts:10703-10709`, unconditional call,
no suppress flag — unlike the already-fixed rotation). `heldItemHeal.ts`'s
own `sitrusStarPlacementAtAge` places star 0 first-visible at
`age=SITRUS_ITEM_STAR_FIRST_VISIBLE_AGE(96)` -> render tick `6874+96=6970`
— **exactly the render tick this residual span begins at** — and stays
visible for `STAR_VISIBLE_TICKS(61)` ticks, i.e. through render `~7030`,
well past this trace's own 7005 capture-window end. Star 1 first-visible at
age 106 -> render tick 6980, visible through ~7041. Hand-computing both
stars' own `(cx,cy)` corner boxes at, e.g., t=6985 (age=111): star 0
`local=15` -> `frameIndex=2`, corner `(41,74)`, 32x32 span `x:41-73,y:74-106`;
star 1 `local=5` -> `frameIndex=0`, corner `(68,67)`, 32x32 span
`x:68-100,y:67-99`. The union, `x:41-100,y:67-106`, matches the observed
diff bbox (`44,71-97,105` at that tick, and the same shape at every other
sampled tick in 6970-6988 and 6997-7005) almost exactly. **The app is
painting two star sprites that the real hardware never creates in this
trace at all** — the same "spurious presentation, zero RAM basis" class of
bug already found and fixed for the rotation (§6.2/§7), now confirmed for
the OTHER consumer of the same shared epoch it explicitly flagged as
"neither independently verified this session."

This also explains why the residual doesn't stop at 6988 as the stale
"6970-6988" framing implied: `STAR_VISIBLE_TICKS=61` keeps both spurious
stars rendering all the way through 7005 (this trace's own capture-window
end) and beyond — visible directly in the table above (§9.1: the ~175-221px
star-shaped residual reappears at 6995 and persists through 6997-7005,
unrelated to the (B) menu-chrome mechanism which fully settles by 6995).

**Ring (`turn5SitrusRingMatrix`) remains genuinely unverified, not
falsified**: its own active window (`SITRUS_ITEM_RING_FIRST_AGE=167` ->
render tick `6874+167=7041`) is entirely OUTSIDE both this trace's own
196-frame capture range (ends 7005) and this probe's own scanned window
(ends 7003) — there is no pixel or RAM data in this trace that could
confirm OR falsify the ring for `resolve-off-d` specifically. Left exactly
as open as before, just for a different reason (out of range, not
unmeasured).

**Named fix shape (RAM/pixel-confirmed, not fix-ready without one more
grep pass)**: a `suppressSitrusStars` flag mirroring `suppressSitrusRotate`
byte-for-byte (`battleScene.ts:10852` onward) — default `false`, threaded
through `drawTurn5RockSlideAttack`'s single `drawGrantingStars(fb, t)` call
site (`battleScene.ts:10906`), set `true` at `resolve-off-d`'s own call
path the same way `drawTurn5RockSlideWindow` already threads
`suppressSitrusRotate` down through `drawTurn6FieldBase`/
`drawTurn5RockSlideAttack`. A fix worker must re-run the same `turn13-
switchin` 242/242 shared-guard check §7's own landing already established
as mandatory for any edit to this call chain (both functions are reused
across turns 6-13) before landing.

### 9.3 NEW, previously-uncounted mechanism: the heal-text textbox clears 2 ticks EARLY in real hardware relative to the app (opposite direction from the menu-chrome finding)

Falls out of §9.1's table, not separately probed via RAM (pixel evidence
alone is unambiguous): `npm run compare -- turn5-resolve-off-d
--capture-range 6986:6989` (this session) —

- **6986-6988**: app and oracle both still show the "ONIX's SITRUS BERRY /
  restored health!" textbox — diff is the (A) star-only ~175px shape, no
  textbox mismatch.
- **6989**: oracle-06989.png shows the textbox **already gone** (plain
  field background, no red box, no text); app-06989.png still shows the
  full textbox. Diff bbox `16,71-120,149` covers almost the entire textbox
  region.

The app's own `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK = 6991`
(`battleSceneCanonical.ts:207`) is **2 ticks too LATE** — real hardware has
already cleared the message by render tick 6989. This is the opposite
direction from §9.4's menu-chrome finding (app early there, app late here)
— two genuinely independent constants that happen to currently share the
same numeric value (6991), not one mechanism. **Not RAM-probed this
session** (pixel evidence alone brackets it to render tick 6989 cleanly,
matching frame-by-frame with no ambiguity — 6988 matches, 6989 does not).
**Named fix shape, not landed**: move `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK`
from 6991 to 6989 — before landing, grep every other caller of this
constant (shared constants in this family are frequently reused across
turns 6-13 per §6.2/§7/§9.2's own precedent) to confirm this specific
window's own call site can move independently without regressing a sibling
trace.

### 9.4 (B) 6991-6994 menu-chrome spike: PINNED — real hardware's button-grid reveal is a `gBattle_BG0_Y` scroll snap gated behind an async DMA3 tilemap copy, confirmed exactly 4 ticks later than the app's current blit tick

**Source reading** (`reference/pokeemerald/src/battle_controller_
player.c:2565-2589`) names the real mechanism directly, superseding the
§6.3 "candidates not verified" hedge: `PlayerHandleChooseAction` queues the
button-grid text into `B_WIN_ACTION_MENU` and switches
`gBattlerControllerFuncs[gActiveBattler]` to `HandleChooseActionAfterDma3`,
which polls `IsDma3ManagerBusyWithBgCopy()` every tick and, only once the
async DMA3 tilemap copy finishes, sets `gBattle_BG0_Y = DISPLAY_HEIGHT`
(160) — a **Y-scroll snap that reveals the button-grid region**, not a
redraw of its pixels. (`gBattle_BG0_Y` is reset to 0 by the five other
`PlayerHandle*` call sites in the same file whenever a fresh message window
opens.) This also explains §6.3's own "left portion always matches, only
the right/lower button-grid lags" split: the message-text region isn't
gated by this BG0 scroll at all, only the button-grid sub-window is.

**Instrument**: `tools/probe/dump-turn5-resolve-offd-menu-redraw-ram.py`,
same run pattern, reads `gBattle_BG0_X`/`gBattle_BG0_Y` (`bin/oracle
symbols` -> `0x2022e14`/`0x2022e16`) every tick across `[6980,7010]`.
**Result**: `bg0Y` is `0` at every tick 6980-6993, then `160` at every tick
6994-7010 — a single, clean, one-time transition at **RAM tick 6994**, zero
noise. `bg0X` stays `0` throughout (unrelated to this defect).

**Cross-checked against fresh pixel evidence** (`npm run compare --
turn5-resolve-off-d --capture-range 6990:6996`, this session): frames
6991-6994 all still show the OLD full-screen-ish mismatch (bbox growing
toward `9,70-238,158`, both message-region and button-grid-region content
disagreeing); frame **6995** collapses back down to the (A) star-only shape
(`bbox=43,71-98,106`, no button-grid-region diff at all) — i.e. the real
reveal is visible starting render tick 6995, exactly one render tick after
RAM tick 6994, matching this family's own standard "+1 render lag"
convention used everywhere else (§8.7, `SWITCHIN_SENTOUT_TEXT_START_TICK`,
etc.) with zero fitting.

**The app's `TURN5_OFF_SITRUS_MENU_REDRAW_TICK = 6991`
(`battleSceneCanonical.ts:213`) is exactly 4 ticks early** (`6995 - 6991 =
4`), matching §6.3's own pixel-derived "4 ticks early" characterization
number-for-number — this session's RAM probe independently reproduces that
magnitude from a completely different measurement (a register read, not a
pixel diff), which is strong confirmation neither measurement was an
artifact of the other's own method.

**Named fix shape (RAM+pixel-confirmed, source-cited mechanism — the
strongest evidentiary bar this family uses)**: move
`TURN5_OFF_SITRUS_MENU_REDRAW_TICK` from 6991 to 6995. Per the doc's own
disclosed uncertainty in §6.3 (real hardware's redraw might be "two
separate window system calls" for message vs. button-grid, and the app's
`drawTurn5SitrusSettledMenuChrome` currently blits both regions as one
uniform bitmap) — moving the shared constant to 6995 is safe for the
button-grid region (this probe's own direct evidence) but a fix worker
should re-verify the message-region content is unaffected (§6.3's own
"left portion" was already correct at the OLD 6991 tick per that section's
own citation, so moving the single shared gate to 6995 risks re-breaking
that region for 4 ticks unless the two regions are split into independent
blits/gates — not attempted this session, flagged as the one open question
blocking a blind constant bump).

### 9.5 Predicted counts (not landed, no `src/` edit this session)

If all three named fix shapes land (§9.2 `suppressSitrusStars`, §9.3
`TEXT_CLEAR_TICK` 6991->6989, §9.4 `MENU_REDRAW_TICK` 6991->6995, the last
contingent on resolving its own open question above):

- 6970-6988 (19 ticks): closes fully — §9.2's own bbox/magnitude match
  leaves no other signal in this sub-span.
- 6989-6990 (2 ticks): closes once §9.2 AND §9.3 both land (both
  mechanisms are active simultaneously here — §9.1's own bbox `16,71-
  120,149` is the union of the star region and the still-showing textbox).
- 6991-6994 (4 ticks): closes once §9.2 AND §9.4 both land.
- 6995 (1 tick): already closes with §9.2 alone (§9.4 doesn't touch it —
  6995 is already past the real reveal either way).
- 6996 (1 tick): **not predicted to close** — this session did not
  diagnose it (§9.1's own explicit cursor-adjacent flag) and it is not
  addressed by any of the three fix shapes above.
- 6997-7005 (9 ticks): closes fully with §9.2 alone.

**`turn5-resolve-off-d`: 159/196 -> predicted 194/196** (35 of the
remaining 36 ticks in the contiguous span close; tick 6850 stays open as
before, untouched; tick 6996 stays open, undiagnosed) — contingent on §9.4's
own open split-region question being resolved one way or the other first.

### 9.6 Regression guards (for a future fix worker, not run this session beyond the read-only checks already cited)

- `drawGrantingStars`'s only call site is `drawTurn5RockSlideAttack`
  (`battleScene.ts:10906`), itself reused across turns 6-13 exactly like
  `onixSitrusRotateMatrix` — §9.2's own fix shape reuses §7's own mandatory
  `turn13-switchin` 242/242 guard requirement verbatim.
- `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK`/`TURN5_OFF_SITRUS_MENU_REDRAW_TICK`
  are both exported from `battleSceneCanonical.ts` (`battleScene.ts`'s own
  giant re-export barrel at the top of the file) — a fix worker must grep
  every consumer, not just `drawTurn5RockSlideWindow`, before moving either
  constant, per this family's own standing convention (§6.2/§6.3's own
  caveats already flagged this for the ROTATE/RING epoch; the same
  diligence applies here).
- Neither `ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`(6872) nor
  `ONIX_SITRUS_IDENTITY_RENDER_TICK`(6874) is touched or contradicted by
  §9.2 — only whether the STAR branch should fire at all in this trace,
  the same shape §6.2's own verdict already established for the ROTATE
  branch.

### 9.7 Verdict

**No landed anchor was contradicted.** Both named next instruments from
§8.3/§8.6 were run for the first time this session, with three outcomes,
none matching the original framing exactly:

1. The "ring/star" hypothesis (A) is **falsified, not pinned** — direct
   RAM sprite-table scanning across the full relevant window found zero
   granting-star or ring sprites at any tick; the real defect is the APP
   drawing sprites the real hardware never creates, the same "spurious
   presentation" class of bug already fixed once in this family (§6.2).
   Fix shape named, one open item (a mandatory shared-guard re-check)
   before landing.
2. The menu-chrome spike (B) is **pinned to a source-cited mechanism**
   with two independent, mutually-corroborating measurements (a live
   register read and a pixel diff) agreeing on the same "+4 ticks early"
   magnitude. Fix shape named, one open question (whether the message- and
   button-grid regions need independent gates) before landing.
3. A third mechanism (text-clear timing) was previously uncounted —
   masked by the HP-digit bug until this family's own §8.7 fix landed,
   then further masked by conflating the whole 6989-7005 span under the
   single "menu-chrome" label. Pixel-bracketed cleanly, fix shape named.

One tick (6996) remains genuinely undiagnosed and is flagged, not guessed
at, per this step's own explicit instruction not to touch anything
cursor-adjacent. `turn5-resolve-off-a`/`-b`/`-c`'s own residuals (ISSUES
#97 sub-entries I/J) are untouched by this entry. No `src/` file was
edited this session — `git diff -- src/` is empty; the two new probes
under `tools/probe/` and this section are the whole deliverable.

## 10. Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder): all three of §9's named fix shapes land together; §9.4's own open question resolved empirically (no split gate needed)

All three fix shapes named in §9.2/§9.3/§9.4 landed in one commit (they
share the same call chain and the same two-tick dispatch window, so
landing them separately would have meant re-deriving the same evidence
twice):

- **§9.2 `suppressSitrusStars`**: landed byte-for-byte as named, mirroring
  `suppressSitrusRotate` — new trailing param on `drawTurn5RockSlideAttack`
  (default `false`, every pre-existing caller unaffected), threaded through
  `drawTurn6FieldBase`, gating `drawGrantingStars(fb, t)` with
  `if (!suppressSitrusStars)`. `resolve-off-d`'s own call site
  (`drawTurn5RockSlideWindow` → `drawTurn6FieldBase`) now passes `true`,
  same as it already does for `suppressSitrusRotate`.
- **§9.3 `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK`**: moved 6991 → 6989, exactly
  as named.
- **§9.4 `TURN5_OFF_SITRUS_MENU_REDRAW_TICK`**: moved 6991 → 6995, exactly
  as named.

**§9.4's own open question — resolved empirically, no split gate needed.**
The brief for this step named this the one thing to determine from
pixels, not assume. Before touching `src/`, a fresh
`npm run compare -- turn5-resolve-off-d --summary` reproduced §9's own
159/196 baseline exactly, then direct oracle screenshots at 6989, 6991,
and 6994 (`out/run-2026-08-18-22-01-08Z-89153/oracle-06989.png`,
`oracle-06991.png`, `oracle-06994.png`) were inspected side by side:

- `oracle-06989.png`, `oracle-06991.png`, and `oracle-06994.png` are the
  same image — a **plain field with no message box and no menu chrome at
  all** (no red border, no "What will ONIX do?" prompt, no FIGHT/BAG/
  POKéMON/RUN grid).
- `oracle-06995.png` shows the **full settled menu chrome** (prompt line
  AND button grid together) for the first time.

This directly falsifies the premise behind §6.3's own "left portion
always matches, only the right/lower button-grid lags" split (the
apparent match there was measured against ON-FIELD SPRITE pixels — the
bbox `9,71-238,158` at y<115 is dominated by Onix's own on-field sprite
region, unrelated to the menu-chrome mechanism at all — not evidence of
an early-arriving prompt). Source cross-check confirms this reading:
`B_WIN_ACTION_PROMPT` and `B_WIN_ACTION_MENU`
(`reference/pokeemerald/src/battle_bg.c:174-192`) are both `bg=0`,
`tilemapTop=35` — the SAME background layer and the SAME scrolled row,
gated by the SAME single `gBattle_BG0_Y` register `HandleChooseAction
AfterDma3` snaps once (`battle_controller_player.c:2565-2573`). There is
no independent second gate for the two windows to split on. **The fix is
simply moving the one existing shared `TURN5_OFF_SITRUS_MENU_REDRAW_TICK`
gate from 6991 to 6995** — landed exactly that way, no new state, no
split blit.

A live-rendered check (`drawTurn5RockSlideWindow` at 6988/6989/6994/6995,
now exported for direct Tier-1 testing) confirms the app's own blank-hold
behavior between the two retimed gates matches this shape: nothing is
drawn in the message/chrome region during `[6989,6995)` (the earlier-drawn
field base + tile bg show through), reproducing the oracle's own plain-
field appearance with no extra code.

**Numbers:** `turn5-resolve-off-d` **159/196 → 194/196** (+35), exactly
matching §9.5's own predicted count. Both of §9.1's structurally-explained
sub-spans (6970-6988 star-only, 6989-6994 the union of star+text+menu)
close in full; tick 6850 (pre-existing, out of scope — the static-bg
residual's own sibling, untouched) and tick 6996 (cursor-adjacent,
undiagnosed per §9.1's own explicit flag, deliberately not chased per this
step's own "do not touch anything cursor-related" constraint) remain, both
exactly as §9.5 predicted. Zero decreases across the full guard family,
fresh this session: `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
`turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
`turn5-confirm-off-a` 128/132, `turn5-confirm-off-b` 131/132,
`turn5-resolve-off-a` 58/196, `turn5-resolve-off-b` 196/196,
`turn5-resolve-off-c` 195/196, `turn13-switchin` 242/242,
`turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each. Six new
Tier-1 pin blocks in `tests/battleScene.test.ts` (two for
`suppressSitrusStars`, four for the retimed gates, including direct pins
on both constants' new literal values). `drawTurn5RockSlideWindow` is now
exported (was file-private) — the same shape `drawTurn5RockSlideAttack`
already used for its own `suppressSitrusRotate` tests. `npm test`
(1,067 files / 10,086 passed, +7) and `npm run build`/`npm run typecheck`
green.

**Remaining, still open:** tick 6850 and tick 6996 (both above, unchanged,
deliberately not chased). `resolve-off-a`'s own 6398 residual and the
6248-6365 static-background span (ISSUES #97 sub-entries I/J,
side-lane territory), and `resolve-off-c`'s 6763 residual, are all
untouched by this entry.
