# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 328 — S8 player-options popup: **GREEN — 44/44 exact**

- **State:** the source-relative player-options seam is complete through the
  settled popup and DOWN cursor response. The new dense OFF trace
  `battle1-swap-player-options-popup.json` is **44/44 exact**; prior options
  and picker traces remain **58/58** and **101/101**.
- **Did:** opened input at `playerOptions +56`, reused the mon-picture clock
  for popup text at `+58` and highlight settle at `+59`, added the one-VBlank
  logical/display cursor handoff, and dispatched A/B to `summaryFade`,
  `playerPickerReturn`, or `enemySwitch`. Screen-ball and selected-ball loops
  remain separate phase-relative clocks. Merged source-extracted terminal
  message/fanfare gates and a deterministic ONIX→GROVYLE Scene-ON FIRE PUNCH
  staging probe; the latter remains `partial`, not a pixel-acceptance claim.
- **Next:** implement exactly one next distinct path: summary fade/screen,
  popup B-close/player-picker return, or enemy-screen switch presentation.
- **Notes:** supervisor merged/verified all three lanes: Tier-1 **1189/1189**,
  build **5.547 MB**; FIRE PUNCH canonical regressions **227/236** (known
  residual) and **200/200**. No deferred decision or absolute-tick branch.

---
## 327 — S8 player-options popup handoff: **GREEN evidence checkpoint**

- **State:** the next OFF mechanism is source/oracle pinned without runtime
  changes. The popup first draws at options edge **+58** / tick **29760**
  with `SUMMARY / SWAP / RECHOOSE` and default `SUMMARY`; the controller
  input gate opens at **+56**.
- **Did:** dense edge probes prove +55 B rejected, +56 A/B accepted, DOWN at
  +79 with visible cursor response at +80, and SWAP A at +99. Documented the
  exact `Swap_Task_HandleMenu`, summary, B-close, cursor, and enemy-screen
  dispatch paths in `docs/factory-swap-player-options-popup-probe.md`.
- **Next:** implement this single popup seam phase-relatively, preserving
  `battle1-swap-player-options.json` **58/58** and the picker **101/101**.
  Stop at the next distinct summary/B-close/enemy-screen presentation path.
- **Notes:** supervisor corrected one evidence-table tick typo (`29782`, not
  `29802`) against the probe's stated +80 offset. No deferred decision; S8
  unique-UI gate 2 remains the only reset gate open.

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
