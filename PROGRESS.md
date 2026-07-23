# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 324 — S8 swap action fade/slide: **GREEN — 36/36 exact**

- **State:** `battle1-swap-player-options.json` now captures every frame from
  the selected-player A edge through the completed CANCEL offscreen slide at
  **36/36 exact**. Tier-1 is **1177/1177** and build passes (**5.546 MB**);
  the prior player-picker trace remains **101/101 exact**.
- **Did:** implemented the distinct BG2 action-text fade using exact GBA
  5-bit arbitrary-target palette math, the source `tXIncrement=6` CANCEL OBJ
  slide/window clear, and the selected ball's intervening 8-frame source
  commands. All clocks are relative to the player-options phase edge.
- **Next:** continue at edge **+36** (oracle tick **29738**), where the
  mon-picture window begins as a 1-pixel aperture, then expands before the
  settled player options popup. Preserve the 36/36 prefix.
- **Notes:** first excluded frame 29738 differs by exactly 1 pixel in the new
  mon-picture aperture. No screenshot assets, absolute ticks, battle/turn
  render branches, trace thinning, controller changes, or Battle-2 work.

---
## 323 — S8 swap player-options opening edge: **GREEN — 6/6 exact**

- **State:** the live relative adapter now carries the player-options phase
  clock into rendering and starts the selected slot-0 ball's source-table
  animation after the input-ready picker. The explicit-OFF
  `battle1-swap-player-options.json` is **6/6 exact** for every frame
  currently claimed (A edge through the last unchanged CANCEL frame).
  Tier-1 is **1175/1175** and build passes (**5.545 MB**).
- **Did:** added a phase-relative selected-ball epoch, live render wiring,
  and Tier-1 coverage. No screenshots, absolute ticks, or controller changes.
- **Next:** continue at player-options edge **+6** (oracle tick 29708):
  `SWAP_WIN_ACTION_FADE` begins fading CANCEL toward gray, followed by its
  source `tXIncrement=6` offscreen slide, then the mon-pic/popup reveal.
  Do not reuse the draft mon-pic clock from edge 0; the swap task has this
  distinct pre-reveal transition.
- **Notes:** a broader local reuse attempt was rejected and removed after
  dense comparison exposed the separate action-fade phase. Enemy picker,
  accept popup, accepted exit/message, and post-swap GROVYLE continuation
  remain open.

---
## 322 — S8 live swap-YES player-picker prefix: **GREEN — 101/101 exact**

- **State:** offer YES now enters the presentation-acknowledged swap controller;
  the explicit-OFF `battle1-swap-player-picker.json` is **101/101 exact** over
  every frame from the held offer through the input-ready player picker.
  Tier-1 is **1175/1175** and build passes (**5.545 MB**).
- **Did:** added a relative accepted-edge adapter, source-table ball motion,
  code-native/extracted picker compositor, canonical player/offered parties,
  and live input wiring. The entry gate (+99), player-options (+79),
  enemy-picker (+199), accept (+99), mutation, and preserved NO path are
  Tier-1 pinned. No screenshots or absolute-tick render branches were added.
- **Next:** extend the same state-driven adapter through player options, party
  slide, enemy picker, accept popup, accepted exit/message, and continuation.
  Do not expose hard-coded ONIX after the accepted GROVYLE mutation.
- **Notes:** the committed exact trace claims the complete entry/picker dynamic
  window only; options/enemy/accept/exit pixels and post-swap Battle-2 identity
  remain open. Controller state already reaches accepted GROVYLE.
