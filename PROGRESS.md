# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 268 — Bounded worker (ISSUES #37 rung 1): **GREEN PROBE CHECKPOINT — exact palette/field blocker**

- **State:** baseline green: Tier-1 **1005/1005**, build **5.32 MB**.
  Rung 1 remains **192/200** in both party traces (delayed exactly +30):
  5px at 20248/50/58/60/62, 273px at 20253/54, full frame at 20302.
- **Did:** extended `dump-turn15-sendout.py` with all 32 unfaded/faded
  palette banks, actual PPU OAM, BG controls/scrolls and VRAM hashes; wrote
  the direct-state reproduction and attribution in
  `docs/turn15-sendout-notes.md`. The 273px pair is OBJ bank1/index15
  (`74,74,99 -> 41,41,57`), while the 5px is MAGBY icon bank4 entries 4/5.
  20302 proves the field compositor has switched to `DISPCNT=1f40`, BG3
  charbase 2/screenbase 26, not the frozen faint frame.
- **Next — INTERACTIVE ESCALATION QUESTION:** authorize one further bounded,
  probe-guided worker to fix the two RAM-proven party palette entries and
  extract/compose the real register-derived 20302 field, or park these eight
  residual frames and proceed with them excluded? **Supervisor recommends
  authorize:** the field is also prerequisite to rung 2, and the new dump
  removes the prior architectural ambiguity. Do not alter phase timing or
  ship color/mask fitting.
- **Notes:** production untouched; probe tool and docs are committed green.
  Supervisor independently reproduced the register/palette dump, Tier-1, and
  build. PAPERCUT: mGBA diagnostics + teardown SIGSEGV, ~3 min.

---
## 267 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — palette source blocker**

- **State:** supervisor independently verified and banked the safe partial
  implementation: Tier-1 **1005/1005**, build green at **5.32 MB**, oracle
  verifier **17/17**, compositor **5/5**. Canonical and delayed are both
  **192/200**, with the same eight frames at +30; rung 1 is not complete.
- **Did:** added a SEND OUT-edge-relative phase clock (hold → 16-frame
  fade → 39-frame generated black hold), live exit chrome/icon-frame logic,
  and the +57 dense capture windows in both party traces. Canonical confirms
  20245–47 and 20249/51/52/55–57/59/61/63–301 exactly; no absolute tick
  branch or full-screen replay asset was added.
- **Next:** corrective worker must probe real faded/unfaded palette and OAM
  state at the eight residual frames before editing. Close canonical + delayed
  to **200/200**; do not screenshot-fit or add absolute timing.
- **Notes:** residuals are 5px at 20248/50/58/60/62, 273px at 20253/54,
  and full-frame at 20302 (delayed +30). PAPERCUT: verbose compare output,
  ~2 min.

---
## 266 — Bounded characterization worker (ISSUES #37 post-SEND OUT): **READY FOR IMPLEMENTATION**

- **State:** **SUPERVISOR ACCEPTED** — post-confirm path is oracle/RAM-
  characterized only; no `src/` engine change. Independently reproduced
  **17/17 PASS** over 316 fresh dense oracle captures; party canonical +
  delayed remain **143/143**, Tier-1 **1004/1004**, build green.
- **Did:** added `docs/turn15-sendout-notes.md`, dense pixel verifier and
  RAM/OAM/VRAM dump. Pinned confirm/fade/black, field/text, Brendan+ball,
  particles/MAGBY tint, healthbox 268→158 slide, blank 20551–56, settled
  menu 20557 + bounce; recorded exact primitive-by-primitive reuse map.
- **Next:** implement #37 rung 1 only (submenu exit/fade/black), using its
  documented dense capture range; preserve no absolute tables/assets rule.
- **Notes:** RAM settles MAGBY 138/138, PP 15/20/10/20, cursor 0; healthbox
  pieces 1/63/62 slide -5 px/tick. PAPERCUT: mGBA emits megabytes of
  diagnostics unless redirected, ~2 min.

---
