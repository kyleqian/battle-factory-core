# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 277 — Bounded worker (ISSUES #37 rung 4a): **CHARACTERIZED, NOT LANDED**

- **State:** no renderer change committed. Direct canonical OAM/VRAM probe
  confirms MAGBY's affine allocation at 20389 but first framebuffer ownership
  at **20391**; the clean particle callback is already staggered there. The
  forbidden player-healthbox boundary remains **20407** (delayed +30).
- **Did:** tested a `sendOutElapsed`-anchored reuse of MAGBY's battle-back,
  emerge/tint, BG ramp and clean particles. It reached 9/16 exact at best;
  20396--20402 retain small, uncharacterized affine/particle residuals, so
  the prototype and its traces were removed rather than curve-fit.
- **Next:** rerun the direct probe narrowly over 20396--20402 with transferred
  affine OAM plus particle OAM ordering/palette evidence before another rung-4a
  implementation. Do not enter healthbox, clear, or menu work.
- **Notes:** baseline restored clean before final verification. PAPERCUT:
  direct OAM probing emits multi-megabyte mGBA diagnostics for a 4.8MB JSON,
  ~3 min.

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
