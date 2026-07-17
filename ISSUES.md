# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #5 — mon-pic close animation: window/blend content wrong for ~15 absolute ticks in a periodic bad window

**Symptom:** `renderFactoryDraftScreenFaded`/`renderFactoryDraftScreen`'s mon-pic
close animation (`monPic.ts` CLOSE_TABLE_B, driving `monPicRender.ts`'s WIN0
window blend) renders the wrong pixels inside the window (`x88-151`, the
central mon-pic-bg blend box) for several ticks of *some* closes but not
others - confirmed **independent of RENT/DESELECT** (S5): a bare `A` (open,
no DOWN) then `B` (close) with nothing else touched reproduces it too, so
this is not new code from S5's slice.

**Confirmed (dense oracle probing, `bin/oracle run`):**
- A popup opened at press-tick 0 then closed (`B`) at press-tick 30 is
  **0 diff** (`/tmp/s5-scout/bclose-check2.json`-style trace, not committed).
- The *same* open, closed at press-tick 31, is also 0 diff.
- Closed at press-tick 32 through roughly 46, the window's blended content
  diverges from the oracle for several ticks after the close starts (magnitude
  up to ~512px, always confined to the `x88-151` window box, shrinking as the
  window itself shrinks toward the end of the close sequence).
- Closed at press-tick 47+ (and separately confirmed at 50, 55), it's 0 diff
  again. `tools/compare/traces/draft-menu.json`'s own first close (3 DOWNs
  then B, landing well past press-tick 47) is unaffected by luck, not design
  - that's why this was never caught before.
- Ruled out: it's not about the DOWN press itself (a same-absolute-tick close
  with no DOWN at all reproduces the identical diff), not about
  `hasActed`/close-table variant (both the working and broken cases use
  variant A -> CLOSE_TABLE_B), and it's not a fixed function of ticks-since-
  close-started (the same `elapsed` value is fine at one absolute tick and
  broken at another).

**Leading suspicion (not confirmed):** `monPicBg` (the mon-pic-bg tileset
sampled by `monPicRender.ts`'s `bg3Color`) is rendered as a static tileset,
but its visible content is a striped/shimmer pattern that real hardware may
animate (palette cycling or similar) - `bg3Color` has no time/frame input at
all right now. A periodic ~15-tick "bad window" recurring every ~16-20 ticks
is consistent with an un-modeled cycling effect whose phase this code never
accounts for. Needs a dedicated dense probe of `monPicBg`'s own palette/tiles
in isolation (steady-state OPEN_STEADY window, no close in flight) across
~60+ frames to check whether anything there is changing frame-to-frame at
all before chasing the close-table interaction further.

**Impact on S5:** `tools/compare/traces/rent-slot1.json` cannot reach 0 diff
while its RENT confirm's close animation happens to land in a bad window
(confirmed unavoidable within the species-name-breathe budget - shifting the
confirm later to dodge one bad window landed in a *different* one further
out). The trace is committed anyway (dense, every-frame, 125/139 matching)
because the RENT/DESELECT state machine, palette swap, message-swap timing,
and the ball's idle/rocking animation's RNG stream are all independently
verified: the state machine and RNG stream via RAM-dumped `gRngValue`
checkpoints in `tests/rentSelect.test.ts`/`tests/ballAnim.test.ts` (hermetic,
no pixels, unaffected by this bug), and the ball animation's own pixels are
confirmed exact via the trace's frames 58-138 (fully outside any close
window). Picking a rent-slot1 press-tick that avoids the bad window (rather
than fixing the root cause) is the likely quick unblock for a future slice,
once the periodic pattern is pinned precisely enough to predict "safe" ticks
in general (not just by trial and error per trace).
