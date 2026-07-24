# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 337 — Animation dependency/composition pivot: **GREEN — 354 moves mapped**

- **State:** move acceptance remains **4 exact / 8 partial / 264 unsupported**,
  but implementation work is now source-ranked by **935** reusable components
  and **3,190** move/component edges across all **354** Emerald moves.
- **Did:** generated the animation-script call/dependency graph, added
  component leverage and related-move reporting, and introduced overlapping
  component tracks. The first track treats FIRE PUNCH as an exact punch
  chassis for ICE/THUNDER overlays without excluding those moves from other
  elemental tracks. Also fixed and pruned eight compare/probe/launcher
  papercuts.
- **Next:** animation: work the `elemental-punch` track and independently
  accept ICE/THUNDER windows. Main: implement the later LOSS record menu or
  seventh-win summary; do not resume Battle 2.
- **Notes:** graph regeneration and coverage validation are byte-for-byte
  tested. Tier-1 is **1229/1229** and build remains **5.651 MB** because the
  graph is dev-only; no gameplay/RNG/facility behavior changed.

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
