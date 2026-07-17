# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #3 — Draft-screen transitions not frame-exact under every-frame capture

**Symptom:** `npm run compare -- tools/compare/traces/draft-menu-slot6.json`
(committed; LEFT-wrap to slot 6 = QUILAVA, open menu, DOWN, B-close, captures
EVERY frame 0-65) → **58/66** (was 40/66). The S2 traces that pass
(draft-menu.json 38/38, draft-cursor.json 13/13) capture every ≤4 frames and
skip exactly these transient frames.

**Fixed this pass** (see `src/engine/monPic.ts`, `tests/monPic.test.ts`):
former f8-f19 and f20-f26 clusters, both root-caused to the ball-open
sequence. Two bugs, previously conflated as one "variant" axis:
- The flash bar's flat-vs-blended color tracks whether BLDCNT has *ever*
  been configured this session (independent, persistent flag), not the
  hasActed-based timing variant — draft-menu-slot6.json presses LEFT before
  the session's first-ever open, decoupling the two for the first time.
- That same case also needs its own window-growth timing table ("variant
  C"): same 12-tick flash phase as variant A, but the hold/skip in the
  window-growth ramp sit at different ticks than either A or B. Pinned from
  dense (every-frame) oracle probing of this trace, analogous to how A/B
  were originally pinned from draft-menu.json.

**Still failing (not attempted further this pass — all in
`Select_Task_HandleChooseMons`/`Select_Task_HandleMenu`'s redraw scheduling,
not the mon-pic sub-state machine touched above):**
- f1-f3 (537/373/240px, settles by f4): cursor-move (LEFT) redraw
  transient — diff bbox spans the title/category/species text (y4-24) AND
  the ball-cursor-arrow row (y80-92). We swap the slot cursor and header
  text atomically on the input tick; the real game visibly redraws over
  ~3 ticks. Matches the "settled by input-frame+4" timing already noted in
  ROADMAP Domain notes but never modeled. Needs its own incremental-redraw
  sub-state (old text/cursor lingering or partially overwritten while new
  content draws in) — likely worth probing with a dedicated dense
  single-move trace (e.g. LEFT only, no A/DOWN/B) to isolate it from the
  mon-pic machinery before generalizing.
- f37-f38 (1635px, settles by f39): menu-nav (DOWN) redraw transient —
  same root cause as f1-f3 but for the SUMMARY/RENT/OTHERS highlight bar
  (bbox x182-239/y112-143): oracle still shows the highlight at the OLD row
  (y112) on the input tick while ours has already jumped to the new row
  (y128); settles 2 ticks later. Likely shares a mechanism with the f1-f3
  cursor case (both are "we move instantly, the game animates/redraws over
  ~2-3 ticks") — worth solving together.
- f44 (2128px), f47-f48 (512px): close-phase transients. f44's diff bbox
  (x94-239/y40-143) covers nearly the whole right half of the screen
  (QUILAVA front sprite region + the SUMMARY/RENT/OTHERS box + message
  strip), suggesting several close-phase effects land the same tick. A
  quick probe of the close window's shrink sequence (dense, column x=100)
  did NOT show the clean/expected CLOSE_TABLE_B shape at every tick (e.g.
  f44 reads as "no window" against the closed-anchor baseline, which may be
  a probing-heuristic artifact rather than a real absence — the baseline
  diff trick used to derive the open-side variant C table is less reliable
  during close, since the close window's content isn't just "anchor
  background vs. blend" the way the pre-open screen was). Needs a
  dedicated dense probe of just the close phase (open a slot, wait for
  steady, then B, captureFrames every tick) with the actual pixel/window
  values inspected directly rather than diffed against frame 0.

**Lead:** all three remaining clusters are redraw-*scheduling* transients
(the underlying end-state is already correct — only 8 of 66 frames now
differ, all transient), not missing mechanisms; probe each with a
tight, single-purpose dense trace (isolate LEFT-only, DOWN-only, and B-only
transitions from a steady state) before trying to fix them against the
combined slot6 trace directly.
