# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 275 — Supervisor accepted (ISSUES #37 rung 2): **GREEN — field fade + complete MAGBY text only**

- **State:** independently accepted: canonical/delayed dense rung-2 traces are both **43/43
  exact** through their honest text-only endpoint; frozen party traces remain
  **200/200**. Tier-1 **1010/1010**, build green.
- **Did:** reused the 20302 indexed PPU field asset and real BLDY 15→0 ramp,
  then rendered the blank message box's `Go! MAGBY!` with the existing font,
  all relative to `sendOutElapsed`. Fresh oracle+OAM evidence puts the first
  visible closed-ball pixels at 20345 (not RAM's 20343), so traces end 20344
  (+30 delayed).
- **Next:** #37 rung 3 only begins at visible Brendan/ball ownership; do not
  extend this text-only renderer into trainer, ball, MAGBY, or healthbox work.
- **Notes:** supervisor reran Tier-1 **1010/1010**, build (**5.398 MB**),
  frozen party traces **200/200** each, both rung-2 traces **43/43**, verifier
  **17/17**, and compositor **5/5**. PAPERCUT: direct dense oracle inspection
  needs a custom in-memory trace override because the frozen trace is capped, ~2 min.

---
## 274 — Supervisor accepted (ISSUES #37 rung 1): **CLOSED — raw split exit OBJ composition**

- **State:** independently accepted: canonical and delayed dense party traces are both **200/200 exact**;
  the 20302/20332 raw field boundary remains exact. Tier-1 **1009/1009**,
  build green, SEND OUT verifier **17/17**, party compositor **5/5**.
- **Did:** extracted 33 indexed OBJ tiles, raw BGR555 palette and transferred OAM
  for exit status 1--2 / balls 6--9; erased those ownership pixels from only
  exit chrome. Composed balls → live icons → status; the fade mask uses raw
  transparency too, fixing the five status-backing pixels and ball palette family.
- **Next:** #37 rung 2 only: battle fade + `Go! MAGBY!` text, after fresh dense
  ground truth. Do not reopen rung 1.
- **Notes:** supervisor reran both dense traces, Tier-1 **1009/1009**, build
  (**5.398 MB**), verifier **17/17**, and compositor **5/5**. Asset audit
  confirms only indexed OBJ/OAM/palette state. Tier-1 pins lower-index-wins
  ordering. PAPERCUT: direct mGBA probe emits megabytes of diagnostics, ~2 min.

---
## 273 — Supervisor accepted (ISSUES #37 rung 1): **GREEN EVIDENCE CHECKPOINT — live OBJ transfer not yet safely wired**

- **State:** independently verified accepted baseline: canonical/delayed party traces **193/200**; only
  5px at 20248/50/58/60/62 and 273px at 20253/54 (delayed +30). The exact
  20302/20332 raw field boundary remains untouched.
- **Did:** fresh direct PPU probe confirms exit OAM stays static: status OBJ entries 1/2
  (bank 0, tile 0) and party-ball entries 6--9 (bank 1, tiles 2--33). A raw
  layer wiring experiment was reverted after it regressed 16 frames (451--642px):
  OAM order proves balls sit behind the icon OAM while status sits in front,
  so a single post-icon OBJ pass is structurally wrong.
- **Next:** split raw exit OBJ composition at actual OAM priority/order (balls before
  MAGBY/BAYLEEF icons; status after), then use indexed tile/palette state only. Preserve
  the existing press-relative fade and do not change 20302.
- **Notes:** supervisor reran Tier-1 **1008/1008**, build, and both dense
  traces; direct hardware OAM independently confirms balls 6--9 behind
  icons 3--5 and status 1--2 in front. The failed compositor was fully
  reverted; verifier **17/17** and party compositor **5/5** remain green.

---

---
