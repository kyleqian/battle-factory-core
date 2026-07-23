# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 316 — S8 Battle 2 turn 1 ROCK SLIDE: **GREEN — through 33331**

- **State:** `battle2-turn1-rockslide.json` is **191/191 exact** through the
  last ONIX-owned frame 33331. Tier-1 is **1126/1126**; build passes
  (**5.522 MB**). S8 remains `[ ]`.
- **Did:** stored A 33071, resolved ONIX first, committed PP 10→9 and the
  three-call accuracy/spread/non-flinch RNG stream, rendered the full shared
  ROCK SLIDE animation on live ONIX/KABUTO, and drained/committed KABUTO
  91→63. Pure tests pin 19→28 noncrit damage and the 33331/33332 boundary.
- **Next:** resume exactly at **33332**, where KABUTO becomes attacker with
  current move SAND ATTACK. That handoff and everything later are unclaimed.
- **Notes:** captures include every frame 33115-33181 and 33270-33331 plus
  sparse mid-animation anchors. Battle-2 action/menu/send-outs/intro/
  transition/rooms remain exact; Battle-1 send-out remains **255/256**
  (#18 only). No framebuffer lookup, harvest, fitting, or thinning.

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
