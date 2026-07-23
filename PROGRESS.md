# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 279 — Supervisor wind-down (ISSUES #37 rung 4a): **GREEN, ESCALATION REQUIRED**

- **State:** accepted rung-3 renderer is unchanged and the tree is clean.
  Supervisor Tier-1 **1011/1011** and build (**5.400 MB**) remain green; the
  six frozen traces were exact at the preceding checkpoint.
- **Did:** a second consecutive worker did not land rung 4a. It confirmed the
  particle ownership as OAM slots 5--16, palette 7, tiles 417--419 around
  (68,117), but its 38-minute cap failed to stop it and it produced no commit;
  supervisor interrupted it during deadline wind-down.
- **Next:** after user direction, resume with one narrow worker deriving the
  stagger/identity reducer from those transferred OAM rows, still requiring
  canonical/delayed 20391--20406 to be 16/16 exact before healthbox work.
- **Question:** two workers have now failed this same step. May the next
  session make one more OAM-derived rung-4a repair attempt as recommended?
- **Notes:** no uncommitted worker edits existed when stopped. Worker logs:
  `/tmp/warm-bison-sendout-rung4a.jsonl` and `...-repair.jsonl`.

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
