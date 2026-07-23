# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 326 — S8 swap player mon-picture reveal: **GREEN — 58/58 exact**

- **State:** `battle1-swap-player-options.json` is now **58/58 exact** from
  the selected-player A edge through the complete mon-picture aperture/reveal.
  Supervisor verification is **1178/1178**, build **5.546 MB**, the player
  picker remains **101/101**, and shared draft mon-picture regression is
  **38/38**.
- **Did:** reused the source-relative `OpenMonPic` task cadence with the swap
  screen's first-open flat flash, one-pixel WIN0 aperture, vertical reveal,
  and screen-local three-ball centers. The shared renderer keeps its existing
  six-ball defaults.
- **Next:** continue at tick **29760** / options edge **+58**, where the
  distinct settled options popup first appears. Then cover option input,
  enemy picker, accept/exit/message, and post-swap identity.
- **Notes:** S8 gates 1 and 3 remain complete; unique-UI gate 2 remains open.
  Preserve both exact swap prefixes and keep presentation clocks phase-relative.

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
