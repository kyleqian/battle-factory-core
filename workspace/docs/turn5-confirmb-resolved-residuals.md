# ISSUES #97 remainder: `turn5-confirm-off-b` and `turn5-resolve-off-d`'s untraced residuals

Side-lane instrument session, Battle Scene OFF oracle, at commit `f139b934`
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

## 3. Baselines (measured fresh this session, commit `f139b934`)

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
`90edc2a6`. (A)'s `battleScene.ts:14888`-era one-line change (current line
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
