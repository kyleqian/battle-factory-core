# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 278 — Supervisor accepted (ISSUES #37 rung 4a): **GREEN EVIDENCE CHECKPOINT**

- **State:** renderer remains at accepted rung-3 baseline; independent Tier-1
  **1011/1011** and build (**5.400 MB**) are green. Worker also reconfirmed all
  six frozen traces exact, verifier **17/17**, and compositor **5/5**.
- **Did:** accepted the direct boundary and rejected the non-exact prototype:
  MAGBY allocates at 20389, first owns pixels at **20391**, and the healthbox
  first owns pixels at **20407** (all delayed +30). Best lawful reuse was 9/16.
- **Next:** #37 rung 4a repair only: inspect transferred affine and particle
  OAM/order/palettes on 20396--20402, then require both 16-frame traces exact.
- **Notes:** no production, asset, extractor, or trace change survived the
  checkpoint. PAPERCUT: mGBA probe stdout spew, ~3 min.

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
