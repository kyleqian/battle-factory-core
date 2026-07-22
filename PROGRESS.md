# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 269 — Bounded worker (ISSUES #37 rung 1): **PARKED GREEN — raw field asset still required**

- **State:** restored and committed-green at the existing rung-1 checkpoint:
  canonical **192/200** (5px 20248/50/58/60/62; 273px 20253/54; 38400px
  20302). The palette-only experiment did not reduce this set safely.
- **Did:** re-ran the direct probe (valid 1.5 MB JSON despite expected exit
  139) and traced the five pixels to the top MAGBY/status overlap and the
  273px family to party-menu ball bank1/index15. A direct blue substitution
  merely shifted that family to 20252/53; swapping the screenshot overlays
  expanded it into 13--204px sprite diffs. Both were reverted.
- **Next:** extract the real party-menu OAM tile/palette bank (not a
  screenshot-restored chrome color) and compose it by raw index/priority;
  then extract BG3 charbase2/screenbase26 plus field OAM for 20302. Do not
  use overlay/mask or RGB-candidate fitting.
- **Notes:** no production changes shipped. PAPERCUT: valid mGBA probe ends
  SIGSEGV 139, ~3 min.

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
- **Next — USER DECISION 2026-07-22:** use supervisor judgment; authorized
  the recommended further bounded, probe-guided worker. Fix the RAM-proven
  party palette entries and extract/compose the real register-derived 20302
  field, then require both traces **200/200**. The field is also prerequisite
  to rung 2. Do not alter phase timing or ship color/mask fitting.
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
