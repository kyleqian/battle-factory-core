# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 315 — S8 Battle 2 turn 1 33030-prefix probe: **GREEN — evidence only**

- **State:** oracle-only Battle 2 first-turn evidence is committed; no
  runtime engine/test/accepted-trace changes. Baseline remains **1118/1118**
  and build green.
- **Did:** normalized `battle2-turn1.json` to the exact action-menu prefix
  ending 33030 (never inherits the later DOWN/B round trip), then fresh
  twice-ran oracle/RAM/task/bar/AI probes. Edges are A 33031 (open) and A
  33071 (confirm ROCK SLIDE); ROCK SLIDE hits KABUTO 91→63, KABUTO uses
  SAND ATTACK (ONIX accuracy 6→5, no damage), next menu reveals/input-ready
  at 33614. 169 capture manifest is twice-run identical to 33671.
- **Next:** S8 stays `[ ]`; do not implement this turn from this worker
  checkpoint without a separately assigned engine step.
- **Notes:** trace `tools/compare/traces-groundtruth/battle2-turn1.json`,
  source/RAM ledger `docs/battle2-opening-notes.md`; no fitting, harvest,
  absolute-tick lookup, capture thinning, or second-turn input.

---
## 314 — S8 Battle 2 FIGHT submenu round-trip: **GREEN — 32848-33056 exact**

- **State:** extended `battle2-action-menu-dense.json` is **209/209 exact**
  through the resettled Battle-2 action menu. Intro remains **251/251**,
  KABUTO **151/151**, player send-out **170/170**, and Battle-1 send-out
  **255/256** (#18 only). Tier-1 is **1118/1118**; build passes
  (**5.519 MB**).
- **Did:** reused generic FIGHT state/chrome/text with menu-relative clocks
  on the live JENSON field; canonical A opens ONIX's full-PP moves, DOWN
  transitions ROCK SLIDE→DRAGONBREATH, and B closes without confirming.
  Added Tier-1 pins for the 32901 A gate, moves/PP, display lag, and close.
- **Next:** S8 stays `[ ]`; continue only with a separately assigned
  Battle-2 turn, swap-YES, or later round-loop increment.
- **Notes:** canonical interaction edges: A 33031, submenu blank 33036,
  reveal 33037, DOWN 33040/display 33042, B 33044, action-menu return
  33051. Commits `33bd561`, `94f6c31`; no harvest, fitting, thinning,
  confirm, or absolute-tick framebuffer cases.

---
## 313 — S8 Battle 2 first action menu: **GREEN — 32848-33030 exact**

- **State:** `battle2-action-menu-dense.json` is **183/183 exact** across
  canonical 32848-33030, including two predecessor-overlap frames. KABUTO
  remains **151/151**, player send-out **170/170**, intro **251/251**, and
  Battle 1 send-out **255/256** (#18 only). Tier-1 is **1115/1115** and
  build passes (**5.519 MB**).
- **Did:** composed the Battle 2 field live from KABUTO/ONIX sprites and
  91/91 + 117/117 healthboxes, reusing only shared action-window chrome;
  added encounter menu state, input boundary, and on-demand RNG/exec-state
  reducers/tests. No Grovyle full-frame base or canonical-tick lookup.
- **Correction:** exact canonical replay disproves the old 32850/32856
  ledger: ONIX's inherited shake finishes 32850-32854, `Go! ONIX!` holds
  through 32894, the six clear frames are **32895-32900**, and the atomic
  input-ready menu reveal is **32901**.
- **Next:** S8 stays `[ ]`; continue only with a separately assigned Battle
  2 action/turn or swap-YES/round-loop increment. This worker stops at the
  held FIGHT menu and does not consume input.
- **Notes:** RNG is flat through 32893, then +1 at 32894, +2 at 32898, +5
  at 32900; endpoint is 3530724670 with execFlags=1. Commits `2f7b284`,
  `1d3d295`; no harvest, fitting, thinning, or absolute tick cases.

---
## 312 — S8 Battle 2 player send-out: **GREEN — 32680-32849 exact**

- **State:** `battle2-player-sendout-dense.json` is **170/170 exact**
  across canonical 32680-32849. Predecessors remain KABUTO **151/151** and
  intro **251/251**; Battle 1 send-out remains accepted at **255/256**
  (frame 1496, 3px, #18 only). Tier-1 is **1110/1110** and build passes
  (**5.517 MB**).
- **Did:** separated the handoff-relative `Go! ONIX!` printer from Battle
  2's inherited player-controller visual clock. Brendan, party summary,
  thrown-ball arc/spin/open/hide, ONIX materialize/back animation, particles,
  and the 117/117 healthbox all reuse the Battle-1 mechanisms at visual
  delay +45; callback-age 14 advances only the summary eva coefficient.
- **Audit:** independent live RAM/IO replay now proves that sole exception:
  32741 has the shared task/sprite state but immediate `BLDALPHA=0x0808`;
  mapped Battle-1 1588 has its `0x0808` write buffered behind live `0x0709`,
  reconverging at the next callback. See `battle2-opening-notes.md`.
- **Next:** resume at **32850**, the first six-tick blank action-menu frame,
  then compose the Battle 2 ONIX/KABUTO action menu. Do not reopen the exact
  send-out span. S8 remains `[ ]`.
- **Notes:** visual mappings are 32727→1574 (throw starts), 32760→1607
  (ball first visible), 32768→1615 (spin), 32805→1652 (open), and
  32820→1667 (healthbox first visible); summary eva's sole phase boundary is
  canonical 32741 / callback age 14. No harvest, absolute-tick lookup,
  fitting, thinning, or work at 32850+.
