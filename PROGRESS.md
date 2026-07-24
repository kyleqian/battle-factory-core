# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 336 — S8 OFF terminal LOSS opening: **GREEN — 210/210 exact**

- **State:** the source-relative Factory Lobby LOSS path is exact from its
  staged `CB2_LoadMap` handoff through party restore/status clear at +210.
  `compare:factory-terminal-loss` covers every +1..+210 frame and both
  source A releases at +80/+160.
- **Did:** added an immutable `roundLost` terminal adapter, circular field
  map/NPC compositor, live fade/message/printer/down-arrow path, dev-only
  wrapped mGBA comparison fixture, and Tier-1 input/completion coverage.
  Completion acknowledges the presentation command at +210 without changing
  round rules/RNG. Source extraction now includes all field-visible NPCs and
  the regular down-arrow; corrected the terminal-message extractor root. The
  disjoint ON lane also promoted ENDEAVOR to exact across both attacker sides.
- **Next:** implement the distinct later LOSS record question/menu
  (+380..624), or the seventh-win/round-summary ending. Do not extend this
  opening past +210 as part of the same mechanism and do not resume Battle 2.
- **Notes:** dense LOSS **210/210**, Tier-1 **1223/1223**, build **5.651 MB**.
  Swap NO-return remains **69/69**. ENDEAVOR is portable **141/141** and
  canonical **237/237**; Level-50 animation coverage is **4 exact / 8 partial
  / 264 unsupported**. No screenshot/framebuffer asset, absolute tick branch,
  outcome mutation, BP change, record menu, or seventh-win flow.

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
