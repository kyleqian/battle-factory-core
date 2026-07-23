# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 276 — Supervisor accepted (ISSUES #37 rung 3): **GREEN — visible forced-switch player ball only**

- **State:** independently accepted: canonical `turn15-sendout-rung3.json` is **46/46 exact**
  (20345--20390); delayed counterpart is **46/46 exact** (20375--20420).
  The frozen party traces remain 200/200 and rung-2 traces 43/43.
- **Did:** corrected the dossier's owner conflict from fresh OAM/callback/
  VRAM evidence: slot 6 tile 405/palette 6 is the player Poké Ball, not
  Brendan (no Brendan sprite is live). Re-anchored the source ball callback
  state machine to `sendOutElapsed`, including the ROM Q8.8 sine table; no
  absolute trace branch, asset frame replay, or MAGBY/particle/healthbox pixel.
- **Next:** #37 rung 4 only: MAGBY/materialization/particles. Rendered
  MAGBY pixels already begin at 20391 (delayed 20421), so do not reopen this
  ball-only endpoint or rely on the dossier's old 20400 label.
- **Notes:** supervisor reran Tier-1 **1011/1011**, build (**5.400 MB**), verifier **17/17**,
  compositor **5/5**, frozen party **200/200** each, and frozen rung-2
  **43/43** each are all green. PAPERCUT: the direct OAM probe emits
  multi-megabyte mGBA diagnostics despite producing valid JSON, ~2 min.

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

---
