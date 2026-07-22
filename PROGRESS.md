# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 270 — Bounded worker (ISSUES #37 rung 1): **GREEN HELPER CHECKPOINT — field transfer blocked**

- **State:** safe baseline retained: canonical/delayed **192/200**; the same
  seven party frames plus 20302/20332 remain. Tier-1 **1007/1007**, build
  **5.32 MB**, verifier **17/17**, party compositor **5/5**.
- **Did:** direct probe now captures selected raw BG char/map, palette RAM,
  window registers and OBJ VRAM; added compact extractor + generic tested
  mode-0 tile/OAM/BLDY compositor. Attempted 20302 integration, observed
  **38400px** mismatch, and reverted it rather than ship a regression.
- **Next — SUPERVISOR SOURCE CHECK:** reconnect the indexed asset using
  mGBA `software-private.h`'s exact 32-bit `_darken`: `mColorFrom555` expands
  first, then each packed byte is darkened/masked in place. At BLDY 15 this
  makes white `255,255,255 -> 16,15,15` (red rounds up; shifted green/blue
  truncate), exactly the oracle histogram. Also fix size-1 BG map extraction
  to 0x1000 bytes. Party residuals remain out of scope.
- **Notes:** raw dump JSON validates despite expected exit 139. PAPERCUT:
  mGBA diagnostics/teardown SIGSEGV, ~4 min.

---
## 269 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — raw field asset still required**

- **State:** restored and committed-green at the existing rung-1 checkpoint:
  canonical **192/200** (5px 20248/50/58/60/62; 273px 20253/54; 38400px
  20302). The palette-only experiment did not reduce this set safely.
- **Did:** re-ran the direct probe (valid 1.5 MB JSON despite expected exit
  139) and traced the five pixels to the top MAGBY/status overlap and the
  273px family to party-menu ball bank1/index15. A direct blue substitution
  merely shifted that family to 20252/53; swapping the screenshot overlays
  expanded it into 13--204px sprite diffs. Both were reverted.
- **Next — SUPERVISOR DECISION:** the authorized worker stopped before the
  central field task, so split it out: extract/compose BG char/map/palette +
  field OAM for 20302 only and improve both traces **192→193/200**. Party-
  menu OAM/palette residuals are a later increment. Do not use screenshot,
  overlay/mask, or RGB-candidate fitting.
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
