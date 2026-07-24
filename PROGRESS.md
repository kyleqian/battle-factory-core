# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 332 — S8 OFF enemy accept prompt: **PARTIAL — 51/66 exact**

- **State:** eligible GROVYLE A now runs phase-relatively from the input-ready
  five-action picker through `Swap_AskAcceptMon`, the blended mon-picture
  opening, and the first input-ready `Swap_Task_HandleYesNo` boundary at
  +64. The dense OFF trace `battle1-swap-enemy-accept-prompt.json` is
  **51/66 exact**; no YES, NO, or B choice is processed.
- **Did:** added the two-button transition-out, accept text handoff at +41,
  enemy front-sprite lookup, GROVYLE aperture/sprite, YES/NO popup, and
  prompt gating. Tier-1 rejects enemy A at switch +132, accepts it at +133,
  and rejects prompt A at +63 before readiness at +64.
- **Next:** close exactly #39's 15-frame render remainder: tick 29936's
  selected-species window-copy edge, the blended-flash/gray-ball overlap at
  29978--29990, and tick 30000's first YES/NO copy/OAM transient. Then stop
  again before any prompt choice.
- **Notes:** Tier-1 **1204/1204**, build **5.562 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. This is an honest partial, not S8 acceptance;
  no tick/frame lookup, screenshot, runtime oracle asset, or terminal path.

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
