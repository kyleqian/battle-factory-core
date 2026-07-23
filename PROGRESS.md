# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 330 — S8 OFF popup B-close/player-picker return: **GREEN — 59/59 exact**

- **State:** the evidence-pinned B path is complete from the `playerOptions`
  ready edge through restored `HandleChooseMons` input. The dense OFF trace
  `battle1-swap-player-options-b-close.json` is **59/59 exact**; popup,
  options, and picker regressions remain **44/44**, **58/58**, and **101/101**.
- **Did:** reject B through +57, accept at +58, run source-named
  `Task_CloseMonPic` → `SpriteCB_CloseMonPic` →
  `Swap_Task_ScreenInfoTransitionIn`, and restore `playerPicker` at +113
  with RIGHT accepted at +114. The selected-ball and species-breathe tasks
  retain their own clocks; the ball callbacks now continue through the full
  source animation command stream, and generic category/species/OAM cursor
  copies retain their observed VBlank ordering.
- **Next:** choose a distinct remaining unique-UI path (summary or
  player-SWAP/enemy picker). The next player-picker A/options reentry is not
  part of this increment.
- **Notes:** Tier-1 **1196/1196**, build **5.551 MB**, commit `85bf16a`.
  No issue pruned; no absolute tick, battle-number branch, or captured asset.

---
## 329 — S8 OFF popup B-close: **GREEN evidence checkpoint**

- **State:** the source-relative B-close → restored player-picker boundary is
  pinned without runtime changes. The true menu-state handoff is +57, with
  the first injectable B on the next frame (+58 / tick 29760); the generic
  return reaches `HandleChooseMons` at +113 / tick 29815.
- **Did:** captured every frame 29759--29981 from the committed prefix,
  inspected `Task_CloseMonPic`, `Swap_Task_ScreenInfoTransitionIn`, live
  task callbacks, WIN0V/DISPCNT, and proved a delayed RIGHT changes the
  restored picker cursor. Documented the separate selected-ball and
  species-breathe task ownership in
  `docs/factory-swap-player-options-b-close-probe.md`. Parallel evidence
  pins the enemy picker at mode +84, input +133, and accept-ready +197;
  the Scene-ON lane added a generic geometry/profile adapter and a portable
  ONIX→GROVYLE FIRE PUNCH case at **225/225 exact**.
- **Next:** implement only this generic phase-relative close/return seam;
  then leave the next player-picker-A/options boundary distinct. Preserve
  popup **44/44**, options **58/58**, and picker **101/101** regressions.
- **Notes:** supervisor verification is Tier-1 **1193/1193**, build
  **5.549 MB**; canonical FIRE PUNCH controls remain **227/236** (known
  residual) and **200/200**. No deferred decision or absolute-tick rule.

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
