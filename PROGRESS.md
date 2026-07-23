# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 325 — S8 reset gates 1/3 complete; swap UI advancing: **GREEN**

- **State:** the generic seven-battle core and staged OFF portability proof
  complete reset gates **1 and 3**. Gate 2 is partial: the live swap-YES
  presentation is **101/101** through the input-ready player picker and
  **36/36** through its action fade/slide. Supervisor verification is
  **1177/1177**, build **5.546 MB**, and the staged turn is **16/16**.
- **Did:** landed source-exact indexes 0–6 trainer scheduling/RNG, round
  healing/win/loss/swap/completion control, source swap/terminal contracts,
  and a relative Scene-OFF staged turn seam. Closed the swap entry and action
  transition. The ON lane closed Murkrow transfer and FLY text timing
  (`turn14-fly-miss` **206/206**), proved the seven-frame FLY affine remainder
  unsafe to patch, and narrowed DRAGON_BREATH to compressed-only overdraw.
- **Next:** continue the OFF swap options at edge **+36** / tick **29738**:
  implement the mon-picture aperture, settled options, enemy picker,
  accept/exit/message, and post-swap identity. Then render the source-extracted
  loss and seventh-win endings. Do not resume the canonical Battle-2 march.
- **Notes:** no deferred decision. S8 remains `[~]` with only unique-UI gate 2
  open. Keep all clocks phase-relative and preserve the two exact swap prefixes.

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
