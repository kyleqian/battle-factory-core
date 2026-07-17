# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #3 — Draft-screen transitions not frame-exact under every-frame capture

**Symptom:** `npm run compare -- tools/compare/traces/draft-menu-slot6.json`
(committed; LEFT-wrap to slot 6 = QUILAVA, open menu, DOWN, B-close, captures
EVERY frame 0-65) → 40/66. The S2 traces that pass (draft-menu.json 38/38,
draft-cursor.json 13/13) capture every ≤4 frames and skip exactly these
transient frames.

**Failing clusters (diff PNGs inspected by supervisor):**
- f1-f3 (537/373/240px): cursor-move redraw transient — header text
  mid-redraw AND both the old (slot 1) and new (slot 6) cursor arrows
  differ; we swap atomically, the game redraws over 2-3 frames.
- f8-f19 (1,1,4,4,8,8,16,16,32,32,64,64px — doubling every 2 frames): the
  ball-open affine animation (`sAffineAnim_Select_MonPicBg_Opening` +
  `SpriteCB_OpenMonPic`) — the growing/zooming sprite phase before
  Task_OpenMonPic's window growth; we don't render it.
- f20-f26 (~512px steady): two ball-sized blobs left of center + slot-6
  arrow region — mon-pic bg sprite anim mid-open + cursor arrow state.
- f37-f38 (1635px): menu-nav (DOWN) window/highlight redraw transient.
- f44 (2128px), f47-f48 (512px): close phase — QUILAVA front sprite
  visibility/position during Task_CloseMonPic, a bottom-right message-box
  strip, and the shrink window.

**Lead:** the open/close INTERMEDIATE frames each have exact mechanisms in
battle_factory_screen.c (affine anim tables, sprite callbacks, per-frame
window regs, text print scheduling). Probe the oracle per-frame over each
cluster and implement the missing per-frame behavior; re-run the slot6
trace until 66/66.
