# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 285 — Bounded worker (S7 turn 16 rung 1): **GREEN — cross-layer handoff**

- **State:** canonical `20745--20825` and delayed `20775--20855` are both
  **81/81 exact**. Rung 6 remains **195/195** each, rung 5 **144/144** each,
  rung 4a **16/16** each; turn-16 verifier (233 captures), Tier-1
  **1019/1019**, and build (**5.415 MB**) pass.
- **Did:** made completed forced SEND OUT reset turn 15's stale choice and
  return input to ordinary FIGHT state with MAGBY's real moveset; added
  open/confirm-relative submenu, bounce-freeze, and FAINT_ATTACK kickoff
  rendering plus contiguous canonical/+30 traces.
- **Next:** supervisor chooses the next increment. Scoped remainder begins at
  canonical **20826** / delayed **20856** (FAINT_ATTACK animation body);
  do not reopen exact send-out or rung-1 windows.
- **Notes:** implementation commit `de7e334`; both traces preserve their
  122-segment prefixes verbatim and the oracle-relative SHA streams are
  **0/81 mismatched**. No framebuffer assets, absolute-tick lookup, RGB
  fitting, trace branch, or excluded capture.

---
## 284 — Bounded worker (ISSUES #37 rung 6): **GREEN — issue closed**

- **State:** canonical `20551--20745` and delayed `20581--20775` are both
  **195/195 exact**. Rung 5 remains **144/144** each, rung 4a **16/16** each,
  verifier **17/17**, Tier-1 **1018/1018**, and build (**5.414 MB**) pass.
- **Did:** added the confirmation-relative six-frame blank-message phase,
  honest action-menu phase, fresh `menuIdleBounce` re-anchor, and dynamic
  standard-font `MAGBY do?` prompt; committed both contiguous 195-frame traces.
- **Next:** supervisor chooses the next open roadmap/issue increment; #37 has
  no remainder through its scoped frame 20745/20775 endpoint.
- **Notes:** implementation commit `61b4a5e`; unmodified A/B was **0/195**
  each. No screenshots, absolute ticks, per-frame tables, coordinate/RGB
  fitting, trace branches, or excluded captures.

---
## 283 — Bounded worker (ISSUES #37 rung 5): **GREEN — MAGBY healthbox/send-out**

- **State:** canonical `20407--20550` and delayed `20437--20580` are both
  **144/144 exact**. Rung 4a remains **16/16** each, verifier **17/17**,
  Tier-1 **1017/1017**, and build (**5.413 MB**) pass.
- **Did:** added a data-driven player-healthbox compositor (MAGBY, Lv50,
  female, 138/138), confirmation-relative create/populate/110→0 slide, and
  source `BACK_ANIM_SHAKE_GLOW_RED` reducer. Preserved the release particle
  stall/order and added task-data probing plus dense canonical/delayed traces.
- **Next:** #37 rung 6 starts at blank-box ownership: canonical **20551**,
  delayed **20581**. Build the blank hold and re-anchored action-menu bounce;
  do not reopen exact rungs 1--5.
- **Notes:** unmodified A/B was **0/144** each; no screenshots, per-frame RGB,
  absolute battle-tick tables, coordinate patches, or trace branches.
