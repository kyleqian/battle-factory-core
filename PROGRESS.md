# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 331 — S8 OFF enemy-screen switch/picker: **GREEN — 130/130 exact**

- **State:** SWAP now reaches the input-ready five-action enemy picker and
  stops before mon selection. Dense OFF trace
  `battle1-swap-enemy-picker.json` is **130/130 exact**, including the first
  accepted LEFT edge and its action-4 highlight.
- **Did:** implemented source-named `Swap_Task_SwitchPartyScreen`, three
  independent ball cycles, `Swap_InitActions(SWAP_ENEMY_SCREEN)` (3→5),
  GROVYLE/MURKROW/PIDGEOTTO identity/order, staggered PKMN-FOR-SWAP/CANCEL
  slides, labels/category/species, and
  `Swap_Task_ScreenInfoTransitionIn` → `HandleChooseMons`. LEFT/RIGHT wraps
  all five actions with category/species/OAM copy lag; the selected-ball and
  species tasks retain ownership.
- **Next:** implement the distinct eligible enemy-mon A path through
  `Swap_AskAcceptMon`; stop at its input-ready YES/NO prompt before a choice.
- **Notes:** Tier-1 **1199/1199**, build **5.556 MB**. B-close, popup,
  options, and picker remain **59/59**, **44/44**, **58/58**, **101/101**.
  No absolute-tick, battle-number, screenshot, or captured-asset path.

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
  copies retain their observed VBlank ordering. Parallel source/RAM probes pin
  the enemy accept YES commit at tick 30021 and NO/B return at 30087, and stage
  the opposite-side GROVYLE→ONIX FIRE PUNCH geometry/outcome.
- **Next:** implement the distinct SWAP transition into the input-ready enemy
  picker through canonical tick 29935; stop before accept-prompt rendering.
- **Notes:** supervisor verification is Tier-1 **1196/1196**, build
  **5.551 MB**, B-close **59/59**, portable FIRE PUNCH **225/225**. The
  opposite-side move remains evidence-only/`partial`; no deferred decision.

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
