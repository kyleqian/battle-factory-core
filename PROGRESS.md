# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 286 — Supervisor wind-down (S7 turn 16 rung 2a): **CANONICAL GREEN; +30 REGISTER-RACE FRAME PARKED AS #38**

- **State:** canonical `20826--21046` is **221/221 exact**. The requested
  delayed twin is **220/221**: only delayed tick **21006** differs. Rung 1
  remains **81/81** each, frozen send-out rung 6 **195/195** each,
  turn-16 verifier **233/233**, Tier-1 **1024/1024**, and build
  (**5.430 MB**) pass.
- **Did:** implemented source-extracted `BG_DARK`, BG3 darken/restore,
  Murkrow's source sine ellipse and alpha handoffs, Magby shake, and the
  generic hitsplat; added pure boundary reducers/tests and a dense,
  prefix-verbatim canonical trace. A fresh two-oracle SHA comparison and
  direct RAM/register probes falsified relative identity at age 150:
  animation task state is identical, but canonical hardware `BLDALPHA` is
  `0x0e02` while delayed is `0x0d03`.
- **Next:** resume S7 at canonical **21047** with FAINT_ATTACK's HP-drain/
  move-handoff tail. Do not reopen exact canonical rung 2a; #38 parks the
  extra delayed-control frame unless a general cycle/register-queue model is
  introduced.
- **Notes:** implementation/evidence commit `d74ab10`; the delay sweep
  `+0..+8,+15,+16,+30,+31,+32` reproduced the early register exposure only
  at +30. No framebuffer assets, per-frame tables, RGB/coordinate fitting,
  absolute-tick lookup, trace branch, or red delayed trace was committed.
  Supervisor independently reverified every number above; the worker then
  hit an account usage limit, so the session wound down without relaunching.

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
