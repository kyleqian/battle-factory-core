# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 335 — S8 OFF accept NO/B return: **GREEN — 69/69 + 69/69 exact**

- **State:** A-on-NO and B share the source response/close/transition path and
  restore the input-ready enemy picker at response +67 / canonical 30087.
  Dense OFF traces `battle1-swap-enemy-accept-no-return.json` and
  `battle1-swap-enemy-accept-b-return.json` are both **69/69 exact**.
- **Did:** added a distinct `acceptReturn` phase with the popup BG/OAM erase
  lag, variant-B mon-picture close, staggered enemy action-button return,
  palette restore, and `Swap_Task_HandleChooseMons` gate. Tier-1 covers both
  controls, rejects response +66, accepts +67, preserves selected identities
  and byte-for-byte party/rentals, and keeps the round decision seam null.
- **Next:** implement one source-pinned S8 gate-2 terminal UI edge: loss or
  seventh-win/round-summary. Do not traverse later field/battle flow or resume
  the retired Battle-2 march.
- **Notes:** Tier-1 **1219/1219**, build **5.571 MB**. YES exit, prompt,
  enemy picker, B-close, popup, options, and player picker remain **43/43**,
  **66/66**, **130/130**, **59/59**, **44/44**, **58/58**, and **101/101**.
  No mutation, script handoff, absolute tick/frame lookup, or screenshot path.

---
## 334 — S8 OFF default-YES accept/exit: **GREEN — 43/43 exact**

- **State:** default YES is exact from the first sampled prompt edge through
  `CB2_ReturnToFieldContinueScript` at response +41 / canonical 30041. Dense
  OFF trace `battle1-swap-enemy-accept-exit.json` is **43/43 exact**; the
  input-ready accept prompt remains **66/66**.
- **Did:** added source-owned accept-response/mon-picture-close/exit phases,
  `gSpecialVar_Result=FALSE` at +20, selected-record ONIX→GROVYLE commit at
  +21, all-palette fade, and an explicit field-script handoff. Tier-1 rejects
  the +63 A, proves no early mutation, pins rental monId 188 / PID 1094072807
  / IV 3 / ability 0 / friendship 0, and opens the round decision seam only
  after the atomic commit.
- **Next:** implement one distinct remaining S8 gate-2 edge: accept NO/B
  return to enemy input at 30087, or a source-pinned loss/seventh-win ending.
  Do not extend the retired Battle-2 march.
- **Notes:** Tier-1 **1215/1215**, build **5.568 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. No absolute tick/frame lookup, screenshot asset,
  canonical-party replacement branch, NO/B response, or post-handoff path.

---
## 333 — S8 OFF enemy accept prompt opening: **GREEN — 66/66 exact**

- **State:** the eligible GROVYLE branch is exact from the input-ready enemy
  picker through the input-ready YES/NO prompt at phase +64. Dense OFF trace
  `battle1-swap-enemy-accept-prompt.json` is **66/66 exact** without capture
  thinning; no YES, NO, or B response is processed.
- **Did:** modeled the selected-species copy against the prior hardware
  palette for one VBlank, corrected the later `OpenMonPic` affine/task epoch
  by two relative ticks so its full flash hands off to the gray-ball-aware
  degenerate WIN0 window, and separated immediate YES/NO BG copy from the
  next-OAM highlight. Tier-1 pins all three phase-relative boundaries.
- **Next:** implement one distinct accept response/exit seam (YES commit or
  NO/B return) with dense OFF evidence; retain the +64 input-ready boundary.
  S8 unique-UI gate 2 also still needs loss and seventh-win ending pixels.
- **Notes:** Tier-1 **1210/1210**, build **5.565 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. #39 is fixed and pruned; no absolute tick,
  frame table, screenshot asset, response handling, or Battle-2 march.
